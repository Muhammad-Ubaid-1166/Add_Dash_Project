# schemas.py
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


# ─── Enums ────────────────────────────────────────────────────────────────────

class Tone(str, Enum):
    PROFESSIONAL = "professional"
    CASUAL = "casual"
    PLAYFUL = "playful"
    LUXURY = "luxury"
    URGENT = "urgent"


class Platform(str, Enum):
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    TWITTER = "twitter"
    LINKEDIN = "linkedin"
    GOOGLE_ADS = "google_ads"


# ─── /generate/copy ───────────────────────────────────────────────────────────

class CopyRequest(BaseModel):
    product: str = Field(..., min_length=1, max_length=500, description="Product or service name/description")
    tone: Tone = Field(..., description="Desired tone of the copy")
    platform: Platform = Field(..., description="Target platform")
    word_limit: int = Field(100, ge=10, le=500, description="Max words for body copy")


class CopyResponse(BaseModel):
    headline: str = Field(..., description="Attention-grabbing headline")
    body: str = Field(..., description="Main advertising copy body")
    cta: str = Field(..., description="Call to action text")
    request_id: str


# ─── /generate/social ─────────────────────────────────────────────────────────

class SocialRequest(BaseModel):
    platform: Platform = Field(..., description="Target social platform")
    campaign_goal: str = Field(..., min_length=1, max_length=500, description="What the campaign wants to achieve")
    brand_voice: str = Field(..., min_length=1, max_length=300, description="Brand personality and voice description")


class SocialResponse(BaseModel):
    captions: List[str] = Field(..., description="5 caption options")
    request_id: str


# ─── /generate/hashtags ───────────────────────────────────────────────────────

class HashtagRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000, description="Content description to generate hashtags for")
    industry: str = Field(..., min_length=1, max_length=100, description="Industry or niche")


class HashtagResponse(BaseModel):
    hashtags: List[str] = Field(..., description="10 relevant hashtags (without # prefix stored, returned with #)")
    request_id: str


# ─── /health ──────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    model: str
    service: str
    version: str


# ─── LangGraph State ──────────────────────────────────────────────────────────

class CopyState(BaseModel):
    product: str
    tone: str
    platform: str
    word_limit: int
    headline: Optional[str] = None
    body: Optional[str] = None
    cta: Optional[str] = None
    error: Optional[str] = None


class SocialState(BaseModel):
    platform: str
    campaign_goal: str
    brand_voice: str
    captions: Optional[List[str]] = None
    error: Optional[str] = None


class HashtagState(BaseModel):
    content: str
    industry: str
    hashtags: Optional[List[str]] = None
    error: Optional[str] = None
