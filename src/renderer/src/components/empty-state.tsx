import type {ReactNode} from "react";
import type {LucideIcon} from "lucide-react";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty";


interface EmptyStateProps {
    title: string;
    icon: LucideIcon;
    description: string;
    children?: ReactNode;
}


export function EmptyState({ icon: Icon, title, description, children }: EmptyStateProps) {
    return (
        <Empty
            className="empty min-h-45 h-full gap-5 p-8">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <Icon/>
                </EmptyMedia>
                <EmptyTitle>
                    {title}
                </EmptyTitle>
                <EmptyDescription>
                    {description}
                </EmptyDescription>
            </EmptyHeader>

            {children &&
                <EmptyContent>
                    {children}
                </EmptyContent>
            }
        </Empty>
    );
}
