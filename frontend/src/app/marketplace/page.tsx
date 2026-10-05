"use client";

import React, { useState, useEffect } from "react";
import {
  Blocks,
  Check,
  Info,
  ShieldAlert,
  Search,
  SlidersHorizontal,
  Sparkles,
  ExternalLink,
  Shield,
  Key,
  Lock,
  Power,
  RefreshCw,
  X,
  AlertTriangle,
  Settings2
} from "lucide-react";
import { clsx } from "clsx";

const API_BASE = "http://localhost:8000/api/v1";

interface PluginManifest {
  id: number;
  slug: string;
  name: string;
  description: string;
  long_description?: string;
  version: string;
  author: string;
  category: string;
  icon_name?: string;
  capabilities_json: string[];
  config_schema_json?: Record<string, any>;
  data_access_description?: string;
  privacy_notes?: string;
  is_available: boolean;
  requires_api_key: boolean;
  is_built_in: boolean;
  availability_status: string;
  is_installed: boolean;
  is_enabled: boolean;
  has_config: boolean;
  config?: Record<string, any>;
  granted_capabilities?: string[];
}

export default function MarketplacePage() {
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlugin, setSelectedPlugin] = useState<PluginManifest | null>(null);
  const [configModalPlugin, setConfigModalPlugin] = useState<PluginManifest | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const categories = [
    "All",
    "Academic",
    "Web",
    "Productivity",
    "AI Models",
    "Voice",
    "Data",
    "Developer Tools"
  ];

  const fetchPlugins = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/plugins/marketplace`);
      if (res.ok) {
        const data = await res.json();
        setPlugins(data);
      }
    } catch (err) {
      console.warn("Could not fetch plugins from backend, using cached state:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlugins();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleInstall = async (plugin: PluginManifest) => {
    setActionLoading(plugin.slug);
    try {
      const res = await fetch(`${API_BASE}/plugins/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plugin_slug: plugin.slug })
      });
      if (res.ok) {
        showToast(`Plugin "${plugin.name}" installed successfully!`);
        await fetchPlugins();
      } else {
        const err = await res.json();
        showToast(`Failed: ${err.detail || "Could not install plugin"}`);
      }
    } catch (err) {
      showToast("Network error trying to install plugin.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUninstall = async (plugin: PluginManifest) => {
    setActionLoading(plugin.slug);
    try {
      const res = await fetch(`${API_BASE}/plugins/${plugin.slug}/uninstall`, {
        method: "DELETE"
      });
      if (res.ok) {
        showToast(`Plugin "${plugin.name}" disconnected and removed.`);
        await fetchPlugins();
        if (selectedPlugin?.slug === plugin.slug) {
          setSelectedPlugin(null);
        }
      }
    } catch (err) {
      showToast("Error uninstalling plugin.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggle = async (plugin: PluginManifest) => {
    setActionLoading(plugin.slug);
    try {
      const res = await fetch(`${API_BASE}/plugins/${plugin.slug}/toggle`, {
        method: "POST"
      });
      if (res.ok) {
        await fetchPlugins();
      }
    } catch (err) {
      showToast("Error toggling plugin state.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configModalPlugin) return;
    setActionLoading("config");
    try {
      const res = await fetch(`${API_BASE}/plugins/${configModalPlugin.slug}/configure`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: configValues })
      });
      if (res.ok) {
        showToast(`Configuration saved for ${configModalPlugin.name}`);
        setConfigModalPlugin(null);
        await fetchPlugins();
      } else {
        showToast("Failed to save configuration.");
      }
    } catch (err) {
      showToast("Error saving configuration.");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredPlugins = plugins.filter((p) => {
    const matchesCategory =
      activeCategory === "All" || p.category.toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-primary)] overflow-y-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 shadow-xl shadow-cyan-500/10 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="border-b border-[var(--border-color)] bg-gradient-to-r from-slate-900 via-[var(--bg-secondary)] to-slate-900 px-8 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-3">
              <Blocks className="w-3.5 h-3.5" />
              <span>Extensible Architecture • Phase 4</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Plugin Ecosystem & Marketplace
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1.5 max-w-2xl leading-relaxed">
              Connect curated scholarly databases, search tools, and workflow extensions. 
              All plugins run under capability-based permissions with explicit data boundaries.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchPlugins}
              className="px-3.5 py-2 rounded-xl text-xs font-medium bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2 transition-colors"
            >
              <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} />
              Refresh Catalogue
            </button>
          </div>
        </div>
      </div>

      {/* Search & Categories Bar */}
      <div className="max-w-6xl mx-auto w-full px-8 py-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
          {/* Search box */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search plugins, capabilities, authors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500/50 transition-all"
            />
          </div>

          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={clsx(
                  "px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                  activeCategory === cat
                    ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border border-transparent"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Plugin Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-56 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] animate-pulse"
              />
            ))}
          </div>
        ) : filteredPlugins.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)]/50">
            <Blocks className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-60" />
            <p className="text-base font-medium text-[var(--text-primary)]">No plugins match your filter</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Try another category or search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPlugins.map((plugin) => {
              const isAvailable = plugin.is_available;
              const isInstalled = plugin.is_installed;
              const isEnabled = plugin.is_enabled;

              return (
                <div
                  key={plugin.slug}
                  className={clsx(
                    "flex flex-col justify-between rounded-2xl p-5 border transition-all duration-200 relative group",
                    isInstalled
                      ? "bg-slate-900/60 border-cyan-500/30 shadow-lg shadow-cyan-500/5"
                      : "bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-[var(--border-color-hover)] hover:shadow-md"
                  )}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                          <Blocks className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-[var(--text-primary)] group-hover:text-cyan-400 transition-colors">
                            {plugin.name}
                          </h3>
                          <span className="text-[11px] text-[var(--text-muted)] font-mono">
                            v{plugin.version} • {plugin.author}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      {isInstalled ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <Check className="w-3 h-3" />
                          Installed
                        </span>
                      ) : !isAvailable ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Coming Soon
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          Available
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3 mb-4">
                      {plugin.description}
                    </p>

                    {/* Capabilities Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {plugin.capabilities_json?.map((cap) => (
                        <span
                          key={cap}
                          className="px-2 py-0.5 rounded-md text-[10px] bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-muted)] font-mono"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-3 border-t border-[var(--border-color)]/70 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedPlugin(plugin)}
                      className="text-xs text-[var(--text-muted)] hover:text-cyan-400 flex items-center gap-1 transition-colors"
                    >
                      <Info className="w-3.5 h-3.5" />
                      Details & Safety
                    </button>

                    <div className="flex items-center gap-2">
                      {isInstalled && (
                        <>
                          {plugin.config_schema_json && Object.keys(plugin.config_schema_json).length > 0 && (
                            <button
                              onClick={() => {
                                setConfigModalPlugin(plugin);
                                setConfigValues(plugin.config || {});
                              }}
                              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-cyan-400 hover:bg-[var(--bg-tertiary)] transition-colors"
                              title="Configure plugin settings"
                            >
                              <Settings2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleToggle(plugin)}
                            disabled={actionLoading === plugin.slug}
                            className={clsx(
                              "p-1.5 rounded-lg transition-colors",
                              isEnabled
                                ? "text-emerald-400 hover:bg-emerald-500/10"
                                : "text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
                            )}
                            title={isEnabled ? "Disable plugin" : "Enable plugin"}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {isInstalled ? (
                        <button
                          onClick={() => handleUninstall(plugin)}
                          disabled={actionLoading === plugin.slug}
                          className="px-3 py-1.5 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all"
                        >
                          Disconnect
                        </button>
                      ) : isAvailable ? (
                        <button
                          onClick={() => handleInstall(plugin)}
                          disabled={actionLoading === plugin.slug}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-sm shadow-cyan-500/20 transition-all"
                        >
                          Install
                        </button>
                      ) : (
                        <button
                          disabled
                          className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-color)] opacity-60 cursor-not-allowed"
                        >
                          Not Configured
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Details & Security Modal */}
      {selectedPlugin && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSelectedPlugin(null)}
              className="absolute top-5 right-5 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Blocks className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">{selectedPlugin.name}</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Category: {selectedPlugin.category} • Author: {selectedPlugin.author} • v{selectedPlugin.version}
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-[var(--text-secondary)]">
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] text-xs uppercase tracking-wider mb-1">
                  What It Does
                </h4>
                <p className="leading-relaxed bg-[var(--bg-tertiary)] p-3 rounded-xl border border-[var(--border-color)]">
                  {selectedPlugin.long_description || selectedPlugin.description}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-[var(--text-primary)] text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  What Data It Can Access
                </h4>
                <p className="leading-relaxed bg-[var(--bg-tertiary)] p-3 rounded-xl border border-[var(--border-color)]">
                  {selectedPlugin.data_access_description || "Public metadata queries only. No personal data transmitted."}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-[var(--text-primary)] text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-400" />
                  Privacy & Data Handling
                </h4>
                <p className="leading-relaxed bg-[var(--bg-tertiary)] p-3 rounded-xl border border-[var(--border-color)]">
                  {selectedPlugin.privacy_notes || "No user session information or tokens are logged."}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-[var(--text-primary)] text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  Required Capabilities
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedPlugin.capabilities_json?.map((cap) => (
                    <span
                      key={cap}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono text-[11px]"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                <span className="text-[11px] text-[var(--text-muted)]">
                  Status: <strong className="text-cyan-400 uppercase">{selectedPlugin.availability_status}</strong>
                </span>

                {selectedPlugin.is_installed ? (
                  <button
                    onClick={() => handleUninstall(selectedPlugin)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-all"
                  >
                    Disconnect & Revoke
                  </button>
                ) : selectedPlugin.is_available ? (
                  <button
                    onClick={() => {
                      handleInstall(selectedPlugin);
                      setSelectedPlugin(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white shadow-md shadow-cyan-500/20 transition-all"
                  >
                    Install Plugin
                  </button>
                ) : (
                  <span className="text-xs text-amber-400 font-medium">Not currently installable</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      {configModalPlugin && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setConfigModalPlugin(null)}
              className="absolute top-5 right-5 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
              Configure {configModalPlugin.name}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Credentials are stored securely on the server and are never returned in clear text.
            </p>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              {configModalPlugin.config_schema_json &&
                Object.entries(configModalPlugin.config_schema_json).map(([fieldKey, fieldDef]: [string, any]) => (
                  <div key={fieldKey}>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      {fieldDef.label || fieldKey} {fieldDef.required && <span className="text-rose-400">*</span>}
                    </label>
                    <input
                      type={fieldDef.secret ? "password" : "text"}
                      placeholder={fieldDef.help || `Enter ${fieldKey}`}
                      value={configValues[fieldKey] || ""}
                      onChange={(e) => setConfigValues({ ...configValues, [fieldKey]: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500/50"
                    />
                    {fieldDef.help && (
                      <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                        {fieldDef.help}
                      </span>
                    )}
                  </div>
                ))}

              <div className="pt-3 flex justify-end gap-2 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setConfigModalPlugin(null)}
                  className="px-3.5 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === "config"}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 text-white hover:bg-cyan-400 shadow-md shadow-cyan-500/20"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
