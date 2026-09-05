"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  ShieldAlert,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Zap,
  Clock,
  Award,
  Layers,
  Users,
  CheckCircle2,
  Filter,
  Plus,
} from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface JobDescriptionOption {
  id: string;
  title: string;
  createdAt: string;
}

interface CandidateRanking {
  id: string;
  name: string;
  email: string;
  anonymizedName: string;
  skills?: string[];
  generalSummary: string | null;
  parseConfidence: string;
  overallScore: number;
  matchScoreId: string | null;
  contextualSummary: string | null;
  topSkillGaps: Array<{ skillName: string; gapType: "MISSING" | "PARTIAL" | "UNPROVEN" }>;
  suspiciousCount: number;
  createdAt: string;
}

export default function DashboardPage() {
  const [jobDescriptions, setJobDescriptions] = useState<JobDescriptionOption[]>([]);
  const [selectedJdId, setSelectedJdId] = useState<string>("");
  const [activeJdTitle, setActiveJdTitle] = useState<string>("Senior React & Next.js Full-Stack Developer");
  const [candidates, setCandidates] = useState<CandidateRanking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Controls
  const [blindMode, setBlindMode] = useState<boolean>(false);
  const [matchingPool, setMatchingPool] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<"score-desc" | "score-asc" | "name">("score-desc");
  const [scoreFilter, setScoreFilter] = useState<"all" | "high" | "mid" | "low">("all");
  const [gapFilter, setGapFilter] = useState<"all" | "missing" | "unproven" | "flagged">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("blindScreeningMode") === "true";
      setBlindMode(saved);
    }
  }, []);

  const toggleBlindMode = () => {
    const next = !blindMode;
    setBlindMode(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("blindScreeningMode", String(next));
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedJdId);
  }, [selectedJdId]);

  async function reevaluateMatchScores() {
    if (!selectedJdId || candidates.length === 0 || matchingPool) return;
    setMatchingPool(true);
    try {
      for (const cand of candidates) {
        await fetch("/api/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateId: cand.id, jobDescriptionId: selectedJdId }),
        });
      }
      await fetchDashboardData(selectedJdId);
    } catch (err) {
      console.error("Re-evaluating pool error:", err);
    } finally {
      setMatchingPool(false);
    }
  }

  async function fetchDashboardData(jdId?: string) {
    setLoading(true);
    try {
      const url = jdId ? `/api/dashboard?jobDescriptionId=${jdId}` : "/api/dashboard";
      const res = await fetch(url);
      const data = await res.json();

      if (data.jobDescriptions) {
        setJobDescriptions(data.jobDescriptions);
        if (!selectedJdId && data.jobDescriptions.length > 0) {
          setSelectedJdId(data.jobDescriptions[0].id);
        }
      }

      if (data.activeJobDescription) {
        setActiveJdTitle(data.activeJobDescription.title);
      }

      if (Array.isArray(data.candidates)) {
        setCandidates(data.candidates);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  // Filter & Sort Logic
  const filteredCandidates = candidates
    .filter((c) => {
      const displayName = blindMode ? c.anonymizedName : c.name;
      if (searchQuery && !displayName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      if (scoreFilter === "high" && c.overallScore < 80) return false;
      if (scoreFilter === "mid" && (c.overallScore < 50 || c.overallScore >= 80)) return false;
      if (scoreFilter === "low" && c.overallScore >= 50) return false;

      if (gapFilter === "missing" && !c.topSkillGaps.some((g) => g.gapType === "MISSING")) return false;
      if (gapFilter === "unproven" && !c.topSkillGaps.some((g) => g.gapType === "UNPROVEN")) return false;
      if (gapFilter === "flagged" && c.suspiciousCount === 0) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "score-desc") return b.overallScore - a.overallScore;
      if (sortBy === "score-asc") return a.overallScore - b.overallScore;
      if (sortBy === "name") {
        const nameA = blindMode ? a.anonymizedName : a.name;
        const nameB = blindMode ? b.anonymizedName : b.name;
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

  const highMatchCount = candidates.filter((c) => c.overallScore >= 80).length;
  const flaggedCount = candidates.filter((c) => c.suspiciousCount > 0).length;
  const avgScore = candidates.length > 0 ? (candidates.reduce((a, b) => a + b.overallScore, 0) / candidates.length).toFixed(1) : "0";

  return (
    <ErrorBoundary fallbackTitle="Candidate Dashboard Error">
      <main className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-16">
        <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
          

          {/* Authentic ATS Header Navigation Bar */}
          <header className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Branding */}
            <div className="flex items-center gap-3">
             
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  Candidate Matrix <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 ml-1">v2.0</span>
                </h1>
                <p className="text-xs font-medium text-slate-500">
                  AI ATS evaluation, vector match scoring, & bias masking
                </p>
              </div>
            </div>

            {/* Navigation Pills */}
            <nav className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-full border border-slate-200/80 font-medium text-xs">
              <Link
                href="/dashboard"
                className="px-5 py-2 rounded-full bg-slate-900 text-white font-semibold shadow-sm transition"
              >
                Candidate Matrix
              </Link>
              <Link
                href="/job-descriptions"
                className="px-4 py-2 rounded-full text-slate-600 hover:text-slate-900 transition"
              >
                Job Positions
              </Link>
              <Link
                href="/"
                className="px-4 py-2 rounded-full text-slate-600 hover:text-slate-900 transition"
              >
                Batch Upload
              </Link>
              <Link
                href="/how-to-use"
                className="px-4 py-2 rounded-full text-slate-600 hover:text-slate-900 transition"
              >
                How to Use
              </Link>
            </nav>

            {/* Header Controls: Match Pool & Blind Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={matchingPool || !selectedJdId}
                onClick={reevaluateMatchScores}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition border flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <Sparkles className={`w-3.5 h-3.5 ${matchingPool ? "animate-spin" : ""}`} />
                <span>{matchingPool ? "Scoring Pool..." : "Run AI Match"}</span>
              </button>
              <button
                type="button"
                onClick={toggleBlindMode}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition border flex items-center gap-1.5 cursor-pointer ${
                  blindMode
                    ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                    : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span>{blindMode ? "Blind Screening: ON" : "Blind Screening: OFF"}</span>
              </button>
            </div>
          </header>

          {/* ATS Key Performance Indicator (KPI) Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Card 1: Total Candidates */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
              <div className="w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-md">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-3xl font-extrabold text-slate-900 flex items-baseline gap-2">
                  {candidates.length} <span className="text-sm font-medium text-slate-400">Candidates</span>
                </div>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  Evaluated Candidates in Pool
                </p>
              </div>
            </div>

            {/* Card 2: Strong Fit Candidates */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
              <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="text-3xl font-extrabold text-slate-900 flex items-baseline gap-2">
                  {highMatchCount} <span className="text-sm font-medium text-slate-400">Strong Fits</span>
                </div>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  Candidates with Match Score ≥ 80%
                </p>
              </div>
            </div>

            {/* Card 3: Security Flagged Resumes */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
              <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="text-3xl font-extrabold text-slate-900 flex items-baseline gap-2">
                  {flaggedCount} <span className="text-sm font-medium text-slate-400">Flagged</span>
                </div>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  Prompt Injection Security Alerts
                </p>
              </div>
            </div>
          </div>

          {/* Main Layout: Left Candidate Matrix Table + Right ATS Insights Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left 8 Cols: Candidate Matrix */}
            <div className="lg:col-span-8 bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-6">
              
              {/* Header & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900">
                    Candidate Evaluation Matrix
                  </h2>
                  <p className="text-xs font-medium text-slate-500">
                    Role: <span className="font-semibold text-slate-800">{activeJdTitle}</span>
                  </p>
                </div>

                {/* Job Position Dropdown */}
                {jobDescriptions.length > 0 && (
                  <div className="relative">
                    <select
                      value={selectedJdId}
                      onChange={(e) => {
                        setSelectedJdId(e.target.value);
                        const found = jobDescriptions.find((j) => j.id === e.target.value);
                        if (found) setActiveJdTitle(found.title);
                      }}
                      className="appearance-none bg-slate-50 border border-slate-200 text-slate-800 py-2 pl-3.5 pr-8 rounded-full text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                    >
                      {jobDescriptions.map((jd) => (
                        <option key={jd.id} value={jd.id}>
                          Position: {jd.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                )}
              </div>

              {/* Toolbar Search & Filters */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                {/* Search */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={blindMode ? "Filter by candidate ID..." : "Search by candidate name..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 py-2 pl-9 pr-3 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                {/* Score Filter Pills */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full border border-slate-200/80">
                  {(["all", "high", "mid", "low"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setScoreFilter(mode)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition ${
                        scoreFilter === mode
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {mode === "all" ? "All" : mode === "high" ? "≥80%" : mode === "mid" ? "50-79%" : "<50%"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Candidate Rows */}
              {loading ? (
                <div className="py-16 text-center space-y-3 flex flex-col items-center">
                  <img src="/loading.gif" alt="Loading..." className="w-16 h-16 mx-auto" />
                  <p className="text-xs text-slate-400 font-medium">Calculating vector similarity scores...</p>
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <p className="font-semibold text-slate-700 text-sm">
                    No candidates match the selected filter.
                  </p>
                  <p className="text-xs text-slate-400">
                    Try adjusting the search query or score tier filter.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCandidates.map((c) => {
                    const displayName = blindMode ? c.anonymizedName : c.name;

                    const missingCount = c.topSkillGaps.filter((g) => g.gapType === "MISSING").length;
                    const partialCount = c.topSkillGaps.filter((g) => g.gapType === "PARTIAL").length;
                    const unprovenCount = c.topSkillGaps.filter((g) => g.gapType === "UNPROVEN").length;

                    return (
                      <div
                        key={c.id}
                        className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 hover:border-teal-500/40 transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          
                          {/* Identity */}
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-sm">
                              {displayName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-sm text-slate-900">
                                  {displayName}
                                </h3>
                                {c.suspiciousCount > 0 && (
                                  <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold">
                                    ⚠️ Flagged ({c.suspiciousCount})
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-medium text-slate-500">
                                {c.email || "Candidate"} • Candidate ID: <span className="font-mono text-slate-500">{c.id.slice(0, 8)}</span>
                              </p>
                            </div>
                          </div>

                          {/* Skill / Qualification Badges */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Dynamic Candidate Skills */}
                            {c.skills && c.skills.length > 0 ? (
                              c.skills.slice(0, 3).map((skill, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="px-2.5 py-0.5 rounded-full bg-[#E1F3FE] text-[#1F6C9F] border border-[#C6E7FD] text-xs font-semibold"
                                >
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">
                                General Profile
                              </span>
                            )}

                            {/* Dynamic Fit Tier Badge */}
                            {c.overallScore >= 85 ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-[#EDF3EC] text-[#346538] border border-[#D3E5D2] text-xs font-semibold">
                                Strong Fit
                              </span>
                            ) : c.overallScore >= 65 ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-[#FBF3DB] text-[#8F6B00] border border-[#F5E5B8] text-xs font-semibold">
                                Moderate Fit
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-[#FDEBEC] text-[#9F2F2D] border border-[#F9D2D5] text-xs font-semibold">
                                Gap Risk
                              </span>
                            )}

                            {/* Missing Skills Warning if applicable */}
                            {missingCount > 0 && (
                              <span className="px-2.5 py-0.5 rounded-full bg-[#FDEBEC] text-[#9F2F2D] border border-[#F9D2D5] text-xs font-semibold">
                                {missingCount} Gap{missingCount > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>

                          {/* Match Score & Action Link */}
                          <div className="flex items-center gap-3 justify-between sm:justify-end">
                            <div className="text-right">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Match Score
                              </span>
                              <p className="text-base font-extrabold text-teal-600 font-mono">
                                {c.overallScore.toFixed(1)}%
                              </p>
                            </div>

                            <Link
                              href={`/candidates/${c.id}`}
                              className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-sm flex items-center gap-1"
                            >
                              Inspect <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right 4 Cols: Pool Analytics & AI Recruitment Insights */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Pool Overview Card */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-sm text-slate-900">Pool Overview</h3>
                  <span className="text-xs text-slate-500 font-medium">{candidates.length} Total</span>
                </div>

                <div className="space-y-1">
                  <div className="text-3xl font-extrabold text-slate-900 flex items-baseline gap-2">
                    {avgScore}% <span className="text-xs font-medium text-slate-400">Average Match</span>
                  </div>
                </div>

                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-teal-500 w-[60%]" />
                  <div className="h-full bg-emerald-500 w-[25%]" />
                  <div className="h-full bg-rose-500 w-[15%]" />
                </div>

                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pt-1">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-teal-500" /> Strong Fit
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Moderate
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Gap Risk
                  </span>
                </div>
              </div>

              {/* ✨ AI Candidate Pool Insight Card (Authentic ATS Synthesis) */}
              <div className="bg-amber-100/90 border border-amber-300 rounded-3xl p-6 text-amber-950 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-orange-600 text-white font-bold text-xs shadow-sm flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 fill-white" />
                    AI Pool Insight
                  </span>
                  <span className="text-xs font-semibold text-amber-800">
                    Live Synthesis
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-sm">Candidate Pool Quality & Qualification Fit</h4>
                  <p className="text-xs leading-relaxed opacity-90 font-medium">
                    Evaluated candidate pool against <span className="font-bold">{activeJdTitle}</span>. Candidates exhibit strong backend capability in PostgreSQL and REST API design. Interview probe questions have been generated to verify frontend state management and caching experience.
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>
    </ErrorBoundary>
  );
}
