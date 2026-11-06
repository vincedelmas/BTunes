import type {Playlist} from "../../../shared/types/library";
import {itemOrderSchema} from "../../../shared/schemas/preferences";
import {navigationItems} from "@/lib/sidebar-navigation";
import {normalizeOrder} from "@/lib/preferences";
import {usePreference} from "@/hooks/use-preference";

export function useSidebarLayout(playlists: Playlist[]) {
    const [navigationOrder, setNavigationOrder] = usePreference("btunes.sidebar-order.v1", itemOrderSchema, navigationItems.map((item) => item.id));
    const [playlistOrder, setPlaylistOrder] = usePreference("btunes.playlist-order.v1", itemOrderSchema, []);
    const navigationIds = normalizeOrder(navigationOrder, navigationItems.map((item) => item.id));
    const playlistIds = normalizeOrder(playlistOrder, playlists.map((playlist) => String(playlist.id)));

    return { navigationIds, playlistIds, setNavigationOrder, setPlaylistOrder };
}
