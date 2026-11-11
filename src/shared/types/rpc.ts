import type {z} from "zod";
import type {Snapshot} from "./library";
import type {UpdateState} from "./updates";
import type {ArtworkCandidate} from "./artwork";
import type {rpcSchemas} from "../schemas/rpc.ts";
import type {FileImportResult} from "./file-import";
import type {TagPreview, TagSaveResult} from "./tags";
import type {DeviceFile, DeviceSyncState, MusicDevice} from "./devices";
import type {BookmarkFolder, DownloaderSettings, DownloadSnapshot} from "./downloads";


type RpcOutputs = {
    "updates.get": UpdateState;
    "updates.check": void;
    "updates.download": void;
    "updates.install": void;
    "updates.dismiss": void;
    "downloads.enter": void;
    "downloads.get": DownloadSnapshot | null;
    "downloads.start": void;
    "downloads.cancel": void;
    "downloads.publish": void;
    "downloads.tools": void;
    "downloads.settings.get": DownloaderSettings;
    "downloads.settings.save": DownloaderSettings;
    "downloads.settings.import": DownloaderSettings | null;
    "downloads.bookmarks.choose": string | null;
    "downloads.bookmarks.folders": BookmarkFolder[];
    "artwork.local": ArtworkCandidate | null;
    "devices.list": MusicDevice[];
    "devices.browse": DeviceFile[];
    "devices.mkdir": void;
    "devices.compare": void;
    "devices.status": DeviceSyncState;
    "devices.sync": void;
    "devices.cancel": void;
    "artwork.search": ArtworkCandidate[];
    "tags.preview": TagPreview;
    "tags.save": TagSaveResult;
    "library.get": Snapshot | null;
    "library.drop": FileImportResult | null;
    "library.refresh": { errors: string[] };
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
        btunes: { rpc: Rpc; filePaths: (files: File[]) => string[] };
    }
}


export type RpcRoutes = {
    [K in keyof RpcOutputs]: {
        schema: (typeof rpcSchemas)[K];
        run: (input: RpcInput<K>) => RpcOutputs[K] | Promise<RpcOutputs[K]>;
    };
};
