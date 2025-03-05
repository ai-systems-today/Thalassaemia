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

/**
 * Detects if the current device is a mobile device based on user agent
 * @returns boolean - true if the device is mobile, false otherwise
 */
function isMobileDevice(): boolean {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || !window.navigator) {
    return false;
  }
  
  const userAgent = window.navigator.userAgent || window.navigator.vendor || (window as any).opera;
  
  // Regular expression to match most mobile devices
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  
  return mobileRegex.test(userAgent);
}

export default isMobileDevice;

function isPdfUrl(url: string): boolean {
    // Check if the URL ends with .pdf or contains .pdf followed by query parameters
    const pdfRegex = /\.pdf(?:#.*)?(?:\?.*)?$/i;
    return pdfRegex.test(url);
  }


  export const AnalysisPanel = ({ activeCitation, citationHeight }: Props) => {
    if (!activeCitation) {
       return null;
    }

    const isMobile = isMobileDevice();
    const showPdf = isMobile && isPdfUrl(activeCitation);
    return (
        <div className={styles.analysisPanelContainer}>
            <h3 className={styles.referencesTitle}>References</h3>

            {showPdf ? (
                <PDFViewer pdfUrl={activeCitation || ""} />
            ) : (
                <iframe title="Citation" src={activeCitation || ""} width="100%" height={citationHeight} style={{ border: "none" }} />
            )}
        </div>
    );
};
