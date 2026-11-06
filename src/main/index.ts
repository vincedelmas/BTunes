import {z} from "zod";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {TagService} from "./services/tags";
import {serveAudio} from "./services/audio";
import {LibraryService} from "./services/library";
import {LibraryRepository} from "./repositories/library";
import {migrateLegacyUserData} from "./services/user-data";
import {type TagPatch, tagPatchSchema} from "../shared/tags";
import {app, BrowserWindow, dialog, ipcMain, net, protocol, shell} from "electron";


app.setName("BTunes");


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


app.whenReady().then(async () => {
    if (app.getPath("userData") === defaultUserData) {
        for (const legacyName of ["sillage", "Sillage"]) {
            await migrateLegacyUserData(join(applicationData, legacyName), defaultUserData);
        }
    }


    const repo = new LibraryRepository(
        join(app.getPath("userData"), "library.sqlite"),
        app.isPackaged ? join(process.resourcesPath, "drizzle") : join(__dirname, "../../drizzle"),
    );

    const id = z.object({ id: z.number().int().positive() });

    const playlistMutation = z.union([
        z.object({ playlistId: z.number().int().positive(), trackId: z.number().int().positive() }).strict(),
        z.object({ playlistId: z.number().int().positive(), trackIds: z.array(z.number().int().positive()).min(1).max(10000) }).strict(),
    ]);

    type PlaylistMutation = z.infer<typeof playlistMutation>;

    service = new LibraryService(repo, join(app.getPath("userData"), "covers"));
    const tags = new TagService(service, join(app.getPath("userData"), "tag-backups"));

    const routes = {
        "tags.preview": {
            schema: z.object({
                patch: tagPatchSchema,
                ids: z.array(z.number().int().positive()).min(1).max(100),
            }),
            run: (input: { ids: number[]; patch: TagPatch }) => tags.preview(input.ids, input.patch),
        },

        "tags.save": {
            schema: z.object({ token: z.string().uuid() }),
            run: async (input: { token: string }) => {
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
            schema: z.object({ revision: z.number().int().nonnegative() }).optional(),
            run: (input: { revision: number } | undefined) => input?.revision === repo.revision ? null : repo.snapshot(),
        },
        "track.reveal": {
            schema: id,
            run: (input: { id: number }) => {
                const track = repo.get(input.id);
                if (!track) throw new Error("Track not found.");
                shell.showItemInFolder(track.path);
            },
        },
        "playlist.remove": {
            schema: playlistMutation,
            run: (input: PlaylistMutation) => repo.removeFromPlaylist(input.playlistId, "trackIds" in input ? input.trackIds : input.trackId),
        },

        "library.import": {
            schema: z.undefined(),
            run: async () => {
                const result = await dialog.showOpenDialog({
                    properties: ["openDirectory"],
                    title: "Choose a music folder",
                });
                return result.canceled ? null : service.scan(result.filePaths[0]);
            },
        },

        "track.favorite": {
            schema: id,
            run: (input: { id: number }) => repo.favorite(input.id),
        },

        "track.played": {
            schema: id,
            run: (input: { id: number }) => repo.played(input.id),
        },

        "playlist.create": {
            schema: z.object({
                name: z.string().trim().min(1).max(100),
                rule: z.string().trim().min(1).max(100).optional(),
            }),
            run: (input: { name: string; rule?: string }) => repo.create(input.name, input.rule),
        },

        "playlist.add": {
            schema: playlistMutation,
            run: (input: PlaylistMutation) => repo.add(input.playlistId, "trackIds" in input ? input.trackIds : input.trackId),
        },

        "playlist.tracks": {
            schema: id,
            run: (input: { id: number }) => repo.playlist(input.id),
        },
    };

    const win = new BrowserWindow({
        width: 1440,
        height: 940,
        minWidth: 1000,
        minHeight: 700,
        title: "BTunes",
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
