import React, { useState, useMemo } from "react";
import { Stack, IconButton, Modal } from "@fluentui/react";
import DOMPurify from "dompurify";

import styles from "./Answer.module.css";
import { ChatAppResponse, getCitationFilePath } from "../../api";
import { parseAnswerToHtml } from "./AnswerParser";
import { AnswerIcon } from "./AnswerIcon";
import { SpeechOutputBrowser } from "./SpeechOutputBrowser";
import { SpeechOutputAzure } from "./SpeechOutputAzure";

interface Props {
    answer: ChatAppResponse;
    isSelected?: boolean;
    isStreaming: boolean;
    onCitationClicked: (filePath: string) => void;
    onThoughtProcessClicked: () => void;
    onSupportingContentClicked: () => void;
    onFollowupQuestionClicked?: (question: string) => void;
    showFollowupQuestions?: boolean;
    showSpeechOutputBrowser?: boolean;
    showSpeechOutputAzure?: boolean;
    speechUrl: string | null;
}

export const Answer = ({
    answer,
    isSelected,
    isStreaming,
    onCitationClicked,
    onThoughtProcessClicked,
    onSupportingContentClicked,
    onFollowupQuestionClicked,
    showFollowupQuestions,
    showSpeechOutputAzure,
    showSpeechOutputBrowser,
    speechUrl
}: Props) => {
    const followupQuestions = answer.context?.followup_questions;
    const messageContent = answer.message.content;
    const parsedAnswer = useMemo(() => parseAnswerToHtml(messageContent, isStreaming, onCitationClicked), [answer]);
    const sanitizedAnswerHtml = DOMPurify.sanitize(parsedAnswer.answerHtml);

    // Detect if on Mobile
    const isMobile = window.innerWidth < 768;

    // PDF Modal State for Desktop
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState("");

    // Handle citation click (Different for mobile & desktop)
    const handleCitationClick = (filePath: string) => {
        if (isMobile) {
            // Ensure URL is absolute
            const absoluteFilePath = new URL(filePath, window.location.origin).href;

            // Open PDF in a new tab (Fix mobile issue)
            window.open(absoluteFilePath, "_blank", "noopener,noreferrer");
        } else {
            // Desktop: Open in a proper full-screen modal
            setPdfUrl(filePath);
            setIsModalOpen(true);
        }
    };

    return (
        <Stack className={`${styles.answerContainer} ${isSelected && styles.selected}`} verticalAlign="space-between">
            <Stack.Item>
                <Stack horizontal horizontalAlign="space-between">
                    <AnswerIcon />
                    <div>
                        <IconButton
                            style={{ color: "black" }}
                            iconProps={{ iconName: "ClipboardList" }}
                            title="Show supporting content"
                            ariaLabel="Show supporting content"
                            onClick={() => onSupportingContentClicked()}
                            disabled={!answer.context.data_points}
                        />
                        {showSpeechOutputAzure && <SpeechOutputAzure url={speechUrl} />}
                        {showSpeechOutputBrowser && <SpeechOutputBrowser answer={sanitizedAnswerHtml} />}
                    </div>
                </Stack>
            </Stack.Item>

            <Stack.Item grow>
                <div className={styles.answerText} dangerouslySetInnerHTML={{ __html: sanitizedAnswerHtml }}></div>
            </Stack.Item>

            {!!parsedAnswer.citations.length && (
                <Stack.Item>
                    <Stack horizontal wrap tokens={{ childrenGap: 5 }}>
                        <span className={styles.citationLearnMore}>Citations:</span>
                        {parsedAnswer.citations.map((x, i) => {
                            const path = getCitationFilePath(x);
                            return (
                                <a key={i} className={styles.citation} title={x} onClick={() => handleCitationClick(path)}>
                                    {`${i + 1}. ${x}`}
                                </a>
                            );
                        })}
                    </Stack>
                </Stack.Item>
            )}

            {!!followupQuestions?.length && showFollowupQuestions && onFollowupQuestionClicked && (
                <Stack.Item>
                    <Stack horizontal wrap className={`${!!parsedAnswer.citations.length ? styles.followupQuestionsList : ""}`} tokens={{ childrenGap: 6 }}>
                        <span className={styles.followupQuestionLearnMore}>Follow-up questions:</span>
                        {followupQuestions.map((x, i) => (
                            <a key={i} className={styles.followupQuestion} title={x} onClick={() => onFollowupQuestionClicked(x)}>
                                {`${x}`}
                            </a>
                        ))}
                    </Stack>
                </Stack.Item>
            )}

            {/* Desktop PDF Viewer - Now Fullscreen & Properly Styled */}
            <Modal
                isOpen={isModalOpen}
                onDismiss={() => setIsModalOpen(false)}
                styles={{ main: { width: "90vw", height: "90vh" } }} // Fixing modal size issue
            >
                <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
                    <iframe
                        src={pdfUrl}
                        width="100%"
                        height="100%"
                        style={{ flexGrow: 1, border: "none" }}
                        title="Citation PDF"
                    />
                </div>
            </Modal>
        </Stack>
    );
};
