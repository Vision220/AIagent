"""
Custom Sources Router — Phase 4

Allows users to manage and test their own research sources:
- RSS Feeds
- Public Webpages
- Open Access Repositories
- Academic APIs
- JSON APIs

Enforces SSRF protection, URL safety checks, and user ownership isolation.
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, CustomSource
from app.services.source_adapter import validate_url, fetch_custom_source, test_source_connection
from app.services.audit_service import record_audit_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sources", tags=["Custom Sources"])

# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class SourceCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    url: str = Field(..., max_length=1000)
    source_type: str = Field(default="rss", description="rss, json_api, xml_feed, academic_api, public_webpage")
    description: Optional[str] = None
    adapter_config: Optional[Dict[str, Any]] = None
    requires_auth: bool = False
    auth_header_name: Optional[str] = None
    auth_token: Optional[str] = None  # Stored encrypted

class SourceUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    source_type: Optional[str] = None
    is_enabled: Optional[bool] = None
    adapter_config: Optional[Dict[str, Any]] = None

class SourceValidateRequest(BaseModel):
    url: str
    source_type: str = "rss"

class CustomSourceResponse(BaseModel):
    id: int
    name: str
    url: str
    source_type: str
    description: Optional[str]
    is_enabled: bool
    is_validated: bool
    last_fetched_at: Optional[datetime]
    last_error: Optional[str]
    fetch_count: int
    created_at: datetime

    class Config:
        from_attributes = True

# ─── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[CustomSourceResponse])
def list_custom_sources(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all custom research sources configured by the current user.
    """
    return db.query(CustomSource).filter(CustomSource.user_id == current_user.id).order_by(CustomSource.created_at.desc()).all()


@router.post("/validate")
async def validate_source_url(
    req: SourceValidateRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Validate a source URL for safety and check accessibility before adding.
    """
    is_safe, error_msg = validate_url(req.url)
    if not is_safe:
        return {"valid": False, "error": error_msg}

    test_result = await test_source_connection(req.url, req.source_type)
    return {
        "valid": test_result["success"],
        "error": test_result.get("error"),
        "status_code": test_result.get("status_code"),
        "preview_items_count": test_result.get("items_found", 0)
    }


@router.post("/", response_model=CustomSourceResponse, status_code=status.HTTP_201_CREATED)
async def create_custom_source(
    req: SourceCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new custom research source. Validates safety and SSRF restrictions.
    """
    is_safe, error_msg = validate_url(req.url)
    if not is_safe:
        raise HTTPException(status_code=400, detail=f"Unsafe URL: {error_msg}")

    # Check for duplicate URL under this user
    existing = db.query(CustomSource).filter(
        CustomSource.user_id == current_user.id,
        CustomSource.url == req.url.strip()
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="A custom source with this URL already exists.")

    source = CustomSource(
        user_id=current_user.id,
        name=req.name.strip(),
        url=req.url.strip(),
        source_type=req.source_type,
        description=req.description,
        adapter_config_json=req.adapter_config,
        requires_auth=req.requires_auth,
        auth_header_name=req.auth_header_name,
        auth_token_encrypted=req.auth_token if req.auth_token else None,
        is_enabled=True,
        is_validated=False
    )
    db.add(source)
    db.commit()
    db.refresh(source)

    record_audit_event(
        db=db,
        user_id=current_user.id,
        category="source",
        action="source.create",
        resource_type="CustomSource",
        resource_id=str(source.id),
        resource_name=source.name,
        success=True
    )

    return source


@router.get("/{source_id}", response_model=CustomSourceResponse)
def get_custom_source(
    source_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get details of a specific custom source.
    """
    source = db.query(CustomSource).filter(
        CustomSource.id == source_id,
        CustomSource.user_id == current_user.id
    ).first()
    if not source:
        raise HTTPException(status_code=404, detail="Custom source not found")
    return source


@router.put("/{source_id}", response_model=CustomSourceResponse)
def update_custom_source(
    source_id: int,
    req: SourceUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a custom source's configuration or enabled state.
    """
    source = db.query(CustomSource).filter(
        CustomSource.id == source_id,
        CustomSource.user_id == current_user.id
    ).first()
    if not source:
        raise HTTPException(status_code=404, detail="Custom source not found")

    if req.url is not None:
        is_safe, error_msg = validate_url(req.url)
        if not is_safe:
            raise HTTPException(status_code=400, detail=f"Unsafe URL: {error_msg}")
        source.url = req.url.strip()
        source.is_validated = False

    if req.name is not None:
        source.name = req.name.strip()
    if req.description is not None:
        source.description = req.description
    if req.source_type is not None:
        source.source_type = req.source_type
    if req.is_enabled is not None:
        source.is_enabled = req.is_enabled
    if req.adapter_config is not None:
        source.adapter_config_json = req.adapter_config

    source.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(source)
    return source


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_custom_source(
    source_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a custom source.
    """
    source = db.query(CustomSource).filter(
        CustomSource.id == source_id,
        CustomSource.user_id == current_user.id
    ).first()
    if not source:
        raise HTTPException(status_code=404, detail="Custom source not found")

    db.delete(source)
    db.commit()

    record_audit_event(
        db=db,
        user_id=current_user.id,
        category="source",
        action="source.delete",
        resource_type="CustomSource",
        resource_id=str(source_id),
        resource_name=source.name,
        success=True
    )
    return None


@router.post("/{source_id}/fetch")
async def trigger_source_fetch(
    source_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetch and normalize items from a custom source.
    """
    source = db.query(CustomSource).filter(
        CustomSource.id == source_id,
        CustomSource.user_id == current_user.id
    ).first()
    if not source:
        raise HTTPException(status_code=404, detail="Custom source not found")

    try:
        items = await fetch_custom_source(source)
        source.is_validated = True
        source.last_fetched_at = datetime.now(timezone.utc)
        source.fetch_count = (source.fetch_count or 0) + 1
        source.last_error = None
        db.commit()
        return {
            "success": True,
            "items_count": len(items),
            "items": items[:10]  # Return sample of up to 10 items
        }
    except Exception as exc:
        source.last_error = str(exc)
        source.last_fetched_at = datetime.now(timezone.utc)
        db.commit()
        return {
            "success": False,
            "error": str(exc),
            "items_count": 0,
            "items": []
        }
