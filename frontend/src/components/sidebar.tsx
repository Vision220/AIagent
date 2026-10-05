"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquareText,
  Microscope,
  BookOpen,
  BellRing,
  Blocks,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Cpu,
  Mic,
  Activity,
  Monitor
} from "lucide-react";
import { clsx } from "clsx";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const navItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      name: "AI Chat",
      href: "/chat",
      icon: MessageSquareText,
      badge: "Gemini 2.0",
    },
    {
      name: "Deep Research",
      href: "/research",
      icon: Microscope,
      badge: "Pro",
    },
    {
      name: "Research Library",
      href: "/library",
      icon: BookOpen,
    },
    {
      name: "Research Alerts",
      href: "/alerts",
      icon: BellRing,
    },
    {
      name: "Plugins",
      href: "/marketplace",
      icon: Blocks,
    },
    {
      name: "AI Models",
      href: "/providers",
      icon: Cpu,
    },
    {
      name: "Voice",
      href: "/voice",
      icon: Mic,
    },
    {
      name: "Desktop Agent",
      href: "/desktop",
      icon: Monitor,
      badge: "Local",
    },
    {
      name: "Activity",
      href: "/activity",
      icon: Activity,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ];

  return (
    <aside
      className={clsx(
        "relative flex flex-col border-r transition-all duration-300 z-30 select-none",
        "bg-[var(--bg-secondary)] border-[var(--border-color)]",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--border-color)]">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-violet-600 text-white shadow-lg shadow-cyan-500/20 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse-subtle" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                Antigravity AI
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-medium tracking-wide uppercase">
                Research Studio v1.0
              </span>
            </div>
          )}
        </Link>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label="Toggle sidebar collapse"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-transparent text-[var(--accent-cyan)] border-l-4 border-[var(--accent-cyan)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
              )}
            >
              <Icon
                className={clsx(
                  "w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                  isActive ? "text-[var(--accent-cyan)]" : "text-[var(--text-muted)]"
                )}
              />

              {!collapsed && (
                <span className="truncate flex-1">{item.name}</span>
              )}

              {!collapsed && item.badge && (
                <span
                  className={clsx(
                    "px-2 py-0.5 text-[10px] font-semibold rounded-full tracking-wide shrink-0",
                    item.badge.includes("New")
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer System Status */}
      <div className="p-3 border-t border-[var(--border-color)]">
        {!collapsed ? (
          <div className="p-3 rounded-xl bg-[var(--bg-tertiary)]/60 border border-[var(--border-color)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Gemini Provider
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  Server Active
                </span>
              </div>
            </div>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
        ) : (
          <div className="flex justify-center py-2" title="System Online">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
