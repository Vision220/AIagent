"""
Tools & Agent Command Router — Phase 4

Allows models and users to execute validated, typed tools with:
- Schema validation
- Risk level assessment (LOW, MEDIUM, HIGH, CRITICAL)
- Capability-based permission enforcement
- Confirmation requirement checks for destructive/sensitive operations
- Comprehensive execution audit logging
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, ToolDefinition, ToolExecution, PermissionGrant
from app.services.tool_registry import execute_tool, BUILT_IN_TOOLS
from app.services.permission_service import get_user_granted_capabilities, grant_capability, revoke_capability

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tools", tags=["Agent Tools"])

# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class ToolExecuteRequest(BaseModel):
    tool_name: str = Field(..., description="Name of the registered tool to execute")
    arguments: Dict[str, Any] = Field(default_factory=dict, description="Tool input arguments")
    confirmed: bool = Field(default=False, description="User confirmed execution of sensitive action")
    triggered_by: str = Field(default="user", description="user, voice, agent, scheduled")

class PermissionGrantRequest(BaseModel):
    capability: str
    plugin_id: Optional[int] = None

class PermissionRevokeRequest(BaseModel):
    capability: str
    plugin_id: Optional[int] = None

# ─── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/")
def list_tools(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all registered agent tools with their input/output schemas,
    risk levels, and required capabilities.
    """
    if db.query(ToolDefinition).count() == 0:
        from app.services.tool_registry import seed_built_in_tools
        seed_built_in_tools(db)

    tools = db.query(ToolDefinition).filter(ToolDefinition.is_enabled == True).all()
    granted_caps = get_user_granted_capabilities(db, current_user.id)

    return [
        {
            "id": t.id,
            "name": t.name,
            "display_name": t.display_name,
            "description": t.description,
            "input_schema": t.input_schema_json,
            "output_schema": t.output_schema_json,
            "risk_level": t.risk_level,
            "required_capability": t.required_capability,
            "requires_confirmation": t.requires_confirmation,
            "has_permission": (not t.required_capability) or (t.required_capability in granted_caps),
            "plugin_slug": t.plugin_slug
        }
        for t in tools
    ]


@router.post("/execute")
async def run_tool(
    req: ToolExecuteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Execute a validated tool. Enforces permissions and confirmation for sensitive actions.
    """
    result = await execute_tool(
        db=db,
        user_id=current_user.id,
        tool_name=req.tool_name,
        arguments=req.arguments,
        confirmed=req.confirmed,
        triggered_by=req.triggered_by
    )
    if not result.get("success"):
        error_type = result.get("error_type")
        if error_type == "CONFIRMATION_REQUIRED":
            return {
                "success": False,
                "confirmation_required": True,
                "message": result.get("error"),
                "confirmation_prompt": result.get("confirmation_prompt"),
                "tool_name": req.tool_name,
                "arguments": req.arguments
            }
        elif error_type == "PERMISSION_DENIED":
            raise HTTPException(
                status_code=403,
                detail=result.get("error")
            )
        elif error_type == "TOOL_NOT_FOUND":
            raise HTTPException(status_code=404, detail=result.get("error"))
        else:
            raise HTTPException(status_code=400, detail=result.get("error"))

    return result


@router.get("/history")
def get_tool_execution_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get audit history of tool executions performed by or for the current user.
    """
    executions = db.query(ToolExecution).filter(
        ToolExecution.user_id == current_user.id
    ).order_by(ToolExecution.executed_at.desc()).limit(min(limit, 100)).all()

    return [
        {
            "id": e.id,
            "tool_id": e.tool_id,
            "tool_name": e.tool.name if e.tool else "unknown",
            "display_name": e.tool.display_name if e.tool else "Unknown Tool",
            "input_summary": e.input_summary,
            "success": e.success,
            "error_message": e.error_message,
            "required_confirmation": e.required_confirmation,
            "was_confirmed": e.was_confirmed,
            "triggered_by": e.triggered_by,
            "plugin_slug": e.plugin_slug,
            "executed_at": e.executed_at,
            "duration_ms": e.duration_ms
        }
        for e in executions
    ]


@router.get("/permissions")
def get_permission_center(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Permission Center: overview of granted capabilities, risk levels, and active plugins.
    """
    grants = db.query(PermissionGrant).filter(
        PermissionGrant.user_id == current_user.id,
        PermissionGrant.is_active == True
    ).all()

    from app.services.plugin_registry import CAPABILITY_LEVELS
    granted_caps = get_user_granted_capabilities(db, current_user.id)

    capabilities_overview = []
    for cap, level in CAPABILITY_LEVELS.items():
        capabilities_overview.append({
            "capability": cap,
            "level": level,
            "is_granted": cap in granted_caps,
            "can_grant": level != "CRITICAL"  # CRITICAL cannot be granted in Phase 4
        })

    return {
        "granted_count": len(granted_caps),
        "active_grants": [
            {
                "id": g.id,
                "capability": g.capability,
                "permission_level": g.permission_level,
                "plugin_id": g.plugin_id,
                "granted_at": g.granted_at
            }
            for g in grants
        ],
        "all_capabilities": capabilities_overview
    }


@router.post("/permissions/grant")
def grant_user_permission(
    req: PermissionGrantRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Explicitly grant a capability to the current user.
    """
    from app.services.plugin_registry import CAPABILITY_LEVELS
    level = CAPABILITY_LEVELS.get(req.capability)
    if level == "CRITICAL":
        raise HTTPException(status_code=400, detail="CRITICAL capabilities cannot be granted in this phase.")

    grant = grant_capability(db, current_user.id, req.capability, req.plugin_id)
    return {
        "success": True,
        "capability": grant.capability,
        "level": grant.permission_level,
        "is_active": grant.is_active
    }


@router.post("/permissions/revoke")
def revoke_user_permission(
    req: PermissionRevokeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Revoke a capability previously granted to the current user.
    """
    revoked = revoke_capability(db, current_user.id, req.capability, req.plugin_id)
    return {"success": revoked, "capability": req.capability}
