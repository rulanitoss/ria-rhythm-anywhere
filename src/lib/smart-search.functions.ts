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
      let text = "";
      for (const item of res.output ?? []) {
        if (item.type === "message") {
          for (const c of item.content) if (c.type === "output_text") text += c.text;
        }
      }
      const m = text.match(/\[[\s\S]*\]/);
      const arr: unknown = m ? JSON.parse(m[0]) : [];
      if (Array.isArray(arr)) {
        return { queries: arr.filter((x): x is string => typeof x === "string").slice(0, 6) };
      }
    } catch (e) {
      console.error("expandQuery failed", e);
    }
    return { queries: [] as string[] };
  });
