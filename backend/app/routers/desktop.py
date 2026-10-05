"""
Desktop Companion & Local Automation Router — Phase 5

Provides secure endpoints for:
1. Short-lived companion pairing & device management
2. Fine-grained typed desktop permissions
3. Tool execution with emergency stop & confirmation checks
4. Natural language action planning with user takeover handoffs
5. Opt-in camera gesture interaction preferences
6. Local action audit logs with privacy indicators
"""

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, ConfigDict

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import (
    User,
    DesktopDevice,
    DesktopPermission,
    ActionPlan,
    DesktopTaskExecution,
    GesturePreference,
)
from app.services.desktop_security import (
    register_pairing_request,
    verify_pairing_code,
    revoke_desktop_device,
    trigger_emergency_stop,
    reset_emergency_stop,
    is_emergency_stop_active,
    SAFE_PERMISSIONS,
    CRITICAL_PERMISSIONS,
)
from app.services.desktop_tools import (
    DESKTOP_TOOL_SPECS,
    TOOL_SPEC_MAP,
    execute_desktop_tool,
)
from app.services.action_planner import (
    plan_goal,
    create_and_store_plan,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/desktop", tags=["Desktop Companion & Local Control"])


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class PairingRequestIn(BaseModel):
    device_name: str = "Desktop Companion"
    device_platform: str = "windows"


class PairingRequestOut(BaseModel):
    code: str
    device_id: str
    device_name: str
    expires_in_seconds: int
    expires_at: str


class PairingVerifyIn(BaseModel):
    pairing_code: str
    device_secret_token: str = "token_companion_secret_xyz123"


class PairingVerifyOut(BaseModel):
    status: str
    device_id: str
    device_name: str
    is_paired: bool
    message: str


class DeviceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: str
    device_name: str
    device_platform: str
    is_paired: bool
    is_active: bool
    last_heartbeat_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class PermissionGrantIn(BaseModel):
    permission_key: str
    device_id: Optional[int] = None
    temporary: bool = False
    duration_minutes: Optional[int] = 30
    always_allow: bool = False


class PermissionRevokeIn(BaseModel):
    permission_key: str
    device_id: Optional[int] = None


class ToolExecuteIn(BaseModel):
    tool_name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)
    confirmed: bool = False
    device_id: Optional[int] = None
    plan_id: Optional[int] = None


class PlanGenerateIn(BaseModel):
    goal: str


class GesturePreferenceIn(BaseModel):
    gesture_control_enabled: bool = False
    camera_active: bool = False
    gesture_mappings: Optional[Dict[str, str]] = None


class GestureTriggerIn(BaseModel):
    gesture: str
    target_action: Optional[str] = None


# ─── Pairing & Device Endpoints ───────────────────────────────────────────────

