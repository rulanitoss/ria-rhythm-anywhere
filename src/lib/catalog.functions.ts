import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type CatalogItem = { id: string; title: string; artist: string; artwork: string; duration: number; preview: string; genre?: string };

/** Big keyless catalog (every major artist) — 30s previews only, online only. */
export const searchCatalog = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ q: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const r = await fetch(`https://itunes.apple.com/search?media=music&entity=song&limit=30&term=${encodeURIComponent(data.q)}`);
      const j: any = await r.json();
      const items: CatalogItem[] = (j.results ?? [])
        .filter((t: any) => t.previewUrl)
        .map((t: any) => ({
          id: "it:" + t.trackId,
          title: t.trackName,
          artist: t.artistName,
          artwork: String(t.artworkUrl100 ?? "").replace("100x100", "480x480"),
          duration: 30,
          preview: t.previewUrl,
          genre: t.primaryGenreName,
        }));
      return { items };
    } catch (e) {
      console.error("catalog search failed", e);
      return { items: [] as CatalogItem[] };
    }
  });
