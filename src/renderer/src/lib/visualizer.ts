import type {VisualizerStyle} from "@/types/appearance";


export function drawVisualizer(
    context: CanvasRenderingContext2D,
    style: VisualizerStyle,
    frequency: Uint8Array,
    waveform: Uint8Array,
    width: number,
    height: number,
    primary: string,
    accent: string,
) {
    context.clearRect(0, 0, width, height);
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, primary);
    gradient.addColorStop(1, accent);
    context.fillStyle = gradient;
    context.strokeStyle = gradient;
    context.lineWidth = 1.5;
    context.lineCap = "round";

    if (style === "waveform") {
        context.beginPath();

        for (let index = 0; index < waveform.length; index += 4) {
            const x = index / (waveform.length - 1) * width;
            const y = height / 2 + (waveform[index] - 128) / 128 * (height / 2 - 3);
            if (!index) context.moveTo(x, y);
            else context.lineTo(x, y);
        }

        context.stroke();
        return;
    }

    if (style === "orbit") {
        const segments = 64;
        const radius = height * 0.24;
        context.beginPath();

        for (let index = 0; index <= segments; index++) {
            const angle = index / segments * Math.PI * 2;
            const level = frequency[Math.floor((index % segments) / segments * frequency.length / 2)] / 255;
            const distance = radius + level * height * 0.2;
            const x = width / 2 + Math.cos(angle) * distance * 2.6;
            const y = height / 2 + Math.sin(angle) * distance;
            if (!index) context.moveTo(x, y);
            else context.lineTo(x, y);
        }

        context.closePath();
        context.stroke();
        return;
    }

    const bars = Math.min(96, Math.max(32, Math.floor(width / 6)));
    const spacing = width / bars;

    for (let index = 0; index < bars; index++) {
        const start = Math.floor(frequency.length ** (index / bars)) - 1;
        const end = Math.max(start + 1, Math.floor(frequency.length ** ((index + 1) / bars)));
        let peak = 0;

        for (let bin = start; bin < end; bin++) peak = Math.max(peak, frequency[bin]);

        const barHeight = Math.max(2, peak / 255 * (height - 4));
        context.beginPath();
        context.roundRect(index * spacing, height - barHeight - 2, Math.max(1, spacing - 2), barHeight, 1);
        context.fill();
    }
}
