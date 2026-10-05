"""
Comprehensive Automated Tests for Phase 5 — Desktop Agent, Browser Automation, Local Computer Control, and Gesture Interaction
"""

import pytest
from fastapi.testclient import TestClient
from pathlib import Path
from app.main import app
from app.core.database import SessionLocal
from app.models.models import User, DesktopDevice, DesktopPermission, ActionPlan, GesturePreference
from app.services.desktop_security import (
    validate_safe_file_path,
    trigger_emergency_stop,
    reset_emergency_stop,
    is_emergency_stop_active,
    SANDBOX_ROOT,
)

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_emergency_stop():
    """Ensure emergency stop is reset before each test."""
    reset_emergency_stop(1)
    yield
    reset_emergency_stop(1)


# ─── 1. Desktop Pairing & Device Management Tests ─────────────────────────────

def test_desktop_pairing_request():
    """Test generating a short-lived 6-digit pairing code."""
    res = client.post("/api/v1/desktop/pair/request", json={"device_name": "Scholar Laptop", "device_platform": "windows"})
    assert res.status_code == 200
    data = res.json()
    assert "code" in data
    assert "-" in data["code"]
    assert len(data["code"]) == 7  # "XXX-XXX"
    assert data["expires_in_seconds"] == 600
    assert data["device_name"] == "Scholar Laptop"


def test_desktop_pairing_verify_success_and_invalid():
    """Test pairing verification with valid code, and rejection of invalid code."""
    # 1. Request pairing code
    req_res = client.post("/api/v1/desktop/pair/request", json={"device_name": "Desktop Lab", "device_platform": "linux"})
    code = req_res.json()["code"]

    # 2. Verify with invalid code -> should fail
    bad_res = client.post("/api/v1/desktop/pair/verify", json={"pairing_code": "000-000", "device_secret_token": "secret123"})
    assert bad_res.status_code == 400

    # 3. Verify with correct code -> should succeed
    good_res = client.post("/api/v1/desktop/pair/verify", json={"pairing_code": code, "device_secret_token": "secret123"})
    assert good_res.status_code == 200
    ver_data = good_res.json()
    assert ver_data["status"] == "paired"
    assert ver_data["is_paired"] is True
    assert "device_id" in ver_data


def test_desktop_device_list_heartbeat_and_revocation():
    """Test listing paired devices, heartbeat ping, and device revocation."""
    req_res = client.post("/api/v1/desktop/pair/request", json={"device_name": "Workstation A", "device_platform": "windows"})
    code = req_res.json()["code"]
    ver_res = client.post("/api/v1/desktop/pair/verify", json={"pairing_code": code, "device_secret_token": "tokenA"})
    device_id = ver_res.json()["device_id"]

    # List devices
    list_res = client.get("/api/v1/desktop/devices")
    assert list_res.status_code == 200
    devices = list_res.json()
    assert any(d["device_id"] == device_id for d in devices)

    # Heartbeat
    hb_res = client.post(f"/api/v1/desktop/devices/{device_id}/heartbeat")
    assert hb_res.status_code == 200
    assert hb_res.json()["status"] == "alive"

    # Revoke device
    rev_res = client.delete(f"/api/v1/desktop/devices/{device_id}")
    assert rev_res.status_code == 200
    assert rev_res.json()["status"] == "revoked"

    # Heartbeat after revocation should fail
    hb_post_rev = client.post(f"/api/v1/desktop/devices/{device_id}/heartbeat")
    assert hb_post_rev.status_code == 404


# ─── 2. Permissions System Tests ──────────────────────────────────────────────

def test_permissions_retrieval_and_defaults():
    """Test desktop permissions list and verification of defaults."""
    res = client.get("/api/v1/desktop/permissions")
    assert res.status_code == 200
    perms = res.json()
    perm_dict = {p["permission_key"]: p for p in perms}

    # BROWSER_READ is safe, defaults to granted
    assert perm_dict["BROWSER_READ"]["is_granted"] is True
    # FILE_DELETE is critical, must default to not granted and disallow always_allow
    assert perm_dict["FILE_DELETE"]["risk_level"] == "CRITICAL"
    assert perm_dict["FILE_DELETE"]["always_allow_permitted"] is False


def test_permission_grant_and_revoke():
    """Test granting and revoking permissions."""
    # Grant FILE_READ
    grant_res = client.post(
        "/api/v1/desktop/permissions/grant",
        json={"permission_key": "FILE_READ", "temporary": True, "duration_minutes": 15},
    )
    assert grant_res.status_code == 200
    assert grant_res.json()["status"] == "granted"

    # Verify status in list
    res = client.get("/api/v1/desktop/permissions")
    perm_dict = {p["permission_key"]: p for p in res.json()}
    assert perm_dict["FILE_READ"]["is_granted"] is True
    assert perm_dict["FILE_READ"]["is_temporary"] is True

    # Revoke
    rev_res = client.post(
        "/api/v1/desktop/permissions/revoke",
        json={"permission_key": "FILE_READ"},
    )
    assert rev_res.status_code == 200
    assert rev_res.json()["status"] == "revoked"

    # Check revoked
    res_after = client.get("/api/v1/desktop/permissions")
    perm_dict_after = {p["permission_key"]: p for p in res_after.json()}
    assert perm_dict_after["FILE_READ"]["is_granted"] is False


