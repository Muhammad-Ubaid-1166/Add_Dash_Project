# graphs/copy_graph.py
from typing import AsyncGenerator
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from pydantic import BaseModel
from app.schemas import CopyState
from app.config import settings


# ─── Structured output schema for LLM ────────────────────────────────────────

class CopyOutput(BaseModel):
    headline: str
    body: str
    cta: str


# ─── LLM Node ─────────────────────────────────────────────────────────────────

async def generate_copy_node(state: CopyState) -> dict:
    """LangGraph node: calls LLM to generate ad copy"""
    llm = ChatOpenAI(
        model=settings.MODEL_NAME,
        api_key=settings.OPENAI_API_KEY,
    )

    structured_llm = llm.with_structured_output(CopyOutput)

    prompt = f"""You are an expert advertising copywriter.

Generate compelling advertising copy for the following:

Product/Service: {state.product}
Tone: {state.tone}
Platform: {state.platform}
Word limit for body: {state.word_limit} words maximum

Requirements:
- headline: Short, punchy, attention-grabbing (max 10 words)
- body: Main copy within the word limit, platform-appropriate
- cta: Clear call to action (max 6 words)

Platform context:
- instagram: Visual, emoji-friendly, lifestyle-focused
- facebook: Conversational, community-focused
- twitter: Concise, punchy, trending-aware  
- linkedin: Professional, value-driven
- google_ads: Direct, keyword-rich, benefit-focused
"""

    result: CopyOutput = await structured_llm.ainvoke([HumanMessage(content=prompt)])

    # Return ONLY the fields that changed — LangGraph merges this into state automatically.
    # Previously this was:
    #   return CopyState(**state.model_dump(), headline=..., body=..., cta=...)
    # which would cause the same "multiple values" TypeError as social_graph.
    return {
        "headline": result.headline,
        "body": result.body,
        "cta": result.cta,
    }


# ─── Build Graph ──────────────────────────────────────────────────────────────

def build_copy_graph():
    graph = StateGraph(CopyState)
    graph.add_node("generate", generate_copy_node)
    graph.set_entry_point("generate")
    graph.add_edge("generate", END)
    return graph.compile()


copy_graph = build_copy_graph()


# ─── Streaming Generator (SSE) ────────────────────────────────────────────────

async def stream_copy(state: CopyState) -> AsyncGenerator[str, None]:
    """
    Streams the copy generation token by token using the LLM's streaming API.
    Yields SSE-formatted strings.
    """
    llm = ChatOpenAI(
        model=settings.MODEL_NAME,
        api_key=settings.OPENAI_API_KEY,
        streaming=True,
    )

    prompt = f"""You are an expert advertising copywriter.

Generate advertising copy in this EXACT format (use these exact labels):

HEADLINE: [short punchy headline, max 10 words]
BODY: [main copy, max {state.word_limit} words, {state.tone} tone for {state.platform}]
CTA: [call to action, max 6 words]

Product/Service: {state.product}
Tone: {state.tone}
Platform: {state.platform}
"""

    yield "data: {\"status\": \"started\"}\n\n"

    async for chunk in llm.astream([HumanMessage(content=prompt)]):
        token = chunk.content
        if token:
            # Escape for SSE JSON
            token_escaped = token.replace('"', '\\"').replace('\n', '\\n')
            yield f"data: {{\"token\": \"{token_escaped}\"}}\n\n"

    yield "data: {\"status\": \"done\"}\n\n"
