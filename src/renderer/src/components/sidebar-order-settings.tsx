import type {SidebarLayout} from "@/types/sidebar";
import {useDragOrder} from "@/hooks/use-drag-order";
import {navigationItems} from "@/lib/sidebar-navigation";
import {ReorderHandle} from "@/components/reorder-handle";
import type {Playlist} from "../../../shared/types/library";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";


interface OrderListProps {
    title: string;
    group: string;
    onChange: (ids: string[]) => void;
    items: { id: string; label: string }[];
}


function OrderList({ title, group, items, onChange }: OrderListProps) {
    const ordering = useDragOrder(items.map((item) => item.id), onChange, group);

    return (
        <section>
            <h3 className="order-list-title font-semibold mb-3">{title}</h3>
            <ul
                aria-label={title}
                className="settings-order-list max-h-70 overflow-y-auto [&_li]:flex [&_li]:items-center
                [&_li]:justify-between [&_li]:gap-4 [&_li]:py-2 [&_li]:px-3 [&_li]:border-b [&_li]:border-border
                [&_span]:min-w-0 [&_span]:overflow-hidden [&_span]:text-ellipsis [&_span]:whitespace-nowrap"
            >
                {items.map((item) => (
                    <li
                        key={item.id}
                        onDragOver={ordering.over}
                        onDrop={(ev) => ordering.drop(ev, item.id)}
                    >
                        <span>{item.label}</span>
                        <ReorderHandle
                            onDragEnd={ordering.end}
                            label={"Move " + item.label + " " + group}
                            onDragStart={(ev) => ordering.start(ev, item.id)}
                            onKeyDown={(ev) => ordering.keyDown(ev, item.id)}
                        />
                    </li>
                ))}
            </ul>
        </section>
    );
}


interface SidebarOrderSettingsProps {
    playlists: Playlist[];
    layout: SidebarLayout;
}


export function SidebarOrderSettings({ layout, playlists }: SidebarOrderSettingsProps) {
    return (
        <Card className="settings-card max-w-220 mb-5 bg-[#191919] border border-[#ffffff0c] rounded-[14px]">
            <CardHeader>
                <CardTitle>
                    Sidebar order
                </CardTitle>
                <CardDescription>
                    Drag the handles here to arrange navigation and playlists. Changes are saved automatically.
                </CardDescription>
            </CardHeader>
            <CardContent className="sidebar-order-settings grid grid-cols-[repeat(auto-fit,_minmax(220px,_1fr))] gap-6">
                <OrderList
                    title="Navigation"
                    group="navigation item"
                    onChange={layout.setNavigationOrder}
                    items={layout.navigationIds.map((id) => ({
                        id,
                        label: navigationItems.find((item) => item.id === id)!.label,
                    }))}
                />
                {playlists.length > 0 &&
                    <OrderList
                        group="playlist"
                        title="Playlists"
                        onChange={layout.setPlaylistOrder}
                        items={layout.playlistIds.map((id) => ({ id, label: playlists.find((item) => String(item.id) === id)!.name }))}
                    />
                }
            </CardContent>
        </Card>
    );
}
