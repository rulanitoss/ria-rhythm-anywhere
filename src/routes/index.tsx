import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Download, Check, Play, Pause, Trash2, WifiOff, Wifi, Library, Flame, SkipBack, SkipForward, Loader2, Sparkles, Upload, Settings, ExternalLink, Link2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { filterTracks, rankTracks } from "@/lib/music-search";
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
  importAudioLink,
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
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [downloads, setDownloads] = useState<{ track: Track; audio: Blob; art?: Blob }[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [queue, setQueue] = useState<Track[]>([]);
  const [current, setCurrent] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [searched, setSearched] = useState("");
  const [notice, setNotice] = useState("");
  const [progress, setProgress] = useState<Record<string, number | null>>({});
  const [link, setLink] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkProgress, setLinkProgress] = useState<number | null>(null);
  const searchId = useRef(0);
  const initialSearchId = useRef(0);
  const controllers = useRef(new Map<string, AbortController>());
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
    setSavedIds(new Set(saved.map((t) => t.id)));
    if (navigator.onLine) {
      setLoading(true);
      const id = initialSearchId.current;
      trendingTracks().then((t) => { if (initialSearchId.current === id) setResults([...saved, ...t]); }).catch(() => {}).finally(() => { if (initialSearchId.current === id) setLoading(false); });
    } else setTab("library");
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const doSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    if (tab === "library") { setSearched(query); return; }
    if (!online) return;
    const id = ++searchId.current;
    initialSearchId.current++;
    setTab("home");
    setSearched(query);
    setResults([]);
    setHints([]);
    setNotice("");
    setLoading(true);
    let merged: Track[] = [];
    const add = (tracks: Track[]) => {
      if (searchId.current !== id) return;
      merged = rankTracks([...merged, ...tracks], query);
      setResults(merged);
    };
    try {
      await Promise.allSettled([
        multiSearch(query, []).then(add),
        searchCatalog({ data: { q: query } }).then((r) => add(r.items.map((i) => ({ ...i, source: "preview" as const })))),
        searchArchive({ data: { q: query } }).then((r) => add(r.items.map((i) => ({ ...i, source: "archive" as const, pageUrl: `https://archive.org/details/${i.id.slice(3).split("/")[0]}` })))),
        expandQuery({ data: { q: query } }).then(async (ai) => {
          if (searchId.current !== id) return;
          setHints(ai.queries);
          if (ai.queries.length) add(await multiSearch(query, ai.queries));
        }),
      ]);
      if (searchId.current === id && !merged.length) setNotice("Nenhuma música encontrada. Tente o nome do artista ou da faixa.");
    } finally {
      if (searchId.current === id) setLoading(false);
    }
  };

  const play = (t: Track, list: Track[]) => {
    const a = audioRef.current;
    if (!a) return;
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
    if (controllers.current.has(t.id)) return;
    const controller = new AbortController();
    controllers.current.set(t.id, controller);
    setNotice("");
    setBusy((b) => ({ ...b, [t.id]: true }));
    try {
      await downloadTrack(t, (p) => setProgress((old) => ({ ...old, [t.id]: p })), controller.signal);
      await refresh();
      setNotice(`“${t.title}” salva em Downloads para ouvir offline.`);
    } catch (error) {
      setNotice(controller.signal.aborted ? "Download cancelado." : error instanceof Error && error.message !== "Failed to fetch" ? error.message : "A fonte bloqueou o download direto. Baixe no site e importe o arquivo do aparelho.");
    } finally {
      controllers.current.delete(t.id);
      setBusy((b) => ({ ...b, [t.id]: false }));
    }
  };

  const list = tab === "library" ? filterTracks(downloads.map((d) => d.track), q) : fullOnly ? results.filter((t) => t.source !== "preview" || (!searched && savedIds.has(t.id))) : results;
  const siteLink = (t: Track) => t.pageUrl ?? `https://suamusica.com.br/busca/${encodeURIComponent(`${t.artist} ${t.title}`.trim())}`;
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
              disabled={!online && tab !== "library"}
              aria-label="Pesquisar músicas"
              maxLength={200}
              placeholder={tab === "library" ? "Pesquisar nas músicas baixadas..." : online ? "Artista, música ou estilo..." : "Pesquisa indisponível offline"}
              className="w-full rounded-full border border-border bg-card py-3 pl-11 pr-14 text-sm outline-none transition focus:border-primary disabled:opacity-50"
            />
            <Button type="submit" size="icon" variant="ghost" disabled={!q.trim() || (!online && tab !== "library")} aria-label="Buscar" title="Buscar" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"><Search /></Button>
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
            <Button
              key={k}
              onClick={() => { setTab(k); setQ(""); }}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${tab === k ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="h-4 w-4" /> {label}
            </Button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        {notice && <p role="status" className="mb-6 border-l-2 border-primary py-2 pl-4 text-sm">{notice}</p>}
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
                try {
                  if (e.target.files?.length) { const n = await importFiles(e.target.files); await refresh(); setNotice(`${n} música(s) adicionada(s) em Downloads.`); }
                } catch { setNotice("Não foi possível importar. Confira o espaço disponível no aparelho."); }
                e.target.value = "";
              }}
            />
          </label>
        )}
        {tab === "library" && online && (
          <form className="mb-8 space-y-3 border-b border-border pb-6" onSubmit={async (e) => {
            e.preventDefault(); setLinkBusy(true); setNotice(""); setLinkProgress(null);
            try { await importAudioLink(link, linkTitle, setLinkProgress); await refresh(); setLink(""); setLinkTitle(""); setQ(""); setNotice("Música salva em Downloads para ouvir offline."); }
            catch (error) { setNotice(error instanceof Error && error.message !== "Failed to fetch" ? error.message : "O site não permite importar este link. Baixe lá e adicione o arquivo do aparelho."); }
            finally { setLinkBusy(false); }
          }}>
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Link2 className="h-4 w-4 text-primary" /> Importar áudio por link</h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input aria-label="Link direto de áudio" type="url" required value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://.../musica.mp3" className="min-w-0 flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm" disabled={linkBusy} />
              <input aria-label="Nome da música" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Nome da música (opcional)" className="min-w-0 rounded-md border border-border bg-card px-3 py-2 text-sm" disabled={linkBusy} />
              <Button type="submit" disabled={linkBusy || !link.trim()}>{linkBusy ? <Loader2 className="animate-spin" /> : <Download />} {linkBusy ? linkProgress === null ? "Baixando…" : `${linkProgress}%` : "Importar"}</Button>
            </div>
          </form>
        )}
        {tab === "library" && online && (
          <div className="mb-8">
            <p className="mb-3 text-sm font-semibold">Sites externos <span className="font-normal text-muted-foreground">— arquivos baixados lá precisam ser importados do aparelho</span></p>
            <div className="flex flex-wrap gap-2">
              {[
                ["Sua Música", "https://suamusica.com.br", "CDs de artistas brasileiros"],
                ["Palco MP3", "https://www.palcomp3.com.br", "artistas independentes BR"],
                ["Bandcamp", "https://bandcamp.com", "compre ou baixe grátis"],
                ["Jamendo", "https://www.jamendo.com", "música livre"],
                ["Free Music Archive", "https://freemusicarchive.org", "música livre"],
                ["Internet Archive", "https://archive.org/details/audio", "shows e acervos"],
                ["SoundCloud", "https://soundcloud.com", "quando o artista libera"],
              ].map(([n, u, d]) => (
                <a key={n} href={u} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-border bg-card px-4 py-2 text-sm hover:border-primary">
                  <span className="font-semibold">{n} ↗</span>
                  <span className="block text-xs text-muted-foreground">{d}</span>
                </a>
              ))}
            </div>
          </div>
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
        {tab === "home" && online && !loading && searched && list.length === 0 && (
          <a
            href={`https://suamusica.com.br/busca/${encodeURIComponent(searched)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-4 flex w-fit items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm hover:border-primary"
          >
            Procurar "{searched}" no Sua Música ↗
          </a>
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
        {tab === "home" && searched && <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"><span>{list.length} {fullOnly ? "músicas completas" : "resultados"} · {searched}</span>{loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}</div>}
        {loading && tab === "home" && list.length === 0 ? (
          <div role="status" className="flex items-center justify-center gap-3 py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /> Procurando músicas…</div>
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
                      <Button
                        onClick={() => play(t, list)}
                        disabled={disabled}
                        aria-label="Tocar"
                        className={`absolute bottom-2 right-2 grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow transition ${isCur ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100"}`}
                      >
                        {isCur && playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-px" />}
                      </Button>
                    </div>
                    <div className="mt-3 flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-semibold ${isCur ? "text-primary" : ""}`}>{t.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{t.artist}</p>
                      </div>
                      {tab === "home" && (
                        <a
                          href={siteLink(t)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Abrir site de ${t.title}`}
                          title="Site da música — abre em nova aba, não salva no RIAmp"
                          className="shrink-0 p-1 text-muted-foreground transition hover:text-primary"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      {tab === "library" ? (
                        <Button aria-label="Remover" onClick={() => removeDownload(t.id).then(refresh)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : isYt ? (
                        <span title="Prévia de 30 segundos, só online, sem download" className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">Prévia</span>
                       ) : null}
                    </div>
                     {!isYt && tab === "home" && (
                       <div className="mt-3 flex min-h-8 items-center gap-1">
                         <Button size="sm" variant={isDl ? "ghost" : "secondary"} disabled={isDl || busy[t.id] || !online} onClick={() => download(t)} aria-label={`Baixar ${t.title} no RIAmp`} className="min-w-0 flex-1 px-2 text-xs">
                           {isDl ? <Check /> : busy[t.id] ? <Loader2 className="animate-spin" /> : <Download />}
                           {isDl ? "Salva offline" : busy[t.id] ? progress[t.id] == null ? "Baixando…" : `${progress[t.id]}%` : "Baixar no RIAmp"}
                         </Button>
                         {busy[t.id] && <Button size="icon" variant="ghost" title="Cancelar download" aria-label={`Cancelar download de ${t.title}`} onClick={() => controllers.current.get(t.id)?.abort()}><X /></Button>}
                       </div>
                     )}
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
                   onChange={(e) => { if (audioRef.current) audioRef.current.currentTime = +e.target.value; }}
                  className="h-1 flex-1 accent-primary"
                />
                <span>{fmt(current.duration)}</span>
              </div>
              {current.source === "preview" && <p className="mt-1 text-[10px] text-muted-foreground">Prévia de 30s · só online</p>}
            </div>
            <div className="flex items-center gap-2">
              <Button aria-label="Anterior" onClick={() => step(-1)} className="p-2 text-muted-foreground hover:text-foreground"><SkipBack className="h-5 w-5" /></Button>
              <Button aria-label="Tocar/Pausar" onClick={() => play(current, queue)} className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow">
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-px" />}
              </Button>
              <Button aria-label="Próxima" onClick={() => step(1)} className="p-2 text-muted-foreground hover:text-foreground"><SkipForward className="h-5 w-5" /></Button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
