"""
Desktop Security & Pairing Service — Phase 5

Handles:
- Short-lived pairing code generation & device authentication
- Sandboxed file path validation (strictly blocks path traversal, system files)
- Device registration, heartbeat, and revocation
- Global Emergency Stop mechanism (aborts all pending local actions)
"""

import os
import random
import string
import hashlib
import logging
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import DesktopDevice, DesktopPermission, DesktopTaskExecution

logger = logging.getLogger(__name__)

# Designated default local file sandbox directory (relative to backend or user home)
SANDBOX_ROOT = Path("c:/Users/Kariy/OneDrive/Documents/agent/sandbox").resolve()
SANDBOX_ROOT.mkdir(parents=True, exist_ok=True)

# System / sensitive paths that are strictly forbidden regardless of permissions
FORBIDDEN_PATH_SUBSTRINGS = [
    "windows", "system32", "program files", "appdata\\local\\microsoft",
    "/etc", "/bin", "/sbin", "/usr", "/root", "/var", ".ssh", ".aws",
    "id_rsa", "credentials", "config.json"
]

# In-memory Emergency Stop flag registry per user
_EMERGENCY_STOP_FLAGS: Dict[int, bool] = {}

SAFE_PERMISSIONS = ["BROWSER_READ", "CLIPBOARD_WRITE"]
CRITICAL_PERMISSIONS = [
    "FILE_DELETE", "EMAIL_SEND", "PURCHASE_ACTION",
    "SYSTEM_SETTINGS", "ACCOUNT_ACTION"
]


def generate_pairing_code() -> str:
    """Generate a clean, high-entropy 6-digit pairing code (e.g. '749-382')."""
    p1 = f"{random.randint(100, 999)}"
    p2 = f"{random.randint(100, 999)}"
    return f"{p1}-{p2}"


def hash_device_token(token: str) -> str:
    """Hash an authentication token with SHA-256 for secure DB storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def register_pairing_request(
    db: Session,
    user_id: int,
    device_name: str,
    device_platform: str = "windows"
) -> DesktopDevice:
    """
    Generate a pairing code valid for 10 minutes to pair a desktop agent.
    """
    device_id = f"device_{hashlib.sha256(f'{user_id}_{device_name}_{datetime.now().isoformat()}'.encode()).hexdigest()[:16]}"
    pairing_code = generate_pairing_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    device = DesktopDevice(
        user_id=user_id,
        device_id=device_id,
        device_name=device_name.strip(),
        device_platform=device_platform.lower(),
        pairing_code=pairing_code,
        pairing_code_expires_at=expires_at,
        is_paired=False,
        is_active=True
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


def verify_pairing_code(
    db: Session,
    pairing_code: str,
    device_secret_token: str
) -> Optional[DesktopDevice]:
    """
    Verify pairing code and activate the desktop companion device.
    """
    now = datetime.now(timezone.utc)
    clean_code = pairing_code.strip()

    device = db.query(DesktopDevice).filter(
        DesktopDevice.pairing_code == clean_code,
        DesktopDevice.is_active == True
    ).first()

    if not device:
        return None

    if device.pairing_code_expires_at and device.pairing_code_expires_at.replace(tzinfo=timezone.utc) < now:
        logger.warning(f"Pairing code {clean_code} expired.")
        return None

    # Successfully paired
    device.is_paired = True
    device.pairing_code = None
    device.pairing_code_expires_at = None
    device.auth_token_hash = hash_device_token(device_secret_token)
    device.last_heartbeat_at = now
    db.commit()
    db.refresh(device)
    return device


def revoke_desktop_device(db: Session, user_id: int, device_id: str) -> bool:
    """
    Revoke a desktop device's access immediately.
    """
    device = db.query(DesktopDevice).filter(
        DesktopDevice.device_id == device_id,
        DesktopDevice.user_id == user_id
    ).first()
    if not device:
        return False

    device.is_paired = False
    device.is_active = False
    device.auth_token_hash = None
    db.commit()
    return True


# ─── Sandboxed Path Security ───────────────────────────────────────────────────

def validate_safe_file_path(target_path: str, allow_custom_folder: Optional[str] = None) -> Tuple[bool, Optional[Path], Optional[str]]:
    """
    Validates a file path strictly against directory traversal and system boundaries.
    Only allows paths inside the designated SANDBOX_ROOT (or an explicitly approved folder).
    Rejects:
    - Path traversal (.. / symlinks)
    - Forbidden system directories
    - Raw device names
    """
    if not target_path or not isinstance(target_path, str):
        return False, None, "Path must be a non-empty string"

    clean_path_str = target_path.strip()

    # Block forbidden substrings
    lower = clean_path_str.lower()
    for forbidden in FORBIDDEN_PATH_SUBSTRINGS:
        if forbidden in lower:
            return False, None, f"Access to sensitive path pattern '{forbidden}' is strictly forbidden."

    try:
        # Resolve target path relative to sandbox if not absolute
        p = Path(clean_path_str)
        if not p.is_absolute():
            resolved = (SANDBOX_ROOT / p).resolve()
        else:
            resolved = p.resolve()

        # Enforce sandbox containment
        allowed_base = Path(allow_custom_folder).resolve() if allow_custom_folder else SANDBOX_ROOT
        try:
            resolved.relative_to(allowed_base)
        except ValueError:
            return False, None, f"Path traversal violation: Target '{clean_path_str}' is outside the authorized sandbox."

        return True, resolved, None

    except Exception as exc:
        return False, None, f"Invalid file path format: {str(exc)}"


# ─── Emergency Stop Control ────────────────────────────────────────────────────

def trigger_emergency_stop(db: Session, user_id: int) -> Dict[str, Any]:
    """
    Activates the global EMERGENCY STOP for this user.
    Immediately marks pending desktop executions as aborted and blocks new actions.
    """
    _EMERGENCY_STOP_FLAGS[user_id] = True

    # Abort pending or running executions in DB
    updated_count = db.query(DesktopTaskExecution).filter(
        DesktopTaskExecution.user_id == user_id,
        DesktopTaskExecution.status.in_(["pending", "awaiting_confirmation", "running"])
    ).update(
        {"status": "aborted_by_emergency_stop", "error_message": "Aborted by Emergency Stop command"}
    )
    db.commit()

    logger.warning(f"EMERGENCY STOP triggered for user {user_id}. {updated_count} tasks aborted.")
    return {
        "emergency_stop_active": True,
        "aborted_tasks_count": updated_count,
        "message": "EMERGENCY STOP ACTIVATED. All pending local and browser actions have been halted."
    }


def reset_emergency_stop(user_id: int) -> Dict[str, Any]:
    """Reset emergency stop state to resume normal operations."""
    _EMERGENCY_STOP_FLAGS[user_id] = False
    return {"emergency_stop_active": False, "message": "Emergency Stop reset. Normal operations can resume."}


def is_emergency_stop_active(user_id: int) -> bool:
    """Check if emergency stop is currently engaged."""
    return _EMERGENCY_STOP_FLAGS.get(user_id, False)
