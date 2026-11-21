import {resolve} from "node:path";
import {defineConfig} from "electron-vite";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, {reactCompilerPreset} from "@vitejs/plugin-react";


const commonJsOutput = {
    format: "cjs",
    entryFileNames: "[name].cjs",
    chunkFileNames: "[name]-[hash].cjs",
} as const;


export default defineConfig({
    main: {
        build: {
            externalizeDeps: true,
            rolldownOptions: {
                external: ["node:sqlite"],
                output: commonJsOutput,
            },
        },
    },
    preload: {
        build: {
            externalizeDeps: true,
            rolldownOptions: {
                output: commonJsOutput,
            },
        },
    },
    renderer: {
        publicDir: resolve("resources"),
        optimizeDeps: {
            include: ["@base-ui/react/tabs"],
        },
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
