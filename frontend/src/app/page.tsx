"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Microscope,
  BookOpen,
  MessageSquareText,
  Clock,
  ArrowUpRight,
  Bookmark,
  Bell,
  Cpu,
  Layers,
  ChevronRight,
  Monitor,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Play,
  Blocks,
  Search,
  ExternalLink
} from "lucide-react";
import { clsx } from "clsx";
import { UniversalCommand } from "@/components/universal-command";
import { GuidedDemoModal } from "@/components/guided-demo-modal";

const API = "http://127.0.0.1:8000/api/v1";

interface DashboardData {
  total_discovered: number;
  new_publications_count: number;
  active_profiles_count: number;
  unread_alerts_count: number;
  high_relevance_count: number;
}

interface SavedPaper {
  id: number;
  paper_title: string;
  authors?: string;
  journal?: string;
  doi?: string;
  collection_name?: string;
}

interface ResearchProject {
  id: number;
  title: string;
  topic: string;
  depth: string;
  created_at: string;
}

interface AlertItem {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  relevance_category?: string;
  created_at: string;
}

export default function DashboardPage() {
  const [monStats, setMonStats] = useState<DashboardData | null>(null);
  const [savedPapers, setSavedPapers] = useState<SavedPaper[]>([]);
  const [recentProjects, setRecentProjects] = useState<ResearchProject[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<AlertItem[]>([]);
  const [desktopConnected, setDesktopConnected] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showGuidedDemo, setShowGuidedDemo] = useState(false);

  useEffect(() => {
    // Check demo mode from storage
    if (typeof window !== "undefined") {
      setIsDemoMode(localStorage.getItem("antigravity_demo_mode") === "true");
      const handleDemoChange = () => {
        setIsDemoMode(localStorage.getItem("antigravity_demo_mode") === "true");
      };
      window.addEventListener("antigravity-demo-mode-changed", handleDemoChange);
      return () => window.removeEventListener("antigravity-demo-mode-changed", handleDemoChange);
    }
  }, []);

  useEffect(() => {
    // 1. Fetch dashboard metrics
    fetch(`${API}/monitoring/dashboard`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMonStats(d))
      .catch(() => {});

    // 2. Fetch saved papers
    fetch(`${API}/library/papers`)
      .then((r) => (r.ok ? r.json() : []))
      .then((p) => Array.isArray(p) && setSavedPapers(p.slice(0, 4)))
      .catch(() => {});

    // 3. Fetch recent research projects
    fetch(`${API}/research/projects`)
      .then((r) => (r.ok ? r.json() : []))
      .then((pr) => Array.isArray(pr) && setRecentProjects(pr.slice(0, 3)))
      .catch(() => {});

    // 4. Fetch recent alerts
    fetch(`${API}/alerts/?limit=4`)
      .then((r) => (r.ok ? r.json() : []))
      .then((a) => Array.isArray(a) && setRecentAlerts(a))
      .catch(() => {});

    // 5. Check desktop pairing status
    fetch(`${API}/desktop/devices`)
      .then((r) => (r.ok ? r.json() : []))
      .then((devs) => {
        if (Array.isArray(devs) && devs.some((d) => d.status === "ACTIVE")) {
          setDesktopConnected(true);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Demo Mode Notice Banner */}
      {isDemoMode && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-black font-black uppercase text-[10px]">
              DEMO MODE ACTIVE
            </span>
            <span>
              Using deterministic presentation dataset. Live production mutations are simulated safely.
            </span>
          </div>
          <button
            onClick={() => setShowGuidedDemo(true)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-colors shrink-0"
          >
            Launch Guided Demo Script
          </button>
        </div>
      )}

      {/* 1. Universal Agent Input Bar */}
      <UniversalCommand />

      {/* 2. Command Center Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Agent Operational State */}
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Agent State
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-bold text-[var(--text-primary)]">
                Autonomous &amp; Idle
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Monitoring ArXiv &amp; Semantic Scholar
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* Desktop Companion Connection */}
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Desktop Agent
            </span>
            <div className="flex items-center gap-2">
              <span
                className={clsx(
                  "w-2.5 h-2.5 rounded-full",
                  desktopConnected ? "bg-cyan-400 animate-pulse" : "bg-slate-500"
                )}
              />
              <span className="text-sm font-bold text-[var(--text-primary)]">
                {desktopConnected ? "Local Device Paired" : "Ready to Pair"}
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              {desktopConnected ? "Sandboxed /sandbox directory" : "Optional desktop companion"}
            </p>
          </div>
          <Link
            href="/desktop"
            className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
            title="Desktop Agent Settings"
          >
            <Monitor className="w-5 h-5" />
          </Link>
        </div>

        {/* Multi-Model Fallback Engine */}
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Reasoning Engine
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400" />
              <span className="text-sm font-bold text-[var(--text-primary)]">
                Gemini 2.0 / 1.5 Pro
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Fallback enabled: Claude &amp; Ollama
            </p>
          </div>
          <Link
            href="/providers"
            className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors"
            title="Manage AI Models"
          >
            <Cpu className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* 3. Quick Actions Grid */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              title: "Start Deep Research",
              href: "/research",
              icon: Microscope,
              color: "text-cyan-400",
              bg: "hover:border-cyan-500/40",
            },
            {
              title: "Search Papers",
              href: "/alerts",
              icon: Search,
              color: "text-blue-400",
              bg: "hover:border-blue-500/40",
            },
            {
              title: "View Alerts",
              href: "/alerts",
              icon: Bell,
              color: "text-violet-400",
              bg: "hover:border-violet-500/40",
            },
            {
              title: "Ask Agent",
              href: "/chat",
              icon: MessageSquareText,
              color: "text-emerald-400",
              bg: "hover:border-emerald-500/40",
            },
            {
              title: "Connect Desktop",
              href: "/desktop",
              icon: Monitor,
              color: "text-amber-400",
              bg: "hover:border-amber-500/40",
            },
            {
              title: "Manage Plugins",
              href: "/marketplace",
              icon: Blocks,
              color: "text-pink-400",
              bg: "hover:border-pink-500/40",
            },
          ].map((action, i) => {
            const Icon = action.icon;
            return (
              <Link
                key={i}
                href={action.href}
                className={clsx(
                  "p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col items-center text-center gap-2 group transition-all hover:scale-[1.02] shadow-xs",
                  action.bg
                )}
              >
                <div className={clsx("p-2.5 rounded-xl bg-[var(--bg-secondary)]", action.color)}>
                  <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  {action.title}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 4. Live Statistics Bar (Only Real Numbers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Preprints Indexed",
            value: monStats ? String(monStats.total_discovered) : "0",
            desc: monStats?.new_publications_count
              ? `${monStats.new_publications_count} new in 24h`
              : "Active index",
            icon: BookOpen,
            color: "text-cyan-400",
          },
          {
            title: "Saved Papers",
            value: String(savedPapers.length),
            desc: "In Research Library",
            icon: Bookmark,
            color: "text-blue-400",
          },
          {
            title: "Active Monitors",
            value: monStats ? String(monStats.active_profiles_count) : "0",
            desc: "Scheduled background scans",
            icon: Bell,
            color: "text-violet-400",
          },
          {
            title: "High Relevance Papers",
            value: monStats ? String(monStats.high_relevance_count) : "0",
            desc: "Score >= 80% relevance",
            icon: Sparkles,
            color: "text-emerald-400",
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xs flex items-center justify-between"
            >
              <div className="space-y-1">
                <p className="text-xs font-medium text-[var(--text-muted)]">{stat.title}</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
                <p className="text-[11px] text-[var(--text-muted)]">{stat.desc}</p>
              </div>
              <div className={clsx("p-3 rounded-2xl bg-[var(--bg-secondary)]", stat.color)}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Main Split Section: Recent Deep Research & Smart Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2/3): Recent Research & Library */}
        <div className="lg:col-span-2 space-y-8">
          {/* Deep Research Projects */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Microscope className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Recent Deep Syntheses
                </h2>
              </div>
              <Link
                href="/research"
                className="text-xs font-semibold text-cyan-400 hover:underline flex items-center gap-1"
              >
                New synthesis <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentProjects.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] text-center space-y-3">
                <Microscope className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  No Deep Research Reports Yet
                </h3>
                <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                  Run your first autonomous synthesis. The agent will formulate sub-questions, scan scholarly repositories, and construct an inline-cited report.
                </p>
                <Link
                  href="/research"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-600/20"
                >
                  <Microscope className="w-3.5 h-3.5" /> Start Research Task
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProjects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/research?project_id=${p.id}`}
                    className="block p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-cyan-500/40 transition-all group shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold uppercase">
                            {p.depth} depth
                          </span>
                          <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-cyan-400 transition-colors line-clamp-1">
                            {p.title}
                          </h4>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] line-clamp-1">{p.topic}</p>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Saved Papers in Library */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Research Library
                </h2>
              </div>
              <Link
                href="/library"
                className="text-xs font-semibold text-blue-400 hover:underline flex items-center gap-1"
              >
                View all saved papers <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {savedPapers.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] text-center space-y-3">
                <BookOpen className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">No Saved Papers Yet</h3>
                <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                  Bookmark papers during Deep Research or from your smart alert feeds to organize them into tagged collections.
                </p>
                <Link
                  href="/alerts"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:border-cyan-500/30 border border-[var(--border-color)] text-xs font-bold transition-all"
                >
                  <Search className="w-3.5 h-3.5" /> Explore Preprint Feeds
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {savedPapers.map((paper) => (
                  <div
                    key={paper.id}
                    className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col justify-between space-y-2 shadow-xs"
                  >
                    <div className="space-y-1">
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">
                        {paper.collection_name || "General"}
                      </span>
                      <h4 className="text-xs font-bold text-[var(--text-primary)] line-clamp-2 leading-snug">
                        {paper.paper_title}
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">
                        {paper.authors || "Unknown Authors"}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                      <span className="truncate max-w-[150px]">{paper.journal || "Academic Venue"}</span>
                      <Link href="/library" className="text-cyan-400 font-semibold hover:underline">
                        Open paper →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3): Smart Research Alerts & Feed */}
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-violet-400" />
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Research Alerts
                </h2>
              </div>
              <Link
                href="/alerts"
                className="text-xs font-semibold text-violet-400 hover:underline flex items-center gap-1"
              >
                Manage <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentAlerts.length === 0 ? (
              <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] text-center space-y-2">
                <Bell className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
                <h4 className="text-xs font-bold text-[var(--text-primary)]">No Active Alerts</h4>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Create a research profile to receive daily digests of preprints in your field.
                </p>
                <Link
                  href="/alerts"
                  className="inline-block mt-2 text-xs font-semibold text-cyan-400 hover:underline"
                >
                  Create Monitor Profile →
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentAlerts.map((alert) => (
                  <Link
                    key={alert.id}
                    href="/alerts"
                    className="block p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-violet-500/30 transition-all text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-400 font-bold text-[10px]">
                        {alert.relevance_category || "Preprint"}
                      </span>
                      {!alert.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      )}
                    </div>
                    <div className="font-semibold text-[var(--text-primary)] line-clamp-1">
                      {alert.title}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] line-clamp-2">
                      {alert.message}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Trust & Safety Panel */}
          <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Platform Integrity</span>
            </div>
            <ul className="text-xs text-[var(--text-muted)] space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>All DOIs validated via CrossRef &amp; arXiv registries</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>SSRF protection enforced on all external endpoints</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Desktop agent confined to sandboxed execution directory</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Guided Demo Modal */}
      <GuidedDemoModal
        isOpen={showGuidedDemo}
        onClose={() => setShowGuidedDemo(false)}
      />
    </div>
  );
}
