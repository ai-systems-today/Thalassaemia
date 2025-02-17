import { Stack, Pivot, PivotItem } from "@fluentui/react";
import { useState, useEffect } from "react";
import styles from "./AnalysisPanel.module.css";
import { SupportingContent } from "../SupportingContent";
import { ChatAppResponse } from "../../api";
import { AnalysisPanelTabs } from "./AnalysisPanelTabs";
import { MarkdownViewer } from "../MarkdownViewer";
import { useMsal } from "@azure/msal-react";
import { getHeaders } from "../../api";
import { useLogin, getToken } from "../../authConfig";

interface Props {
    className: string;
    activeTab: AnalysisPanelTabs;
    onActiveTabChanged: (tab: AnalysisPanelTabs) => void;
    activeCitation: string | undefined;
    citationHeight: string;
    answer: ChatAppResponse;
}

const pivotItemDisabledStyle = { disabled: true, style: { color: "grey" } };

export const AnalysisPanel = ({ answer, activeTab, activeCitation, citationHeight, className, onActiveTabChanged }: Props) => {
    const isDisabledSupportingContentTab: boolean = !answer.context.data_points;
    const isDisabledCitationTab: boolean = !activeCitation;
    const [citation, setCitation] = useState("");

    const client = useLogin ? useMsal().instance : undefined;

    useEffect(() => {
        if (activeCitation) {
            const fetchCitation = async () => {
                const token = client ? await getToken(client) : undefined;
                const response = await fetch(activeCitation, {
                    method: "GET",
                    headers: await getHeaders(token)
                });
                const citationContent = await response.blob();
                let citationObjectUrl = URL.createObjectURL(citationContent);
                setCitation(citationObjectUrl);
            };
            fetchCitation();
        }
    }, [activeCitation]);

    const renderFileViewer = () => {
        if (!activeCitation) return null;

        const fileExtension = activeCitation.split(".").pop()?.toLowerCase();
        switch (fileExtension) {
            case "png":
                return <img src={citation} className={styles.citationImg} alt="Citation Image" />;
            case "md":
                return <MarkdownViewer src={activeCitation} />;
            default:
                return <iframe title="Citation" src={citation} width="100%" style={{ maxHeight: "80vh", overflow: "auto" }} />;
        }
    };

    return (
        <div className={styles.analysisPanelContainer}>
            <h3 className={styles.referencesTitle}>References</h3>
            <p className={styles.referencesNote}>Click on the Supporting content and Citation links below to access the relevant publication.</p>
            <Pivot className={className} selectedKey={activeTab} onLinkClick={pivotItem => pivotItem && onActiveTabChanged(pivotItem.props.itemKey! as AnalysisPanelTabs)}>
                <PivotItem itemKey={AnalysisPanelTabs.SupportingContentTab} headerText="Supporting content" headerButtonProps={isDisabledSupportingContentTab ? pivotItemDisabledStyle : undefined}>
                    <SupportingContent supportingContent={answer.context.data_points} />
                </PivotItem>
                <PivotItem itemKey={AnalysisPanelTabs.CitationTab} headerText="Citation" headerButtonProps={isDisabledCitationTab ? pivotItemDisabledStyle : undefined}>
                    {renderFileViewer()}
                </PivotItem>
            </Pivot>
        </div>
    );
};
