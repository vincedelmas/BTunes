import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {MtpClient} from "./services/mtp";
import {TagService} from "./services/tags";
import {serveAudio} from "./services/audio";
import electronUpdater from "electron-updater";
import {downloadRoutes} from "./rpc/downloads";
import {rpcSchemas} from "../shared/schemas/rpc";
import {ArtworkService} from "./services/artwork";
import {LibraryService} from "./services/library";
import {DownloaderService} from "./services/downloads";
import {fileDropMenu} from "./services/file-drop-menu";
import {AppUpdateService} from "./services/app-updates";
import {DownloadTools} from "./services/download-tools";
import {startMediaPlayer} from "./services/media-player";
import {DeviceSyncService} from "./services/device-sync";
import {FileImportService} from "./services/file-import";
import {LibraryRepository} from "./repositories/library";
import {DownloadRepository} from "./repositories/downloads";
import {StreamVolumeService} from "./services/stream-volume";
import type {RpcInput, RpcRoutes} from "../shared/types/rpc";
import {version as applicationVersion} from "../../package.json";
import {readWindowState, saveWindowState} from "./services/window-state";
import {app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, screen, shell} from "electron";


app.setName("BTunes");


if (process.platform === "linux") {
    app.setDesktopName("btunes.desktop");
    // BTunes publishes writable MPRIS volume; Chromium publishes a fixed 100%.
    app.commandLine.appendSwitch("disable-features", [
        app.commandLine.getSwitchValue("disable-features"),
        "HardwareMediaKeyHandling",
    ].filter(Boolean).join(","));

    const platform = app.commandLine.getSwitchValue("ozone-platform");
    const waylandSession = process.env.XDG_SESSION_TYPE === "wayland" || Boolean(process.env.WAYLAND_DISPLAY);
    const usesWayland = platform === "wayland" || ((!platform || platform === "auto") && waylandSession);

    if (usesWayland && !app.commandLine.hasSwitch("use-webgpu-adapter")) {
        // WebGPU otherwise probes native Vulkan even when the UI already renders with OpenGL.
        app.commandLine.appendSwitch("use-webgpu-adapter", "opengles");
    }
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
        corsEnabled: true,
    },
}]);


let quitting = false;
let installingUpdate = false;
let updates: AppUpdateService;
let service: LibraryService;
let devices: DeviceSyncService;
let downloads: DownloaderService;
let streamVolume: StreamVolumeService | undefined;
let desktopMedia: Awaited<ReturnType<typeof startMediaPlayer>> | undefined;
const pendingWrites = new Set<Promise<unknown>>();

async function trackWrite<T>(write: Promise<T>) {
    pendingWrites.add(write);
    try {
        return await write;
    }
    finally {
        pendingWrites.delete(write);
    }
}


