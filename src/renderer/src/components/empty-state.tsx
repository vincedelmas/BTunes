import type {ReactNode} from "react";
import type {LucideIcon} from "lucide-react";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty";

export function EmptyState({
                               icon: Icon,
                               title,
                               description,
                               children,
                           }: {
    icon: LucideIcon;
    title: string;
    description: string;
    children?: ReactNode;
}) {
    return (
        <Empty className="empty">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <Icon/>
                </EmptyMedia>
                <EmptyTitle>{title}</EmptyTitle>
                <EmptyDescription>{description}</EmptyDescription>
            </EmptyHeader>
            {children && <EmptyContent>{children}</EmptyContent>}
        </Empty>
    );
}
