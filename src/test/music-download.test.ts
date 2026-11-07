import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Blob as NodeBlob } from "node:buffer";
import { downloadTrack, fetchAudio, directDownloadUrl } from "@/lib/music";

afterEach(() => vi.unstubAllGlobals());
beforeEach(() => vi.stubGlobal("Blob", NodeBlob));
describe("Direct audio downloads", () => {
  it("uses source audio instead of the complete source page", () => {
    expect(directDownloadUrl({ id: "ia:album/song.mp3", title: "Song", artist: "Artist", artwork: "", duration: 180, source: "archive", preview: "https://archive.org/download/album/song.mp3", pageUrl: "https://archive.org/details/album" })).toBe("https://archive.org/download/album/song.mp3");
  });
  it("uses the Audius audio endpoint rather than the artist page", () => {
    expect(directDownloadUrl({ id: "abc", title: "Song", artist: "Artist", artwork: "", duration: 180, source: "audius", pageUrl: "https://audius.co/artist/song" })).toBe("https://api.audius.co/v1/tracks/abc/stream?app_name=RIAmp");
  });
  it("does not invent a download link for a source page without audio", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await expect(downloadTrack({ id: "ia:album", title: "Song", artist: "Artist", artwork: "", duration: 180, source: "archive", pageUrl: "https://archive.org/details/album" })).rejects.toThrow("link direto");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("never downloads famous-artist previews", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await expect(downloadTrack({ id: "it:1", title: "Song", artist: "Artist", artwork: "", duration: 30, source: "preview" })).rejects.toThrow("Prévias");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects site pages instead of saving them as music", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Site</html>", { headers: { "content-type": "text/html" } })));
    await expect(fetchAudio("https://example.com/song")).rejects.toThrow("página");
  });
  it("does not store an unsuccessful response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("denied", { status: 403 })));
    await expect(fetchAudio("https://example.com/song.mp3")).rejects.toThrow("não liberou");
  });
  it("reads the complete audio response and reports progress", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new Uint8Array([73, 68, 51, 1, 2, 3]), { headers: { "content-type": "audio/mpeg", "content-length": "6" } })));
    const progress = vi.fn();
    const audio = await fetchAudio("https://example.com/song.mp3", progress);
    expect(audio.size).toBe(6);
    expect(progress).toHaveBeenCalledWith(99);
  });
  it("rejects an empty audio file", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new Uint8Array(), { headers: { "content-type": "audio/mpeg" } })));
    await expect(fetchAudio("https://example.com/song.mp3")).rejects.toThrow("vazio");
  });
});