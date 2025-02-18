import PDFViewer from "./components/PDFViewer/PDFViewer";
import React from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { initializeIcons } from "@fluentui/react";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication, EventType, AccountInfo } from "@azure/msal-browser";
import { msalConfig, useLogin } from "./authConfig";
import { useState } from "react";

import "./index.css";

import Chat from "./pages/chat/Chat";
import LayoutWrapper from "./layoutWrapper";

initializeIcons();

// ✅ **Define getPdfUrl() function**
const getPdfUrl = () => {
    const params = new URLSearchParams(window.location.search);
    //return params.get("file") || "https://example.com/default.pdf"; // Default PDF if none provided
    return params.get("file") || "https://stthalassaemia.blob.core.windows.net/content/sample.pdf";
};

const router = createHashRouter([
    {
        path: "/",
        element: <LayoutWrapper />,
        children: [
            {
                index: true,
                element: <Chat />
            },
            {
                path: "qa",
                lazy: () => import("./pages/ask/Ask")
            },
                        {
                path: "pdf-viewer",  // ✅ Add this route
                element: <PDFViewer pdfUrl={getPdfUrl()} /> // ✅ Pass pdfUrl prop
            },
            {
                path: "*",
                lazy: () => import("./pages/NoPage")
            }
        ]
    }
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <RouterProvider router={router} />
    </React.StrictMode>
);
