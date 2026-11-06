import {coverSearchQuery} from "@/lib/artwork";
import {rpc} from "@/lib/rpc";
import {useState} from "react";
import {Check} from "lucide-react";
import {Cover} from "@/components/cover";
import {CoverSearch} from "@/components/cover-search";
import {getErrorMessage} from "@/lib/music";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {TagForm} from "@/components/tag-form";
import {tagFields} from "../../../shared/tags";
import type {ArtworkCandidate} from "../../../shared/types/artwork";
import type {Track} from "../../../shared/types/library";
import type {TagPatch} from "../../../shared/types/tags";
import {tagPatchFieldsSchema} from "../../../shared/schemas/tags";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";


interface TagEditorProps {
    tracks: Track[];
    onClose: () => void;
    onSaved: (message: string) => Promise<void>;
}


export function TagEditor({ tracks, onClose, onSaved }: TagEditorProps) {
    const initialValues = Object.fromEntries(tagFields.map((field) => {
        const first = tracks[0][field];
        const common = tracks.every((track) => track[field] === first);
        return [field, common ? String(first || "") : ""];
    })) as Record<keyof TagPatch, string>;

    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [values, setValues] = useState(initialValues);
    const [artwork, setArtwork] = useState<ArtworkCandidate>();
    const [enabled, setEnabled] = useState<Set<keyof TagPatch>>(new Set());

    function change(field: keyof TagPatch, value: string) {
        setValues((prev) => ({ ...prev, [field]: value }));
        setEnabled((previous) => {
            const next = new Set(previous);
            if (tracks.length === 1 && value === initialValues[field]) next.delete(field);
            else next.add(field);
            return next;
        });
    }

    async function save() {
        setError("");
        setBusy(true);

        await Promise.resolve()
            .then(() => {
                if (tracks.length > 100) {
                    throw new Error("Select up to 100 songs per edit.");
                }

                const patch = Object.fromEntries([...enabled].map((field) => [
                    field, field === "year" ? Number(values[field]) : values[field],
                ]));

                const validated = tagPatchFieldsSchema.safeParse(patch);
                if (!validated.success) {
                    throw new Error(validated.error.issues[0].message);
                }

                return rpc("tags.preview", { ids: tracks.map((track) => track.id), patch: validated.data, artworkId: artwork?.id });
            })
            .then((prepared) => rpc("tags.save", { token: prepared.token }))
            .then(async (result) => {
                let message = "No tag changes.";
                if (result.updated === 1) message = "Tags saved.";
                else if (result.updated > 1) message = "Tags saved for " + result.updated + " songs.";
                await onSaved(message);
                onClose();
            }).catch((error: unknown) => {
                setError(getErrorMessage(error));
            }).finally(() => setBusy(false));
    }

    function toggle(field: keyof TagPatch, checked: boolean) {
        setEnabled((previous) => {
            const next = new Set(previous);
            if (checked) next.add(field);
            else next.delete(field);
            return next;
        });

    }

    function reset(field: keyof TagPatch) {
        setValues((previous) => ({ ...previous, [field]: initialValues[field] }));
        toggle(field, false);
    }

    const first = tracks[0];
    const batch = tracks.length > 1;

    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open && !busy) onClose();
            }}
        >
            <DialogContent
                initialFocus={() => document.getElementById("tag-title")}
                showCloseButton={!busy}
                className="tag-editor max-h-[90vh] flex flex-col gap-0 p-0 w-[min(700px,_calc(100vw_-_40px))] max-w-175 overflow-hidden border border-[#424242] rounded-2xl bg-[#1b1b1b] shadow-[0_30px_100px_#000b] [&_[data-slot=dialog-title]]:my-[5px] [&_[data-slot=dialog-title]]:mx-0 [&_[data-slot=dialog-title]]:text-[27px] [&_[data-slot=dialog-title]]:font-[750] [&_[data-slot=dialog-title]]:tracking-[-1px] [&[data-open]]:[animation:none] sm:max-w-[700px] data-open:animate-none data-closed:animate-none"
            >
                <DialogHeader className="tag-editor-header shrink-0 pt-7 px-7 pb-0 [background:linear-gradient(120deg,_#24352b,_#1b1b1b_75%)] text-left">
                    <div
                        className="tag-summary [&_.eyebrow]:text-primary [&_.eyebrow]:text-[10px] [&_.eyebrow]:tracking-[2px] flex items-center gap-[18px] pb-6 [&_.cover]:w-18 [&_.cover]:h-18 [&_.cover]:rounded-[10px] [&_.cover]:shadow-[0_6px_20px_#0005] [&_[data-slot=dialog-description]]:whitespace-nowrap [&_[data-slot=dialog-description]]:overflow-hidden [&_[data-slot=dialog-description]]:text-ellipsis [&_[data-slot=dialog-description]]:text-xs [&_>_[data-slot=badge]]:mr-3 [&_>_[data-slot=badge]]:text-[10px]">
                        <Cover
                            track={first}
                            source={artwork?.thumbnail}
                        />
                        <div className="tag-summary-copy min-w-0 flex-1">
                            <p className="eyebrow text-xs font-bold m-0">
                                SONG DETAILS
                            </p>
                            <DialogTitle>
                                Edit tags
                            </DialogTitle>
                            <DialogDescription>
                                {batch ? tracks.length + " selected songs" : first.title}
                            </DialogDescription>
                        </div>
                        <Badge variant="secondary">
                            {batch
                                ? "Batch edit"
                                : first.path.split(".").at(-1)?.toUpperCase()
                            }
                        </Badge>
                    </div>
                </DialogHeader>
                <div className="tag-editor-body min-h-0 overflow-auto pt-[18px] px-7 pb-7">
                    <TagForm
                        busy={busy}
                        batch={batch}
                        values={values}
                        onReset={reset}
                        enabled={enabled}
                        onChange={change}
                        onToggle={toggle}
                    />

                    <CoverSearch
                        query={coverSearchQuery(first.title, values)}
                        track={first}
                        trackCount={tracks.length}
                        selected={artwork}
                        disabled={busy}
                        onSelect={setArtwork}
                    />
                    {error &&
                        <Alert variant="destructive">
                            <AlertDescription>
                                {error}
                            </AlertDescription>
                        </Alert>
                    }
                </div>
                <DialogFooter className="tag-editor-footer shrink-0 flex items-center gap-[10px] m-0 py-[18px] px-6 border-t border-border bg-[#171717]">
                    <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        disabled={busy || (!enabled.size && !artwork)}
                        onClick={() => void save()}
                    >
                        <Check/>
                        {busy ? "Saving…" : "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
