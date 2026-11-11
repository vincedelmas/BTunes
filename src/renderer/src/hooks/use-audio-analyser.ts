import type {RefObject} from "react";
import {useEffect, useRef} from "react";


export function useAudioAnalyser(audio: RefObject<HTMLAudioElement | null>, enabled: boolean) {
    const graph = useRef<{ context: AudioContext; analyser: AnalyserNode } | null>(null);
    const analyser = useRef<AnalyserNode | null>(null);

    useEffect(() => {
        const media = audio.current;
        if (!media || !enabled) return;

        function connect() {
            try {
                if (!graph.current) {
                    const context = new AudioContext();
                    const source = context.createMediaElementSource(media!);
                    const meter = context.createAnalyser();
                    meter.fftSize = 1024;
                    meter.smoothingTimeConstant = 0.8;

                    // Keep the audible path connected when the visualizer is hidden or changed.
                    source.connect(context.destination);
                    source.connect(meter);
                    graph.current = { context, analyser: meter };
                    analyser.current = meter;
                }

                void graph.current.context.resume().catch(() => undefined);
            }
            catch {
                // Audio playback remains available if Web Audio is unsupported.
            }
        }

        media.addEventListener("play", connect);
        if (!media.paused) connect();

        return () => media.removeEventListener("play", connect);
    }, [audio, enabled]);

    useEffect(() => {
        const close = () => void graph.current?.context.close().catch(() => undefined);
        window.addEventListener("pagehide", close, { once: true });

        // Strict Mode can replay effects; the media source must survive that replay.
        return () => window.removeEventListener("pagehide", close);
    }, []);

    return analyser;
}
