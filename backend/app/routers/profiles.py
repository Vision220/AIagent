from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import ResearchProfile
from app.schemas.schemas import (
    ResearchProfileCreate, ResearchProfileUpdate, ResearchProfileResponse
)
from app.services.monitoring_scheduler import monitoring_scheduler

router = APIRouter(prefix="/profiles", tags=["Research Profiles"])

DEMO_USER_ID = 1

@router.get("/", response_model=List[ResearchProfileResponse])
def get_research_profiles(db: Session = Depends(get_db)):
    """Retrieve all research profiles for the current user."""
    profiles = db.query(ResearchProfile).filter(
        ResearchProfile.user_id == DEMO_USER_ID
    ).order_by(ResearchProfile.created_at.desc()).all()
    return profiles

@router.post("/", response_model=ResearchProfileResponse, status_code=status.HTTP_201_CREATED)
def create_research_profile(profile_in: ResearchProfileCreate, db: Session = Depends(get_db)):
    """Create a new research profile / interest collection."""
    profile = ResearchProfile(
        user_id=DEMO_USER_ID,
        name=profile_in.name,
        description=profile_in.description,
        is_active=True,
        topics_json=profile_in.topics,
        keywords_json=profile_in.keywords,
        domains_json=profile_in.domains or [],
        pub_types_json=profile_in.pub_types or ["preprints", "journal_articles"],
        sources_json=profile_in.sources or ["arxiv", "openalex", "crossref", "semantic_scholar"],
        date_range_days=profile_in.date_range_days or 30,
        language=profile_in.language or "en",
        min_relevance=profile_in.min_relevance or "Medium",
        frequency=profile_in.frequency or "daily"
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

@router.get("/{profile_id}", response_model=ResearchProfileResponse)
def get_research_profile(profile_id: int, db: Session = Depends(get_db)):
    """Get single research profile by ID."""
    profile = db.query(ResearchProfile).filter(
        ResearchProfile.id == profile_id,
        ResearchProfile.user_id == DEMO_USER_ID
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Research profile not found")
    return profile

@router.put("/{profile_id}", response_model=ResearchProfileResponse)
def update_research_profile(
    profile_id: int,
    profile_in: ResearchProfileUpdate,
    db: Session = Depends(get_db)
):
    """Update research profile configuration."""
    profile = db.query(ResearchProfile).filter(
        ResearchProfile.id == profile_id,
        ResearchProfile.user_id == DEMO_USER_ID
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Research profile not found")

    if profile_in.name is not None:
        profile.name = profile_in.name
    if profile_in.description is not None:
        profile.description = profile_in.description
    if profile_in.is_active is not None:
        profile.is_active = profile_in.is_active
    if profile_in.topics is not None:
        profile.topics_json = profile_in.topics
    if profile_in.keywords is not None:
        profile.keywords_json = profile_in.keywords
    if profile_in.domains is not None:
        profile.domains_json = profile_in.domains
    if profile_in.pub_types is not None:
        profile.pub_types_json = profile_in.pub_types
    if profile_in.sources is not None:
        profile.sources_json = profile_in.sources
    if profile_in.date_range_days is not None:
        profile.date_range_days = profile_in.date_range_days
    if profile_in.language is not None:
        profile.language = profile_in.language
    if profile_in.min_relevance is not None:
        profile.min_relevance = profile_in.min_relevance
    if profile_in.frequency is not None:
        profile.frequency = profile_in.frequency

    db.commit()
    db.refresh(profile)
    return profile

@router.post("/{profile_id}/pause", response_model=ResearchProfileResponse)
def pause_research_profile(profile_id: int, db: Session = Depends(get_db)):
    """Pause automated monitoring for a profile."""
    profile = db.query(ResearchProfile).filter(
        ResearchProfile.id == profile_id,
        ResearchProfile.user_id == DEMO_USER_ID
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Research profile not found")
    profile.is_active = False
    db.commit()
    db.refresh(profile)
    return profile

@router.post("/{profile_id}/resume", response_model=ResearchProfileResponse)
def resume_research_profile(profile_id: int, db: Session = Depends(get_db)):
    """Resume automated monitoring for a profile."""
    profile = db.query(ResearchProfile).filter(
        ResearchProfile.id == profile_id,
        ResearchProfile.user_id == DEMO_USER_ID
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Research profile not found")
    profile.is_active = True
    db.commit()
    db.refresh(profile)
    return profile

@router.delete("/{profile_id}")
def delete_research_profile(profile_id: int, db: Session = Depends(get_db)):
    """Delete a research profile and its monitoring data."""
    profile = db.query(ResearchProfile).filter(
        ResearchProfile.id == profile_id,
        ResearchProfile.user_id == DEMO_USER_ID
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Research profile not found")
    db.delete(profile)
    db.commit()
    return {"message": "Research profile deleted successfully", "id": profile_id}

@router.post("/{profile_id}/run")
async def trigger_profile_monitoring(profile_id: int, db: Session = Depends(get_db)):
    """Manually trigger scholarly paper discovery for a profile."""
    profile = db.query(ResearchProfile).filter(
        ResearchProfile.id == profile_id,
        ResearchProfile.user_id == DEMO_USER_ID
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Research profile not found")

    result = await monitoring_scheduler.run_profile_job(profile.id, triggered_by="manual")
    return result
