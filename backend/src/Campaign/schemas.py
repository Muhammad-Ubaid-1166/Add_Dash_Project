# schemas.py
from pydantic import BaseModel, Field, computed_field, HttpUrl
from datetime import datetime
from typing import Optional, List
import uuid
from enum import Enum


# ─── Enums ────────────────────────────────────────────────────────────────────

class CampaignStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class CampaignObjective(str, Enum):
    AWARENESS = "awareness"
    CONSIDERATION = "consideration"
    CONVERSION = "conversion"


# ─── Nested Schemas ───────────────────────────────────────────────────────────

class TargetAudience(BaseModel):
    demographics: Optional[str] = Field(None, description="Target demographic description (age, gender, income)")
    interests: Optional[List[str]] = Field(None, description="Audience interests/hobbies")
    location: Optional[List[str]] = Field(None, description="Geographic targeting (cities, regions, countries)")
    devices: Optional[List[str]] = Field(None, description="Target devices (mobile, desktop, tablet)")


class CreativePreferences(BaseModel):
    tone: Optional[str] = Field(None, description="Brand tone (professional, casual, playful, luxury)")
    imagery_style: Optional[str] = Field(None, description="Photography/illustration style")
    color_direction: Optional[List[str]] = Field(None, description="Preferred color palette hex codes")
    dos: Optional[List[str]] = Field(None, description="Creative guidelines - things to include")
    donts: Optional[List[str]] = Field(None, description="Creative guidelines - things to avoid")


class CampaignMetrics(BaseModel):
    spend: float = Field(0.0, ge=0, description="Total amount spent")
    impressions: int = Field(0, ge=0, description="Total impressions")
    clicks: int = Field(0, ge=0, description="Total clicks")
    conversions: int = Field(0, ge=0, description="Total conversions")


# ─── Base Schema ──────────────────────────────────────────────────────────────

class CampaignBase(BaseModel):
    # Core campaign info (aligns with mock data structure)
    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Campaign name (e.g., 'Lumiere Summer Launch')"
    )
    client: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Client name (e.g., 'Lumiere Skincare')"
    )
    status: CampaignStatus = Field(
        CampaignStatus.DRAFT,
        description="Current campaign status"
    )
    budget: float = Field(
        ...,
        gt=0,
        description="Total campaign budget"
    )

    # Step 1: Client details
    industry: Optional[str] = Field(
        None,
        max_length=255,
        description="Client industry (e.g., 'Skincare', 'E-commerce')"
    )
    website: Optional[str] = Field(
        None,
        max_length=500,
        description="Client website URL"
    )
    key_competitors: Optional[List[str]] = Field(
        None,
        max_length=10,
        description="List of key competitors (max 10)"
    )

    # Step 2: Campaign objective & targeting
    objective: Optional[CampaignObjective] = Field(
        None,
        description="Primary campaign objective"
    )
    target_audience: Optional[TargetAudience] = Field(
        None,
        description="Target audience specification"
    )
    start_date: Optional[datetime] = Field(
        None,
        description="Campaign start date/time"
    )
    end_date: Optional[datetime] = Field(
        None,
        description="Campaign end date/time"
    )
    # avg_conversion_value: Optional[float] = Field(
    #     None,
    #     ge=0,
    #     description="Average value per conversion (for ROAS calculation)"
    # )

    # Step 3: Creative preferences
    creative_preferences: Optional[CreativePreferences] = Field(
        None,
        description="Creative guidelines and preferences"
    )


# ─── Create Schema ────────────────────────────────────────────────────────────

class CampaignCreate(CampaignBase):
    """Schema for creating a new campaign - inherits all fields from CampaignBase"""
    
    @classmethod
    def model_validate_website(cls, values):
        """Validate website format if provided"""
        if values.get('website'):
            website = values['website']
            if not website.startswith(('http://', 'https://')):
                values['website'] = f'https://{website}'
        return values


# ─── Update Schema ────────────────────────────────────────────────────────────

class CampaignUpdate(BaseModel):
    """Schema for partial updates - all fields optional"""
    
    # Core fields
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    client: Optional[str] = Field(None, min_length=1, max_length=255)
    status: Optional[CampaignStatus] = None
    budget: Optional[float] = Field(None, gt=0)

    # Client details
    industry: Optional[str] = Field(None, max_length=255)
    website: Optional[str] = Field(None, max_length=500)
    key_competitors: Optional[List[str]] = Field(None, max_length=10)

    # Objective & targeting
    objective: Optional[CampaignObjective] = None
    target_audience: Optional[TargetAudience] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    # avg_conversion_value: Optional[float] = Field(None, ge=0)

    # Creative preferences
    creative_preferences: Optional[CreativePreferences] = None

    # Metrics (for updating campaign performance data)
    spend: Optional[float] = Field(None, ge=0)
    impressions: Optional[int] = Field(None, ge=0)
    clicks: Optional[int] = Field(None, ge=0)
    conversions: Optional[int] = Field(None, ge=0)


# ─── Metrics Update Schema (dedicated endpoint) ───────────────────────────────

class CampaignMetricsUpdate(BaseModel):
    """Dedicated schema for updating only campaign metrics"""
    spend: Optional[float] = Field(None, ge=0, description="Total spend to update")
    impressions: Optional[int] = Field(None, ge=0, description="Total impressions to update")
    clicks: Optional[int] = Field(None, ge=0, description="Total clicks to update")
    conversions: Optional[int] = Field(None, ge=0, description="Total conversions to update")


