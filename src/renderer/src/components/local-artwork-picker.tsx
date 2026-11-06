import {useState} from "react";
import {ImagePlus} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Cover} from "@/components/cover";
import {rpc} from "@/lib/rpc";
import {getErrorMessage} from "../../../shared/errors";
import type {Track} from "../../../shared/types/library";
import type {ArtworkCandidate} from "../../../shared/types/artwork";

interface LocalArtworkPickerProps {
    track: Track;
    selected?: ArtworkCandidate;
    disabled: boolean;
    onSelect: (artwork: ArtworkCandidate) => void;
}


export function LocalArtworkPicker({ track, selected, disabled, onSelect }: LocalArtworkPickerProps) {
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
            className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border border-border p-4"
            aria-label="Album artwork"
        >
            <div className="[&_.cover]:size-16">
                <Cover
                    track={track}
                    source={selected?.thumbnail}
                />
            </div>
            <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">Album artwork</h3>
                <p className="mt-1 text-xs text-muted-foreground">{selected ? "Cover selected · embedded when saved" : "Choose an image from your computer."}</p>
                {error && <p
                    role="alert"
                    className="mt-2 text-xs text-destructive"
                >{error}</p>}
            </div>
            <Button
                variant="secondary"
                disabled={disabled || busy}
                onClick={() => void choose()}
            >
                <ImagePlus data-icon="inline-start"/>
                {busy ? "Opening…" : "Choose image"}
            </Button>
        </section>
    );
}
