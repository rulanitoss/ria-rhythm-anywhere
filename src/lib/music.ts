export type Track = {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  duration: number;
  genre?: string;
};

const API = "https://api.audius.co/v1";
const APP = "app_name=RIAmp";

function map(t: any): Track {
  return {
    id: t.id,
    title: t.title,
    artist: t.user?.name ?? "Artista",
    artwork: t.artwork?.["480x480"] ?? t.artwork?.["150x150"] ?? "",
    duration: t.duration ?? 0,
    genre: t.genre,
  };
}

export async function searchTracks(q: string): Promise<Track[]> {
  const r = await fetch(`${API}/tracks/search?query=${encodeURIComponent(q)}&${APP}`);
  const j = await r.json();
  return (j.data ?? []).filter((t: any) => t.is_streamable !== false).map(map);
}

export async function trendingTracks(): Promise<Track[]> {
  const r = await fetch(`${API}/tracks/trending?${APP}`);
  const j = await r.json();
  return (j.data ?? []).slice(0, 30).map(map);
}

export const streamUrl = (id: string) => `${API}/tracks/${id}/stream?${APP}`;

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
        const r = fn(d.transaction("tracks", mode).objectStore("tracks"));
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      }),
  );
}

export async function downloadTrack(track: Track): Promise<void> {
  const audio = await (await fetch(streamUrl(track.id))).blob();
  let art: Blob | undefined;
  try {
    if (track.artwork) art = await (await fetch(track.artwork)).blob();
  } catch {}
  await tx("readwrite", (s) => s.put({ track, audio, art } as Stored));
}

export const getDownloads = () => tx<Stored[]>("readonly", (s) => s.getAll());
export const removeDownload = (id: string) => tx("readwrite", (s) => s.delete(id));

export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