void app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);

    const repo = new LibraryRepository(
        join(app.getPath("userData"), "library.sqlite"),
        app.isPackaged ? join(process.resourcesPath, "drizzle") : join(__dirname, "../../drizzle"),
    );

    service = new LibraryService(repo, join(app.getPath("userData"), "covers"));
    const downloadRepo = new DownloadRepository(repo.db);
    const tools = new DownloadTools(join(app.getPath("userData"), "download-tools"), () => downloads.changed());
    const artwork = new ArtworkService(fetch, () => tools.ffmpeg());
    downloads = new DownloaderService(downloadRepo, service, artwork, tools, join(app.getPath("userData"), "download-staging"));
    const fileImport = new FileImportService(service);
    devices = new DeviceSyncService(repo, new MtpClient());
    const tags = new TagService(service, join(app.getPath("userData"), "tag-backups"), () => tools.ffmpeg());

    const updatesEnabled = app.isPackaged && process.platform === "linux" && process.arch === "x64" && Boolean(process.env.APPIMAGE);
    updates = new AppUpdateService({
        adapter: updatesEnabled ? electronUpdater.autoUpdater : undefined,
        version: app.isPackaged ? app.getVersion() : applicationVersion,
        enabled: updatesEnabled,
        stateFile: join(app.getPath("userData"), "app-updates.json"),
        beforeInstall: async () => {
            await Promise.allSettled(pendingWrites);
            await downloads.close();
            await devices.close();
        },
    });

    const routes = {
        "media.update": {
            schema: rpcSchemas["media.update"],
            run: (input: RpcInput<"media.update">) => {
                desktopMedia?.player.update(input);
                void streamVolume?.setVolume(input.volume);
            },
        },
        "updates.get": { schema: rpcSchemas["updates.get"], run: () => updates.get() },
        "updates.check": { schema: rpcSchemas["updates.check"], run: () => updates.check() },
        "updates.download": { schema: rpcSchemas["updates.download"], run: () => updates.download() },
        "updates.dismiss": { schema: rpcSchemas["updates.dismiss"], run: () => updates.dismiss() },
        "updates.install": {
            schema: rpcSchemas["updates.install"],
            run: async () => {
                installingUpdate = true;
                try {
                    await updates.install();
                }
                catch (error) {
                    installingUpdate = false;
                    throw error;
                }
            },
        },
        ...downloadRoutes(downloads, downloadRepo, service, tools, artwork),
        "devices.list": { schema: rpcSchemas["devices.list"], run: () => devices.transport.devices() },
        "devices.browse": {
            schema: rpcSchemas["devices.browse"],
            run: (input: RpcInput<"devices.browse">) => devices.transport.files(input.storageId, input.path),
        },
        "devices.mkdir": {
            schema: rpcSchemas["devices.mkdir"],
            run: (input: RpcInput<"devices.mkdir">) => trackWrite(devices.transport.mkdir(input.storageId, input.path)),
        },
        "devices.compare": {
            schema: rpcSchemas["devices.compare"],
            run: (input: RpcInput<"devices.compare">) => devices.compare(input.storageId, input.path),
        },
        "devices.status": { schema: rpcSchemas["devices.status"], run: () => devices.status() },
        "devices.sync": { schema: rpcSchemas["devices.sync"], run: () => devices.sync() },
        "devices.cancel": { schema: rpcSchemas["devices.cancel"], run: () => devices.cancel() },
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
                return trackWrite(tags.save(input.token));
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

        "library.drop": {
            schema: rpcSchemas["library.drop"],
            run: (input: RpcInput<"library.drop">) => trackWrite((async () => {
                const choice = await fileDropMenu(win, repo.watchedFolders().map((folder) => folder.path), input.x, input.y);
                return choice ? fileImport.import(input.paths, choice) : null;
            })()),
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

    const windowStatePath = join(app.getPath("userData"), "window-state.json");
    const windowState = readWindowState(windowStatePath, screen.getAllDisplays().map((display) => display.workArea));

    const win = new BrowserWindow({
        x: windowState?.x,
        y: windowState?.y,
        width: windowState?.width ?? 1440,
        height: windowState?.height ?? 940,
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

    win.on("close", () => saveWindowState(windowStatePath, win));
    if (windowState?.maximized) win.maximize();
    if (windowState?.fullscreen) win.setFullScreen(true);

    if (process.platform === "linux") {
        streamVolume = new StreamVolumeService((volume, native) => {
            if (!win.isDestroyed()) win.webContents.send("media-command", { action: "stream-volume", volume, native });
        });
        streamVolume.start();
        desktopMedia = await startMediaPlayer((command) => {
            if (!win.isDestroyed()) win.webContents.send("media-command", command);
        }).catch((error: unknown) => {
            console.error("Desktop media controls unavailable:", error);
            return undefined;
        });
    }

    win.on("closed", () => {
        streamVolume?.close();
        desktopMedia?.close();
    });

    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.webContents.on("will-navigate", (ev, url) => {
        const developmentUrl = process.env.ELECTRON_RENDERER_URL;
        if (developmentUrl && new URL(url).href === new URL(developmentUrl).href) return;

        ev.preventDefault();
    });

    ipcMain.handle("rpc", async (ev, method: unknown, input: unknown) => {
        if (quitting || installingUpdate) throw new Error("The application is shutting down.");
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

        if (url.hostname === "download-cover" && /^[\w-]{11}$/.test(url.pathname.slice(1))) {
            return downloads.cover(url.pathname.slice(1))
                .then((data) => new Response(new Uint8Array(data), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=600" } }))
                .catch(() => new Response("Cover not found", { status: 404 }));
        }

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
        try {
            await win.loadURL(process.env.ELECTRON_RENDERER_URL);
        }
        catch (error) {
            // Vite can reload the page while its initial dependency optimization finishes.
            if (!(error instanceof Error) || !("code" in error) || error.code !== "ERR_ABORTED") throw error;
        }
    }
    else {
        await win.loadFile(join(__dirname, "../renderer/index.html"));
    }

    updates.start();
}).catch((error: unknown) => {
    console.error("BTunes startup failed:", error);
    dialog.showErrorBox("BTunes could not start", error instanceof Error ? error.message : String(error));
    app.quit();
});


app.on("window-all-closed", () => app.quit());


app.on("before-quit", (ev) => {
    if (service && !quitting) {
        ev.preventDefault();

        quitting = true;
        updates?.close();
        void Promise.allSettled(pendingWrites)
            .then(() => downloads.close())
            .then(() => devices.close())
            .then(() => service.close())
            .finally(() => app.quit());
    }
});
