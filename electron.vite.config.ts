import {resolve} from "node:path";
import {defineConfig} from "electron-vite";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, {reactCompilerPreset} from "@vitejs/plugin-react";


export default defineConfig({
    main: {
        build: {
            externalizeDeps: true,
            rolldownOptions: {
                external: ["node:sqlite"],
            },
        },
    },
    preload: {
        build: {
            externalizeDeps: true,
        },
    },
    renderer: {
        resolve: {
            alias: {
                "@": resolve("src/renderer/src"),
            },
        },
        plugins: [
            react(),
            babel({ presets: [reactCompilerPreset()] }),
            tailwindcss(),
        ],
    },
});
