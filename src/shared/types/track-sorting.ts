export type TrackSortField = "id" | "title" | "artist" | "albumArtist" | "album" | "genre" | "duration" | "year" | "plays" | "lastPlayed";
export type TrackSort = { field: TrackSortField; descending: boolean };

