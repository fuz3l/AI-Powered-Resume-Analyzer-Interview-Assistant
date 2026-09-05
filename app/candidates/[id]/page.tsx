"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldAlert,
  AlertTriangle,
  FileText,
  User,
  Mail,
  Briefcase,
  GraduationCap,
  Award,
  Code,
  X,
  Check,
  Target,
  Sparkles,
  Zap,
  Eye,
  EyeOff,
} from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface RequirementScore {
  id: string;
  requirementText: string;
  priority: "REQUIRED" | "NICE_TO_HAVE";
  similarityScore: number;
  evidenceText: string | null;
  evidenceSourceSpan: string | null;
}

interface SkillGap {
  id: string;
  skillName: string;
  gapType: "MISSING" | "PARTIAL" | "UNPROVEN";
}

interface SuspiciousContent {
  id: string;
  flaggedText: string;
  detectionReason: string;
  createdAt: string;
}

interface InterviewQuestion {
  id: string;
  questionText: string;
  reasoning: string | null;
  category: "TECHNICAL" | "BEHAVIORAL";
}

interface CandidateDetail {
  id: string;
  name: string;
  email: string;
  anonymizedName?: string;
  anonymizedText?: string;
  anonymizedJson?: any;
  generalSummary: string | null;
  rawText: string;
  parsedJson: any;
  parseConfidence: string;
  createdAt: string;
  suspiciousContents: SuspiciousContent[];
  latestMatch: {
    matchScoreId: string;
    jobDescriptionTitle: string;
    overallScore: number;
    contextualSummary: string | null;
    requirementScores: RequirementScore[];
    skillGaps: SkillGap[];
    interviewQuestions: InterviewQuestion[];
  } | null;
}

