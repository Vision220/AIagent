"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  RefreshCw,
  Search,
  Blocks,
  Cpu,
  Mic,
  FileCode,
  Globe
} from "lucide-react";
import { clsx } from "clsx";

const API_BASE = "http://localhost:8000/api/v1";

interface AuditEvent {
  id: number;
  category: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  resource_name?: string;
  success: boolean;
  error_summary?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

interface Stats {
  total_events: number;
  successful_events: number;
  failed_events: number;
  total_tool_executions: number;
  active_plugins_count: number;
  active_custom_sources_count: number;
}

export default function ActivityPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_events: 0,
    successful_events: 0,
    failed_events: 0,
    total_tool_executions: 0,
    active_plugins_count: 0,
    active_custom_sources_count: 0
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const categories = ["all", "tool", "plugin", "source", "model", "voice"];

  const fetchData = async () => {
    setLoading(true);
    try {
      const catParam = selectedCategory !== "all" ? `?category=${selectedCategory}` : "";
      const [evRes, stRes] = await Promise.all([
        fetch(`${API_BASE}/audit/${catParam}`),
        fetch(`${API_BASE}/audit/stats`)
      ]);
      if (evRes.ok) {
        setEvents(await evRes.json());
      }
      if (stRes.ok) {
        setStats(await stRes.json());
      }
    } catch (err) {
      console.warn("Could not fetch audit events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  const filteredEvents = events.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.action.toLowerCase().includes(q) ||
      (e.resource_name && e.resource_name.toLowerCase().includes(q)) ||
      e.category.toLowerCase().includes(q)
    );
  });

  const getCategoryIcon = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "plugin":
        return <Blocks className="w-4 h-4 text-cyan-400" />;
      case "model":
        return <Cpu className="w-4 h-4 text-purple-400" />;
      case "tool":
        return <FileCode className="w-4 h-4 text-amber-400" />;
      case "voice":
        return <Mic className="w-4 h-4 text-emerald-400" />;
      case "source":
        return <Globe className="w-4 h-4 text-blue-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-primary)] overflow-y-auto">
      {/* Header Banner */}
      <div className="border-b border-[var(--border-color)] bg-gradient-to-r from-slate-900 via-[var(--bg-secondary)] to-slate-900 px-8 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-3">
              <Shield className="w-3.5 h-3.5" />
              <span>Full User Transparency • Phase 4</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Agent Activity & Audit Log
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1.5 max-w-2xl leading-relaxed">
              Transparent, immutable inspection of all tool invocations, plugin events, and model interactions. 
              Sensitive information like API credentials and passwords are strictly excluded from audit records.
            </p>
          </div>

          <button
            onClick={fetchData}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2 transition-colors self-start md:self-auto"
          >
            <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} />
            Refresh Log
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-8 py-8 space-y-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <span className="text-xs font-medium text-[var(--text-muted)]">Total Logged Actions</span>
            <div className="text-2xl font-bold text-[var(--text-primary)] mt-1 font-mono">
              {stats.total_events}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <span className="text-xs font-medium text-emerald-400">Successful Operations</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
              {stats.successful_events}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <span className="text-xs font-medium text-amber-400">Tool Executions</span>
            <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">
              {stats.total_tool_executions}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <span className="text-xs font-medium text-cyan-400">Active Extensions</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1 font-mono">
              {stats.active_plugins_count}
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-all",
                  selectedCategory === c
                    ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                )}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search action or resource..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Activity Table */}
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Resource</th>
                  <th className="py-3 px-4">Context Metadata</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[var(--text-muted)]">
                      Loading audit events...
                    </td>
                  </tr>
                ) : filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[var(--text-muted)]">
                      No activity recorded in this category.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((e) => (
                    <tr key={e.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                      <td className="py-3 px-4">
                        {e.success ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                            <XCircle className="w-3.5 h-3.5" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-mono text-[11px]">
                          {getCategoryIcon(e.category)}
                          {e.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-[var(--text-primary)]">
                        {e.action}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">
                        {e.resource_name || e.resource_type || "—"}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-[var(--text-muted)] max-w-xs truncate">
                        {e.metadata ? JSON.stringify(e.metadata) : "—"}
                      </td>
                      <td className="py-3 px-4 text-right text-[var(--text-muted)] whitespace-nowrap">
                        {new Date(e.created_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
