import type {ReactNode} from "react";
import type {LucideIcon} from "lucide-react";


interface PageHeaderProps {
    title: string;
    eyebrow: string;
    icon: LucideIcon;
    details: ReactNode;
    artwork?: ReactNode;
    actions?: ReactNode;
    visualizer?: ReactNode;
    search?: ReactNode;
}


export function PageHeader({ title, eyebrow, icon: Icon, details, artwork, actions, visualizer, search }: PageHeaderProps) {
    return (
        <header className="page-header flex w-full shrink-0 flex-col gap-4">
            <div className="flex min-w-0 items-center gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-primary/15 bg-linear-to-br from-primary/15 to-info/5 text-primary shadow-sm [&_.cover]:size-full">
                    {artwork ?? <Icon className="size-7 stroke-[1.5]" aria-hidden="true"/>}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
                    <h1 className="truncate text-[32px] font-bold leading-tight tracking-[-0.04em]">{title}</h1>
                    <div className="mt-2 text-xs text-muted-foreground">{details}</div>
                </div>
            </div>
            {(actions || visualizer || search) && <div className="page-tools flex min-w-0 items-center gap-3">
                {actions && <div className="page-actions flex shrink-0 items-center gap-2">{actions}</div>}
                {search}
                {visualizer && <div className="ml-auto min-w-0 overflow-hidden">{visualizer}</div>}
            </div>}
        </header>
    );
}
