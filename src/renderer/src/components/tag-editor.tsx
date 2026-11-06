import {rpc} from "@/lib/rpc";
import {useState} from "react";
import {Check} from "lucide-react";
import {Cover} from "@/components/cover";
import {getErrorMessage} from "@/lib/music";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {TagForm} from "@/components/tag-form";
import {tagFields} from "../../../shared/tags";
import type {Track} from "../../../shared/types/library";
import type {TagPatch} from "../../../shared/types/tags";
import {useMovablePanel} from "@/hooks/use-movable-panel";
import {tagPatchSchema} from "../../../shared/schemas/tags";
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
    const { panel, style, handleProps } = useMovablePanel();
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

                const validated = tagPatchSchema.safeParse(patch);
                if (!validated.success) {
                    throw new Error(validated.error.issues[0].message);
                }

                return rpc("tags.preview", { ids: tracks.map((track) => track.id), patch: validated.data });
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
            modal={false}
            disablePointerDismissal
            onOpenChange={(open) => {
                if (!open && !busy) onClose();
            }}
        >
            <DialogContent
                ref={panel}
                initialFocus={() => document.getElementById("tag-title")}
                style={style}
                showCloseButton={!busy}
                showOverlay={false}
                className="tag-editor"
            >
                <DialogHeader
                    className="tag-editor-header"
                    tabIndex={0}
                    aria-label="Move tag editor"
                    title="Drag to move, or hold Alt and use the arrow keys"
                    {...handleProps}
                >
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
                </DialogHeader>
                <div className="tag-editor-body">
                    <TagForm
                        busy={busy}
                        batch={batch}
                        values={values}
                        onReset={reset}
                        enabled={enabled}
                        onChange={change}
                        onToggle={toggle}
                    />

                    {error &&
                        <Alert variant="destructive">
                            <AlertDescription>
                                {error}
                            </AlertDescription>
                        </Alert>
                    }
                </div>
                <DialogFooter className="tag-editor-footer">
                    <Button variant="ghost" disabled={busy} onClick={onClose}>
                        Cancel
                    </Button>
                    <Button disabled={busy || !enabled.size} onClick={() => void save()}>
                        <Check/>
                        {busy ? "Saving…" : "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
