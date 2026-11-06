import type {ArtworkCandidate} from "../../shared/types/artwork.ts";

export interface EmbeddedArtwork {
    data: Buffer;
    hash: string;
}


export interface CachedArtwork {
    url: string;
    previewUrl: string;
    preview?: ArtworkImage;
    previewLoading?: Promise<ArtworkImage>;
    expiresAt: number;
    artwork?: EmbeddedArtwork;
    loading?: Promise<EmbeddedArtwork>;
}

export interface ArtworkImage {
    data: Buffer;
    contentType: string;
}

export interface CachedArtworkSearch {
    expiresAt: number;
    pending: Promise<ArtworkCandidate[]>;
}
