"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  Sparkles,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  Zap,
  BookOpen,
  MessageSquare,
  HelpCircle,
  Eye,
  EyeOff,
  Trash2,
  Activity
} from "lucide-react";
import { clsx } from "clsx";

const API_BASE = "http://localhost:8000/api/v1";

interface ProviderModel {
  id: string;
  name: string;
  roles: string[];
  context_length: string;
  description: string;
  speed: string;
  cost: string;
}

interface Provider {
  slug: string;
  name: string;
  description: string;
  website: string;
  requires_api_key: boolean;
  models: ProviderModel[];
  is_configured: boolean;
  user_configured?: boolean;
  user_enabled?: boolean;
  availability_status?: string;
  implementation_note?: string;
}

interface RouteConfig {
  auto_route_enabled: boolean;
  routes: {
    chat: string;
    research: string;
    summarization: string;
    fast: string;
    reasoning: string;
  };
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [routeConfig, setRouteConfig] = useState<RouteConfig>({
    auto_route_enabled: true,
    routes: {
      chat: "gemini:gemini-1.5-flash",
      research: "gemini:gemini-1.5-pro",
      summarization: "gemini:gemini-1.5-flash",
      fast: "gemini:gemini-1.5-flash",
      reasoning: "gemini:gemini-1.5-pro"
    }
  });

