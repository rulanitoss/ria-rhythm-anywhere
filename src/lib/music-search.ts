import type { Track } from "./music";

export const normalizeSearch = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function rankTracks(tracks: Track[], query: string): Track[] {
  const q = normalizeSearch(query);
  const words = q.split(" ").filter(Boolean);
  const score = (t: Track) => {
    const title = normalizeSearch(t.title);
    const artist = normalizeSearch(t.artist);
    return (title === q ? 100 : 0) + (artist === q ? 90 : 0) +
      (title.includes(q) ? 30 : 0) + (artist.includes(q) ? 30 : 0) +
      words.reduce((n, w) => n + (title.includes(w) ? 8 : 0) + (artist.includes(w) ? 8 : 0), 0);
  };
  return [...new Map(tracks.map((t) => [t.id, t])).values()].sort((a, b) => score(b) - score(a));
}

export function filterTracks(tracks: Track[], query: string): Track[] {
  const words = normalizeSearch(query).split(" ").filter(Boolean);
  return tracks.filter((t) => words.every((w) => normalizeSearch(`${t.artist} ${t.title}`).includes(w)));
}