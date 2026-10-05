from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import (
    PublicationAlert, NotificationAlert, ResearchProfile, DiscoveredPublication, User
)
from app.schemas.schemas import (
    PublicationAlertCreate, PublicationAlertResponse,
    NotificationAlertResponse, DiscoveredPublicationResponse
)
from app.services.alerts import alert_service

router = APIRouter(prefix="/alerts", tags=["Research Alerts"])

@router.get("/", response_model=List[NotificationAlertResponse])
def get_alerts(
    unread_only: bool = False,
    relevance: Optional[str] = None,
    profile_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve real smart notifications and publication alerts from the database."""
    q = db.query(NotificationAlert, ResearchProfile, DiscoveredPublication).outerjoin(
        ResearchProfile, NotificationAlert.profile_id == ResearchProfile.id
    ).outerjoin(
        DiscoveredPublication, NotificationAlert.publication_id == DiscoveredPublication.id
    ).filter(
        NotificationAlert.user_id == current_user.id
    )

    if unread_only:
        q = q.filter(NotificationAlert.is_read == False)
    if relevance and relevance != "All":
        q = q.filter(NotificationAlert.relevance_category == relevance)
    if profile_id:
        q = q.filter(NotificationAlert.profile_id == profile_id)

    alerts = q.order_by(NotificationAlert.created_at.desc()).limit(limit).all()

    output = []
    for alert, prof, pub in alerts:
        pub_resp = None
        if pub:
            pub_resp = DiscoveredPublicationResponse(
                id=pub.id,
                external_id=pub.external_id,
                title=pub.title,
                authors=pub.authors,
                journal_or_venue=pub.journal_or_venue,
                publication_year=pub.publication_year,
                publication_date=pub.publication_date,
                doi=pub.doi,
                url=pub.url,
                pdf_url=pub.pdf_url,
                abstract=pub.abstract,
                source_db=pub.source_db,
                citation_count=pub.citation_count,
                first_discovered_at=pub.first_discovered_at,
                last_checked_at=pub.last_checked_at
            )

        output.append(NotificationAlertResponse(
            id=alert.id,
            user_id=alert.user_id,
            profile_id=alert.profile_id,
            profile_name=prof.name if prof else "Research Profile",
            publication_id=alert.publication_id,
            title=alert.title,
            message=alert.message,
            relevance_category=alert.relevance_category,
            is_read=alert.is_read,
            created_at=alert.created_at,
            publication=pub_resp
        ))
    return output

@router.get("/unread-count")
def get_unread_alerts_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fast count of unread alerts for notification badge."""
    count = db.query(func.count(NotificationAlert.id)).filter(
        NotificationAlert.user_id == current_user.id,
        NotificationAlert.is_read == False
    ).scalar() or 0
    return {"unread_count": count}

@router.post("/{alert_id}/read")
def mark_alert_read(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a notification alert as read."""
    alert = db.query(NotificationAlert).filter(
        NotificationAlert.id == alert_id,
        NotificationAlert.user_id == current_user.id
    ).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    db.commit()
    return {"id": alert_id, "is_read": True}

@router.post("/read-all")
def mark_all_alerts_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all unread alerts for current user as read."""
    db.query(NotificationAlert).filter(
        NotificationAlert.user_id == current_user.id,
        NotificationAlert.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"success": True, "message": "All alerts marked as read"}

# Backward-compatibility for Phase 1 & 2 tests:
@router.post("/subscriptions", response_model=PublicationAlertResponse)
def create_subscription(
    alert_in: PublicationAlertCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = PublicationAlert(
        user_id=current_user.id,
        topic_query=alert_in.topic_query,
        keywords=alert_in.keywords,
        authors=alert_in.authors,
        frequency=alert_in.frequency
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert

@router.get("/feed")
def get_publication_feed():
    return {
        "is_demo": True,
        "feed_items": alert_service.get_demo_feed()
    }
