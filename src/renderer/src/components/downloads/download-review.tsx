import {useState} from "react";
import {Check} from "lucide-react";
import type {DownloadItem} from "../../../../shared/types/downloads";
import type {Track} from "../../../../shared/types/library";
import type {TagPatch} from "../../../../shared/types/tags";
import {tagFields} from "../../../../shared/tags";
import {tagPatchFieldsSchema} from "../../../../shared/schemas/tags";
import {rpc} from "@/lib/rpc";
import {getErrorMessage} from "../../../../shared/errors";
import {coverSearchQuery} from "@/lib/artwork";
import {TagForm} from "@/components/tag-form";
import {CoverSearch} from "@/components/cover-search";
import {Button} from "@/components/ui/button";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter} from "@/components/ui/dialog";

interface DownloadReviewProps {
    item: DownloadItem;
    genres: string[];
    onClose: () => void;
    onSaved: () => Promise<void>;
}


export function DownloadReview({ item, genres, onClose, onSaved }: DownloadReviewProps) {
    const initial = Object.fromEntries(tagFields.map((field) => [field, String(item.tags[field] || "")])) as Record<keyof TagPatch, string>;
    const [values, setValues] = useState(initial);
    const [artwork, setArtwork] = useState(item.artwork);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const enabled = new Set(tagFields.filter((field) => values[field] !== initial[field]));
    const track: Track = {
        id: 0,
        path: "",
        title: values.title,
        artist: values.artist,
        albumArtist: values.albumArtist,
        album: values.album,
        genre: values.genre,
        year: Number(values.year),
        size: 0,
        duration: 0,
        favorite: 0,
        plays: 0,
        lastPlayed: 0,
        cover: null
    };

    async function save() {
        setBusy(true);
        setError("");
        try {
            const patch = tagPatchFieldsSchema.parse({ ...values, year: Number(values.year) });
            await rpc("downloads.publish", { id: item.id, patch, artworkId: artwork?.id });
            await onSaved();
            onClose();
        }
        catch (error) {
            setError(getErrorMessage(error));
        }
        finally {
            setBusy(false);
        }
    }

    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open && !busy) onClose();
            }}
        >
            <DialogContent
                className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[700px]"
                showCloseButton={!busy}
            >
                <DialogHeader className="shrink-0 bg-linear-to-br from-primary/10 to-card px-7 py-6">
                    <DialogTitle>Ready for your library</DialogTitle>
                    <DialogDescription>Review the tags and cover for {item.title}. The finished MP3 will be added when you save.</DialogDescription>
                </DialogHeader>
                <div className="min-h-0 overflow-y-auto px-7 py-6">
                    {item.message && <p className="mb-5 text-sm text-muted-foreground">{item.message}</p>}
                    <TagForm
                        genres={genres}
                        busy={busy}
                        batch={false}
                        values={values}
                        enabled={enabled}
                        onChange={(field, value) => setValues((previous) => ({ ...previous, [field]: value }))}
                        onReset={(field) => setValues((previous) => ({ ...previous, [field]: initial[field] }))}
                        onToggle={() => undefined}
                    />
                    <CoverSearch
                        query={coverSearchQuery(item.title, values)}
                        track={track}
                        selected={artwork}
                        disabled={busy}
                        onSelect={setArtwork}
                    />
                    {error && <Alert
                        variant="destructive"
                        className="mt-4"
                    >
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>}
                </div>
                <DialogFooter className="m-0 shrink-0 rounded-none px-7 py-4">
                    <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={onClose}
                    >Review later</Button>
                    <Button
                        disabled={busy}
                        onClick={() => void save()}
                    >
                        <Check data-icon="inline-start"/>
                        {busy ? "Saving…" : "Save to library"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
