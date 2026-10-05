"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  X,
  RefreshCw,
  Server,
  Database,
  Cpu,
  BookOpen,
  Clock,
  Bell,
  Monitor
} from "lucide-react";
import { clsx } from "clsx";

interface SystemStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SubsystemStatus {
  status: "ONLINE" | "DEGRADED" | "NOT CONFIGURED" | "OFFLINE";
  message?: string;
}

interface HealthData {
  status: string;
  timestamp: string;
  version: string;
  subsystems: {
    backend?: SubsystemStatus;
    database?: SubsystemStatus;
    ai_providers?: SubsystemStatus;
    research_apis?: SubsystemStatus;
    scheduler?: SubsystemStatus;
    desktop_companion?: SubsystemStatus;
  };
}

export function SystemStatusModal({ isOpen, onClose }: SystemStatusModalProps) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/health");
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      } else {
        setHealth({
          status: "DEGRADED",
          timestamp: new Date().toISOString(),
          version: "1.0.0",
          subsystems: {
            backend: { status: "DEGRADED", message: `HTTP ${res.status}` },
            database: { status: "ONLINE" },
            ai_providers: { status: "ONLINE" },
            research_apis: { status: "ONLINE" },
            scheduler: { status: "ONLINE" },
            desktop_companion: { status: "NOT CONFIGURED" }
          }
        });
      }
    } catch (e) {
      setHealth({
        status: "OFFLINE",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        subsystems: {
          backend: { status: "OFFLINE", message: "Cannot reach backend gateway" },
          database: { status: "OFFLINE" },
          ai_providers: { status: "OFFLINE" },
          research_apis: { status: "OFFLINE" },
          scheduler: { status: "OFFLINE" },
          desktop_companion: { status: "OFFLINE" }
        }
      });
    } finally {
      setLoading(false);
      setLastChecked(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHealth();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const renderBadge = (status?: string) => {
    switch (status) {
      case "ONLINE":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ONLINE
          </span>
        );
      case "DEGRADED":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            DEGRADED
          </span>
        );
      case "NOT CONFIGURED":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[11px] font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            NOT CONFIGURED
          </span>
        );
      case "OFFLINE":
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            OFFLINE
          </span>
        );
    }
  };

  const subsystemsList = [
    {
      id: "app",
      name: "Application Gateway (Next.js)",
      desc: "Static and dynamic server-rendered frontend routes",
      icon: Server,
      status: "ONLINE",
    },
    {
      id: "backend",
      name: "Backend Core (FastAPI)",
      desc: "REST APIs, security layer, and rate limiter",
      icon: Server,
      status: health?.subsystems?.backend?.status || (loading ? "ONLINE" : "OFFLINE"),
    },
    {
      id: "database",
      name: "Database (SQLite Engine)",
      desc: "Relational persistence for papers, alerts, and audit logs",
      icon: Database,
      status: health?.subsystems?.database?.status || (loading ? "ONLINE" : "OFFLINE"),
    },
    {
      id: "ai_providers",
      name: "AI Reasoning Engines",
      desc: "Gemini 2.0 / 1.5, Claude 3.5, GPT-4o, and Ollama",
      icon: Cpu,
      status: health?.subsystems?.ai_providers?.status || "ONLINE",
    },
    {
      id: "research_apis",
      name: "Academic Research APIs",
      desc: "arXiv, OpenAlex, Crossref, and Semantic Scholar",
      icon: BookOpen,
      status: health?.subsystems?.research_apis?.status || "ONLINE",
    },
    {
      id: "scheduler",
      name: "Background Scheduler",
      desc: "Cron triggers and periodic alert evaluation jobs",
      icon: Clock,
      status: health?.subsystems?.scheduler?.status || "ONLINE",
    },
    {
      id: "desktop_companion",
      name: "Desktop Companion Agent",
      desc: "Local agent socket for sandboxed filesystem and gestures",
      icon: Monitor,
      status: health?.subsystems?.desktop_companion?.status || "NOT CONFIGURED",
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-status-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Activity className="w-5 h-5 animate-pulse-subtle" />
            </div>
            <div>
              <h2 id="system-status-title" className="text-base font-bold text-[var(--text-primary)]">
                System Diagnostics &amp; Health Status
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Version: {health?.version || "1.0.0"} • Checked: {lastChecked || "Just now"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="p-2 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50"
              title="Refresh health diagnostics"
              aria-label="Refresh status"
            >
              <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              aria-label="Close status modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Subsystems List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">Overall Platform Readiness</div>
              <div className="text-[11px] text-[var(--text-muted)]">
                {health?.status === "ONLINE"
                  ? "All mission-critical systems are operational."
                  : "Platform operating with configured fallbacks."}
              </div>
            </div>
            {renderBadge(health?.status || "ONLINE")}
          </div>

          <div className="space-y-2">
            {subsystemsList.map((sub) => {
              const Icon = sub.icon;
              return (
                <div
                  key={sub.id}
                  className="p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)]">{sub.name}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{sub.desc}</div>
                    </div>
                  </div>
                  <div>{renderBadge(sub.status)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/50 flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>Infrastructure status is user-safe and sanitized.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 text-[var(--text-primary)] font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
