import dbus from "dbus-next";
import type {MediaState, MediaCommand} from "../../shared/types/media.ts";


const {Interface} = dbus.interface;
const objectPath = "/org/mpris/MediaPlayer2";


class MediaRoot extends Interface {
    CanQuit = false;
    CanRaise = false;
    Identity = "BTunes";
    HasTrackList = false;
    DesktopEntry = "btunes";
    SupportedMimeTypes: string[] = [];
    SupportedUriSchemes: string[] = [];

    constructor() {
        super("org.mpris.MediaPlayer2");
    }

    Raise() {}

    Quit() {}
}

MediaRoot.configureMembers({
    methods: { Raise: {}, Quit: {} },
    properties: {
        CanQuit: { signature: "b", access: "read" },
        CanRaise: { signature: "b", access: "read" },
        Identity: { signature: "s", access: "read" },
        HasTrackList: { signature: "b", access: "read" },
        DesktopEntry: { signature: "s", access: "read" },
        SupportedMimeTypes: { signature: "as", access: "read" },
        SupportedUriSchemes: { signature: "as", access: "read" },
    },
});


class MediaPlayer extends Interface {
    Rate = 1;
    CanPlay = false;
    CanSeek = false;
    CanPause = false;
    CanGoNext = false;
    CanControl = true;
    MinimumRate = 1;
    MaximumRate = 1;
    CanGoPrevious = false;
    PlaybackStatus = "Stopped";
    Metadata: Record<string, dbus.Variant> = {};
    private volume = 0.7;

    private readonly send: (command: MediaCommand) => void;

    constructor(send: (command: MediaCommand) => void) {
        super("org.mpris.MediaPlayer2.Player");
        this.send = send;
    }

    get Volume() {
        return this.volume;
    }

    set Volume(value: number) {
        if (!Number.isFinite(value)) return;

        this.volume = Math.max(0, Math.min(1, value));
        Interface.emitPropertiesChanged(this, { Volume: this.volume }, []);
        this.send({ action: "volume", volume: this.volume });
    }

    Play() {
        this.send({ action: "play" });
    }

    Stop() {
        this.send({ action: "stop" });
    }

    Next() {
        this.send({ action: "next" });
    }

    Pause() {
        this.send({ action: "pause" });
    }

    Previous() {
        this.send({ action: "previous" });
    }

    PlayPause() {
        this.send({ action: "toggle" });
    }

    update(state: MediaState) {
        this.volume = state.volume;
        this.CanPlay = state.active;
        this.CanPause = state.active;
        this.CanGoNext = state.canGoNext;
        this.CanGoPrevious = state.canGoPrevious;
        this.PlaybackStatus = "Stopped";
        if (state.active) this.PlaybackStatus = state.playing ? "Playing" : "Paused";

        this.Metadata = state.track ? {
            "mpris:trackid": new dbus.Variant("o", `${objectPath}/track/${state.track.id}`),
            "xesam:title": new dbus.Variant("s", state.track.title),
            "xesam:album": new dbus.Variant("s", state.track.album),
            "xesam:artist": new dbus.Variant("as", [state.track.artist]),
        } : {};

        Interface.emitPropertiesChanged(this, {
            Volume: this.volume,
            Metadata: this.Metadata,
            CanPlay: this.CanPlay,
            CanPause: this.CanPause,
            CanGoNext: this.CanGoNext,
            CanGoPrevious: this.CanGoPrevious,
            PlaybackStatus: this.PlaybackStatus,
        }, []);
    }
}

MediaPlayer.configureMembers({
    methods: { Play: {}, Stop: {}, Next: {}, Pause: {}, Previous: {}, PlayPause: {} },
    properties: {
        Rate: { signature: "d", access: "read" },
        Volume: { signature: "d", access: "readwrite" },
        CanPlay: { signature: "b", access: "read" },
        CanSeek: { signature: "b", access: "read" },
        CanPause: { signature: "b", access: "read" },
        CanGoNext: { signature: "b", access: "read" },
        CanControl: { signature: "b", access: "read" },
        MinimumRate: { signature: "d", access: "read" },
        MaximumRate: { signature: "d", access: "read" },
        CanGoPrevious: { signature: "b", access: "read" },
        PlaybackStatus: { signature: "s", access: "read" },
        Metadata: { signature: "a{sv}", access: "read" },
    },
});


export async function startMediaPlayer(send: (command: MediaCommand) => void) {
    const bus = dbus.sessionBus();
    bus.on("error", (error: Error) => console.error("Desktop media controls:", error.message));

    try {
        const player = new MediaPlayer(send);
        bus.export(objectPath, new MediaRoot());
        bus.export(objectPath, player);
        await bus.requestName(`org.mpris.MediaPlayer2.btunes.instance${process.pid}`, 4);

        return { player, close: () => bus.disconnect() };
    }
    catch (error) {
        bus.disconnect();
        throw error;
    }
}
