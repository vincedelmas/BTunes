import {useRef, useState} from "react";
import {Check, ImagePlus, LoaderCircle, RefreshCw, Search} from "lucide-react";
import type {ArtworkCandidate} from "../../../shared/types/artwork";
import type {Track} from "../../../shared/types/library";
import {rpc} from "@/lib/rpc";
import {getErrorMessage} from "@/lib/music";
import {cn} from "@/lib/utils";
import {Cover} from "@/components/cover";
import {EmptyState} from "@/components/empty-state";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";

interface CoverSearchProps {
    query: string;
    track: Track;
    selected?: ArtworkCandidate;
    disabled: boolean;
    onSelect: (candidate: ArtworkCandidate | undefined) => void;
}


export function CoverSearch({ query, track, selected, disabled, onSelect }: CoverSearchProps) {
    const searchId = useRef(0);
    const [results, setResults] = useState<ArtworkCandidate[]>([]);
    const [pending, setPending] = useState<ArtworkCandidate>();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [open, setOpen] = useState(false);

    async function search() {
        if (disabled) return;

        const id = ++searchId.current;
        setBusy(true);
        setError("");
        setResults([]);

        await rpc("artwork.search", { query })
            .then((candidates) => {
                if (searchId.current === id) setResults(candidates);
            })
            .catch((failure: unknown) => {
                if (searchId.current === id) setError(getErrorMessage(failure));
            })
            .finally(() => {
                if (searchId.current === id) setBusy(false);
            });
    }

    function findCovers() {
        setPending(selected);
        setOpen(true);
        void search();
    }

    return (
        <section
            className="mt-6 flex items-center gap-4 rounded-xl border border-border bg-background p-4"
            aria-label="Album artwork"
        >
            <div className="shrink-0 [&_.cover]:size-16 [&_.cover]:rounded-lg">
                <Cover
                    track={track}
                    source={selected?.thumbnail}
                />
            </div>
            <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">Album artwork</h3>
                <p className="mt-1 truncate text-xs text-muted-foreground">{selected ? "New cover selected · ready to save" : "Find a cover using the current tags"}</p>
            </div>
            <Button
                variant="secondary"
                size="lg"
                disabled={disabled}
                onClick={findCovers}
            >
                <ImagePlus data-icon="inline-start"/>
                {selected ? "Change cover" : "Find a cover"}
            </Button>
            <Dialog
                open={open}
                onOpenChange={setOpen}
            >
                <DialogContent className="cover-picker flex h-[min(760px,88vh)] w-[calc(100vw-64px)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
                    <DialogHeader className="shrink-0 border-b border-border px-6 py-5">
                        <DialogTitle className="text-xl font-semibold">Choose album artwork</DialogTitle>
                        <DialogDescription className="flex items-center gap-2">
                            <Search className="size-3.5 shrink-0"/>
                            <span className="truncate">{query}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex min-h-0 flex-1">
                        <aside className="flex w-64 shrink-0 flex-col gap-4 border-r border-border bg-background p-5">
                            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground">{pending ? "SELECTED ARTWORK" : "CURRENT ARTWORK"}</p>
                            <div className="overflow-hidden rounded-lg shadow-xl">
                                <Cover
                                    large
                                    track={track}
                                    source={pending?.thumbnail}
                                />
                            </div>
                            {pending &&
                                <div className="min-w-0">
                                    <h3 className="truncate text-sm font-semibold">
                                        {pending.album}
                                    </h3>
                                    <p className="mt-1 truncate text-xs text-muted-foreground">
                                        {pending.artist}
                                    </p>
                                </div>
                            }
                            {pending &&
                                <div className="flex items-center gap-3 border-t border-border pt-4">
                                    <div className="shrink-0 [&_.cover]:size-10">
                                        <Cover track={track}/>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Current cover</p>
                                </div>
                            }
                            <Button
                                variant="outline"
                                className="mt-auto"
                                onClick={() => {
                                    onSelect(undefined);
                                    setOpen(false);
                                }}
                            >Keep current cover</Button>
                        </aside>
                        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                            <div className="flex shrink-0 items-center justify-between gap-3 px-5 py-3">
                                <p
                                    className="text-xs text-muted-foreground"
                                    role="status"
                                >{busy ? "Finding artwork from your tags…" : results.length + (results.length === 1 ? " suggestion" : " suggestions")}</p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={busy}
                                    onClick={() => void search()}
                                >
                                    <RefreshCw data-icon="inline-start"/>
                                    Search again
                                </Button>
                            </div>
                            <div
                                className="min-h-0 flex-1 overflow-y-auto px-5 pb-5"
                                aria-label="Cover suggestions"
                                aria-busy={busy}
                            >
                                {busy && <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
                                    <LoaderCircle className="size-7 animate-spin"/>
                                    <p className="text-xs">Looking for {track.album === "Unknown album" ? track.title : track.album}</p>
                                </div>}
                                {error && <Alert variant="destructive">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>}
                                {!busy && !error && !results.length && <EmptyState
                                    icon={ImagePlus}
                                    title="No covers found"
                                    description="Check the album and artist tags, then try again."
                                />}
                                {!busy && results.length > 0 && <div className="grid grid-cols-3 gap-3">
                                    {results.map((candidate) => (
                                        <button
                                            key={candidate.id}
                                            type="button"
                                            aria-label={"Use cover: " + candidate.album + " by " + candidate.artist}
                                            aria-pressed={pending?.id === candidate.id}
                                            onClick={() => setPending(candidate)}
                                            className={cn("group min-w-0 rounded-xl border border-transparent p-2 text-left hover:bg-secondary focus-visible:border-primary focus-visible:outline-none", pending?.id === candidate.id && "border-primary bg-primary/5")}
                                        >
                                            <div className="relative overflow-hidden rounded-lg">
                                                <img
                                                    loading="lazy"
                                                    decoding="async"
                                                    src={candidate.thumbnail}
                                                    alt={candidate.album}
                                                    className="aspect-square w-full object-cover"
                                                />
                                                {pending?.id === candidate.id && <Badge className="absolute top-2 right-2">
                                                    <Check/>
                                                    Selected
                                                </Badge>}
                                            </div>
                                            <strong className="mt-2 block truncate text-xs font-medium">{candidate.album}</strong>
                                            <span className="mt-1 block truncate text-[11px] text-muted-foreground">{candidate.artist}</span>
                                        </button>
                                    ))}
                                </div>}
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="m-0 shrink-0 rounded-none px-6 py-4">
                        <Button
                            variant="ghost"
                            onClick={() => setOpen(false)}
                        >Cancel</Button>
                        <Button
                            disabled={!pending}
                            onClick={() => {
                                onSelect(pending);
                                setOpen(false);
                            }}
                        >
                            <Check data-icon="inline-start"/>
                            Use selected cover
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}
