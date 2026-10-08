from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Conversation, Message, User
from app.schemas.schemas import (
    ConversationCreate, ConversationResponse, MessageCreate, 
    MessageResponse, ChatStreamRequest
)
from app.services.ai_provider import ai_factory

router = APIRouter(prefix="/conversations", tags=["Conversations & AI Chat"])

@router.get("/", response_model=List[ConversationResponse])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    convs = db.query(Conversation).filter(Conversation.user_id == current_user.id).order_by(Conversation.updated_at.desc()).all()
    return convs

@router.post("/", response_model=ConversationResponse)
def create_conversation(
    conv_in: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conv = Conversation(
        user_id=current_user.id,
        title=conv_in.title or "New Research Conversation",
        mode=conv_in.mode or "chat",
        model_name=conv_in.model_name or "gemini-1.5-pro"
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv

@router.get("/{conversation_id}", response_model=ConversationResponse)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this conversation")
    return conv

@router.post("/chat/stream")
async def chat_stream(req: ChatStreamRequest, db: Session = Depends(get_db)):
    active_key = req.api_key.strip() if req.api_key else None
    if active_key:
        from app.services.ai_provider import GeminiProvider
        provider = GeminiProvider(api_key=active_key)
    else:
        provider = ai_factory.get_provider("gemini")
    
    prompt_text = req.prompt
    if req.deep_research_mode:
        prompt_text = (
            f"[Deep Academic Literature Analysis]\n"
            f"Prompt: {req.prompt}\n"
            f"Include empirical literature references, methodology evaluation, and structured takeaways."
        )

    # Convert Pydantic history objects to dicts
    history_dicts = None
    if req.history:
        history_dicts = [{"role": h.role, "content": h.content} for h in req.history]

    # Save user message if conversation_id provided
    if req.conversation_id:
        conv = db.query(Conversation).filter(Conversation.id == req.conversation_id).first()
        if conv:
            user_msg = Message(
                conversation_id=conv.id,
                role="user",
                content=req.prompt,
                tokens_used=len(req.prompt.split())
            )
            db.add(user_msg)
            db.commit()

    return StreamingResponse(
        provider.generate_stream(
            prompt=prompt_text,
            model_name=req.model_name or "gemini-1.5-pro",
            history=history_dicts
        ),
        media_type="text/event-stream"
    )

@router.post("/chat")
async def chat_sync(req: ChatStreamRequest, db: Session = Depends(get_db)):
    """Synchronous chat endpoint returning structured JSON with error and token counts."""
    active_key = req.api_key.strip() if req.api_key else None
    if active_key:
        from app.services.ai_provider import GeminiProvider
        provider = GeminiProvider(api_key=active_key)
    else:
        provider = ai_factory.get_provider("gemini")
    history_dicts = [{"role": h.role, "content": h.content} for h in req.history] if req.history else None
    
    result = await provider.generate_response(
        prompt=req.prompt,
        model_name=req.model_name or "gemini-1.5-pro",
        history=history_dicts
    )

    if req.conversation_id and not result.get("error") and result.get("content"):
        conv = db.query(Conversation).filter(Conversation.id == req.conversation_id).first()
        if conv:
            db.add(Message(conversation_id=conv.id, role="user", content=req.prompt))
            db.add(Message(
                conversation_id=conv.id,
                role="assistant",
                content=result["content"],
                tokens_used=result.get("tokens_used", 0)
            ))
            db.commit()

    return result
