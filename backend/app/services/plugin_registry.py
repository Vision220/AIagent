"""
Plugin Registry Service — Phase 4

Manages the catalogue of available plugins. Only platform-registered plugins
can be installed. Users cannot inject arbitrary plugin code.

Built-in plugins are seeded into the database on startup.
"""

import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import PluginManifest, UserPluginInstall, PermissionGrant, AuditEvent

logger = logging.getLogger(__name__)

# ─── Capability Permission Levels ─────────────────────────────────────────────

CAPABILITY_LEVELS: Dict[str, str] = {
    # LOW — read public data only
    "research_search": "LOW",
    "paper_search": "LOW",
    "knowledge_retrieval": "LOW",
    # MEDIUM — external network, user data reads
    "webpage_fetch": "MEDIUM",
    "rss_read": "MEDIUM",
    "document_read": "MEDIUM",
    "notifications": "MEDIUM",
    "voice_input": "MEDIUM",
    "voice_output": "MEDIUM",
    # HIGH — access external accounts or private data
    "calendar_access": "HIGH",
    "email_read": "HIGH",
    "email_send": "HIGH",
    "browser_access": "HIGH",
    # CRITICAL — never auto-granted, always require explicit confirmation
    "local_file_access": "CRITICAL",
    "computer_control": "CRITICAL",
}

# ─── Built-in Plugin Catalogue ─────────────────────────────────────────────────
# These are seeded into the database on first startup.
# is_available=True means the adapter code is actually implemented in this platform.
# is_available=False means it is listed as "coming soon" with no functional backend.

