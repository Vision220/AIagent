"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "./theme-provider";
import {
  Search,
  Sun,
  Moon,
  Bell,
  Key,
  LogOut,
  Sparkles,
  SlidersHorizontal,
  BellRing,
  BookOpen
} from "lucide-react";

import { API_BASE as API } from "@/lib/api-config";

import { clsx } from "clsx";

interface AlertItem {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  relevance_category?: string;
  created_at: string;
}

import { SystemStatusModal } from "./system-status-modal";
import { GuidedDemoModal } from "./guided-demo-modal";
import { OnboardingWizard } from "./onboarding-wizard";

interface HeaderProps {
  onOpenSearch: () => void;
}

export function Header({ onOpenSearch }: HeaderProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSystemStatus, setShowSystemStatus] = useState(false);
  const [showGuidedDemo, setShowGuidedDemo] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentAlerts, setRecentAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    // Check demo mode state
    const savedDemo = localStorage.getItem("antigravity_demo_mode");
    if (savedDemo === "true") setIsDemoMode(true);

    // Fetch real unread count & top 3 alerts
    const load = async () => {
      try {
        const [countRes, alertsRes] = await Promise.all([
          fetch(`${API}/alerts/unread-count`),
          fetch(`${API}/alerts/?limit=3`),
        ]);
        if (countRes.ok) {
          const d = await countRes.json();
          setUnreadCount(d.unread_count ?? 0);
        }
        if (alertsRes.ok) {
          setRecentAlerts(await alertsRes.json());
        }
      } catch {
        // Backend offline — silently hide badge
      }
    };
    load();
  }, []);

  const toggleDemoMode = () => {
    const nextVal = !isDemoMode;
    setIsDemoMode(nextVal);
    localStorage.setItem("antigravity_demo_mode", String(nextVal));
    window.dispatchEvent(new Event("antigravity-demo-mode-changed"));
  };

  // Format title from pathname
  const getTitle = () => {
    switch (pathname) {
      case "/":
        return "Command Center & Overview";
      case "/chat":
        return "AI Conversation & Synthesis";
      case "/research":
        return "Deep Academic Research Studio";
      case "/library":
        return "Saved Papers & Library";
      case "/alerts":
        return "Publication Alerts & Monitoring";
      case "/marketplace":
        return "Plugin Marketplace";
      case "/providers":
        return "AI Models & Multi-Provider";
      case "/voice":
        return "Voice Studio";
      case "/desktop":
        return "Desktop Agent Companion";
      case "/activity":
        return "Activity & Audit Log";
      case "/settings":
        return "Settings & Preferences";
      default:
        return "Research Platform";
    }
  };

  return (
    <>
      <header className="h-16 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
        {/* Title / Breadcrumb / Status Badge */}
        <div className="flex items-center gap-3">
          <h1 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight truncate max-w-[200px] sm:max-w-none">
            {getTitle()}
          </h1>
          <button
            onClick={() => setShowSystemStatus(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            title="Click to view detailed system health diagnostics"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Online (v1.0.0)</span>
          </button>

          {isDemoMode && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              DEMO MODE
            </span>
          )}
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Demo Mode Toggle */}
          <button
            onClick={toggleDemoMode}
            className={clsx(
              "hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all",
              isDemoMode
                ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                : "bg-[var(--bg-tertiary)]/60 border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
            title="Toggle deterministic presentation Demo Mode"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isDemoMode ? "Exit Demo" : "Demo Mode"}</span>
          </button>

          {/* Guided Demo Button */}
          <button
            onClick={() => setShowGuidedDemo(true)}
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)]/60 text-xs font-semibold text-[var(--text-secondary)] hover:text-cyan-400 hover:border-cyan-500/30 transition-all"
            title="Launch interactive walkthrough tour"
          >
            <span>Guided Tour</span>
          </button>

          {/* Command Search Trigger */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)]/70 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-color-hover)] transition-all group"
            aria-label="Search papers and tools"
          >
            <Search className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="hidden md:inline text-xs font-medium">Search...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-muted)] bg-[var(--bg-primary)] rounded border border-[var(--border-color)] shadow-xs">
              Ctrl K
            </kbd>
          </button>

          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)]/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
            aria-label="Toggle dark/light theme"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400 animate-pulse-subtle" />
            ) : (
              <Moon className="w-4 h-4 text-violet-600" />
            )}
          </button>

          {/* Notifications Button & Popover */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)]/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors relative"
              title="Notifications"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <>
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 px-1 rounded-full bg-cyan-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                </>
              )}
            </button>

            {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                  <BellRing className="w-3.5 h-3.5 text-cyan-400" /> Notifications
                </span>
                {unreadCount > 0 && <span className="text-[10px] text-cyan-400 font-medium">{unreadCount} Unread</span>}
              </div>
              <div className="py-2 space-y-2.5">
                {recentAlerts.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-[var(--text-muted)]">No notifications yet.</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">Run a monitoring profile to start receiving alerts.</p>
                  </div>
                ) : (
                  recentAlerts.map((alert) => (
                    <a
                      key={alert.id}
                      href="/alerts"
                      onClick={() => setShowNotifications(false)}
                      className="flex gap-3 items-start p-2.5 rounded-xl bg-[var(--bg-tertiary)]/60 border border-[var(--border-color)] hover:border-cyan-500/30 transition-colors"
                    >
                      {alert.is_read ? (
                        <BookOpen className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[var(--text-primary)] line-clamp-1">{alert.title}</p>
                        <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 mt-0.5">{alert.message}</p>
                      </div>
                      {!alert.is_read && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />}
                    </a>
                  ))
                )}
              </div>
              <div className="pt-2 border-t border-[var(--border-color)]">
                <a
                  href="/alerts"
                  onClick={() => setShowNotifications(false)}
                  className="block text-center text-xs font-semibold text-cyan-400 hover:underline py-1"
                >
                  View all alerts →
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Profile Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)]/60 hover:border-[var(--border-color-hover)] transition-all"
            aria-label="User profile menu"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
              AR
            </div>
            <span className="hidden lg:inline text-xs font-semibold text-[var(--text-primary)]">
              Senior Researcher
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-3 py-2 border-b border-[var(--border-color)]">
                <p className="text-xs font-bold text-[var(--text-primary)]">Dr. Alex Rostova</p>
                <p className="text-[11px] text-[var(--text-muted)]">alex.rostova@lab.ai</p>
              </div>
              <div className="pt-2 space-y-1">
                <a
                  href="/settings"
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors"
                >
                  <Key className="w-3.5 h-3.5 text-cyan-400" />
                  API Keys & Models
                </a>
                <a
                  href="/settings"
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                  Preferences
                </a>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowOnboarding(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-cyan-400 hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors w-full text-left"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Product Setup Tour
                </button>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowSystemStatus(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-emerald-400 hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors w-full text-left"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  System Health Check
                </button>
                <div className="border-t border-[var(--border-color)] my-1"></div>
                <button
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>

    {/* Modals */}
    <SystemStatusModal
      isOpen={showSystemStatus}
      onClose={() => setShowSystemStatus(false)}
    />
    <GuidedDemoModal
      isOpen={showGuidedDemo}
      onClose={() => setShowGuidedDemo(false)}
    />
    <OnboardingWizard
      isOpen={showOnboarding}
      onClose={() => setShowOnboarding(false)}
      onComplete={() => setShowOnboarding(false)}
    />
  </>
  );
}
