from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import ResearchProject, User
from app.schemas.schemas import (
    DeepResearchRequest, DeepResearchResult,
    ScholarlySearchRequest, ScholarlySearchResponse,
    ResearchProjectCreate, ResearchProjectResponse
)
from app.services.research_engine import research_engine
from app.services.academic_sources import academic_source_service

router = APIRouter(prefix="/research", tags=["Deep Research"])

@router.post("/execute", response_model=DeepResearchResult)
async def run_deep_research(
    req: DeepResearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Executes deep academic research pipeline:
    - Breaks question into sub-questions
    - Searches real academic APIs (arXiv, OpenAlex, Crossref, Semantic Scholar)
    - Synthesizes findings with inline citations & evidence distinction
    - Persists project to database
    """
    result = await research_engine.execute_deep_research(
        topic=req.topic,
        depth=req.depth,
        sources=req.sources,
        custom_instructions=req.custom_instructions
    )
    
    # Save project entry to database scoped to current user
    project = ResearchProject(
        user_id=current_user.id,
        title=f"Research: {req.topic[:60]}",
        topic=req.topic,
        depth=req.depth,
        sources_config=req.sources,
        summary=result["summary"],
        findings_json=result["findings"],
        citations_json=result["citations"],
        status="completed"
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    return DeepResearchResult(
        id=project.id,
        title=project.title,
        topic=project.topic,
        depth=project.depth,
        sub_questions=result.get("sub_questions", []),
        summary=project.summary or "",
        findings=project.findings_json or [],
        citations=project.citations_json or [],
        sources_analyzed=result.get("sources_analyzed", 0),
        status=project.status,
        created_at=project.created_at
    )

@router.post("/search-sources", response_model=ScholarlySearchResponse)
async def search_academic_sources(req: ScholarlySearchRequest):
    """Directly queries academic repositories without full report synthesis."""
    papers = await academic_source_service.search_papers(
        query=req.query,
        sources=req.sources,
        limit_per_source=req.limit_per_source or 5
    )
    return ScholarlySearchResponse(
        query=req.query,
        total_found=len(papers),
        results=papers
    )

@router.get("/projects", response_model=List[ResearchProjectResponse])
def get_research_projects(
    query: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve saved research projects from the database scoped to current user."""
    q = db.query(ResearchProject).filter(ResearchProject.user_id == current_user.id)
    if query:
        q = q.filter(ResearchProject.topic.ilike(f"%{query}%") | ResearchProject.title.ilike(f"%{query}%"))
    projects = q.order_by(ResearchProject.created_at.desc()).all()
    return projects

@router.get("/projects/{project_id}", response_model=ResearchProjectResponse)
def get_research_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve a single saved research project by ID, verifying user ownership."""
    project = db.query(ResearchProject).filter(ResearchProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Research project not found")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this research project")
    return project

@router.post("/projects", response_model=ResearchProjectResponse)
def save_research_project(
    project_in: ResearchProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Explicitly save a research report to the library."""
    project = ResearchProject(
        user_id=current_user.id,
        title=project_in.title,
        topic=project_in.topic,
        depth=project_in.depth,
        sources_config=project_in.sources_config,
        summary=project_in.summary,
        findings_json=project_in.findings_json,
        citations_json=project_in.citations_json,
        status="completed"
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.delete("/projects/{project_id}")
def delete_research_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a research project from the database, verifying user ownership."""
    project = db.query(ResearchProject).filter(ResearchProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Research project not found")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this research project")
    db.delete(project)
    db.commit()
    return {"message": "Research project deleted successfully", "id": project_id}
