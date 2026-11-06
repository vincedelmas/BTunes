import {columnOrderingFeature, columnResizingFeature, columnSizingFeature, columnVisibilityFeature, tableFeatures} from "@tanstack/react-table";


export const songTableFeatures = tableFeatures({ columnSizingFeature, columnResizingFeature, columnVisibilityFeature, columnOrderingFeature });


export const songColumns = [
    { id: "title", enableHiding: false, header: "Title", size: 270, minSize: 180, maxSize: 700 },
    { id: "artist", header: "Artist", size: 160, minSize: 100, maxSize: 500 },
    { id: "albumArtist", header: "Album artist", size: 160, minSize: 100, maxSize: 500 },
    { id: "album", header: "Album", size: 180, minSize: 110, maxSize: 600 },
    { id: "genre", header: "Genre", size: 130, minSize: 90, maxSize: 400 },
    { id: "duration", header: "Duration", size: 100, minSize: 85, maxSize: 200 },
    { id: "year", header: "Year", size: 85, minSize: 70, maxSize: 180 },
    { id: "plays", header: "Plays", size: 85, minSize: 70, maxSize: 180 },
];
