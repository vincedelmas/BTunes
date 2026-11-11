import {smartMixes} from "../../../shared/smart-mixes";
import type {Playlist} from "../../../shared/types/library";
import {itemOrderSchema, pinnedPlaylistsSchema} from "../../../shared/schemas/preferences";
import {navigationItems} from "@/lib/sidebar-navigation";
import {normalizeOrder} from "@/lib/preferences";
import {usePreference} from "@/hooks/use-preference";

export function useSidebarLayout(playlists: Playlist[]) {
    const [navigationOrder, setNavigationOrder] = usePreference("btunes.sidebar-order.v1", itemOrderSchema, navigationItems.map((item) => item.id));
    const [playlistOrder, setPlaylistOrder] = usePreference("btunes.playlist-order.v1", itemOrderSchema, []);
    const navigationIds = normalizeOrder(navigationOrder, navigationItems.map((item) => item.id));
    const playlistIds = normalizeOrder(playlistOrder, playlists.map((playlist) => String(playlist.id)));

    const [savedPins, setPins] = usePreference("btunes.pinned-playlists.v1", pinnedPlaylistsSchema, []);
    const pinnableIds = [...smartMixes.map((mix) => mix.id), ...playlists.map((playlist) => "playlist:" + playlist.id)];
    const pinnedIds = [...new Set(savedPins)].filter((id) => pinnableIds.includes(id)).slice(0, 3);

    function setPinned(id: string, pinned: boolean) {
        setPins((previous) => {
            const next = [...new Set(previous)].filter((entry) => pinnableIds.includes(entry) && entry !== id);
            if (pinned && next.length < 3) next.push(id);
            return next;
        });
    }

    return { navigationIds, playlistIds, pinnedIds, setPinned, setNavigationOrder, setPlaylistOrder };
}
