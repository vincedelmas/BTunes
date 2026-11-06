import {useEffect, useRef, useState} from "react";
import {Search, Check, ImagePlus, X} from "lucide-react";
import type {ArtworkCandidate} from "../../../shared/types/artwork";
import {rpc} from "@/lib/rpc";
import {getErrorMessage} from "@/lib/music";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Field, FieldLabel} from "@/components/ui/field";
import {cn} from "@/lib/utils";

interface CoverSearchProps {
    initialQuery: string;
    selected?: ArtworkCandidate;
    disabled: boolean;
    onSelect: (candidate: ArtworkCandidate | undefined) => void;
}

export function CoverSearch({ initialQuery, selected, disabled, onSelect }: CoverSearchProps) {
    const suggestions = useRef<HTMLDivElement>(null);
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<ArtworkCandidate[]>();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (results?.length) suggestions.current?.scrollIntoView({ block: "nearest" });
    }, [results]);

    async function search() {
        if (busy || disabled || !query.trim()) return;

        setBusy(true);
        setError("");
        await rpc("artwork.search", { query })
            .then(setResults)
            .catch((failure: unknown) => setError(getErrorMessage(failure)))
            .finally(() => setBusy(false));
    }

    return (
        <section className="mt-5 border-t border-border pt-5">
            <div className="flex items-center justify-between gap-3">
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => setOpen(!open)}
                >
                    <ImagePlus/>Find a cover
                </Button>
                {selected && <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => onSelect(undefined)}
                >
                    <X/>Keep current cover
                </Button>}
            </div>
            {selected && <p
                className="mt-3 text-xs text-primary"
                role="status"
            >Selected cover will be embedded in every selected song when you save.</p>}
            {open && (
                <div className="mt-4 flex flex-col gap-4">
                    <Field>
                        <FieldLabel htmlFor="cover-query">Search covers</FieldLabel>
                        <div className="flex gap-2">
                            <Input
                                autoFocus
                                id="cover-query"
                                value={query}
                                disabled={busy || disabled}
                                onChange={(ev) => setQuery(ev.target.value)}
                                onKeyDown={(ev) => {
                                    if (ev.key === "Enter") {
                                        ev.preventDefault();
                                        void search();
                                    }
                                }}
                            />
                            <Button
                                type="button"
                                disabled={busy || disabled || !query.trim()}
                                onClick={() => void search()}
                            >
                                <Search/>
                                {busy ? "Searching…" : "Search covers"}
                            </Button>
                        </div>
                    </Field>
                    {error && <p
                        role="alert"
                        className="text-xs text-destructive"
                    >{error}</p>}
                    {results?.length === 0 && <p className="text-xs text-muted-foreground">No covers found. Try an album, artist, or song title.</p>}
                    {results && <div
                        ref={suggestions}
                        className="grid max-h-72 grid-cols-3 gap-3 overflow-y-auto p-1"
                        aria-label="Cover suggestions"
                    >
                        {results.map((candidate) => (
                            <button
                                key={candidate.id}
                                type="button"
                                aria-label={"Use cover: " + candidate.album + " by " + candidate.artist}
                                aria-pressed={selected?.id === candidate.id}
                                disabled={disabled}
                                onClick={() => onSelect(candidate)}
                                className={cn("relative min-w-0 rounded-lg border border-border bg-background p-2 text-left hover:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary", selected?.id === candidate.id && "border-primary")}
                            >
                                <img
                                    src={candidate.thumbnail}
                                    alt={candidate.album}
                                    className="aspect-square w-full rounded-md object-cover"
                                />
                                <strong className="mt-2 block truncate text-xs">{candidate.album}</strong>
                                <span className="block truncate text-[11px] text-muted-foreground">{candidate.artist}</span>
                                {selected?.id === candidate.id && <Check className="absolute top-3 right-3 size-5 rounded-full bg-primary p-1 text-primary-foreground"/>}
                            </button>
                        ))}
                    </div>}
                </div>
            )}
        </section>
    );
}
