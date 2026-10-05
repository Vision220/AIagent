"""
AI Model Providers & Routing Router — Phase 4

Manages multi-model AI providers, user credentials, and task-based model routing.
Ensures API keys are encrypted/masked and never exposed to the frontend.
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, AIProviderConfig, ModelRouteConfig
from app.services.model_router import model_router, DEFAULT_ROUTING
from app.services.audit_service import record_audit_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/providers", tags=["AI Providers"])

# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class ProviderConfigSaveRequest(BaseModel):
    provider_slug: str = Field(..., description="gemini, openai, anthropic, local")
    api_key: Optional[str] = Field(None, description="API key to store (server-side)")
    extra_config: Optional[Dict[str, Any]] = None
    is_enabled: bool = True

class ModelRouteUpdateRequest(BaseModel):
    chat_model: Optional[str] = None
    research_model: Optional[str] = None
    summarization_model: Optional[str] = None
    fast_model: Optional[str] = None
    reasoning_model: Optional[str] = None
    auto_route_enabled: Optional[bool] = None

def mask_api_key(key: Optional[str]) -> Optional[str]:
    if not key or len(key) < 6:
        return "••••••••" if key else None
    return f"{key[:3]}••••••••{key[-3:]}"

# ─── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/")
def list_providers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all known AI model providers with capabilities, supported models,
    and whether they are configured for the platform or user.
    """
    catalogue = model_router.get_provider_catalogue(check_configured=True)
    user_configs = {
        c.provider_slug: c for c in db.query(AIProviderConfig).filter(AIProviderConfig.user_id == current_user.id).all()
    }
    
    # Merge user configuration status
    for item in catalogue:
        slug = item["slug"]
        if slug in user_configs:
            u_conf = user_configs[slug]
            item["user_configured"] = bool(u_conf.is_configured and u_conf.api_key_encrypted)
            item["user_enabled"] = u_conf.is_enabled
        else:
            item["user_configured"] = False
            item["user_enabled"] = True

    return catalogue


@router.get("/config")
def get_user_provider_configs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get user-configured providers with masked API keys.
    """
    configs = db.query(AIProviderConfig).filter(AIProviderConfig.user_id == current_user.id).all()
    return [
        {
            "id": c.id,
            "provider_slug": c.provider_slug,
            "is_configured": c.is_configured,
            "is_enabled": c.is_enabled,
            "has_api_key": bool(c.api_key_encrypted),
            "masked_key": mask_api_key(c.api_key_encrypted),
            "extra_config": c.extra_config_json,
            "updated_at": c.updated_at
        }
        for c in configs
    ]


@router.post("/config")
def save_user_provider_config(
    req: ProviderConfigSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Save or update user API key / config for a provider.
    API keys are stored server-side and never returned plain-text.
    """
    valid_slugs = {"gemini", "openai", "anthropic", "local"}
    if req.provider_slug not in valid_slugs:
        raise HTTPException(status_code=400, detail=f"Invalid provider slug. Choose from: {valid_slugs}")

    config = db.query(AIProviderConfig).filter(
        AIProviderConfig.user_id == current_user.id,
        AIProviderConfig.provider_slug == req.provider_slug
    ).first()

    if not config:
        config = AIProviderConfig(
            user_id=current_user.id,
            provider_slug=req.provider_slug,
            is_configured=bool(req.api_key),
            is_enabled=req.is_enabled,
            api_key_encrypted=req.api_key if req.api_key else None,
            extra_config_json=req.extra_config
        )
        db.add(config)
    else:
        if req.api_key is not None:
            config.api_key_encrypted = req.api_key
            config.is_configured = bool(req.api_key.strip())
        config.is_enabled = req.is_enabled
        if req.extra_config is not None:
            config.extra_config_json = req.extra_config
        config.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(config)

    record_audit_event(
        db=db,
        user_id=current_user.id,
        category="model",
        action="provider.configure",
        resource_type="AIProviderConfig",
        resource_id=str(config.id),
        resource_name=req.provider_slug,
        success=True
    )

    return {
        "success": True,
        "provider_slug": config.provider_slug,
        "is_configured": config.is_configured,
        "is_enabled": config.is_enabled,
        "masked_key": mask_api_key(config.api_key_encrypted)
    }


