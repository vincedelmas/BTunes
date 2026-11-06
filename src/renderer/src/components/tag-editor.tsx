import {useMemo, useState} from "react";
import {ArrowLeft, ArrowRight, Check, ShieldCheck} from "lucide-react";
import type {Track} from "../../../shared/contracts";
import {
    tagFields,
    tagPatchSchema,
    type TagPatch,
    type TagPreview,
} from "../../../shared/tags";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {TagForm} from "@/components/tag-form";
import {TagPreviewList} from "@/components/tag-preview";
import {Cover} from "@/components/cover";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {rpc} from "@/lib/rpc";
import {getErrorMessage} from "@/lib/music";

export function TagEditor({
                              tracks,
                              onClose,
                              onSaved,
                          }: {
    tracks: Track[];
    onClose: () => void;
    onSaved: (message: string) => Promise<void>;
}) {
    const initialValues = useMemo(() => Object.fromEntries(tagFields.map((field) => {
        const first = tracks[0][field];
        const common = tracks.every((track) => track[field] === first);
        return [field, common ? String(first || "") : ""];
    })) as Record<keyof TagPatch, string>, [tracks]);
    const [values, setValues] = useState(initialValues);
    const [enabled, setEnabled] = useState<Set<keyof TagPatch>>(new Set());
    const [preview, setPreview] = useState<TagPreview>();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    function change(field: keyof TagPatch, value: string) {
        setValues((previous) => ({ ...previous, [field]: value }));
        setEnabled((previous) => new Set([...previous, field]));
        setPreview(undefined);
    }

    async function prepare() {
        setBusy(true);
        setError("");

        try {
            if (tracks.length > 100)
                throw new Error("Select up to 100 songs per edit.");

            const patch = Object.fromEntries(
                [...enabled].map((field) => [
                    field,
                    field === "year" ? Number(values[field]) : values[field],
                ]),
            );
            const validated = tagPatchSchema.safeParse(patch);

            if (!validated.success)
                throw new Error(validated.error.issues[0].message);

            setPreview(
                await rpc("tags.preview", {
                    ids: tracks.map((track) => track.id),
                    patch: validated.data,
                }),
            );
        }
        catch (error) {
            setError(getErrorMessage(error));
        }
        finally {
            setBusy(false);
        }
    }

    async function save() {
        if (!preview) return;

        setBusy(true);
        setError("");

        try {
            const result = await rpc("tags.save", { token: preview.token });
            await onSaved(result.updated === 1 ? "Tags saved." : "Tags saved for " + result.updated + " songs.");
            onClose();
        }
        catch (error) {
            setError(getErrorMessage(error));
            setPreview(undefined);
        }
        finally {
            setBusy(false);
        }
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
                            <p className="eyebrow">SONG DETAILS</p>
                            <DialogTitle>Edit tags</DialogTitle>
                            <DialogDescription>{batch ? tracks.length + " selected songs" : first.title}</DialogDescription>
                        </div>
                        <Badge variant="secondary">{batch ? "Batch edit" : first.path.split(".").at(-1)?.toUpperCase()}</Badge>
                    </div>
                    <ol className="tag-steps" aria-label="Editing progress">
                        <li aria-current={!preview ? "step" : undefined}><span>1</span>Details</li>
                        <li aria-current={preview ? "step" : undefined}><span>2</span>Review</li>
                    </ol>
                </DialogHeader>
                <div className="tag-editor-body">
                    <p className="tag-editor-hint">{preview ? "Review the changes before saving them to your audio files." : batch ? "Checked fields are applied to every selected song." : "Make your changes, then give them a quick review."}</p>
                    {!preview ? (
                        <TagForm values={values} enabled={enabled} batch={batch} busy={busy} onChange={change} onToggle={toggle} onReset={reset}/>
                    ) : <TagPreviewList preview={preview}/>}
                    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                </div>
                <DialogFooter className="tag-editor-footer">
                    <span className="tag-recovery"><ShieldCheck/>Originals kept for recovery</span>
                    {preview ? (
                        <Button variant="ghost" disabled={busy} onClick={() => setPreview(undefined)}><ArrowLeft/>Details</Button>
                    ) : <Button variant="ghost" disabled={busy} onClick={onClose}>Cancel</Button>}
                    {preview ? (
                        <Button disabled={busy || !preview.files.length} onClick={() => void save()}><Check/>{busy ? "Saving…" : "Save to files"}</Button>
                    ) : (
                        <Button disabled={busy || !enabled.size} onClick={() => void prepare()}>{busy ? "Preparing…" : "Preview changes"}<ArrowRight/></Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
