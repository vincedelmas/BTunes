import type {ArtworkCandidate} from "../../shared/types/artwork.ts";

export interface EmbeddedArtwork {
    data: Buffer;
    hash: string;
}


export interface CachedArtwork {
    url: string;
    expiresAt: number;
    previewUrl: string;
    preview?: ArtworkImage;
    artwork?: EmbeddedArtwork;
    loading?: Promise<EmbeddedArtwork>;
    previewLoading?: Promise<ArtworkImage>;
}

export interface ArtworkImage {
    data: Buffer;
    contentType: string;
}

export interface CachedArtworkSearch {
    expiresAt: number;
    pending: Promise<ArtworkCandidate[]>;
}