  const [loading, setLoading] = useState(true);
  const [keyModalProvider, setKeyModalProvider] = useState<Provider | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingSlug, setTestingSlug] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ slug: string; success: boolean; message: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, rRes] = await Promise.all([
        fetch(`${API_BASE}/providers/`),
        fetch(`${API_BASE}/providers/routes`)
      ]);
      if (pRes.ok) {
        setProviders(await pRes.json());
      }
      if (rRes.ok) {
        setRouteConfig(await rRes.json());
      }
    } catch (err) {
      console.warn("Could not fetch provider configuration:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyModalProvider) return;
    try {
      const res = await fetch(`${API_BASE}/providers/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_slug: keyModalProvider.slug,
          api_key: apiKeyInput,
          is_enabled: true
        })
      });
      if (res.ok) {
        showToast(`API Key saved securely for ${keyModalProvider.name}`);
        setKeyModalProvider(null);
        setApiKeyInput("");
        await fetchData();
      } else {
        showToast("Failed to save credentials.");
      }
    } catch (err) {
      showToast("Error communicating with server.");
    }
  };

  const handleTestProvider = async (slug: string) => {
    setTestingSlug(slug);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/providers/test/${slug}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setTestResult({
          slug,
          success: data.available,
          message: data.message
        });
      }
    } catch (err) {
      setTestResult({
        slug,
        success: false,
        message: "Failed to ping provider API."
      });
    } finally {
      setTestingSlug(null);
    }
  };

  const handleUpdateRoutes = async (updatedRoutes: RouteConfig["routes"], autoRoute: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/providers/routes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_model: updatedRoutes.chat,
          research_model: updatedRoutes.research,
          summarization_model: updatedRoutes.summarization,
          fast_model: updatedRoutes.fast,
          reasoning_model: updatedRoutes.reasoning,
          auto_route_enabled: autoRoute
        })
      });
      if (res.ok) {
        showToast("Model routing preferences updated!");
        setRouteConfig({ auto_route_enabled: autoRoute, routes: updatedRoutes });
      }
    } catch (err) {
      showToast("Error updating routing preferences.");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-primary)] overflow-y-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 shadow-xl shadow-cyan-500/10 text-sm flex items-center gap-3 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="border-b border-[var(--border-color)] bg-gradient-to-r from-slate-900 via-[var(--bg-secondary)] to-slate-900 px-8 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-3">
              <Cpu className="w-3.5 h-3.5" />
              <span>Multi-Model AI Infrastructure</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              AI Providers & Model Routing
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1.5 max-w-2xl leading-relaxed">
              Configure foundation models across Google Gemini, OpenAI, and Anthropic. 
              Assign dedicated models to research planning, conversational synthesis, and fast extraction.
            </p>
          </div>

          <button
            onClick={fetchData}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2 transition-colors self-start md:self-auto"
          >
            <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} />
            Sync Status
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-8 py-8 space-y-10">
        {/* Model Routing Section */}
        <section className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border-color)]">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                Task-Based Model Routing
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Route queries to the best model automatically or manually override per task role.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Auto-Routing:</span>
              <button
                onClick={() => handleUpdateRoutes(routeConfig.routes, !routeConfig.auto_route_enabled)}
                className={clsx(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  routeConfig.auto_route_enabled ? "bg-cyan-500" : "bg-slate-700"
                )}
              >
                <span
                  className={clsx(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    routeConfig.auto_route_enabled ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
            {/* Chat Role */}
            <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] mb-1">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                Conversational Chat Model
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mb-3">General dialogue and Q&A interaction.</p>
              <select
                disabled={routeConfig.auto_route_enabled}
                value={routeConfig.routes.chat}
                onChange={(e) =>
                  handleUpdateRoutes(
                    { ...routeConfig.routes, chat: e.target.value },
                    routeConfig.auto_route_enabled
                  )
                }
                className="w-full text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] disabled:opacity-60"
              >
                <option value="gemini:gemini-1.5-flash">Gemini 1.5 Flash (Fast, Efficient)</option>
                <option value="gemini:gemini-2.0-flash">Gemini 2.0 Flash (Next-gen)</option>
                <option value="gemini:gemini-1.5-pro">Gemini 1.5 Pro (Deep)</option>
              </select>
            </div>

            {/* Research Role */}
            <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] mb-1">
                <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                Deep Research & Synthesis
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mb-3">Multi-paper correlation and analysis.</p>
              <select
                disabled={routeConfig.auto_route_enabled}
                value={routeConfig.routes.research}
                onChange={(e) =>
                  handleUpdateRoutes(
                    { ...routeConfig.routes, research: e.target.value },
                    routeConfig.auto_route_enabled
                  )
                }
                className="w-full text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] disabled:opacity-60"
              >
                <option value="gemini:gemini-1.5-pro">Gemini 1.5 Pro (2M token context)</option>
                <option value="gemini:gemini-2.0-flash">Gemini 2.0 Flash</option>
              </select>
            </div>

            {/* Fast/Summarization Role */}
            <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Fast Summarization
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mb-3">Quick abstract extraction and highlights.</p>
              <select
                disabled={routeConfig.auto_route_enabled}
                value={routeConfig.routes.summarization}
                onChange={(e) =>
                  handleUpdateRoutes(
                    { ...routeConfig.routes, summarization: e.target.value },
                    routeConfig.auto_route_enabled
                  )
                }
                className="w-full text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] disabled:opacity-60"
              >
                <option value="gemini:gemini-1.5-flash">Gemini 1.5 Flash</option>
                <option value="gemini:gemini-2.0-flash">Gemini 2.0 Flash</option>
              </select>
            </div>
          </div>
        </section>

        {/* Providers Catalogue Grid */}
        <section>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            Configured AI Model Providers
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {providers.map((p) => {
              const isReady = p.is_configured || p.user_configured;
              return (
                <div
                  key={p.slug}
                  className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-bold text-base text-[var(--text-primary)]">{p.name}</h3>
                        <p className="text-xs text-[var(--text-muted)]">{p.description}</p>
                      </div>

                      {isReady ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {p.implementation_note ? "Not Implemented" : "Key Needed"}
                        </span>
                      )}
                    </div>

                    {/* Models list */}
                    <div className="space-y-2 my-4">
                      {p.models.map((m) => (
                        <div
                          key={m.id}
                          className="p-2.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]/60 text-xs flex items-center justify-between"
                        >
                          <div>
                            <span className="font-medium text-[var(--text-primary)]">{m.name}</span>
                            <span className="text-[10px] text-[var(--text-muted)] ml-2">({m.context_length})</span>
                          </div>
                          <div className="flex gap-1">
                            {m.roles.map((r) => (
                              <span
                                key={r}
                                className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-cyan-300 font-mono"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {p.implementation_note && (
                      <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300/80 mb-4">
                        {p.implementation_note}
                      </div>
                    )}

                    {/* Test result message */}
                    {testResult && testResult.slug === p.slug && (
                      <div
                        className={clsx(
                          "p-3 rounded-xl text-xs mb-4 flex items-center gap-2",
                          testResult.success
                            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                            : "bg-rose-500/10 border border-rose-500/20 text-rose-300"
                        )}
                      >
                        {testResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <span>{testResult.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                    <button
                      onClick={() => handleTestProvider(p.slug)}
                      disabled={testingSlug === p.slug}
                      className="text-xs text-[var(--text-muted)] hover:text-cyan-400 flex items-center gap-1.5 transition-colors"
                    >
                      <Activity className={clsx("w-3.5 h-3.5", testingSlug === p.slug && "animate-spin")} />
                      Test Connectivity
                    </button>

                    <button
                      onClick={() => setKeyModalProvider(p)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-[var(--bg-tertiary)] hover:bg-cyan-500/15 text-[var(--text-primary)] hover:text-cyan-400 border border-[var(--border-color)] transition-all flex items-center gap-1.5"
                    >
                      <Key className="w-3.5 h-3.5" />
                      Configure Key
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* API Key Modal */}
      {keyModalProvider && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
              Configure {keyModalProvider.name} Credentials
            </h3>
            <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">
              API credentials are encrypted and stored securely on your server. Keys are NEVER exposed to the client or returned in API responses.
            </p>

            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  {keyModalProvider.name} API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    required
                    placeholder="Enter API key..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full px-3.5 pr-10 py-2.5 text-xs rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500/50 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setKeyModalProvider(null)}
                  className="px-3.5 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 text-white hover:bg-cyan-400 shadow-md shadow-cyan-500/20"
                >
                  Save Credential
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
