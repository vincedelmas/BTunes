import type {SidebarLayout} from "@/types/sidebar";
import {useDragOrder} from "@/hooks/use-drag-order";
import {navigationItems} from "@/lib/sidebar-navigation";
import {ReorderHandle} from "@/components/reorder-handle";
import type {Playlist} from "../../../shared/types/library";
import {SettingsSection} from "@/components/settings/settings-section";
import {cn} from "@/lib/utils";


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
            <h3 className="mb-3 text-xs font-medium text-muted-foreground">{title}</h3>
            <ul
                aria-label={title}
                className="settings-order-list flex flex-col gap-1"
            >
                {items.map((item) => (
                    <li
                        key={item.id}
                        className={cn("flex items-center justify-between gap-4 rounded-lg border border-border bg-control px-4 py-3", ordering.dragging === item.id && "opacity-40")}
                        onDragOver={ordering.over}
                        onDrop={(ev) => ordering.drop(ev, item.id)}
                    >
                        <span className="truncate">{item.label}</span>
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
        <SettingsSection
            title="Sidebar order"
            description="Drag items to reorder them. Changes are saved automatically."
        >
            <div className="sidebar-order-settings grid gap-7 md:grid-cols-2">
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
            </div>
            <p className="mt-5 text-xs text-muted-foreground">Focus a drag handle and press Alt + ↑ or ↓ to reorder.</p>
        </SettingsSection>
    );
}
