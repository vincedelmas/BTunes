import {LocateFixed} from "lucide-react";
import {Button} from "@/components/ui/button";

interface ShowPlayingButtonProps {
    disabled: boolean;
    onClick: () => void;
}


export function ShowPlayingButton({ disabled, onClick }: ShowPlayingButtonProps) {
    return (
        <Button
            size="icon-sm"
            variant="ghost"
            disabled={disabled}
            onClick={onClick}
            aria-label="Show playing song"
            title="Show playing song"
        >
            <LocateFixed/>
        </Button>
    );
}
