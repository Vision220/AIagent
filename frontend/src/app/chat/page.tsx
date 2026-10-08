"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Paperclip,
  Mic,
  MicOff,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  FileText,
  BookOpen,
  ChevronRight,
  Plus,
  Trash2,
  ExternalLink,
  AlertCircle,
  RotateCcw,
  Cpu,
  Volume2,
  VolumeX,
  Key,
  X
} from "lucide-react";
import { clsx } from "clsx";
import { API_BASE, API_ROOT } from "@/lib/api-config";

interface Citation {
  id: number;
  title: string;
  authors: string;
  journal: string;
  year: number;
  url: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  timestamp: string;
  isError?: boolean;
  isApiKeyError?: boolean;
}

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  is_configured: boolean;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-1",
      role: "assistant",
      content:
        "Hello Dr. Rostova! I am your AI Research Assistant configured with **Gemini 1.5 Pro**. How can I assist your literature review, paper decomposition, or data synthesis today?",
      timestamp: "09:30 AM",
    },
    {
      id: "msg-2",
      role: "user",
      content:
        "Can you summarize recent breakthroughs in hybrid quantum-classical neural network architectures?",
      timestamp: "09:31 AM",
    },
    {
      id: "msg-3",
      role: "assistant",
      content: `Recent breakthroughs in **hybrid quantum-classical neural networks** focus on parameter efficiency and latency reduction in large model inference.

### Key Breakthroughs:

1. **Variational Quantum Layer Integration**
   Hybrid architectures introduce parameterized quantum circuits (PQCs) into standard transformer blocks. This enables logarithmic parameter scaling:
\`\`\`python
# Example: Quantum Attention Layer Stub
import torch
import pennylane as qml

def quantum_attention(x):
    # Map classical hidden states to quantum Hilbert space
    q_device = qml.device("default.qubit", wires=4)
    @qml.qnode(q_device)
    def circuit(weights):
        qml.BasicEntanglerLayers(weights, wires=range(4))
        return [qml.expval(qml.PauliZ(i)) for i in range(4)]
    return circuit(x)
\`\`\`

2. **Graph-Augmented RAG Accuracy**
   By coupling structured knowledge graph embeddings with quantum feature maps, factual recall on PubMed literature improved by **38.4%**.

*Sources analyzed from your saved library:*`,
      citations: [
        {
          id: 1,
          title: "Quantum-Enhanced Neural Network Architectures for Scalable Language Models",
          authors: "Dr. Elena Rostova, Prof. Marcus Vance",
          journal: "Nature Quantum Information",
          year: 2025,
          url: "https://arxiv.org/abs/2501.08912",
        },
        {
          id: 2,
          title: "Autonomous Multi-Agent Orchestration in Scientific Workflows",
          authors: "Sarah Jenkins, Dr. Hiroshi Tanaka",
          journal: "IEEE Transactions on Autonomous Systems",
          year: 2025,
          url: "https://ieee.org/document/984210",
        },
      ],
      timestamp: "09:32 AM",
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-1.5-pro");
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [isDeepResearch, setIsDeepResearch] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [lastPrompt, setLastPrompt] = useState("");
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [quickApiKey, setQuickApiKey] = useState("");
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Web Speech API Voice Dictation
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isVoiceActive) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          const current = event.results[event.results.length - 1][0].transcript;
          setInputPrompt((prev) => (prev ? `${prev} ${current}` : current));
        };

        recognition.onerror = () => setIsVoiceActive(false);
        recognition.onend = () => setIsVoiceActive(false);

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        setIsVoiceActive(false);
      }
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, [isVoiceActive]);

  // Text to speech playback
  const toggleSpeechForMessage = (msgId: string, content: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanContent = content.replace(/[*_#`[\]()]/g, " ").replace(/\s+/g, " ");
    const utterance = new SpeechSynthesisUtterance(cleanContent);
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    setSpeakingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    // Check local API key or demo mode
    const localKey = typeof window !== "undefined" ? localStorage.getItem("antigravity_gemini_api_key") : null;
    const isDemo = typeof window !== "undefined" ? localStorage.getItem("antigravity_demo_mode") === "true" : false;
    setIsDemoMode(isDemo);

    const onDemoChanged = () => {
      if (typeof window !== "undefined") {
        setIsDemoMode(localStorage.getItem("antigravity_demo_mode") === "true");
      }
    };
    window.addEventListener("antigravity-demo-mode-changed", onDemoChanged);

    // Fetch available and configured models from backend
    fetch(`${API_BASE}/settings/models`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const updated = data.map((m) => {
            if (localKey && m.provider === "google") {
              return { ...m, is_configured: true };
            }
            return m;
          });
          setAvailableModels(updated);
          const geminiConfigured = updated.some((m) => m.provider === "google" && m.is_configured);
          setApiKeyMissing(!geminiConfigured);
        }
      })
      .catch(() => {
        // Fallback default list
        const configuredLocally = Boolean(localKey);
        setAvailableModels([
          { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "google", is_configured: configuredLocally },
          { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "google", is_configured: configuredLocally },
          { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "google", is_configured: configuredLocally },
        ]);
        setApiKeyMissing(!configuredLocally);
      });

    return () => {
      window.removeEventListener("antigravity-demo-mode-changed", onDemoChanged);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleEnableDemoAndAnswer = (promptToRun?: string) => {
    localStorage.setItem("antigravity_demo_mode", "true");
    setIsDemoMode(true);
    setApiKeyMissing(false);
    window.dispatchEvent(new Event("antigravity-demo-mode-changed"));
    const target = promptToRun || lastPrompt || "Hello";
    setTimeout(() => {
      handleSendMessage(target);
    }, 50);
  };

  const handleSaveQuickApiKey = async (promptToRun?: string, keyToSave?: string) => {
    const key = (keyToSave || quickApiKey).trim();
    if (!key) return;

    localStorage.setItem("antigravity_gemini_api_key", key);
    setApiKeyMissing(false);
    setIsKeyModalOpen(false);

    // Synchronize to backend
    fetch(`${API_BASE}/settings/api-keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gemini_api_key: key }),
    }).catch(() => {});

    // Update models configured status
    setAvailableModels((prev) =>
      prev.map((m) => (m.provider === "google" ? { ...m, is_configured: true } : m))
    );

    const target = promptToRun || lastPrompt;
    if (target) {
      setTimeout(() => {
        handleSendMessage(target);
      }, 50);
    }
  };

  const handleSendMessage = async (promptToSend?: string) => {
    const text = promptToSend || inputPrompt;
    if (!text.trim() && attachedFiles.length === 0) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLastPrompt(text);
    if (!promptToSend) setInputPrompt("");
    setAttachedFiles([]);
    setIsStreaming(true);

    const localApiKey = typeof window !== "undefined" ? localStorage.getItem("antigravity_gemini_api_key") : null;
    const currentDemoMode = typeof window !== "undefined" ? localStorage.getItem("antigravity_demo_mode") === "true" : false;

    // Handle interactive Demo Mode synthesis without requiring live backend / API keys
    if (currentDemoMode) {
      const assistantMsgId = `msg-${Date.now() + 1}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: "",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);

      const lower = text.toLowerCase().trim();
      let demoResponse = "";

      if (lower.includes("hey") || lower.includes("hi") || lower.includes("hello") || lower.includes("bro") || lower.includes("sup")) {
        demoResponse = `Hey bro! 👋 Welcome to **Antigravity AI Research Studio**!\n\nI'm your autonomous academic research assistant running in **Demo Mode**.\n\nHere's what I can do for you right now:\n- 🔬 **Deep Literature Synthesis**: Query arXiv, OpenAlex, Semantic Scholar & CrossRef simultaneously.\n- 📄 **Paper Analysis & Decomposition**: Extract methodology, datasets, benchmarks, and research gaps.\n- 🧠 **Multi-Turn Reasoning**: Brainstorm hypotheses, compare algorithms, and evaluate literature.\n- 📊 **Citation Graphs**: Map evidence and verify claims against published DOIs.\n\nTry asking me something like:\n- *"What are the latest advances in Quantum Neural Topologies?"*\n- *"Compare LoRA vs QLoRA fine-tuning benchmarks"*\n- *"Explain Graph-RAG citation synthesis"*\n\n*(To connect live Google Gemini 1.5 Pro / 2.0 streaming, you can paste an API key at any time using the banner above!)*`;
      } else {
        demoResponse = `**[Demo Mode Synthesis]**\n\n### Scientific Synthesis for: "${text}"\n\n1. **Theoretical Foundations**: Recent literature highlights the convergence of multi-modal dense representations and retrieval-augmented verification for complex scientific reasoning.\n2. **Empirical Benchmarks**: Peer-reviewed studies demonstrate superior Pareto efficiency (24–38% latency reduction) when cross-referencing arXiv preprint embeddings with Semantic Scholar citation graphs.\n3. **Methodological Next Steps**: Formulate empirical sub-queries, extract verified benchmark baselines, and cross-validate against published datasets.\n\n*Would you like me to generate related paper citations, inspect experimental methodology, or outline an implementation vector?*`;
      }

      let currentText = "";
      const chunks = demoResponse.split(" ");
      for (let i = 0; i < chunks.length; i++) {
        currentText += (i === 0 ? "" : " ") + chunks[i];
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: currentText } : msg
          )
        );
        await new Promise((r) => setTimeout(r, 16));
      }
      setIsStreaming(false);
      return;
    }

    // Build history from previous turns
    const historyPayload = messages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await fetch(`${API_BASE}/conversations/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          model_name: selectedModel,
          deep_research_mode: isDeepResearch,
          history: historyPayload,
          api_key: localApiKey || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      const assistantMsgId = `msg-${Date.now() + 1}`;

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: "",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunkStr = decoder.decode(value);
          const lines = chunkStr.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.replace("data: ", "").trim();
              if (dataStr === "[DONE]") break;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.error) {
                  const isMissingKey =
                    parsed.message?.toLowerCase().includes("not configured") ||
                    parsed.message?.toLowerCase().includes("please add your key");
                  if (isMissingKey) {
                    setApiKeyMissing(true);
                  }
                  assistantText = parsed.message;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMsgId
                        ? {
                            ...msg,
                            content: assistantText,
                            isApiKeyError: isMissingKey,
                            isError: !isMissingKey,
                          }
                        : msg
                    )
                  );
                } else if (parsed.chunk) {
                  assistantText += parsed.chunk;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMsgId ? { ...msg, content: assistantText } : msg
                    )
                  );
                }
              } catch (err) {
                let cleanStr = dataStr;
                try {
                  const match = dataStr.match(/"message":\s*"([^"]+)"/);
                  if (match && match[1]) {
                    cleanStr = match[1];
                  }
                } catch {}
                assistantText += cleanStr;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId ? { ...msg, content: assistantText } : msg
                  )
                );
              }
            }
          }
        }
      }
    } catch (error: any) {
      const fallbackMsgId = `msg-${Date.now() + 1}`;
      const isFetchError = error.message?.toLowerCase().includes("fetch");
      const diagnosis = isFetchError
        ? `**Backend Unreachable (${API_ROOT})**\n\n1. **Render Free Tier Cold Start**: Free Render web instances sleep after inactivity and can take 40–60 seconds to spin up on initial request.\n2. **Gemini API Key**: Make sure your key is saved in **Settings** or set as \`GEMINI_API_KEY\` in your deployment environment.\n3. **Quick Demo**: Click the **Demo Mode** button in the top navigation bar to test the studio without waiting.`
        : `Please ensure your Gemini API Key is configured in Settings and your backend is reachable.`;

      setMessages((prev) => [
        ...prev,
        {
          id: fallbackMsgId,
          role: "assistant",
          content: `Unable to connect to AI server: ${error.message}.\n\n${diagnosis}`,
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const names = Array.from(e.target.files).map((f) => f.name);
      setAttachedFiles((prev) => [...prev, ...names]);
    }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-6 max-w-7xl mx-auto">
      {/* Left Chat History Drawer */}
      <div className="hidden lg:flex flex-col w-64 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] p-4 space-y-4 shrink-0">
        <button
          onClick={() =>
            setMessages([
              {
                id: `msg-${Date.now()}`,
                role: "assistant",
                content: "New conversation initiated. What scientific topic would you like to explore?",
                timestamp: "Just now",
              },
            ])
          }
          className="w-full py-2.5 px-4 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-semibold text-xs border border-cyan-500/20 flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Conversation
        </button>

        <div className="flex-1 space-y-2 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-2">
            History
          </p>
          {[
            "Quantum Neural Topologies",
            "Biomedical RAG Evaluation",
            "Agentic AI Permissions",
            "Graph-RAG Citation Graph",
          ].map((title, i) => (
            <button
              key={i}
              className={clsx(
                "w-full text-left p-2.5 rounded-xl text-xs font-medium truncate transition-colors flex items-center justify-between group",
                i === 0
                  ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              )}
            >
              <span className="truncate">{title}</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-cyan-400 transition-opacity" />
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] overflow-hidden">
        {/* Chat Control Header */}
        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white">
              <Sparkles className="w-4 h-4 animate-pulse-subtle" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">AI Research Assistant</h2>
              <p className="text-[10px] text-[var(--text-muted)]">Source-Backed Synthesis &amp; Code Analysis</p>
            </div>
          </div>

          {/* Model Selector & Deep Research Toggle */}
          <div className="flex items-center gap-3">
            {/* Model Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-[var(--bg-tertiary)] px-2.5 py-1.5 rounded-xl border border-[var(--border-color)] text-xs">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-transparent text-xs font-medium text-[var(--text-primary)] focus:outline-none cursor-pointer"
              >
                {availableModels.length > 0 ? (
                  availableModels.map((m) => (
                    <option key={m.id} value={m.id} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                      {m.name} {!m.is_configured ? "(Unconfigured)" : ""}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  </>
                )}
              </select>
            </div>

            {/* Deep Research Mode Toggle */}
            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] cursor-pointer select-none">
              <span className={clsx(isDeepResearch ? "text-cyan-400" : "text-[var(--text-muted)]")}>
                Deep Research
              </span>
              <input
                type="checkbox"
                checked={isDeepResearch}
                onChange={(e) => setIsDeepResearch(e.target.checked)}
                className="sr-only"
              />
              <div
                className={clsx(
                  "w-10 h-5 rounded-full transition-colors relative p-0.5",
                  isDeepResearch ? "bg-gradient-to-r from-cyan-500 to-blue-600" : "bg-[var(--bg-tertiary)]"
                )}
              >
                <div
                  className={clsx(
                    "w-4 h-4 rounded-full bg-white transition-transform shadow-xs",
                    isDeepResearch ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </div>
            </label>
          </div>
        </div>

        {/* API Key Missing Setup Warning Banner */}
        {apiKeyMissing && (
          <div className="p-3 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-300 px-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Gemini API Key is not configured. Real AI generation requires an active key.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEnableDemoAndAnswer(lastPrompt)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-200 text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Enable Demo Mode
              </button>
              <button
                onClick={() => setIsKeyModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1"
              >
                <Key className="w-3 h-3" /> Enter Key
              </button>
              <a href="/settings" className="font-bold underline hover:text-amber-200 text-[11px]">
                Settings &rarr;
              </a>
            </div>
          </div>
        )}

        {/* Messages Stream Viewport */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={clsx(
                "flex gap-4 max-w-4xl",
                msg.role === "user" ? "ml-auto flex-row-reverse" : ""
              )}
            >
              {/* Avatar */}
              <div
                className={clsx(
                  "w-8 h-8 rounded-2xl flex items-center justify-center text-xs font-bold shrink-0",
                  msg.role === "assistant"
                    ? "bg-gradient-to-tr from-cyan-500 via-blue-600 to-violet-600 text-white shadow-md shadow-cyan-500/20"
                    : "bg-slate-700 text-slate-200"
                )}
              >
                {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              {/* Message Content Bubble */}
              <div className="space-y-3 min-w-0">
                <div
                  className={clsx(
                    "p-4 rounded-3xl text-sm leading-relaxed",
                    msg.isError
                      ? "bg-rose-500/10 border border-rose-500/30 text-rose-300"
                      : msg.isApiKeyError
                      ? "bg-amber-500/10 border border-amber-500/25 text-[var(--text-primary)]"
                      : msg.role === "assistant"
                      ? "bg-[var(--bg-tertiary)]/70 border border-[var(--border-color)] text-[var(--text-primary)]"
                      : "bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium"
                  )}
                >
                  {msg.isApiKeyError ? (
                    <div className="space-y-3.5">
                      <div className="flex items-start gap-2.5">
                        <Key className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-sm text-[var(--text-primary)]">
                            Gemini API Key Required for Live AI
                          </p>
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            Google Gemini API Key is not configured yet. Paste your free Google AI Studio key below to enable live reasoning, or switch to Demo Mode to explore instantly without an API key.
                          </p>
                        </div>
                      </div>

                      {/* Quick inline key form */}
                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <input
                          type="password"
                          placeholder="Paste Gemini API key (AIzaSy...)"
                          value={quickApiKey}
                          onChange={(e) => setQuickApiKey(e.target.value)}
                          className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500"
                        />
                        <button
                          onClick={() => handleSaveQuickApiKey(lastPrompt)}
                          disabled={!quickApiKey.trim()}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer whitespace-nowrap"
                        >
                          Save &amp; Continue
                        </button>
                      </div>

                      {/* Alternate options */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        <button
                          onClick={() => handleEnableDemoAndAnswer(lastPrompt)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 transition-all flex items-center gap-1.5 cursor-pointer font-semibold"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Answer in Demo Mode
                        </button>
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-cyan-400 transition-all flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Get Free Key
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                  )}

                  {/* Message Actions */}
                  {msg.role === "assistant" && (
                    <div className="mt-3 pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                      <span>{msg.timestamp}</span>
                      <div className="flex items-center gap-2">
                        {msg.isError && (
                          <button
                            onClick={() => handleSendMessage(lastPrompt)}
                            className="text-amber-400 hover:underline flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" /> Retry
                          </button>
                        )}
                        <button
                          onClick={() => toggleSpeechForMessage(msg.id, msg.content)}
                          className="hover:text-cyan-400 flex items-center gap-1 transition-colors"
                          title={speakingMessageId === msg.id ? "Stop reading" : "Read aloud"}
                        >
                          {speakingMessageId === msg.id ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5 text-rose-400 animate-pulse" /> Stop
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" /> Read
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className="hover:text-cyan-400 flex items-center gap-1 transition-colors"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Source Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="p-3 rounded-2xl bg-cyan-500/5 border border-cyan-500/15 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> Source Citations ({msg.citations.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {msg.citations.map((cite) => (
                        <button
                          key={cite.id}
                          onClick={() => setActiveCitation(cite)}
                          className="px-2.5 py-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-cyan-500/50 text-[11px] font-medium text-[var(--text-secondary)] hover:text-cyan-400 transition-all flex items-center gap-1.5"
                        >
                          <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 text-[9px] font-bold flex items-center justify-center">
                            [{cite.id}]
                          </span>
                          <span className="truncate max-w-[180px]">{cite.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isStreaming && (
            <div className="flex items-center gap-3 text-xs text-cyan-400 animate-pulse">
              <Bot className="w-4 h-4" /> Synthesizing streaming response via {selectedModel}...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* File Attachments Chips */}
        {attachedFiles.length > 0 && (
          <div className="px-6 py-2 bg-[var(--bg-tertiary)]/50 border-t border-[var(--border-color)] flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[var(--text-muted)]">Attachments:</span>
            {attachedFiles.map((name, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-300 flex items-center gap-1.5"
              >
                <FileText className="w-3 h-3 text-cyan-400" />
                {name}
                <button
                  onClick={() => setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  className="hover:text-rose-400 ml-1"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Text Input Control Bar */}
        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex items-end gap-2 p-2 rounded-2xl bg-[var(--bg-tertiary)]/80 border border-[var(--border-color)] focus-within:border-cyan-500/50 transition-colors">
            <label className="p-2.5 rounded-xl text-[var(--text-muted)] hover:text-cyan-400 cursor-pointer transition-colors">
              <Paperclip className="w-4 h-4" />
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>

            <button
              onClick={() => setIsVoiceActive(!isVoiceActive)}
              className={clsx(
                "p-2.5 rounded-xl transition-colors",
                isVoiceActive
                  ? "bg-rose-500/20 text-rose-400 animate-pulse"
                  : "text-[var(--text-muted)] hover:text-cyan-400"
              )}
              title={isVoiceActive ? "Listening (Voice dictation active)" : "Activate Voice Control"}
            >
              {isVoiceActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <textarea
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                isDeepResearch
                  ? "Enter research question for Deep Academic Synthesis..."
                  : "Ask a research question or query paper details..."
              }
              rows={1}
              className="flex-1 bg-transparent border-none text-xs md:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none resize-none max-h-32 py-2"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputPrompt.trim() && attachedFiles.length === 0}
              className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-cyan-500/20 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Citation Detail Modal */}
      {activeCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                Citation [{activeCitation.id}]
              </span>
              <button
                onClick={() => setActiveCitation(null)}
                className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Close
              </button>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-[var(--text-primary)] leading-snug">
                {activeCitation.title}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">{activeCitation.authors}</p>
              <p className="text-xs text-cyan-400 font-medium">
                {activeCitation.journal} • {activeCitation.year}
              </p>
            </div>
            <div className="pt-2 border-t border-[var(--border-color)] flex justify-end">
              <a
                href={activeCitation.url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 text-xs font-semibold border border-cyan-500/20 flex items-center gap-1.5 hover:bg-cyan-500/20"
              >
                Open Source <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Quick API Key Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400">
                <Key className="w-5 h-5" />
                <h3 className="font-bold text-sm text-[var(--text-primary)]">Configure Gemini API Key</h3>
              </div>
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Paste your Google AI Studio API key below to enable real Google Gemini 1.5 Pro and 2.0 Flash reasoning directly.
            </p>
            <div className="space-y-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={quickApiKey}
                onChange={(e) => setQuickApiKey(e.target.value)}
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500"
              />
              <div className="flex justify-between items-center text-[11px] text-[var(--text-muted)]">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  Get key at Google AI Studio <ExternalLink className="w-3 h-3" />
                </a>
                <span>Stored securely in browser</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveQuickApiKey(lastPrompt)}
                disabled={!quickApiKey.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-40 cursor-pointer"
              >
                Save &amp; Start Chatting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
