"use client";

import React, { useState, useEffect } from "react";
import { Search, X, BookOpen, MessageSquare, Blocks, Settings, ArrowRight } from "lucide-react";
import Link from "next/link";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open search modal
          const btn = document.querySelector('button[aria-label="View notifications"]');
          // triggers open
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const mockIndex = [
    {
      type: "paper",
      title: "Quantum-Enhanced Neural Network Architectures for Scalable Language Models",
      subtitle: "Nature Quantum Information • 2025",
      href: "/library",
      icon: BookOpen,
      category: "Saved Paper"
    },
    {
      type: "paper",
      title: "Autonomous Multi-Agent Orchestration in Complex Scientific Workflows",
      subtitle: "IEEE Transactions on Autonomous Systems • 2025",
      href: "/library",
      icon: BookOpen,
      category: "Saved Paper"
    },
    {
      type: "chat",
      title: "Synthesis on Multi-Agent Autonomous Workflows",
      subtitle: "Recent Conversation • Gemini 1.5 Pro",
      href: "/chat",
      icon: MessageSquare,
      category: "AI Chat History"
    },
    {
      type: "plugin",
      title: "ArXiv Deep Indexer",
      subtitle: "Parses LaTeX sources & equations",
      href: "/marketplace",
      icon: Blocks,
      category: "Plugin"
    },
    {
      type: "settings",
      title: "Configure Gemini API Keys",
      subtitle: "Manage provider credentials and models",
      href: "/settings",
      icon: Settings,
      category: "System Setting"
    }
  ];

  const filtered = mockIndex.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Search Header Bar */}
        <div className="flex items-center px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] gap-3">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search papers, AI chats, tools, settings... (e.g., 'Quantum', 'API')"
            className="flex-1 bg-transparent border-none text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs font-semibold rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Esc
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filtered.length > 0 ? (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link
                  key={idx}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                      {item.category}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">
              No matching results found for &quot;{query}&quot;. Try searching for &quot;Quantum&quot; or &quot;API&quot;.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/50 flex justify-between text-[11px] text-[var(--text-muted)]">
          <span>Navigate with arrows</span>
          <span>Press <kbd className="px-1 rounded bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[10px]">Esc</kbd> to exit</span>
        </div>
      </div>
    </div>
  );
}
