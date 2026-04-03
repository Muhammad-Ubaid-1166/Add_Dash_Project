from .db.main import initdb
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.auth.routes import auth_router
from src.Campaign.routes import campaign_router
from src.ws.ws_server import websocket_endpoint, alert_simulator

from .errors import register_all_errors
from .middleware import register_middleware


version = "v1"

description = """
A REST API for campaign and AI brief management.
This REST API is able to:
- Create, read, update, and delete campaigns
- Generate AI-powered creative briefs
- Manage authentication
- Send real-time alerts via WebSocket
"""

version_prefix = f"/api/{version}"

app = FastAPI(
    title="Campaign AI Platform",
    description=description,
    version=version,
    openapi_url=f"{version_prefix}/openapi.json",
    docs_url=f"{version_prefix}/docs",
    redoc_url=f"{version_prefix}/redoc",
)

# Register app-level handlers
register_all_errors(app)
register_middleware(app)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(auth_router, prefix=f"{version_prefix}/auth", tags=["auth"])
app.include_router(
    campaign_router,
    prefix=f"{version_prefix}/campaign",
    tags=["campaign"],
)

# WebSocket route (no /api/v1 prefix)
app.websocket("/ws/alerts/{token}")(websocket_endpoint)

@app.on_event("startup")
async def startup_event():
    # Ensure DB tables exist
    await initdb()

    # Start background alert simulator
    asyncio.create_task(alert_simulator())