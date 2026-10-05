"""
Audit Service — Phase 4

Records non-sensitive user activity for transparency and compliance.
NEVER stores: raw API keys, passwords, auth tokens, private data content.
"""

import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import AuditEvent

logger = logging.getLogger(__name__)


def log_event(
    db: Session,
    user_id: int,
    category: str,
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    resource_name: Optional[str] = None,
    success: bool = True,
    error_summary: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> Optional[AuditEvent]:
    """
    Record an audit event. Silently fails so it never breaks the main operation.
    Call this after performing any significant user action.
    """
    try:
        event = AuditEvent(
            user_id=user_id,
            category=category,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id is not None else None,
            resource_name=resource_name,
            success=success,
            error_summary=error_summary[:500] if error_summary else None,
            metadata_json=metadata,
            ip_address=ip_address,
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event
    except Exception as e:
        logger.warning(f"Failed to log audit event ({action}): {e}")
        try:
            db.rollback()
        except Exception:
            pass
        return None


# Alias for backward-compatibility
record_audit_event = log_event

