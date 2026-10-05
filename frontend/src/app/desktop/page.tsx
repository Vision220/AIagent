"use client";

import React, { useState, useEffect } from "react";
import {
  Monitor,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Play,
  RotateCcw,
  KeyRound,
  CheckCircle2,
  XCircle,
  Clock,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  HandMetal,
  FileText,
  FolderLock,
  Globe,
  RefreshCw,
  ExternalLink,
  Trash2,
  ChevronRight,
  Terminal,
  Cpu,
  Layers,
  Lock,
  Unlock,
  Radio,
  Eye,
  AlertOctagon,
  Sparkles,
} from "lucide-react";

import { API_BASE as API } from "@/lib/api-config";

interface DesktopDevice {
  id: number;
  device_id: string;
  device_name: string;
  device_platform: string;
  is_paired: boolean;
  is_active: boolean;
  last_heartbeat_at?: string;
  created_at?: string;
}

interface DesktopPermission {
  permission_key: string;
  description: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  is_granted: boolean;
  is_temporary: boolean;
  always_allow: boolean;
  expires_at?: string;
  always_allow_permitted: boolean;
}

interface ActionPlanStep {
  step_id: number;
  title: string;
  tool_name: string;
  arguments: Record<string, any>;
  required_permission: string;
  risk_level: string;
  confirmation_required: boolean;
  privacy_scope: string;
  status: string;
}

interface ActionPlan {
  id: number;
  title: string;
  goal: string;
  status: string;
  steps?: ActionPlanStep[];
  step_count?: number;
  requires_user_takeover?: boolean;
  takeover_url?: string;
  takeover_prompt?: string;
}

interface AuditLog {
  id: number;
  tool_name: string;
  action_type: string;
  status: string;
  risk_level: string;
  privacy_scope: "LOCAL_ONLY" | "SENT_TO_AI_PROVIDER" | "SENT_TO_EXTERNAL_SERVICE";
  duration_ms: number;
  requires_confirmation: boolean;
  error_message?: string;
  executed_at?: string;
}

