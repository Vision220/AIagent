"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  X,
  Sliders,
  Cpu,
  BookOpen,
  Bell,
  Mic,
  Monitor,
  Shield,
  Layers,
  ChevronRight
} from "lucide-react";
import { clsx } from "clsx";

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function OnboardingWizard({ isOpen, onClose, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 10;

  // Step 3: Interests
  const [interests, setInterests] = useState<string[]>([
    "Quantum Computing",
    "Agentic AI",
    "Biomedical NLP",
  ]);

  // Step 4: AI Provider
  const [selectedProvider, setSelectedProvider] = useState("gemini");
  const [apiKeyInput, setApiKeyInput] = useState("");

  // Step 5: Sources
  const [selectedSources, setSelectedSources] = useState<string[]>([
    "arxiv",
    "openalex",
    "crossref",
    "semantic_scholar",
  ]);

  // Step 6: Notifications
  const [alertFrequency, setAlertFrequency] = useState("daily");
  const [emailAlerts, setEmailAlerts] = useState(false);

  // Step 7: Voice
  const [enableVoice, setEnableVoice] = useState(false);

  // Step 8: Desktop
  const [enableDesktop, setEnableDesktop] = useState(false);

  if (!isOpen) return null;

  const toggleInterest = (topic: string) => {
    setInterests((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const toggleSource = (source: string) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      localStorage.setItem("antigravity_onboarded", "true");
      onComplete();
    }
  };

  const handleSkip = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      localStorage.setItem("antigravity_onboarded", "true");
      onComplete();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header with Progress Bar */}
        <div className="p-6 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Setup Assistant • Step {step} of {totalSteps}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              aria-label="Close onboarding modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Indicators */}
          <div className="w-full bg-[var(--bg-tertiary)] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 h-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Body */}
        <div className="p-8 overflow-y-auto flex-1 text-[var(--text-primary)]">
          {/* STEP 1: WELCOME */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 id="onboarding-title" className="text-2xl font-extrabold tracking-tight">
                Welcome to Antigravity AI Research Studio
              </h2>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Antigravity is your personal, sovereign AI research partner designed for researchers, engineers, and scholars. It decomposes complex questions, validates citations against real literature, tracks new publications, and coordinates desktop research safely.
              </p>
              <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2 mt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">Core Guarantees</h4>
                <ul className="text-xs text-[var(--text-muted)] space-y-1.5 list-disc list-inside">
                  <li>Zero citation hallucinations: every citation is strictly checked against DOIs and academic registries.</li>
                  <li>Strict tenant isolation: your projects, queries, and papers are never leaked.</li>
                  <li>Explicit permission boundaries: no autonomous system modification without confirmation.</li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 2: WHAT THE AGENT CAN DO */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <h2 className="text-xl font-bold tracking-tight">What Antigravity Can Do For You</h2>
              <p className="text-xs text-[var(--text-muted)]">
                A unified multi-capability platform built from ground up:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div className="p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs mb-1">
                    <BookOpen className="w-4 h-4" /> Deep Research Synthesis
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Autonomous multi-hop queries scanning ArXiv, OpenAlex, CrossRef, and PubMed with inline verification.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs mb-1">
                    <Bell className="w-4 h-4" /> Continuous Monitoring
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Smart background alerts scanning pre-print feeds daily and scoring papers for your research agenda.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <div className="flex items-center gap-2 text-violet-400 font-semibold text-xs mb-1">
                    <Cpu className="w-4 h-4" /> Multi-Model Routing
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Seamless fallback across Google Gemini, Anthropic Claude, OpenAI, and local Ollama models.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
                    <Monitor className="w-4 h-4" /> Desktop Companion
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Sandboxed local automation for paper reading, file exports, and hands-free gesture browsing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CHOOSE RESEARCH INTERESTS */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <h2 className="text-xl font-bold tracking-tight">Select Your Research Domains</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Choose the domains you actively investigate to seed your initial literature feed and alert monitors.
              </p>
              <div className="flex flex-wrap gap-2.5 pt-2">
                {[
                  "Quantum Computing",
                  "Agentic AI",
                  "Biomedical NLP",
                  "Climate Modeling",
                  "Graph Neural Networks",
                  "Robotics & Control",
                  "Reinforcement Learning",
                  "Computational Biology",
                  "Materials Informatics",
                  "Structural Engineering"
                ].map((topic) => {
                  const isSelected = interests.includes(topic);
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => toggleInterest(topic)}
                      className={clsx(
                        "px-3.5 py-2 rounded-xl text-xs font-medium border transition-all flex items-center gap-2",
                        isSelected
                          ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400 font-semibold"
                          : "bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-color-hover)]"
                      )}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      {topic}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: CONFIGURE AI PROVIDER */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <h2 className="text-xl font-bold tracking-tight">Configure AI Provider</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Select your default reasoning model. Antigravity ships with built-in Gemini support and fallback architecture.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { id: "gemini", name: "Google Gemini 2.0 / 1.5", status: "Recommended" },
                  { id: "anthropic", name: "Anthropic Claude 3.5", status: "Supported" },
                  { id: "openai", name: "OpenAI GPT-4o", status: "Supported" },
                  { id: "ollama", name: "Local Ollama (Llama 3)", status: "Offline Sovereign" }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProvider(p.id)}
                    className={clsx(
                      "p-3 rounded-2xl border text-left transition-all",
                      selectedProvider === p.id
                        ? "bg-cyan-500/10 border-cyan-500/40 text-[var(--text-primary)]"
                        : "bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--border-color-hover)]"
                    )}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>{p.name}</span>
                      <span className="text-[10px] text-cyan-400">{p.status}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="pt-2">
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                  Optional Custom API Key (Leave blank to use system default)
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy... or sk-..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          {/* STEP 5: CONFIGURE RESEARCH SOURCES */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <h2 className="text-xl font-bold tracking-tight">Academic Literature Sources</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Select scholarly databases the agent queries during synthesis.
              </p>
              <div className="space-y-2.5 pt-2">
                {[
                  { id: "arxiv", name: "arXiv.org", desc: "Preprints in Computer Science, Physics, Math, Quantitative Biology." },
                  { id: "openalex", name: "OpenAlex Registry", desc: "Global open science index with 250M+ linked scientific works." },
                  { id: "crossref", name: "CrossRef DOI Registry", desc: "Official DOI authority ensuring accurate citations and metadata." },
                  { id: "semantic_scholar", name: "Semantic Scholar", desc: "AI-backed academic search and citation graph analysis." }
                ].map((s) => {
                  const isChecked = selectedSources.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => toggleSource(s.id)}
                      className={clsx(
                        "p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all",
                        isChecked
                          ? "bg-cyan-500/5 border-cyan-500/30"
                          : "bg-[var(--bg-secondary)] border-[var(--border-color)] opacity-60"
                      )}
                    >
                      <div>
                        <div className="text-xs font-bold text-[var(--text-primary)]">{s.name}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">{s.desc}</div>
                      </div>
                      <div className={clsx("w-5 h-5 rounded-md flex items-center justify-center border", isChecked ? "bg-cyan-500 border-cyan-500 text-white" : "border-[var(--border-color)]")}>
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 6: CONFIGURE NOTIFICATIONS */}
          {step === 6 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <h2 className="text-xl font-bold tracking-tight">Monitoring &amp; Alert Cadence</h2>
              <p className="text-xs text-[var(--text-muted)]">
                How often should Antigravity poll academic preprint servers for your topics?
              </p>
              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { id: "hourly", label: "Hourly", desc: "Rapid preprints" },
                  { id: "daily", label: "Daily (Rec.)", desc: "Digest summary" },
                  { id: "weekly", label: "Weekly", desc: "Curated brief" }
                ].map((cadence) => (
                  <button
                    key={cadence.id}
                    type="button"
                    onClick={() => setAlertFrequency(cadence.id)}
                    className={clsx(
                      "p-3 rounded-2xl border text-center transition-all",
                      alertFrequency === cadence.id
                        ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400 font-bold"
                        : "bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-muted)]"
                    )}
                  >
                    <div className="text-xs">{cadence.label}</div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{cadence.desc}</div>
                  </button>
                ))}
              </div>
              <div className="p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between mt-4">
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">In-App Notification Center</div>
                  <div className="text-[11px] text-[var(--text-muted)]">Show badges and notification drawer for high-relevance papers</div>
                </div>
                <input
                  type="checkbox"
                  checked={true}
                  readOnly
                  className="rounded text-cyan-500"
                />
              </div>
            </div>
          )}

          {/* STEP 7: OPTIONAL VOICE SETUP */}
          {step === 7 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <h2 className="text-xl font-bold tracking-tight">Hands-Free Voice Studio (Optional)</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Enables natural speech-to-text input and neural audio synthesis for listening to research executive summaries.
              </p>
              <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Enable Voice Recognition</div>
                    <div className="text-[11px] text-[var(--text-muted)]">Uses browser Web Speech API with explicit push-to-talk</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableVoice(!enableVoice)}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                    enableVoice
                      ? "bg-violet-600 text-white"
                      : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-color)]"
                  )}
                >
                  {enableVoice ? "Enabled" : "Disabled"}
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] italic">
                Note: Voice is never activated in the background. Audio processing requires explicit user interaction.
              </p>
            </div>
          )}

          {/* STEP 8: OPTIONAL DESKTOP-AGENT CONNECTION */}
          {step === 8 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <h2 className="text-xl font-bold tracking-tight">Desktop Companion Agent (Optional)</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Connect the local Python desktop agent to allow sandboxed paper exports, automated PDF indexing, and computer vision gestures.
              </p>
              <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Enable Desktop Agent Bridge</div>
                    <div className="text-[11px] text-[var(--text-muted)]">Pair via secure 6-digit PIN with sandboxed filesystem control</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableDesktop(!enableDesktop)}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                    enableDesktop
                      ? "bg-cyan-600 text-white"
                      : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-color)]"
                  )}
                >
                  {enableDesktop ? "Enabled" : "Skip"}
                </button>
              </div>
              <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-[11px] text-cyan-300">
                You can pair or revoke your desktop companion at any time from the Desktop tab.
              </div>
            </div>
          )}

          {/* STEP 9: PERMISSION OVERVIEW */}
          {step === 9 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <h2 className="text-xl font-bold tracking-tight">Security &amp; Permissions Overview</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Review how your data and tools are safeguarded within Antigravity:
              </p>
              <div className="space-y-2 pt-2">
                {[
                  { name: "Academic Literature Retrieval", status: "Read-Only Public APIs", icon: Shield },
                  { name: "Local File System Sandbox", status: "Restricted to /sandbox Directory", icon: Shield },
                  { name: "Browser Automation", status: "Whitelisted Academic Domains Only", icon: Shield },
                  { name: "Action Approvals", status: "Explicit User Confirmation for Sensitive Ops", icon: Shield },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                      <item.icon className="w-4 h-4 text-emerald-400" />
                      {item.name}
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-400">{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 10: FINISH */}
          {step === 10 && (
            <div className="space-y-4 text-center py-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-cyan-500/20 mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">You're Ready to Research</h2>
              <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
                Your research environment is configured with verified citation tracking, multi-model routing, and safety containment.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all"
                >
                  Enter Research Studio
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 px-6 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/50 flex items-center justify-between">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < totalSteps && (
              <button
                type="button"
                onClick={handleSkip}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Skip for now
              </button>
            )}

            {step < totalSteps && (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-600/20 transition-all"
              >
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
