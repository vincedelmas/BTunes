import {Button} from "@/components/ui/button";
import type {AppUpdateController} from "@/types/updates";
import {UpdateControls} from "@/components/update-controls";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";


interface UpdateNotificationProps {
    blocked: boolean;
    updates: AppUpdateController;
}


export function UpdateNotification({ updates, blocked }: UpdateNotificationProps) {
    const {state} = updates;
    if (!state?.showPrompt || blocked) return null;

    const downloaded = state.status === "downloaded";

    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) void updates.dismiss();
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {downloaded ? "Update ready to install" : "BTunes update available"}
                    </DialogTitle>
                    <DialogDescription>
                        Installed:
                        {" "}
                        {state.version}
                        {" "}
                        · Available:
                        {" "}
                        {state.availableVersion}
                    </DialogDescription>
                </DialogHeader>
                <UpdateControls updates={updates}/>
                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => void updates.dismiss()}
                    >
                        Later
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
