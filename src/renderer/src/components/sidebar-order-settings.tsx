import type {Playlist} from "../../../shared/types/library";
import type {SidebarLayout} from "@/types/sidebar";
import {navigationItems} from "@/lib/sidebar-navigation";
import {useDragOrder} from "@/hooks/use-drag-order";
import {ReorderHandle} from "@/components/reorder-handle";
import {Card, CardHeader, CardTitle, CardDescription, CardContent} from "@/components/ui/card";

interface OrderListProps {
    title: string;
    group: string;
    items: { id: string; label: string }[];
    onChange: (ids: string[]) => void;
}

function OrderList({ title, group, items, onChange }: OrderListProps) {
    const ordering = useDragOrder(items.map((item) => item.id), onChange, group);

    return (
        <section>
            <h3 className="order-list-title">{title}</h3>
            <ul className="settings-order-list" aria-label={title}>
                {items.map((item) => (
                    <li key={item.id} onDragOver={ordering.over} onDrop={(ev) => ordering.drop(ev, item.id)}>
                        <span>{item.label}</span>
                        <ReorderHandle
                            label={"Move " + item.label + " " + group}
                            onDragStart={(ev) => ordering.start(ev, item.id)}
                            onDragEnd={ordering.end}
                            onKeyDown={(ev) => ordering.keyDown(ev, item.id)}
                        />
                    </li>
                ))}
            </ul>
        </section>
    );
}

interface SidebarOrderSettingsProps {
    layout: SidebarLayout;
    playlists: Playlist[];
}

export function SidebarOrderSettings({ layout, playlists }: SidebarOrderSettingsProps) {
    return (
        <Card className="settings-card">
            <CardHeader>
                <CardTitle>Sidebar order</CardTitle>
                <CardDescription>Drag the handles here to arrange navigation and playlists. Changes are saved automatically.</CardDescription>
            </CardHeader>
            <CardContent className="sidebar-order-settings">
                <OrderList title="Navigation" group="navigation item" onChange={layout.setNavigationOrder}
                           items={layout.navigationIds.map((id) => ({ id, label: navigationItems.find((item) => item.id === id)!.label }))}/>
                {playlists.length > 0 && <OrderList title="Playlists" group="playlist" onChange={layout.setPlaylistOrder}
                                                    items={layout.playlistIds.map((id) => ({ id, label: playlists.find((item) => String(item.id) === id)!.name }))}/>}
            </CardContent>
        </Card>
    );
}
