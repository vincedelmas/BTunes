import {useEffect, useEffectEvent} from "react";


export function useMouseNavigation(goBack: () => void, goForward: () => void) {
    const handleNavigation = useEffectEvent((ev: MouseEvent) => {
        if (ev.button !== 3 && ev.button !== 4) return;

        ev.preventDefault();
        const dialogs = document.querySelectorAll('[data-slot="dialog-content"]');
        const dialog = dialogs.item(dialogs.length - 1);

        if (dialog) {
            // Back dismisses the topmost dialog; forward never navigates underneath one.
            if (ev.button === 3) dialog.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]')?.click();
            return;
        }

        if (ev.button === 3) goBack();
        else goForward();
    });

    useEffect(() => {
        function preventBrowserNavigation(ev: MouseEvent) {
            if (ev.button === 3 || ev.button === 4) ev.preventDefault();
        }

        const navigate = (ev: MouseEvent) => handleNavigation(ev);
        window.addEventListener("mousedown", preventBrowserNavigation);
        window.addEventListener("mouseup", navigate);
        window.addEventListener("auxclick", preventBrowserNavigation);

        return () => {
            window.removeEventListener("mousedown", preventBrowserNavigation);
            window.removeEventListener("mouseup", navigate);
            window.removeEventListener("auxclick", preventBrowserNavigation);
        };
    }, []);
}
