import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {TagService} from "./services/tags";
import {serveAudio} from "./services/audio";
import {rpcSchemas} from "../shared/schemas/rpc";
import type {RpcInput, RpcRoutes} from "../shared/types/rpc";
import {ArtworkService} from "./services/artwork";
import {LibraryService} from "./services/library";
import {LibraryRepository} from "./repositories/library";
import {app, BrowserWindow, dialog, ipcMain, net, protocol, shell} from "electron";


app.setName("BTunes");


if (process.platform === "linux") {
    app.setDesktopName("btunes.desktop");
}


const applicationData = app.getPath("appData");
const defaultUserData = join(applicationData, "BTunes");


// Keep explicit profiles used by tests or custom launchers
if (app.getPath("userData") === join(applicationData, "btunes")) {
    app.setPath("userData", defaultUserData);
}


protocol.registerSchemesAsPrivileged([{
    scheme: "btunes",
    privileges: {
        secure: true,
        stream: true,
        standard: true,
        supportFetchAPI: true,
    },
}]);


let quitting = false;
let service: LibraryService;
const pendingWrites = new Set<Promise<unknown>>();


void app.whenReady().then(async () => {
    const repo = new LibraryRepository(
        join(app.getPath("userData"), "library.sqlite"),
        app.isPackaged ? join(process.resourcesPath, "drizzle") : join(__dirname, "../../drizzle"),
    );

    service = new LibraryService(repo, join(app.getPath("userData"), "covers"));
    const artwork = new ArtworkService();
    const tags = new TagService(service, join(app.getPath("userData"), "tag-backups"));

    const routes = {
        "library.refresh": { schema: rpcSchemas["library.refresh"], run: () => service.reconcile() },
        "artwork.search": {
            schema: rpcSchemas["artwork.search"],
            run: (input: RpcInput<"artwork.search">) => artwork.search(input.query),
        },
        "tags.preview": {
            schema: rpcSchemas["tags.preview"],
            run: async (input: RpcInput<"tags.preview">) => tags.preview(input.ids, input.patch, input.artworkId ? await artwork.get(input.artworkId) : undefined),
        },

        "tags.save": {
            schema: rpcSchemas["tags.save"],
            run: async (input: RpcInput<"tags.save">) => {
                const write = tags.save(input.token);
                pendingWrites.add(write);

                try {
                    return await write;
                }
                finally {
                    pendingWrites.delete(write);
                }
            },
        },

        "library.get": {
            schema: rpcSchemas["library.get"],
            run: (input: RpcInput<"library.get">) => input?.revision === repo.revision ? null : repo.snapshot(),
        },
        "track.reveal": {
            schema: rpcSchemas["track.reveal"],
            run: (input: RpcInput<"track.reveal">) => {
                const track = repo.get(input.id);
                if (!track) throw new Error("Track not found.");
                shell.showItemInFolder(track.path);
            },
        },
        "playlist.remove": {
            schema: rpcSchemas["playlist.remove"],
            run: (input: RpcInput<"playlist.remove">) => repo.removeFromPlaylist(input.playlistId, "trackIds" in input ? input.trackIds : input.trackId),
        },

        "library.import": {
            schema: rpcSchemas["library.import"],
            run: async () => {
                const result = await dialog.showOpenDialog({
                    properties: ["openDirectory"],
                    title: "Choose a music folder",
                });
                return result.canceled ? null : service.scan(result.filePaths[0]);
            },
        },

        "track.favorite": {
            schema: rpcSchemas["track.favorite"],
            run: (input: RpcInput<"track.favorite">) => repo.favorite(input.id),
        },

        "track.played": {
            schema: rpcSchemas["track.played"],
            run: (input: RpcInput<"track.played">) => repo.played(input.id),
        },

        "playlist.create": {
            schema: rpcSchemas["playlist.create"],
            run: (input: RpcInput<"playlist.create">) => repo.create(input.name, input.rule),
        },

        "playlist.update": {
            schema: rpcSchemas["playlist.update"],
            run: (input: RpcInput<"playlist.update">) => repo.updatePlaylist(input.id, input.name, input.rule),
        },

        "playlist.delete": {
            schema: rpcSchemas["playlist.delete"],
            run: (input: RpcInput<"playlist.delete">) => repo.deletePlaylist(input.id),
        },

        "playlist.add": {
            schema: rpcSchemas["playlist.add"],
            run: (input: RpcInput<"playlist.add">) => repo.add(input.playlistId, "trackIds" in input ? input.trackIds : input.trackId),
        },

        "playlist.tracks": {
            schema: rpcSchemas["playlist.tracks"],
            run: (input: RpcInput<"playlist.tracks">) => repo.playlist(input.id),
        },
    } satisfies RpcRoutes;

    const win = new BrowserWindow({
        width: 1440,
        height: 940,
        minWidth: 1000,
        minHeight: 700,
        title: "BTunes",
        icon: join(app.isPackaged ? process.resourcesPath : join(__dirname, "../../resources"), "icon.png"),
        backgroundColor: "#000000",
        webPreferences: {
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false,
            preload: join(__dirname, "../preload/index.js"),
        },
    });

    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.webContents.on("will-navigate", (ev) => ev.preventDefault());

    ipcMain.handle("rpc", async (ev, method: unknown, input: unknown) => {
        if (quitting) throw new Error("The application is shutting down.");
        if (ev.sender !== win.webContents || ev.senderFrame !== win.webContents.mainFrame) {
            throw new Error("Access denied");

        }
        if (typeof method !== "string" || !Object.hasOwn(routes, method)) {
            throw new Error("Unknown method");
        }

        const route = routes[method as keyof typeof routes];

        return (route.run as (x: unknown) => unknown)(route.schema.parse(input));
    });

    protocol.handle("btunes", (request) => {
        const url = new URL(request.url);

        if (url.hostname === "artwork") {
            return artwork.preview(url.pathname.slice(1))
                .then((image) => new Response(new Uint8Array(image.data), { headers: { "Content-Type": image.contentType, "Cache-Control": "private, max-age=600" } }))
                .catch(() => new Response("Cover not found", { status: 404 }));
        }

        if (url.hostname === "audio") {
            const track = repo.get(Number(url.pathname.slice(1)));
            if (track) {
                return serveAudio(track.path, request).catch(() => new Response("Audio file not found", { status: 404 }));
            }
        }

        if (url.hostname === "cover" && /^[a-f0-9]{64}$/.test(url.pathname.slice(1)))
            return net.fetch(pathToFileURL(join(service.covers, url.pathname.slice(1))).href);

        return new Response("Not found", { status: 404 });
    });

    await service.startWatching();
    void service.reconcile().catch(console.error);

    if (process.env.ELECTRON_RENDERER_URL) {
        await win.loadURL(process.env.ELECTRON_RENDERER_URL);
    }
    else {
        await win.loadFile(join(__dirname, "../renderer/index.html"));
    }
});


app.on("window-all-closed", () => app.quit());


app.on("before-quit", (ev) => {
    if (service && !quitting) {
        ev.preventDefault();

        quitting = true;
        void Promise.allSettled(pendingWrites)
            .then(() => service.close())
            .finally(() => app.quit());
    }
});
