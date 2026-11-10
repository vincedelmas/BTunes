import {useEffect, useRef} from "react";
import type {RefObject} from "react";
import type {VisualizerStyle} from "@/types/appearance";
import {drawVisualizer} from "@/lib/visualizer";


interface SoundVisualizerProps {
    analyser: RefObject<AnalyserNode | null>;
    style: VisualizerStyle;
    playing: boolean;
}


export function SoundVisualizer({ analyser, style, playing }: SoundVisualizerProps) {
    const canvas = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const element = canvas.current;
        const context = element?.getContext("2d");
        if (!element || !context || style === "off") return;

        const frequency = new Uint8Array(512);
        const waveform = new Uint8Array(1024);
        const colors = getComputedStyle(element);
        const primary = colors.getPropertyValue("--primary").trim();
        const accent = colors.getPropertyValue("--info").trim();
        const motion = matchMedia("(prefers-reduced-motion: reduce)");
        let frame = 0;
        let lastDraw = -Infinity;
        let width = 0;
        let height = 0;

        function draw(time: number) {
            if (time - lastDraw >= 1000 / 30) {
                frequency.fill(0);
                waveform.fill(128);

                if (playing && !motion.matches) {
                    analyser.current?.getByteFrequencyData(frequency);
                    analyser.current?.getByteTimeDomainData(waveform);
                }

                drawVisualizer(context!, style, frequency, waveform, width, height, primary, accent);
                lastDraw = time;
            }

            if (playing && !document.hidden && !motion.matches) frame = requestAnimationFrame(draw);
        }

        function restart() {
            cancelAnimationFrame(frame);
            lastDraw = -Infinity;
            if (!document.hidden) draw(performance.now());
        }

        const observer = new ResizeObserver(() => {
            const bounds = element.getBoundingClientRect();
            const scale = Math.min(devicePixelRatio || 1, 2);
            width = bounds.width;
            height = bounds.height;
            element.width = Math.round(width * scale);
            element.height = Math.round(height * scale);
            context.setTransform(scale, 0, 0, scale, 0, 0);
            restart();
        });

        observer.observe(element);
        document.addEventListener("visibilitychange", restart);
        motion.addEventListener("change", restart);

        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            document.removeEventListener("visibilitychange", restart);
            motion.removeEventListener("change", restart);
        };
    }, [analyser, style, playing]);

    if (style === "off") return null;

    return <canvas
        ref={canvas}
        className="sound-visualizer h-8 w-40 shrink-0"
        role="img"
        aria-label={"Sound visualizer: " + style}
        data-style={style}
    />;
}
