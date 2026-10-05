"""
Natural-Language Action Planner Service — Phase 5

Decomposes high-level user goals into structured, typed action plans:
- Identifies tool names, input arguments, required permissions, and risk levels
- Flags steps requiring user confirmation
- Reuses existing Phase 2 & Phase 3 research engines without duplicating functionality
"""

import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.models import ActionPlan, DesktopTaskExecution

logger = logging.getLogger(__name__)


def plan_goal(goal: str, user_id: int) -> Dict[str, Any]:
    """
    Decompose a natural language user goal into a sequence of typed, safe execution steps.
    """
    lower = goal.lower()
    steps: List[Dict[str, Any]] = []

    # Detect search & research intent
    if any(k in lower for k in ["find", "search", "papers on", "research", "literature"]):
        # Step 1: Search academic sources
        steps.append({
            "step_id": 1,
            "title": "Search Academic Repositories",
            "tool_name": "search_papers",
            "arguments": {"query": goal[:120], "limit": 5},
            "required_permission": "BROWSER_READ",
            "risk_level": "LOW",
            "confirmation_required": False,
            "status": "pending",
            "privacy_scope": "LOCAL_ONLY"
        })

        # Step 2: Compare and summarize findings
        steps.append({
            "step_id": 2,
            "title": "Synthesize & Compare Findings",
            "tool_name": "start_research",
            "arguments": {"topic": goal[:120], "depth": "standard"},
            "required_permission": "BROWSER_READ",
            "risk_level": "LOW",
            "confirmation_required": False,
            "status": "pending",
            "privacy_scope": "SENT_TO_AI_PROVIDER"
        })

    # Detect local file / PDF processing intent
    elif any(k in lower for k in ["pdf", "local file", "document", "summarize file", "read file"]):
        steps.append({
            "step_id": 1,
            "title": "Read & Parse Local Document",
            "tool_name": "read_local_file",
            "arguments": {"file_name": "selected_document.pdf"},
            "required_permission": "FILE_READ",
            "risk_level": "MEDIUM",
            "confirmation_required": True,
            "status": "pending",
            "privacy_scope": "LOCAL_ONLY"
        })
        steps.append({
            "step_id": 2,
            "title": "Generate Document Summary",
            "tool_name": "start_research",
            "arguments": {"topic": "Local document synthesis", "depth": "quick"},
            "required_permission": "BROWSER_READ",
            "risk_level": "LOW",
            "confirmation_required": False,
            "status": "pending",
            "privacy_scope": "SENT_TO_AI_PROVIDER"
        })

    # Detect browser navigation intent
    elif any(k in lower for k in ["open website", "navigate to", "check page", "open url"]):
        import re
        url_match = re.search(r"https?://[^\s]+", goal)
        target_url = url_match.group(0) if url_match else "https://arxiv.org"

        steps.append({
            "step_id": 1,
            "title": f"Open & Inspect Webpage",
            "tool_name": "browser_navigate",
            "arguments": {"url": target_url},
            "required_permission": "BROWSER_CONTROL",
            "risk_level": "LOW",
            "confirmation_required": False,
            "status": "pending",
            "privacy_scope": "LOCAL_ONLY"
        })

    # Detect alert / monitoring check
    elif "alert" in lower or "notification" in lower:
        steps.append({
            "step_id": 1,
            "title": "Retrieve Unread Research Alerts",
            "tool_name": "list_alerts",
            "arguments": {"unread_only": True, "limit": 5},
            "required_permission": "BROWSER_READ",
            "risk_level": "LOW",
            "confirmation_required": False,
            "status": "pending",
            "privacy_scope": "LOCAL_ONLY"
        })

    # General fallback: Deep research plan
    else:
        steps.append({
            "step_id": 1,
            "title": f"Investigate Hypothesis: {goal[:60]}...",
            "tool_name": "start_research",
            "arguments": {"topic": goal, "depth": "standard"},
            "required_permission": "BROWSER_READ",
            "risk_level": "LOW",
            "confirmation_required": False,
            "status": "pending",
            "privacy_scope": "SENT_TO_AI_PROVIDER"
        })

    # If user mentioned saving papers, add save step
    if any(k in lower for k in ["save", "keep", "library", "bookmark"]):
        steps.append({
            "step_id": len(steps) + 1,
            "title": "Save Top Relevant Publications to Library",
            "tool_name": "save_paper",
            "arguments": {"title": f"Research synthesis: {goal[:60]}", "collection_name": "Auto-Saved"},
            "required_permission": "FILE_WRITE",
            "risk_level": "LOW",
            "confirmation_required": False,
            "status": "pending",
            "privacy_scope": "LOCAL_ONLY"
        })

    has_elevated_risks = any(s["risk_level"] in ["HIGH", "CRITICAL"] or s["confirmation_required"] for s in steps)

    return {
        "title": f"Plan: {goal[:50]}",
        "natural_language_goal": goal,
        "steps": steps,
        "step_count": len(steps),
        "requires_confirmation": has_elevated_risks or len(steps) > 1,
        "initial_status": "awaiting_confirmation" if has_elevated_risks or len(steps) > 1 else "ready"
    }


def create_and_store_plan(db: Session, user_id: int, goal: str) -> ActionPlan:
    """Generate plan and persist in action_plans database table."""
    planned = plan_goal(goal, user_id)
    plan = ActionPlan(
        user_id=user_id,
        title=planned["title"],
        natural_language_goal=goal,
        steps_json=planned["steps"],
        status=planned["initial_status"],
        requires_user_takeover=False
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan
