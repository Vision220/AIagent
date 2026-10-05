"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BellRing,
  Plus,
  Trash2,
  Pause,
  Play,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Tag,
  Clock,
  Layers,
  BookOpen,
  CheckCheck,
  Activity,
  FileSearch,
  ChevronDown,
  ChevronUp,
  Bookmark,
  X,
  AlertCircle,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  Microscope,
  BarChart3,
  Filter,
  Loader2,
  WifiOff,
} from "lucide-react";
import { clsx } from "clsx";

const API = "http://127.0.0.1:8000/api/v1";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResearchProfile {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  topics: string[];
  keywords: string[];
  domains: string[];
  pub_types: string[];
  sources: string[];
  date_range_days: number;
  language: string;
  min_relevance: string;
  frequency: string;
  last_run_at?: string;
  created_at: string;
}

interface DiscoveredPublication {
  id: number;
  title: string;
  authors?: string;
  abstract?: string;
  journal_or_venue?: string;
  publication_year?: number;
  publication_date?: string;
  doi?: string;
  url?: string;
  source_db?: string;
  relevance_category?: string;
  relevance_score?: number;
  ai_explanation?: string;
  matching_keywords?: string[];
  is_read?: boolean;
  is_saved?: boolean;
  profile_name?: string;
  first_discovered_at?: string;
}

interface NotificationAlert {
  id: number;
  profile_name: string;
  title: string;
  message: string;
  relevance_category?: string;
  is_read: boolean;
  created_at: string;
  publication?: DiscoveredPublication;
}

interface MonitoringJob {
  id: number;
  profile_name: string;
  status: string;
  started_at: string;
  completed_at?: string;
  papers_found?: number;
  papers_new?: number;
  error_message?: string;
  triggered_by?: string;
}

interface DashboardStats {
  total_discovered: number;
  new_publications_count: number;
  active_profiles_count: number;
  unread_alerts_count: number;
  high_relevance_count: number;
  last_monitoring_run?: string;
  next_scheduled_run?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relevanceBadge(cat?: string) {
  if (!cat) return null;
  const map: Record<string, string> = {
    High: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    Medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    Low: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  };
  return (
    <span className={clsx("px-2 py-0.5 text-[9px] font-bold rounded-full border uppercase tracking-wide", map[cat] ?? "bg-slate-500/15 text-slate-400 border-slate-500/30")}>
      {cat}
    </span>
  );
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    running: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    failed: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };
  return (
    <span className={clsx("px-2 py-0.5 text-[9px] font-bold rounded-full border uppercase tracking-wide", map[status] ?? "bg-slate-500/15 text-slate-400 border-slate-500/30")}>
      {status}
    </span>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="w-12 h-12 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex items-center justify-center">
        <Icon className="w-6 h-6 text-[var(--text-muted)]" />
      </div>
      <p className="text-sm font-semibold text-[var(--text-secondary)]">{title}</p>
      <p className="text-xs text-[var(--text-muted)] max-w-xs">{description}</p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
    </div>
  );
}

// ─── Publication Detail Modal ─────────────────────────────────────────────────

