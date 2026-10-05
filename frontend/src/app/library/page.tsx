"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Search,
  Bookmark,
  ExternalLink,
  Plus,
  Trash2,
  FileText,
  Copy,
  Check,
  Tag,
  Grid,
  List as ListIcon,
  Layers,
  Sparkles,
  Download
} from "lucide-react";
import { clsx } from "clsx";

export default function LibraryPage() {
  const [activeSection, setActiveSection] = useState<"papers" | "reports">("reports");
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedPaper, setSelectedPaper] = useState<any>(null);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [userNote, setUserNote] = useState("");
  const [copiedBib, setCopiedBib] = useState(false);

  const [papers, setPapers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch papers and projects on mount
  useEffect(() => {
    fetchLibraryData();
  }, []);

  const fetchLibraryData = async () => {
    setIsLoading(true);
    try {
      const [papersRes, reportsRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/v1/library/papers"),
        fetch("http://127.0.0.1:8000/api/v1/research/projects"),
      ]);

      if (papersRes.ok) {
        const pData = await papersRes.json();
        setPapers(pData);
      }
      if (reportsRes.ok) {
        const rData = await reportsRes.json();
        setReports(rData);
      }
    } catch (e) {
      console.error("Error fetching library data", e);
    } finally {
      setIsLoading(false);
    }
  };

  const collections = ["All", "Quantum ML", "Agentic AI", "Biomedical RAG", "General"];

  const handleDeletePaper = async (paperId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/library/papers/${paperId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPapers((prev) => prev.filter((p) => p.id !== paperId));
        if (selectedPaper?.id === paperId) setSelectedPaper(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteReport = async (reportId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/research/projects/${reportId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setReports((prev) => prev.filter((r) => r.id !== reportId));
        if (selectedReport?.id === reportId) setSelectedReport(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPapers = papers.filter((p) => {
    const matchesTab = activeTab === "All" || p.collection_name === activeTab;
    const matchesSearch =
      (p.paper_title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.authors || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      (r.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.topic || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const copyBibtex = () => {
    if (!selectedPaper) return;
    const authorFirst = (selectedPaper.authors || "Author").split(" ")[0].toLowerCase();
    const bib = `@article{${authorFirst}${selectedPaper.publication_year || "2025"},
  title={${selectedPaper.paper_title}},
  author={${selectedPaper.authors || "Unknown"}},
  journal={${selectedPaper.journal_or_venue || "Scholarly Archive"}},
  year={${selectedPaper.publication_year || 2025}},
  doi={${selectedPaper.doi || ""}}
}`;
    navigator.clipboard.writeText(bib);
    setCopiedBib(true);
    setTimeout(() => setCopiedBib(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-cyan-400" /> Research Library &amp; Reports
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            Curated papers, multi-source literature reports, and BibTeX citation assets stored in your database.
          </p>
        </div>

        {/* Section Switcher (Reports vs Papers) */}
        <div className="flex items-center gap-2 bg-[var(--bg-card)] p-1 rounded-2xl border border-[var(--border-color)]">
          <button
            onClick={() => setActiveSection("reports")}
            className={clsx(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              activeSection === "reports"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" /> Research Reports ({reports.length})
          </button>
          <button
            onClick={() => setActiveSection("papers")}
            className={clsx(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              activeSection === "papers"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <Bookmark className="w-3.5 h-3.5" /> Saved Papers ({papers.length})
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {activeSection === "papers" ? (
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
              {collections.map((col) => (
                <button
                  key={col}
                  onClick={() => setActiveTab(col)}
                  className={clsx(
                    "px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors",
                    activeTab === col
                      ? "bg-cyan-500/15 border border-cyan-500/40 text-cyan-400"
                      : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {col}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              Persisted Research Syntheses
            </span>
          )}

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic, paper title, or authors..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>
      </div>

      {/* SECTION 1: SYNTHESIZED RESEARCH REPORTS */}
      {activeSection === "reports" && (
        <div className="space-y-4">
          {filteredReports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="group p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-cyan-500/40 transition-all hover:shadow-lg cursor-pointer flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider">
                        {report.depth || "Standard"} Synthesis
                      </span>
                      <button
                        onClick={(e) => handleDeleteReport(report.id, e)}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete report"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-cyan-400 transition-colors leading-snug line-clamp-2">
                      {report.title}
                    </h3>

                    <p className="text-xs text-[var(--text-muted)] line-clamp-1">
                      Topic: {report.topic}
                    </p>

                    <p className="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
                      {report.summary}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span>{new Date(report.created_at).toLocaleDateString()}</span>
                    <span className="text-cyan-400 font-semibold group-hover:underline">
                      View Report &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-3">
              <Sparkles className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-60" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">No saved research yet.</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                Start a Deep Research task to build your library.
              </p>
              <a
                href="/research"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-600/20"
              >
                <Sparkles className="w-3.5 h-3.5" /> Start Deep Research
              </a>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: SAVED PAPERS */}
      {activeSection === "papers" && (
        <div className="space-y-4">
          {filteredPapers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPapers.map((paper) => (
                <div
                  key={paper.id}
                  onClick={() => setSelectedPaper(paper)}
                  className="group p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-cyan-500/40 transition-all hover:shadow-lg cursor-pointer flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                        {paper.collection_name || "General"}
                      </span>
                      <button
                        onClick={(e) => handleDeletePaper(paper.id, e)}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete paper"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-cyan-400 transition-colors leading-snug line-clamp-2">
                      {paper.paper_title}
                    </h3>

                    <p className="text-xs text-[var(--text-muted)] line-clamp-1">{paper.authors}</p>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
                      {paper.abstract}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span className="font-semibold text-cyan-400">{paper.journal_or_venue || "Academic Venue"}</span>
                    <span>{paper.publication_year || "2025"}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-3">
              <Bookmark className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">No Papers in this Collection</p>
              <p className="text-xs text-[var(--text-muted)]">
                Papers discovered from arXiv or OpenAlex can be saved to your library collections.
              </p>
            </div>
          )}
        </div>
      )}

      {/* REPORT VIEWER MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold">
                Archived Research Synthesis
              </span>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Close
              </button>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg md:text-xl font-bold text-[var(--text-primary)]">
                {selectedReport.title}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">Topic: {selectedReport.topic}</p>
            </div>

            <div className="prose dark:prose-invert max-w-none text-xs md:text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
              {selectedReport.summary}
            </div>

            {selectedReport.citations_json && selectedReport.citations_json.length > 0 && (
              <div className="p-4 rounded-2xl bg-[var(--bg-tertiary)]/60 border border-[var(--border-color)] space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  Cited Sources ({selectedReport.citations_json.length})
                </h4>
                <div className="space-y-2">
                  {selectedReport.citations_json.map((c: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs text-[var(--text-primary)]">
                      <span className="truncate max-w-md"><strong>{c.ref_id || `[${i+1}]`}</strong> {c.title} ({c.authors})</span>
                      {c.url && (
                        <a href={c.url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline shrink-0 ml-2">
                          Link &rarr;
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAPER VIEWER MODAL */}
      {selectedPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <span className="px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 text-xs font-bold">
                Collection: {selectedPaper.collection_name || "General"}
              </span>
              <button
                onClick={() => setSelectedPaper(null)}
                className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Close
              </button>
            </div>

            <div className="space-y-2">
              <h2 className="text-base md:text-lg font-bold text-[var(--text-primary)]">
                {selectedPaper.paper_title}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">{selectedPaper.authors}</p>
              <p className="text-xs font-semibold text-cyan-400">
                {selectedPaper.journal_or_venue} • {selectedPaper.publication_year}
              </p>
            </div>

            <div className="space-y-2 p-4 rounded-2xl bg-[var(--bg-tertiary)]/60 border border-[var(--border-color)]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Abstract
              </h4>
              <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                {selectedPaper.abstract}
              </p>
            </div>

            <div className="pt-4 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={copyBibtex}
                className="px-4 py-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 text-xs font-semibold flex items-center gap-1.5 hover:bg-violet-500/20"
              >
                {copiedBib ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedBib ? "BibTeX Copied!" : "Copy BibTeX"}
              </button>

              {selectedPaper.url && (
                <a
                  href={selectedPaper.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                >
                  Open Original Source <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
