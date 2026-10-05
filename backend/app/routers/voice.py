"""
Voice Assistant & Preferences Router — Phase 4

Supports browser-native speech integration:
- Voice preferences (language, speaking rate, auto-speak, voice selection)
- Spoken command interpretation into typed agent tools
- Voice safety enforcement: sensitive actions require explicit confirmation
"""

import re
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, VoicePreferences
from app.services.tool_registry import execute_tool
from app.services.audit_service import record_audit_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["Voice Assistant"])

# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class VoicePreferencesUpdate(BaseModel):
    voice_enabled: Optional[bool] = None
    speech_recognition_language: Optional[str] = Field(None, max_length=20)
    voice_output_enabled: Optional[bool] = None
    speaking_rate: Optional[float] = Field(None, ge=0.5, le=2.0)
    auto_speak_responses: Optional[bool] = None
    preferred_voice_name: Optional[str] = Field(None, max_length=100)

class VoiceCommandRequest(BaseModel):
    transcript: str = Field(..., min_length=1, max_length=1000)
    confirmed: bool = Field(default=False, description="Explicit confirmation for sensitive actions")

# Known sensitive patterns that require user confirmation
SENSITIVE_PATTERNS = [
    (r"\b(delete|remove|clear)\b", "Delete action"),
    (r"\b(send\s+email|email\s+send)\b", "Sending email"),
    (r"\b(install\s+plugin|uninstall\s+plugin)\b", "Modifying plugin installation"),
    (r"\b(connect\s+account|authenticate)\b", "Account connection"),
    (r"\b(format|reset|wipe)\b", "Data wipe"),
]

# ─── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/preferences")
def get_voice_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get user voice assistant preferences.
    """
    pref = db.query(VoicePreferences).filter(VoicePreferences.user_id == current_user.id).first()
    if not pref:
        return {
            "voice_enabled": False,
            "speech_recognition_language": "en-US",
            "voice_output_enabled": True,
            "speaking_rate": 1.0,
            "auto_speak_responses": False,
            "preferred_voice_name": None
        }
    return {
        "voice_enabled": pref.voice_enabled,
        "speech_recognition_language": pref.speech_recognition_language,
        "voice_output_enabled": pref.voice_output_enabled,
        "speaking_rate": pref.speaking_rate,
        "auto_speak_responses": pref.auto_speak_responses,
        "preferred_voice_name": pref.preferred_voice_name
    }


@router.put("/preferences")
def update_voice_preferences(
    req: VoicePreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update user voice assistant preferences.
    """
    pref = db.query(VoicePreferences).filter(VoicePreferences.user_id == current_user.id).first()
    if not pref:
        pref = VoicePreferences(user_id=current_user.id)
        db.add(pref)

    if req.voice_enabled is not None:
        pref.voice_enabled = req.voice_enabled
    if req.speech_recognition_language is not None:
        pref.speech_recognition_language = req.speech_recognition_language
    if req.voice_output_enabled is not None:
        pref.voice_output_enabled = req.voice_output_enabled
    if req.speaking_rate is not None:
        pref.speaking_rate = req.speaking_rate
    if req.auto_speak_responses is not None:
        pref.auto_speak_responses = req.auto_speak_responses
    if req.preferred_voice_name is not None:
        pref.preferred_voice_name = req.preferred_voice_name

    pref.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(pref)

    return {
        "success": True,
        "voice_enabled": pref.voice_enabled,
        "speech_recognition_language": pref.speech_recognition_language,
        "voice_output_enabled": pref.voice_output_enabled,
        "speaking_rate": pref.speaking_rate,
        "auto_speak_responses": pref.auto_speak_responses,
        "preferred_voice_name": pref.preferred_voice_name
    }


@router.post("/command")
async def process_voice_command(
    req: VoiceCommandRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Parse spoken transcript into a typed agent tool/action.
    Enforces voice safety: dangerous/sensitive actions require explicit confirmation.
    """
    transcript = req.transcript.strip()
    lower = transcript.lower()

    # Voice safety check: detect sensitive operations
    for pattern, description in SENSITIVE_PATTERNS:
        if re.search(pattern, lower):
            if not req.confirmed:
                return {
                    "interpreted_action": "sensitive_action",
                    "requires_confirmation": True,
                    "confirmation_prompt": f"This voice command involves a potentially sensitive action ({description}). Do you want to continue?",
                    "transcript": transcript,
                    "action_description": description
                }

    # Intent routing to registered typed tools
    tool_name = None
    args: Dict[str, Any] = {}

    if any(k in lower for k in ["show my alerts", "my alerts", "latest alerts", "unread alerts"]):
        tool_name = "list_alerts"
        args = {"unread_only": "unread" in lower, "limit": 5}

    elif any(k in lower for k in ["open my saved", "saved papers", "my library", "open library", "my papers"]):
        tool_name = "search_library"
        # Extract search query if specified e.g. "open my saved papers on transformer"
        match = re.search(r"(?:on|about|for)\s+(.+)", lower)
        args = {"query": match.group(1).strip() if match else ""}

    elif any(k in lower for k in ["start deep research", "deep research on", "start research", "research on"]):
        tool_name = "start_research"
        match = re.search(r"(?:on|about|for)\s+(.+)", lower)
        topic = match.group(1).strip() if match else transcript
        args = {"topic": topic, "depth": "deep" if "deep" in lower else "standard"}

    elif any(k in lower for k in ["search papers", "search for", "find papers", "research the latest papers"]):
        tool_name = "search_papers"
        match = re.search(r"(?:on|about|for)\s+(.+)", lower)
        query = match.group(1).strip() if match else transcript
        args = {"query": query, "limit": 5}

    elif any(k in lower for k in ["delete paper", "remove paper"]):
        tool_name = "delete_saved_paper"
        match = re.search(r"(?:paper|id)\s+(\d+)", lower)
        if match:
            args = {"paper_id": int(match.group(1))}
        else:
            return {
                "interpreted_action": "delete_saved_paper",
                "success": False,
                "error": "Could not identify paper ID from voice command."
            }

    if tool_name:
        exec_res = await execute_tool(
            db=db,
            user_id=current_user.id,
            tool_name=tool_name,
            arguments=args,
            confirmed=req.confirmed,
            triggered_by="voice"
        )
        record_audit_event(
            db=db,
            user_id=current_user.id,
            category="voice",
            action=f"voice.command.{tool_name}",
            resource_name=tool_name,
            success=exec_res.get("success", False),
            metadata={"transcript": transcript}
        )
        return {
            "transcript": transcript,
            "interpreted_action": tool_name,
            "execution": exec_res
        }

    # If no structured tool matched, return as a chat prompt intent
    return {
        "transcript": transcript,
        "interpreted_action": "chat_query",
        "query": transcript,
        "requires_confirmation": False
    }
