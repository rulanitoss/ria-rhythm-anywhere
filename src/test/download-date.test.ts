import { afterEach, describe, expect, it, vi } from "vitest";
import { markDownloaded, type Track } from "@/lib/music";

afterEach(() => vi.useRealTimers());
describe("Offline download date", () => {
  it("records the actual save date without changing title or artist", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-07T13:50:00.000Z"));
    const track: Track = { id: "1", title: "Minha música", artist: "Meu artista", artwork: "", duration: 180 };
    expect(markDownloaded(track)).toEqual({ ...track, downloadedAt: "2026-11-07T13:50:00.000Z" });
    expect(track.downloadedAt).toBeUndefined();
  });
});