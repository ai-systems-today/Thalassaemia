import { Stack, Pivot, PivotItem } from "@fluentui/react";
import styles from "./AnalysisPanel.module.css";
import { SupportingContent } from "../SupportingContent";
import { ChatAppResponse } from "../../api";
import { AnalysisPanelTabs } from "./AnalysisPanelTabs";
import { MarkdownViewer } from "../MarkdownViewer";
import { useMsal } from "@azure/msal-react";
import { getHeaders } from "../../api";
import { useLogin, getToken } from "../../authConfig";
import { useState, useEffect } from "react";
import PDFViewer from "../PDFViewer/PDFViewer"; // ✅ Import PDF Viewer

interface Props {
    className: string;
    activeTab: AnalysisPanelTabs;
    onActiveTabChanged: (tab: AnalysisPanelTabs) => void;
    activeCitation: string | undefined;
    citationHeight: string;
    answer: ChatAppResponse;
}

export const AnalysisPanel = ({ activeCitation, citationHeight }: Props) => {
    const [citation, setCitation] = useState("");

    useEffect(() => {
        if (activeCitation) {
            setCitation(activeCitation);
        }
    }, [activeCitation]);

    return (
        <div className={styles.analysisPanelContainer}>
            <h3 className={styles.referencesTitle}>References</h3>

            {activeCitation?.endsWith(".pdf") ? (
                <PDFViewer pdfUrl={activeCitation || ""} />
            ) : (
                <iframe title="Citation" src={citation} width="100%" height={citationHeight} style={{ border: "none" }} />
            )}
        </div>
    );
};
