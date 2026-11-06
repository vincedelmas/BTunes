import type {IAudioMetadata} from "music-metadata";

export function readTags(metadata: IAudioMetadata) {
    let artist = metadata.common.artist ?? "";
    const legacy = metadata.native["ID3v2.3"] ?? metadata.native["ID3v2.2"];
    const credits = legacy?.filter((tag) => tag.id === "TPE1" || tag.id === "TP1")
        .map((tag) => tag.value).filter((value): value is string => typeof value === "string");

    // Older ID3 text uses '/' as a separator, even inside literal names such as AC/DC.
    if (credits && credits.length > 1 && artist === credits[0]) artist = credits.join("/");

    return {
        artist,
        title: metadata.common.title ?? "",
        album: metadata.common.album ?? "",
        albumArtist: metadata.common.albumartist ?? "",
        genre: metadata.common.genre?.[0] ?? "",
        year: metadata.common.year ?? 0,
    };
}
