"""
Orchestrator Router — Phase 6

Unified task lifecycle and orchestration endpoints:
- Task initiation, progress streaming, real step tracking
- Instant cancellation throughout the tool tree
- Automated citation validation metrics
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User
from app.services.agent_orchestrator import agent_orchestrator
from app.services.citation_validator import validate_citations_batch

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orchestrator", tags=["Unified Agent Orchestrator"])


class TaskRunRequest(BaseModel):
    goal: str
    save_to_library: bool = False
    options: Optional[Dict[str, Any]] = None


class CitationValidationRequest(BaseModel):
    citations: List[Dict[str, Any]]
    retrieved_evidence: Optional[List[Dict[str, Any]]] = None


@router.post("/run", summary="Execute end-to-end task through unified orchestrator")
async def run_orchestrated_task(
    req: TaskRunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Executes a complete end-to-end task through the unified agent orchestrator:
    - Intent understanding & step planning
    - Tool execution with loop protection & cost limits
    - Citation validation & evidence grounding
    - Optional library persistence
    """
    if not req.goal.strip():
        raise HTTPException(status_code=400, detail="Goal cannot be empty.")

    opts = req.options or {}
    opts["save_to_library"] = req.save_to_library

    task_state = await agent_orchestrator.execute_task(
        user_id=current_user.id,
        goal=req.goal,
        db=db,
        options=opts,
    )
    return task_state.to_dict()


@router.get("/tasks/{task_id}", summary="Get orchestrated task state")
def get_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user),
):
    """Retrieve real-time task status, progress, tools used, and verification metrics."""
    task = agent_orchestrator.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    if task.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to inspect this task.")
    return task.to_dict()


@router.post("/tasks/{task_id}/cancel", summary="Cancel running task")
def cancel_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
):
    """Cancel an ongoing or queued task immediately."""
    success = agent_orchestrator.cancel_task(task_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found or not owned by user.")
    return {"status": "CANCELLED", "task_id": task_id, "message": "Task execution cancelled."}


@router.get("/tasks", summary="List user orchestrated tasks")
def list_tasks(
    current_user: User = Depends(get_current_user),
):
    """List recent orchestrated tasks for the authenticated user."""
    return agent_orchestrator.list_user_tasks(current_user.id)


@router.post("/validate-citations", summary="Validate academic citations against evidence")
def validate_citations_endpoint(
    req: CitationValidationRequest,
):
    """Standalone citation verification layer."""
    return validate_citations_batch(req.citations, req.retrieved_evidence)