BUILT_IN_PLUGINS: List[Dict[str, Any]] = [
    # ── ACTUALLY IMPLEMENTED ──
    {
        "slug": "arxiv-search",
        "name": "arXiv Search",
        "description": "Search the arXiv preprint server for physics, mathematics, CS, and quantitative biology papers.",
        "long_description": (
            "Uses the official arXiv API to search and retrieve preprint metadata. "
            "Returns title, authors, abstract, publication date, and PDF links. "
            "This is a public open-access API that requires no authentication."
        ),
        "version": "1.0.0",
        "author": "Platform Built-in",
        "category": "Academic",
        "icon_name": "FileText",
        "capabilities_json": ["research_search", "paper_search"],
        "config_schema_json": {},
        "data_access_description": "Searches public arXiv metadata only. No user data is sent to arXiv.",
        "privacy_notes": "No personal data shared. arXiv queries are anonymous.",
        "is_available": True,
        "requires_api_key": False,
        "is_built_in": True,
        "availability_status": "available",
    },
    {
        "slug": "semantic-scholar-search",
        "name": "Semantic Scholar",
        "description": "Access Semantic Scholar's open academic graph with 200M+ papers and citation data.",
        "long_description": (
            "Uses the Semantic Scholar API (open access tier) to search papers and retrieve citation counts, "
            "influential citations, and author information. An optional API key can be configured to increase rate limits."
        ),
        "version": "1.0.0",
        "author": "Platform Built-in",
        "category": "Academic",
        "icon_name": "Network",
        "capabilities_json": ["research_search", "paper_search"],
        "config_schema_json": {
            "api_key": {
                "type": "string",
                "label": "Semantic Scholar API Key (optional)",
                "secret": True,
                "required": False,
                "help": "Optional: increases rate limits. Get one at semanticscholar.org/product/api"
            }
        },
        "data_access_description": "Search queries sent to Semantic Scholar API. No personal user data shared.",
        "privacy_notes": "Search terms are transmitted to Semantic Scholar. Review their privacy policy.",
        "is_available": True,
        "requires_api_key": False,
        "is_built_in": True,
        "availability_status": "available",
    },
    {
        "slug": "openalex-search",
        "name": "OpenAlex",
        "description": "Query OpenAlex — the fully open academic knowledge graph with 250M+ works.",
        "long_description": (
            "OpenAlex provides open, structured data on scholarly works, authors, institutions, venues, "
            "and concepts. No authentication required for basic access."
        ),
        "version": "1.0.0",
        "author": "Platform Built-in",
        "category": "Academic",
        "icon_name": "Globe",
        "capabilities_json": ["research_search", "paper_search"],
        "config_schema_json": {
            "email": {
                "type": "string",
                "label": "Contact Email (recommended)",
                "secret": False,
                "required": False,
                "help": "Providing an email gives you access to OpenAlex's polite pool (faster responses)."
            }
        },
        "data_access_description": "Queries sent to OpenAlex API. Email optionally shared for rate-limit pooling.",
        "privacy_notes": "If an email is provided it is shared with OpenAlex for API identification only.",
        "is_available": True,
        "requires_api_key": False,
        "is_built_in": True,
        "availability_status": "available",
    },
    {
        "slug": "crossref-search",
        "name": "Crossref",
        "description": "Search Crossref's database of 145M+ DOI-registered scholarly works.",
        "long_description": (
            "Crossref is the official DOI registration agency for scholarly publications. "
            "This plugin uses the public Crossref API (Polite Pool) to search publications, "
            "retrieve metadata, and resolve DOIs."
        ),
        "version": "1.0.0",
        "author": "Platform Built-in",
        "category": "Academic",
        "icon_name": "BookOpen",
        "capabilities_json": ["research_search", "paper_search"],
        "config_schema_json": {},
        "data_access_description": "Queries sent to Crossref API. No user data shared.",
        "privacy_notes": "No personal data sent. Crossref is a non-profit open-access registry.",
        "is_available": True,
        "requires_api_key": False,
        "is_built_in": True,
        "availability_status": "available",
    },
    {
        "slug": "rss-monitor",
        "name": "RSS Feed Monitor",
        "description": "Subscribe to any public RSS or Atom feed from research journals, labs, or repositories.",
        "long_description": (
            "Fetches and parses RSS/Atom feeds from public URLs. Useful for monitoring journal update feeds, "
            "university research blogs, and lab preprint pages. "
            "URLs are validated and must be publicly accessible. Paywall content is not bypassed."
        ),
        "version": "1.0.0",
        "author": "Platform Built-in",
        "category": "Research",
        "icon_name": "Rss",
        "capabilities_json": ["rss_read", "webpage_fetch"],
        "config_schema_json": {},
        "data_access_description": "Fetches content from user-specified public URLs. No authentication bypass.",
        "privacy_notes": "Outbound HTTP requests are made to the configured URLs. No user data is sent.",
        "is_available": True,
        "requires_api_key": False,
        "is_built_in": True,
        "availability_status": "available",
    },
    {
        "slug": "voice-assistant",
        "name": "Voice Assistant",
        "description": "Enable microphone input and text-to-speech output using browser-native speech APIs.",
        "long_description": (
            "Uses the Web Speech API (built into modern browsers) for speech recognition and synthesis. "
            "No audio data is sent to any third-party server — processing happens in the browser. "
            "Requires microphone permission to be granted in browser settings. "
            "Sensitive actions triggered by voice always require explicit confirmation."
        ),
        "version": "1.0.0",
        "author": "Platform Built-in",
        "category": "Voice",
        "icon_name": "Mic",
        "capabilities_json": ["voice_input", "voice_output"],
        "config_schema_json": {},
        "data_access_description": (
            "Speech recognition runs in the browser. Audio is NOT recorded or stored by this platform. "
            "Depending on your browser, audio may be processed by the browser vendor's speech recognition service."
        ),
        "privacy_notes": (
            "Browser-native speech. Chrome may send audio to Google for recognition. "
            "Firefox uses local on-device recognition where available. "
            "No audio data is stored on this platform's servers."
        ),
        "is_available": True,
        "requires_api_key": False,
        "is_built_in": True,
        "availability_status": "available",
    },

    # ── COMING SOON / NOT IMPLEMENTED ──
    {
        "slug": "pubmed-search",
        "name": "PubMed / NCBI",
        "description": "Search PubMed's 35M+ biomedical literature citations via the NCBI E-utilities API.",
        "long_description": (
            "Will search PubMed, PubMed Central, and other NCBI databases for biomedical research. "
            "Requires an NCBI API key for production use. Not yet implemented."
        ),
        "version": "0.9.0",
        "author": "Platform",
        "category": "Academic",
        "icon_name": "Flask",
        "capabilities_json": ["research_search", "paper_search"],
        "config_schema_json": {
            "api_key": {
                "type": "string",
                "label": "NCBI API Key",
                "secret": True,
                "required": True,
                "help": "Get a free key at ncbi.nlm.nih.gov/account/"
            }
        },
        "data_access_description": "Search queries sent to NCBI. No personal data shared.",
        "privacy_notes": "NCBI API key used for authentication only.",
        "is_available": False,
        "requires_api_key": True,
        "is_built_in": False,
        "availability_status": "coming_soon",
    },
    {
        "slug": "zotero-sync",
        "name": "Zotero Sync",
        "description": "Sync saved papers and annotations to your Zotero personal library.",
        "long_description": (
            "Will connect to the Zotero API to sync your saved research library. "
            "Requires a Zotero API key and user ID. Not yet implemented."
        ),
        "version": "0.5.0",
        "author": "Community",
        "category": "Productivity",
        "icon_name": "FolderSync",
        "capabilities_json": ["knowledge_retrieval"],
        "config_schema_json": {
            "api_key": {"type": "string", "label": "Zotero API Key", "secret": True, "required": True},
            "user_id": {"type": "string", "label": "Zotero User ID", "secret": False, "required": True},
        },
        "data_access_description": "Your saved papers and collections will be sent to Zotero.",
        "privacy_notes": "Data shared with Zotero. Review Zotero's privacy policy.",
        "is_available": False,
        "requires_api_key": True,
        "is_built_in": False,
        "availability_status": "coming_soon",
    },
    {
        "slug": "google-scholar-search",
        "name": "Google Scholar",
        "description": "Search Google Scholar for academic papers and citation metrics.",
        "long_description": (
            "Google Scholar does not provide an official public API. "
            "Automated access violates Google's Terms of Service. "
            "This plugin is listed for awareness only and will NOT be implemented in this platform."
        ),
        "version": "0.0.0",
        "author": "N/A",
        "category": "Academic",
        "icon_name": "GraduationCap",
        "capabilities_json": ["research_search"],
        "config_schema_json": {},
        "data_access_description": "Not implemented — Google Scholar TOS prohibits automated access.",
        "privacy_notes": "Not applicable.",
        "is_available": False,
        "requires_api_key": False,
        "is_built_in": False,
        "availability_status": "coming_soon",
    },
    {
        "slug": "whisper-transcription",
        "name": "Whisper Transcription",
        "description": "High-accuracy offline speech-to-text using OpenAI Whisper (local model).",
        "long_description": (
            "Will use the open-source Whisper model running locally for high-accuracy speech transcription. "
            "No audio sent to external servers. Requires a machine with sufficient compute. Not yet implemented."
        ),
        "version": "0.1.0",
        "author": "Community",
        "category": "Voice",
        "icon_name": "AudioLines",
        "capabilities_json": ["voice_input"],
        "config_schema_json": {
            "model_size": {
                "type": "select",
                "label": "Whisper Model Size",
                "options": ["tiny", "base", "small", "medium", "large"],
                "required": True,
            }
        },
        "data_access_description": "Audio processed locally. No external network access for transcription.",
        "privacy_notes": "Full local processing. No audio data leaves your device.",
        "is_available": False,
        "requires_api_key": False,
        "is_built_in": False,
        "availability_status": "coming_soon",
    },
]


