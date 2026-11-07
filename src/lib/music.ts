import { isAudioFile, localTrackId } from "@/lib/audio-files";

export type Track = {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  duration: number;
  genre?: string;
  source?: "audius" | "preview" | "archive" | "local";
  preview?: string;
  /** Web page of the track on its source site (opens in a new tab for manual download). */
  pageUrl?: string;
  downloadedAt?: string;
};

/** Timestamp actual saves only; older downloads retain an unknown date. */
export function markDownloaded(track: Track): Track {
  return { ...track, downloadedAt: new Date().toISOString() };
}

const API = "https://api.audius.co/v1";
const APP = "app_name=RIAmp";

function map(t: any): Track {
  return {
    id: t.id,
    title: t.title,
    artist: t.user?.name ?? "Artista",
    artwork: t.artwork?.["480x480"] ?? t.artwork?.["150x150"] ?? "",
    duration: t.duration ?? 0,
    source: "audius",
    genre: t.genre,
    ...(t.permalink ? { pageUrl: `https://audius.co${t.permalink}` } : {}),
  };
}

export async function searchTracks(q: string): Promise<Track[]> {
  const r = await fetch(`${API}/tracks/search?query=${encodeURIComponent(q)}&${APP}`);
  const j = await r.json();
  return (j.data ?? []).filter((t: any) => t.is_streamable !== false).map(map);
}

async function searchUsersTracks(q: string): Promise<Track[]> {
  try {
    const r = await fetch(`${API}/users/search?query=${encodeURIComponent(q)}&${APP}`);
    const users = ((await r.json()).data ?? []).slice(0, 2);
    const lists = await Promise.all(
      users.map((u: any) =>
        fetch(`${API}/users/${u.id}/tracks?limit=10&${APP}`).then((x) => x.json()).then((j) => (j.data ?? []).map(map)).catch(() => []),
      ),
    );
    return lists.flat();
  } catch {
    return [];
  }
}

/** Searches the original text + AI-expanded queries + matching artists, merged without duplicates. */
export async function multiSearch(original: string, extra: string[]): Promise<Track[]> {
  const queries = [original, ...extra.filter((e) => e.toLowerCase() !== original.toLowerCase())];
  const lists = await Promise.all([
    ...queries.map((q) => searchTracks(q).catch(() => [] as Track[])),
    searchUsersTracks(original),
  ]);
  const seen = new Set<string>();
  const out: Track[] = [];
  // interleave so the best results from each query appear first
  const max = Math.max(...lists.map((l) => l.length));
  for (let i = 0; i < max; i++)
    for (const l of lists) {
      const t = l[i];
      if (t && !seen.has(t.id)) {
        seen.add(t.id);
        out.push(t);
      }
    }
  return out.slice(0, 80);
}

export async function trendingTracks(): Promise<Track[]> {
  const r = await fetch(`${API}/tracks/trending?${APP}`);
  const j = await r.json();
  return (j.data ?? []).slice(0, 30).map(map);
}

export const streamUrl = (id: string) => `${API}/tracks/${id}/stream?${APP}`;

/** Source audio only: source pages and catalog previews are never download URLs. */
export function directDownloadUrl(track: Track): string | null {
  if (track.source === "preview" || track.source === "local") return null;
  if (track.preview) {
    try {
      const url = new URL(track.preview);
      return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  }
  return track.source === "audius" || !track.source ? streamUrl(track.id) : null;
}

// ---------- IndexedDB offline storage ----------
type Stored = { track: Track; audio: Blob; art?: Blob };

function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open("riamp", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("tracks", { keyPath: "track.id" });
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((res, rej) => {
        const transaction = d.transaction("tracks", mode);
        const r = fn(transaction.objectStore("tracks"));
        transaction.oncomplete = () => { res(r.result); d.close(); };
        transaction.onerror = () => { rej(transaction.error ?? r.error); d.close(); };
        transaction.onabort = () => { rej(transaction.error ?? new Error("Não foi possível salvar no aparelho.")); d.close(); };
      }),
  );
}

export async function fetchAudio(url: string, onProgress?: (percent: number | null) => void, signal?: AbortSignal): Promise<Blob> {
  const response = await fetch(url, { signal: signal ?? AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error("A fonte não liberou o arquivo. Tente novamente ou importe do aparelho.");
  const type = response.headers.get("content-type")?.split(";")[0] ?? "";
  if (!type.startsWith("audio/") && !["application/octet-stream", "binary/octet-stream"].includes(type)) {
    throw new Error("Este link é uma página, não um arquivo de música. Use um link direto de áudio ou importe do aparelho.");
  }
  const total = Number(response.headers.get("content-length")) || 0;
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Não foi possível ler o arquivo de música.");
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  onProgress?.(null);
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 200 * 1024 * 1024) { await reader.cancel(); throw new Error("O arquivo ultrapassa 200 MB."); }
    chunks.push(new Uint8Array(value));
    onProgress?.(total ? Math.min(99, Math.round(size / total * 100)) : null);
  }
  if (!size) throw new Error("A fonte enviou um arquivo vazio.");
  const audio = new Blob(chunks, { type });
  const prefix = new TextDecoder().decode(await audio.slice(0, 512).arrayBuffer()).trim().toLowerCase();
  if (prefix.startsWith("<") || prefix.startsWith("{")) throw new Error("O link não contém um arquivo de música.");
  return audio;
}

