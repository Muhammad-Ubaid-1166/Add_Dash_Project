# graphs/hashtag_graph.py
from typing import List
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from pydantic import BaseModel
from app.schemas import HashtagState
from app.config import settings


# ─── Structured output schema ─────────────────────────────────────────────────

class HashtagOutput(BaseModel):
    hashtags: List[str]


# ─── LLM Node ─────────────────────────────────────────────────────────────────

async def generate_hashtag_node(state: HashtagState) -> dict:
    llm = ChatOpenAI(
        model=settings.MODEL_NAME,
        api_key=settings.OPENAI_API_KEY,
    )

    structured_llm = llm.with_structured_output(HashtagOutput)

    prompt = f"""You are a social media hashtag strategist.

Generate exactly 10 relevant, high-performing hashtags.

Content: {state.content}
Industry: {state.industry}

Requirements:
- Mix of broad (high volume) and niche (targeted) hashtags
- No spaces within hashtags
- Include the # prefix for each hashtag
- Relevant to both the content AND the industry
- Avoid banned or overused generic hashtags like #love #instagood
- Return exactly 10 hashtags in the hashtags list
"""

    result: HashtagOutput = await structured_llm.ainvoke([HumanMessage(content=prompt)])

    # Ensure all start with #
    cleaned = [
        tag if tag.startswith("#") else f"#{tag}"
        for tag in result.hashtags[:10]
    ]

    # Return ONLY the fields that changed — LangGraph merges this into state automatically.
    # Previously this was:
    #   return HashtagState(**state.model_dump(), hashtags=cleaned)
    # which would cause the same "multiple values" TypeError.
    return {"hashtags": cleaned}


# ─── Build Graph ──────────────────────────────────────────────────────────────

def build_hashtag_graph():
    graph = StateGraph(HashtagState)
    graph.add_node("generate", generate_hashtag_node)
    graph.set_entry_point("generate")
    graph.add_edge("generate", END)
    return graph.compile()


hashtag_graph = build_hashtag_graph()