export default function CandidateDetailPage({ params }: { params: { id: string } }) {
  const candidateId = params.id;

  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [blindMode, setBlindMode] = useState<boolean>(false);

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
    fetchCandidateDetail();
  }, [candidateId]);

  const fetchCandidateDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/candidates/${candidateId}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load candidate profile.");
      }

      setCandidate(data.candidate);
      if (data.candidate.latestMatch?.requirementScores?.length > 0) {
        setSelectedReqId(data.candidate.latestMatch.requirementScores[0].id);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] text-slate-900 flex items-center justify-center font-sans text-xs">
        <div className="space-y-4 text-center flex flex-col items-center">
          <img src="/loading.gif" alt="Loading..." className="w-20 h-20" />
          <p className="text-slate-500 font-medium">Loading candidate evidence matrix...</p>
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <main className="min-h-screen bg-[#f1f5f9] text-slate-900 p-8 flex items-center justify-center font-sans">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-3xl p-8 space-y-4 text-center shadow-md">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Profile Loading Exception</h2>
          <p className="text-xs text-slate-500">{error || "Candidate record not found."}</p>
          <Link
            href="/dashboard"
            className="inline-block px-5 py-2.5 rounded-full bg-slate-900 text-white text-xs font-semibold shadow transition"
          >
            ← Return to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const selectedReq = candidate.latestMatch?.requirementScores.find((r) => r.id === selectedReqId);

  const missingGaps = candidate.latestMatch?.skillGaps.filter((g) => g.gapType === "MISSING") || [];
  const partialGaps = candidate.latestMatch?.skillGaps.filter((g) => g.gapType === "PARTIAL") || [];
  const unprovenGaps = candidate.latestMatch?.skillGaps.filter((g) => g.gapType === "UNPROVEN") || [];

  const activeDisplayName = blindMode
    ? (candidate.anonymizedName || "Candidate")
    : (candidate.name || "Candidate Profile");

  const activeEmail = blindMode
    ? "[REDACTED FOR BLIND SCREENING]"
    : candidate.email;

  function resolveCandidateText(text: string | null | undefined): string {
    if (!text) return "";
    let resolved = text;

    // Replace standard template placeholder
    resolved = resolved.replaceAll("{{CANDIDATE_NAME}}", activeDisplayName);

    if (blindMode) {
      // Redact real name if present in text
      if (candidate?.name && candidate.name.trim().length > 1) {
        const trimmed = candidate.name.trim();
        resolved = resolved.replace(new RegExp(trimmed, "gi"), activeDisplayName);
        const first = trimmed.split(/\s+/)[0];
        if (first && first.length > 2) {
          resolved = resolved.replace(new RegExp(`\\b${first}\\b`, "gi"), activeDisplayName);
        }
      }
    } else {
      // If blindMode is off, replace any "Candidate [A-Z]" or anonymizedName with real name
      if (candidate?.name && candidate.name.trim().length > 1) {
        resolved = resolved.replace(/\bCandidate\s+[A-Z]\b/gi, candidate.name.trim());
        if (candidate.anonymizedName) {
          resolved = resolved.replace(new RegExp(candidate.anonymizedName, "gi"), candidate.name.trim());
        }
      }
    }

    return resolved;
  }

  return (
    <ErrorBoundary fallbackTitle="Candidate Detail Page Error">
      <main className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-16">
        <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Header Card */}
          <header className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition"
              >
                ← Dashboard
              </Link>

              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-extrabold text-slate-900">
                    {activeDisplayName}
                  </h1>

                  {candidate.parseConfidence === "LOW" && (
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                      Scanned PDF
                    </span>
                  )}

                  {candidate.suspiciousContents.length > 0 && (
                    <button
                      onClick={() => setShowSecurityModal(true)}
                      className="px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-bold shadow-sm hover:bg-rose-600 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Flagged Injection ({candidate.suspiciousContents.length})
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {activeEmail} • Candidate ID: <span className="font-mono text-slate-500">{candidate.id.slice(0, 8)}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Blind Screening Toggle */}
              <button
                onClick={toggleBlindMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition border cursor-pointer ${
                  blindMode
                    ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                }`}
              >
                {blindMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>Blind Screening {blindMode ? "ON" : "OFF"}</span>
              </button>

              {candidate.latestMatch && (
                <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Match Role</span>
                    <p className="text-xs font-bold text-blue-600">
                      {candidate.latestMatch.jobDescriptionTitle}
                    </p>
                  </div>
                  <div className="px-4 py-2 rounded-2xl bg-blue-500 text-white font-extrabold text-base shadow-sm">
                    {candidate.latestMatch.overallScore.toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* Warm AI Insight Synthesis Banner */}
          {candidate.latestMatch?.contextualSummary && (
            <div className="bg-amber-100/90 border border-amber-300 rounded-3xl p-6 text-amber-950 space-y-2 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-xs text-orange-600 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 fill-orange-500" />
                Role-Fit AI Insight Synthesis
              </div>
              <p className="text-xs leading-relaxed font-medium">
                {resolveCandidateText(candidate.latestMatch.contextualSummary)}
              </p>
            </div>
          )}

          {/* General Recruiter Summary Card */}
          {candidate.generalSummary && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Recruiter Profile Overview
              </span>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {resolveCandidateText(candidate.generalSummary)}
              </p>
            </div>
          )}

          {/* Split View: Requirements Matrix vs Candidate Evidence */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Requirements Matrix (5 Cols) */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900">Requirements Matrix</h3>
                <span className="text-[11px] text-slate-400 font-medium">Click to inspect</span>
              </div>

              <div className="space-y-2">
                {candidate.latestMatch?.requirementScores.map((req, idx) => {
                  const isSelected = req.id === selectedReqId;
                  const isGoodMatch = req.similarityScore >= 0.5;

                  return (
                    <div
                      key={req.id}
                      onClick={() => setSelectedReqId(req.id)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                        isSelected
                          ? "bg-blue-50 border-blue-400 shadow-sm text-slate-900"
                          : "bg-slate-50/70 border-slate-200/80 hover:border-blue-400/60 text-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-mono text-xs font-bold text-slate-400">
                          #{String(idx + 1).padStart(2, "0")}
                        </span>

                        <div className="flex-1 space-y-1.5">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              req.priority === "REQUIRED"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {req.priority}
                          </span>
                          <p className="text-xs font-semibold leading-snug">{req.requirementText}</p>
                        </div>

                        <div className="text-right flex-shrink-0">
                          {isGoodMatch ? (
                            <span className="px-2.5 py-1 rounded-full bg-blue-500 text-white font-mono font-bold text-xs shadow-sm">
                              {(req.similarityScore * 100).toFixed(0)}%
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-500 font-semibold text-[10px]">
                              No Evidence
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Matched Resume Evidence & Probe Questions (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Active Requirement Evidence Spotlight */}
              {selectedReq && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500" />
                      Matched Resume Evidence
                    </h3>
                    <span className="font-mono text-xs font-extrabold text-blue-600">
                      Similarity: {(selectedReq.similarityScore * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-500">
                      Target Requirement: <span className="text-slate-900">{selectedReq.requirementText}</span>
                    </p>

                    {selectedReq.similarityScore >= 0.5 && selectedReq.evidenceText ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-1 text-slate-900 font-sans text-xs">
                        <p className="font-bold text-sm text-blue-950">"{selectedReq.evidenceText}"</p>
                        {selectedReq.evidenceSourceSpan && (
                          <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">
                            Source: {selectedReq.evidenceSourceSpan}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs font-semibold text-rose-800">
                        No conclusive evidence found in candidate resume (similarity score below 50% threshold).
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Categorized Skill Gap Breakdown */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3">
                  Skill Gap & Qualification Breakdown
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
                  {/* MISSING GAPS */}
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
                    <span className="text-rose-700 font-bold uppercase text-[11px]">
                      Missing Gaps ({missingGaps.length})
                    </span>
                    {missingGaps.length === 0 ? (
                      <p className="text-[11px] text-slate-400 font-normal">None detected</p>
                    ) : (
                      <ul className="space-y-1">
                        {missingGaps.map((g) => (
                          <li key={g.id} className="text-rose-800 font-medium">
                            • {g.skillName}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* PARTIAL GAPS */}
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                    <span className="text-amber-700 font-bold uppercase text-[11px]">
                      Partial Gaps ({partialGaps.length})
                    </span>
                    {partialGaps.length === 0 ? (
                      <p className="text-[11px] text-slate-400 font-normal">None detected</p>
                    ) : (
                      <ul className="space-y-1">
                        {partialGaps.map((g) => (
                          <li key={g.id} className="text-amber-800 font-medium">
                            • {g.skillName}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* UNPROVEN GAPS */}
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
                    <span className="text-blue-700 font-bold uppercase text-[11px]">
                      Unproven Gaps ({unprovenGaps.length})
                    </span>
                    {unprovenGaps.length === 0 ? (
                      <p className="text-[11px] text-slate-400 font-normal">None detected</p>
                    ) : (
                      <ul className="space-y-1">
                        {unprovenGaps.map((g) => (
                          <li key={g.id} className="text-blue-800 font-medium">
                            • {g.skillName}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* AI-Grounded Interview Probe Questions */}
              {candidate.latestMatch?.interviewQuestions && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
                  <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3">
                    AI-Grounded Interview Probe Questions
                  </h3>

                  <div className="space-y-3">
                    {candidate.latestMatch.interviewQuestions.map((q, qIdx) => (
                      <div
                        key={q.id}
                        className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2"
                      >
                        <div className="flex items-center gap-2 text-[10px] font-bold">
                          <span
                            className={`px-2.5 py-0.5 rounded-full ${
                              q.category === "TECHNICAL"
                                ? "bg-blue-500 text-white"
                                : "bg-orange-500 text-white"
                            }`}
                          >
                            {q.category}
                          </span>
                          <span className="text-slate-400">Question #{qIdx + 1}</span>
                        </div>

                        <p className="text-xs font-bold text-slate-900 leading-relaxed">
                          {resolveCandidateText(q.questionText)}
                        </p>

                        {q.reasoning && (
                          <div className="bg-slate-100 rounded-xl p-3 text-[11px] text-slate-600 font-medium">
                            AI Reasoning: {resolveCandidateText(q.reasoning)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Security Modal for Prompt Injection */}
        {showSecurityModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-rose-200 rounded-3xl max-w-xl w-full p-6 space-y-4 text-xs shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-bold text-rose-600 text-sm flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" />
                  Prompt Injection Analysis Report
                </span>
                <button
                  onClick={() => setShowSecurityModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {candidate.suspiciousContents.map((s, sIdx) => (
                  <div key={s.id} className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-1">
                    <p className="font-bold text-rose-800 text-xs">Flag #{sIdx + 1}: {s.detectionReason}</p>
                    <pre className="p-3 bg-slate-100 text-rose-700 text-[10px] font-mono rounded-xl whitespace-pre-wrap border border-rose-200">
                      {s.flaggedText}
                    </pre>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowSecurityModal(false)}
                  className="px-5 py-2.5 rounded-full bg-slate-900 text-white font-bold text-xs shadow transition cursor-pointer"
                >
                  Close Report
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </ErrorBoundary>
  );
}