# ─── Response Schemas ─────────────────────────────────────────────────────────

class CampaignResponse(CampaignBase):
    """Full campaign response with metrics and computed fields"""
    id: uuid.UUID
    spend: float = Field(0.0, ge=0)
    impressions: int = Field(0, ge=0)
    clicks: int = Field(0, ge=0)
    conversions: int = Field(0, ge=0)
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = Field(None, description="Soft delete timestamp")

    @computed_field
    @property
    def ctr(self) -> float:
        """Click-through rate: (clicks / impressions) * 100"""
        if self.impressions > 0:
            return round((self.clicks / self.impressions) * 100, 2)
        return 0.0

    # @computed_field
    # @property
    # def roas(self) -> float:
    #     """Return on Ad Spend: revenue / spend
    #     Uses avg_conversion_value if set, otherwise defaults to $50
    #     """
    #     if self.spend > 0 and self.conversions > 0:
    #         conversion_value = self.avg_conversion_value or 50.0
    #         revenue = self.conversions * conversion_value
    #         return round(revenue / self.spend, 2)
    #     return 0.0

    @computed_field
    @property
    def budget_utilization(self) -> float:
        """Budget utilization percentage: (spend / budget) * 100"""
        if self.budget > 0:
            return round((self.spend / self.budget) * 100, 2)
        return 0.0

    @computed_field
    @property
    def cpc(self) -> float:
        """Cost per click: spend / clicks"""
        if self.clicks > 0:
            return round(self.spend / self.clicks, 2)
        return 0.0

    @computed_field
    @property
    def cpa(self) -> float:
        """Cost per acquisition: spend / conversions"""
        if self.conversions > 0:
            return round(self.spend / self.conversions, 2)
        return 0.0

    class Config:
        from_attributes = True


class CampaignListResponse(BaseModel):
    """Minimal campaign info for list/table view"""
    id: uuid.UUID
    name: str
    client: str
    status: CampaignStatus
    objective: Optional[CampaignObjective] = None
    budget: float
    spend: float
    impressions: int
    clicks: int
    conversions: int
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_at: datetime

    @computed_field
    @property
    def ctr(self) -> float:
        if self.impressions > 0:
            return round((self.clicks / self.impressions) * 100, 2)
        return 0.0

    @computed_field
    @property
    def roas(self) -> float:
        if self.spend > 0 and self.conversions > 0:
            # Default $50 conversion value for list view
            revenue = self.conversions * 50.0
            return round(revenue / self.spend, 2)
        return 0.0

    @computed_field
    @property
    def budget_utilization(self) -> float:
        if self.budget > 0:
            return round((self.spend / self.budget) * 100, 2)
        return 0.0

    class Config:
        from_attributes = True





# ─── Pagination Schema ────────────────────────────────────────────────────────

# ─── Pagination Schema ────────────────────────────────────────────────────────

class PaginatedCampaignResponse(BaseModel):
    """Paginated list response with metadata"""
    items: List[CampaignResponse]  # <-- CHANGED THIS FROM CampaignListResponse
    total: int = Field(..., description="Total number of campaigns matching filters")
    page: int = Field(..., ge=1, description="Current page number")
    page_size: int = Field(..., ge=1, le=100, description="Items per page")
    total_pages: int = Field(..., ge=0, description="Total number of pages")
# ─── Filter/Query Schema ──────────────────────────────────────────────────────

class CampaignFilterParams(BaseModel):
    """Query parameters for filtering campaigns"""
    client: Optional[str] = Field(None, description="Filter by client name")
    status: Optional[CampaignStatus] = Field(None, description="Filter by status")
    objective: Optional[CampaignObjective] = Field(None, description="Filter by objective")
    search: Optional[str] = Field(None, description="Search in campaign name")
    min_budget: Optional[float] = Field(None, ge=0, description="Minimum budget filter")
    max_budget: Optional[float] = Field(None, ge=0, description="Maximum budget filter")
    start_date_from: Optional[datetime] = Field(None, description="Campaign start date from")
    start_date_to: Optional[datetime] = Field(None, description="Campaign start date to")


class CampaignSortParams(BaseModel):
    """Query parameters for sorting campaigns"""
    sort_by: str = Field(
        "created_at",
        description="Field to sort by (name, client, budget, spend, ctr, roas, created_at)"
    )
    sort_order: str = Field(
        "desc",
        pattern="^(asc|desc)$",
        description="Sort order: asc or desc"
    )


# ─── KPI Aggregation Schema ───────────────────────────────────────────────────

class KPIResponse(BaseModel):
    """Aggregated KPI metrics for dashboard"""
    total_impressions: int = Field(0, ge=0)
    total_clicks: int = Field(0, ge=0)
    total_conversions: int = Field(0, ge=0)
    total_spend: float = Field(0.0, ge=0)
    total_budget: float = Field(0.0, ge=0)
    avg_ctr: float = Field(0.0, ge=0, description="Average CTR across campaigns")
    avg_roas: float = Field(0.0, ge=0, description="Average ROAS across campaigns")
    active_campaigns: int = Field(0, ge=0, description="Number of active campaigns")
    total_campaigns: int = Field(0, ge=0, description="Total non-deleted campaigns")


# ─── Auth Schemas ─────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, max_length=100, description="User password")


class TokenResponse(BaseModel):
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field("bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Error Schemas ────────────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[List[dict]] = Field(None, description="Field-level validation errors")


class ValidationErrorDetail(BaseModel):
    field: str
    message: str
    value: Optional[str] = None