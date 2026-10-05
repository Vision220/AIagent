from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    research_projects = relationship("ResearchProject", back_populates="user", cascade="all, delete-orphan")
    saved_papers = relationship("SavedPaper", back_populates="user", cascade="all, delete-orphan")
    preferences = relationship("ResearchPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    alerts = relationship("PublicationAlert", back_populates="user", cascade="all, delete-orphan")
    permissions = relationship("UserPermission", back_populates="user", uselist=False, cascade="all, delete-orphan")
    
    # Phase 3 Relationships
    research_profiles = relationship("ResearchProfile", back_populates="user", cascade="all, delete-orphan")
    user_publications = relationship("UserPublication", back_populates="user", cascade="all, delete-orphan")
    notification_alerts = relationship("NotificationAlert", back_populates="user", cascade="all, delete-orphan")
    monitoring_jobs = relationship("MonitoringJob", back_populates="user", cascade="all, delete-orphan")

    # Phase 4 Relationships
    plugin_installs = relationship("UserPluginInstall", back_populates="user", cascade="all, delete-orphan")
    custom_sources = relationship("CustomSource", back_populates="user", cascade="all, delete-orphan")
    ai_provider_configs = relationship("AIProviderConfig", back_populates="user", cascade="all, delete-orphan")
    model_route_config = relationship("ModelRouteConfig", back_populates="user", uselist=False, cascade="all, delete-orphan")
    voice_preferences = relationship("VoicePreferences", back_populates="user", uselist=False, cascade="all, delete-orphan")

    # Phase 5 Relationships
    desktop_devices = relationship("DesktopDevice", back_populates="user", cascade="all, delete-orphan")
    action_plans = relationship("ActionPlan", back_populates="user", cascade="all, delete-orphan")
    gesture_preference = relationship("GesturePreference", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False, default="New Conversation")
    mode = Column(String(50), default="chat")  # 'chat' or 'deep_research'
    model_name = Column(String(100), default="gemini-1.5-pro")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    role = Column(String(50), nullable=False)  # 'user', 'assistant', 'system'
    content = Column(Text, nullable=False)
    sources_json = Column(JSON, nullable=True)  # List of citations/sources
    tokens_used = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    conversation = relationship("Conversation", back_populates="messages")

class ResearchProject(Base):
    __tablename__ = "research_projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    topic = Column(String(255), nullable=False)
    depth = Column(String(50), default="standard")  # quick, standard, deep
    sources_config = Column(JSON, nullable=True)  # selected source DBs
    status = Column(String(50), default="completed")  # queued, running, completed, failed
    summary = Column(Text, nullable=True)
    findings_json = Column(JSON, nullable=True)
    citations_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="research_projects")

class SavedPaper(Base):
    __tablename__ = "saved_papers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    paper_title = Column(String(500), nullable=False)
    authors = Column(String(500), nullable=True)
    journal_or_venue = Column(String(255), nullable=True)
    publication_year = Column(Integer, nullable=True)
    doi = Column(String(255), nullable=True)
    url = Column(String(500), nullable=True)
    abstract = Column(Text, nullable=True)
    collection_name = Column(String(100), default="General")
    user_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="saved_papers")

class ResearchPreference(Base):
    __tablename__ = "research_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    preferred_models = Column(JSON, nullable=True)
    default_sources = Column(JSON, nullable=True)
    citation_format = Column(String(50), default="APA")
    dark_mode = Column(Boolean, default=True)
    voice_enabled = Column(Boolean, default=False)
    voice_name = Column(String(50), default="en-US-Neural2-F")

    user = relationship("User", back_populates="preferences")

class PublicationAlert(Base):
    __tablename__ = "publication_alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    topic_query = Column(String(255), nullable=False)
    keywords = Column(JSON, nullable=True)
    authors = Column(JSON, nullable=True)
    frequency = Column(String(50), default="daily")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="alerts")

