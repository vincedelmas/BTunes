import "./style.css";
import React from "react";
import {App} from "./App";
import "@fontsource-variable/inter";
import {createRoot} from "react-dom/client";
import {AppErrorBoundary} from "@/components/app-error-boundary";


createRoot(document.getElementById("root")!).render(
    (
        <React.StrictMode>
            <AppErrorBoundary>
                <App/>
            </AppErrorBoundary>
        </React.StrictMode>
    ),
);
