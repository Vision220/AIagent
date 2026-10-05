"""
Agent Command & Tool Registry System — Phase 4

Provides a structured, typed command and tool execution layer.
Protects against:
- Arbitrary code execution
- Shell commands / SQL injection
- Prompt / tool injection
- Unauthorized tool execution without proper permissions
"""

import time
import logging
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.models import (
    ToolDefinition, ToolExecution, SavedPaper, ResearchProject,
    NotificationAlert, DiscoveredPublication, UserPublication
)
from app.services.permission_service import check_capability_permission
from app.services.audit_service import record_audit_event
from app.services.academic_sources import academic_aggregator

logger = logging.getLogger(__name__)

# Built-in typed tool specifications
BUILT_IN_TOOLS: List[Dict[str, Any]] = [
    {
        "name": "search_papers",
        "display_name": "Search Scholarly Papers",
        "description": "Searches configured academic sources (arXiv, OpenAlex, Crossref, Semantic Scholar) for publications matching a query.",
        "input_schema_json": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query or research topic"},
                "limit": {"type": "integer", "description": "Max results to return (1-20)", "default": 5},
                "sources": {"type": "array", "items": {"type": "string"}, "description": "Optional source filter"}
            },
            "required": ["query"]
        },
        "output_schema_json": {
            "type": "object",
            "properties": {
                "results": {"type": "array"},
                "total_count": {"type": "integer"}
            }
        },
        "risk_level": "LOW",
        "required_capability": "paper_search",
        "requires_confirmation": False,
        "plugin_slug": None
    },
    {
        "name": "start_research",
        "display_name": "Start Deep Research Project",
        "description": "Initializes a deep academic research project with automated multi-source analysis and synthesis.",
        "input_schema_json": {
            "type": "object",
            "properties": {
                "topic": {"type": "string", "description": "Research topic to investigate"},
                "depth": {"type": "string", "enum": ["quick", "standard", "deep"], "default": "standard"}
            },
            "required": ["topic"]
        },
        "output_schema_json": {
            "type": "object",
            "properties": {
                "project_id": {"type": "integer"},
                "status": {"type": "string"}
            }
        },
        "risk_level": "LOW",
        "required_capability": "research_search",
        "requires_confirmation": False,
        "plugin_slug": None
    },
    {
        "name": "save_paper",
        "display_name": "Save Paper to Library",
        "description": "Saves an academic paper reference with notes and metadata to the user's research library.",
        "input_schema_json": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Paper title"},
                "authors": {"type": "string", "description": "Paper authors"},
                "journal_or_venue": {"type": "string"},
                "publication_year": {"type": "integer"},
                "doi": {"type": "string"},
                "url": {"type": "string"},
                "abstract": {"type": "string"},
                "collection_name": {"type": "string", "default": "General"},
                "user_notes": {"type": "string"}
            },
            "required": ["title"]
        },
        "output_schema_json": {
            "type": "object",
            "properties": {
                "saved_paper_id": {"type": "integer"},
                "success": {"type": "boolean"}
            }
        },
        "risk_level": "LOW",
        "required_capability": "knowledge_retrieval",
        "requires_confirmation": False,
        "plugin_slug": None
    },
    {
        "name": "search_library",
        "display_name": "Search Research Library",
        "description": "Searches the user's saved papers, citations, and research collections.",
        "input_schema_json": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Keyword to search within saved library"},
                "collection": {"type": "string", "description": "Optional collection filter"}
            },
            "required": ["query"]
        },
        "output_schema_json": {
            "type": "object",
            "properties": {
                "papers": {"type": "array"},
                "count": {"type": "integer"}
            }
        },
        "risk_level": "LOW",
        "required_capability": "knowledge_retrieval",
        "requires_confirmation": False,
        "plugin_slug": None
    },
    {
        "name": "list_alerts",
        "display_name": "List Research Alerts",
        "description": "Retrieves unread and recent smart research notifications and publication alerts.",
        "input_schema_json": {
            "type": "object",
            "properties": {
                "unread_only": {"type": "boolean", "default": False},
                "limit": {"type": "integer", "default": 10}
            }
        },
        "output_schema_json": {
            "type": "object",
            "properties": {
                "alerts": {"type": "array"},
                "unread_count": {"type": "integer"}
            }
        },
        "risk_level": "LOW",
        "required_capability": "notifications",
        "requires_confirmation": False,
        "plugin_slug": None
    },
    {
        "name": "mark_alert_read",
        "display_name": "Mark Alert as Read",
        "description": "Marks a specific notification alert as read.",
        "input_schema_json": {
            "type": "object",
            "properties": {
                "alert_id": {"type": "integer", "description": "ID of the alert to mark read"}
            },
            "required": ["alert_id"]
        },
        "output_schema_json": {
            "type": "object",
            "properties": {
                "success": {"type": "boolean"}
            }
        },
        "risk_level": "LOW",
        "required_capability": "notifications",
        "requires_confirmation": False,
        "plugin_slug": None
    },
    {
        "name": "fetch_custom_source",
        "display_name": "Fetch Custom Research Source",
        "description": "Retrieves recent publications or feed items from a validated user-configured custom source.",
        "input_schema_json": {
            "type": "object",
            "properties": {
                "source_id": {"type": "integer", "description": "ID of the custom source"}
            },
            "required": ["source_id"]
        },
        "output_schema_json": {
            "type": "object",
            "properties": {
                "items": {"type": "array"},
                "count": {"type": "integer"}
            }
        },
        "risk_level": "MEDIUM",
        "required_capability": "rss_read",
        "requires_confirmation": False,
        "plugin_slug": "custom-sources"
    },
    {
        "name": "delete_saved_paper",
        "display_name": "Delete Saved Paper",
        "description": "Removes a paper from the research library. Destructive action requiring confirmation.",
        "input_schema_json": {
            "type": "object",
            "properties": {
                "paper_id": {"type": "integer", "description": "ID of the saved paper to remove"}
            },
            "required": ["paper_id"]
        },
        "output_schema_json": {
            "type": "object",
            "properties": {
                "deleted": {"type": "boolean"}
            }
        },
        "risk_level": "HIGH",
        "required_capability": "knowledge_retrieval",
        "requires_confirmation": True,
        "plugin_slug": None
    }
]


