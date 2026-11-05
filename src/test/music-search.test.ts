import { describe, expect, it } from "vitest";
import { filterTracks, rankTracks } from "@/lib/music-search";
import type { Track } from "@/lib/music";

const tracks: Track[] = [
  { id: "other", title: "Samba remix", artist: "Outro artista", artwork: "", duration: 180 },
  { id: "pericles", title: "Até que durou", artist: "Péricles", artwork: "", duration: 240 },
];
describe("Music search", () => {
  it("ranks the requested artist ahead of unrelated results despite accents", () => {
    expect(rankTracks(tracks, "pericles")[0]?.id).toBe("pericles");
  });
  it("filters downloaded music by artist and title without accents", () => {
    expect(filterTracks(tracks, "pericles durou").map((t) => t.id)).toEqual(["pericles"]);
  });
  it("merges results without repeating track ids", () => {
    expect(rankTracks([...tracks, ...tracks], "samba")).toHaveLength(2);
  });
});