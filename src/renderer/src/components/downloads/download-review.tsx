import {rpc} from "@/lib/rpc";
import {useState} from "react";
import {Check} from "lucide-react";
import {Button} from "@/components/ui/button";
import {TagForm} from "@/components/tag-form";
import {coverSearchQuery} from "@/lib/artwork";
import {tagFields} from "../../../../shared/tags";
import {CoverSearch} from "@/components/cover-search";
import {getErrorMessage} from "../../../../shared/errors";
import type {Track} from "../../../../shared/types/library";
import type {TagPatch} from "../../../../shared/types/tags";
import {Alert, AlertDescription} from "@/components/ui/alert";
import type {DownloadItem} from "../../../../shared/types/downloads";
import {tagPatchFieldsSchema} from "../../../../shared/schemas/tags";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";


interface DownloadReviewProps {
    genres: string[];
    item: DownloadItem;
    onClose: () => void;
    onSaved: () => Promise<void>;
}


export function DownloadReview({ item, genres, onClose, onSaved }: DownloadReviewProps) {
    const initial = Object.fromEntries(
        tagFields.map((field) => [field, String(item.tags[field] || "")])
    ) as Record<keyof TagPatch, string>;

    const [values, setValues] = useState(initial);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [artwork, setArtwork] = useState(item.artwork);
    const enabled = new Set(tagFields.filter((field) => values[field] !== initial[field]));

    const track: Track = {
        id: 0,
        path: "",
        size: 0,
        plays: 0,
        cover: null,
        duration: 0,
        favorite: 0,
        lastPlayed: 0,
        genre: values.genre,
        title: values.title,
        album: values.album,
        artist: values.artist,
        year: Number(values.year),
        albumArtist: values.albumArtist
    };

    async function save() {
        setError("");
        setBusy(true);

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
            open={true}
            onOpenChange={(open) => {
                if (!open && !busy) onClose();
            }}
        >
            <DialogContent
                showCloseButton={!busy}
                className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-175"
            >
                <DialogHeader className="shrink-0 bg-linear-to-br from-primary/10 to-card px-7 py-6">
                    <DialogTitle>
                        Ready for your library
                    </DialogTitle>
                    <DialogDescription>
                        Review the tags and cover for
                        {" "}
                        {item.title}
                        . The finished MP3 will be added when you save.
                    </DialogDescription>
                </DialogHeader>
                <div className="min-h-0 overflow-y-auto px-7 py-6">
                    {item.message &&
                        <p className="mb-5 text-sm text-muted-foreground">
                            {item.message}
                        </p>
                    }
                    <TagForm
                        busy={busy}
                        batch={false}
                        genres={genres}
                        values={values}
                        enabled={enabled}
                        onToggle={() => undefined}
                        onChange={(field, value) => setValues((previous) => ({ ...previous, [field]: value }))}
                        onReset={(field) => setValues((previous) => ({ ...previous, [field]: initial[field] }))}
                    />
                    <CoverSearch
                        track={track}
                        disabled={busy}
                        selected={artwork}
                        onSelect={setArtwork}
                        query={coverSearchQuery(item.title, values)}
                    />
                    {error && (
                        <Alert className="mt-4" variant="destructive">
                            <AlertDescription>
                                {error}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
                <DialogFooter className="m-0 shrink-0 rounded-none px-7 py-4">
                    <Button variant="ghost" disabled={busy} onClick={onClose}>
                        Review later
                    </Button>
                    <Button disabled={busy} onClick={() => void save()}>
                        <Check data-icon="inline-start"/>
                        {busy ? "Saving…" : "Save to library"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
