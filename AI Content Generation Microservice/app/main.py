# main.py
import uuid
import time
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.routes import generate, health
from app.config import settings

# ─── Logging Setup ────────────────────────────────────────────────────────────

logging.basicConfig(
    level=settings.LOG_LEVEL,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="AI Copy Microservice",
    description="LLM-powered advertising copy generation service",
    version=settings.SERVICE_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)


# ─── CORS ─────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request ID + Logging Middleware ──────────────────────────────────────────

@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    """
    Attaches a unique request_id to every request.
    Logs method, path, status, and duration.
    """
    request_id = str(uuid.uuid4())[:8]  # Short 8-char ID for readability
    request.state.request_id = request_id

    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 2)

    logger.info(
        f"[{request_id}] {request.method} {request.url.path} "
        f"→ {response.status_code} ({duration_ms}ms)"
    )

    response.headers["X-Request-ID"] = request_id
    return response


# ─── Routes ───────────────────────────────────────────────────────────────────

app.include_router(generate.router, prefix="/generate", tags=["Generate"])
app.include_router(health.router, tags=["Health"])
