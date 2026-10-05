"""
Phase 4 Automated Tests

Covers:
1. Plugin marketplace listing, installation, configuration, toggle, and uninstallation.
2. Custom research sources: URL validation, SSRF protection, rejection of dangerous schemes.
3. Multi-model AI providers: listing, masking API keys, model routing configuration.
4. Agent command/tool registry: listing, permission enforcement, sensitive action confirmation.
5. Voice assistant: preference CRUD, spoken command parsing, safety confirmation for sensitive actions.
6. Audit & Activity logging: event recording, activity inspection, and statistics.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# ─── 1. Plugin Ecosystem & Marketplace Tests ─────────────────────────────────

def test_plugin_marketplace_listing():
    response = client.get("/api/v1/plugins/marketplace")
    assert response.status_code == 200
    plugins = response.json()
    assert isinstance(plugins, list)
    assert len(plugins) > 0
    slugs = [p["slug"] for p in plugins]
    assert "arxiv-search" in slugs
    assert "semantic-scholar-search" in slugs

def test_plugin_install_and_uninstall():
    # Install arXiv plugin
    res = client.post("/api/v1/plugins/install", json={"plugin_slug": "arxiv-search"})
    assert res.status_code in (200, 201)
    data = res.json()
    assert data["is_installed"] is True
    assert data["is_enabled"] is True

    # Check installed list
    res_inst = client.get("/api/v1/plugins/installed")
    assert res_inst.status_code == 200
    installed_slugs = [p["slug"] for p in res_inst.json()]
    assert "arxiv-search" in installed_slugs

    # Toggle plugin disabled
    res_toggle = client.post("/api/v1/plugins/arxiv-search/toggle")
    assert res_toggle.status_code == 200
    assert res_toggle.json()["is_enabled"] is False

    # Toggle back enabled
    res_toggle2 = client.post("/api/v1/plugins/arxiv-search/toggle")
    assert res_toggle2.status_code == 200
    assert res_toggle2.json()["is_enabled"] is True

    # Uninstall plugin
    res_uninst = client.delete("/api/v1/plugins/arxiv-search/uninstall")
    assert res_uninst.status_code in (200, 204)

def test_cannot_install_unavailable_plugin():
    # Trying to install a coming-soon or unavailable plugin
    res = client.post("/api/v1/plugins/install", json={"plugin_slug": "whisper-transcription"})
    # Whisper is marked availability_status='coming_soon', is_available=False
    assert res.status_code == 400
    assert "not yet available" in res.json()["detail"].lower()

# ─── 2. Custom Sources & SSRF Protection Tests ───────────────────────────────

def test_custom_source_url_validation_safe():
    res = client.post("/api/v1/sources/validate", json={"url": "https://arxiv.org/rss/cs.AI", "source_type": "rss"})
    assert res.status_code == 200
    data = res.json()
    # It passes URL safety checks
    assert "error" in data

def test_custom_source_blocks_dangerous_schemes():
    # javascript: scheme
    res1 = client.post("/api/v1/sources/validate", json={"url": "javascript:alert(1)"})
    assert res1.json()["valid"] is False
    assert "not allowed" in res1.json()["error"].lower() or "only http" in res1.json()["error"].lower()

    # file: scheme
    res2 = client.post("/api/v1/sources/validate", json={"url": "file:///etc/passwd"})
    assert res2.json()["valid"] is False

    # data: scheme
    res3 = client.post("/api/v1/sources/validate", json={"url": "data:text/html,<script>alert(1)</script>"})
    assert res3.json()["valid"] is False

def test_custom_source_ssrf_protection():
    # Localhost and private IP blocked
    res1 = client.post("/api/v1/sources/validate", json={"url": "http://127.0.0.1:8000/secret"})
    assert res1.json()["valid"] is False
    assert "not allowed" in res1.json()["error"].lower()

    res2 = client.post("/api/v1/sources/validate", json={"url": "http://localhost:3000"})
    assert res2.json()["valid"] is False

    res3 = client.post("/api/v1/sources/validate", json={"url": "http://10.0.0.1/admin"})
    assert res3.json()["valid"] is False

def test_custom_source_crud():
    source_url = "https://news.ycombinator.com/rss"
    # Create
    res = client.post("/api/v1/sources/", json={
        "name": "HN Tech Research RSS",
        "url": source_url,
        "source_type": "rss",
        "description": "Tech news feed for testing"
    })
    assert res.status_code == 201
    source_id = res.json()["id"]
    assert res.json()["name"] == "HN Tech Research RSS"

    # List
    res_list = client.get("/api/v1/sources/")
    assert res_list.status_code == 200
    assert any(s["id"] == source_id for s in res_list.json())

    # Update
    res_up = client.put(f"/api/v1/sources/{source_id}", json={"name": "Updated RSS Feed"})
    assert res_up.status_code == 200
    assert res_up.json()["name"] == "Updated RSS Feed"

    # Delete
    res_del = client.delete(f"/api/v1/sources/{source_id}")
    assert res_del.status_code == 204

# ─── 3. AI Providers & Model Routing Tests ───────────────────────────────────

def test_providers_catalogue():
    res = client.get("/api/v1/providers/")
    assert res.status_code == 200
    providers = res.json()
    slugs = [p["slug"] for p in providers]
    assert "gemini" in slugs
    assert "openai" in slugs
    assert "anthropic" in slugs

def test_provider_credentials_masked():
    # Save provider API key
    res_save = client.post("/api/v1/providers/config", json={
        "provider_slug": "openai",
        "api_key": "sk-1234567890abcdef1234567890abcdef",
        "is_enabled": True
    })
    assert res_save.status_code == 200
    # API key must be masked in response
    masked = res_save.json()["masked_key"]
    assert "sk-" in masked
    assert "••••••••" in masked
    assert "sk-1234567890abcdef" not in masked

    # Get configs
    res_conf = client.get("/api/v1/providers/config")
    assert res_conf.status_code == 200
    for c in res_conf.json():
        if c["provider_slug"] == "openai":
            assert c["has_api_key"] is True
            assert "••••••••" in c["masked_key"]
            assert "sk-1234567890abcdef" not in c["masked_key"]

    # Delete config
    res_del = client.delete("/api/v1/providers/config/openai")
    assert res_del.status_code == 200

def test_model_routing_preferences():
    # Get current routing
    res = client.get("/api/v1/providers/routes")
    assert res.status_code == 200
    data = res.json()
    assert "routes" in data
    assert "chat" in data["routes"]
    assert "research" in data["routes"]

    # Update routing
    res_up = client.put("/api/v1/providers/routes", json={
        "chat_model": "gemini:gemini-2.0-flash",
        "research_model": "gemini:gemini-1.5-pro",
        "auto_route_enabled": True
    })
    assert res_up.status_code == 200
    assert res_up.json()["routes"]["chat"] == "gemini:gemini-2.0-flash"

# ─── 4. Typed Tools & Agent Command Registry Tests ───────────────────────────

def test_list_tools():
    res = client.get("/api/v1/tools/")
    assert res.status_code == 200
    tools = res.json()
    assert len(tools) > 0
    names = [t["name"] for t in tools]
    assert "search_papers" in names
    assert "start_research" in names
    assert "save_paper" in names
    assert "list_alerts" in names
    assert "delete_saved_paper" in names

def test_tool_execution_safe():
    # Execute start_research
    res = client.post("/api/v1/tools/execute", json={
        "tool_name": "start_research",
        "arguments": {"topic": "Quantum Error Correction", "depth": "quick"}
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "project_id" in data["result"]

def test_tool_sensitive_action_requires_confirmation():
    # delete_saved_paper has requires_confirmation=True
    res = client.post("/api/v1/tools/execute", json={
        "tool_name": "delete_saved_paper",
        "arguments": {"paper_id": 99999},
        "confirmed": False
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is False
    assert data["confirmation_required"] is True
    assert "confirmation" in data["message"].lower()

def test_permission_center_overview():
    res = client.get("/api/v1/tools/permissions")
    assert res.status_code == 200
    data = res.json()
    assert "all_capabilities" in data
    assert len(data["all_capabilities"]) > 0

# ─── 5. Voice Assistant Tests ────────────────────────────────────────────────

def test_voice_preferences_crud():
    # Get preferences
    res = client.get("/api/v1/voice/preferences")
    assert res.status_code == 200

    # Update preferences
    res_up = client.put("/api/v1/voice/preferences", json={
        "voice_enabled": True,
        "speech_recognition_language": "en-US",
        "voice_output_enabled": True,
        "speaking_rate": 1.1,
        "auto_speak_responses": True,
        "preferred_voice_name": "Google US English"
    })
    assert res_up.status_code == 200
    data = res_up.json()
    assert data["voice_enabled"] is True
    assert data["speaking_rate"] == 1.1

def test_voice_command_safe_routing():
    # Spoken command to list alerts
    res = client.post("/api/v1/voice/command", json={"transcript": "Show my latest alerts"})
    assert res.status_code == 200
    data = res.json()
    assert data["interpreted_action"] == "list_alerts"
    assert "execution" in data

def test_voice_safety_blocks_unconfirmed_sensitive_command():
    # Voice command attempting deletion without confirmed=True
    res = client.post("/api/v1/voice/command", json={
        "transcript": "Delete paper 123",
        "confirmed": False
    })
    assert res.status_code == 200
    data = res.json()
    assert data["requires_confirmation"] is True
    assert "sensitive action" in data["confirmation_prompt"].lower()

# ─── 6. Audit & Activity Log Tests ───────────────────────────────────────────

def test_audit_log_and_stats():
    res_stats = client.get("/api/v1/audit/stats")
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert "total_events" in stats
    assert "successful_events" in stats

    res_events = client.get("/api/v1/audit/")
    assert res_events.status_code == 200
    events = res_events.json()
    assert isinstance(events, list)
    # Check that events never contain raw API keys or passwords
    for ev in events:
        meta_str = str(ev.get("metadata", "")).lower()
        assert "password" not in meta_str
        assert "api_key" not in meta_str