@router.post("/pair/request", response_model=PairingRequestOut, summary="Generate short-lived pairing code")
def request_pairing_code(
    payload: PairingRequestIn = PairingRequestIn(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a secure, 6-digit short-lived pairing code valid for 10 minutes."""
    device = register_pairing_request(
        db=db,
        user_id=current_user.id,
        device_name=payload.device_name,
        device_platform=payload.device_platform,
    )
    expires_at_dt = device.pairing_code_expires_at or (datetime.now(timezone.utc) + timedelta(minutes=10))
    return {
        "code": device.pairing_code,
        "device_id": device.device_id,
        "device_name": device.device_name,
        "expires_in_seconds": 600,
        "expires_at": expires_at_dt.isoformat(),
    }


@router.post("/pair/verify", response_model=PairingVerifyOut, summary="Verify pairing code and register device")
def verify_pairing(
    payload: PairingVerifyIn,
    db: Session = Depends(get_db),
):
    """Called by desktop companion with the 6-digit code to pair and receive an auth token."""
    device = verify_pairing_code(
        db=db,
        pairing_code=payload.pairing_code,
        device_secret_token=payload.device_secret_token,
    )
    if not device:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired pairing code. Please generate a new code from the web app.",
        )
    return {
        "status": "paired",
        "device_id": device.device_id,
        "device_name": device.device_name,
        "is_paired": device.is_paired,
        "message": "Desktop companion successfully paired and authenticated.",
    }


@router.get("/devices", response_model=List[DeviceOut], summary="List paired desktop companions")
def list_devices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all desktop devices paired with the current user."""
    devices = (
        db.query(DesktopDevice)
        .filter(DesktopDevice.user_id == current_user.id)
        .order_by(DesktopDevice.created_at.desc())
        .all()
    )
    return devices


@router.delete("/devices/{device_id}", summary="Revoke and disconnect companion device")
def revoke_device_endpoint(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoke desktop companion access immediately."""
    success = revoke_desktop_device(db, current_user.id, device_id)
    if not success:
        raise HTTPException(status_code=404, detail="Device not found or not owned by user.")
    return {"status": "revoked", "device_id": device_id, "message": "Device pairing revoked."}


@router.post("/devices/{device_id}/heartbeat", summary="Update device heartbeat")
def heartbeat(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Companion device heartbeat ping to maintain active status."""
    device = (
        db.query(DesktopDevice)
        .filter(DesktopDevice.device_id == device_id, DesktopDevice.user_id == current_user.id)
        .first()
    )
    if not device or not device.is_active:
        raise HTTPException(status_code=404, detail="Active device not found.")

    device.last_heartbeat_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "status": "alive",
        "emergency_stop_active": is_emergency_stop_active(current_user.id),
        "timestamp": device.last_heartbeat_at.isoformat(),
    }


# ─── Permissions Management ───────────────────────────────────────────────────

@router.get("/permissions", summary="Get desktop permissions state")
def get_permissions(
    device_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return fine-grained permissions for desktop companion tools."""
    query = db.query(DesktopPermission).filter(DesktopPermission.user_id == current_user.id)
    if device_id:
        query = query.filter(DesktopPermission.device_id == device_id)
    records = {p.permission_key: p for p in query.all()}

    all_permissions = [
        {"key": "DESKTOP_CONNECTION", "desc": "Connect desktop companion to research agent", "risk": "LOW"},
        {"key": "BROWSER_READ", "desc": "Extract research text and navigate public pages", "risk": "LOW"},
        {"key": "BROWSER_CONTROL", "desc": "Click elements and fill forms in browser", "risk": "MEDIUM"},
        {"key": "SCREEN_CAPTURE", "desc": "Take screenshot of active research window", "risk": "MEDIUM"},
        {"key": "CLIPBOARD_READ", "desc": "Read text from clipboard for research", "risk": "LOW"},
        {"key": "CLIPBOARD_WRITE", "desc": "Copy research summaries or citations to clipboard", "risk": "LOW"},
        {"key": "FILE_READ", "desc": "Read local documents in the sandbox", "risk": "MEDIUM"},
        {"key": "FILE_WRITE", "desc": "Save research reports in the sandbox", "risk": "MEDIUM"},
        {"key": "FILE_DELETE", "desc": "Delete files in sandbox (Always requires confirmation)", "risk": "CRITICAL"},
        {"key": "APPLICATION_LAUNCH", "desc": "Launch approved research applications (Notepad, Calculator)", "risk": "MEDIUM"},
        {"key": "EMAIL_SEND", "desc": "Send research summaries via email (Always requires confirmation)", "risk": "HIGH"},
        {"key": "MICROPHONE", "desc": "Use voice assistant commands", "risk": "MEDIUM"},
        {"key": "CAMERA", "desc": "Opt-in gesture control for low-risk actions", "risk": "MEDIUM"},
    ]

    out = []
    now = datetime.now(timezone.utc)
    for perm in all_permissions:
        rec = records.get(perm["key"])
        is_granted = False
        is_temp = False
        expires_at_str = None
        always_allow = False

        if perm["key"] in SAFE_PERMISSIONS:
            is_granted = True

        if rec:
            if rec.is_granted:
                if rec.expires_at:
                    exp = rec.expires_at.replace(tzinfo=timezone.utc) if rec.expires_at.tzinfo is None else rec.expires_at
                    if exp < now:
                        is_granted = False
                    else:
                        is_granted = True
                        is_temp = rec.is_temporary
                        always_allow = rec.always_allow
                        expires_at_str = exp.isoformat()
                else:
                    is_granted = True
                    is_temp = rec.is_temporary
                    always_allow = rec.always_allow

        out.append({
            "permission_key": perm["key"],
            "description": perm["desc"],
            "risk_level": perm["risk"],
            "is_granted": is_granted,
            "is_temporary": is_temp,
            "always_allow": always_allow,
            "expires_at": expires_at_str,
            "always_allow_permitted": perm["key"] not in CRITICAL_PERMISSIONS,
        })
    return out


@router.post("/permissions/grant", summary="Grant desktop permission")
def grant_permission(
    payload: PermissionGrantIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Grant or extend a fine-grained permission."""
    perm_key = payload.permission_key.upper()

    # Find or default device_id
    target_device_id = payload.device_id
    if not target_device_id:
        dev = db.query(DesktopDevice).filter(DesktopDevice.user_id == current_user.id).first()
        target_device_id = dev.id if dev else 1

    rec = (
        db.query(DesktopPermission)
        .filter(
            DesktopPermission.user_id == current_user.id,
            DesktopPermission.permission_key == perm_key,
        )
        .first()
    )

    now = datetime.now(timezone.utc)
    expires_at = None
    if payload.temporary:
        mins = payload.duration_minutes or 30
        expires_at = now + timedelta(minutes=mins)

    # Disallow always_allow on critical permissions
    effective_always_allow = payload.always_allow if perm_key not in CRITICAL_PERMISSIONS else False

    if not rec:
        rec = DesktopPermission(
            user_id=current_user.id,
            device_id=target_device_id,
            permission_key=perm_key,
            is_granted=True,
            is_temporary=payload.temporary,
            always_allow=effective_always_allow,
            expires_at=expires_at,
            granted_at=now,
        )
        db.add(rec)
    else:
        rec.is_granted = True
        rec.is_temporary = payload.temporary
        rec.always_allow = effective_always_allow
        rec.expires_at = expires_at
        rec.granted_at = now

    db.commit()
    return {"status": "granted", "permission_key": perm_key, "temporary": payload.temporary}


@router.post("/permissions/revoke", summary="Revoke desktop permission")
def revoke_permission(
    payload: PermissionRevokeIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoke desktop permission immediately."""
    perm_key = payload.permission_key.upper()
    rec = (
        db.query(DesktopPermission)
        .filter(
            DesktopPermission.user_id == current_user.id,
            DesktopPermission.permission_key == perm_key,
        )
        .first()
    )
    if rec:
        rec.is_granted = False
        db.commit()
    return {"status": "revoked", "permission_key": perm_key}


# ─── Tools & Execution ─────────────────────────────────────────────────────────

@router.get("/tools", summary="List registered typed desktop tools")
def list_desktop_tools():
    """Return all typed tools in the registry with schemas, permissions, and risk levels."""
    return DESKTOP_TOOL_SPECS


@router.post("/tools/execute", summary="Execute typed desktop tool")
async def execute_desktop_tool_endpoint(
    payload: ToolExecuteIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Execute an approved local tool through typed safety validation.
    Checks:
    1. Emergency stop status
    2. Tool existence & permission
    3. User confirmation requirement for high/critical risk actions
    4. Records audit log with privacy scope
    """
    if is_emergency_stop_active(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Emergency Stop is ACTIVE. All local tool execution is halted. Reset emergency stop to continue.",
        )

    result = await execute_desktop_tool(
        db=db,
        user_id=current_user.id,
        tool_name=payload.tool_name,
        arguments=payload.arguments,
        confirmed=payload.confirmed,
        device_id=payload.device_id,
        plan_id=payload.plan_id,
    )
    return result


# ─── Natural Language Action Planner ──────────────────────────────────────────

@router.post("/plans/generate", summary="Generate structured action plan from natural language goal")
def generate_plan(
    payload: PlanGenerateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Decompose a natural language request into a typed action plan.
    Displays required tools, permissions, and risk assessments before execution.
    """
    if not payload.goal.strip():
        raise HTTPException(status_code=400, detail="Goal cannot be empty.")

    plan = create_and_store_plan(db, current_user.id, payload.goal)
    return {
        "id": plan.id,
        "title": plan.title,
        "goal": plan.natural_language_goal,
        "status": plan.status,
        "steps": plan.steps_json,
        "step_count": len(plan.steps_json) if plan.steps_json else 0,
        "created_at": plan.created_at.isoformat() if plan.created_at else None,
    }


@router.get("/plans", summary="List recent action plans")
def list_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List recent action plans generated by the user."""
    plans = (
        db.query(ActionPlan)
        .filter(ActionPlan.user_id == current_user.id)
        .order_by(ActionPlan.created_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": p.id,
            "title": p.title,
            "goal": p.natural_language_goal,
            "status": p.status,
            "step_count": len(p.steps_json) if p.steps_json else 0,
            "requires_user_takeover": p.requires_user_takeover,
            "takeover_url": p.takeover_url,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in plans
    ]


@router.get("/plans/{plan_id}", summary="Get plan details")
def get_plan_details(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get full status and step details of an action plan."""
    plan = db.query(ActionPlan).filter(ActionPlan.id == plan_id, ActionPlan.user_id == current_user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")

    return {
        "id": plan.id,
        "title": plan.title,
        "goal": plan.natural_language_goal,
        "status": plan.status,
        "steps": plan.steps_json,
        "requires_user_takeover": plan.requires_user_takeover,
        "takeover_prompt": plan.takeover_prompt,
        "takeover_url": plan.takeover_url,
        "created_at": plan.created_at.isoformat() if plan.created_at else None,
    }


@router.post("/plans/{plan_id}/run", summary="Run action plan")
async def run_plan_endpoint(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Execute steps of an action plan sequentially.
    Handles user takeover pauses if CAPTCHA or sign-in is required.
    """
    if is_emergency_stop_active(current_user.id):
        raise HTTPException(status_code=423, detail="Emergency stop is active. Action plan execution halted.")

    plan = db.query(ActionPlan).filter(ActionPlan.id == plan_id, ActionPlan.user_id == current_user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")

    plan.status = "running"
    steps = list(plan.steps_json or [])
    executed_count = 0

    for step in steps:
        tool_name = step.get("tool_name")
        args = step.get("arguments", {})

        # Execute tool
        res = await execute_desktop_tool(
            db=db,
            user_id=current_user.id,
            tool_name=tool_name,
            arguments=args,
            confirmed=True,
            plan_id=plan.id,
        )

        # Check for user takeover trigger
        if res.get("result", {}).get("requires_takeover"):
            plan.status = "paused_for_takeover"
            plan.requires_user_takeover = True
            plan.takeover_url = res["result"].get("url")
            plan.takeover_prompt = res["result"].get("takeover_prompt", "Manual interaction required.")
            step["status"] = "paused_for_takeover"
            db.commit()
            return {
                "status": "paused_for_takeover",
                "message": plan.takeover_prompt,
                "takeover_url": plan.takeover_url,
                "plan_id": plan.id,
            }

        if not res.get("success"):
            plan.status = "failed"
            step["status"] = "failed"
            step["error"] = res.get("error")
            db.commit()
            return {"status": "failed", "error": res.get("error"), "plan_id": plan.id}

        step["status"] = "completed"
        step["result_summary"] = str(res.get("result"))[:200]
        executed_count += 1

    plan.status = "completed"
    plan.steps_json = steps
    db.commit()

    return {
        "status": "completed",
        "plan_id": plan.id,
        "executed_count": executed_count,
        "message": f"Successfully executed all {executed_count} planned steps.",
    }


@router.post("/plans/{plan_id}/resume", summary="Resume action plan after user takeover")
async def resume_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resume execution of a plan that was paused for manual user interaction."""
    plan = db.query(ActionPlan).filter(ActionPlan.id == plan_id, ActionPlan.user_id == current_user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")

    plan.status = "running"
    plan.requires_user_takeover = False
    plan.takeover_url = None
    plan.takeover_prompt = None
    db.commit()

    return await run_plan_endpoint(plan_id, db, current_user)


@router.post("/plans/{plan_id}/cancel", summary="Cancel action plan")
def cancel_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel an action plan."""
    plan = db.query(ActionPlan).filter(ActionPlan.id == plan_id, ActionPlan.user_id == current_user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")

    plan.status = "cancelled"
    db.commit()
    return {"status": "cancelled", "plan_id": plan_id}


# ─── Emergency Stop ───────────────────────────────────────────────────────────

@router.post("/emergency-stop", summary="TRIGGER EMERGENCY STOP")
def trigger_stop(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    IMMEDIATE EMERGENCY STOP:
    Halts all pending local actions, cancels browser automation, locks tool execution.
    """
    res = trigger_emergency_stop(db, current_user.id)
    # Cancel running plans
    db.query(ActionPlan).filter(
        ActionPlan.user_id == current_user.id,
        ActionPlan.status.in_(["running", "paused_for_takeover", "awaiting_confirmation"]),
    ).update({"status": "cancelled"})
    db.commit()

    return {
        "status": "STOPPED",
        "emergency_stop_active": True,
        "aborted_tasks_count": res.get("aborted_tasks_count", 0),
        "message": "EMERGENCY STOP TRIGGERED. All local operations halted and locked.",
    }


@router.post("/emergency-stop/reset", summary="Reset emergency stop")
def reset_stop(
    current_user: User = Depends(get_current_user),
):
    """Reset emergency stop status, allowing permitted actions to resume."""
    reset_emergency_stop(current_user.id)
    return {
        "status": "RESET",
        "emergency_stop_active": False,
        "message": "Emergency stop reset. Local operations permitted in accordance with permissions.",
    }


@router.get("/emergency-stop/status", summary="Get emergency stop status")
def get_emergency_status(
    current_user: User = Depends(get_current_user),
):
    """Return whether emergency stop is currently active."""
    return {"emergency_stop_active": is_emergency_stop_active(current_user.id)}


# ─── Gesture Control & Camera Privacy ─────────────────────────────────────────

@router.get("/gesture/preferences", summary="Get gesture and camera privacy settings")
def get_gesture_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get gesture preferences. Never record or store footage."""
    pref = db.query(GesturePreference).filter(GesturePreference.user_id == current_user.id).first()
    if not pref:
        return {
            "gesture_control_enabled": False,
            "camera_active": False,
            "gesture_mappings": {
                "open_palm": "pause_agent",
                "thumbs_up": "approve_low_risk",
                "swipe_left": "previous_card",
                "swipe_right": "next_card",
                "pinch": "select_element",
            },
            "privacy_notice": "Gestures are opt-in and processed locally in the browser/companion. Video is NEVER recorded or uploaded.",
        }

    return {
        "gesture_control_enabled": pref.gesture_control_enabled,
        "camera_active": pref.camera_active,
        "gesture_mappings": pref.gesture_mappings_json or {},
        "privacy_notice": "Gestures are opt-in and processed locally in the browser/companion. Video is NEVER recorded or uploaded.",
    }


@router.put("/gesture/preferences", summary="Update gesture preferences")
def update_gesture_settings(
    payload: GesturePreferenceIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update gesture settings. Gestures are strictly limited to low-risk actions."""
    pref = db.query(GesturePreference).filter(GesturePreference.user_id == current_user.id).first()
    default_mappings = {
        "open_palm": "pause_agent",
        "thumbs_up": "approve_low_risk",
        "swipe_left": "previous_card",
        "swipe_right": "next_card",
        "pinch": "select_element",
    }
    if not pref:
        pref = GesturePreference(
            user_id=current_user.id,
            gesture_control_enabled=payload.gesture_control_enabled,
            camera_active=payload.camera_active,
            gesture_mappings_json=payload.gesture_mappings or default_mappings,
        )
        db.add(pref)
    else:
        pref.gesture_control_enabled = payload.gesture_control_enabled
        pref.camera_active = payload.camera_active
        if payload.gesture_mappings:
            pref.gesture_mappings_json = payload.gesture_mappings

    db.commit()
    return {
        "status": "updated",
        "gesture_control_enabled": pref.gesture_control_enabled,
        "camera_active": pref.camera_active,
    }


@router.post("/gesture/trigger", summary="Trigger action via recognized gesture")
def trigger_gesture(
    payload: GestureTriggerIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Execute low-risk interaction triggered by gesture.
    CRITICAL SECURITY RULE:
    Gestures can NEVER authorize payments, file deletion, email send, or system setting changes.
    """
    pref = db.query(GesturePreference).filter(GesturePreference.user_id == current_user.id).first()
    if not pref or not pref.gesture_control_enabled:
        raise HTTPException(status_code=400, detail="Gesture control is disabled.")

    gesture = payload.gesture.lower()
    mappings = pref.gesture_mappings_json or {}
    action = mappings.get(gesture)

    # Disallow high-risk operations
    high_risk_actions = ["delete_file", "send_email", "purchase", "install_software", "modify_system"]
    if action in high_risk_actions or (payload.target_action and payload.target_action in high_risk_actions):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Gestures CANNOT be used to authorize high-risk or critical actions. Explicit UI confirmation required.",
        )

    return {
        "status": "acknowledged",
        "gesture": gesture,
        "action_executed": action,
        "is_low_risk": True,
    }


# ─── Audit & Activity Monitor ─────────────────────────────────────────────────

@router.get("/audit-logs", summary="List local action audit logs with privacy indicators")
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """View real-time audit trail of all local actions and their privacy scopes."""
    logs = (
        db.query(DesktopTaskExecution)
        .filter(DesktopTaskExecution.user_id == current_user.id)
        .order_by(DesktopTaskExecution.executed_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": l.id,
            "tool_name": l.tool_name,
            "action_type": l.action_type,
            "status": l.status,
            "risk_level": l.risk_level,
            "privacy_scope": l.privacy_scope,
            "duration_ms": l.duration_ms,
            "requires_confirmation": l.requires_confirmation,
            "confirmed_by_user": l.confirmed_by_user,
            "error_message": l.error_message,
            "output_summary": l.output_summary,
            "executed_at": l.executed_at.isoformat() if l.executed_at else None,
        }
        for l in logs
    ]
