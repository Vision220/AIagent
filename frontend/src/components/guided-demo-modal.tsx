"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  BookOpen,
  Bell,
  Mic,
  Monitor,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Volume2
} from "lucide-react";
import { clsx } from "clsx";

interface GuidedDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GuidedDemoModal({ isOpen, onClose }: GuidedDemoModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const totalSteps = 8;

  // Auto-advancement timer simulation if playing
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && currentStep < totalSteps) {
      timer = setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
      }, 3500);
    } else if (currentStep === totalSteps) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-script-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-3xl bg-[var(--bg-card)] border border-amber-500/30 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Demo Mode Banner */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-black text-[10px] font-black tracking-wider uppercase">
              DEMO MODE
            </span>
            <span className="text-xs text-amber-200/90 font-medium">
              Deterministic Sample Data • Non-Production Simulation
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-amber-300 hover:text-white transition-colors"
            aria-label="Close demo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Header */}
        <div className="p-6 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50 flex items-center justify-between">
          <div>
            <h2 id="demo-script-title" className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Interactive Guided Demo: AI in Flood Prediction
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Step {currentStep} of {totalSteps}: Watch the full lifecycle from question to desktop execution
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={clsx(
                "px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all",
                isPlaying
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:border-amber-500/40"
              )}
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isPlaying ? "Pause Tour" : "Autoplay"}</span>
            </button>
            <button
              onClick={() => {
                setCurrentStep(1);
                setIsPlaying(false);
              }}
              className="p-1.5 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              title="Reset Tour"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Step Visualizer */}
        <div className="p-8 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: USER ASKS QUESTION */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300">
                <strong>Simulated User Prompt:</strong> "Research the latest applications of AI in flood prediction."
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">1. Intent Classification &amp; Query Decomposition</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                The agent determines that this requires deep multi-source scholarly literature review rather than a simple one-shot LLM reply. It breaks the prompt into 3 focused research angles:
              </p>
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-[10px]">1</span>
                  <span>Spatiotemporal Graph Neural Networks for hydrological runoff forecasting</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-[10px]">2</span>
                  <span>Synthetic Aperture Radar (SAR) imagery &amp; flood inundation mapping</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-[10px]">3</span>
                  <span>Physics-informed neural networks (PINNs) integrating 2D shallow water equations</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SOURCE DISCOVERY */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-base font-bold text-[var(--text-primary)]">2. Scholarly Source Discovery &amp; Literature Scrape</h3>
              <p className="text-xs text-[var(--text-muted)]">
                The system queries arXiv, OpenAlex, and Crossref via verified REST endpoints, gathering 32 candidate papers:
              </p>
              <div className="space-y-2.5">
                {[
                  {
                    title: "Graph Neural Networks for Hydrological Runoff Forecasting Across Ungauged Basins",
                    authors: "Zhang, M., Kratzert, F., & Nearing, G.",
                    source: "arXiv:2403.09182",
                    doi: "10.48550/arXiv.2403.09182",
                    status: "VERIFIED SOURCE",
                  },
                  {
                    title: "Physics-Informed Neural Networks for High-Resolution Urban Flood Inundation Modeling",
                    authors: "Kalyanapu, A. & Morales, S.",
                    source: "Journal of Hydrology (OpenAlex:W438902)",
                    doi: "10.1016/j.jhydrol.2023.130492",
                    status: "VERIFIED SOURCE",
                  },
                ].map((paper, i) => (
                  <div key={i} className="p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px]">
                        {paper.status}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">{paper.doi}</span>
                    </div>
                    <div className="font-semibold text-[var(--text-primary)]">{paper.title}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{paper.authors} • {paper.source}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: EVIDENCE SYNTHESIS */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-base font-bold text-[var(--text-primary)]">3. Evidence Extraction &amp; Strict Citation Linking</h3>
              <p className="text-xs text-[var(--text-muted)]">
                The AI synthesizes the evidence and enforces provenance badges on every claim:
              </p>
              <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold text-[10px]">
                    VERIFIED CITATION
                  </span>
                  <span className="text-slate-300 font-mono text-[11px]">[Zhang et al., 2024]</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  "Spatiotemporal Graph Neural Networks demonstrated a 24.8% reduction in Nash-Sutcliffe Efficiency (NSE) error over traditional conceptual rainfall-runoff models when tested across 531 USGS ungauged catchments."
                </p>
                <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                  <span>Method: Cross-validation on CAMELS dataset</span>
                  <span className="text-emerald-400 font-semibold">100% DOI Validated</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REPORT GENERATION */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-base font-bold text-[var(--text-primary)]">4. Full Report Saved &amp; Exportable</h3>
              <p className="text-xs text-[var(--text-muted)]">
                The research project is automatically cataloged in the Research Library with metadata and export formats:
              </p>
              <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-cyan-400" />
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">
                      Synthesis Report: AI in Flood Inundation &amp; Runoff Prediction
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Saved to Library • 4 Verified References • 0 Hallucinations
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-xl bg-cyan-500/10 text-cyan-400 text-xs font-semibold">
                  Saved
                </span>
              </div>
            </div>
          )}

          {/* STEP 5: SMART MONITORING TRIGGER */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-base font-bold text-[var(--text-primary)]">5. Continuous Research Alert Setup</h3>
              <p className="text-xs text-[var(--text-muted)]">
                The agent proposes establishing an autonomous monitoring profile to track daily preprints:
              </p>
              <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-xs space-y-2">
                <div className="flex items-center gap-2 text-violet-300 font-bold">
                  <Bell className="w-4 h-4" /> Recommended Monitor
                </div>
                <p className="text-[11px] text-violet-200">
                  Topic: <strong>AI in Flood Prediction &amp; Urban Hydrology</strong>
                </p>
                <p className="text-[11px] text-violet-300/80">
                  Target sources: arXiv (cs.AI, physics.geo-ph) &amp; OpenAlex • Daily Cron Cadence
                </p>
              </div>
            </div>
          )}

          {/* STEP 6: VOICE READOUT */}
          {currentStep === 6 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-base font-bold text-[var(--text-primary)]">6. Hands-Free Voice Readout</h3>
              <p className="text-xs text-[var(--text-muted)]">
                The user asks: "Read the executive summary aloud."
              </p>
              <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Volume2 className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Speech Synthesis Active</div>
                    <div className="text-[11px] text-[var(--text-muted)]">Speaking Executive Summary (Speed: 1.0x, Voice: Academic Neutral)</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                  Speaking
                </span>
              </div>
            </div>
          )}

          {/* STEP 7: DESKTOP PERMISSION SIMULATION */}
          {currentStep === 7 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-base font-bold text-[var(--text-primary)]">7. Desktop Agent Permission Confirmation</h3>
              <p className="text-xs text-[var(--text-muted)]">
                When requested to export a PDF to the local desktop folder, the platform presents explicit confirmation:
              </p>
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <ShieldAlert className="w-4 h-4" /> Sensitive Action Authorization Required
                </div>
                <p className="text-[11px] text-amber-200">
                  Desktop Agent requests write permission to: <code>./sandbox/reports/flood_prediction_summary.pdf</code>
                </p>
                <div className="flex gap-2 pt-1">
                  <button className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-bold">
                    Approve (One-Time)
                  </button>
                  <button className="px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-color)] text-[11px]">
                    Deny
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: DEMO WRAP-UP */}
          {currentStep === 8 && (
            <div className="space-y-4 text-center py-4 animate-in fade-in duration-200">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Guided Demo Complete</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                You have seen how Antigravity safeguards research with verifiable citations, transparent provenance, and explicit user control.
              </p>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 transition-all"
                >
                  Exit Demo &amp; Start Exploring
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/50 flex items-center justify-between">
          <button
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Previous Step
          </button>

          <span className="text-[11px] font-medium text-[var(--text-muted)]">
            Step {currentStep} / {totalSteps}
          </span>

          <button
            onClick={() => setCurrentStep((prev) => Math.min(totalSteps, prev + 1))}
            disabled={currentStep === totalSteps}
            className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5 transition-all shadow-xs"
          >
            Next Step <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