# ─── 3. Local File Sandboxing & Path Traversal Resistance ─────────────────────

def test_safe_path_sandboxing():
    """Test that file paths are strictly sandboxed and traversal is blocked."""
    # 1. Valid safe file inside sandbox
    is_safe, resolved, err = validate_safe_file_path("my_research_paper.txt")
    assert is_safe is True
    assert resolved is not None
    assert resolved.name == "my_research_paper.txt"
    assert resolved.is_relative_to(SANDBOX_ROOT)

    # 2. Block path traversal attempts
    is_safe_traversal, _, err_traversal = validate_safe_file_path("../../Windows/System32/cmd.exe")
    assert is_safe_traversal is False
    assert "forbidden" in err_traversal.lower() or "traversal" in err_traversal.lower()

    # 3. Block sensitive Linux paths
    is_safe_etc, _, err_etc = validate_safe_file_path("/etc/passwd")
    assert is_safe_etc is False
    assert "sensitive" in err_etc.lower() or "forbidden" in err_etc.lower()

    # 4. Block access to SSH keys
    is_safe_ssh, _, _ = validate_safe_file_path(".ssh/id_rsa")
    assert is_safe_ssh is False


# ─── 4. Tool Registry & Safe Execution Tests ─────────────────────────────────

def test_list_desktop_tools():
    """Test listing all typed desktop tools."""
    res = client.get("/api/v1/desktop/tools")
    assert res.status_code == 200
    tools = res.json()
    tool_names = [t["name"] for t in tools]
    assert "browser_search" in tool_names
    assert "browser_navigate" in tool_names
    assert "read_local_file" in tool_names
    assert "save_local_file" in tool_names
    assert "delete_file" in tool_names
    assert "open_application" in tool_names


def test_clipboard_tools_execution():
    """Test clipboard read and write tools."""
    write_res = client.post(
        "/api/v1/desktop/tools/execute",
        json={"tool_name": "clipboard_write", "arguments": {"text": "Quantum Computing Preprint 2026"}},
    )
    assert write_res.status_code == 200
    assert write_res.json()["success"] is True

    # Read back (requires confirmation if confirmed=False)
    read_res = client.post(
        "/api/v1/desktop/tools/execute",
        json={"tool_name": "clipboard_read", "arguments": {}, "confirmed": True},
    )
    assert read_res.status_code == 200
    res_json = read_res.json()
    assert res_json["success"] is True
    assert "Quantum Computing Preprint 2026" in res_json["result"]["clipboard_text"]


def test_sandboxed_file_save_and_read():
    """Test creating and reading a file strictly inside the sandbox."""
    test_filename = "phase5_test_doc.txt"
    content = "Summary of Transformer Architectures for Graph Neural Networks"

    # Save file
    save_res = client.post(
        "/api/v1/desktop/tools/execute",
        json={
            "tool_name": "save_local_file",
            "arguments": {"file_name": test_filename, "content": content},
            "confirmed": True,
        },
    )
    assert save_res.status_code == 200
    assert save_res.json()["success"] is True

    # Read file
    read_res = client.post(
        "/api/v1/desktop/tools/execute",
        json={
            "tool_name": "read_local_file",
            "arguments": {"file_name": test_filename},
            "confirmed": True,
        },
    )
    assert read_res.status_code == 200
    read_data = read_res.json()
    assert read_data["success"] is True
    assert content in read_data["result"]["content_preview"]
    assert read_data["privacy_scope"] == "LOCAL_ONLY"


def test_unapproved_application_blocked():
    """Test that arbitrary application execution is blocked and only whitelisted apps succeed."""
    # Attempt to execute unapproved shell / script
    evil_app_res = client.post(
        "/api/v1/desktop/tools/execute",
        json={
            "tool_name": "open_application",
            "arguments": {"app_name": "powershell.exe"},
            "confirmed": True,
        },
    )
    assert evil_app_res.status_code == 200
    res = evil_app_res.json()
    assert res["success"] is False
    assert "whitelist" in res["error"].lower()

    # Launch approved app (calc / notepad)
    approved_res = client.post(
        "/api/v1/desktop/tools/execute",
        json={
            "tool_name": "open_application",
            "arguments": {"app_name": "notepad"},
            "confirmed": True,
        },
    )
    assert approved_res.status_code == 200
    assert approved_res.json()["success"] is True


# ─── 5. Browser Automation & User Takeover Tests ──────────────────────────────

