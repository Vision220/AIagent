from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import SavedPaper, User
from app.schemas.schemas import SavedPaperCreate, SavedPaperResponse

router = APIRouter(prefix="/library", tags=["Research Library"])

@router.get("/papers", response_model=List[SavedPaperResponse])
def get_saved_papers(
    collection: Optional[str] = None,
    query: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve saved papers scoped to current user with optional collection and title search filters."""
    q = db.query(SavedPaper).filter(SavedPaper.user_id == current_user.id)
    if collection and collection != "All":
        q = q.filter(SavedPaper.collection_name == collection)
    if query:
        q = q.filter(
            SavedPaper.paper_title.ilike(f"%{query}%") |
            SavedPaper.authors.ilike(f"%{query}%") |
            SavedPaper.journal_or_venue.ilike(f"%{query}%")
        )
    
    papers = q.order_by(SavedPaper.created_at.desc()).all()
    return papers

@router.post("/papers", response_model=SavedPaperResponse)
def save_paper(
    paper_in: SavedPaperCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a new paper to the authenticated user's research library."""
    paper = SavedPaper(
        user_id=current_user.id,
        **paper_in.model_dump()
    )
    db.add(paper)
    db.commit()
    db.refresh(paper)
    return paper

@router.put("/papers/{paper_id}", response_model=SavedPaperResponse)
def update_paper(
    paper_id: int,
    paper_in: SavedPaperCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update notes or collection for an existing paper, verifying user ownership."""
    paper = db.query(SavedPaper).filter(SavedPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    if paper.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this paper")
    
    for key, value in paper_in.model_dump().items():
        setattr(paper, key, value)
    
    db.commit()
    db.refresh(paper)
    return paper

@router.delete("/papers/{paper_id}")
def delete_paper(
    paper_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a paper from the research library, verifying user ownership."""
    paper = db.query(SavedPaper).filter(SavedPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    if paper.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this paper")
    db.delete(paper)
    db.commit()
    return {"message": "Paper removed from library", "id": paper_id}
