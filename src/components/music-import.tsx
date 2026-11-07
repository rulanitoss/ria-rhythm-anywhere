import { useRef, useState } from "react";
import { FolderOpen, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importFiles } from "@/lib/music";
import { isAudioFile } from "@/lib/audio-files";

export function MusicImport({ onComplete }: { onComplete: (message: string) => Promise<void> }) {
  const filesRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const running = useRef(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const importSelection = async (input: HTMLInputElement) => {
    const files = Array.from(input.files ?? []).filter(isAudioFile);
    input.value = "";
    if (running.current) return;
    if (!files.length) { await onComplete("Nenhum arquivo de música encontrado na seleção."); return; }
    running.current = true;
    let saved = 0;
    let failed = 0;
    setProgress({ done: 0, total: files.length });
    try {
      for (const [index, file] of files.entries()) {
        try { const count = await importFiles([file]); saved += count; if (!count) failed++; }
        catch { failed++; }
        setProgress({ done: index + 1, total: files.length });
      }
      await onComplete(`${saved} música(s) salva(s) em Downloads.${failed ? ` ${failed} arquivo(s) não puderam ser importados; confira o formato e o espaço disponível.` : ""}`);
    } finally { running.current = false; setProgress(null); }
  };

  return (
    <section className="mb-6 space-y-3" aria-label="Adicionar músicas">
      <div className="flex flex-wrap gap-2">
        <Button disabled={progress !== null} onClick={() => folderRef.current?.click()}><FolderOpen /> Importar pasta de músicas</Button>
        <Button variant="outline" disabled={progress !== null} onClick={() => filesRef.current?.click()}><Upload /> Adicionar arquivos</Button>
      </div>
      <p className="text-xs text-muted-foreground">Somente músicas da pasta escolhida e suas subpastas. Salvas neste aparelho, sem envio para servidores.</p>
      <input ref={(node) => { folderRef.current = node; node?.setAttribute("webkitdirectory", ""); }} type="file" multiple className="hidden" aria-label="Selecionar pasta de músicas" onChange={(e) => { void importSelection(e.currentTarget); }} />
      <input ref={filesRef} type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.oga,.flac,.opus,.aiff,.aif,.wma" multiple className="hidden" aria-label="Selecionar arquivos de música" onChange={(e) => { void importSelection(e.currentTarget); }} />
      {progress && <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Importando {progress.done} de {progress.total}<progress className="h-2 w-24 accent-primary" value={progress.done} max={progress.total} /></div>}
    </section>
  );
}