import {rpc} from "@/lib/rpc";
import {Button} from "@/components/ui/button";
import {Component, type ReactNode} from "react";


interface AppErrorBoundaryProps {
    children: ReactNode;
}


export class AppErrorBoundary extends Component<AppErrorBoundaryProps> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error: unknown) {
        document.getElementById("startup")?.remove();
        console.error("BTunes could not render:", error);
    }

    render() {
        if (!this.state.failed) return this.props.children;

        return (
            <main className="flex min-h-screen items-center justify-center p-6">
                <section
                    role="alert"
                    className="flex max-w-sm flex-col items-start gap-3 rounded-xl border bg-card p-6 text-card-foreground"
                >
                    <h1 className="text-lg font-semibold">
                        BTunes ran into a problem
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Reload the app to return to your library.
                    </p>
                    <Button onClick={() => void rpc("app.reload", undefined).catch(console.error)}>
                        Reload BTunes
                    </Button>
                </section>
            </main>
        );
    }
}
