import type {ReactNode} from "react";
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";

interface SettingsSectionProps {
    title: string;
    description: string;
    action?: ReactNode;
    children: ReactNode;
}


export function SettingsSection({ title, description, action, children }: SettingsSectionProps) {
    return (
        <Card className="gap-5 [--card-spacing:--spacing(5)]">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
                {action && <CardAction>{action}</CardAction>}
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}