def test_browser_search():
    """Test browser search tool."""
    res = client.post(
        "/api/v1/desktop/tools/execute",
        json={"tool_name": "browser_search", "arguments": {"query": "deep learning", "limit": 3}},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "results" in data["result"]


def test_browser_unsafe_url_rejection():
    """Test rejection of dangerous protocols (javascript:, file:, private IPs)."""
    # javascript: scheme
    js_res = client.post(
        "/api/v1/desktop/tools/execute",
        json={"tool_name": "browser_navigate", "arguments": {"url": "javascript:alert(1)"}, "confirmed": True},
    )
    assert js_res.status_code == 200
    assert js_res.json()["success"] is False
    assert "security" in js_res.json()["error"].lower()

    # file: scheme
    file_res = client.post(
        "/api/v1/desktop/tools/execute",
        json={"tool_name": "browser_navigate", "arguments": {"url": "file:///C:/Windows/win.ini"}, "confirmed": True},
    )
    assert file_res.status_code == 200
    assert file_res.json()["success"] is False


# ─── 6. Emergency Stop Tests ──────────────────────────────────────────────────

def test_emergency_stop_halts_execution():
    """Test triggering Emergency Stop halts all local actions immediately."""
    # 1. Trigger emergency stop
    stop_res = client.post("/api/v1/desktop/emergency-stop")
    assert stop_res.status_code == 200
    assert stop_res.json()["emergency_stop_active"] is True

    # 2. Check emergency status
    status_res = client.get("/api/v1/desktop/emergency-stop/status")
    assert status_res.status_code == 200
    assert status_res.json()["emergency_stop_active"] is True

    # 3. Tool execution should be locked (HTTP 423)
    tool_res = client.post(
        "/api/v1/desktop/tools/execute",
        json={"tool_name": "clipboard_write", "arguments": {"text": "blocked"}},
    )
    assert tool_res.status_code == 423
    assert "Emergency Stop" in tool_res.json()["detail"]

    # 4. Reset emergency stop
    reset_res = client.post("/api/v1/desktop/emergency-stop/reset")
    assert reset_res.status_code == 200
    assert reset_res.json()["emergency_stop_active"] is False

    # 5. Tool execution works again
    tool_res_after = client.post(
        "/api/v1/desktop/tools/execute",
        json={"tool_name": "clipboard_write", "arguments": {"text": "resumed"}},
    )
    assert tool_res_after.status_code == 200
    assert tool_res_after.json()["success"] is True


# ─── 7. Action Planning Tests ─────────────────────────────────────────────────

def test_action_planner_generation_and_execution():
    """Test natural language goal decomposition into typed steps and execution."""
    goal = "Find recent papers about AI flood prediction and save them to library"
    plan_res = client.post("/api/v1/desktop/plans/generate", json={"goal": goal})
    assert plan_res.status_code == 200
    plan_data = plan_res.json()
    assert "id" in plan_data
    assert plan_data["step_count"] >= 2
    steps = plan_data["steps"]
    tools_planned = [s["tool_name"] for s in steps]
    assert "start_research" in tools_planned or "search_papers" in tools_planned

    # Run plan
    run_res = client.post(f"/api/v1/desktop/plans/{plan_data['id']}/run")
    assert run_res.status_code == 200
    assert run_res.json()["status"] in ["completed", "paused_for_takeover"]


# ─── 8. Gesture Control & Privacy Tests ───────────────────────────────────────

def test_gesture_preferences_and_security_rule():
    """Test gesture settings and strict security enforcement (gestures cannot authorize critical operations)."""
    # 1. Reset to initial default settings (opt-in camera OFF)
    client.put(
        "/api/v1/desktop/gesture/preferences",
        json={"gesture_control_enabled": False, "camera_active": False},
    )
    pref_res = client.get("/api/v1/desktop/gesture/preferences")
    assert pref_res.status_code == 200
    pref = pref_res.json()
    assert "privacy_notice" in pref
    assert pref["camera_active"] is False  # Opt-in camera defaults to OFF

    # 2. Enable gestures
    update_res = client.put(
        "/api/v1/desktop/gesture/preferences",
        json={"gesture_control_enabled": True, "camera_active": True},
    )
    assert update_res.status_code == 200
    assert update_res.json()["gesture_control_enabled"] is True

    # 3. Trigger low-risk gesture (thumbs_up -> approve_low_risk)
    trig_res = client.post("/api/v1/desktop/gesture/trigger", json={"gesture": "thumbs_up"})
    assert trig_res.status_code == 200
    assert trig_res.json()["is_low_risk"] is True

    # 4. Attempt to use gesture for high-risk action (delete_file) -> MUST BE REJECTED
    bad_trig = client.post(
        "/api/v1/desktop/gesture/trigger",
        json={"gesture": "thumbs_up", "target_action": "delete_file"},
    )
    assert bad_trig.status_code == 403
    assert "CANNOT" in bad_trig.json()["detail"]


# ─── 9. Audit Logs & Privacy Scope ───────────────────────────────────────────

def test_audit_logs_privacy_indicators():
    """Test retrieving local execution audit logs with privacy indicators."""
    res = client.get("/api/v1/desktop/audit-logs?limit=10")
    assert res.status_code == 200
    logs = res.json()
    assert isinstance(logs, list)
    if logs:
        assert "privacy_scope" in logs[0]
        assert logs[0]["privacy_scope"] in ["LOCAL_ONLY", "SENT_TO_AI_PROVIDER", "SENT_TO_EXTERNAL_SERVICE"]
