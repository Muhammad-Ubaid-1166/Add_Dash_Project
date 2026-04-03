# routes/generate.py
import uuid
import logging
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.schemas import (
    CopyRequest, CopyResponse,
    SocialRequest, SocialResponse,
    HashtagRequest, HashtagResponse,
    CopyState, SocialState, HashtagState,
)
from app.graphs.copy_graph import copy_graph, stream_copy
from app.graphs.social_graph import social_graph
from app.graphs.hashtag_graph import hashtag_graph

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── POST /generate/copy (JSON) ───────────────────────────────────────────────

@router.post("/copy", response_model=CopyResponse)
async def generate_copy(body: CopyRequest, request: Request):
    """Generate ad copy: headline, body, and CTA"""
    request_id = request.state.request_id

    logger.info(f"[{request_id}] generate_copy | product={body.product[:50]} platform={body.platform}")

    state = CopyState(
        product=body.product,
        tone=body.tone,
        platform=body.platform,
        word_limit=body.word_limit,
    )

    result = await copy_graph.ainvoke(state)

    logger.info(f"[{request_id}] generate_copy completed")

    return CopyResponse(
        headline=result["headline"],
        body=result["body"],
        cta=result["cta"],
        request_id=request_id,
    )


# ─── POST /generate/copy/stream (SSE Streaming) ───────────────────────────────

@router.post("/copy/stream")
async def generate_copy_stream(body: CopyRequest, request: Request):
    """
    Stream ad copy generation token by token using SSE.
    
    Frontend usage:
        const es = new EventSource(...)  // use fetch with ReadableStream for POST
        Each event: { token: "..." } or { status: "started" | "done" }
    """
    request_id = request.state.request_id
    logger.info(f"[{request_id}] generate_copy_stream started")

    state = CopyState(
        product=body.product,
        tone=body.tone,
        platform=body.platform,
        word_limit=body.word_limit,
    )

    return StreamingResponse(
        stream_copy(state),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
            "X-Request-ID": request_id,
        },
    )


# ─── POST /generate/social ────────────────────────────────────────────────────

@router.post("/social", response_model=SocialResponse)
async def generate_social(body: SocialRequest, request: Request):
    """Generate 5 social media caption options"""
    request_id = request.state.request_id

    logger.info(f"[{request_id}] generate_social | platform={body.platform} goal={body.campaign_goal[:50]}")

    state = SocialState(
        platform=body.platform,
        campaign_goal=body.campaign_goal,
        brand_voice=body.brand_voice,
    )

    result = await social_graph.ainvoke(state)

    logger.info(f"[{request_id}] generate_social completed | captions={len(result['captions'])}")

    return SocialResponse(
        captions=result["captions"],
        request_id=request_id,
    )


# ─── POST /generate/hashtags ──────────────────────────────────────────────────

@router.post("/hashtags", response_model=HashtagResponse)
async def generate_hashtags(body: HashtagRequest, request: Request):
    """Generate 10 relevant hashtags"""
    request_id = request.state.request_id

    logger.info(f"[{request_id}] generate_hashtags | industry={body.industry}")

    state = HashtagState(
        content=body.content,
        industry=body.industry,
    )

    result = await hashtag_graph.ainvoke(state)

    logger.info(f"[{request_id}] generate_hashtags completed")

    return HashtagResponse(
        hashtags=result["hashtags"],
        request_id=request_id,
    )