class Plugin(Base):
    __tablename__ = "plugins"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)
    author = Column(String(255), nullable=False)
    version = Column(String(50), default="1.0.0")
    permissions_required = Column(JSON, nullable=True)
    is_enabled_by_default = Column(Boolean, default=False)

class UserPermission(Base):
    __tablename__ = "user_permissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    allow_desktop_automation = Column(Boolean, default=False)
    allow_file_system_read = Column(Boolean, default=False)
    allow_file_system_write = Column(Boolean, default=False)
    allowed_plugins_json = Column(JSON, nullable=True)

    user = relationship("User", back_populates="permissions")

# ==========================================
# PHASE 3: RESEARCH PROFILES & MONITORING
# ==========================================

class ResearchProfile(Base):
    """
    User configured research profile representing an independent topic collection
    with custom subtopics, keywords, domains, preferred sources, and schedule.
    """
    __tablename__ = "research_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)  # Allow pause/resume

    topics_json = Column(JSON, nullable=False, default=list)  # List of topics & subtopics
    keywords_json = Column(JSON, nullable=False, default=list)  # List of keywords & synonyms
    domains_json = Column(JSON, nullable=True, default=list)  # e.g., ["Computer Science", "Physics"]
    pub_types_json = Column(JSON, nullable=True, default=list)  # e.g., ["preprints", "journal_articles"]
    sources_json = Column(JSON, nullable=False, default=lambda: ["arxiv", "openalex", "crossref", "semantic_scholar"])
    
    date_range_days = Column(Integer, default=30)  # Scan papers published in last X days
    language = Column(String(10), default="en")
    min_relevance = Column(String(20), default="Medium")  # "High", "Medium", "Low"
    frequency = Column(String(50), default="daily")  # "daily", "weekly", "monthly", "manual"

    last_run_at = Column(DateTime(timezone=True), nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="research_profiles")
    user_publications = relationship("UserPublication", back_populates="profile", cascade="all, delete-orphan")
    alerts = relationship("NotificationAlert", back_populates="profile", cascade="all, delete-orphan")
    monitoring_jobs = relationship("MonitoringJob", back_populates="profile", cascade="all, delete-orphan")

class DiscoveredPublication(Base):
    """
    Scholarly publication discovered from real academic APIs (arXiv, OpenAlex, Crossref, Semantic Scholar).
    Deduplicated by normalized title and DOI.
    """
    __tablename__ = "discovered_publications"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(255), unique=True, index=True, nullable=False)
    title = Column(String(500), nullable=False)
    normalized_title = Column(String(500), index=True, nullable=False)
    authors = Column(String(500), nullable=True)
    journal_or_venue = Column(String(255), nullable=True)
    publication_year = Column(Integer, nullable=True)
    publication_date = Column(String(50), nullable=True)
    doi = Column(String(255), index=True, nullable=True)
    url = Column(String(500), nullable=True)
    pdf_url = Column(String(500), nullable=True)
    abstract = Column(Text, nullable=True)
    source_db = Column(String(50), nullable=False)  # "arXiv", "OpenAlex", "Crossref", "Semantic Scholar"
    citation_count = Column(Integer, nullable=True, default=0)

    first_discovered_at = Column(DateTime(timezone=True), server_default=func.now())
    last_checked_at = Column(DateTime(timezone=True), server_default=func.now())

    user_publications = relationship("UserPublication", back_populates="publication", cascade="all, delete-orphan")
    alerts = relationship("NotificationAlert", back_populates="publication", cascade="all, delete-orphan")

