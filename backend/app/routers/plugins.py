"""
Plugins Router — Phase 4

Full plugin marketplace: list, install, uninstall, configure, toggle, permissions.
All endpoints are user-scoped. Users can only see/manage their own installations.
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import PluginManifest, UserPluginInstall, PermissionGrant, User
from app.services.plugin_registry import CAPABILITY_LEVELS, BUILT_IN_PLUGINS
from app.services.audit_service import log_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/plugins", tags=["Plugin Marketplace"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class PluginManifestOut(BaseModel):
    id: int
    slug: str
    name: str
    description: str
    long_description: Optional[str] = None
    version: str
    author: str
    category: str
    icon_name: Optional[str] = None
    capabilities_json: List[str] = []
    config_schema_json: Optional[Dict[str, Any]] = None
    data_access_description: Optional[str] = None
    privacy_notes: Optional[str] = None
    is_available: bool
    requires_api_key: bool
    is_built_in: bool
    availability_status: str
    # User-specific
    is_installed: bool = False
    is_enabled: bool = False
    has_config: bool = False

    class Config:
        from_attributes = True


class InstallPluginRequest(BaseModel):
    plugin_slug: str
    config: Optional[Dict[str, Any]] = None
    grant_capabilities: Optional[List[str]] = None


class UpdatePluginConfigRequest(BaseModel):
    config: Dict[str, Any]
    enabled: Optional[bool] = None


class GrantPermissionRequest(BaseModel):
    plugin_slug: str
    capabilities: List[str]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def mask_config(config: Optional[Dict[str, Any]], schema: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Replace secret config values with masked strings."""
    if not config or not schema:
        return config
    masked = dict(config)
    for field, field_def in schema.items():
        if isinstance(field_def, dict) and field_def.get("secret") and field in masked and masked[field]:
            val = str(masked[field])
            masked[field] = val[:4] + "•" * max(0, len(val) - 4) if len(val) > 4 else "••••"
    return masked


