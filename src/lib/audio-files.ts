/** Only audio candidates from a user-authorized file or folder selection. */
export function isAudioFile(file: Pick<File, "name" | "type">): boolean {
  return file.type.startsWith("audio/") || /\.(mp3|m4a|aac|wav|ogg|oga|flac|opus|aiff|aif|wma)$/i.test(file.name);
}

export function localTrackId(file: Pick<File, "name" | "size" | "webkitRelativePath">): string {
  return `local:${file.webkitRelativePath || file.name}:${file.size}`;
}