import type {ReactNode} from "react";
import {FolderInput, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useSongDrop} from "@/hooks/use-song-drop";


interface SongDropZoneProps {
    children: ReactNode;
    onImported: () => Promise<void>;
    onError: (error: unknown) => void;
}


export function SongDropZone({ children, onImported, onError }: SongDropZoneProps) {
    const drop = useSongDrop(onImported, onError);

    return (
        <div
            className="song-drop-zone relative flex min-h-0 flex-1 flex-col"
            {...drop.handlers}
        >
            {children}
            {drop.dragging && (
                <div
                    className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg border border-primary bg-background/95"
                >
                    <FolderInput className="size-9 text-primary"/>
                    <p className="font-semibold">
                        Drop songs to import
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Choose Copy here or Move here after dropping.
                    </p>
                </div>
            )}
            {(drop.importing || drop.message) && (
                <div
                    role="status"
                    className="absolute right-3 bottom-3 flex max-w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-2 text-xs shadow-lg"
                >
                    {drop.importing ? "Importing songs…" : drop.message}
                    {!drop.importing && (
                        <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={drop.dismiss}
                            aria-label="Dismiss import result"
                        >
                            <X/>
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