class UserPublication(Base):
    """
    User-specific relevance assessment, notes, read/unread state for a discovered publication.
    """
    __tablename__ = "user_publications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    publication_id = Column(Integer, ForeignKey("discovered_publications.id"), nullable=False, index=True)
    profile_id = Column(Integer, ForeignKey("research_profiles.id"), nullable=True, index=True)

    relevance_score = Column(Float, default=0.0)  # 0.0 to 1.0
    relevance_category = Column(String(20), default="Medium")  # "High", "Medium", "Low"
    ai_explanation = Column(Text, nullable=True)  # Transparent explanation of relevance & methods
    matching_keywords_json = Column(JSON, nullable=True, default=list)

    is_read = Column(Boolean, default=False)
    is_saved = Column(Boolean, default=False)
    is_dismissed = Column(Boolean, default=False)
    user_notes = Column(Text, nullable=True)
    user_tags_json = Column(JSON, nullable=True, default=list)

    discovered_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="user_publications")
    publication = relationship("DiscoveredPublication", back_populates="user_publications")
    profile = relationship("ResearchProfile", back_populates="user_publications")

class NotificationAlert(Base):
    """
    Smart In-app and scheduled alert for a discovered paper or monitoring event.
    """
    __tablename__ = "notification_alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    profile_id = Column(Integer, ForeignKey("research_profiles.id"), nullable=True, index=True)
    publication_id = Column(Integer, ForeignKey("discovered_publications.id"), nullable=True, index=True)

    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    relevance_category = Column(String(20), default="Medium")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notification_alerts")
    profile = relationship("ResearchProfile", back_populates="alerts")
    publication = relationship("DiscoveredPublication", back_populates="alerts")

class MonitoringJob(Base):
    """
    Audit log of automated and manual research monitoring runs.
    """
    __tablename__ = "monitoring_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    profile_id = Column(Integer, ForeignKey("research_profiles.id"), nullable=False, index=True)

    status = Column(String(50), default="running")  # "running", "completed", "failed"
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    papers_found = Column(Integer, default=0)
    papers_new = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    triggered_by = Column(String(50), default="manual")  # "manual", "scheduled"

    user = relationship("User", back_populates="monitoring_jobs")
    profile = relationship("ResearchProfile", back_populates="monitoring_jobs")


# ==========================================
# PHASE 4: PLUGIN ECOSYSTEM & EXTENSIONS
# ==========================================

class PluginManifest(Base):
    """
    Registry of all known plugins — built-in, community, and coming-soon.
    Only platform-registered plugins can be installed; users cannot inject arbitrary plugin code.
    """
    __tablename__ = "plugin_manifests"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    long_description = Column(Text, nullable=True)
    version = Column(String(50), default="1.0.0")
    author = Column(String(255), nullable=False)
    author_url = Column(String(500), nullable=True)
    category = Column(String(100), nullable=False)
    icon_name = Column(String(100), nullable=True)  # Lucide icon name

    # Capability-based permission model
    capabilities_json = Column(JSON, nullable=False, default=list)
    # e.g. ["research_search", "paper_search", "webpage_fetch"]

    # Configuration schema (JSON Schema format for frontend form generation)
    config_schema_json = Column(JSON, nullable=True)
    # e.g. {"api_key": {"type": "string", "label": "API Key", "secret": true}}

    # What the plugin can access — shown clearly to users
    data_access_description = Column(Text, nullable=True)
    privacy_notes = Column(Text, nullable=True)

    # Plugin status
    is_available = Column(Boolean, default=True)      # Platform has implemented it
    requires_api_key = Column(Boolean, default=False)
    is_built_in = Column(Boolean, default=False)       # Shipped with platform

    # Availability label for UI
    # "available", "coming_soon", "beta", "requires_subscription"
    availability_status = Column(String(50), default="available")

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    installations = relationship("UserPluginInstall", back_populates="plugin", cascade="all, delete-orphan")


class UserPluginInstall(Base):
    """
    User-specific plugin installation state, configuration, and granted permissions.
    """
    __tablename__ = "user_plugin_installs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    plugin_id = Column(Integer, ForeignKey("plugin_manifests.id"), nullable=False, index=True)

    is_installed = Column(Boolean, default=True)
    is_enabled = Column(Boolean, default=True)

    # User-provided configuration (API keys stored encrypted, returned masked)
    config_json = Column(JSON, nullable=True)  # {"api_key": "...", ...}

    # Granted capabilities (subset of plugin's capabilities_json)
    granted_capabilities_json = Column(JSON, nullable=False, default=list)

    installed_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="plugin_installs")
    plugin = relationship("PluginManifest", back_populates="installations")