@router.delete("/config/{provider_slug}")
def delete_user_provider_config(
    provider_slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove user credentials and config for a provider.
    """
    config = db.query(AIProviderConfig).filter(
        AIProviderConfig.user_id == current_user.id,
        AIProviderConfig.provider_slug == provider_slug
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Provider configuration not found")

    db.delete(config)
    db.commit()

    record_audit_event(
        db=db,
        user_id=current_user.id,
        category="model",
        action="provider.delete",
        resource_type="AIProviderConfig",
        resource_name=provider_slug,
        success=True
    )
    return {"success": True, "message": f"Configuration for '{provider_slug}' deleted."}


@router.get("/routes")
def get_model_routes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get user-defined model routing preferences. Falls back to defaults.
    """
    route_config = db.query(ModelRouteConfig).filter(ModelRouteConfig.user_id == current_user.id).first()
    if not route_config:
        return {
            "auto_route_enabled": True,
            "routes": DEFAULT_ROUTING,
            "is_customized": False
        }
    return {
        "auto_route_enabled": route_config.auto_route_enabled,
        "routes": {
            "chat": route_config.chat_model or DEFAULT_ROUTING["chat"],
            "research": route_config.research_model or DEFAULT_ROUTING["research"],
            "summarization": route_config.summarization_model or DEFAULT_ROUTING["summarization"],
            "fast": route_config.fast_model or DEFAULT_ROUTING["fast"],
            "reasoning": route_config.reasoning_model or DEFAULT_ROUTING["reasoning"]
        },
        "is_customized": True
    }


@router.put("/routes")
def update_model_routes(
    req: ModelRouteUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update model routing preferences for different task types.
    """
    route_config = db.query(ModelRouteConfig).filter(ModelRouteConfig.user_id == current_user.id).first()
    if not route_config:
        route_config = ModelRouteConfig(user_id=current_user.id)
        db.add(route_config)

    if req.auto_route_enabled is not None:
        route_config.auto_route_enabled = req.auto_route_enabled
    if req.chat_model is not None:
        route_config.chat_model = req.chat_model
    if req.research_model is not None:
        route_config.research_model = req.research_model
    if req.summarization_model is not None:
        route_config.summarization_model = req.summarization_model
    if req.fast_model is not None:
        route_config.fast_model = req.fast_model
    if req.reasoning_model is not None:
        route_config.reasoning_model = req.reasoning_model

    route_config.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(route_config)

    return {
        "success": True,
        "auto_route_enabled": route_config.auto_route_enabled,
        "routes": {
            "chat": route_config.chat_model or DEFAULT_ROUTING["chat"],
            "research": route_config.research_model or DEFAULT_ROUTING["research"],
            "summarization": route_config.summarization_model or DEFAULT_ROUTING["summarization"],
            "fast": route_config.fast_model or DEFAULT_ROUTING["fast"],
            "reasoning": route_config.reasoning_model or DEFAULT_ROUTING["reasoning"]
        }
    }


@router.post("/test/{provider_slug}")
async def test_provider_connection(
    provider_slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Test connectivity with a model provider.
    """
    if provider_slug == "gemini":
        from app.services.ai_provider import GeminiProvider
        provider = GeminiProvider()
        is_healthy = provider.health_check()
        return {
            "provider": "gemini",
            "available": is_healthy,
            "message": "Gemini connection active and ready." if is_healthy else "Gemini API key is not configured or invalid."
        }
    else:
        return {
            "provider": provider_slug,
            "available": False,
            "message": f"Adapter for provider '{provider_slug}' is not yet implemented in Phase 4."
        }
