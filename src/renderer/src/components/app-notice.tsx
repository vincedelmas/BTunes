import {X, Check} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Alert, AlertAction, AlertDescription} from "@/components/ui/alert";


interface AppNoticeProps {
    message: string;
    onDismiss: () => void;
}


export function AppNotice({ message, onDismiss }: AppNoticeProps) {
    return (
        <div
            role="status"
            aria-atomic="true"
            className="notice pointer-events-none absolute bottom-4 right-4 w-80 max-w-[calc(100%-2rem)]"
        >
            {message && (
                <Alert role="presentation" className="pointer-events-auto shadow-lg">
                    <Check aria-hidden="true"/>
                    <AlertDescription className="pr-8">
                        {message}
                    </AlertDescription>
                    <AlertAction>
                        <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={onDismiss}
                            aria-label="Dismiss notification"
                        >
                            <X/>
                        </Button>
                    </AlertAction>
                </Alert>
            )}
        </div>
    );
}