export async function downloadTrack(track: Track, onProgress?: (percent: number | null) => void, signal?: AbortSignal): Promise<void> {
  if (track.source === "preview") throw new Error("Prévias não podem ser baixadas.");
  const url = directDownloadUrl(track);
  if (!url) throw new Error("Esta fonte não disponibilizou um link direto de áudio. Importe o arquivo do aparelho.");
  const audio = await fetchAudio(url, onProgress, signal);
  let art: Blob | undefined;
  try {
    if (track.artwork) {
      const response = await fetch(track.artwork, { signal: AbortSignal.timeout(5000) });
      if (response.ok) art = await response.blob();
    }
  } catch {}
  await tx("readwrite", (s) => s.put({ track: markDownloaded(track), audio, art } as Stored));
  onProgress?.(100);
}

export async function importAudioLink(value: string, title: string, onProgress?: (percent: number | null) => void): Promise<void> {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Cole um link HTTPS válido de um arquivo de áudio."); }
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Use um link HTTPS sem dados de acesso.");
  const audio = await fetchAudio(url.href, onProgress);
  const duration = await fileDuration(audio);
  if (!duration) throw new Error("Este arquivo não pode ser reproduzido como música neste aparelho.");
  const track: Track = { id: `link:${url.href}`, title: title.trim() || decodeURIComponent(url.pathname.split("/").pop() ?? "Música importada"), artist: "Importada por link", artwork: "", duration, source: "local" };
  await tx("readwrite", (s) => s.put({ track: markDownloaded(track), audio } as Stored));
  onProgress?.(100);
}

export const getDownloads = () => tx<Stored[]>("readonly", (s) => s.getAll());
export const removeDownload = (id: string) => tx("readwrite", (s) => s.delete(id));

export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const fileDuration = (f: Blob) =>
  new Promise<number>((res) => {
    const a = new Audio();
    const u = URL.createObjectURL(f);
    a.preload = "metadata";
    const finish = (duration: number) => { clearTimeout(timer); a.removeAttribute("src"); a.load(); URL.revokeObjectURL(u); res(duration); };
    const timer = setTimeout(() => finish(0), 15000);
    a.onloadedmetadata = () => finish(isFinite(a.duration) ? a.duration : 0);
    a.onerror = () => finish(0);
    a.src = u;
  });

/** Imports audio files from the user's device into the offline library. */
export async function importFiles(files: FileList | File[]): Promise<number> {
  let n = 0;
  for (const f of Array.from(files)) {
    if (!isAudioFile(f)) continue;
    const base = f.name.replace(/\.[^.]+$/, "").replace(/_/g, " ");
    const [artist, title] = base.includes(" - ") ? base.split(" - ", 2) : ["Minhas músicas", base];
    const duration = await fileDuration(f);
    if (!duration) continue;
    const track: Track = { id: localTrackId(f), title: (title ?? base).trim(), artist: (artist ?? "").trim(), artwork: "", duration, source: "local" };
    await tx("readwrite", (s) => s.put({ track: markDownloaded(track), audio: f } as Stored));
    n++;
  }
  return n;
}

export async function updateDownload(id: string, patch: Partial<Pick<Track, "title" | "artist">>) {
  const all = await getDownloads();
  const item = all.find((d) => d.track.id === id);
  if (!item) return;
  item.track = { ...item.track, ...patch };
  await tx("readwrite", (s) => s.put(item));
}

export async function clearDownloads() {
  await tx("readwrite", (s) => s.clear());
}

// ---------- Saved previews & settings (device-local) ----------
const PK = "riamp:previews";
const SK = "riamp:showPreviews";
export const getSavedPreviews = (): Track[] => {
  try { return JSON.parse(localStorage.getItem(PK) ?? "[]"); } catch { return []; }
};
export const setSavedPreviews = (t: Track[]) => localStorage.setItem(PK, JSON.stringify(t));
export const getShowPreviews = () => localStorage.getItem(SK) === "1";
export const setShowPreviews = (v: boolean) => localStorage.setItem(SK, v ? "1" : "0");
