import {Volume2} from "lucide-react";
import {Badge} from "@/components/ui/badge";

export function NowPlayingBadge() {
    return <Badge className="absolute top-2 right-2">
        <Volume2/>
        Now playing
    </Badge>;
}
