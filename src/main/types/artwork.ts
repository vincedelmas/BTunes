export interface EmbeddedArtwork {
    data: Buffer;
    hash: string;
}


export interface CachedArtwork {
    url: string;
    expiresAt: number;
    artwork?: EmbeddedArtwork;
    loading?: Promise<EmbeddedArtwork>;
}
