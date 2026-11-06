import {Folder, FolderPlus} from "lucide-react";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";

export function SettingsPanel({ folders, busy, onImport, onClose }: {
    folders: string[];
    busy: boolean;
    onImport: () => void;
    onClose: () => void;
}) {
    return (
        <Dialog open onOpenChange={(open) => {
            if (!open) onClose();
        }}>
            <DialogContent className="settings-panel">
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>Manage your music folders.</DialogDescription>
                </DialogHeader>
                <section aria-label="Music folders">
                    <h3>Music folders ({folders.length})</h3>
                    <p className="muted">Changes to these folders are watched while BTunes is open.</p>
                    {folders.length ? (
                        <ul className="settings-folders">
                            {folders.map((folder) => <li key={folder}>
                                <Folder aria-hidden="true"/>
                                <span>{folder}</span>
                            </li>)}
                        </ul>
                    ) : <p className="muted">No folders added yet.</p>}
                    <Button disabled={busy} onClick={onImport}>
                        <FolderPlus/>{busy ? "Indexing…" : "Add music folder"}</Button>
                </section>
            </DialogContent>
        </Dialog>
    );
}