function PublicationModal({ pub, onClose, onSave, onStartResearch }: {
  pub: DiscoveredPublication; onClose: () => void;
  onSave: (id: number) => Promise<void>;
  onStartResearch: (title: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(pub.is_saved ?? false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(pub.id);
    setSaved(true);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-start justify-between p-6 border-b border-[var(--border-color)]">
          <div className="flex-1 pr-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {relevanceBadge(pub.relevance_category)}
              {pub.source_db && (<span className="px-2 py-0.5 text-[9px] font-bold rounded-full border bg-cyan-500/10 text-cyan-400 border-cyan-500/25">{pub.source_db.toUpperCase()}</span>)}
            </div>
            <h2 className="text-sm font-bold text-[var(--text-primary)] leading-snug">{pub.title}</h2>
            {pub.authors && (<p className="text-xs text-[var(--text-muted)]">{pub.authors}</p>)}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3 text-xs">
            {pub.journal_or_venue && (<div className="p-3 rounded-xl bg-[var(--bg-tertiary)]/60 border border-[var(--border-color)]"><p className="text-[var(--text-muted)] mb-1">Venue</p><p className="font-medium text-[var(--text-primary)] truncate">{pub.journal_or_venue}</p></div>)}
            {pub.publication_year && (<div className="p-3 rounded-xl bg-[var(--bg-tertiary)]/60 border border-[var(--border-color)]"><p className="text-[var(--text-muted)] mb-1">Published</p><p className="font-medium text-[var(--text-primary)]">{pub.publication_year}</p></div>)}
            {pub.doi && (<div className="col-span-2 p-3 rounded-xl bg-[var(--bg-tertiary)]/60 border border-[var(--border-color)]"><p className="text-[var(--text-muted)] mb-1">DOI</p><p className="font-mono text-[var(--text-primary)] text-[10px] truncate">{pub.doi}</p></div>)}
          </div>
          {pub.abstract && (<div className="space-y-2"><h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Abstract</h3><p className="text-xs text-[var(--text-secondary)] leading-relaxed">{pub.abstract}</p></div>)}
          {pub.ai_explanation && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/5 to-violet-500/5 border border-cyan-500/20 space-y-2">
              <div className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-cyan-400" /><h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">AI Relevance Assessment</h3></div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{pub.ai_explanation}</p>
              <p className="text-[10px] text-[var(--text-muted)] italic">AI-assisted recommendation, not peer-review judgment.</p>
            </div>
          )}
          {pub.matching_keywords && pub.matching_keywords.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Matching Keywords</h3>
              <div className="flex flex-wrap gap-1.5">{pub.matching_keywords.map((kw, i) => (<span key={i} className="px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-300 text-[10px] border border-violet-500/20">#{kw}</span>))}</div>
            </div>
          )}
          {pub.profile_name && (<p className="text-[11px] text-[var(--text-muted)]">Discovered via: <span className="text-[var(--text-secondary)] font-medium">{pub.profile_name}</span> · {fmtDate(pub.first_discovered_at)}</p>)}
        </div>
        <div className="p-6 border-t border-[var(--border-color)] flex flex-wrap items-center gap-3">
          {pub.url && (<a href={pub.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--border-color-hover)] transition-colors"><ExternalLink className="w-3.5 h-3.5" />View Source</a>)}
          <button onClick={() => onStartResearch(pub.title)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/25 text-xs font-semibold text-blue-400 hover:bg-blue-500/20 transition-colors"><Microscope className="w-3.5 h-3.5" />Deep Research</button>
          <button onClick={handleSave} disabled={saved || saving} className={clsx("flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ml-auto", saved ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400" : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:opacity-90")}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bookmark className="w-3.5 h-3.5" />}
            {saved ? "Saved to Library" : "Save to Library"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Profile Modal ─────────────────────────────────────────────────────

const DEFAULT_SOURCES = ["arxiv", "openalex", "crossref", "semantic_scholar"];

function CreateProfileModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [topicsInput, setTopicsInput] = useState("");
  const [keywordsInput, setKeywordsInput] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>(DEFAULT_SOURCES);
  const [frequency, setFrequency] = useState("daily");
  const [minRelevance, setMinRelevance] = useState("Medium");
  const [dateRangeDays, setDateRangeDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addChip = (val: string, list: string[], setList: (v: string[]) => void) => {
    const trimmed = val.trim();
    if (trimmed && !list.includes(trimmed)) setList([...list, trimmed]);
  };
  const removeChip = (val: string, list: string[], setList: (v: string[]) => void) => setList(list.filter((x) => x !== val));
  const toggleSrc = (src: string) => setSelectedSources((prev) => prev.includes(src) ? prev.filter((x) => x !== src) : [...prev, src]);

  const handleCreate = async () => {
    if (!name.trim() || topics.length === 0) { setError("Name and at least one topic are required."); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/profiles/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || undefined, topics, keywords, sources: selectedSources, frequency, min_relevance: minRelevance, date_range_days: dateRangeDays }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      onCreated(); onClose();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">New Research Profile</h2>
          <button onClick={onClose} className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {error && (<div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>)}
          <div className="space-y-1">
            <label className="font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Profile Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Quantum ML Research" className="w-full p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500/50" />
          </div>
          <div className="space-y-1">
            <label className="font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" className="w-full p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500/50" />
          </div>
          <div className="space-y-2">
            <label className="font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Research Topics *</label>
            <div className="flex gap-2">
              <input value={topicsInput} onChange={(e) => setTopicsInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { addChip(topicsInput, topics, setTopics); setTopicsInput(""); }}} placeholder="Press Enter to add topic" className="flex-1 p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500/50" />
              <button onClick={() => { addChip(topicsInput, topics, setTopics); setTopicsInput(""); }} className="px-3 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors">Add</button>
            </div>
            {topics.length > 0 && (<div className="flex flex-wrap gap-1.5">{topics.map((t) => (<span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{t}<button onClick={() => removeChip(t, topics, setTopics)}><X className="w-3 h-3" /></button></span>))}</div>)}
          </div>
          <div className="space-y-2">
            <label className="font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Keywords &amp; Alternative Terms</label>
            <div className="flex gap-2">
              <input value={keywordsInput} onChange={(e) => setKeywordsInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { addChip(keywordsInput, keywords, setKeywords); setKeywordsInput(""); }}} placeholder="Press Enter to add keyword" className="flex-1 p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500/50" />
              <button onClick={() => { addChip(keywordsInput, keywords, setKeywords); setKeywordsInput(""); }} className="px-3 py-2 rounded-xl bg-violet-500/10 text-violet-400 font-bold border border-violet-500/20 hover:bg-violet-500/20 transition-colors">Add</button>
            </div>
            {keywords.length > 0 && (<div className="flex flex-wrap gap-1.5">{keywords.map((k) => (<span key={k} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20">#{k}<button onClick={() => removeChip(k, keywords, setKeywords)}><X className="w-3 h-3" /></button></span>))}</div>)}
          </div>
          <div className="space-y-2">
            <label className="font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Data Sources</label>
            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_SOURCES.map((src) => (
                <label key={src} className={clsx("flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors", selectedSources.includes(src) ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-muted)]")}>
                  <input type="checkbox" checked={selectedSources.includes(src)} onChange={() => toggleSrc(src)} className="accent-cyan-500" />{src.replace("_", " ")}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Alert Frequency</label>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="w-full p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none">
                <option value="manual">Manual only</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Min Relevance</label>
              <select value={minRelevance} onChange={(e) => setMinRelevance(e.target.value)} className="w-full p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Date Range: Last {dateRangeDays} days</label>
            <input type="range" min={7} max={365} value={dateRangeDays} onChange={(e) => setDateRangeDays(Number(e.target.value))} className="w-full accent-cyan-500" />
          </div>
        </div>
        <div className="p-6 border-t border-[var(--border-color)] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Cancel</button>
          <button onClick={handleCreate} disabled={loading} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}Create Profile
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Profiles ─────────────────────────────────────────────────────────────

function ProfilesTab({ onRefresh }: { onRefresh: () => void }) {
  const [profiles, setProfiles] = useState<ResearchProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [runMsg, setRunMsg] = useState<Record<number, string>>({});

  const loadProfiles = useCallback(async () => {
    try {
      const res = await fetch(`${API}/profiles/`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setProfiles(await res.json()); setError(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  const toggleActive = async (id: number, isActive: boolean) => {
    await fetch(`${API}/profiles/${id}/${isActive ? "pause" : "resume"}`, { method: "POST" });
    loadProfiles();
  };

  const deleteProfile = async (id: number) => {
    if (!confirm("Delete this profile and all its discovery data?")) return;
    await fetch(`${API}/profiles/${id}`, { method: "DELETE" });
    loadProfiles(); onRefresh();
  };

  const runDiscovery = async (id: number) => {
    setRunningId(id); setRunMsg((p) => ({ ...p, [id]: "Running…" }));
    try {
      const res = await fetch(`${API}/profiles/${id}/run`, { method: "POST" });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setRunMsg((p) => ({ ...p, [id]: `✓ Found ${data.papers_found ?? 0} papers, ${data.papers_new ?? 0} new` }));
      onRefresh();
    } catch (e: any) { setRunMsg((p) => ({ ...p, [id]: `Error: ${e.message}` })); }
    finally { setRunningId(null); }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return (<div className="flex items-center gap-2 text-rose-400 text-xs p-4 rounded-xl bg-rose-500/10 border border-rose-500/25"><WifiOff className="w-4 h-4 shrink-0" />Could not load profiles: {error}. Is the backend running on port 8000?</div>);

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2"><Layers className="w-4 h-4 text-cyan-400" />Research Profiles ({profiles.length})</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 hover:opacity-90 transition-opacity"><Plus className="w-3.5 h-3.5" />New Profile</button>
      </div>
      {profiles.length === 0 ? (
        <EmptyState icon={Layers} title="No research profiles yet" description="Create a profile to start automated paper discovery from arXiv, OpenAlex, Crossref, and Semantic Scholar." />
      ) : (
        <div className="space-y-3">
          {profiles.map((p) => (
            <div key={p.id} className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-3 hover:border-cyan-500/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">{p.name}</h3>
                    <span className={clsx("px-2 py-0.5 text-[9px] font-bold rounded-full border uppercase tracking-wide", p.is_active ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-slate-500/15 text-slate-400 border-slate-500/30")}>{p.is_active ? "Active" : "Paused"}</span>
                    <span className="px-2 py-0.5 text-[9px] font-bold rounded-full border bg-violet-500/10 text-violet-400 border-violet-500/20">{p.frequency}</span>
                  </div>
                  {p.description && <p className="text-xs text-[var(--text-muted)]">{p.description}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => runDiscovery(p.id)} disabled={runningId === p.id} title="Run discovery now" className="p-2 rounded-xl text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/25 transition-colors disabled:opacity-50">
                    {runningId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => toggleActive(p.id, p.is_active)} title={p.is_active ? "Pause" : "Resume"} className="p-2 rounded-xl text-[var(--text-muted)] hover:text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/25 transition-colors">
                    {p.is_active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => deleteProfile(p.id)} title="Delete" className="p-2 rounded-xl text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/25 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {p.topics.map((t) => (<span key={t} className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 text-[10px] border border-cyan-500/20">{t}</span>))}
                {p.keywords.map((k) => (<span key={k} className="px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-muted)] text-[10px] border border-[var(--border-color)]">#{k}</span>))}
              </div>
              <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-color)]">
                <span>Sources: {p.sources?.join(", ")}</span>
                <span>Last run: {fmtDateTime(p.last_run_at)}</span>
              </div>
              {runMsg[p.id] && (<p className="text-[11px] text-emerald-400 font-medium">{runMsg[p.id]}</p>)}
            </div>
          ))}
        </div>
      )}
      {showCreate && (<CreateProfileModal onClose={() => setShowCreate(false)} onCreated={() => { loadProfiles(); onRefresh(); }} />)}
    </>
  );
}

// ─── Tab: Alerts ──────────────────────────────────────────────────────────────

function AlertsTab() {
  const [alerts, setAlerts] = useState<NotificationAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRelevance, setFilterRelevance] = useState("All");
  const [filterUnread, setFilterUnread] = useState(false);
  const [selectedPub, setSelectedPub] = useState<DiscoveredPublication | null>(null);

  const loadAlerts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterUnread) params.set("unread_only", "true");
      if (filterRelevance !== "All") params.set("relevance", filterRelevance);
      const res = await fetch(`${API}/alerts/?${params.toString()}`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setAlerts(await res.json()); setError(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [filterRelevance, filterUnread]);

  useEffect(() => { setLoading(true); loadAlerts(); }, [loadAlerts]);

  const markRead = async (id: number) => {
    await fetch(`${API}/alerts/${id}/read`, { method: "POST" });
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, is_read: true } : a));
  };

  const markAllRead = async () => {
    await fetch(`${API}/alerts/read-all`, { method: "POST" });
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
  };

  const savePub = async (id: number) => { await fetch(`${API}/monitoring/publications/${id}/save`, { method: "POST" }); };

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  if (error) return (<div className="flex items-center gap-2 text-rose-400 text-xs p-4 rounded-xl bg-rose-500/10 border border-rose-500/25"><WifiOff className="w-4 h-4 shrink-0" />Could not load alerts: {error}</div>);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            {["All", "High", "Medium", "Low"].map((r) => (
              <button key={r} onClick={() => setFilterRelevance(r)} className={clsx("px-3 py-1 rounded-lg font-semibold transition-colors", filterRelevance === r ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}>{r}</button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
            <input type="checkbox" checked={filterUnread} onChange={(e) => setFilterUnread(e.target.checked)} className="accent-cyan-500" />Unread only
          </label>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/15 transition-colors">
            <CheckCheck className="w-3.5 h-3.5" />Mark all read ({unreadCount})
          </button>
        )}
      </div>
      {loading ? <LoadingSpinner /> : alerts.length === 0 ? (
        <EmptyState icon={BellRing} title="No alerts yet" description="Run a discovery job on your research profiles to receive real alerts about new publications." />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className={clsx("p-5 rounded-3xl border transition-colors", alert.is_read ? "bg-[var(--bg-card)] border-[var(--border-color)]" : "bg-gradient-to-br from-cyan-500/5 to-[var(--bg-card)] border-cyan-500/30")}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold text-cyan-400">{alert.profile_name}</span>
                    {relevanceBadge(alert.relevance_category)}
                    {!alert.is_read && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug">{alert.title}</h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">{alert.message}</p>
                  <p className="text-[11px] text-[var(--text-muted)]"><Clock className="w-3 h-3 inline mr-1" />{fmtDateTime(alert.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {alert.publication && (<button onClick={() => setSelectedPub(alert.publication!)} className="p-2 rounded-xl text-[var(--text-muted)] hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/25 transition-colors" title="View paper"><Eye className="w-3.5 h-3.5" /></button>)}
                  {!alert.is_read && (<button onClick={() => markRead(alert.id)} className="p-2 rounded-xl text-[var(--text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/25 transition-colors" title="Mark read"><CheckCircle2 className="w-3.5 h-3.5" /></button>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {selectedPub && (<PublicationModal pub={selectedPub} onClose={() => setSelectedPub(null)} onSave={savePub} onStartResearch={(t) => { window.location.href = `/research?topic=${encodeURIComponent(t)}`; }} />)}
    </>
  );
}

// ─── Tab: Publications ────────────────────────────────────────────────────────

function PublicationsTab() {
  const [pubs, setPubs] = useState<DiscoveredPublication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRelevance, setFilterRelevance] = useState("All");
  const [filterSource, setFilterSource] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPub, setSelectedPub] = useState<DiscoveredPublication | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const loadPubs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterRelevance !== "All") params.set("relevance", filterRelevance);
      if (filterSource !== "All") params.set("source_db", filterSource);
      if (searchQuery) params.set("query", searchQuery);
      const res = await fetch(`${API}/monitoring/publications?${params.toString()}`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setPubs(await res.json()); setError(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [filterRelevance, filterSource, searchQuery]);

  useEffect(() => { setLoading(true); loadPubs(); }, [loadPubs]);

  const savePub = async (id: number) => {
    await fetch(`${API}/monitoring/publications/${id}/save`, { method: "POST" });
    setPubs((prev) => prev.map((p) => p.id === id ? { ...p, is_saved: true } : p));
  };

  const toggleRead = async (id: number) => {
    await fetch(`${API}/monitoring/publications/${id}/read`, { method: "POST" });
    setPubs((prev) => prev.map((p) => p.id === id ? { ...p, is_read: !p.is_read } : p));
  };

  const toggleExpand = (id: number) => setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (error) return (<div className="flex items-center gap-2 text-rose-400 text-xs p-4 rounded-xl bg-rose-500/10 border border-rose-500/25"><WifiOff className="w-4 h-4 shrink-0" />Could not load publications: {error}</div>);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search title, author, abstract…" className="flex-1 min-w-[180px] p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500/50" />
        <select value={filterRelevance} onChange={(e) => setFilterRelevance(e.target.value)} className="p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none">
          <option value="All">All Relevance</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
        </select>
        <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none">
          <option value="All">All Sources</option><option value="arxiv">arXiv</option><option value="openalex">OpenAlex</option><option value="crossref">Crossref</option><option value="semantic_scholar">Semantic Scholar</option>
        </select>
      </div>
      {loading ? <LoadingSpinner /> : pubs.length === 0 ? (
        <EmptyState icon={FileSearch} title="No publications discovered yet" description="Create a research profile and run discovery to find papers from real scholarly APIs." />
      ) : (
        <div className="space-y-3">
          {pubs.map((pub) => {
            const isExp = expanded.has(pub.id);
            return (
              <div key={pub.id} className={clsx("p-5 rounded-3xl border transition-colors", pub.is_read ? "bg-[var(--bg-card)] border-[var(--border-color)]" : "bg-[var(--bg-card)] border-[var(--border-color)] hover:border-cyan-500/30")}>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {relevanceBadge(pub.relevance_category)}
                    {pub.source_db && (<span className="px-2 py-0.5 text-[9px] font-bold rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/20">{pub.source_db.toUpperCase()}</span>)}
                    {pub.profile_name && (<span className="text-[10px] text-[var(--text-muted)]">via {pub.profile_name}</span>)}
                    {pub.is_saved && (<span className="px-2 py-0.5 text-[9px] font-bold rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Saved</span>)}
                  </div>
                  <button onClick={() => toggleExpand(pub.id)} className="w-full text-left">
                    <h3 className={clsx("text-sm font-semibold leading-snug", pub.is_read ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)]")}>{pub.title}</h3>
                  </button>
                  {pub.authors && <p className="text-xs text-[var(--text-muted)]">{pub.authors}</p>}
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span>{pub.journal_or_venue || "—"}{pub.publication_year ? ` · ${pub.publication_year}` : ""}</span>
                    <span>Discovered {fmtDate(pub.first_discovered_at)}</span>
                  </div>
                </div>
                {isExp && pub.abstract && (
                  <div className="mt-3 pt-3 border-t border-[var(--border-color)] space-y-2">
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{pub.abstract}</p>
                    {pub.ai_explanation && (<div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20"><p className="text-[10px] font-bold text-cyan-400 mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" />AI Assessment</p><p className="text-[11px] text-[var(--text-secondary)]">{pub.ai_explanation}</p></div>)}
                    {pub.matching_keywords && pub.matching_keywords.length > 0 && (<div className="flex flex-wrap gap-1">{pub.matching_keywords.map((k) => (<span key={k} className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 text-[10px]">#{k}</span>))}</div>)}
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-[var(--border-color)] flex items-center gap-2 flex-wrap">
                  <button onClick={() => toggleExpand(pub.id)} className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                    {isExp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}{isExp ? "Less" : "Details"}
                  </button>
                  <button onClick={() => setSelectedPub(pub)} className="flex items-center gap-1 text-xs text-cyan-400 hover:underline transition-colors"><Eye className="w-3.5 h-3.5" />Full View</button>
                  {pub.url && (<a href={pub.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><ExternalLink className="w-3.5 h-3.5" />Source</a>)}
                  <div className="ml-auto flex items-center gap-2">
                    <button onClick={() => toggleRead(pub.id)} title={pub.is_read ? "Mark unread" : "Mark read"} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors">
                      {pub.is_read ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => savePub(pub.id)} disabled={pub.is_saved} title="Save to Library" className={clsx("flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors", pub.is_saved ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-cyan-500/30 hover:text-cyan-400")}>
                      <Bookmark className="w-3 h-3" />{pub.is_saved ? "Saved" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {selectedPub && (<PublicationModal pub={selectedPub} onClose={() => setSelectedPub(null)} onSave={async (id) => { await savePub(id); setSelectedPub((p) => p ? { ...p, is_saved: true } : null); }} onStartResearch={(t) => { window.location.href = `/research?topic=${encodeURIComponent(t)}`; }} />)}
    </>
  );
}

// ─── Tab: Jobs ────────────────────────────────────────────────────────────────

function JobsTab() {
  const [jobs, setJobs] = useState<MonitoringJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/monitoring/jobs`)
      .then((r) => { if (!r.ok) throw new Error(`Status ${r.status}`); return r.json(); })
      .then((d) => { setJobs(d); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return (<div className="flex items-center gap-2 text-rose-400 text-xs p-4 rounded-xl bg-rose-500/10 border border-rose-500/25"><WifiOff className="w-4 h-4 shrink-0" />Could not load jobs: {error}</div>);

  return (
    <>
      <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-400" />Monitoring Job History</h2>
      {jobs.length === 0 ? (
        <EmptyState icon={Activity} title="No monitoring jobs yet" description="Jobs are created when you run discovery on a research profile, either manually or on schedule." />
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div key={job.id} className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{job.profile_name}</span>
                  <StatusBadge status={job.status} />
                  {job.triggered_by && <span className="text-[10px] text-[var(--text-muted)]">· {job.triggered_by}</span>}
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">{fmtDateTime(job.started_at)}{job.completed_at ? ` → ${fmtDateTime(job.completed_at)}` : ""}</p>
                {job.error_message && <p className="text-[11px] text-rose-400">{job.error_message}</p>}
              </div>
              <div className="text-right shrink-0">
                {job.papers_found != null && (<><p className="text-xs font-bold text-[var(--text-primary)]">{job.papers_new ?? 0} new</p><p className="text-[11px] text-[var(--text-muted)]">{job.papers_found} found</p></>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Dashboard Strip ──────────────────────────────────────────────────────────

function DashboardStrip({ stats, onRefresh, refreshing }: { stats: DashboardStats | null; onRefresh: () => void; refreshing: boolean }) {
  const metrics = stats ? [
    { label: "Total Discovered", value: stats.total_discovered, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { label: "New (24h)", value: stats.new_publications_count, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Active Profiles", value: stats.active_profiles_count, color: "text-violet-400", bg: "bg-violet-500/10" },
    { label: "Unread Alerts", value: stats.unread_alerts_count, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "High Relevance", value: stats.high_relevance_count, color: "text-rose-400", bg: "bg-rose-500/10" },
  ] : [];

  return (
    <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2"><BarChart3 className="w-4 h-4 text-cyan-400" />Monitoring Overview</h2>
        <button onClick={onRefresh} disabled={refreshing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-muted)] bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50">
          <RefreshCw className={clsx("w-3.5 h-3.5", refreshing && "animate-spin")} />Refresh
        </button>
      </div>
      {!stats ? (
        <div className="text-xs text-[var(--text-muted)] flex items-center gap-2"><WifiOff className="w-3.5 h-3.5" />Backend unavailable — start the server to see live data.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {metrics.map((m) => (<div key={m.label} className={clsx("p-3 rounded-2xl border border-[var(--border-color)]", m.bg)}><p className={clsx("text-xl font-extrabold", m.color)}>{m.value}</p><p className="text-[11px] text-[var(--text-muted)] mt-0.5">{m.label}</p></div>))}
          </div>
          <div className="flex items-center gap-6 text-[11px] text-[var(--text-muted)] flex-wrap pt-1">
            <span>Last run: <span className="text-[var(--text-secondary)]">{stats.last_monitoring_run ? fmtDateTime(stats.last_monitoring_run) : "Never"}</span></span>
            <span>Next run: <span className="text-[var(--text-secondary)]">{stats.next_scheduled_run ? fmtDateTime(stats.next_scheduled_run) : "Manual only"}</span></span>
            <span className="flex items-center gap-1"><Database className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">arXiv · OpenAlex · Crossref · Semantic Scholar</span></span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabKey = "profiles" | "alerts" | "publications" | "jobs";

export default function AlertsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("alerts");
  const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${API}/monitoring/dashboard`);
      if (!res.ok) return;
      setDashStats(await res.json());
    } catch { /* Backend offline */ }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshKey((k) => k + 1);
    setRefreshing(false);
  }, [loadDashboard]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const tabs: { key: TabKey; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: "alerts", label: "Smart Alerts", icon: BellRing, badge: dashStats?.unread_alerts_count },
    { key: "publications", label: "Discovered Papers", icon: BookOpen, badge: dashStats?.new_publications_count },
    { key: "profiles", label: "Research Profiles", icon: Layers, badge: dashStats?.active_profiles_count },
    { key: "jobs", label: "Job History", icon: Activity },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2.5">
            <BellRing className="w-6 h-6 text-cyan-400" />Research Monitoring
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">Automated discovery from arXiv, OpenAlex, Crossref &amp; Semantic Scholar with AI-powered relevance ranking.</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
          <Tag className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400 font-semibold">Phase 3 Active</span>
        </div>
      </div>

      <DashboardStrip stats={dashStats} onRefresh={handleRefresh} refreshing={refreshing} />

      <div className="flex gap-1 p-1 rounded-2xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)] overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={clsx("flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap relative", isActive ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border-color)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}>
              <Icon className="w-3.5 h-3.5" />{tab.label}
              {tab.badge != null && tab.badge > 0 && (<span className="absolute -top-1 -right-1 w-4 h-4 text-[9px] font-extrabold rounded-full bg-cyan-500 text-white flex items-center justify-center">{tab.badge > 9 ? "9+" : tab.badge}</span>)}
            </button>
          );
        })}
      </div>

      <div key={refreshKey} className="space-y-5">
        {activeTab === "profiles" && <ProfilesTab onRefresh={handleRefresh} />}
        {activeTab === "alerts" && <AlertsTab />}
        {activeTab === "publications" && <PublicationsTab />}
        {activeTab === "jobs" && <JobsTab />}
      </div>
    </div>
  );
}
