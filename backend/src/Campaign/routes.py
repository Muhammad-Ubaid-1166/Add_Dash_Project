# routes.py
from typing import Optional
from datetime import datetime
import uuid

from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession

from src.auth.dependencies import AccessTokenBearer, RoleChecker
from src.db.main import get_session
from .schemas import (
    CampaignCreate,
    CampaignResponse,
    CampaignUpdate,
    CampaignListResponse,
    PaginatedCampaignResponse,
    CampaignFilterParams,
    CampaignSortParams,
    CampaignStatus,
    CampaignObjective,
)
from .service import Campaign_service

campaign_router = APIRouter()
campaign_service = Campaign_service()
access_token_bearer = AccessTokenBearer()
role_checker = Depends(RoleChecker(["admin", "user"]))


# ─── Custom Exception ─────────────────────────────────────────────────────────

class CampaignNotFound(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found or has been deleted",
        )


# ─── List Campaigns (Filtered, Sorted, Paginated) ─────────────────────────────

@campaign_router.get(
    "/",
    response_model=PaginatedCampaignResponse,
    dependencies=[role_checker],
)
async def get_all_campaigns(
    # Filter params
    client: Optional[str] = Query(None, description="Filter by client name (partial match)"),
    status: Optional[CampaignStatus] = Query(None, description="Filter by campaign status"),
    objective: Optional[CampaignObjective] = Query(None, description="Filter by campaign objective"),
    search: Optional[str] = Query(None, description="Search in campaign name"),
    min_budget: Optional[float] = Query(None, ge=0, description="Minimum budget filter"),
    max_budget: Optional[float] = Query(None, ge=0, description="Maximum budget filter"),
    start_date_from: Optional[datetime] = Query(None, description="Campaign start date from (ISO format)"),
    start_date_to: Optional[datetime] = Query(None, description="Campaign start date to (ISO format)"),
    # Sort params
    sort_by: str = Query(
        "created_at",
        description="Field to sort by (name, client, budget, spend, impressions, clicks, conversions, created_at)",
    ),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="Sort order"),
    # Pagination
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    # Dependencies
    session: AsyncSession = Depends(get_session),
    token_details: dict = Depends(access_token_bearer),
):
    """
    Get all campaigns for the authenticated user.
    Supports filtering by client, status, objective, budget range, and date range.
    Supports sorting by any campaign field.
    Returns paginated results.
    """
    user_uid = token_details.get("user")["user_uid"]

    # Build filter params object
    filter_params = CampaignFilterParams(
        client=client,
        status=status,
        objective=objective,
        search=search,
        min_budget=min_budget,
        max_budget=max_budget,
        start_date_from=start_date_from,
        start_date_to=start_date_to,
    )

    # Build sort params object
    sort_params = CampaignSortParams(
        sort_by=sort_by,
        sort_order=sort_order,
    )

    campaigns, total, total_pages = await campaign_service.get_all_campaigns(
        user_uid=user_uid,
        session=session,
        filter_params=filter_params,
        sort_params=sort_params,
        page=page,
        page_size=page_size,
    )

    return PaginatedCampaignResponse(
        items=campaigns,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# ─── Get Single Campaign ──────────────────────────────────────────────────────

@campaign_router.get(
    "/{campaign_uid}",
    response_model=CampaignResponse,
    dependencies=[role_checker],
)
async def get_campaign(
    campaign_uid: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    _: dict = Depends(access_token_bearer),
):
    """Get a specific campaign by ID with full metrics (CTR, ROAS, CPC, CPA)"""
    campaign = await campaign_service.get_campaign(campaign_uid, session)

    if campaign:
        return campaign
    else:
        raise CampaignNotFound()


# ─── Create Campaign ──────────────────────────────────────────────────────────

@campaign_router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=CampaignResponse,
    dependencies=[role_checker],
)
async def create_campaign(
    campaign_data: CampaignCreate,
    session: AsyncSession = Depends(get_session),
    token_details: dict = Depends(access_token_bearer),
):
    """
    Create a new campaign for the authenticated user.
    Includes client details, objective, target audience, and creative preferences.
    """
    user_id = token_details.get("user")["user_uid"]
    new_campaign = await campaign_service.create_campaign(campaign_data, user_id, session)
    return new_campaign


# ─── Update Campaign ──────────────────────────────────────────────────────────

@campaign_router.put(
    "/{campaign_uid}",
    response_model=CampaignResponse,
    dependencies=[role_checker],
)
async def update_campaign(
    campaign_uid: uuid.UUID,
    campaign_update_data: CampaignUpdate,
    session: AsyncSession = Depends(get_session),
    _: dict = Depends(access_token_bearer),
):
    """
    Update a campaign (partial updates supported).
    Only provided fields will be updated.
    Can update campaign details, metrics, and nested objects.
    """
    updated_campaign = await campaign_service.update_campaign(
        campaign_uid, campaign_update_data, session
    )

    if updated_campaign is None:
        raise CampaignNotFound()

    return updated_campaign


# ─── Soft Delete Campaign ─────────────────────────────────────────────────────

@campaign_router.delete(
    "/{campaign_uid}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[role_checker],
)
async def soft_delete_campaign(
    campaign_uid: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    _: dict = Depends(access_token_bearer),
):
    """
    Soft delete a campaign by setting deleted_at timestamp.
    The campaign will no longer appear in list queries but remains in the database.
    """
    deleted_campaign = await campaign_service.soft_delete_campaign(campaign_uid, session)

    if deleted_campaign is None:
        raise CampaignNotFound()

    return None  # 204 No Content


# ─── Generate AI Brief ────────────────────────────────────────────────────────

@campaign_router.post(
    "/{campaign_id}/generate-brief",
    status_code=status.HTTP_200_OK,
    dependencies=[role_checker],
)
async def generate_campaign_brief(
    campaign_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    _: dict = Depends(access_token_bearer),
):
    """
    Generate an AI-powered creative brief for a campaign.
    Returns structured JSON with title suggestion, headlines,
    tone guide, channel recommendations, and budget allocation.
    """
    brief = await campaign_service.generate_ai_brief(campaign_id, session)

    if brief is None:
        raise CampaignNotFound()

    return brief