"""
Permission Service — Phase 4

Capability-based permission management and enforcement for plugins and agent tools.
Enforces:
- LOW: public data reads, auto-granted on plugin install
- MEDIUM: user data / external network, requires user consent
- HIGH: external account / private data, requires explicit confirmation
- CRITICAL: destructive / computer control, NEVER auto-granted, always requires confirmation
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.models import PermissionGrant, UserPluginInstall, PluginManifest, AuditEvent
from app.services.plugin_registry import CAPABILITY_LEVELS

logger = logging.getLogger(__name__)

# Sensitive capabilities that require explicit confirmation before execution
CONFIRMATION_REQUIRED_CAPABILITIES = {
    "email_send",
    "calendar_write",
    "local_file_access",
    "computer_control",
    "destructive_action"
}

def get_user_granted_capabilities(db: Session, user_id: int) -> set:
    """
    Get all active granted capabilities for a user across all installed and enabled plugins.
    """
    grants = db.query(PermissionGrant).filter(
        PermissionGrant.user_id == user_id,
        PermissionGrant.is_active == True
    ).all()
    
    granted = {g.capability for g in grants}
    
    # Also check user plugin installs
    installs = db.query(UserPluginInstall).filter(
        UserPluginInstall.user_id == user_id,
        UserPluginInstall.is_installed == True,
        UserPluginInstall.is_enabled == True
    ).all()
    
    for inst in installs:
        for cap in (inst.granted_capabilities_json or []):
            granted.add(cap)
            
    return granted

def check_capability_permission(
    db: Session,
    user_id: int,
    required_capability: Optional[str]
) -> Tuple[bool, Optional[str]]:
    """
    Check if user has granted permission for a capability.
    If required_capability is None or empty, permission is granted (built-in safe tool).
    """
    if not required_capability:
        return True, None
        
    level = CAPABILITY_LEVELS.get(required_capability, "MEDIUM")
    
    # Critical capabilities are blocked in Phase 4 unless special platform override
    if level == "CRITICAL":
        return False, f"Capability '{required_capability}' is classified as CRITICAL and is disabled in this phase."

    # LOW risk level capabilities (public academic research/search) are auto-permitted for core tools
    if level == "LOW":
        return True, None
        
    granted_caps = get_user_granted_capabilities(db, user_id)
    if required_capability in granted_caps:
        return True, None
        
    return False, f"Missing required capability '{required_capability}' (level: {level}). Please grant permission or enable the associated plugin."

def grant_capability(
    db: Session,
    user_id: int,
    capability: str,
    plugin_id: Optional[int] = None
) -> PermissionGrant:
    """
    Grant a capability to a user.
    """
    level = CAPABILITY_LEVELS.get(capability, "MEDIUM")
    
    grant = db.query(PermissionGrant).filter(
        PermissionGrant.user_id == user_id,
        PermissionGrant.capability == capability,
        PermissionGrant.plugin_id == plugin_id
    ).first()
    
    if grant:
        grant.is_active = True
        grant.revoked_at = None
    else:
        grant = PermissionGrant(
            user_id=user_id,
            plugin_id=plugin_id,
            capability=capability,
            permission_level=level,
            is_active=True
        )
        db.add(grant)
        
    db.commit()
    db.refresh(grant)
    return grant

def revoke_capability(
    db: Session,
    user_id: int,
    capability: str,
    plugin_id: Optional[int] = None
) -> bool:
    """
    Revoke a capability from a user.
    """
    from datetime import datetime, timezone
    
    query = db.query(PermissionGrant).filter(
        PermissionGrant.user_id == user_id,
        PermissionGrant.capability == capability
    )
    if plugin_id:
        query = query.filter(PermissionGrant.plugin_id == plugin_id)
        
    grants = query.all()
    if not grants:
        return False
        
    for g in grants:
        g.is_active = False
        g.revoked_at = datetime.now(timezone.utc)
        
    # Also remove from UserPluginInstall if applicable
    if plugin_id:
        install = db.query(UserPluginInstall).filter(
            UserPluginInstall.user_id == user_id,
            UserPluginInstall.plugin_id == plugin_id
        ).first()
        if install and install.granted_capabilities_json:
            new_caps = [c for c in install.granted_capabilities_json if c != capability]
            install.granted_capabilities_json = new_caps
            
    db.commit()
    return True
