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
            onClick={onClick}
            disabled={disabled}
            title="Show playing song"
            aria-label="Show playing song"
        >
            <LocateFixed/>
        </Button>
    );
}
