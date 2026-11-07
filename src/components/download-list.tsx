import { Play, Pause, Trash2, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Track, fmt } from "@/lib/music";

function savedDate(value?: string): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "Data não registrada";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

export function DownloadList({ tracks, currentId, playing, artwork, onPlay, onRemove }: {
  tracks: Track[];
  currentId: string | undefined;
  playing: boolean;
  artwork: (track: Track) => string;
  onPlay: (track: Track) => void;
  onRemove: (track: Track) => void;
}) {
  return (
    <section aria-label="Músicas disponíveis offline">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">Músicas offline <span className="text-sm font-normal text-muted-foreground">({tracks.length})</span></h2>
      <div className="hidden grid-cols-[3rem_minmax(0,2fr)_minmax(0,1fr)_10rem_3rem] gap-4 border-b border-border px-2 py-3 text-xs text-muted-foreground sm:grid"><span /><span>Título</span><span>Artista</span><span>Data do download</span><span /></div>
      <ul className="divide-y divide-border">
        {tracks.map((track) => {
          const active = track.id === currentId;
          const image = artwork(track);
          return (
            <li key={track.id} className="grid grid-cols-[3rem_minmax(0,1fr)_2.5rem] items-center gap-3 py-4 sm:grid-cols-[3rem_minmax(0,2fr)_minmax(0,1fr)_10rem_3rem] sm:gap-4 sm:px-2">
              <Button variant="ghost" size="icon" aria-label={`Tocar ${track.title}`} title={active && playing ? "Pausar" : "Tocar"} onClick={() => onPlay(track)} className="relative h-12 w-12 overflow-hidden rounded-md bg-muted">
                {image ? <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <Music2 className="text-muted-foreground" />}
                <span className="absolute inset-0 flex items-center justify-center bg-background/60 text-foreground">{active && playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}</span>
              </Button>
              <div className="min-w-0">
                <p className={`break-words text-sm font-semibold ${active ? "text-primary" : ""}`}>{track.title}</p>
                <p className="mt-1 break-words text-xs text-muted-foreground sm:hidden">{track.artist}</p>
                <p className="mt-1 text-xs text-muted-foreground sm:hidden">{savedDate(track.downloadedAt)} · {fmt(track.duration)}</p>
              </div>
              <p className="hidden min-w-0 break-words text-sm text-muted-foreground sm:block">{track.artist}</p>
              <p className="hidden text-sm text-muted-foreground sm:block">{savedDate(track.downloadedAt)}</p>
              <Button size="icon" variant="ghost" aria-label={`Remover ${track.title}`} title="Remover download" onClick={() => onRemove(track)} className="text-muted-foreground hover:text-destructive"><Trash2 /></Button>
            </li>
          );
        })}
      </ul>
      {!tracks.length && <p className="py-6 text-sm text-muted-foreground">Nenhuma música encontrada.</p>}
    </section>
  );
}