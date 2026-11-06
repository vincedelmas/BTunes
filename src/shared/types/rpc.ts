import type {z} from "zod";
import type {rpcSchemas} from "../schemas/rpc.ts";
import type {Snapshot} from "./library";
import type {TagPreview, TagSaveResult} from "./tags";

import type {ArtworkCandidate} from "./artwork";

type RpcOutputs = {
    "artwork.search": ArtworkCandidate[];
    "tags.preview": TagPreview;
    "tags.save": TagSaveResult;
    "library.get": Snapshot | null;
    "library.import": { imported: number; errors: string[] } | null;
    "track.reveal": void;
    "track.favorite": void;
    "track.played": void;
    "playlist.remove": void;
    "playlist.add": void;
    "playlist.tracks": number[];
    "playlist.create": number;
    "playlist.update": void;
    "playlist.delete": void;
};

export type RpcInput<K extends keyof typeof rpcSchemas> = z.infer<(typeof rpcSchemas)[K]>;

export type Rpc = <K extends keyof RpcOutputs>(method: K, input: RpcInput<K>) => Promise<RpcOutputs[K]>;

declare global {
    interface Window {
        btunes: { rpc: Rpc };
    }
}
