const extensions = new Set([".mp3", ".flac", ".ogg", ".opus", ".m4a", ".aac", ".wav", ".aiff"]);

export function isAudioFile(name: string) {
    return extensions.has(name.slice(name.lastIndexOf(".")).toLowerCase());
}
