"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  Search,
  Microscope,
  BookOpen,
  Bell,
  Monitor,
  MessageSquareText,
  Layers,
  CornerDownLeft
} from "lucide-react";
import { clsx } from "clsx";

interface UniversalCommandProps {
  onExecuteQuery?: (query: string, workflow: string) => void;
}

export function UniversalCommand({ onExecuteQuery }: UniversalCommandProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [detectedWorkflow, setDetectedWorkflow] = useState<string | null>(null);

  // Intent classification based on natural keywords
  const detectIntent = (text: string) => {
    const lower = text.toLowerCase();
    if (!text.trim()) return null;

    if (lower.startsWith("research") || lower.includes("deep research") || lower.includes("study") || lower.includes("investigate")) {
      return {
        id: "research",
        label: "Deep Academic Research Studio",
        icon: Microscope,
        color: "text-cyan-400",
        badge: "Deep Research",
        route: `/research?topic=${encodeURIComponent(text.replace(/^research\s+/i, ""))}`
      };
    }
    if (lower.includes("find new papers") || lower.includes("search papers") || lower.includes("look up papers")) {
      return {
        id: "alerts",
        label: "Scholarly Literature Retrieval",
        icon: Search,
        color: "text-blue-400",
        badge: "Literature Search",
        route: `/alerts?query=${encodeURIComponent(text.replace(/^(find new papers about|search papers for|look up papers on)\s+/i, ""))}`
      };
    }
    if (lower.startsWith("monitor") || lower.includes("track this topic") || lower.includes("alert me")) {
      return {
        id: "monitor",
        label: "Smart Research Alert Profile",
        icon: Bell,
        color: "text-violet-400",
        badge: "Continuous Monitor",
        route: `/alerts?new_topic=${encodeURIComponent(text.replace(/^monitor\s+/i, ""))}`
      };
    }
    if (lower.includes("saved papers") || lower.includes("library") || lower.includes("yesterday") || lower.includes("summarize my saved")) {
      return {
        id: "library",
        label: "Research Library & Saved Papers",
        icon: BookOpen,
        color: "text-amber-400",
        badge: "Library Explorer",
        route: `/library?filter=${encodeURIComponent(text)}`
      };
    }
    if (lower.includes("browser") || lower.includes("desktop") || lower.includes("click") || lower.includes("local file")) {
      return {
        id: "desktop",
        label: "Desktop Agent Automation",
        icon: Monitor,
        color: "text-emerald-400",
        badge: "Desktop Automation",
        route: `/desktop?task=${encodeURIComponent(text)}`
      };
    }
    if (lower.includes("compare") || lower.includes("summarize") || lower.includes("explain") || lower.includes("what is")) {
      return {
        id: "chat",
        label: "AI Synthesis & Comparison Chat",
        icon: MessageSquareText,
        color: "text-indigo-400",
        badge: "AI Conversation",
        route: `/chat?prompt=${encodeURIComponent(text)}`
      };
    }

    // Default: Chat synthesis
    return {
      id: "chat",
      label: "Conversational Research Assistant",
      icon: Sparkles,
      color: "text-cyan-400",
      badge: "General Research",
      route: `/chat?prompt=${encodeURIComponent(text)}`
    };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    const intent = detectIntent(val);
    setDetectedWorkflow(intent ? intent.label : null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const intent = detectIntent(query);
    if (!intent) return;

    if (onExecuteQuery) {
      onExecuteQuery(query, intent.id);
    } else {
      router.push(intent.route);
    }
  };

  const currentIntent = detectIntent(query);

  const samplePrompts = [
    { text: "Research AI applications in structural engineering", label: "Deep Research" },
    { text: "Find new papers about flood prediction", label: "Literature Search" },
    { text: "Summarize my saved papers", label: "Library" },
    { text: "Monitor this topic: Neural Radiance Fields", label: "Smart Monitor" },
    { text: "Start a browser research task on arXiv", label: "Desktop Agent" },
  ];

  return (
    <div className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-5 shadow-xl relative overflow-hidden">
      {/* Background glow accent */}
      <div className="absolute top-0 right-0 w-80 h-32 bg-cyan-500/10 blur-3xl pointer-events-none" />

      <form onSubmit={handleSubmit} className="relative z-10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse-subtle" />
            <span>Universal Research Orchestrator</span>
          </div>
          {currentIntent && query.trim().length > 2 && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px] font-semibold animate-in fade-in duration-150">
              <currentIntent.icon className={clsx("w-3 h-3", currentIntent.color)} />
              <span>Routing to: {currentIntent.badge}</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="relative flex items-center">
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder='Ask anything: "Research AI in flood prediction", "Find new papers", "Summarize library"...'
            className="w-full px-5 py-4 pr-32 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={!query.trim()}
            className={clsx(
              "absolute right-2 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md",
              query.trim()
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20 active:scale-95"
                : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border-color)]"
            )}
          >
            <span>Execute</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-0.5 no-scrollbar text-xs">
          <span className="text-[11px] text-[var(--text-muted)] shrink-0 font-medium">Quick Prompts:</span>
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuery(p.text);
                const intent = detectIntent(p.text);
                setDetectedWorkflow(intent ? intent.label : null);
              }}
              className="px-3 py-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-cyan-400 hover:border-cyan-500/30 shrink-0 transition-colors text-[11px] flex items-center gap-1.5"
            >
              <span>{p.text}</span>
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
