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
            className="empty min-h-45 flex flex-col justify-center items-center text-center gap-[18px] p-5 h-full [&_>_svg]:w-[65px] [&_>_svg]:h-[65px] [&_>_svg]:stroke-[1] [&_>_svg]:text-muted-foreground [&_>_svg]:mb-1 [&_p]:max-w-[450px] [&_p]:text-muted-foreground [&_p]:leading-[1.7] [&_p]:mt-0 [&_p]:mx-0 [&_p]:mb-[10px] [&_p]:text-[13px] [&_h2]:text-[27px] [&_h2]:tracking-[-0.7px] [&_h2]:font-[750] [&_h2]:m-0">
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
