import {rpc} from "@/lib/rpc";
import {useState} from "react";
import {Cover} from "@/components/cover";
import {getErrorMessage} from "@/lib/music";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {TagForm} from "@/components/tag-form";
import {tagFields} from "../../../shared/tags";
import {TagPreviewList} from "@/components/tag-preview";
import type {Track} from "../../../shared/types/library";
import {tagPatchSchema} from "../../../shared/schemas/tags";
import {Alert, AlertDescription} from "@/components/ui/alert";
import type {TagPatch, TagPreview} from "../../../shared/types/tags";
import {ArrowLeft, ArrowRight, Check, ShieldCheck} from "lucide-react";
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
    const [preview, setPreview] = useState<TagPreview>();
    const [enabled, setEnabled] = useState<Set<keyof TagPatch>>(new Set());

    function change(field: keyof TagPatch, value: string) {
        setValues((prev) => ({ ...prev, [field]: value }));
        setEnabled((prev) => new Set([...prev, field]));
        setPreview(undefined);
    }

    async function prepare() {
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

                const validated = tagPatchSchema.safeParse(patch);
                if (!validated.success) {
                    throw new Error(validated.error.issues[0].message);
                }

                return rpc("tags.preview", { ids: tracks.map((track) => track.id), patch: validated.data });
            }).then(setPreview)
            .catch((error: unknown) => setError(getErrorMessage(error)))
            .finally(() => setBusy(false));
    }

    async function save() {
        if (!preview) return;

        setError("");
        setBusy(true);

        await rpc("tags.save", { token: preview.token })
            .then(async (result) => {
                await onSaved(result.updated === 1 ? "Tags saved." : "Tags saved for " + result.updated + " songs.");
                onClose();
            }).catch((error: unknown) => {
                setError(getErrorMessage(error));
                setPreview(undefined);
            }).finally(() => setBusy(false));
    }

    function toggle(field: keyof TagPatch, checked: boolean) {
        setEnabled((previous) => {
            const next = new Set(previous);
            if (checked) next.add(field);
            else next.delete(field);
            return next;
        });

        setPreview(undefined);
    }

    function reset(field: keyof TagPatch) {
        setValues((previous) => ({ ...previous, [field]: initialValues[field] }));
        toggle(field, false);
    }

    const first = tracks[0];
    const batch = tracks.length > 1;

    return (
        <Dialog open onOpenChange={(open) => {
            if (!open && !busy) onClose();
        }}>
            <DialogContent showCloseButton={!busy} className="tag-editor">
                <DialogHeader className="tag-editor-header">
                    <div className="tag-summary">
                        <Cover track={first}/>
                        <div className="tag-summary-copy">
                            <p className="eyebrow">
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
                    <ol className="tag-steps" aria-label="Editing progress">
                        <li aria-current={!preview ? "step" : undefined}>
                            <span>1</span>Details
                        </li>
                        <li aria-current={preview ? "step" : undefined}>
                            <span>2</span>Review
                        </li>
                    </ol>
                </DialogHeader>
                <div className="tag-editor-body">
                    <p className="tag-editor-hint">
                        {preview
                            ? "Review the changes before saving them to your audio files."
                            : batch
                                ? "Checked fields are applied to every selected song."
                                : "Make your changes, then give them a quick review."
                        }
                    </p>

                    {!preview ?
                        <TagForm
                            busy={busy}
                            batch={batch}
                            values={values}
                            onReset={reset}
                            enabled={enabled}
                            onChange={change}
                            onToggle={toggle}
                        />
                        :
                        <TagPreviewList
                            preview={preview}
                        />
                    }

                    {error &&
                        <Alert variant="destructive">
                            <AlertDescription>
                                {error}
                            </AlertDescription>
                        </Alert>
                    }
                </div>
                <DialogFooter className="tag-editor-footer">
                    <span className="tag-recovery">
                        <ShieldCheck/> Originals kept for recovery
                    </span>
                    {preview ?
                        <Button variant="ghost" disabled={busy} onClick={() => setPreview(undefined)}>
                            <ArrowLeft/> Details
                        </Button>
                        :
                        <Button variant="ghost" disabled={busy} onClick={onClose}>
                            Cancel
                        </Button>
                    }
                    {preview ?
                        <Button disabled={busy || !preview.files.length} onClick={() => void save()}>
                            <Check/> {busy ? "Saving…" : "Save to files"}
                        </Button>
                        :
                        <Button disabled={busy || !enabled.size} onClick={() => void prepare()}>
                            {busy ? "Preparing…" : "Preview changes"} <ArrowRight/>
                        </Button>
                    }
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
