"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  ShieldAlert,
  Play,
  Square,
  CheckCircle2,
  Settings,
  Languages,
  Sliders,
  AlertTriangle,
  Send,
  RefreshCw
} from "lucide-react";
import { clsx } from "clsx";

const API_BASE = "http://localhost:8000/api/v1";

export default function VoicePage() {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [language, setLanguage] = useState("en-US");
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [speakingRate, setSpeakingRate] = useState(1.0);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [preferredVoice, setPreferredVoice] = useState("");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [commandResult, setCommandResult] = useState<any>(null);
  const [confirmationNeeded, setConfirmationNeeded] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load browser voices
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        if (voices.length > 0 && !preferredVoice) {
          const defaultVoice = voices.find((v) => v.lang.startsWith("en")) || voices[0];
          setPreferredVoice(defaultVoice.name);
        }
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, [preferredVoice]);

  // Fetch preferences from backend
  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const res = await fetch(`${API_BASE}/voice/preferences`);
        if (res.ok) {
          const data = await res.json();
          setVoiceEnabled(data.voice_enabled ?? false);
          setLanguage(data.speech_recognition_language || "en-US");
          setVoiceOutputEnabled(data.voice_output_enabled ?? true);
          setSpeakingRate(data.speaking_rate || 1.0);
          setAutoSpeak(data.auto_speak_responses ?? false);
          if (data.preferred_voice_name) {
            setPreferredVoice(data.preferred_voice_name);
          }
        }
      } catch (err) {
        console.warn("Could not fetch voice preferences:", err);
      }
    };
    fetchPrefs();
  }, []);

  const savePreferences = async (overrides: Partial<any> = {}) => {
    const payload = {
      voice_enabled: overrides.voice_enabled ?? voiceEnabled,
      speech_recognition_language: overrides.language ?? language,
      voice_output_enabled: overrides.voiceOutputEnabled ?? voiceOutputEnabled,
      speaking_rate: overrides.speakingRate ?? speakingRate,
      auto_speak_responses: overrides.autoSpeak ?? autoSpeak,
      preferred_voice_name: overrides.preferredVoice ?? preferredVoice
    };

    try {
      const res = await fetch(`${API_BASE}/voice/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast("Voice preferences saved!");
      }
    } catch (err) {
      showToast("Error saving preferences to server.");
    }
  };

  // Browser speech recognition
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast("Web Speech API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
      setCommandResult(null);
      setConfirmationNeeded(null);
    };

    recognition.onresult = (event: any) => {
      const current = event.results[event.results.length - 1][0].transcript;
      setTranscript(current);
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      setIsListening(false);
      showToast(`Speech recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Submit voice command to backend
  const handleProcessCommand = async (confirmed: boolean = false) => {
    if (!transcript.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/voice/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          confirmed
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.requires_confirmation) {
          setConfirmationNeeded(data);
        } else {
          setConfirmationNeeded(null);
          setCommandResult(data);
          showToast(`Executed: ${data.interpreted_action}`);
        }
      }
    } catch (err) {
      showToast("Error processing command.");
    }
  };

  // Test Speech Synthesis
  const handleTestSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      showToast("Speech synthesis not supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      "Hello! Antigravity Voice Assistant is connected and ready to synthesize research summaries."
    );
    utterance.rate = speakingRate;
    const selected = availableVoices.find((v) => v.name === preferredVoice);
    if (selected) {
      utterance.voice = selected;
    }
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-primary)] overflow-y-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 shadow-xl shadow-cyan-500/10 text-sm flex items-center gap-3 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="border-b border-[var(--border-color)] bg-gradient-to-r from-slate-900 via-[var(--bg-secondary)] to-slate-900 px-8 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-3">
              <Mic className="w-3.5 h-3.5" />
              <span>Browser-Native Speech & Safety • Phase 4</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Voice Assistant & Personalization
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1.5 max-w-2xl leading-relaxed">
              Interact hands-free with scholarly searches and alert checks. 
              Equipped with strict voice safety boundaries: sensitive actions always require explicit confirmation.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-8 py-8 space-y-8">
        {/* Live Voice Playground */}
        <section className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
            <Mic className="w-5 h-5 text-cyan-400" />
            Live Voice Command Console
          </h2>
          <p className="text-xs text-[var(--text-muted)] mb-6">
            Click the microphone and say: <span className="text-cyan-400">"Show my latest alerts"</span>,{" "}
            <span className="text-cyan-400">"Start deep research on dark matter"</span>, or{" "}
            <span className="text-cyan-400">"Open my saved papers"</span>.
          </p>

          <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-center relative overflow-hidden">
            {/* Pulsing ring during listening */}
            {isListening && (
              <div className="absolute w-40 h-40 rounded-full bg-cyan-500/20 animate-ping pointer-events-none" />
            )}

            <button
              onClick={toggleListening}
              className={clsx(
                "relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl",
                isListening
                  ? "bg-rose-500 text-white shadow-rose-500/30 scale-105"
                  : "bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/30"
              )}
            >
              {isListening ? <MicOff className="w-8 h-8 animate-pulse" /> : <Mic className="w-8 h-8" />}
            </button>

            <span className="mt-4 text-xs font-semibold tracking-wide uppercase text-[var(--text-secondary)]">
              {isListening ? "Listening... Speak now" : "Click to speak"}
            </span>

            {/* Live Transcript Display */}
            <div className="w-full max-w-lg mt-5">
              <input
                type="text"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Or type a command manually..."
                className="w-full px-4 py-2.5 text-xs text-center rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {transcript && (
              <button
                onClick={() => handleProcessCommand(false)}
                className="mt-3 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 text-white hover:bg-cyan-400 shadow-md shadow-cyan-500/20 flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                Process Command
              </button>
            )}
          </div>

          {/* Sensitive Action Confirmation Modal */}
          {confirmationNeeded && (
            <div className="mt-4 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 animate-in fade-in">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-amber-300">Voice Safety Confirmation Required</h4>
                  <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                    {confirmationNeeded.confirmation_prompt}
                  </p>
                  <p className="text-[11px] text-amber-300/70 mt-1">
                    Spoken command: "{confirmationNeeded.transcript}"
                  </p>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setConfirmationNeeded(null)}
                      className="px-3.5 py-1.5 rounded-xl text-xs bg-slate-800 text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleProcessCommand(true)}
                      className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20"
                    >
                      Confirm & Execute
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Command Result Output */}
          {commandResult && (
            <div className="mt-4 p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs">
              <span className="font-semibold text-cyan-400">Interpreted Action:</span>{" "}
              <span className="font-mono text-[var(--text-primary)]">{commandResult.interpreted_action}</span>
              <pre className="mt-2 p-3 rounded-lg bg-slate-950 text-slate-300 overflow-x-auto text-[11px]">
                {JSON.stringify(commandResult.execution?.result || commandResult, null, 2)}
              </pre>
            </div>
          )}
        </section>

        {/* Voice Preferences Configuration */}
        <section className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-5 border-b border-[var(--border-color)]">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Settings className="w-5 h-5 text-cyan-400" />
                Voice Settings & Synthesis
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Customize speech recognition language, speaking rate, and text-to-speech engine.
              </p>
            </div>

            <button
              onClick={() => savePreferences()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 text-white hover:bg-cyan-400 shadow-md shadow-cyan-500/20 transition-all"
            >
              Save Settings
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
            {/* Speech Recognition Language */}
            <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-cyan-400" />
                Speech Recognition Language
              </label>
              <p className="text-[11px] text-[var(--text-muted)] mb-3">Language model for microphone transcription.</p>
              <select
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  savePreferences({ language: e.target.value });
                }}
                className="w-full text-xs px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]"
              >
                <option value="en-US">English (United States)</option>
                <option value="en-GB">English (United Kingdom)</option>
                <option value="fr-FR">Français (French)</option>
                <option value="de-DE">Deutsch (German)</option>
                <option value="es-ES">Español (Spanish)</option>
                <option value="zh-CN">中文 (Mandarin)</option>
                <option value="ja-JP">日本語 (Japanese)</option>
              </select>
            </div>

            {/* Speaking Rate Slider */}
            <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-purple-400" />
                  Speaking Rate
                </label>
                <span className="text-xs font-mono text-cyan-400">{speakingRate}x</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mb-3">Speed of audio playback for research summaries.</p>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speakingRate}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSpeakingRate(val);
                }}
                onMouseUp={() => savePreferences({ speakingRate })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Preferred Voice Selection */}
            <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                  Text-to-Speech Voice
                </label>
                <button
                  onClick={handleTestSpeech}
                  className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <Play className="w-3 h-3" /> Test Voice
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mb-3">Synthesizer voice for assistant answers.</p>
              <select
                value={preferredVoice}
                onChange={(e) => {
                  setPreferredVoice(e.target.value);
                  savePreferences({ preferredVoice: e.target.value });
                }}
                className="w-full text-xs px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]"
              >
                {availableVoices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>

            {/* Toggles */}
            <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex flex-col justify-between">
              <div>
                <label className="text-xs font-semibold text-[var(--text-primary)] mb-1 block">
                  Automatic Audio Playback
                </label>
                <p className="text-[11px] text-[var(--text-muted)] mb-4">
                  Automatically read aloud AI response text upon completion.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-[var(--text-secondary)]">Auto-speak responses:</span>
                <button
                  onClick={() => {
                    const newVal = !autoSpeak;
                    setAutoSpeak(newVal);
                    savePreferences({ autoSpeak: newVal });
                  }}
                  className={clsx(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    autoSpeak ? "bg-cyan-500" : "bg-slate-700"
                  )}
                >
                  <span
                    className={clsx(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      autoSpeak ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
