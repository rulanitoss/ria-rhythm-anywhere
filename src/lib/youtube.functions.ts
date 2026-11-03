import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type YtItem = { id: string; title: string; artist: string; artwork: string };

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

export const searchYouTube = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ q: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) return { items: [] as YtItem[], error: "missing_key" };
    const url =
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&videoEmbeddable=true&maxResults=20&q=` +
      encodeURIComponent(data.q) + `&key=${key}`;
    try {
      const r = await fetch(url);
      if (!r.ok) {
        console.error("youtube search failed", r.status, await r.text());
        return { items: [] as YtItem[], error: r.status === 403 ? "quota" : "failed" };
      }
      const j: any = await r.json();
      const items: YtItem[] = (j.items ?? [])
        .filter((i: any) => i.id?.videoId)
        .map((i: any) => ({
          id: i.id.videoId,
          title: decode(i.snippet.title),
          artist: decode(i.snippet.channelTitle).replace(/ - Topic$/, ""),
          artwork: i.snippet.thumbnails?.high?.url ?? i.snippet.thumbnails?.medium?.url ?? "",
        }));
      return { items, error: null as string | null };
    } catch (e) {
      console.error("youtube search error", e);
      return { items: [] as YtItem[], error: "failed" };
    }
  });
