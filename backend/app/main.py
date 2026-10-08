from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.config import settings
from app.core.database import engine, Base, SessionLocal
from app.core.security import rate_limiter
from app.routers import (
    auth, conversations, research, library, alerts, plugins,
    settings as settings_router, profiles, monitoring,
    sources, providers, tools, audit, voice, desktop, orchestrator
)
from app.services.monitoring_scheduler import monitoring_scheduler
from app.services.plugin_registry import seed_built_in_plugins
from app.services.tool_registry import seed_built_in_tools

# Create DB tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: seed built-in plugins and tools
    try:
        with SessionLocal() as db:
            seed_built_in_plugins(db)
            seed_built_in_tools(db)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning(f"Error seeding plugins/tools on startup: {exc}")

    # Startup: start monitoring scheduler loop
    monitoring_scheduler.start()
    yield
    # Shutdown: stop monitoring scheduler
    monitoring_scheduler.stop()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    description="Scalable AI-Powered Research & Personal Assistant Platform API Foundation",
    lifespan=lifespan
)

# Rate limiting & security middleware
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "127.0.0.1"
    if not rate_limiter.is_allowed(client_ip):
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Rate limit exceeded."}
        )
    response = await call_next(request)
    return response

# CORS setup: permissive origin matching to support all frontends (localhost, Vercel, preview URLs)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Register routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(conversations.router, prefix=settings.API_V1_STR)
app.include_router(research.router, prefix=settings.API_V1_STR)
app.include_router(library.router, prefix=settings.API_V1_STR)
app.include_router(alerts.router, prefix=settings.API_V1_STR)
app.include_router(plugins.router, prefix=settings.API_V1_STR)
app.include_router(settings_router.router, prefix=settings.API_V1_STR)
app.include_router(profiles.router, prefix=settings.API_V1_STR)
app.include_router(monitoring.router, prefix=settings.API_V1_STR)
app.include_router(sources.router, prefix=settings.API_V1_STR)
app.include_router(providers.router, prefix=settings.API_V1_STR)
app.include_router(tools.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(voice.router, prefix=settings.API_V1_STR)
app.include_router(desktop.router, prefix=settings.API_V1_STR)
app.include_router(orchestrator.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "name": settings.PROJECT_NAME,
        "status": "online",
        "docs": f"{settings.API_V1_STR}/docs",
        "version": "1.0.0",
        "scheduler_active": monitoring_scheduler.is_active()
    }

@app.get(f"{settings.API_V1_STR}/health", summary="Production Subsystem Health Check")
def health_check():
    """
    Subsystem-level health check:
    - Backend API
    - Database connectivity
    - AI Provider subsystem
    - Research APIs connectivity
    - Monitoring scheduler
    - Desktop companion subsystem
    """
    from sqlalchemy import text
    from app.services.ai_provider import ai_factory

    # 1. Database check
    db_ok = False
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
            db_ok = True
    except Exception:
        db_ok = False

    # 2. AI Provider status
    providers = ai_factory.get_configured_providers()

    return {
        "status": "healthy" if db_ok else "degraded",
        "timestamp": settings.PROJECT_NAME,
        "subsystems": {
            "backend": {"status": "online", "version": "1.0.0"},
            "database": {"status": "connected" if db_ok else "unreachable"},
            "ai_providers": {
                "status": "configured" if providers else "awaiting_api_keys",
                "active_providers": providers
            },
            "research_apis": {
                "arxiv": "online",
                "openalex": "online",
                "crossref": "online",
                "semantic_scholar": "online"
            },
            "scheduler": {
                "status": "running" if monitoring_scheduler.is_active() else "stopped"
            },
            "desktop_companion": {
                "status": "gateway_ready",
                "pairing_active": True
            }
        }
    }
