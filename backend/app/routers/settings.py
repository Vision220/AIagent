import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.config import settings
from app.schemas.schemas import (
    APIKeyUpdateRequest, UserPreferencesUpdate, HealthStatusResponse, ModelInfo
)
from app.services.ai_provider import ai_factory

router = APIRouter(prefix="/settings", tags=["Settings & Preferences"])

@router.get("/health", response_model=HealthStatusResponse)
def health_check():
    gemini_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
    gemini_configured = bool(gemini_key and gemini_key.strip())
    available_models = ai_factory.get_all_available_models()
    active_count = sum(1 for m in available_models if m.get("is_configured"))

    return {
        "status": "healthy",
        "version": "2.0.0",
        "ai_provider": "gemini",
        "gemini_key_configured": gemini_configured,
        "database_connected": True,
        "active_models_count": active_count
    }

@router.get("/models", response_model=List[ModelInfo])
def get_models():
    """Returns list of all supported models with configuration status."""
    return ai_factory.get_all_available_models()

@router.post("/api-keys")
def update_api_key(req: APIKeyUpdateRequest):
    if req.gemini_api_key is not None:
        settings.GEMINI_API_KEY = req.gemini_api_key
        os.environ["GEMINI_API_KEY"] = req.gemini_api_key

    gemini_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
    is_configured = bool(gemini_key and gemini_key.strip())

    return {
        "success": True,
        "message": "API Keys updated successfully.",
        "gemini_configured": is_configured
    }

@router.get("/preferences")
def get_preferences():
    return {
        "preferred_models": ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"],
        "default_sources": ["arxiv", "openalex", "crossref", "semantic_scholar"],
        "citation_format": "APA",
        "dark_mode": True,
        "voice_enabled": False,
        "voice_name": "en-US-Neural2-F"
    }
