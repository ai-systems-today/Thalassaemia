import { useRef, useState, useEffect, useContext } from "react";
import { Checkbox, Panel, DefaultButton, TextField, ITextFieldProps, ICheckboxProps } from "@fluentui/react";
import { SparkleFilled } from "@fluentui/react-icons";
import { useId } from "@fluentui/react-hooks";
import readNDJSONStream from "ndjson-readablestream";
import thaliaIcon from "./thalia-logo.png";
import euIcon from "./eu-cofounded.jpg";

import styles from "./Chat.module.css";

import {
    chatApi,
    configApi,
    getSpeechApi,
    RetrievalMode,
    ChatAppResponse,
    ChatAppResponseOrError,
    ChatAppRequest,
    ResponseMessage,
    VectorFieldOptions,
    GPT4VInput
} from "../../api";
import { Answer, AnswerError, AnswerLoading } from "../../components/Answer";
import { QuestionInput } from "../../components/QuestionInput";
import { ExampleList } from "../../components/Example";
import { UserChatMessage } from "../../components/UserChatMessage";
import { HelpCallout } from "../../components/HelpCallout";
import { AnalysisPanel, AnalysisPanelTabs } from "../../components/AnalysisPanel";
//import { SettingsButton } from "../../components/SettingsButton";
import { ClearChatButton } from "../../components/ClearChatButton";
import { UploadFile } from "../../components/UploadFile";
import { useLogin, getToken, requireAccessControl } from "../../authConfig";
import { VectorSettings } from "../../components/VectorSettings";
import { useMsal } from "@azure/msal-react";
import { TokenClaimsDisplay } from "../../components/TokenClaimsDisplay";
import { GPT4VSettings } from "../../components/GPT4VSettings";
import { toolTipText } from "../../i18n/tooltips.js";
import { LoginContext } from "../../loginContext";

