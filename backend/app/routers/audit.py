"""
Audit & Activity Router — Phase 4

Allows users to inspect their own agent activity log:
- Actions performed
- Plugins and providers used
- Tool executions and results
- Non-sensitive metadata only (NEVER stores or returns keys/passwords/tokens)
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, AuditEvent, ToolExecution, UserPluginInstall, CustomSource

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/audit", tags=["Audit & Activity"])

@router.get("/")
def list_audit_events(
    category: Optional[str] = Query(None, description="plugin, source, model, tool, voice, auth"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List user-scoped audit events with optional category filter.
    """
    query = db.query(AuditEvent).filter(AuditEvent.user_id == current_user.id)
    if category:
        query = query.filter(AuditEvent.category == category)
    events = query.order_by(AuditEvent.created_at.desc()).limit(limit).all()

    return [
        {
            "id": e.id,
            "category": e.category,
            "action": e.action,
            "resource_type": e.resource_type,
            "resource_id": e.resource_id,
            "resource_name": e.resource_name,
            "success": e.success,
            "error_summary": e.error_summary,
            "metadata": e.metadata_json,
            "created_at": e.created_at
        }
        for e in events
    ]


@router.get("/stats")
def get_activity_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Summary statistics of agent activity for current user.
    """
    total_events = db.query(AuditEvent).filter(AuditEvent.user_id == current_user.id).count()
    successful_events = db.query(AuditEvent).filter(
        AuditEvent.user_id == current_user.id,
        AuditEvent.success == True
    ).count()

    total_tools = db.query(ToolExecution).filter(ToolExecution.user_id == current_user.id).count()
    active_plugins = db.query(UserPluginInstall).filter(
        UserPluginInstall.user_id == current_user.id,
        UserPluginInstall.is_installed == True,
        UserPluginInstall.is_enabled == True
    ).count()
    custom_sources_count = db.query(CustomSource).filter(
        CustomSource.user_id == current_user.id,
        CustomSource.is_enabled == True
    ).count()

    return {
        "total_events": total_events,
        "successful_events": successful_events,
        "failed_events": total_events - successful_events,
        "total_tool_executions": total_tools,
        "active_plugins_count": active_plugins,
        "active_custom_sources_count": custom_sources_count
    }
