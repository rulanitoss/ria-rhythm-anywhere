import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const expandQuery = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ q: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { generateResponse } = await import("@lovable.dev/ai-gateway");
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions:
          "You turn a music search request (any language, may have typos, moods, genres, or artist names) into 4-6 short search queries for a music catalog of independent artists. Fix typos, include likely artist/song names, genres, moods and English equivalents. Reply ONLY with a JSON array of strings.",
        input: data.q,
      });
      const text = JSON.stringify(res.output ?? []);
      const m = text.match(/\[\\?"[\s\S]*?\]/);
      const raw = (res as any).output_text ?? (m ? JSON.parse(m[0].replace(/\\"/g, '"')) : null);
      const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(arr)) return { queries: arr.filter((x) => typeof x === "string").slice(0, 6) as string[] };
    } catch (e) {
      console.error("expandQuery failed", e);
    }
    return { queries: [] as string[] };
  });
