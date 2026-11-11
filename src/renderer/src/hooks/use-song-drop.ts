import {rpc} from "@/lib/rpc";
import type {DragEvent} from "react";
import {useRef, useState} from "react";

export function useSongDrop(onImported: () => Promise<void>, onError: (error: unknown) => void) {
    const depth = useRef(0);
    const [dragging, setDragging] = useState(false);
    const [importing, setImporting] = useState(false);
    const [message, setMessage] = useState("");

    function hasFiles(ev: DragEvent) {
        return ev.dataTransfer.types.includes("Files");
    }

    function onDragEnter(ev: DragEvent) {
        if (!hasFiles(ev)) return;
        ev.preventDefault();
        depth.current++;
        setDragging(true);
    }

    function onDragLeave(ev: DragEvent) {
        if (!hasFiles(ev)) return;
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setDragging(false);
    }

    function onDragOver(ev: DragEvent) {
        if (!hasFiles(ev)) return;
        ev.preventDefault();
        ev.dataTransfer.dropEffect = importing ? "none" : "copy";
    }

    async function onDrop(ev: DragEvent) {
        if (!hasFiles(ev)) return;
        ev.preventDefault();
        depth.current = 0;
        setDragging(false);
        if (importing) return;

        const paths = window.btunes.filePaths([...ev.dataTransfer.files]);
        if (!paths.length) return;
        setImporting(true);
        setMessage("");
        try {
            const result = await rpc("library.drop", { paths, x: Math.round(ev.clientX), y: Math.round(ev.clientY) });
            if (!result) return;
            await onImported();
            setMessage(result.imported + " songs imported" + (result.skipped ? " · " + result.skipped + " already in this folder" : ""));
            if (result.errors.length) onError(result.errors.map((error) => error.path + ": " + error.message).join("\n"));
        }
        catch (error) {
            onError(error);
        }
        finally {
            setImporting(false);
        }
    }

    return { dragging, importing, message, dismiss: () => setMessage(""), handlers: { onDragEnter, onDragLeave, onDragOver, onDrop } };
}