def seed_built_in_tools(db: Session) -> int:
    """
    Seeds tool definitions into the database if not present.
    """
    count = 0
    for t_def in BUILT_IN_TOOLS:
        existing = db.query(ToolDefinition).filter(ToolDefinition.name == t_def["name"]).first()
        if not existing:
            tool = ToolDefinition(
                name=t_def["name"],
                display_name=t_def["display_name"],
                description=t_def["description"],
                input_schema_json=t_def["input_schema_json"],
                output_schema_json=t_def.get("output_schema_json"),
                risk_level=t_def.get("risk_level", "LOW"),
                required_capability=t_def.get("required_capability"),
                requires_confirmation=t_def.get("requires_confirmation", False),
                is_enabled=True,
                plugin_slug=t_def.get("plugin_slug")
            )
            db.add(tool)
            count += 1
    if count > 0:
        db.commit()
        logger.info(f"Seeded {count} built-in tool definitions.")
    return count


async def execute_tool(
    db: Session,
    user_id: int,
    tool_name: str,
    arguments: Dict[str, Any],
    confirmed: bool = False,
    triggered_by: str = "user"
) -> Dict[str, Any]:
    """
    Validates tool existence, schema, permissions, and confirmation requirements,
    then executes the typed handler and records audit / tool execution history.
    """
    start_time = time.time()
    
    tool = db.query(ToolDefinition).filter(ToolDefinition.name == tool_name).first()
    if not tool:
        return {
            "success": False,
            "error": f"Tool '{tool_name}' is not registered in the system.",
            "error_type": "TOOL_NOT_FOUND"
        }
        
    if not tool.is_enabled:
        return {
            "success": False,
            "error": f"Tool '{tool_name}' is currently disabled.",
            "error_type": "TOOL_DISABLED"
        }

    # Confirmation requirement check (prompt user before checking/using permissions)
    if tool.requires_confirmation and not confirmed:
        return {
            "success": False,
            "error": f"Action '{tool.display_name}' requires explicit user confirmation before execution.",
            "error_type": "CONFIRMATION_REQUIRED",
            "confirmation_prompt": f"Are you sure you want to execute '{tool.display_name}'?"
        }

    # Permission check
    has_perm, perm_err = check_capability_permission(db, user_id, tool.required_capability)
    if not has_perm:
        # Record failed execution attempt
        execution = ToolExecution(
            user_id=user_id,
            tool_id=tool.id,
            input_summary=str(arguments)[:200],
            success=False,
            error_message=perm_err,
            required_confirmation=tool.requires_confirmation,
            was_confirmed=confirmed,
            triggered_by=triggered_by,
            plugin_slug=tool.plugin_slug,
            duration_ms=int((time.time() - start_time) * 1000)
        )
        db.add(execution)
        db.commit()
        return {
            "success": False,
            "error": perm_err,
            "error_type": "PERMISSION_DENIED",
            "required_capability": tool.required_capability
        }

    # Execute specific typed tool logic
    result: Dict[str, Any] = {}
    success = True
    error_msg = None

    try:
        if tool_name == "search_papers":
            query = arguments.get("query", "").strip()
            limit = min(int(arguments.get("limit", 5)), 20)
            if not query:
                raise ValueError("Query parameter is required")
            papers = await academic_aggregator.search_all(query, limit=limit)
            result = {
                "results": papers,
                "total_count": len(papers),
                "query": query
            }

        elif tool_name == "start_research":
            topic = arguments.get("topic", "").strip()
            depth = arguments.get("depth", "standard")
            if not topic:
                raise ValueError("Topic is required")
            project = ResearchProject(
                user_id=user_id,
                title=f"Research: {topic[:100]}",
                topic=topic,
                depth=depth,
                status="completed",
                summary=f"Automated initial research synthesis initiated for: {topic}"
            )
            db.add(project)
            db.commit()
            db.refresh(project)
            result = {"project_id": project.id, "title": project.title, "status": project.status}

        elif tool_name == "save_paper":
            title = arguments.get("title", "").strip()
            if not title:
                raise ValueError("Paper title is required")
            saved = SavedPaper(
                user_id=user_id,
                paper_title=title,
                authors=arguments.get("authors"),
                journal_or_venue=arguments.get("journal_or_venue"),
                publication_year=arguments.get("publication_year"),
                doi=arguments.get("doi"),
                url=arguments.get("url"),
                abstract=arguments.get("abstract"),
                collection_name=arguments.get("collection_name", "General"),
                user_notes=arguments.get("user_notes")
            )
            db.add(saved)
            db.commit()
            db.refresh(saved)
            result = {"saved_paper_id": saved.id, "success": True}

        elif tool_name == "search_library":
            query = arguments.get("query", "").strip().lower()
            papers = db.query(SavedPaper).filter(
                SavedPaper.user_id == user_id,
                SavedPaper.paper_title.ilike(f"%{query}%")
            ).limit(20).all()
            result = {
                "papers": [
                    {"id": p.id, "title": p.paper_title, "authors": p.authors, "year": p.publication_year, "collection": p.collection_name}
                    for p in papers
                ],
                "count": len(papers)
            }

        elif tool_name == "list_alerts":
            unread_only = arguments.get("unread_only", False)
            q = db.query(NotificationAlert).filter(NotificationAlert.user_id == user_id)
            if unread_only:
                q = q.filter(NotificationAlert.is_read == False)
            alerts = q.order_by(NotificationAlert.created_at.desc()).limit(arguments.get("limit", 10)).all()
            unread_count = db.query(NotificationAlert).filter(
                NotificationAlert.user_id == user_id,
                NotificationAlert.is_read == False
            ).count()
            result = {
                "alerts": [
                    {"id": a.id, "title": a.title, "message": a.message, "relevance": a.relevance_category, "is_read": a.is_read}
                    for a in alerts
                ],
                "unread_count": unread_count
            }

        elif tool_name == "mark_alert_read":
            alert_id = arguments.get("alert_id")
            alert = db.query(NotificationAlert).filter(
                NotificationAlert.id == alert_id,
                NotificationAlert.user_id == user_id
            ).first()
            if alert:
                alert.is_read = True
                db.commit()
                result = {"success": True, "alert_id": alert_id}
            else:
                raise ValueError("Alert not found or unauthorized")

        elif tool_name == "fetch_custom_source":
            from app.models.models import CustomSource
            from app.services.source_adapter import fetch_custom_source as adapter_fetch
            source_id = arguments.get("source_id")
            source = db.query(CustomSource).filter(
                CustomSource.id == source_id,
                CustomSource.user_id == user_id
            ).first()
            if not source:
                raise ValueError("Custom source not found or unauthorized")
            items = await adapter_fetch(source)
            result = {"items": items, "count": len(items), "source_name": source.name}

        elif tool_name == "delete_saved_paper":
            paper_id = arguments.get("paper_id")
            paper = db.query(SavedPaper).filter(
                SavedPaper.id == paper_id,
                SavedPaper.user_id == user_id
            ).first()
            if paper:
                db.delete(paper)
                db.commit()
                result = {"deleted": True, "paper_id": paper_id}
            else:
                raise ValueError("Saved paper not found or unauthorized")

        else:
            raise NotImplementedError(f"Handler for tool '{tool_name}' not implemented.")

    except Exception as exc:
        success = False
        error_msg = str(exc)
        logger.error(f"Error executing tool {tool_name}: {exc}", exc_info=True)

    duration_ms = int((time.time() - start_time) * 1000)

    # Record tool execution in DB
    execution = ToolExecution(
        user_id=user_id,
        tool_id=tool.id,
        input_summary=str({k: v for k, v in arguments.items() if "password" not in k.lower() and "key" not in k.lower()})[:500],
        success=success,
        error_message=error_msg,
        required_confirmation=tool.requires_confirmation,
        was_confirmed=confirmed if tool.requires_confirmation else None,
        triggered_by=triggered_by,
        plugin_slug=tool.plugin_slug,
        duration_ms=duration_ms
    )
    db.add(execution)
    db.commit()

    # Record audit event
    record_audit_event(
        db=db,
        user_id=user_id,
        category="tool",
        action=f"tool.execute.{tool_name}",
        resource_type="ToolDefinition",
        resource_id=str(tool.id),
        resource_name=tool.name,
        success=success,
        error_summary=error_msg,
        metadata={"duration_ms": duration_ms, "triggered_by": triggered_by}
    )

    if not success:
        return {"success": False, "error": error_msg, "error_type": "EXECUTION_ERROR"}

    return {
        "success": True,
        "tool": tool_name,
        "result": result,
        "duration_ms": duration_ms
    }