def _enrich_manifest(manifest: PluginManifest, install: Optional[UserPluginInstall] = None) -> Dict[str, Any]:
    out = {
        "id": manifest.id,
        "slug": manifest.slug,
        "name": manifest.name,
        "description": manifest.description,
        "long_description": manifest.long_description,
        "version": manifest.version,
        "author": manifest.author,
        "category": manifest.category,
        "icon_name": manifest.icon_name,
        "capabilities_json": manifest.capabilities_json or [],
        "config_schema_json": manifest.config_schema_json,
        "data_access_description": manifest.data_access_description,
        "privacy_notes": manifest.privacy_notes,
        "is_available": manifest.is_available,
        "requires_api_key": manifest.requires_api_key,
        "is_built_in": manifest.is_built_in,
        "availability_status": manifest.availability_status,
        "is_installed": False,
        "is_enabled": False,
        "has_config": False,
        "granted_capabilities": [],
    }
    if install:
        out["is_installed"] = install.is_installed
        out["is_enabled"] = install.is_enabled
        out["has_config"] = bool(install.config_json)
        out["config"] = mask_config(install.config_json, manifest.config_schema_json)
        out["granted_capabilities"] = install.granted_capabilities_json or []
    return out


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/", summary="List all plugins")
@router.get("/marketplace", summary="List all plugins in the marketplace")
def list_marketplace(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all registered plugins with user-specific install state."""
    user_id = current_user.id

    query = db.query(PluginManifest)
    if query.count() == 0:
        from app.services.plugin_registry import seed_plugin_manifests
        seed_plugin_manifests(db)
        query = db.query(PluginManifest)

    if category and category != "All":
        query = query.filter(PluginManifest.category == category)
    manifests = query.all()

    # Map installs by plugin_id
    installs = {
        i.plugin_id: i
        for i in db.query(UserPluginInstall).filter(
            UserPluginInstall.user_id == user_id,
            UserPluginInstall.is_installed == True,
        ).all()
    }

    results = []
    for manifest in manifests:
        if search:
            q = search.lower()
            if q not in manifest.name.lower() and q not in (manifest.description or "").lower():
                continue
        results.append(_enrich_manifest(manifest, installs.get(manifest.id)))

    return results


@router.get("/installed", summary="List user's installed plugins")
def list_installed(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return only installed (and enabled) plugins for this user."""
    user_id = current_user.id

    installs = db.query(UserPluginInstall).filter(
        UserPluginInstall.user_id == user_id,
        UserPluginInstall.is_installed == True,
    ).all()

    results = []
    for install in installs:
        manifest = db.query(PluginManifest).filter(PluginManifest.id == install.plugin_id).first()
        if manifest:
            results.append(_enrich_manifest(manifest, install))
    return results


@router.post("/install", summary="Install a plugin")
def install_plugin(
    req: InstallPluginRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Install a plugin for the current user.
    Only available (is_available=True) plugins can be installed.
    Config values are stored server-side; secrets are never returned unmasked.
    """
    user_id = current_user.id

    manifest = db.query(PluginManifest).filter(PluginManifest.slug == req.plugin_slug).first()
    if not manifest:
        raise HTTPException(status_code=404, detail=f"Plugin '{req.plugin_slug}' not found in registry")

    if not manifest.is_available:
        raise HTTPException(
            status_code=400,
            detail=f"Plugin '{manifest.name}' is not yet available ({manifest.availability_status})"
        )

    existing = db.query(UserPluginInstall).filter(
        UserPluginInstall.user_id == user_id,
        UserPluginInstall.plugin_id == manifest.id,
    ).first()

    if existing:
        existing.is_installed = True
        existing.is_enabled = True
        if req.config:
            existing.config_json = req.config
        if req.grant_capabilities:
            existing.granted_capabilities_json = [
                c for c in req.grant_capabilities if c in (manifest.capabilities_json or [])
            ]
        db.commit()
        install_record = existing
    else:
        granted = req.grant_capabilities or manifest.capabilities_json or []
        install_record = UserPluginInstall(
            user_id=user_id,
            plugin_id=manifest.id,
            is_installed=True,
            is_enabled=True,
            config_json=req.config,
            granted_capabilities_json=[c for c in granted if c in (manifest.capabilities_json or [])],
        )
        db.add(install_record)
        db.commit()
        db.refresh(install_record)

    # Grant capabilities as PermissionGrant records
    for cap in (install_record.granted_capabilities_json or []):
        exists_grant = db.query(PermissionGrant).filter(
            PermissionGrant.user_id == user_id,
            PermissionGrant.plugin_id == manifest.id,
            PermissionGrant.capability == cap,
            PermissionGrant.is_active == True,
        ).first()
        if not exists_grant:
            db.add(PermissionGrant(
                user_id=user_id,
                plugin_id=manifest.id,
                capability=cap,
                permission_level=CAPABILITY_LEVELS.get(cap, "LOW"),
            ))
    db.commit()

    log_event(
        db, user_id=user_id, category="plugin", action="plugin.install",
        resource_type="PluginManifest", resource_id=str(manifest.id),
        resource_name=manifest.name,
        ip_address=request.client.host if request.client else None,
    )

    return {
        "success": True,
        "message": f"Plugin '{manifest.name}' installed successfully.",
        "slug": manifest.slug,
        "is_installed": True,
        "is_enabled": True
    }


@router.post("/{slug}/uninstall", summary="Uninstall a plugin")
@router.delete("/{slug}/uninstall", summary="Uninstall a plugin")
@router.delete("/{slug}", summary="Uninstall a plugin")
def uninstall_plugin(
    slug: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Uninstall a plugin. Revokes all associated permission grants."""
    user_id = current_user.id

    manifest = db.query(PluginManifest).filter(PluginManifest.slug == slug).first()
    if not manifest:
        raise HTTPException(status_code=404, detail=f"Plugin '{slug}' not found")

    install = db.query(UserPluginInstall).filter(
        UserPluginInstall.user_id == user_id,
        UserPluginInstall.plugin_id == manifest.id,
    ).first()

    if not install or not install.is_installed:
        raise HTTPException(status_code=404, detail="Plugin not installed")

    install.is_installed = False
    install.is_enabled = False

    # Revoke all permission grants for this plugin
    from datetime import datetime, timezone
    db.query(PermissionGrant).filter(
        PermissionGrant.user_id == user_id,
        PermissionGrant.plugin_id == manifest.id,
        PermissionGrant.is_active == True,
    ).update({"is_active": False, "revoked_at": datetime.now(timezone.utc)})

    db.commit()

    log_event(
        db, user_id=user_id, category="plugin", action="plugin.uninstall",
        resource_type="PluginManifest", resource_id=str(manifest.id),
        resource_name=manifest.name,
        ip_address=request.client.host if request.client else None,
    )

    return {"success": True, "message": f"Plugin '{manifest.name}' uninstalled."}


@router.patch("/{slug}/toggle", summary="Enable or disable an installed plugin")
@router.post("/{slug}/toggle", summary="Enable or disable an installed plugin")
def toggle_plugin(
    slug: str,
    enabled: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    manifest = db.query(PluginManifest).filter(PluginManifest.slug == slug).first()
    if not manifest:
        raise HTTPException(status_code=404, detail="Plugin not found")
    install = db.query(UserPluginInstall).filter(
        UserPluginInstall.user_id == user_id,
        UserPluginInstall.plugin_id == manifest.id,
        UserPluginInstall.is_installed == True,
    ).first()
    if not install:
        raise HTTPException(status_code=404, detail="Plugin not installed")
    
    if enabled is None:
        install.is_enabled = not install.is_enabled
    else:
        install.is_enabled = enabled

    db.commit()
    return {"success": True, "slug": slug, "is_enabled": install.is_enabled}


@router.patch("/{slug}/configure", summary="Update plugin configuration")
def configure_plugin(
    slug: str,
    req: UpdatePluginConfigRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update plugin configuration. Config stored server-side; secrets never returned."""
    user_id = current_user.id
    manifest = db.query(PluginManifest).filter(PluginManifest.slug == slug).first()
    if not manifest:
        raise HTTPException(status_code=404, detail="Plugin not found")
    install = db.query(UserPluginInstall).filter(
        UserPluginInstall.user_id == user_id,
        UserPluginInstall.plugin_id == manifest.id,
        UserPluginInstall.is_installed == True,
    ).first()
    if not install:
        raise HTTPException(status_code=404, detail="Plugin not installed")
    install.config_json = req.config
    if req.enabled is not None:
        install.is_enabled = req.enabled
    db.commit()
    return {"success": True, "slug": slug, "config": mask_config(install.config_json, manifest.config_schema_json)}


@router.get("/{slug}", summary="Get plugin details")
def get_plugin_detail(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    manifest = db.query(PluginManifest).filter(PluginManifest.slug == slug).first()
    if not manifest:
        raise HTTPException(status_code=404, detail="Plugin not found")
    install = db.query(UserPluginInstall).filter(
        UserPluginInstall.user_id == user_id,
        UserPluginInstall.plugin_id == manifest.id,
        UserPluginInstall.is_installed == True,
    ).first()
    return _enrich_manifest(manifest, install)


@router.get("/permissions/list", summary="List all active permission grants for this user")
def list_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    grants = db.query(PermissionGrant).filter(
        PermissionGrant.user_id == user_id,
        PermissionGrant.is_active == True,
    ).all()
    result = []
    for g in grants:
        plugin_name = None
        if g.plugin_id:
            m = db.query(PluginManifest).filter(PluginManifest.id == g.plugin_id).first()
            plugin_name = m.name if m else None
        result.append({
            "id": g.id,
            "capability": g.capability,
            "permission_level": g.permission_level,
            "plugin_name": plugin_name,
            "granted_at": g.granted_at,
        })
    return result


@router.post("/permissions/{grant_id}/revoke", summary="Revoke a permission grant")
def revoke_permission(
    grant_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    from datetime import datetime, timezone
    grant = db.query(PermissionGrant).filter(
        PermissionGrant.id == grant_id,
        PermissionGrant.user_id == user_id,
    ).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Permission grant not found")
    grant.is_active = False
    grant.revoked_at = datetime.now(timezone.utc)
    db.commit()
    log_event(
        db, user_id=user_id, category="plugin", action="permission.revoke",
        resource_name=grant.capability,
        ip_address=request.client.host if request.client else None,
    )
    return {"success": True, "message": f"Permission '{grant.capability}' revoked."}
