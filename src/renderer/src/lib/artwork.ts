export const coverSearchQuery = (fallbackTitle: string, values: { title: string; album: string; artist: string; albumArtist: string }) => {
    const title = values.title || fallbackTitle;
    const artist = values.albumArtist || values.artist;
    const album = values.album === "Unknown album" ? "" : values.album;

    const terms = [album || title, artist];

    return [...new Set(terms.filter((value) => value && value !== "Unknown artist"))].join(" ");
};
