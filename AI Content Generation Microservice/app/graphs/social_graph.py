# graphs/social_graph.py
from typing import List
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from pydantic import BaseModel
from app.schemas import SocialState
from app.config import settings


# ─── Structured output schema ─────────────────────────────────────────────────

class SocialOutput(BaseModel):
    captions: List[str]


# ─── LLM Node ─────────────────────────────────────────────────────────────────

async def generate_social_node(state: SocialState) -> dict:
    llm = ChatOpenAI(
        model=settings.MODEL_NAME,
        api_key=settings.OPENAI_API_KEY,
    )

    structured_llm = llm.with_structured_output(SocialOutput)

    prompt = f"""You are a social media marketing expert.

Generate exactly 5 different caption options for a social media post.

Platform: {state.platform}
Campaign Goal: {state.campaign_goal}
Brand Voice: {state.brand_voice}

Requirements:
- Each caption must be unique in approach (e.g., question, story, stat, humor, inspiration)
- Platform-appropriate length and style
- Include relevant emojis where suitable
- Each caption should stand alone as a complete post
- instagram/facebook: Can be longer with emojis
- twitter: Under 280 characters
- linkedin: Professional, no excessive emojis

Return exactly 5 captions in the captions list.
"""

    result: SocialOutput = await structured_llm.ainvoke([HumanMessage(content=prompt)])

    # Return ONLY the fields that changed — LangGraph merges this into state automatically.
    # Previously this was:
    #   return SocialState(**state.model_dump(), captions=result.captions[:5])
    # which caused: TypeError: got multiple values for keyword argument 'captions'
    # because model_dump() already includes 'captions' (as None), and then
    # 'captions=result.captions[:5]' was passed again explicitly.
    return {"captions": result.captions[:5]}


# ─── Build Graph ──────────────────────────────────────────────────────────────

def build_social_graph():
    graph = StateGraph(SocialState)
    graph.add_node("generate", generate_social_node)
    graph.set_entry_point("generate")
    graph.add_edge("generate", END)
    return graph.compile()


social_graph = build_social_graph()
