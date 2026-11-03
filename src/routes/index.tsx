import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Download, Check, Play, Pause, Trash2, WifiOff, Wifi, Library, Flame, SkipBack, SkipForward, Loader2, Sparkles, Upload, Settings } from "lucide-react";
import {
  type Track,
  multiSearch,
  trendingTracks,
  streamUrl,
  downloadTrack,
  getDownloads,
  removeDownload,
  fmt,
  importFiles,
  getSavedPreviews,
  getShowPreviews,
} from "@/lib/music";
import { expandQuery } from "@/lib/smart-search.functions";
import { searchCatalog } from "@/lib/catalog.functions";
import { searchArchive } from "@/lib/archive.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RIAmp — Música premium, online e offline" },
      { name: "description", content: "RIAmp: pesquise músicas, faça download e ouça offline sem anúncios." },
      { property: "og:title", content: "RIAmp — Música premium" },
      { property: "og:description", content: "Pesquise, baixe e ouça músicas offline." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

type Tab = "home" | "library";

function App() {
  const [online, setOnline] = useState(true);
  const [tab, setTab] = useState<Tab>("home");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const [fullOnly, setFullOnly] = useState(true);
  const [downloads, setDownloads] = useState<{ track: Track; audio: Blob; art?: Blob }[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [queue, setQueue] = useState<Track[]>([]);
  const [current, setCurrent] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const urlRef = useRef<string | null>(null);

  const downloaded = useMemo(() => new Map(downloads.map((d) => [d.track.id, d])), [downloads]);
  const artUrls = useMemo(() => {
    const m = new Map<string, string>();
    downloads.forEach((d) => d.art && m.set(d.track.id, URL.createObjectURL(d.art)));
    return m;
  }, [downloads]);

  const refresh = () => getDownloads().then(setDownloads).catch(() => {});

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    refresh();
    setFullOnly(!getShowPreviews());
    const saved = getSavedPreviews();
    if (navigator.onLine) {
      setLoading(true);
      trendingTracks().then((t) => setResults([...saved, ...t])).catch(() => {}).finally(() => setLoading(false));
    } else setTab("library");
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const doSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim() || !online) return;
    setTab("home");
    setLoading(true);
    try {
      const ai = await expandQuery({ data: { q } }).catch(() => ({ queries: [] as string[] }));
      setHints(ai.queries);
      const [aud, yt, ia] = await Promise.all([
        multiSearch(q, ai.queries),
        searchCatalog({ data: { q } }).catch(() => ({ items: [] })),
        searchArchive({ data: { q } }).catch(() => ({ items: [] })),
      ]);
      const iaTracks: Track[] = ia.items.map((i) => ({ ...i, source: "archive" as const }));
      const ytTracks: Track[] = yt.items.map((i) => ({ ...i, source: "preview" as const }));
      // big catalog first (every artist, previews), then the full downloadable catalog
      setResults([...aud, ...iaTracks, ...ytTracks]);
    } finally {
      setLoading(false);
    }
  };

  const play = (t: Track, list: Track[]) => {
    const a = audioRef.current!;
    if (current?.id === t.id) {
      a.paused ? a.play() : a.pause();
      return;
    }
    const local = downloaded.get(t.id);
    if (!local && !online) return;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = local ? URL.createObjectURL(local.audio) : null;
    a.src = urlRef.current ?? (t.preview || streamUrl(t.id));
    a.play().catch(() => {});
    setCurrent(t);
    setQueue(list);
  };

  const step = (dir: 1 | -1) => {
    if (!current) return;
    const playable = queue.filter((t) => online || downloaded.has(t.id));
    const i = playable.findIndex((t) => t.id === current.id);
    const next = playable[i + dir];
    if (next) play(next, queue);
  };

  const download = async (t: Track) => {
    setBusy((b) => ({ ...b, [t.id]: true }));
    try {
      await downloadTrack(t);
      await refresh();
    } finally {
      setBusy((b) => ({ ...b, [t.id]: false }));
    }
  };

  const list = tab === "library" ? downloads.map((d) => d.track) : fullOnly ? results.filter((t) => t.source !== "preview") : results;
  const previewCount = results.filter((t) => t.source === "preview").length;
  const art = (t: Track) => artUrls.get(t.id) ?? (online ? t.artwork : "");

  return (
    <div className="min-h-screen bg-background pb-32 text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-4">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            RI<span className="text-gradient">Amp</span>
          </h1>
          <form onSubmit={doSearch} className="relative order-3 w-full sm:order-none sm:w-auto sm:min-w-[220px] sm:flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              disabled={!online}
              placeholder={online ? "Pesquise qualquer coisa: artista, estilo, humor..." : "Pesquisa indisponível offline"}
              className="w-full rounded-full border border-border bg-card py-3 pl-11 pr-4 text-sm outline-none transition focus:border-primary disabled:opacity-50"
            />
          </form>
          <span className={`ml-auto sm:ml-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${online ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>
            {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {online ? "Online" : "Offline"}
          </span>
          <Link to="/admin" aria-label="Administração" className="rounded-full bg-card p-2 text-muted-foreground hover:text-foreground">
            <Settings className="h-4 w-4" />
          </Link>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-5 pb-3">
          {([["home", "Descobrir", Flame], ["library", `Downloads (${downloads.length})`, Library]] as const).map(([k, label, Icon]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${tab === k ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        {tab === "home" && !online && (
          <p className="rounded-2xl bg-card p-6 text-muted-foreground">Você está offline. Abra os Downloads para ouvir suas músicas instaladas.</p>
        )}
        {tab === "library" && (
          <label className="mb-6 flex w-fit cursor-pointer items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
            <Upload className="h-4 w-4" /> Adicionar músicas do meu aparelho
            <input
              type="file"
              accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac,.opus"
              multiple
              className="hidden"
              onChange={async (e) => {
                if (e.target.files?.length) { await importFiles(e.target.files); await refresh(); }
                e.target.value = "";
              }}
            />
          </label>
        )}
        {tab === "library" && downloads.length === 0 && (
          <p className="rounded-2xl bg-card p-6 text-muted-foreground">Nenhuma música ainda. Baixe faixas na aba Descobrir ou adicione arquivos de música do seu aparelho (MP3, M4A...). Dica: nomeie como "Artista - Música.mp3".</p>
        )}
        {tab === "home" && online && hints.length > 0 && !loading && (
          <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" /> A IA também procurou:
            {hints.map((h) => (
              <span key={h} className="rounded-full bg-card px-3 py-1">{h}</span>
            ))}
          </div>
        )}
        {tab === "home" && online && !loading && previewCount > 0 && (
          <label className="mb-6 flex w-fit cursor-pointer items-center gap-2 rounded-full bg-card px-4 py-2 text-sm">
            <input type="checkbox" checked={!fullOnly} onChange={(e) => setFullOnly(!e.target.checked)} className="accent-primary" />
            Mostrar também {previewCount} prévias de 30s de artistas famosos
          </label>
        )}
        {tab === "home" && online && !loading && fullOnly && list.length === 0 && results.length > 0 && (
          <p className="mb-6 rounded-2xl bg-card p-6 text-muted-foreground">Não encontrei músicas completas para esta pesquisa. Ative as prévias acima para ouvir 30s.</p>
        )}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          (tab === "library" || online) && (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
              {list.map((t) => {
                const isDl = downloaded.has(t.id);
                const isCur = current?.id === t.id;
                const isYt = t.source === "preview";
                const disabled = !online && !isDl;
                return (
                  <div key={t.id} className={`group rounded-2xl bg-card p-3 transition hover:bg-secondary ${disabled ? "opacity-40" : ""}`}>
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                      {art(t) && <img src={art(t)} alt={t.title} loading="lazy" className="h-full w-full object-cover" />}
                      <button
                        onClick={() => play(t, list)}
                        disabled={disabled}
                        aria-label="Tocar"
                        className={`absolute bottom-2 right-2 grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow transition ${isCur ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100"}`}
                      >
                        {isCur && playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-px" />}
                      </button>
                    </div>
                    <div className="mt-3 flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-semibold ${isCur ? "text-primary" : ""}`}>{t.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{t.artist}</p>
                      </div>
                      {tab === "library" ? (
                        <button aria-label="Remover" onClick={() => removeDownload(t.id).then(refresh)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : isYt ? (
                        <span title="Prévia de 30 segundos, só online, sem download" className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">Prévia</span>
                      ) : isDl ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <button aria-label="Baixar" disabled={busy[t.id]} onClick={() => download(t)} className="text-muted-foreground hover:text-primary">
                          {busy[t.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </main>

      <audio
        ref={audioRef}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onEnded={() => step(1)}
      />

      {current && (
        <footer className="fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)] border-t border-border bg-card/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
            {art(current) && <img src={art(current)} alt="" className="hidden h-14 w-14 rounded-lg sm:block object-cover" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{current.title}</p>
              <p className="truncate text-xs text-muted-foreground">{current.artist}</p>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{fmt(time)}</span>
                <input
                  type="range"
                  min={0}
                  max={current.duration || 1}
                  value={time}
                  onChange={(e) => (audioRef.current!.currentTime = +e.target.value)}
                  className="h-1 flex-1 accent-primary"
                />
                <span>{fmt(current.duration)}</span>
              </div>
              {current.source === "preview" && <p className="mt-1 text-[10px] text-muted-foreground">Prévia de 30s · só online</p>}
            </div>
            <div className="flex items-center gap-2">
              <button aria-label="Anterior" onClick={() => step(-1)} className="p-2 text-muted-foreground hover:text-foreground"><SkipBack className="h-5 w-5" /></button>
              <button aria-label="Tocar/Pausar" onClick={() => play(current, queue)} className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow">
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-px" />}
              </button>
              <button aria-label="Próxima" onClick={() => step(1)} className="p-2 text-muted-foreground hover:text-foreground"><SkipForward className="h-5 w-5" /></button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
