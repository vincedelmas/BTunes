import {rpc} from "@/lib/rpc";
import {useEffect, useEffectEvent} from "react";
import type {PlayerState} from "@/types/player";
import type {Track} from "../../../shared/types/library";
import type {MediaCommand} from "../../../shared/types/media";


export function useMediaSession(player: PlayerState, track?: Track) {
    const active = Boolean(track);
    const canWrap = player.repeat !== "off" && player.queue.length > 0;
    const canGoNext = active && (player.queueIndex < player.queue.length - 1 || canWrap);
    const canGoPrevious = active && (player.queueIndex > 0 || canWrap);

    const handleNativeCommand = useEffectEvent((command: MediaCommand) => {
        switch (command.action) {
            case "play":
                player.play();
                break;
            case "pause":
                player.audio.current?.pause();
                break;
            case "stop":
                player.stop();
                break;
            case "next":
                player.next();
                break;
            case "previous":
                player.next(-1);
                break;
            case "toggle":
                player.toggle();
                break;
            case "stream-volume":
                player.setVolume(command.volume);
                player.setNativeVolume(command.native);
                break;
            case "volume":
                player.setVolume(command.volume);
                break;
        }
    });

    useEffect(() => {
        if (!window.btunes.nativeMedia) return;

        return window.btunes.onMediaCommand((command) => handleNativeCommand(command));
    }, []);

    useEffect(() => {
        if (!window.btunes.nativeMedia) return;

        void rpc("media.update", {
            active,
            canGoNext,
            canGoPrevious,
            volume: player.volume,
            playing: player.playing,
            track: track ? { id: track.id, title: track.title, album: track.album, artist: track.artist } : undefined,
        }).catch(console.error);
    }, [active, canGoNext, canGoPrevious, player.volume, player.playing, track]);

    const handleAction = useEffectEvent((action: MediaSessionAction) => {
        switch (action) {
            case "play":
                player.play();
                break;
            case "pause":
                player.audio.current?.pause();
                break;
            case "stop":
                player.stop();
                break;
            case "nexttrack":
                player.next();
                break;
            case "previoustrack":
                player.next(-1);
                break;
        }
    });

    useEffect(() => {
        if (!navigator.mediaSession) return;

        const session = navigator.mediaSession;
        const actions: [MediaSessionAction, boolean][] = [
            ["play", active],
            ["pause", active],
            ["stop", active],
            ["nexttrack", canGoNext],
            ["previoustrack", canGoPrevious],
        ];

        for (const [action, enabled] of actions) {
            session.setActionHandler(action, enabled ? () => handleAction(action) : null);
        }

        return () => {
            for (const [action] of actions) session.setActionHandler(action, null);
        };
    }, [active, canGoNext, canGoPrevious]);

    useEffect(() => {
        if (!navigator.mediaSession) return;

        navigator.mediaSession.metadata = track ? new MediaMetadata({
            title: track.title,
            album: track.album,
            artist: track.artist,
        }) : null;
    }, [track]);

    useEffect(() => {
        if (!navigator.mediaSession) return;
        if (!active) {
            navigator.mediaSession.playbackState = "none";
            return;
        }

        navigator.mediaSession.playbackState = player.playing ? "playing" : "paused";
    }, [active, player.playing]);
}
