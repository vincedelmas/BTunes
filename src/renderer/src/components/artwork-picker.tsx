import {rpc} from "@/lib/rpc";
import {useState} from "react";
import {Cover} from "@/components/cover";
import {ImagePlus, Undo2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {CoverSearch} from "@/components/cover-search";
import {getErrorMessage} from "../../../shared/errors";
import type {Track} from "../../../shared/types/library";
import type {ArtworkCandidate} from "../../../shared/types/artwork";


interface ArtworkPickerProps {
    track: Track;
    query: string;
    disabled: boolean;
    selected?: ArtworkCandidate;
    onSelect: (artwork: ArtworkCandidate | undefined) => void;
}


export function ArtworkPicker({ track, query, selected, disabled, onSelect }: ArtworkPickerProps) {
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function choose() {
        setBusy(true);
        setError("");
        try {
            const artwork = await rpc("artwork.local", undefined);
            if (artwork) onSelect(artwork);
        }
        catch (error) {
            setError(getErrorMessage(error));
        }
        finally {
            setBusy(false);
        }
    }

    return (
        <section
            aria-label="Album artwork"
            className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-3 rounded-xl border border-info/20 bg-info/3 p-4"
        >
            <div className="row-span-2 [&_.cover]:size-16">
                <Cover
                    track={track}
                    source={selected?.thumbnail}
                />
            </div>
            <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">
                    Album artwork
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                    {selected ? "Cover selected · embedded when saved" : "Find a cover online or choose an image from your computer."}
                </p>
                {error && (
                    <p
                        role="alert"
                        className="mt-2 text-xs text-destructive"
                    >
                        {error}
                    </p>
                )}
            </div>
            <div className="col-start-2 flex flex-wrap items-center gap-2">
                <CoverSearch
                    triggerOnly
                    track={track}
                    query={query}
                    selected={selected}
                    onSelect={onSelect}
                    disabled={disabled || busy}
                />
                <Button
                    variant="outline"
                    disabled={disabled || busy}
                    onClick={() => void choose()}
                >
                    <ImagePlus data-icon="inline-start"/>
                    {busy ? "Opening…" : "Choose image"}
                </Button>
                {selected && (
                    <Button
                        size="icon"
                        variant="ghost"
                        title="Reset artwork"
                        aria-label="Reset artwork"
                        disabled={disabled || busy}
                        onClick={() => onSelect(undefined)}
                    >
                        <Undo2/>
                    </Button>
                )}
            </div>
        </section>
    );
}
