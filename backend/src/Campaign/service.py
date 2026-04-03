# service.py
import uuid
from datetime import datetime
from math import ceil
from typing import Optional

from sqlmodel import select, desc, func
from sqlmodel.ext.asyncio.session import AsyncSession

from src.db.models import Campaign
from .schemas import (
    CampaignCreate,
    CampaignUpdate,
    CampaignFilterParams,
    CampaignSortParams,
)

from .ai_brief import campaign_agent , Runner
class Campaign_service:

    # ─── Create Campaign ──────────────────────────────────────────────────────

    async def create_campaign(
        self,
        campaign_data: CampaignCreate,
        user_uid: uuid.UUID,
        session: AsyncSession,
    ):
        """Create a new campaign for a user"""
        campaign_data_dict = campaign_data.model_dump()

        # --- Website formatting (Aligns with CampaignCreate.model_validate_website) ---
        if campaign_data_dict.get("website"):
            website = campaign_data_dict["website"]
            if not website.startswith(('http://', 'https://')):
                campaign_data_dict["website"] = f'https://{website}'

        # --- Convert nested Pydantic models to dicts for JSONB columns ---
        if campaign_data_dict.get("target_audience") is not None:
            campaign_data_dict["target_audience"] = campaign_data.target_audience.model_dump()
            # Optional: Store as None if the dumped dict is completely empty
            if not any(campaign_data_dict["target_audience"].values()):
                campaign_data_dict["target_audience"] = None
        
                
        if campaign_data_dict.get("creative_preferences") is not None:
            campaign_data_dict["creative_preferences"] = campaign_data.creative_preferences.model_dump()
            if not any(campaign_data_dict["creative_preferences"].values()):
                campaign_data_dict["creative_preferences"] = None


        # if campaign_data_dict.get("status") is not None:
        #     campaign_data_dict["status"] = campaign_data.status.model_dump()
        #     # Optional: Store as None if the dumped dict is completely empty
        #     if not any(campaign_data_dict["status"].values()):
        #         campaign_data_dict["status"] = None





        new_campaign = Campaign(**campaign_data_dict)
        new_campaign.user_uid = user_uid

        session.add(new_campaign)
        await session.commit()
        await session.refresh(new_campaign)

        return new_campaign

    # ─── Get Single Campaign ──────────────────────────────────────────────────

    async def get_campaign(self, campaign_id: uuid.UUID, session: AsyncSession):
        """Fetch a single campaign by ID (excludes soft-deleted)"""
        statement = select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.deleted_at.is_(None),
        )
        result = await session.execute(statement)
        return result.scalars().first()

    # ─── Get All Campaigns (Filtered, Sorted, Paginated) ──────────────────────

    async def get_all_campaigns(
        self,
        user_uid: uuid.UUID,
        session: AsyncSession,
        filter_params: CampaignFilterParams,
        sort_params: CampaignSortParams,
        page: int = 1,
        page_size: int = 10,
    ):
        """
        Get all campaigns for a user with filtering, sorting, and pagination.
        Returns tuple: (campaigns_list, total_count, total_pages)
        """
        # ─── Base Query (non-deleted campaigns for this user) ─────────────
        statement = select(Campaign).where(
            Campaign.user_uid == user_uid,
        )

        # ─── Apply Filters ────────────────────────────────────────────────
        if filter_params.client:
            statement = statement.where(
                Campaign.client.ilike(f"%{filter_params.client}%")
            )
        if filter_params.status:
            statement = statement.where(Campaign.status == filter_params.status.value)
        if filter_params.objective:
            statement = statement.where(Campaign.objective == filter_params.objective.value)
        if filter_params.search:
            statement = statement.where(
                Campaign.name.ilike(f"%{filter_params.search}%")
            )
        if filter_params.min_budget is not None:
            statement = statement.where(Campaign.budget >= filter_params.min_budget)
        if filter_params.max_budget is not None:
            statement = statement.where(Campaign.budget <= filter_params.max_budget)
        if filter_params.start_date_from:
            statement = statement.where(Campaign.start_date >= filter_params.start_date_from)
        if filter_params.start_date_to:
            statement = statement.where(Campaign.start_date <= filter_params.start_date_to)

        # ─── Get Total Count (before pagination) ─────────────────────────
        count_statement = select(func.count()).select_from(statement.subquery())
        total_result = await session.execute(count_statement)
        total = total_result.scalar() or 0

        # ─── Apply Sorting ────────────────────────────────────────────────
        valid_sort_columns = {
            "name": Campaign.name,
            "client": Campaign.client,
            "status": Campaign.status,
            "budget": Campaign.budget,
            "spend": Campaign.spend,
            "impressions": Campaign.impressions,
            "clicks": Campaign.clicks,
            "conversions": Campaign.conversions,
            "created_at": Campaign.created_at,
            "start_date": Campaign.start_date,
            "end_date": Campaign.end_date,
        }

        sort_column = valid_sort_columns.get(sort_params.sort_by, Campaign.created_at)

        if sort_params.sort_order == "desc":
            statement = statement.order_by(desc(sort_column))
        else:
            statement = statement.order_by(sort_column)

        # ─── Apply Pagination ─────────────────────────────────────────────
        offset = (page - 1) * page_size
        statement = statement.offset(offset).limit(page_size)

        result = await session.execute(statement)
        campaigns = result.scalars().all()

        # Calculate total pages
        total_pages = ceil(total / page_size) if total > 0 else 0

        return campaigns, total, total_pages

    # ─── Update Campaign ──────────────────────────────────────────────────────

    async def update_campaign(
        self,
        campaign_id: uuid.UUID,
        update_data: CampaignUpdate,
        session: AsyncSession,
    ):
        """Update an existing campaign (partial updates supported)"""
        campaign = await self.get_campaign(campaign_id, session)

        if campaign is None:
            return None

        # Get only fields that were actually provided (exclude_unset=True)
        update_dict = update_data.model_dump(exclude_unset=True)

        # --- Website formatting for partial updates ---
        if "website" in update_dict and update_dict["website"]:
            website = update_dict["website"]
            if not website.startswith(('http://', 'https://')):
                update_dict["website"] = f'https://{website}'

        # --- Convert nested Pydantic models to dicts for JSONB columns ---
        if "target_audience" in update_dict and update_dict["target_audience"] is not None:
            update_dict["target_audience"] = update_data.target_audience.model_dump()
            if not any(update_dict["target_audience"].values()):
                update_dict["target_audience"] = None

        if "creative_preferences" in update_dict and update_dict["creative_preferences"] is not None:
            update_dict["creative_preferences"] = update_data.creative_preferences.model_dump()
            if not any(update_dict["creative_preferences"].values()):
                update_dict["creative_preferences"] = None

        # Update each provided field
        for key, value in update_dict.items():
            setattr(campaign, key, value)

        # Always update the timestamp
        campaign.updated_at = datetime.utcnow()

        await session.commit()
        await session.refresh(campaign)

        return campaign

    # ─── Soft Delete Campaign ─────────────────────────────────────────────────

    async def soft_delete_campaign(
        self,
        campaign_id: uuid.UUID,
        session: AsyncSession,
    ):
        """Soft delete a campaign by setting deleted_at timestamp"""
        campaign = await self.get_campaign(campaign_id, session)

        if campaign is None:
            return None

        campaign.deleted_at = datetime.utcnow()
        campaign.updated_at = datetime.utcnow()

        await session.commit()
        await session.refresh(campaign)

        return campaign

    # ─── Generate AI Brief ────────────────────────────────────────────────────

    # ─── Generate AI Brief ────────────────────────────────────────────────────

    async def generate_ai_brief(
        self,
        campaign_id: uuid.UUID,
        session: AsyncSession,
    ):
        """Generate an AI-powered creative brief for a campaign"""
        campaign = await self.get_campaign(campaign_id, session)

        if campaign is None:
            return None

        check_data = {
            "campaign_name": campaign.name,
            "client": campaign.client,
            "industry": campaign.industry,
            "website": campaign.website,
            "key_competitors": campaign.key_competitors,
            "objective": campaign.objective,
            "target_audience": campaign.target_audience,
            "creative_preference": campaign.creative_preferences,
            "budget": float(campaign.budget), # Ensure it's a float for the AI prompt
        }

        user_prompt = f"Here is the user prompt: {check_data}"

        # CRITICAL FIX: Use await Runner.run() for FastAPI async functions
        result = await Runner.run(campaign_agent, user_prompt)

        # Convert the Pydantic model to a dictionary so FastAPI can JSON-ify it
        brief_data = result.final_output.model_dump()

        return brief_data







