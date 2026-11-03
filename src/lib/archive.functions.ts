import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ArchiveItem = { id: string; title: string; artist: string; artwork: string; duration: number; preview: string };

const parseLen = (l: unknown) => {
  if (!l) return 0;
  const s = String(l);
  if (s.includes(":")) return s.split(":").reduce((a, p) => a * 60 + Number(p), 0);
  return Number(s) || 0;
};

/** Internet Archive: free, keyless, full-length songs that may be downloaded. */
export const searchArchive = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ q: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const q = `(${data.q}) AND mediatype:audio AND (collection:etree OR collection:netlabels OR collection:opensource_audio OR collection:audio_music)`;
      const r = await fetch(
        `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier&fl[]=creator&rows=10&sort[]=downloads+desc&output=json`,
      );
      const docs: any[] = (await r.json()).response?.docs ?? [];
      const lists = await Promise.all(
        docs.map(async (d) => {
          try {
            const m: any = await (await fetch(`https://archive.org/metadata/${d.identifier}`)).json();
            const creator = [].concat(d.creator ?? m.metadata?.creator ?? "Artista")[0];
            return (m.files ?? [])
              .filter((f: any) => /\.mp3$/i.test(f.name) && f.source === "derivative" || /\.mp3$/i.test(f.name) && f.source === "original")
              .slice(0, 3)
              .map((f: any): ArchiveItem => ({
                id: `ia:${d.identifier}/${f.name}`,
                title: f.title || f.name.replace(/\.mp3$/i, "").replace(/[_-]+/g, " "),
                artist: f.artist || f.creator || String(creator),
                artwork: `https://archive.org/services/img/${d.identifier}`,
                duration: parseLen(f.length),
                preview: `https://archive.org/download/${d.identifier}/${encodeURIComponent(f.name)}`,
              }));
          } catch {
            return [];
          }
        }),
      );
      return { items: lists.flat().slice(0, 24) };
    } catch (e) {
      console.error("archive search failed", e);
      return { items: [] as ArchiveItem[] };
    }
  });
