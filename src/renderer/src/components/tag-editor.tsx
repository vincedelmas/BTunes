import {useState} from "react";
import {ArrowRight, Check, Pencil} from "lucide-react";
import type {Track} from "../../../shared/contracts";
import {
    tagFields,
    tagLabels,
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
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
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
    const [values, setValues] = useState(
        () =>
            Object.fromEntries(
                tagFields.map((field) => {
                    const first = tracks[0][field];
                    const common = tracks.every((track) => track[field] === first);

                    return [field, common ? String(first || "") : ""];
                }),
            ) as Record<keyof TagPatch, string>,
    );
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
            await onSaved(
                "Tags saved to " +
                result.updated +
                " file(s). Originals backed up in " +
                result.backupDirectory,
            );
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

    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open && !busy) onClose();
            }}
        >
            <DialogContent showCloseButton={!busy} className="tag-editor">
                <DialogHeader>
                    <DialogTitle>
                        <Pencil aria-hidden="true"/> Edit tags
                    </DialogTitle>
                    <DialogDescription>
                        {tracks.length === 1
                            ? tracks[0].title
                            : tracks.length + " selected songs"}{" "}
                        · MP3, FLAC, and M4A
                    </DialogDescription>
                </DialogHeader>

                <p className="muted text-sm">
                    Only checked fields will change. Audio is copied without re-encoding,
                    and original files are backed up.
                </p>

                <FieldGroup className="tag-fields">
                    {tagFields.map((field) => (
                        <Field key={field}>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    aria-label={"Apply " + tagLabels[field]}
                                    checked={enabled.has(field)}
                                    disabled={busy}
                                    onChange={(event) => {
                                        setEnabled((previous) => {
                                            const next = new Set(previous);
                                            if (event.target.checked) next.add(field);
                                            else next.delete(field);
                                            return next;
                                        });
                                        setPreview(undefined);
                                    }}
                                />
                                <FieldLabel htmlFor={"tag-" + field}>
                                    {tagLabels[field]}
                                </FieldLabel>
                            </div>
                            <Input
                                id={"tag-" + field}
                                type={field === "year" ? "number" : "text"}
                                min={field === "year" ? 0 : undefined}
                                max={field === "year" ? 9999 : undefined}
                                value={values[field]}
                                placeholder={
                                    field === "year"
                                        ? "Unknown year (0)"
                                        : "Mixed values / unchanged"
                                }
                                disabled={busy}
                                onChange={(event) => change(field, event.target.value)}
                            />
                        </Field>
                    ))}
                </FieldGroup>

                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {preview && (
                    <section className="tag-preview" aria-label="Tag change preview">
                        <h3>
                            {preview.files.length ? "Review changes" : "No changes to save"}
                        </h3>
                        {preview.files.map((file) => (
                            <div className="preview-file" key={file.id}>
                                <strong>{file.title}</strong>
                                <small title={file.path}>{file.path}</small>
                                {file.changes.map((change) => (
                                    <div className="tag-change" key={change.field}>
                                        <span>{tagLabels[change.field]}</span>
                                        <span>{change.before || "Not set"}</span>
                                        <ArrowRight aria-hidden="true"/>
                                        <strong>{change.after || "Not set"}</strong>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </section>
                )}

                <DialogFooter>
                    <Button variant="ghost" disabled={busy} onClick={onClose}>
                        Cancel
                    </Button>
                    {preview ? (
                        <Button
                            disabled={busy || !preview.files.length}
                            onClick={() => void save()}
                        >
                            <Check/>
                            {busy ? "Saving…" : "Save to files"}
                        </Button>
                    ) : (
                        <Button
                            disabled={busy || !enabled.size}
                            onClick={() => void prepare()}
                        >
                            {busy ? "Preparing…" : "Preview changes"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
