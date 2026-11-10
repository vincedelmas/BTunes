import {useState} from "react";
import {ImagePlus, Undo2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Cover} from "@/components/cover";
import {CoverSearch} from "@/components/cover-search";
import {rpc} from "@/lib/rpc";
import {getErrorMessage} from "../../../shared/errors";
import type {Track} from "../../../shared/types/library";
import type {ArtworkCandidate} from "../../../shared/types/artwork";

interface ArtworkPickerProps {
    track: Track;
    query: string;
    selected?: ArtworkCandidate;
    disabled: boolean;
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
            className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-3 rounded-xl border border-info/20 bg-info/3 p-4"
            aria-label="Album artwork"
        >
            <div className="row-span-2 [&_.cover]:size-16">
                <Cover
                    track={track}
                    source={selected?.thumbnail}
                />
            </div>
            <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">Album artwork</h3>
                <p className="mt-1 text-xs text-muted-foreground">{selected ? "Cover selected · embedded when saved" : "Find a cover online or choose an image from your computer."}</p>
                {error && <p
                    role="alert"
                    className="mt-2 text-xs text-destructive"
                >{error}</p>}
            </div>
            <div className="col-start-2 flex flex-wrap items-center gap-2">
                <CoverSearch
                    track={track}
                    query={query}
                    selected={selected}
                    disabled={disabled || busy}
                    onSelect={onSelect}
                    triggerOnly
                />
                <Button
                    variant="outline"
                    disabled={disabled || busy}
                    onClick={() => void choose()}
                >
                    <ImagePlus data-icon="inline-start"/>
                    {busy ? "Opening…" : "Choose image"}
                </Button>
                {selected && <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Reset artwork"
                    title="Reset artwork"
                    disabled={disabled || busy}
                    onClick={() => onSelect(undefined)}
                >
                    <Undo2/>
                </Button>}
            </div>
        </section>
    );
}