class CustomSource(Base):
    """
    User-defined research source: RSS feed, public API, open-access repository, etc.
    Feeds into the existing research engine via a safe adapter interface.
    """
    __tablename__ = "custom_sources"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    url = Column(String(1000), nullable=False)

    # "rss", "json_api", "xml_feed", "academic_api", "public_webpage", "open_repository"
    source_type = Column(String(50), nullable=False, default="rss")

    # Adapter configuration: query param name, result path in JSON, etc.
    adapter_config_json = Column(JSON, nullable=True)

    # Auth (no passwords stored — only token/key if user explicitly provides)
    requires_auth = Column(Boolean, default=False)
    auth_header_name = Column(String(100), nullable=True)  # e.g. "X-API-Key"
    # auth_token stored encrypted, never returned in API responses
    auth_token_encrypted = Column(Text, nullable=True)

    is_enabled = Column(Boolean, default=True)
    is_validated = Column(Boolean, default=False)  # Has been successfully tested

    last_fetched_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, nullable=True)
    fetch_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="custom_sources")


class AIProviderConfig(Base):
    """
    Per-user AI provider credential configuration and model routing preferences.
    API keys are stored encrypted and NEVER returned to the frontend.
    """
    __tablename__ = "ai_provider_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # "gemini", "openai", "anthropic", "local"
    provider_slug = Column(String(50), nullable=False)

    is_configured = Column(Boolean, default=False)
    is_enabled = Column(Boolean, default=True)

    # Encrypted API key — NEVER expose in API responses
    api_key_encrypted = Column(Text, nullable=True)

    # Optional: organization ID, base URL (for local/OpenAI-compatible providers)
    extra_config_json = Column(JSON, nullable=True)

    # Preferred model within this provider for each role
    # e.g. {"chat": "gpt-4o-mini", "research": "gpt-4o", "summarization": "gpt-4o-mini"}
    model_roles_json = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="ai_provider_configs")


class ModelRouteConfig(Base):
    """
    User-defined model routing rules: which model to use for which task type.
    """
    __tablename__ = "model_route_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)

    # Model selections per role
    # Each value: "provider_slug:model_id" e.g. "gemini:gemini-1.5-pro"
    chat_model = Column(String(150), nullable=True)
    research_model = Column(String(150), nullable=True)
    summarization_model = Column(String(150), nullable=True)
    fast_model = Column(String(150), nullable=True)
    reasoning_model = Column(String(150), nullable=True)

    # Allow auto-routing (agent picks best model per task)
    auto_route_enabled = Column(Boolean, default=True)

    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="model_route_config")


class VoicePreferences(Base):
    """
    Per-user voice assistant settings.
    """
    __tablename__ = "voice_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)

    voice_enabled = Column(Boolean, default=False)
    speech_recognition_language = Column(String(20), default="en-US")
    voice_output_enabled = Column(Boolean, default=True)
    speaking_rate = Column(Float, default=1.0)  # 0.5 – 2.0
    auto_speak_responses = Column(Boolean, default=False)
    preferred_voice_name = Column(String(100), nullable=True)  # Browser SpeechSynthesis voice

    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="voice_preferences")


class ToolDefinition(Base):
    """
    Registry of typed agent tools/actions.
    The model requests a tool call by name; backend validates it before execution.
    No arbitrary function names, shell commands, or SQL can be called.
    """
    __tablename__ = "tool_definitions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)  # e.g. "search_papers"
    display_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)

    # JSON Schema for input validation
    input_schema_json = Column(JSON, nullable=False)
    # JSON Schema for output
    output_schema_json = Column(JSON, nullable=True)

    # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    risk_level = Column(String(20), default="LOW")

    # Required capability from PluginManifest capabilities
    required_capability = Column(String(100), nullable=True)

    # Whether this tool needs user confirmation before execution
    requires_confirmation = Column(Boolean, default=False)

    is_enabled = Column(Boolean, default=True)
    plugin_slug = Column(String(100), nullable=True)  # Which plugin provides this tool (null = built-in)

    executions = relationship("ToolExecution", back_populates="tool")