def seed_plugin_manifests(db: Session) -> None:
    """Seed built-in plugin manifests into the database if they don't already exist."""
    for plugin_data in BUILT_IN_PLUGINS:
        existing = db.query(PluginManifest).filter(
            PluginManifest.slug == plugin_data["slug"]
        ).first()
        if not existing:
            manifest = PluginManifest(**plugin_data)
            db.add(manifest)
    try:
        db.commit()
        logger.info("Plugin manifests seeded successfully")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to seed plugin manifests: {e}")

# Alias
seed_built_in_plugins = seed_plugin_manifests



def seed_tool_definitions(db: Session) -> None:
    """Seed built-in tool definitions."""
    from app.models.models import ToolDefinition
    tools = [
        {
            "name": "search_papers",
            "display_name": "Search Academic Papers",
            "description": "Search configured academic databases for papers matching a query.",
            "input_schema_json": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "sources": {"type": "array", "items": {"type": "string"}},
                    "limit": {"type": "integer", "default": 10}
                },
                "required": ["query"]
            },
            "output_schema_json": {"type": "array", "items": {"type": "object"}},
            "risk_level": "LOW",
            "required_capability": "research_search",
            "requires_confirmation": False,
            "plugin_slug": None,
        },
        {
            "name": "start_research",
            "display_name": "Start Deep Research",
            "description": "Start a deep research synthesis task on a given topic.",
            "input_schema_json": {
                "type": "object",
                "properties": {
                    "topic": {"type": "string"},
                    "depth": {"type": "string", "enum": ["quick", "standard", "deep"]},
                },
                "required": ["topic"]
            },
            "output_schema_json": {"type": "object"},
            "risk_level": "LOW",
            "required_capability": "research_search",
            "requires_confirmation": False,
            "plugin_slug": None,
        },
        {
            "name": "save_paper",
            "display_name": "Save Paper to Library",
            "description": "Save a paper to the user's research library.",
            "input_schema_json": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "url": {"type": "string"},
                    "collection": {"type": "string", "default": "General"}
                },
                "required": ["title"]
            },
            "output_schema_json": {"type": "object"},
            "risk_level": "LOW",
            "required_capability": "knowledge_retrieval",
            "requires_confirmation": False,
            "plugin_slug": None,
        },
        {
            "name": "list_alerts",
            "display_name": "List Research Alerts",
            "description": "Retrieve the user's recent research monitoring alerts.",
            "input_schema_json": {
                "type": "object",
                "properties": {
                    "unread_only": {"type": "boolean", "default": False},
                    "limit": {"type": "integer", "default": 10}
                }
            },
            "output_schema_json": {"type": "array"},
            "risk_level": "LOW",
            "required_capability": "knowledge_retrieval",
            "requires_confirmation": False,
            "plugin_slug": None,
        },
        {
            "name": "mark_alert_read",
            "display_name": "Mark Alert as Read",
            "description": "Mark a specific research alert as read.",
            "input_schema_json": {
                "type": "object",
                "properties": {"alert_id": {"type": "integer"}},
                "required": ["alert_id"]
            },
            "output_schema_json": {"type": "object"},
            "risk_level": "LOW",
            "required_capability": "knowledge_retrieval",
            "requires_confirmation": False,
            "plugin_slug": None,
        },
        {
            "name": "search_library",
            "display_name": "Search Research Library",
            "description": "Search the user's personal saved paper library.",
            "input_schema_json": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "collection": {"type": "string"}
                },
                "required": ["query"]
            },
            "output_schema_json": {"type": "array"},
            "risk_level": "LOW",
            "required_capability": "knowledge_retrieval",
            "requires_confirmation": False,
            "plugin_slug": None,
        },
        {
            "name": "fetch_webpage",
            "display_name": "Fetch Public Webpage",
            "description": "Fetch and extract text content from a public URL. URLs are validated for safety.",
            "input_schema_json": {
                "type": "object",
                "properties": {"url": {"type": "string", "format": "uri"}},
                "required": ["url"]
            },
            "output_schema_json": {"type": "object"},
            "risk_level": "MEDIUM",
            "required_capability": "webpage_fetch",
            "requires_confirmation": False,
            "plugin_slug": "rss-monitor",
        },
        {
            "name": "install_plugin",
            "display_name": "Install Plugin",
            "description": "Install a plugin from the marketplace.",
            "input_schema_json": {
                "type": "object",
                "properties": {"plugin_slug": {"type": "string"}},
                "required": ["plugin_slug"]
            },
            "output_schema_json": {"type": "object"},
            "risk_level": "HIGH",
            "required_capability": None,
            "requires_confirmation": True,
            "plugin_slug": None,
        },
    ]
    for t in tools:
        from app.models.models import ToolDefinition
        existing = db.query(ToolDefinition).filter(ToolDefinition.name == t["name"]).first()
        if not existing:
            db.add(ToolDefinition(**t))
    try:
        db.commit()
        logger.info("Tool definitions seeded successfully")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to seed tool definitions: {e}")
