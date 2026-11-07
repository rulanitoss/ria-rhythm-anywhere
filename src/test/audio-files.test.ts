import { describe, expect, it } from "vitest";
import { isAudioFile, localTrackId } from "@/lib/audio-files";

describe("Authorized folder import", () => {
  it("imports music candidates but excludes other folder files", () => {
    const files = [
      { name: "Artista - Música.MP3", type: "" },
      { name: "gravação", type: "audio/wav" },
      { name: "foto.jpg", type: "image/jpeg" },
      { name: "documento.pdf", type: "application/pdf" },
      { name: "notas.txt", type: "text/plain" },
    ];
    expect(files.filter(isAudioFile).map((file) => file.name)).toEqual(["Artista - Música.MP3", "gravação"]);
  });
  it("keeps equally named songs in different subfolders distinct", () => {
    expect(localTrackId({ name: "song.mp3", size: 100, webkitRelativePath: "Music/One/song.mp3" })).not.toBe(localTrackId({ name: "song.mp3", size: 100, webkitRelativePath: "Music/Two/song.mp3" }));
  });
  it("reimporting the same folder file uses the same library entry", () => {
    expect(localTrackId({ name: "song.mp3", size: 100, webkitRelativePath: "Music/song.mp3" })).toBe("local:Music/song.mp3:100");
  });
});