class ToolExecution(Base):
    """
    Audit record for every tool invocation.
    Records non-sensitive metadata only — no raw credentials or private content.
    """
    __tablename__ = "tool_executions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    tool_id = Column(Integer, ForeignKey("tool_definitions.id"), nullable=False, index=True)

    # Sanitized input (no secrets)
    input_summary = Column(Text, nullable=True)
    success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)

    # Confirmation state
    required_confirmation = Column(Boolean, default=False)
    was_confirmed = Column(Boolean, nullable=True)

    # Source of the tool call
    triggered_by = Column(String(50), default="user")  # "user", "voice", "agent", "scheduled"
    plugin_slug = Column(String(100), nullable=True)

    executed_at = Column(DateTime(timezone=True), server_default=func.now())
    duration_ms = Column(Integer, nullable=True)

    tool = relationship("ToolDefinition", back_populates="executions")


class PermissionGrant(Base):
    """
    Explicit capability grants per user per plugin.
    Users can revoke any grant. Critical capabilities require confirmation to grant.
    """
    __tablename__ = "permission_grants"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    plugin_id = Column(Integer, ForeignKey("plugin_manifests.id"), nullable=True, index=True)

    capability = Column(String(100), nullable=False)

    # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    permission_level = Column(String(20), nullable=False)

    is_active = Column(Boolean, default=True)
    granted_at = Column(DateTime(timezone=True), server_default=func.now())
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)  # None = permanent


class AuditEvent(Base):
    """
    General-purpose audit log for user activity.
    Records non-sensitive operation metadata for user inspection.
    NEVER stores raw API keys, passwords, tokens, or private data content.
    """
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Operation category: "plugin", "source", "model", "tool", "voice", "auth", "research"
    category = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)  # e.g. "plugin.install", "source.add", "tool.execute"

    # Resource information
    resource_type = Column(String(100), nullable=True)  # e.g. "PluginManifest", "CustomSource"
    resource_id = Column(String(100), nullable=True)
    resource_name = Column(String(255), nullable=True)

    # Result
    success = Column(Boolean, default=True)
    error_summary = Column(Text, nullable=True)

    # Context (non-sensitive)
    metadata_json = Column(JSON, nullable=True)

    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ==========================================
# PHASE 5: DESKTOP AGENT & LOCAL AUTOMATION
# ==========================================

class DesktopDevice(Base):
    """
    Secure paired desktop companion device.
    Uses short-lived pairing codes, hashed auth tokens, and explicit device identification.
    Never relies on unauthenticated localhost endpoints.
    """
    __tablename__ = "desktop_devices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    device_id = Column(String(100), unique=True, index=True, nullable=False)
    device_name = Column(String(255), nullable=False)
    device_platform = Column(String(50), default="windows")  # windows, macos, linux

    # Secure pairing code (e.g. "849-210") with expiration
    pairing_code = Column(String(50), nullable=True, index=True)
    pairing_code_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Hashed auth token for authenticated WebSocket / REST desktop agent sessions
    auth_token_hash = Column(String(255), nullable=True)

    is_paired = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    last_heartbeat_at = Column(DateTime(timezone=True), nullable=True)
    client_ip = Column(String(50), nullable=True)
    agent_version = Column(String(50), default="1.0.0")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="desktop_devices")
    permissions = relationship("DesktopPermission", back_populates="device", cascade="all, delete-orphan")
    task_executions = relationship("DesktopTaskExecution", back_populates="device", cascade="all, delete-orphan")


