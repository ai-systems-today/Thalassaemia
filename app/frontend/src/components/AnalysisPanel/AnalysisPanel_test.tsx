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

interface Props {
    className: string;
    activeTab: AnalysisPanelTabs;
    onActiveTabChanged: (tab: AnalysisPanelTabs) => void;
    activeCitation: string | undefined;
    citationHeight: string;
    answer: ChatAppResponse;
}

const pivotItemDisabledStyle = { disabled: true, style: { color: "grey" } };

export const AnalysisPanel = ({ 
    answer, 
    activeTab, 
    activeCitation, 
    citationHeight, 
    className, 
    onActiveTabChanged 
}: Props) => {
    const isDisabledSupportingContentTab: boolean = !answer.context.data_points;
    const isDisabledCitationTab: boolean = !activeCitation;
    const [citation, setCitation] = useState("");

    const client = useLogin ? useMsal().instance : undefined;

    // const fetchCitation = async () => {
    //     const token = client ? await getToken(client) : undefined;
    //     if (activeCitation) {
    //         const originalHash = activeCitation.includes("#") ? activeCitation.split("#")[1] : "";
    //         const response = await fetch(activeCitation, {
    //             method: "GET",
    //             headers: await getHeaders(token)
    //         });
    //         const citationContent = await response.blob();
    //         let citationObjectUrl = URL.createObjectURL(citationContent);
    //         if (originalHash) {
    //             citationObjectUrl += "#" + originalHash;
    //         }
    //         setCitation(citationObjectUrl);
    //     }
    // };

    const fetchCitation = async () => {
        const token = client ? await getToken(client) : undefined;
        if (activeCitation) {
            const response = await fetch(activeCitation, {
                method: "GET",
                headers: await getHeaders(token)
            });
            const citationContent = await response.blob();
    
            // Use direct citation URL instead of object URL
            setCitation(activeCitation);
        }
    };
    

    useEffect(() => {
        fetchCitation();
    }, [activeCitation]);

    // const renderFileViewer = () => {
    //     if (!activeCitation) {
    //         return null;
    //     }

    //     const fileExtension = activeCitation.split(".").pop()?.toLowerCase();
    //     switch (fileExtension) {
    //         case "png":
    //             return <img src={citation} className={styles.citationImg} alt="Citation Image" />;
    //         case "md":
    //             return <MarkdownViewer src={activeCitation} />;
    //         case "pdf":
    //             return (
    //                 <iframe 
    //                     title="Citation" 
    //                     src={`https://docs.google.com/gview?url=${citation}&embedded=true`} 
    //                     width="100%" 
    //                     height={citationHeight} 
    //                     className={styles.pdfViewer} 
    //                 />
    //             );
    //         default:
    //             return <iframe title="Citation" src={citation} width="100%" height={citationHeight} />;
    //     }
    // };

    // const renderFileViewer = () => {
    //     if (!activeCitation) {
    //         return null;
    //     }
    
    //     const fileExtension = activeCitation.split(".").pop()?.toLowerCase();
    //     const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    //     if (fileExtension === "pdf") {
    //         return isMobile ? (
    //             <a href={citation} target="_blank" rel="noopener noreferrer" className={styles.pdfLink}>
    //                 Open PDF
    //             </a>
    //         ) : (
    //             <iframe title="Citation PDF" src={citation} width="100%" height={citationHeight} style={{ border: "none" }} />
    //         );
    //     } else if (fileExtension === "png") {
    //         return <img src={citation} className={styles.citationImg} alt="Citation Image" />;
    //     } else if (fileExtension === "md") {
    //         return <MarkdownViewer src={activeCitation} />;
    //     } else {
    //         return <iframe title="Citation" src={citation} width="100%" height={citationHeight} />;
    //     }
    // };
    
    const renderFileViewer = () => {
        if (!activeCitation) {
            return null;
        }
    
        const fileExtension = activeCitation.split(".").pop()?.toLowerCase();
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
        if (fileExtension === "pdf") {
            const pageNumber = activeCitation.includes("#page=") 
                ? activeCitation.split("#page=")[1] 
                : "1"; // Default to page 1 if no page is specified
    
            const pdfUrl = isMobile 
                ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(activeCitation)}` 
                : activeCitation;
    
            return isMobile ? (
                <iframe 
                    title="Citation PDF" 
                    src={pdfUrl} 
                    width="100%" 
                    height={citationHeight} 
                    style={{ border: "none" }} 
                />
            ) : (
                <iframe 
                    title="Citation PDF" 
                    src={activeCitation} 
                    width="100%" 
                    height={citationHeight} 
                    style={{ border: "none" }} 
                />
            );
        } else if (fileExtension === "png") {
            return <img src={citation} className={styles.citationImg} alt="Citation Image" />;
        } else if (fileExtension === "md") {
            return <MarkdownViewer src={activeCitation} />;
        } else {
            return <iframe title="Citation" src={citation} width="100%" height={citationHeight} />;
        }
    };
    
 

    return (
        <div className={styles.analysisPanelContainer}>
            <h3 className={styles.referencesTitle}>References</h3>
            <p className={styles.referencesNote}>
                Click on the Supporting content and Citation links below to access the relevant publication.
            </p>
            <Pivot
                className={className}
                selectedKey={activeTab}
                onLinkClick={pivotItem => pivotItem && onActiveTabChanged(pivotItem.props.itemKey! as AnalysisPanelTabs)}
            >
                <PivotItem
                    itemKey={AnalysisPanelTabs.SupportingContentTab}
                    headerText="Supporting content"
                    headerButtonProps={isDisabledSupportingContentTab ? pivotItemDisabledStyle : undefined}
                >
                    <SupportingContent supportingContent={answer.context.data_points} />
                </PivotItem>
                <PivotItem
                    itemKey={AnalysisPanelTabs.CitationTab}
                    headerText="Citation"
                    headerButtonProps={isDisabledCitationTab ? pivotItemDisabledStyle : undefined}
                >
                    {renderFileViewer()}
                </PivotItem>
            </Pivot>
        </div>
    );
};