export default function DesktopAgentPage() {
  const [activeTab, setActiveTab] = useState<"planner" | "pairing" | "permissions" | "gestures" | "audit">("planner");

  // State
  const [devices, setDevices] = useState<DesktopDevice[]>([]);
  const [permissions, setPermissions] = useState<DesktopPermission[]>([]);
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [activePlan, setActivePlan] = useState<ActionPlan | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [emergencyStopActive, setEmergencyStopActive] = useState<boolean>(false);

  // Pairing code state
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [codeExpiresIn, setCodeExpiresIn] = useState<number>(0);
  const [isRequestingCode, setIsRequestingCode] = useState(false);

  // Action Planner input
  const [goalInput, setGoalInput] = useState("");
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isRunningPlan, setIsRunningPlan] = useState(false);

  // Takeover handoff state
  const [takeoverPrompt, setTakeoverPrompt] = useState<string | null>(null);
  const [takeoverUrl, setTakeoverUrl] = useState<string | null>(null);

  // Gesture preferences
  const [gesturesEnabled, setGesturesEnabled] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [recentGesture, setRecentGesture] = useState<string | null>(null);
  const [gestureAlert, setGestureAlert] = useState<string | null>(null);

  // Local sandbox test state
  const [sandboxDocName, setSandboxDocName] = useState("flood_prediction_notes.txt");
  const [sandboxDocContent, setSandboxDocContent] = useState("Hydrological deep learning model comparison: PINN vs LSTM...");
  const [sandboxResult, setSandboxResult] = useState<string | null>(null);

  // Confirmation modal state
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    tool_name: string;
    display_name: string;
    risk_level: string;
    required_permission: string;
    privacy_scope: string;
    arguments: any;
    prompt: string;
  } | null>(null);

  // 1. Initial Data Fetch
  const loadData = async () => {
    try {
      const [devRes, permRes, planRes, auditRes, stopRes, gestRes] = await Promise.all([
        fetch(`${API}/desktop/devices`),
        fetch(`${API}/desktop/permissions`),
        fetch(`${API}/desktop/plans`),
        fetch(`${API}/desktop/audit-logs?limit=20`),
        fetch(`${API}/desktop/emergency-stop/status`),
        fetch(`${API}/desktop/gesture/preferences`),
      ]);

      if (devRes.ok) setDevices(await devRes.json());
      if (permRes.ok) setPermissions(await permRes.json());
      if (planRes.ok) setPlans(await planRes.json());
      if (auditRes.ok) setAuditLogs(await auditRes.json());
      if (stopRes.ok) {
        const d = await stopRes.json();
        setEmergencyStopActive(d.emergency_stop_active);
      }
      if (gestRes.ok) {
        const g = await gestRes.json();
        setGesturesEnabled(g.gesture_control_enabled);
        setCameraActive(g.camera_active);
      }
    } catch (err) {
      console.error("Failed to load desktop data:", err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer for pairing code
  useEffect(() => {
    if (codeExpiresIn > 0) {
      const timer = setInterval(() => setCodeExpiresIn((p) => p - 1), 1000);
      return () => clearInterval(timer);
    } else {
      setPairingCode(null);
    }
  }, [codeExpiresIn]);

  // Request new pairing code
  const handleRequestPairingCode = async () => {
    setIsRequestingCode(true);
    try {
      const res = await fetch(`${API}/desktop/pair/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_name: "Companion Agent", device_platform: "windows" }),
      });
      if (res.ok) {
        const data = await res.json();
        setPairingCode(data.code);
        setCodeExpiresIn(data.expires_in_seconds);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRequestingCode(false);
    }
  };

  // Revoke device
  const handleRevokeDevice = async (deviceId: string) => {
    try {
      const res = await fetch(`${API}/desktop/devices/${deviceId}`, { method: "DELETE" });
      if (res.ok) loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle permission
  const handleTogglePermission = async (permKey: string, currentlyGranted: boolean) => {
    try {
      if (currentlyGranted) {
        await fetch(`${API}/desktop/permissions/revoke`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permission_key: permKey }),
        });
      } else {
        await fetch(`${API}/desktop/permissions/grant`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permission_key: permKey, temporary: false, always_allow: false }),
        });
      }
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Emergency Stop Trigger
  const handleTriggerEmergencyStop = async () => {
    try {
      const res = await fetch(`${API}/desktop/emergency-stop`, { method: "POST" });
      if (res.ok) {
        setEmergencyStopActive(true);
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Reset Emergency Stop
  const handleResetEmergencyStop = async () => {
    try {
      const res = await fetch(`${API}/desktop/emergency-stop/reset`, { method: "POST" });
      if (res.ok) {
        setEmergencyStopActive(false);
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Generate Action Plan
  const handleGeneratePlan = async () => {
    if (!goalInput.trim()) return;
    setIsGeneratingPlan(true);
    try {
      const res = await fetch(`${API}/desktop/plans/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goalInput }),
      });
      if (res.ok) {
        const plan = await res.json();
        setActivePlan(plan);
        loadData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Run Action Plan
  const handleRunPlan = async (planId: number) => {
    setIsRunningPlan(true);
    try {
      const res = await fetch(`${API}/desktop/plans/${planId}/run`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "paused_for_takeover") {
          setTakeoverPrompt(data.message);
          setTakeoverUrl(data.takeover_url);
        } else {
          setTakeoverPrompt(null);
          setTakeoverUrl(null);
        }
        // refresh active plan details
        const planDetailRes = await fetch(`${API}/desktop/plans/${planId}`);
        if (planDetailRes.ok) setActivePlan(await planDetailRes.json());
        loadData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunningPlan(false);
    }
  };

  // Resume Action Plan after Takeover
  const handleResumePlan = async (planId: number) => {
    setIsRunningPlan(true);
    try {
      const res = await fetch(`${API}/desktop/plans/${planId}/resume`, { method: "POST" });
      if (res.ok) {
        setTakeoverPrompt(null);
        setTakeoverUrl(null);
        const planDetailRes = await fetch(`${API}/desktop/plans/${planId}`);
        if (planDetailRes.ok) setActivePlan(await planDetailRes.json());
        loadData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunningPlan(false);
    }
  };

  // Save document to sandbox
  const handleSaveSandboxFile = async () => {
    try {
      const res = await fetch(`${API}/desktop/tools/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool_name: "save_local_file",
          arguments: { file_name: sandboxDocName, content: sandboxDocContent },
          confirmed: true,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setSandboxResult(`Saved successfully to local sandbox! Size: ${d.result?.size_bytes} bytes. (Privacy: LOCAL ONLY)`);
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger test gesture
  const handleTestGesture = async (gesture: string) => {
    setRecentGesture(gesture);
    setGestureAlert(null);
    try {
      const res = await fetch(`${API}/desktop/gesture/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gesture }),
      });
      if (res.ok) {
        const d = await res.json();
        setGestureAlert(`Gesture acknowledged: '${gesture}' -> Triggered low-risk action '${d.action_executed}'`);
      } else {
        const err = await res.json();
        setGestureAlert(`Gesture rejected: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Test gesture attempt for high-risk action (must be blocked)
  const handleTestHighRiskGesture = async () => {
    setRecentGesture("thumbs_up");
    try {
      const res = await fetch(`${API}/desktop/gesture/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gesture: "thumbs_up", target_action: "delete_file" }),
      });
      const err = await res.json();
      setGestureAlert(`BLOCKED BY SECURITY POLICY: ${err.detail}`);
    } catch (e) {
      console.error(e);
    }
  };

  const activeDevice = devices.find((d) => d.is_active && d.is_paired);
  const grantedCount = permissions.filter((p) => p.is_granted).length;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 space-y-6">
      {/* Top Status Bar & Emergency Stop Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Desktop Agent & Local Control Center</h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Phase 5 Companion
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Secure desktop companion, controlled browser automation, sandboxed documents & opt-in gesture controls.
            </p>
          </div>
        </div>

        {/* Global Agent Status Indicators */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Agent Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[var(--text-muted)]">Agent:</span>
            <span className="font-semibold text-emerald-400">Online</span>
          </div>

          {/* Desktop Companion */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs">
            <span
              className={`w-2 h-2 rounded-full ${activeDevice ? "bg-cyan-400" : "bg-neutral-500"}`}
            />
            <span className="text-[var(--text-muted)]">Desktop:</span>
            <span className={`font-semibold ${activeDevice ? "text-cyan-400" : "text-neutral-400"}`}>
              {activeDevice ? activeDevice.device_name : "Unpaired"}
            </span>
          </div>

          {/* Permissions badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[var(--text-muted)]">Permissions:</span>
            <span className="font-semibold text-indigo-400">{grantedCount} granted</span>
          </div>

          {/* Camera status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs">
            {cameraActive ? (
              <>
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-emerald-400">Cam Active</span>
              </>
            ) : (
              <>
                <CameraOff className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-neutral-400">Cam Off</span>
              </>
            )}
          </div>

          {/* EMERGENCY STOP BUTTON */}
          {emergencyStopActive ? (
            <button
              onClick={handleResetEmergencyStop}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs uppercase tracking-wider hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 animate-pulse"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Emergency Stop
            </button>
          ) : (
            <button
              onClick={handleTriggerEmergencyStop}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg shadow-rose-600/30"
              title="Instantly halts all pending local actions, tool executions, and browser automation"
            >
              <AlertOctagon className="w-4 h-4" />
              STOP AGENT
            </button>
          )}
        </div>
      </div>

      {/* Emergency Stop Active Warning Banner */}
      {emergencyStopActive && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-4 text-rose-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 animate-bounce" />
            <div>
              <p className="font-bold text-sm">EMERGENCY STOP IS CURRENTLY ACTIVE</p>
              <p className="text-xs text-rose-300/80">
                All local tools, browser automation, and action plan executions are halted and locked. Reset to resume normal operations.
              </p>
            </div>
          </div>
          <button
            onClick={handleResetEmergencyStop}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shrink-0 transition-colors"
          >
            Reset Stop
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-[var(--border-color)] gap-2">
        {[
          { key: "planner", label: "Action Planner", icon: Layers },
          { key: "pairing", label: "Device Pairing", icon: Monitor },
          { key: "permissions", label: "Permissions Center", icon: Shield },
          { key: "gestures", label: "Camera & Gestures", icon: HandMetal },
          { key: "audit", label: "Activity Audit Trail", icon: Terminal },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
                isActive
                  ? "border-cyan-400 text-cyan-400 bg-cyan-400/5"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 1: NATURAL LANGUAGE ACTION PLANNER
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "planner" && (
        <div className="space-y-6">
          {/* Goal Input Card */}
          <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Natural-Language Action Planner
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Converts plain English goals into a verified, typed execution plan with strict permission checks and takeover handoffs.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="e.g., Find recent papers on AI flood prediction, compare methodologies, and save top ones to library"
                className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm focus:outline-none focus:border-cyan-400 text-[var(--text-primary)]"
                onKeyDown={(e) => e.key === "Enter" && handleGeneratePlan()}
              />
              <button
                onClick={handleGeneratePlan}
                disabled={isGeneratingPlan || !goalInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-neutral-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-cyan-500/20"
              >
                {isGeneratingPlan ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Plan Goal
              </button>
            </div>

            {/* Quick Prompts */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[var(--text-muted)]">Try:</span>
              {[
                "Find recent preprints on structural health monitoring and save to library",
                "Summarize local PDF and compare with arxiv literature",
                "Navigate to arxiv.org and inspect quantum neural networks",
              ].map((sample, i) => (
                <button
                  key={i}
                  onClick={() => setGoalInput(sample)}
                  className="px-2.5 py-1 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-secondary)] text-[11px] border border-[var(--border-color)] transition-colors"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          {/* User Takeover Mode Notification Banner (Playwright / Website Login Barrier) */}
          {takeoverPrompt && (
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-fade-in">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-amber-300">Browser User-Takeover Required</h3>
                  <p className="text-xs text-amber-200/90">{takeoverPrompt}</p>
                  {takeoverUrl && (
                    <p className="text-xs text-amber-300/80 font-mono mt-1">Target URL: {takeoverUrl}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                {takeoverUrl && (
                  <a
                    href={takeoverUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-1.5 rounded-xl bg-amber-500 text-neutral-950 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-400 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Page Manually
                  </a>
                )}
                {activePlan && (
                  <button
                    onClick={() => handleResumePlan(activePlan.id)}
                    disabled={isRunningPlan}
                    className="px-4 py-1.5 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] border border-[var(--border-color)] transition-colors"
                  >
                    I Have Completed Sign-In → Continue Plan
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Active Plan Breakdown */}
          {activePlan && (
            <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold">{activePlan.title}</h3>
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-cyan-500/10 text-cyan-400 uppercase">
                      {activePlan.status}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Goal: {activePlan.goal}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRunPlan(activePlan.id)}
                    disabled={isRunningPlan || emergencyStopActive}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
                  >
                    {isRunningPlan ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    Run Plan
                  </button>
                </div>
              </div>

              {/* Step Sequence Table */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[var(--text-secondary)]">Planned Typed Execution Steps:</p>
                <div className="space-y-2">
                  {(activePlan.steps || []).map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center font-bold text-cyan-400">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-[var(--text-primary)]">{step.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--text-muted)] font-mono">
                            <span>tool: {step.tool_name}</span>
                            <span>•</span>
                            <span>args: {JSON.stringify(step.arguments).slice(0, 40)}...</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Privacy Scope Badge */}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            step.privacy_scope === "LOCAL_ONLY"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : step.privacy_scope === "SENT_TO_AI_PROVIDER"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {step.privacy_scope}
                        </span>

                        {/* Risk badge */}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            step.risk_level === "LOW"
                              ? "bg-neutral-500/10 text-neutral-400"
                              : step.risk_level === "MEDIUM"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          {step.risk_level}
                        </span>

                        {/* Status */}
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {step.status === "completed" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Clock className="w-4 h-4 text-neutral-500" />
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Local Sandboxed Document Workflow Tester */}
          <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <FolderLock className="w-4 h-4 text-indigo-400" />
                  Local Sandboxed Document Workflow
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Controlled file creation and reading strictly within the authorized sandbox directory. Path traversal is rejected.
                </p>
              </div>
              <span className="px-2.5 py-1 text-[11px] rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Scope: LOCAL ONLY
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)]">File Name (in sandbox):</label>
                <input
                  type="text"
                  value={sandboxDocName}
                  onChange={(e) => setSandboxDocName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Document Content:</label>
                <input
                  type="text"
                  value={sandboxDocContent}
                  onChange={(e) => setSandboxDocContent(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={handleSaveSandboxFile}
                disabled={emergencyStopActive}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors"
              >
                Save Document to Sandbox
              </button>
              {sandboxResult && (
                <span className="text-xs font-mono text-emerald-400">{sandboxResult}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 2: DEVICE PAIRING
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "pairing" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pair New Companion Card */}
          <div className="lg:col-span-1 p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-4">
            <h2 className="text-base font-bold flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-cyan-400" />
              Pair Desktop Companion
            </h2>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Pair your local desktop companion agent using a short-lived 6-digit one-time code. No unauthenticated endpoints.
            </p>

            {pairingCode ? (
              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-center space-y-2">
                <span className="text-xs font-semibold text-cyan-300">Pairing Code (Expires in {codeExpiresIn}s)</span>
                <div className="text-3xl font-extrabold tracking-widest text-cyan-400 font-mono">
                  {pairingCode}
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Enter this code in your desktop companion application to complete secure handshake.
                </p>
              </div>
            ) : (
              <button
                onClick={handleRequestPairingCode}
                disabled={isRequestingCode}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-500/20"
              >
                {isRequestingCode ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                Generate 6-Digit Pairing Code
              </button>
            )}

            <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-muted)] space-y-1.5">
              <p className="font-semibold text-[var(--text-primary)]">Security Architecture:</p>
              <p>• Short-lived 10-minute token expiration</p>
              <p>• SHA-256 hashed device credentials</p>
              <p>• Immediate revocation control from web UI</p>
            </div>
          </div>

          {/* Connected Devices Table */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Monitor className="w-4 h-4 text-cyan-400" />
                Paired Devices ({devices.length})
              </h2>
              <button
                onClick={loadData}
                className="p-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-secondary)]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {devices.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-muted)]">
                No desktop companion devices paired yet. Click &apos;Generate 6-Digit Pairing Code&apos; to link your first computer.
              </div>
            ) : (
              <div className="space-y-3">
                {devices.map((device) => (
                  <div
                    key={device.id}
                    className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-cyan-400">
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-[var(--text-primary)]">{device.device_name}</p>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              device.is_paired
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-neutral-500/10 text-neutral-400"
                            }`}
                          >
                            {device.is_paired ? "PAIRED" : "PENDING"}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                          ID: {device.device_id} • Platform: {device.device_platform}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline">
                        Last Active: {device.last_heartbeat_at ? new Date(device.last_heartbeat_at).toLocaleTimeString() : "Just now"}
                      </span>
                      <button
                        onClick={() => handleRevokeDevice(device.device_id)}
                        className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                        title="Revoke device access immediately"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 3: PERMISSIONS CENTER
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "permissions" && (
        <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-400" />
                Desktop Capability Permissions
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Every local capability goes through typed validation. Sensitive actions require explicit authorization; critical actions always demand confirmation.
              </p>
            </div>
            <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              Default to DENIED for Sensitive Capabilities
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {permissions.map((perm) => (
              <div
                key={perm.permission_key}
                className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-primary)] font-mono">{perm.permission_key}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        perm.risk_level === "LOW"
                          ? "bg-neutral-500/10 text-neutral-400"
                          : perm.risk_level === "MEDIUM"
                          ? "bg-amber-500/10 text-amber-400"
                          : perm.risk_level === "HIGH"
                          ? "bg-orange-500/10 text-orange-400"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {perm.risk_level}
                    </span>
                    {!perm.always_allow_permitted && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-500/10 text-rose-300">
                        Always-Allow Forbidden
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">{perm.description}</p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => handleTogglePermission(perm.permission_key, perm.is_granted)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      perm.is_granted
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                        : "bg-neutral-500/10 text-neutral-400 border border-neutral-500/20 hover:bg-neutral-500/20"
                    }`}
                  >
                    {perm.is_granted ? "GRANTED" : "DENIED"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 4: GESTURES & CAMERA PRIVACY
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "gestures" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls & Privacy Notice */}
          <div className="lg:col-span-1 p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-4">
            <h2 className="text-base font-bold flex items-center gap-2">
              <HandMetal className="w-4 h-4 text-cyan-400" />
              Gesture Control Settings
            </h2>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Opt-in computer vision gesture control for low-risk interactions.
            </p>

            {/* Camera & Gesture Toggles */}
            <div className="space-y-3 p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Enable Gestures</span>
                <input
                  type="checkbox"
                  checked={gesturesEnabled}
                  onChange={(e) => setGesturesEnabled(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Camera Active</span>
                <input
                  type="checkbox"
                  checked={cameraActive}
                  onChange={(e) => setCameraActive(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Privacy Guarantee Box */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <Shield className="w-4 h-4 text-emerald-400" />
                Local-Only Camera Privacy Guarantee
              </div>
              <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                Video frames are analyzed locally in memory with MediaPipe. Footage is NEVER saved to disk, uploaded to the cloud, or shared with AI providers.
              </p>
            </div>

            {/* Strict Security Guardrail */}
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Lock className="w-4 h-4 text-rose-400" />
                Critical Security Rule
              </div>
              <p className="text-[11px] text-rose-200/80">
                Gestures can NEVER authorize payments, file deletion, email transmission, or system modifications. Critical actions always require explicit UI click confirmation.
              </p>
            </div>
          </div>

          {/* Interactive Gesture Simulator & Mappings */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-4">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-400" />
              Approved Low-Risk Gestures Simulator
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Test gesture triggers below. Watch the system enforce policy barriers against critical operations.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: "open_palm", label: "Open Palm ✋", action: "Pause AI Response" },
                { name: "thumbs_up", label: "Thumbs Up 👍", action: "Approve Low-Risk Action" },
                { name: "swipe_left", label: "Swipe Left 👈", action: "Previous Paper Card" },
                { name: "swipe_right", label: "Swipe Right 👉", action: "Next Paper Card" },
              ].map((g) => (
                <button
                  key={g.name}
                  onClick={() => handleTestGesture(g.name)}
                  className="p-3 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] border border-[var(--border-color)] text-center space-y-1 transition-all"
                >
                  <p className="font-bold text-sm">{g.label}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{g.action}</p>
                </button>
              ))}
            </div>

            {/* Test Security Violation */}
            <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-rose-400">Test High-Risk Gesture Rejection</p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Attempt to authorize &apos;delete_file&apos; with a gesture.
                </p>
              </div>
              <button
                onClick={handleTestHighRiskGesture}
                className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors"
              >
                Simulate Threat
              </button>
            </div>

            {/* Gesture Alert Feedback */}
            {gestureAlert && (
              <div
                className={`p-3 rounded-xl text-xs font-mono ${
                  gestureAlert.includes("BLOCKED")
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                }`}
              >
                {gestureAlert}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 5: ACTIVITY AUDIT TRAIL
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "audit" && (
        <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                Local Action Audit Trail & Privacy Scopes
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Complete forensic record of all local actions, tool executions, execution latency, and data transmission boundaries.
              </p>
            </div>
            <button
              onClick={loadData}
              className="p-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-secondary)]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-semibold">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Tool</th>
                  <th className="py-2.5 px-3">Privacy Scope</th>
                  <th className="py-2.5 px-3">Risk</th>
                  <th className="py-2.5 px-3">Latency</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--text-muted)]">
                      {log.executed_at ? new Date(log.executed_at).toLocaleTimeString() : "Just now"}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-300">{log.tool_name}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.privacy_scope === "LOCAL_ONLY"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : log.privacy_scope === "SENT_TO_AI_PROVIDER"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {log.privacy_scope}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{log.risk_level}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--text-muted)]">
                      {log.duration_ms ?? 0} ms
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
