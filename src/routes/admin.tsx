import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2, Search, Star, Play, Pause, Loader2, HardDrive } from "lucide-react";
import {
  type Track,
  getDownloads,
  removeDownload,
  updateDownload,
  clearDownloads,
  getSavedPreviews,
  setSavedPreviews,
  getShowPreviews,
  setShowPreviews,
  fmt,
} from "@/lib/music";
import { searchCatalog } from "@/lib/catalog.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administração — RIAmp" },
      { name: "description", content: "Gerencie as músicas baixadas e as prévias de artistas famosos no RIAmp." },
      { property: "og:title", content: "Administração — RIAmp" },
      { property: "og:description", content: "Gerencie downloads e prévias do RIAmp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

type Dl = { track: Track; audio: Blob; art?: Blob };
const mb = (b: number) => `${(b / 1048576).toFixed(1)} MB`;
const SRC: Record<string, string> = { audius: "Audius", archive: "Internet Archive", local: "Do aparelho", preview: "Prévia" };

function Admin() {
  const [tab, setTab] = useState<"dl" | "pv">("dl");
  const [dls, setDls] = useState<Dl[]>([]);
  const [saved, setSaved] = useState<Track[]>([]);
  const [show, setShow] = useState(false);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [audio] = useState(() => (typeof Audio !== "undefined" ? new Audio() : null));

  const refresh = () => getDownloads().then(setDls).catch(() => {});
  useEffect(() => {
    refresh();
    setSaved(getSavedPreviews());
    setShow(getShowPreviews());
    return () => audio?.pause();
  }, []);

  const total = dls.reduce((a, d) => a + d.audio.size + (d.art?.size ?? 0), 0);
  const saveList = (l: Track[]) => { setSaved(l); setSavedPreviews(l); };
  const toggleSaved = (t: Track) =>
    saveList(saved.some((s) => s.id === t.id) ? saved.filter((s) => s.id !== t.id) : [...saved, t]);

  const listen = (t: Track) => {
    if (!audio) return;
    if (playing === t.id) { audio.pause(); setPlaying(null); return; }
    audio.src = t.preview ?? "";
    audio.play().catch(() => {});
    audio.onended = () => setPlaying(null);
    setPlaying(t.id);
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    try {
      const r = await searchCatalog({ data: { q } });
      setFound(r.items.map((i) => ({ ...i, source: "preview" as const })));
    } finally { setLoading(false); }
  };

  const edit = async (id: string, field: "title" | "artist", value: string) => {
    if (!value.trim()) return;
    await updateDownload(id, { [field]: value.trim() });
    refresh();
  };

  const row = (t: Track) => (
    <div key={t.id} className="flex items-center gap-3 rounded-xl bg-card p-3">
      {t.artwork ? <img src={t.artwork} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <div className="h-12 w-12 rounded-lg bg-muted" />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{t.title}</p>
        <p className="truncate text-xs text-muted-foreground">{t.artist}</p>
      </div>
      <button aria-label="Ouvir prévia" onClick={() => listen(t)} className="p-2 text-muted-foreground hover:text-primary">
        {playing === t.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <button aria-label="Favoritar prévia" onClick={() => toggleSaved(t)} className="p-2">
        <Star className={`h-4 w-4 ${saved.some((s) => s.id === t.id) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-16 text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-4">
          <Link to="/" aria-label="Voltar" className="rounded-full bg-card p-2 text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
          <h1 className="font-display text-2xl font-extrabold">Administração</h1>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-2 px-5 pb-3">
          {([["dl", `Músicas baixadas (${dls.length})`], ["pv", `Prévias (${saved.length})`]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === k ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>{l}</button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-5 py-8">
        {tab === "dl" ? (
          <>
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-card p-4">
              <HardDrive className="h-5 w-5 text-primary" />
              <p className="flex-1 text-sm"><b>{dls.length}</b> músicas · <b>{mb(total)}</b> usados no aparelho</p>
              {dls.length > 0 && (
                <button onClick={async () => { if (confirm("Apagar todas as músicas baixadas?")) { await clearDownloads(); refresh(); } }} className="rounded-full bg-destructive/15 px-4 py-2 text-xs font-semibold text-destructive">Apagar tudo</button>
              )}
            </div>
            {dls.length === 0 && <p className="text-muted-foreground">Nenhuma música baixada.</p>}
            <div className="space-y-2">
              {dls.map(({ track: t, audio: a }) => (
                <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-card p-3 sm:flex-nowrap">
                  <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-2">
                    <input aria-label="Título" defaultValue={t.title} onBlur={(e) => edit(t.id, "title", e.target.value)} className="rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold hover:border-border focus:border-primary focus:outline-none" />
                    <input aria-label="Artista" defaultValue={t.artist} onBlur={(e) => edit(t.id, "artist", e.target.value)} className="rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-muted-foreground hover:border-border focus:border-primary focus:outline-none" />
                  </div>
                  <span className="text-xs text-muted-foreground">{SRC[t.source ?? "audius"]} · {t.duration ? fmt(t.duration) : "—"} · {mb(a.size)}</span>
                  <button aria-label="Apagar" onClick={() => removeDownload(t.id).then(refresh)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full bg-card px-4 py-2 text-sm">
              <input type="checkbox" checked={show} onChange={(e) => { setShow(e.target.checked); setShowPreviews(e.target.checked); }} className="accent-primary" />
              Mostrar prévias nos resultados de pesquisa por padrão
            </label>
            <section className="space-y-2">
              <h2 className="font-semibold">Prévias favoritas <span className="text-xs font-normal text-muted-foreground">— aparecem sempre no início do Descobrir</span></h2>
              {saved.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma ainda. Pesquise abaixo e toque na estrela.</p>}
              {saved.map(row)}
            </section>
            <section className="space-y-2">
              <h2 className="font-semibold">Encontrar prévias de artistas famosos</h2>
              <form onSubmit={search} className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: Anitta, Drake, Coldplay..." className="w-full rounded-full border border-border bg-card py-3 pl-11 pr-4 text-sm outline-none focus:border-primary" />
              </form>
              {loading ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /> : found.map(row)}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
