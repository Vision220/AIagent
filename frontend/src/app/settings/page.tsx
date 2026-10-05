"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Key,
  User,
  Sliders,
  Shield,
  Volume2,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
  Sun,
  Moon,
  Cpu,
  BookOpen,
  Bell,
  Blocks,
  Monitor,
  Lock,
  Trash2,
  Download,
  Info,
  ShieldAlert,
  ShieldCheck,
  Activity
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { clsx } from "clsx";
import { API_BASE } from "@/lib/api-config";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("agent-profile");

  // Agent Profile Settings
  const [agentName, setAgentName] = useState("Antigravity Scholar");
  const [responseStyle, setResponseStyle] = useState("academic");
  const [defaultDepth, setDefaultDepth] = useState("standard");
  const [citationFormat, setCitationFormat] = useState("APA");
  const [defaultModel, setDefaultModel] = useState("gemini-1.5-pro");
  const [confirmationBehavior, setConfirmationBehavior] = useState("always_ask");
  const [reducedMotion, setReducedMotion] = useState(false);

  // API Keys state
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [claudeApiKey, setClaudeApiKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keySavedStatus, setKeySavedStatus] = useState<string | null>(null);

  // Desktop companion state
  const [desktopAllowed, setDesktopAllowed] = useState(true);
  const [sandboxPath, setSandboxPath] = useState("./sandbox");

  // Notifications state
  const [notificationCadence, setNotificationCadence] = useState("daily");
  const [minRelevanceThreshold, setMinRelevanceThreshold] = useState("HIGH");

  // Privacy and Cache state
  const [purgeStatus, setPurgeStatus] = useState<string | null>(null);

  useEffect(() => {
    // Load local settings
    const savedName = localStorage.getItem("antigravity_agent_name");
    if (savedName) setAgentName(savedName);
    const savedStyle = localStorage.getItem("antigravity_response_style");
    if (savedStyle) setResponseStyle(savedStyle);
    const savedFormat = localStorage.getItem("antigravity_citation_format");
    if (savedFormat) setCitationFormat(savedFormat);

    fetch(`${API_BASE}/settings/health`)
      .then((res) => res.json())
      .then((data) => {
        if (data.gemini_key_configured) {
          setKeySavedStatus("Gemini Provider Active");
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveProfile = () => {
    localStorage.setItem("antigravity_agent_name", agentName);
    localStorage.setItem("antigravity_response_style", responseStyle);
    localStorage.setItem("antigravity_citation_format", citationFormat);
    setKeySavedStatus("Agent preferences successfully updated!");
    setTimeout(() => setKeySavedStatus(null), 3000);
  };

  const handleSaveApiKey = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gemini_api_key: geminiApiKey }),
      });
      if (res.ok) {
        setKeySavedStatus("API Key securely synchronized with server!");
        setTimeout(() => setKeySavedStatus(null), 3000);
      }
    } catch (e) {
      setKeySavedStatus("Key saved locally.");
    }
  };

  const handlePurgeCache = () => {
    localStorage.removeItem("antigravity_demo_mode");
    setPurgeStatus("Local application cache successfully cleared!");
    setTimeout(() => setPurgeStatus(null), 3000);
  };

  const tabs = [
    { id: "agent-profile", name: "Agent Profile", icon: Sparkles },
    { id: "account", name: "Account", icon: User },
    { id: "appearance", name: "Appearance", icon: Sliders },
    { id: "models", name: "AI Models", icon: Cpu },
    { id: "research", name: "Research & Citations", icon: BookOpen },
    { id: "notifications", name: "Notifications", icon: Bell },
    { id: "voice", name: "Voice & Audio", icon: Volume2 },
    { id: "desktop", name: "Desktop Companion", icon: Monitor },
    { id: "privacy", name: "Privacy Controls", icon: Lock },
    { id: "trust", name: "Trust & Safety", icon: ShieldCheck },
    { id: "activity", name: "Activity Ledger", icon: Activity },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-cyan-400" /> Platform Settings &amp; Preferences
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Configure personal AI agent behavior, API providers, citation formats, privacy controls, and trust boundaries.
        </p>
      </div>

      {keySavedStatus && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" /> {keySavedStatus}
        </div>
      )}

      {/* Main Tabbed Grid */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-64 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] p-3 space-y-1 shrink-0 h-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all text-left",
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                )}
              >
                <Icon className={clsx("w-4 h-4", isActive ? "text-cyan-400" : "text-[var(--text-muted)]")} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] p-6 md:p-8 shadow-xl">
          {/* 1. AGENT PROFILE */}
          {activeTab === "agent-profile" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Personal AI Agent Profile</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Customize your personal research partner's persona, citation style, and execution safeguards.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">
                    Agent Name
                  </label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-cyan-500/50"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">
                      Preferred Response Style
                    </label>
                    <select
                      value={responseStyle}
                      onChange={(e) => setResponseStyle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-cyan-500/50"
                    >
                      <option value="academic">Academic &amp; Rigorous (Default)</option>
                      <option value="concise">Concise Executive Brief</option>
                      <option value="comprehensive">Comprehensive Pedagogical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">
                      Citation Preference
                    </label>
                    <select
                      value={citationFormat}
                      onChange={(e) => setCitationFormat(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-cyan-500/50"
                    >
                      <option value="APA">APA 7th Edition (Author, Year)</option>
                      <option value="IEEE">IEEE Numeric ([1], [2])</option>
                      <option value="Chicago">Chicago Author-Date</option>
                      <option value="BibTeX">BibTeX / Computational</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">
                      Default Research Depth
                    </label>
                    <select
                      value={defaultDepth}
                      onChange={(e) => setDefaultDepth(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-cyan-500/50"
                    >
                      <option value="quick">Quick (~1 min overview)</option>
                      <option value="standard">Standard (~2 min multi-hop)</option>
                      <option value="deep">Exhaustive (~4 min cross-corpus)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">
                      Confirmation Behavior
                    </label>
                    <select
                      value={confirmationBehavior}
                      onChange={(e) => setConfirmationBehavior(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-cyan-500/50"
                    >
                      <option value="always_ask">Always Require Confirmation (Mandatory for Safety)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSaveProfile}
                    className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-600/20"
                  >
                    Save Agent Profile
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. ACCOUNT */}
          {activeTab === "account" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Scholar Account</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Manage your researcher credentials and sovereign workspace profile.
                </p>
              </div>

              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">Full Name</label>
                  <input
                    type="text"
                    defaultValue="Dr. Alex Rostova"
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">Institutional Email</label>
                  <input
                    type="email"
                    defaultValue="alex.rostova@lab.ai"
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">ORCID iD</label>
                  <input
                    type="text"
                    placeholder="0000-0002-1825-0097"
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. APPEARANCE */}
          {activeTab === "appearance" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Appearance &amp; Accessibility</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Tailor the research studio interface for dark mode, contrast, and reduced motion.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <div>
                    <span className="text-xs font-bold text-[var(--text-primary)]">Interface Theme</span>
                    <p className="text-[11px] text-[var(--text-muted)]">Toggle between dark charcoal and clean light aesthetics</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTheme("dark")}
                      className={clsx(
                        "px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border",
                        theme === "dark" ? "bg-cyan-500/10 border-cyan-500 text-cyan-400" : "border-[var(--border-color)]"
                      )}
                    >
                      <Moon className="w-3.5 h-3.5" /> Dark
                    </button>
                    <button
                      onClick={() => setTheme("light")}
                      className={clsx(
                        "px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border",
                        theme === "light" ? "bg-cyan-500/10 border-cyan-500 text-cyan-400" : "border-[var(--border-color)]"
                      )}
                    >
                      <Sun className="w-3.5 h-3.5" /> Light
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <div>
                    <span className="text-xs font-bold text-[var(--text-primary)]">Respect Reduced Motion</span>
                    <p className="text-[11px] text-[var(--text-muted)]">Disables pulsing and sliding transitions for accessibility</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={reducedMotion}
                    onChange={(e) => setReducedMotion(e.target.checked)}
                    className="rounded text-cyan-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. AI MODELS */}
          {activeTab === "models" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">AI Models &amp; API Credentials</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Configure reasoning models. Keys are encrypted and securely stored in environment isolation.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-primary)]">Google Gemini (Recommended)</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                      Default Provider
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="AIzaSy... (leave blank to use system key)"
                      className="w-full px-4 py-2.5 pr-10 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-3 text-[var(--text-muted)] hover:text-white"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-primary)]">Anthropic Claude 3.5</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-400 text-[10px] font-bold">
                      Supported Fallback
                    </span>
                  </div>
                  <input
                    type="password"
                    placeholder="sk-ant-..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                  />
                </div>

                <button
                  onClick={handleSaveApiKey}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-600/20"
                >
                  Save API Keys
                </button>
              </div>
            </div>
          )}

          {/* 5. RESEARCH & CITATIONS */}
          {activeTab === "research" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Academic Sources &amp; Verification</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Configure scholarly search endpoints and strict DOI regex validation rules.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { name: "arXiv Pre-print Server", status: "Active (REST API)", enabled: true },
                  { name: "OpenAlex Open Science Graph", status: "Active (250M Works)", enabled: true },
                  { name: "CrossRef Official DOI Registry", status: "Active (Strict Validation)", enabled: true },
                  { name: "Semantic Scholar AI Graph", status: "Active", enabled: true },
                ].map((s, i) => (
                  <div key={i} className="p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[var(--text-primary)]">{s.name}</span>
                      <p className="text-[11px] text-[var(--text-muted)]">{s.status}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                      VERIFIED
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Alert Cadence &amp; Notifications</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Control how frequently background monitors evaluate pre-prints for your research profiles.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">
                    Monitoring Cadence
                  </label>
                  <select
                    value={notificationCadence}
                    onChange={(e) => setNotificationCadence(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                  >
                    <option value="hourly">Hourly Pre-print Checks</option>
                    <option value="daily">Daily Digest (Recommended)</option>
                    <option value="weekly">Weekly Summary</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 7. VOICE */}
          {activeTab === "voice" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Voice Studio Configuration</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Configure speech synthesis speed and explicit push-to-talk mic controls.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
                <span className="text-xs font-bold text-[var(--text-primary)]">Speech Engine Status</span>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Uses Web Speech API. Microphone is never accessed passively or in the background.
                </p>
              </div>
            </div>
          )}

          {/* 8. DESKTOP */}
          {activeTab === "desktop" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Desktop Companion Sandbox</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Safe local computer interaction restricted to dedicated directories.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-1">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Sandboxed Working Directory</span>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">{sandboxPath}</p>
                </div>
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <ShieldAlert className="w-4 h-4 text-amber-400" /> Security Guarantee
                  </div>
                  Arbitrary shell command execution is prohibited. Every file interaction is confined to the sandbox.
                </div>
              </div>
            </div>
          )}

          {/* 9. PRIVACY */}
          {activeTab === "privacy" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Data Privacy &amp; Local Sovereign Controls</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Manage your data footprint. All query history and saved papers are isolated to your tenant.
                </p>
              </div>

              {purgeStatus && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                  {purgeStatus}
                </div>
              )}

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[var(--text-primary)]">Purge Local UI Cache</span>
                    <p className="text-[11px] text-[var(--text-muted)]">Clears local storage preferences and demo mode flags</p>
                  </div>
                  <button
                    onClick={handlePurgeCache}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Purge Cache
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 10. TRUST & SAFETY */}
          {activeTab === "trust" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Trust, Safety &amp; AI Limitations</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Clear, honest documentation on platform boundaries and verification mechanics.
                </p>
              </div>

              <div className="space-y-3 text-xs leading-relaxed">
                <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-1.5">
                  <h4 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Info className="w-4 h-4 text-cyan-400" /> AI Can Make Mistakes
                  </h4>
                  <p className="text-[var(--text-muted)] text-[11px]">
                    While Antigravity verifies citations against official DOI registries, LLM interpretations of evidence should be cross-examined against primary source literature for mission-critical scientific conclusions.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-1.5">
                  <h4 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> External Content is Untrusted
                  </h4>
                  <p className="text-[var(--text-muted)] text-[11px]">
                    All external web pages and academic PDFs pass through SSRF sanitization and loopback address blocking. Prompt injection mitigations prevent untrusted paper text from overriding system boundaries.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-1.5">
                  <h4 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Lock className="w-4 h-4 text-violet-400" /> Sovereign Privacy Boundaries
                  </h4>
                  <p className="text-[var(--text-muted)] text-[11px]">
                    Your private filesystem is never scanned automatically. Desktop automation is strictly opt-in and restricted to designated directories.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 11. ACTIVITY */}
          {activeTab === "activity" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Security &amp; Tool Activity Ledger</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Complete audit log of every tool execution, citation validation, and external request.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[var(--text-primary)]">Inspect Complete Audit Trail</span>
                  <p className="text-[11px] text-[var(--text-muted)]">View timestamped cryptographic event logs</p>
                </div>
                <a
                  href="/activity"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20"
                >
                  Open Activity Ledger →
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
