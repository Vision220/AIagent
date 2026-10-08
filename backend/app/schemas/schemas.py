from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional, Any, Dict
from datetime import datetime

# --- Auth Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: Optional[int] = None

# --- Chat & Conversation Schemas ---
class ChatHistoryMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str

class MessageCreate(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str
    sources: Optional[List[Dict[str, Any]]] = None

class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    conversation_id: int
    role: str
    content: str
    sources_json: Optional[List[Dict[str, Any]]] = None
    tokens_used: int
    created_at: datetime

class ConversationCreate(BaseModel):
    title: Optional[str] = "New Research Topic"
    mode: Optional[str] = "chat"
    model_name: Optional[str] = "gemini-1.5-pro"

class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    title: str
    mode: str
    model_name: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    messages: List[MessageResponse] = []

class ChatStreamRequest(BaseModel):
    conversation_id: Optional[int] = None
    prompt: str
    model_name: Optional[str] = "gemini-1.5-pro"
    deep_research_mode: bool = False
    sources: Optional[List[str]] = None
    history: Optional[List[ChatHistoryMessage]] = None
    api_key: Optional[str] = None

# --- Deep Research Schemas ---
class DeepResearchRequest(BaseModel):
    topic: str
    depth: str = Field("standard", description="'quick', 'standard', or 'deep'")
    sources: List[str] = ["arxiv", "openalex", "crossref", "semantic_scholar"]
    custom_instructions: Optional[str] = None

class DeepResearchStep(BaseModel):
    step_number: int
    title: str
    description: str
    status: str

class DeepResearchResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: Optional[int] = None
    title: str
    topic: str
    depth: str
    sub_questions: Optional[List[str]] = []
    summary: str
    findings: List[Dict[str, Any]]
    citations: List[Dict[str, Any]]
    sources_analyzed: int = 0
    status: str
    created_at: Optional[datetime] = None

class ScholarlySearchRequest(BaseModel):
    query: str
    sources: Optional[List[str]] = ["arxiv", "openalex", "crossref", "semantic_scholar"]
    limit_per_source: Optional[int] = 5

class ScholarlySearchResponse(BaseModel):
    query: str
    total_found: int
    results: List[Dict[str, Any]]

# --- Library Schemas ---
class SavedPaperCreate(BaseModel):
    paper_title: str
    authors: Optional[str] = None
    journal_or_venue: Optional[str] = None
    publication_year: Optional[int] = None
    doi: Optional[str] = None
    url: Optional[str] = None
    abstract: Optional[str] = None
    collection_name: Optional[str] = "General"
    user_notes: Optional[str] = None

class SavedPaperResponse(SavedPaperCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    created_at: datetime

class ResearchProjectCreate(BaseModel):
    title: str
    topic: str
    depth: str = "standard"
    sources_config: Optional[List[str]] = None
    summary: str
    findings_json: Optional[List[Dict[str, Any]]] = None
    citations_json: Optional[List[Dict[str, Any]]] = None

class ResearchProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    title: str
    topic: str
    depth: str
    sources_config: Optional[List[str]] = None
    status: str
    summary: Optional[str] = None
    findings_json: Optional[List[Dict[str, Any]]] = None
    citations_json: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

# --- Publication Alerts Schemas (Phase 1/2 Backward Compatibility) ---
class PublicationAlertCreate(BaseModel):
    topic_query: str
    keywords: Optional[List[str]] = []
    authors: Optional[List[str]] = []
    frequency: str = "daily"

class PublicationAlertResponse(PublicationAlertCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    is_active: bool
    created_at: datetime

# --- Plugins Schemas ---
class PluginResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    slug: str
    name: str
    description: str
    category: str
    author: str
    version: str
    permissions_required: Optional[List[str]] = None
    is_enabled: bool = False

class PluginToggleRequest(BaseModel):
    slug: str
    enable: bool

# --- Settings & Model Schemas ---
class ModelInfo(BaseModel):
    id: str
    name: str
    description: str
    provider: str
    context_length: str
    is_configured: bool

class UserPreferencesUpdate(BaseModel):
    preferred_models: Optional[List[str]] = None
    default_sources: Optional[List[str]] = None
    citation_format: Optional[str] = None
    dark_mode: Optional[bool] = None
    voice_enabled: Optional[bool] = None

class APIKeyUpdateRequest(BaseModel):
    gemini_api_key: Optional[str] = None

class HealthStatusResponse(BaseModel):
    status: str
    version: str
    ai_provider: str
    gemini_key_configured: bool
    database_connected: bool
    active_models_count: int = 0

# ===================================================
# PHASE 3: RESEARCH PROFILES, DISCOVERY & SMART ALERTS
# ===================================================

class ResearchProfileCreate(BaseModel):
    name: str
    description: Optional[str] = None
    topics: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)
    domains: Optional[List[str]] = Field(default_factory=list)
    pub_types: Optional[List[str]] = Field(default_factory=lambda: ["preprints", "journal_articles"])
    sources: Optional[List[str]] = Field(default_factory=lambda: ["arxiv", "openalex", "crossref", "semantic_scholar"])
    date_range_days: Optional[int] = 30
    language: Optional[str] = "en"
    min_relevance: Optional[str] = "Medium"  # "High", "Medium", "Low"
    frequency: Optional[str] = "daily"  # "daily", "weekly", "monthly", "manual"

class ResearchProfileUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    topics: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    domains: Optional[List[str]] = None
    pub_types: Optional[List[str]] = None
    sources: Optional[List[str]] = None
    date_range_days: Optional[int] = None
    language: Optional[str] = None
    min_relevance: Optional[str] = None
    frequency: Optional[str] = None

class ResearchProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    name: str
    description: Optional[str] = None
    is_active: bool
    topics_json: List[str] = []
    keywords_json: List[str] = []
    domains_json: Optional[List[str]] = []
    pub_types_json: Optional[List[str]] = []
    sources_json: List[str] = []
    date_range_days: int
    language: str
    min_relevance: str
    frequency: str
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

class DiscoveredPublicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    external_id: str
    title: str
    authors: Optional[str] = None
    journal_or_venue: Optional[str] = None
    publication_year: Optional[int] = None
    publication_date: Optional[str] = None
    doi: Optional[str] = None
    url: Optional[str] = None
    pdf_url: Optional[str] = None
    abstract: Optional[str] = None
    source_db: str
    citation_count: Optional[int] = None
    first_discovered_at: datetime
    last_checked_at: datetime
    
    # User-specific contextual fields
    relevance_score: Optional[float] = None
    relevance_category: Optional[str] = None
    ai_explanation: Optional[str] = None
    matching_keywords: Optional[List[str]] = []
    is_read: Optional[bool] = False
    is_saved: Optional[bool] = False
    is_dismissed: Optional[bool] = False
    user_notes: Optional[str] = None
    profile_id: Optional[int] = None
    profile_name: Optional[str] = None

class NotificationAlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    profile_id: Optional[int] = None
    profile_name: Optional[str] = None
    publication_id: Optional[int] = None
    title: str
    message: str
    relevance_category: str
    is_read: bool
    created_at: datetime
    publication: Optional[DiscoveredPublicationResponse] = None

class MonitoringJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    profile_id: int
    profile_name: Optional[str] = None
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    papers_found: int = 0
    papers_new: int = 0
    error_message: Optional[str] = None
    triggered_by: str = "manual"

class MonitoringDashboardResponse(BaseModel):
    total_discovered: int
    new_publications_count: int
    active_profiles_count: int
    unread_alerts_count: int
    high_relevance_count: int
    last_monitoring_run: Optional[datetime] = None
    next_scheduled_run: Optional[datetime] = None
    sources_health: Dict[str, Any]

class PublicationNotesUpdate(BaseModel):
    user_notes: Optional[str] = None
    user_tags: Optional[List[str]] = None
