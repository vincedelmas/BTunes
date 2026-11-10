import type {ReactNode} from "react";


interface PageHeaderProps {
    title: string;
    details: ReactNode;
    actions?: ReactNode;
    visualizer?: ReactNode;
}


export function PageHeader({ title, details, actions, visualizer }: PageHeaderProps) {
    return (
        <header className="page-header flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
                <div className="mt-1.5 text-xs text-muted-foreground">{details}</div>
            </div>
            {(actions || visualizer) && <div className="page-tools ml-auto flex flex-wrap items-center justify-end gap-x-5 gap-y-3">
                {visualizer}
                {actions && <div className="page-actions flex shrink-0 items-center gap-2">{actions}</div>}
            </div>}
        </header>
    );
}
