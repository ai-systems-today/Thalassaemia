from typing import Any, Coroutine, List, Literal, Optional, Union, overload

from azure.search.documents.aio import SearchClient
from azure.search.documents.models import VectorQuery
from openai import AsyncOpenAI, AsyncStream
from openai.types.chat import (
    ChatCompletion,
    ChatCompletionChunk,
    ChatCompletionMessageParam,
    ChatCompletionToolParam,
)
from openai_messages_token_helper import build_messages, get_token_limit

from approaches.approach import ThoughtStep
from approaches.chatapproach import ChatApproach
from core.authentication import AuthenticationHelper

from approaches.approach import Approach


class ChatReadRetrieveReadApproach(ChatApproach):
    """
    A multi-step approach that first uses OpenAI to turn the user's question into a search query,
    then uses Azure AI Search to retrieve relevant documents, and then sends the conversation history,
    original user question, and search results to OpenAI to generate a response.
    """

    def __init__(
        self,
        *,
        search_client: SearchClient,
        auth_helper: AuthenticationHelper,
        openai_client: AsyncOpenAI,
        chatgpt_model: str,
        chatgpt_deployment: Optional[str],  # Not needed for non-Azure OpenAI
        embedding_deployment: Optional[str],  # Not needed for non-Azure OpenAI or for retrieval_mode="text"
        embedding_model: str,
        embedding_dimensions: int,
        sourcepage_field: str,
        content_field: str,
        query_language: str,
        query_speller: str,
    ):
        self.search_client = search_client
        self.openai_client = openai_client
        self.auth_helper = auth_helper
        self.chatgpt_model = chatgpt_model
        self.chatgpt_deployment = chatgpt_deployment
        self.embedding_deployment = embedding_deployment
        self.embedding_model = embedding_model
        self.embedding_dimensions = embedding_dimensions
        self.sourcepage_field = sourcepage_field
        self.content_field = content_field
        self.query_language = query_language
        self.query_speller = query_speller
        self.chatgpt_token_limit = get_token_limit(chatgpt_model)

    def get_few_shots(self, user_type: str) -> List[dict]:
        """
        Returns few-shot examples based on the detected user type.

        Args:
            user_type (str): The detected user type.

        Returns:
            List[dict]: Few-shot examples for the user type.
        """
        few_shots = {
            "patient": [
                {"role": "user", "content": "What is the best treatment for thalassaemia?"},
                {"role": "assistant", "content": "Treatment depends on the type and severity. Common options include transfusions and chelation therapy."},
            ],
            "healthcare professional": [
                {"role": "user", "content": "What are the latest guidelines for thalassaemia treatment?"},
                {"role": "assistant", "content": "Refer to the TDT 4th edition for the latest protocols on transfusion and chelation therapy."},
            ],
            "community": [
                {"role": "user", "content": "How can we raise awareness about thalassaemia?"},
                {"role": "assistant", "content": "Organize campaigns, promote genetic testing, and educate through local health initiatives."},
            ],
            "pharma": [
                {"role": "user", "content": "What are the recent advancements in drug development for thalassaemia?"},
                {"role": "assistant", "content": "Research on gene therapy and luspatercept shows promising results for reducing transfusion dependence."},
            ],
            "general": [],
        }
        return few_shots.get(user_type, [])
    

    # @property
    # def system_message_chat_conversation(self):
    #     return """Assistant helps individuals with thalassaemia, their families, carers, and medical professionals with their 
    #     questions about thalassaemia. Be brief in your answers. Answer ONLY with the facts listed in the list of sources below. 
    #     If there isn't enough information below, say you don't know. Do not generate answers that don't use the sources below. 
    #     If asking a clarifying question to the user would help, ask the question. For tabular information return it as an html 
    #     table. Do not return markdown format. If the question is not in English, answer in the language used in the question. 
    #     Each source has a name followed by colon and the actual information, always include the source name for each fact you 
    #     use in the response. Use square brackets to reference the source, for example [info1.txt]. Don't combine sources, 
    #     list each source separately, for example [info1.txt][info2.pdf]. For answers return the format in HTML. 
    #     {follow_up_questions_prompt} 
    #     {injected_prompt}
    #     """
    # @property
    # def system_message_chat_conversation(self):
    #     return (
    #         "Assistant helps individuals with thalassaemia, their families, carers, and medical professionals with their "
    #         "questions about thalassaemia. Be brief in your answers. Answer ONLY with the facts listed in the list of sources below. "
    #         "If there isn't enough information below, say you don't know. Do not generate answers that don't use the sources below. "
    #         "If asking a clarifying question to the user would help, ask the question. For tabular information return it as an html "
    #         "table. Do not return markdown format. If the question is not in English, answer in the language used in the question. "
    #         "Each source has a name followed by colon and the actual information, always include the source name for each fact you "
    #         "use in the response. Use square brackets to reference the source, for example [info1.txt]. Don't combine sources, "
    #         "list each source separately, for example [info1.txt][info2.pdf]. For answers return the format in HTML. "
    #         "{follow_up_questions_prompt} "
    #         "{injected_prompt}"
    #     )
    
    @property
    def system_message_chat_conversation(self):
        return (
            "Assistant helps individuals with thalassaemia, their families, carers, and medical professionals with their "
            "questions about thalassaemia. Be brief but as complete as possible in your answers, covering all aspects of the user's question using only the facts listed in the list of sources below. "
            "If there isn't enough information below, say you don't know and provide the contact email 'info@thalassaemia.org.cy' for further assistance. "
            "If the question is unclear or ambiguous, politely ask the user for clarification before providing an answer. "
            "Answer in the language used in the user's question without switching languages unless explicitly requested. "
            "Format all responses in complete and valid HTML. Use appropriate semantic tags, such as <h1>, <h2>, <p>, <ul>, <li>, <a>, etc., to improve readability and accessibility. "
            "For tabular data, include <table>, <thead>, <tbody>, and <th> elements to organize content. Add column and row headers where necessary for clarity. "
            "Always include the source name for each fact you use in the response. Where possible, provide clickable links to the sources using the <a href='...'> tag. "
            "When responding to sensitive questions, use empathetic language and suggest additional resources if necessary. "
            "If the question falls outside your expertise or available data, politely explain the limitation and suggest alternative resources or contacts for further assistance. "
            "Tailor your answers to the user's role (e.g., patient, healthcare professional, community member, or pharma representative) when relevant. "
            "Each source has a name followed by colon and the actual information, always include the source name for each fact you "
            "use in the response. Use square brackets to reference the source, for example [info1.txt]. Don't combine sources, "
            "list each source separately, for example [info1.txt][info2.pdf]. For answers return the format in HTML. "
            "{follow_up_questions_prompt} "
            "{injected_prompt}"
        )


    @overload
    async def run_until_final_call(
        self,
        messages: list[ChatCompletionMessageParam],
        overrides: dict[str, Any],
        auth_claims: dict[str, Any],
        should_stream: Literal[False],
    ) -> tuple[dict[str, Any], Coroutine[Any, Any, ChatCompletion]]: ...

    @overload
    async def run_until_final_call(
        self,
        messages: list[ChatCompletionMessageParam],
        overrides: dict[str, Any],
        auth_claims: dict[str, Any],
        should_stream: Literal[True],
    ) -> tuple[dict[str, Any], Coroutine[Any, Any, AsyncStream[ChatCompletionChunk]]]: ...

    async def run_until_final_call(
        self,
        messages: list[ChatCompletionMessageParam],
        overrides: dict[str, Any],
        auth_claims: dict[str, Any],
        should_stream: bool = False,
    ) -> tuple[dict[str, Any], Coroutine[Any, Any, Union[ChatCompletion, AsyncStream[ChatCompletionChunk]]]]:
        use_text_search = overrides.get("retrieval_mode") in ["text", "hybrid", None]
        use_vector_search = overrides.get("retrieval_mode") in ["vectors", "hybrid", None]
        use_semantic_ranker = True if overrides.get("semantic_ranker") else False
        use_semantic_captions = True if overrides.get("semantic_captions") else False
        top = overrides.get("top", 3)
        minimum_search_score = overrides.get("minimum_search_score", 0.0)
        minimum_reranker_score = overrides.get("minimum_reranker_score", 0.0)
        filter = self.build_filter(overrides, auth_claims)

        original_user_query = messages[-1]["content"]
        if not isinstance(original_user_query, str):
            raise ValueError("The most recent message content must be a string.")
        user_query_request = "Generate search query for: " + original_user_query

        tools: List[ChatCompletionToolParam] = [
            {
                "type": "function",
                "function": {
                    "name": "search_sources",
                    "description": "Retrieve sources from the Azure AI Search index",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "search_query": {
                                "type": "string",
                                "description": "Query string to retrieve documents from azure search eg: 'Health care plan'",
                            }
                        },
                        "required": ["search_query"],
                    },
                },
            }
        ]
                
        # STEP 1: Detect user type and customize behavior
        # Detect user type from the question
        user_question = messages[-1]["content"]
        user_type = Approach.detect_user_type(user_question)

        # Get few-shots based on user type
        few_shots = self.get_few_shots(user_type)

        # Customize the system prompt
        system_message = self.get_system_prompt(
            overrides.get("prompt_template"),
            f"Respond as if the user is a {user_type}.",
        )

        # STEP 1: Generate an optimized keyword search query based on the chat history and the last question
        query_response_token_limit = 100

        # Pass user-type-specific few-shots
        query_messages = build_messages(
            model=self.chatgpt_model,
            system_prompt=self.query_prompt_template,
            tools=tools,
            few_shots=few_shots, #self.query_prompt_few_shots
            past_messages=messages[:-1],
            new_user_content=user_query_request,
            max_tokens=self.chatgpt_token_limit - query_response_token_limit,
        )

        chat_completion: ChatCompletion = await self.openai_client.chat.completions.create(
            messages=query_messages,  # type: ignore
            # Azure OpenAI takes the deployment name as the model name
            model=self.chatgpt_deployment if self.chatgpt_deployment else self.chatgpt_model,
            temperature=0.0,  # Minimize creativity for search query generation
            max_tokens=query_response_token_limit,  # Setting too low risks malformed JSON, setting too high may affect performance
            n=1,
            tools=tools,
        )

        query_text = self.get_search_query(chat_completion, original_user_query)

        # STEP 2: Retrieve relevant documents from the search index with the GPT optimized query

        # If retrieval mode includes vectors, compute an embedding for the query
        vectors: list[VectorQuery] = []
        if use_vector_search:
            vectors.append(await self.compute_text_embedding(query_text))

        results = await self.search(
            top,
            query_text,
            filter,
            vectors,
            use_text_search,
            use_vector_search,
            use_semantic_ranker,
            use_semantic_captions,
            minimum_search_score,
            minimum_reranker_score,
        )

        sources_content = self.get_sources_content(results, use_semantic_captions, use_image_citation=False)
        content = "\n".join(sources_content)

        # STEP 3: Generate a contextual and content specific answer using the search results and chat history

        # Allow client to replace the entire prompt, or to inject into the exiting prompt using >>>
        system_message = self.get_system_prompt(
            overrides.get("prompt_template"),
            self.follow_up_questions_prompt_content if overrides.get("suggest_followup_questions") else "",
        )

        response_token_limit = 2048
        messages = build_messages(
            model=self.chatgpt_model,
            system_prompt=system_message,
            past_messages=messages[:-1],
            # Model does not handle lengthy system messages well. Moving sources to latest user conversation to solve follow up questions prompt.
            new_user_content=original_user_query + "\n\nSources:\n" + content,
            max_tokens=self.chatgpt_token_limit - response_token_limit,
        )

        data_points = {"text": sources_content}

        extra_info = {
            "data_points": data_points,
            "thoughts": [
                ThoughtStep(
                    "Prompt to generate search query",
                    [str(message) for message in query_messages],
                    (
                        {"model": self.chatgpt_model, "deployment": self.chatgpt_deployment}
                        if self.chatgpt_deployment
                        else {"model": self.chatgpt_model}
                    ),
                ),
                ThoughtStep(
                    "Search using generated search query",
                    query_text,
                    {
                        "use_semantic_captions": use_semantic_captions,
                        "use_semantic_ranker": use_semantic_ranker,
                        "top": top,
                        "filter": filter,
                        "use_vector_search": use_vector_search,
                        "use_text_search": use_text_search,
                    },
                ),
                ThoughtStep(
                    "Search results",
                    [result.serialize_for_results() for result in results],
                ),
                ThoughtStep(
                    "Prompt to generate answer",
                    [str(message) for message in messages],
                    (
                        {"model": self.chatgpt_model, "deployment": self.chatgpt_deployment}
                        if self.chatgpt_deployment
                        else {"model": self.chatgpt_model}
                    ),
                ),
            ],
        }

        chat_coroutine = self.openai_client.chat.completions.create(
            # Azure OpenAI takes the deployment name as the model name
            model=self.chatgpt_deployment if self.chatgpt_deployment else self.chatgpt_model,
            messages=messages,
            temperature=overrides.get("temperature", 0.3),
            max_tokens=response_token_limit,
            n=1,
            stream=should_stream,
        )
        return (extra_info, chat_coroutine)