class DesktopPermission(Base):
    """
    Fine-grained desktop permission states per device and user.
    Categories:
    - BROWSER_READ, BROWSER_CONTROL
    - FILE_READ, FILE_WRITE, FILE_DELETE
    - CLIPBOARD_READ, CLIPBOARD_WRITE
    - APPLICATION_LAUNCH, SCREEN_CAPTURE
    - MICROPHONE, CAMERA, SYSTEM_SETTINGS
    - EMAIL_SEND, ACCOUNT_ACTION, PURCHASE_ACTION
    """
    __tablename__ = "desktop_permissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    device_id = Column(Integer, ForeignKey("desktop_devices.id"), nullable=False, index=True)

    permission_key = Column(String(100), nullable=False)
    is_granted = Column(Boolean, default=False)
    is_temporary = Column(Boolean, default=False)
    always_allow = Column(Boolean, default=False)

    granted_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)

    device = relationship("DesktopDevice", back_populates="permissions")


class ActionPlan(Base):
    """
    Natural-language action plan decomposed into structured, typed steps.
    Displayed to the user for review before elevated or multi-step execution.
    Supports user takeover mode when websites require interactive login.
    """
    __tablename__ = "action_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    natural_language_goal = Column(Text, nullable=False)

    # List of steps: [{ id, tool_name, arguments, permission_needed, risk_level, confirmation_required, status }]
    steps_json = Column(JSON, nullable=False, default=list)

    # "draft", "awaiting_confirmation", "running", "completed", "failed", "cancelled", "stopped"
    status = Column(String(50), default="draft")

    requires_user_takeover = Column(Boolean, default=False)
    takeover_prompt = Column(Text, nullable=True)
    takeover_url = Column(String(1000), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="action_plans")
    executions = relationship("DesktopTaskExecution", back_populates="plan", cascade="all, delete-orphan")


class DesktopTaskExecution(Base):
    """
    Audit and runtime status for local desktop / browser tool execution.
    Records strict privacy scope: LOCAL_ONLY, SENT_TO_AI_PROVIDER, SENT_TO_EXTERNAL_SERVICE.
    """
    __tablename__ = "desktop_task_executions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    device_id = Column(Integer, ForeignKey("desktop_devices.id"), nullable=True, index=True)
    plan_id = Column(Integer, ForeignKey("action_plans.id"), nullable=True, index=True)

    tool_name = Column(String(100), nullable=False)
    action_type = Column(String(100), nullable=False)

    # Sanitized arguments (no passwords/tokens)
    input_parameters_sanitized = Column(JSON, nullable=True)
    output_summary = Column(Text, nullable=True)

    # "LOCAL_ONLY", "SENT_TO_AI_PROVIDER", "SENT_TO_EXTERNAL_SERVICE"
    privacy_scope = Column(String(50), default="LOCAL_ONLY")

    # "pending", "awaiting_confirmation", "approved", "running", "completed", "failed", "aborted_by_emergency_stop"
    status = Column(String(50), default="pending")
    risk_level = Column(String(20), default="LOW")

    requires_confirmation = Column(Boolean, default=False)
    confirmed_by_user = Column(Boolean, nullable=True)

    executed_at = Column(DateTime(timezone=True), server_default=func.now())
    duration_ms = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)

    device = relationship("DesktopDevice", back_populates="task_executions")
    plan = relationship("ActionPlan", back_populates="executions")


class GesturePreference(Base):
    """
    Opt-in camera gesture interaction preferences.
    Only permitted for LOW-RISK actions (pause, resume, approve low-risk, navigate).
    Never authorizes destructive or high-impact actions.
    """
    __tablename__ = "gesture_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)

    gesture_control_enabled = Column(Boolean, default=False)
    camera_active = Column(Boolean, default=False)

    # Default mappings: open_palm -> stop, thumbs_up -> approve_low_risk, swipe_left -> card_prev, swipe_right -> card_next, pinch -> select
    gesture_mappings_json = Column(JSON, nullable=False, default=dict)

    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="gesture_preference")

