# routes/health.py
from fastapi import APIRouter
from app.schemas import HealthResponse
from app.config import settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Returns service status and model info"""
    return HealthResponse(
        status="ok",
        model=settings.MODEL_NAME,
        service="ai-copy-service",
        version=settings.SERVICE_VERSION,
    )
