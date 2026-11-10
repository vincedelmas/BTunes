import {ArrowDownToLine, Copy, Disc3, History, Library, ListMusic, Music2, Smartphone} from "lucide-react";


export const navigationGroups = [
    { id: "library", label: "Navigation" },
    { id: "collections", label: "Collections" },
    { id: "tools", label: "Transfer & sync" },
];


export const navigationItems = [
    { id: "tracks", label: "Songs", group: "library", tone: "text-primary", icon: Music2 },
    { id: "albums", label: "Albums", group: "library", tone: "text-info", icon: Disc3 },
    { id: "artists", label: "Artists", group: "library", tone: "text-success", icon: Library },
    { id: "history", label: "Recently played", group: "library", tone: "text-info", icon: History },
    { id: "duplicates", label: "Possible duplicates", group: "library", tone: "text-warning", icon: Copy },
    { id: "playlists", label: "Playlists", group: "collections", tone: "text-primary", icon: ListMusic },
    { id: "downloads", label: "Downloads", group: "tools", tone: "text-success", icon: ArrowDownToLine },
    { id: "android", label: "Devices", group: "tools", tone: "text-info", icon: Smartphone },
];