const Chat = () => {
    const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
    const [promptTemplate, setPromptTemplate] = useState<string>("");
    const [temperature, setTemperature] = useState<number>(0.0);
    const [minimumRerankerScore, setMinimumRerankerScore] = useState<number>(0);
    const [minimumSearchScore, setMinimumSearchScore] = useState<number>(0);
    const [retrieveCount, setRetrieveCount] = useState<number>(8);
    const [retrievalMode, setRetrievalMode] = useState<RetrievalMode>(RetrievalMode.Hybrid);
    const [useSemanticRanker, setUseSemanticRanker] = useState<boolean>(true);
    const [shouldStream, setShouldStream] = useState<boolean>(true);
    const [useSemanticCaptions, setUseSemanticCaptions] = useState<boolean>(false);
    const [excludeCategory, setExcludeCategory] = useState<string>("");
    const [useSuggestFollowupQuestions, setUseSuggestFollowupQuestions] = useState<boolean>(true);
    const [vectorFieldList, setVectorFieldList] = useState<VectorFieldOptions[]>([VectorFieldOptions.Embedding]);
    const [useOidSecurityFilter, setUseOidSecurityFilter] = useState<boolean>(false);
    const [useGroupsSecurityFilter, setUseGroupsSecurityFilter] = useState<boolean>(false);
    const [gpt4vInput, setGPT4VInput] = useState<GPT4VInput>(GPT4VInput.TextAndImages);
    const [useGPT4V, setUseGPT4V] = useState<boolean>(false);

    const lastQuestionRef = useRef<string>("");
    const chatMessageStreamEnd = useRef<HTMLDivElement | null>(null);

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isStreaming, setIsStreaming] = useState<boolean>(false);
    const [error, setError] = useState<unknown>();

    const [activeCitation, setActiveCitation] = useState<string>();
    const [activeAnalysisPanelTab, setActiveAnalysisPanelTab] = useState<AnalysisPanelTabs | undefined>(undefined);

    const [selectedAnswer, setSelectedAnswer] = useState<number>(0);
    const [answers, setAnswers] = useState<[user: string, response: ChatAppResponse][]>([]);
    const [streamedAnswers, setStreamedAnswers] = useState<[user: string, response: ChatAppResponse][]>([]);
    const [speechUrls, setSpeechUrls] = useState<(string | null)[]>([]);

    const [showGPT4VOptions, setShowGPT4VOptions] = useState<boolean>(false);
    const [showSemanticRankerOption, setShowSemanticRankerOption] = useState<boolean>(false);
    const [showVectorOption, setShowVectorOption] = useState<boolean>(false);
    const [showUserUpload, setShowUserUpload] = useState<boolean>(false);
    const [showSpeechInput, setShowSpeechInput] = useState<boolean>(false);
    const [showSpeechOutputBrowser, setShowSpeechOutputBrowser] = useState<boolean>(false);
    const [showSpeechOutputAzure, setShowSpeechOutputAzure] = useState<boolean>(false);

    const getConfig = async () => {
        configApi().then(config => {
            setShowGPT4VOptions(config.showGPT4VOptions);
            setUseSemanticRanker(config.showSemanticRankerOption);
            setShowSemanticRankerOption(config.showSemanticRankerOption);
            setShowVectorOption(config.showVectorOption);
            if (!config.showVectorOption) {
                setRetrievalMode(RetrievalMode.Text);
            }
            setShowUserUpload(config.showUserUpload);
            setShowSpeechInput(config.showSpeechInput);
            setShowSpeechOutputBrowser(config.showSpeechOutputBrowser);
            setShowSpeechOutputAzure(config.showSpeechOutputAzure);
        });
    };

    // const handleAsyncRequest = async (question: string, answers: [string, ChatAppResponse][], responseBody: ReadableStream<any>) => {
    //     let answer: string = "";
    //     let askResponse: ChatAppResponse = {} as ChatAppResponse;

    //     const updateState = (newContent: string) => {
    //         return new Promise(resolve => {
    //             setTimeout(() => {
    //                 answer += newContent;
    //                 const latestResponse: ChatAppResponse = {
    //                     ...askResponse,
    //                     message: { content: answer, role: askResponse.message.role }
    //                 };
    //                 setStreamedAnswers([...answers, [question, latestResponse]]);
    //                 resolve(null);
    //             }, 33);
    //         });
    //     };
    //     try {
    //         setIsStreaming(true);
    //         for await (const event of readNDJSONStream(responseBody)) {
    //             if (event["context"] && event["context"]["data_points"]) {
    //                 event["message"] = event["delta"];
    //                 askResponse = event as ChatAppResponse;
    //             } else if (event["delta"]["content"]) {
    //                 setIsLoading(false);
    //                 await updateState(event["delta"]["content"]);
    //             } else if (event["context"]) {
    //                 // Update context with new keys from latest event
    //                 askResponse.context = { ...askResponse.context, ...event["context"] };
    //             } else if (event["error"]) {
    //                 throw Error(event["error"]);
    //             }
    //         }
    //     } finally {
    //         setIsStreaming(false);
    //     }
    //     const fullResponse: ChatAppResponse = {
    //         ...askResponse,
    //         message: { content: answer, role: askResponse.message.role }
    //     };
    //     return fullResponse;
    // };

    const client = useLogin ? useMsal().instance : undefined;
    const { loggedIn } = useContext(LoginContext);

    const makeApiRequest = async (question: string) => {
        lastQuestionRef.current = question;

        error && setError(undefined);
        setIsLoading(true);
        setActiveCitation(undefined);
        setActiveAnalysisPanelTab(undefined);

        const token = client ? await getToken(client) : undefined;

        try {
            const messages: ResponseMessage[] = answers.flatMap(a => [
                { content: a[0], role: "user" },
                { content: a[1].message.content, role: "assistant" }
            ]);

            const request: ChatAppRequest = {
                messages: [...messages, { content: question, role: "user" }],
                context: {
                    overrides: {
                        prompt_template: promptTemplate.length === 0 ? undefined : promptTemplate,
                        exclude_category: excludeCategory.length === 0 ? undefined : excludeCategory,
                        top: retrieveCount,
                        temperature: temperature,
                        minimum_reranker_score: minimumRerankerScore,
                        minimum_search_score: minimumSearchScore,
                        retrieval_mode: retrievalMode,
                        semantic_ranker: useSemanticRanker,
                        semantic_captions: useSemanticCaptions,
                        suggest_followup_questions: useSuggestFollowupQuestions,
                        use_oid_security_filter: useOidSecurityFilter,
                        use_groups_security_filter: useGroupsSecurityFilter,
                        vector_fields: vectorFieldList,
                        use_gpt4v: useGPT4V,
                        gpt4v_input: gpt4vInput
                    }
                },
                // AI Chat Protocol: Client must pass on any session state received from the server
                session_state: answers.length ? answers[answers.length - 1][1].session_state : null
            };

            const response = await chatApi(request, shouldStream, token);
            if (!response.body) {
                throw Error("No response body");
            }
            if (shouldStream) {
                const parsedResponse: ChatAppResponse = await handleAsyncRequest(question, answers, response.body);

                // Update the answers state
                const updatedAnswers: [string, ChatAppResponse][] = [...answers, [question, parsedResponse]];
                //const updatedAnswers = [...answers, [question, parsedResponse]];
                setAnswers(updatedAnswers);
                // setAnswers([...answers, [question, parsedResponse]]);
                // Save the chat after the streamed response
                await saveChat(question, parsedResponse.message.content);
            } else {
                const parsedResponse: ChatAppResponseOrError = await response.json();
                if (response.status > 299 || !response.ok) {
                    throw Error(parsedResponse.error || "Unknown error");
                }
                //setAnswers([...answers, [question, parsedResponse as ChatAppResponse]]);
                // Update answers state
                const updatedAnswers: [string, ChatAppResponse][] = [...answers, [question, parsedResponse as ChatAppResponse]];
                setAnswers(updatedAnswers);
                // Save the chat after the streamed response
                //await saveChat(question, parsedResponse.message.content);
                await saveChat(question, (parsedResponse as ChatAppResponse).message.content);
            }
        } catch (e) {
            setError(e);
        } finally {
            setIsLoading(false);
        }
    };

    // // Function to save chat
    // const saveChat = async () => {
    //     try {
    //         if (answers.length === 0) {
    //             console.warn("No chat data to save!");
    //             return;
    //         }

    //         // Prepare messages array
    //         const messages = answers.map(([user, response]) => ({
    //             user, // User's question
    //             assistant: response.message?.content || "No response", // Assistant's answer
    //             questionTimestamp: new Date().toISOString(), // Timestamp for the question
    //             answerTimestamp: new Date().toISOString(), // Timestamp for the answer
    //         }));

    //         console.log("Payload being sent to backend:", JSON.stringify({ messages }));

    //         // Send the chat data to the backend
    //         const response = await fetch(`${process.env.BACKEND_URI}/save-chat`, {
    //             method: "POST",
    //             headers: {
    //                 "Content-Type": "application/json",
    //             },
    //             body: JSON.stringify({ messages }),
    //         });

    //         if (!response.ok) {
    //             console.error(`Failed to save chat: ${response.statusText}`);
    //             throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    //         }

    //         const result = await response.json();
    //         console.log(`Chat saved successfully. Filename: ${result.filename}`);
    //     } catch (error) {
    //         console.error("Error in saveChat:", error);
    //     }
    // };

    // const saveChat = async (question: string, answer: string) => {
    //     try {
    //         if (!question || !answer) {
    //             console.warn("Missing question or answer. Skipping saveChat.");
    //             return;
    //         }

    //         // Prepare the payload
    //         const messages = [
    //             { content: question, role: "user" },
    //             { content: answer, role: "assistant" },
    //         ];

    //         // Debugging log
    //         console.log("Payload sent to backend:", messages);

    //         // Send the payload to the backend
    //         const response = await fetch(`${process.env.BACKEND_URI}/save-chat`, {
    //             method: "POST",
    //             headers: {
    //                 "Content-Type": "application/json",
    //             },
    //             body: JSON.stringify({ messages }),
    //         });

    //         // Handle backend response
    //         if (!response.ok) {
    //             throw new Error(`Failed to save chat: ${response.statusText}`);
    //         }

    //         const result = await response.json();
    //         console.log(`Chat saved successfully: ${result.filename}`);
    //     } catch (error) {
    //         console.error("Error in saveChat:", error);
    //     }
    // };
    // Ensure saveChat is defined in the file
    const saveChat = async (question: string, answer: string) => {
        try {
            if (!question || !answer) {
                console.warn("Missing question or answer. Skipping saveChat.");
                return;
            }

            const messages = [
                { content: question, role: "user" },
                { content: answer, role: "assistant" }
            ];

            const saveWithRetry = async (attempts: number = 3, delay: number = 1000): Promise<void> => {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);
                    // Use import.meta.env to access VITE_BACKEND_URI
                    const response = await fetch(`${import.meta.env.VITE_BACKEND_URI}/save-chat`, {
                        //const response = await fetch(`${process.env.BACKEND_URI}/save-chat`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ messages }),
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        throw new Error(`Failed to save chat: ${response.statusText}`);
                    }

                    const result = await response.json();
                    console.log(`Chat saved successfully: ${result.filename}`);
                    return result;
                } catch (error) {
                    if (attempts > 1) {
                        console.warn(`Retrying saveChat... (${4 - attempts} attempts left)`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        return saveWithRetry(attempts - 1, delay * 2);
                    }
                    throw error;
                }
            };

            const result = await saveWithRetry();
            console.log("Chat saved successfully!");
            return result;
        } catch (error) {
            console.error("Error in saveChat:", error);
            alert("Failed to save the chat. Please try again.");
        }
    };

    // Make saveChat accessible in the browser console
    if (typeof window !== "undefined") {
        (window as any).saveChat = saveChat; // Explicitly assign it to window
    }

    const handleAsyncRequest = async (question: string, answers: [string, ChatAppResponse][], responseBody: ReadableStream<any>) => {
        let answer: string = "";
        let askResponse: ChatAppResponse = {} as ChatAppResponse;

        // const updateState = (newContent: string) => {
        //     return new Promise((resolve) => {
        //         setTimeout(() => {
        //             answer += newContent;
        //             const latestResponse: ChatAppResponse = {
        //                 ...askResponse,
        //                 message: { content: answer, role: askResponse.message.role },
        //             };
        //             setStreamedAnswers([...answers, [question, latestResponse]]);
        //             resolve(null);
        //         }, 33);
        //     });
        // };

        // Updated to reduce unnecessary re-renders and provide smoother updates
        const updateState = (newContent: string) => {
            answer += newContent; // Append new content to the existing answer
            const latestResponse: ChatAppResponse = {
                ...askResponse,
                message: { content: answer, role: askResponse.message.role }
            };
            setStreamedAnswers(prev => [...prev.slice(0, -1), [question, latestResponse]]); // Efficiently update only the last item
        };

        try {
            setIsStreaming(true);
            for await (const event of readNDJSONStream(responseBody)) {
                if (event["context"] && event["context"]["data_points"]) {
                    event["message"] = event["delta"];
                    askResponse = event as ChatAppResponse;
                } else if (event["delta"]["content"]) {
                    setIsLoading(false);
                    await updateState(event["delta"]["content"]);
                } else if (event["context"]) {
                    askResponse.context = { ...askResponse.context, ...event["context"] };
                } else if (event["error"]) {
                    throw Error(event["error"]);
                }
            }
        } finally {
            setIsStreaming(false);
        }
        const fullResponse: ChatAppResponse = {
            ...askResponse,
            message: { content: answer, role: askResponse.message.role }
        };
        return fullResponse;
    };

    const clearChat = () => {
        lastQuestionRef.current = "";
        error && setError(undefined);
        setActiveCitation(undefined);
        setActiveAnalysisPanelTab(undefined);
        setAnswers([]);
        setStreamedAnswers([]);
        setIsLoading(false);
        setIsStreaming(false);
    };

    // useEffect(() => chatMessageStreamEnd.current?.scrollIntoView({ behavior: "smooth" }), [isLoading]);
    // useEffect(() => chatMessageStreamEnd.current?.scrollIntoView({ behavior: "auto" }), [streamedAnswers]);

    useEffect(() => {
        if (isStreaming || isLoading) {
            chatMessageStreamEnd.current?.scrollIntoView({ behavior: "smooth" });
        } else {
            // Ensure no interruptions if scrolling is manually controlled
            chatMessageStreamEnd.current?.scrollIntoView({ behavior: "auto" });
        }
    }, [isStreaming, isLoading, streamedAnswers]);

    useEffect(() => {
        getConfig();
    }, []);

    useEffect(() => {
        if (answers && showSpeechOutputAzure) {
            // For each answer that is missing a speech URL, fetch the speech URL
            for (let i = 0; i < answers.length; i++) {
                if (!speechUrls[i]) {
                    getSpeechApi(answers[i][1].message.content).then(speechUrl => {
                        setSpeechUrls([...speechUrls.slice(0, i), speechUrl, ...speechUrls.slice(i + 1)]);
                    });
                }
            }
        }
    }, [answers]);

    const onPromptTemplateChange = (_ev?: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
        setPromptTemplate(newValue || "");
    };

    const onTemperatureChange = (_ev?: React.SyntheticEvent<HTMLElement, Event>, newValue?: string) => {
        setTemperature(parseFloat(newValue || "0"));
    };

    const onMinimumSearchScoreChange = (_ev?: React.SyntheticEvent<HTMLElement, Event>, newValue?: string) => {
        setMinimumSearchScore(parseFloat(newValue || "0"));
    };

    const onMinimumRerankerScoreChange = (_ev?: React.SyntheticEvent<HTMLElement, Event>, newValue?: string) => {
        setMinimumRerankerScore(parseFloat(newValue || "0"));
    };

    const onRetrieveCountChange = (_ev?: React.SyntheticEvent<HTMLElement, Event>, newValue?: string) => {
        setRetrieveCount(parseInt(newValue || "3"));
    };

    const onUseSemanticRankerChange = (_ev?: React.FormEvent<HTMLElement | HTMLInputElement>, checked?: boolean) => {
        setUseSemanticRanker(!!checked);
    };

    const onUseSemanticCaptionsChange = (_ev?: React.FormEvent<HTMLElement | HTMLInputElement>, checked?: boolean) => {
        setUseSemanticCaptions(!!checked);
    };

    const onShouldStreamChange = (_ev?: React.FormEvent<HTMLElement | HTMLInputElement>, checked?: boolean) => {
        setShouldStream(!!checked);
    };

    const onExcludeCategoryChanged = (_ev?: React.FormEvent, newValue?: string) => {
        setExcludeCategory(newValue || "");
    };

    const onUseSuggestFollowupQuestionsChange = (_ev?: React.FormEvent<HTMLElement | HTMLInputElement>, checked?: boolean) => {
        setUseSuggestFollowupQuestions(!!checked);
    };

    const onUseOidSecurityFilterChange = (_ev?: React.FormEvent<HTMLElement | HTMLInputElement>, checked?: boolean) => {
        setUseOidSecurityFilter(!!checked);
    };

    const onUseGroupsSecurityFilterChange = (_ev?: React.FormEvent<HTMLElement | HTMLInputElement>, checked?: boolean) => {
        setUseGroupsSecurityFilter(!!checked);
    };

    const onExampleClicked = (example: string) => {
        makeApiRequest(example);
    };

    const onShowCitation = (citation: string, index: number) => {
        if (activeCitation === citation && activeAnalysisPanelTab === AnalysisPanelTabs.CitationTab && selectedAnswer === index) {
            setActiveAnalysisPanelTab(undefined);
        } else {
            setActiveCitation(citation);
            setActiveAnalysisPanelTab(AnalysisPanelTabs.CitationTab);
        }

        setSelectedAnswer(index);
    };

    const onToggleTab = (tab: AnalysisPanelTabs, index: number) => {
        if (activeAnalysisPanelTab === tab && selectedAnswer === index) {
            setActiveAnalysisPanelTab(undefined);
        } else {
            setActiveAnalysisPanelTab(tab);
        }

        setSelectedAnswer(index);
    };

    // IDs for form labels and their associated callouts
    const promptTemplateId = useId("promptTemplate");
    const promptTemplateFieldId = useId("promptTemplateField");
    const temperatureId = useId("temperature");
    const temperatureFieldId = useId("temperatureField");
    const searchScoreId = useId("searchScore");
    const searchScoreFieldId = useId("searchScoreField");
    const rerankerScoreId = useId("rerankerScore");
    const rerankerScoreFieldId = useId("rerankerScoreField");
    const retrieveCountId = useId("retrieveCount");
    const retrieveCountFieldId = useId("retrieveCountField");
    const excludeCategoryId = useId("excludeCategory");
    const excludeCategoryFieldId = useId("excludeCategoryField");
    const semanticRankerId = useId("semanticRanker");
    const semanticRankerFieldId = useId("semanticRankerField");
    const semanticCaptionsId = useId("semanticCaptions");
    const semanticCaptionsFieldId = useId("semanticCaptionsField");
    const suggestFollowupQuestionsId = useId("suggestFollowupQuestions");
    const suggestFollowupQuestionsFieldId = useId("suggestFollowupQuestionsField");
    const useOidSecurityFilterId = useId("useOidSecurityFilter");
    const useOidSecurityFilterFieldId = useId("useOidSecurityFilterField");
    const useGroupsSecurityFilterId = useId("useGroupsSecurityFilter");
    const useGroupsSecurityFilterFieldId = useId("useGroupsSecurityFilterField");
    const shouldStreamId = useId("shouldStream");
    const shouldStreamFieldId = useId("shouldStreamField");

    return (
        <div className={styles.container}>
            <div className={styles.commandsContainer}>
                <ClearChatButton className={styles.commandButton} onClick={clearChat} disabled={!lastQuestionRef.current || isLoading} />
                {showUserUpload && <UploadFile className={styles.commandButton} disabled={!loggedIn} />}
                {/*<SettingsButton className={styles.commandButton} onClick={() => setIsConfigPanelOpen(!isConfigPanelOpen)} />*/}
            </div>
            <div className={styles.chatRoot}>
                <div className={styles.chatContainer}>
                    {!lastQuestionRef.current ? (
                        <div className={styles.chatEmptyState}>
                            {/* <SparkleFilled fontSize={"120px"} primaryFill={"rgba(115, 118, 225, 1)"} aria-hidden="true" aria-label="Chat logo" />*/}
                            {/* <div className={styles.logoRow}>
                                <img src={thaliaIcon} alt="Thalia Logo" className={styles.logoImage} />
                                <img src={euIcon} alt="EU Cofounded Logo" className={styles.logoImage} />
                            </div> */}
                            {/* <div className={styles.disclaimer}>
                                <b>Disclaimer:</b> Funded by the European Union. However, the views and opinions expressed are those of the author(s) only and do not reflect
                                those of the European Union or HaDEA. Neither the European Union nor the granting authority can be held responsible for them.
                            </div> */}
                            <h1 className={styles.chatEmptyStateTitle}>Let's Talk About Thalassaemia</h1>
                            <h2 className={styles.chatEmptyStateSubtitle}>Ask your question or try an example below</h2>
                            <ExampleList onExampleClicked={onExampleClicked} useGPT4V={useGPT4V} />
                        </div>
                    ) : (
                        <div className={styles.chatMessageStream}>
                            {isStreaming &&
                                streamedAnswers.map((streamedAnswer, index) => (
                                    <div key={index}>
                                        <UserChatMessage message={streamedAnswer[0]} />
                                        <div className={styles.chatMessageGpt}>
                                            <Answer
                                                isStreaming={true}
                                                key={index}
                                                answer={streamedAnswer[1]}
                                                isSelected={false}
                                                onCitationClicked={c => onShowCitation(c, index)}
                                                onThoughtProcessClicked={() => onToggleTab(AnalysisPanelTabs.ThoughtProcessTab, index)}
                                                onSupportingContentClicked={() => onToggleTab(AnalysisPanelTabs.SupportingContentTab, index)}
                                                onFollowupQuestionClicked={q => makeApiRequest(q)}
                                                showFollowupQuestions={useSuggestFollowupQuestions && answers.length - 1 === index}
                                                showSpeechOutputAzure={showSpeechOutputAzure}
                                                showSpeechOutputBrowser={showSpeechOutputBrowser}
                                                speechUrl={speechUrls[index]}
                                            />
                                        </div>
                                    </div>
                                ))}
                            {!isStreaming &&
                                answers.map((answer, index) => (
                                    <div key={index}>
                                        <UserChatMessage message={answer[0]} />
                                        <div className={styles.chatMessageGpt}>
                                            <Answer
                                                isStreaming={false}
                                                key={index}
                                                answer={answer[1]}
                                                isSelected={selectedAnswer === index && activeAnalysisPanelTab !== undefined}
                                                onCitationClicked={c => onShowCitation(c, index)}
                                                onThoughtProcessClicked={() => onToggleTab(AnalysisPanelTabs.ThoughtProcessTab, index)}
                                                onSupportingContentClicked={() => onToggleTab(AnalysisPanelTabs.SupportingContentTab, index)}
                                                onFollowupQuestionClicked={q => makeApiRequest(q)}
                                                showFollowupQuestions={useSuggestFollowupQuestions && answers.length - 1 === index}
                                                showSpeechOutputAzure={showSpeechOutputAzure}
                                                showSpeechOutputBrowser={showSpeechOutputBrowser}
                                                speechUrl={speechUrls[index]}
                                            />
                                        </div>
                                    </div>
                                ))}
                            {isLoading && (
                                <>
                                    <UserChatMessage message={lastQuestionRef.current} />
                                    <div className={styles.chatMessageGptMinWidth}>
                                        <AnswerLoading />
                                    </div>
                                </>
                            )}
                            {error ? (
                                <>
                                    <UserChatMessage message={lastQuestionRef.current} />
                                    <div className={styles.chatMessageGptMinWidth}>
                                        <AnswerError error={error.toString()} onRetry={() => makeApiRequest(lastQuestionRef.current)} />
                                    </div>
                                </>
                            ) : null}
                            <div ref={chatMessageStreamEnd} />
                        </div>
                    )}

                    <div className={styles.chatInput}>
                        <QuestionInput
                            clearOnSend
                            placeholder="Type a new question (e.g. What are the types of thalassaemia?)"
                            disabled={isLoading}
                            onSend={question => makeApiRequest(question)}
                            showSpeechInput={showSpeechInput}
                        />
                    </div>

                    {/* Disclaimer directly under the prompt input */}
                    <div style={{ fontSize: "12px", color: "grey" }}>Knowledge bot can make mistakes. Please verify important information.</div>

                    {/* Combined Logos and Disclaimers */}
                    {!lastQuestionRef.current && (
                        <>
                            {/* Logos */}
                            <div className={styles.logoRow}>
                                <img src={thaliaIcon} alt="Thalia Logo" className={styles.logoImage} />
                                <img src={euIcon} alt="EU Cofounded Logo" className={styles.logoImage} />
                            </div>

                            {/* Disclaimers */}
                            <div className={styles.disclaimerContainer}>
                                <div className={styles.disclaimer}>
                                    <b>Disclaimer:</b> Funded by the European Union. However, the views and opinions expressed are those of the author(s) only
                                    and do not reflect those of the European Union or HaDEA. Neither the European Union nor the granting authority can be held
                                    responsible for them.
                                </div>
                                <div className={styles.disclaimer}>
                                    <b>
                                        This information has been obtained from TIF International Guidelines, which were developed by renowned international
                                        experts in the field of haemoglobinopathies. Please visit our{" "}
                                        <a
                                            href="https://thalassaemia.org.cy/haemoglobin-disorders/clinical-trial-updates/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            website
                                        </a>{" "}
                                        for bi-monthly updates on new advances and clinical trials.
                                    </b>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {answers.length > 0 && activeAnalysisPanelTab && (
                <AnalysisPanel
                    className={styles.chatAnalysisPanel}
                    activeCitation={activeCitation}
                    onActiveTabChanged={x => onToggleTab(x, selectedAnswer)}
                    citationHeight="810px"
                    answer={answers[selectedAnswer][1]}
                    activeTab={activeAnalysisPanelTab}
                />
            )}

            <Panel
                headerText="Configure answer generation"
                isOpen={isConfigPanelOpen}
                isBlocking={false}
                onDismiss={() => setIsConfigPanelOpen(false)}
                closeButtonAriaLabel="Close"
                onRenderFooterContent={() => <DefaultButton onClick={() => setIsConfigPanelOpen(false)}>Close</DefaultButton>}
                isFooterAtBottom={true}
            >
                <TextField
                    id={promptTemplateFieldId}
                    className={styles.chatSettingsSeparator}
                    defaultValue={promptTemplate}
                    label="Override prompt template"
                    multiline
                    autoAdjustHeight
                    onChange={onPromptTemplateChange}
                    aria-labelledby={promptTemplateId}
                    onRenderLabel={(props: ITextFieldProps | undefined) => (
                        <HelpCallout labelId={promptTemplateId} fieldId={promptTemplateFieldId} helpText={toolTipText.promptTemplate} label={props?.label} />
                    )}
                />

                <TextField
                    id={temperatureFieldId}
                    className={styles.chatSettingsSeparator}
                    label="Temperature"
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    defaultValue={temperature.toString()}
                    onChange={onTemperatureChange}
                    aria-labelledby={temperatureId}
                    onRenderLabel={(props: ITextFieldProps | undefined) => (
                        <HelpCallout labelId={temperatureId} fieldId={temperatureFieldId} helpText={toolTipText.temperature} label={props?.label} />
                    )}
                />

                <TextField
                    id={searchScoreFieldId}
                    className={styles.chatSettingsSeparator}
                    label="Minimum search score"
                    type="number"
                    min={0}
                    step={0.01}
                    defaultValue={minimumSearchScore.toString()}
                    onChange={onMinimumSearchScoreChange}
                    aria-labelledby={searchScoreId}
                    onRenderLabel={(props: ITextFieldProps | undefined) => (
                        <HelpCallout labelId={searchScoreId} fieldId={searchScoreFieldId} helpText={toolTipText.searchScore} label={props?.label} />
                    )}
                />

                {showSemanticRankerOption && (
                    <TextField
                        id={rerankerScoreFieldId}
                        className={styles.chatSettingsSeparator}
                        label="Minimum reranker score"
                        type="number"
                        min={1}
                        max={4}
                        step={0.1}
                        defaultValue={minimumRerankerScore.toString()}
                        onChange={onMinimumRerankerScoreChange}
                        aria-labelledby={rerankerScoreId}
                        onRenderLabel={(props: ITextFieldProps | undefined) => (
                            <HelpCallout labelId={rerankerScoreId} fieldId={rerankerScoreFieldId} helpText={toolTipText.rerankerScore} label={props?.label} />
                        )}
                    />
                )}

                <TextField
                    id={retrieveCountFieldId}
                    className={styles.chatSettingsSeparator}
                    label="Retrieve this many search results:"
                    type="number"
                    min={1}
                    max={50}
                    defaultValue={retrieveCount.toString()}
                    onChange={onRetrieveCountChange}
                    aria-labelledby={retrieveCountId}
                    onRenderLabel={(props: ITextFieldProps | undefined) => (
                        <HelpCallout labelId={retrieveCountId} fieldId={retrieveCountFieldId} helpText={toolTipText.retrieveNumber} label={props?.label} />
                    )}
                />

                <TextField
                    id={excludeCategoryFieldId}
                    className={styles.chatSettingsSeparator}
                    label="Exclude category"
                    defaultValue={excludeCategory}
                    onChange={onExcludeCategoryChanged}
                    aria-labelledby={excludeCategoryId}
                    onRenderLabel={(props: ITextFieldProps | undefined) => (
                        <HelpCallout labelId={excludeCategoryId} fieldId={excludeCategoryFieldId} helpText={toolTipText.excludeCategory} label={props?.label} />
                    )}
                />

                {showSemanticRankerOption && (
                    <>
                        <Checkbox
                            id={semanticRankerFieldId}
                            className={styles.chatSettingsSeparator}
                            checked={useSemanticRanker}
                            label="Use semantic ranker for retrieval"
                            onChange={onUseSemanticRankerChange}
                            aria-labelledby={semanticRankerId}
                            onRenderLabel={(props: ICheckboxProps | undefined) => (
                                <HelpCallout
                                    labelId={semanticRankerId}
                                    fieldId={semanticRankerFieldId}
                                    helpText={toolTipText.useSemanticReranker}
                                    label={props?.label}
                                />
                            )}
                        />

                        <Checkbox
                            id={semanticCaptionsFieldId}
                            className={styles.chatSettingsSeparator}
                            checked={useSemanticCaptions}
                            label="Use semantic captions"
                            onChange={onUseSemanticCaptionsChange}
                            disabled={!useSemanticRanker}
                            aria-labelledby={semanticCaptionsId}
                            onRenderLabel={(props: ICheckboxProps | undefined) => (
                                <HelpCallout
                                    labelId={semanticCaptionsId}
                                    fieldId={semanticCaptionsFieldId}
                                    helpText={toolTipText.useSemanticCaptions}
                                    label={props?.label}
                                />
                            )}
                        />
                    </>
                )}

                <Checkbox
                    id={suggestFollowupQuestionsFieldId}
                    className={styles.chatSettingsSeparator}
                    checked={useSuggestFollowupQuestions}
                    label="Suggest follow-up questions"
                    onChange={onUseSuggestFollowupQuestionsChange}
                    aria-labelledby={suggestFollowupQuestionsId}
                    onRenderLabel={(props: ICheckboxProps | undefined) => (
                        <HelpCallout
                            labelId={suggestFollowupQuestionsId}
                            fieldId={suggestFollowupQuestionsFieldId}
                            helpText={toolTipText.suggestFollowupQuestions}
                            label={props?.label}
                        />
                    )}
                />

                {showGPT4VOptions && (
                    <GPT4VSettings
                        gpt4vInputs={gpt4vInput}
                        isUseGPT4V={useGPT4V}
                        updateUseGPT4V={useGPT4V => {
                            setUseGPT4V(useGPT4V);
                        }}
                        updateGPT4VInputs={inputs => setGPT4VInput(inputs)}
                    />
                )}

                {showVectorOption && (
                    <VectorSettings
                        defaultRetrievalMode={retrievalMode}
                        showImageOptions={useGPT4V && showGPT4VOptions}
                        updateVectorFields={(options: VectorFieldOptions[]) => setVectorFieldList(options)}
                        updateRetrievalMode={(retrievalMode: RetrievalMode) => setRetrievalMode(retrievalMode)}
                    />
                )}

                {useLogin && (
                    <>
                        <Checkbox
                            id={useOidSecurityFilterFieldId}
                            className={styles.chatSettingsSeparator}
                            checked={useOidSecurityFilter || requireAccessControl}
                            label="Use oid security filter"
                            disabled={!loggedIn || requireAccessControl}
                            onChange={onUseOidSecurityFilterChange}
                            aria-labelledby={useOidSecurityFilterId}
                            onRenderLabel={(props: ICheckboxProps | undefined) => (
                                <HelpCallout
                                    labelId={useOidSecurityFilterId}
                                    fieldId={useOidSecurityFilterFieldId}
                                    helpText={toolTipText.useOidSecurityFilter}
                                    label={props?.label}
                                />
                            )}
                        />
                        <Checkbox
                            id={useGroupsSecurityFilterFieldId}
                            className={styles.chatSettingsSeparator}
                            checked={useGroupsSecurityFilter || requireAccessControl}
                            label="Use groups security filter"
                            disabled={!loggedIn || requireAccessControl}
                            onChange={onUseGroupsSecurityFilterChange}
                            aria-labelledby={useGroupsSecurityFilterId}
                            onRenderLabel={(props: ICheckboxProps | undefined) => (
                                <HelpCallout
                                    labelId={useGroupsSecurityFilterId}
                                    fieldId={useGroupsSecurityFilterFieldId}
                                    helpText={toolTipText.useGroupsSecurityFilter}
                                    label={props?.label}
                                />
                            )}
                        />
                    </>
                )}

                <Checkbox
                    id={shouldStreamFieldId}
                    className={styles.chatSettingsSeparator}
                    checked={shouldStream}
                    label="Stream chat completion responses"
                    onChange={onShouldStreamChange}
                    aria-labelledby={shouldStreamId}
                    onRenderLabel={(props: ICheckboxProps | undefined) => (
                        <HelpCallout labelId={shouldStreamId} fieldId={shouldStreamFieldId} helpText={toolTipText.streamChat} label={props?.label} />
                    )}
                />

                {useLogin && <TokenClaimsDisplay />}
            </Panel>
        </div>
    );
};

export default Chat;
function generateChatId(): string | null {
    throw new Error("Function not implemented.");
}
