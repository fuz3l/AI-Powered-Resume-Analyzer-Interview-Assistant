"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  SquaresFour,
  Sparkle,
  ArrowRight,
  Check,
  Warning,
  CaretDown,
} from "@phosphor-icons/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface JobRequirement {
  id?: string;
  text: string;
  category?: "SKILL" | "EXPERIENCE" | "EDUCATION" | "RESPONSIBILITY" | "PERK_OR_CULTURE";
  priority: "REQUIRED" | "NICE_TO_HAVE";
}

interface JobDescription {
  id: string;
  title: string;
  rawText: string;
  requirements: JobRequirement[];
  createdAt: string;
}

export default function JobDescriptionsPage() {
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([]);
  const [selectedJd, setSelectedJd] = useState<JobDescription | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Form State
  const [titleInput, setTitleInput] = useState<string>("");
  const [rawTextInput, setRawTextInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchJobDescriptions();
  }, []);

  const fetchJobDescriptions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/job-descriptions");
      const data = await res.json();
      if (data.jobDescriptions) {
        setJobDescriptions(data.jobDescriptions);
        if (data.jobDescriptions.length > 0) {
          setSelectedJd(data.jobDescriptions[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching job descriptions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanText = rawTextInput.trim();
    if (!cleanText || cleanText.length < 30) {
      setFormError("Please enter a full job description (at least 30 characters).");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/job-descriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleInput.trim() || undefined,
          rawText: cleanText,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to parse job description.");
      }

      setTitleInput("");
      setRawTextInput("");
      fetchJobDescriptions();
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ErrorBoundary fallbackTitle="Job Descriptions Page Error">
      <main className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-16">
        <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Header Card */}
          <header className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <Link href="/dashboard" className="flex items-center">
                <img
                  src="/logo.png"
                  alt="Evidently"
                  className="h-8 sm:h-9 w-auto object-contain"
                />
              </Link>
              <div className="hidden md:block border-l border-slate-200 pl-3.5">
                <p className="text-xs font-medium text-slate-500 whitespace-nowrap">
                  Job Position & Requirements Matrix Mode
                </p>
              </div>
            </div>

            <nav className="flex items-center gap-1 sm:gap-1.5 bg-slate-100 p-1.5 rounded-full border border-slate-200/80 font-medium text-xs flex-shrink-0">
              <Link
                href="/dashboard"
                className="px-3 sm:px-4 py-2 rounded-full text-slate-600 hover:text-slate-900 transition whitespace-nowrap"
              >
                Candidate Matrix
              </Link>
              <Link
                href="/job-descriptions"
                className="px-4 sm:px-5 py-2 rounded-full bg-slate-900 text-white font-semibold shadow-sm transition whitespace-nowrap"
              >
                Job Positions
              </Link>
              <Link
                href="/"
                className="px-3 sm:px-4 py-2 rounded-full text-slate-600 hover:text-slate-900 transition whitespace-nowrap"
              >
                Batch Upload
              </Link>
              <Link
                href="/how-to-use"
                className="px-3 sm:px-4 py-2 rounded-full text-slate-600 hover:text-slate-900 transition whitespace-nowrap"
              >
                How to Use
              </Link>
            </nav>

            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-amber-400 text-slate-900 font-bold text-xs flex items-center justify-center shadow-sm">
                HR
              </div>
            </div>
          </header>

          {/* Main Grid: Create JD Form (5 Cols) vs Extracted Matrix (7 Cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Create JD Form */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-6">
              <div className="space-y-1">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                  ✨ Gemini Structured Parsing Mode
                </span>
                <h2 className="text-xl font-bold text-slate-900 pt-1">
                  Add Job Description
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Paste raw job posting text to extract discrete requirements and generate 768-dim vector embeddings.
                </p>
              </div>

              <form onSubmit={handleCreateJd} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Role Title (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Senior React & Next.js Full-Stack Developer"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 py-2.5 px-4 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Raw Job Posting Text <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={8}
                    placeholder="Paste job description requirements, qualifications, and role responsibilities here..."
                    value={rawTextInput}
                    onChange={(e) => setRawTextInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-4 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 leading-relaxed font-sans"
                  />
                </div>

                {formError && (
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <Warning weight="fill" className="w-4 h-4 flex-shrink-0 text-rose-600" />
                    <span>{formError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Parsing Requirements with Gemini AI...
                    </>
                  ) : (
                    <>
                      <Plus weight="bold" className="w-4 h-4" />
                      Parse & Store Job Position
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right Column: Existing Job Descriptions & Extracted Requirements */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Selector List */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-sm text-slate-900">Active Job Positions</h3>
                  <span className="text-xs text-slate-500 font-medium">{jobDescriptions.length} Registered</span>
                </div>

                {loading ? (
                  <div className="py-6 flex flex-col items-center gap-2">
                    <img src="/loading.gif" alt="Loading..." className="w-12 h-12" />
                    <p className="text-xs text-slate-400 font-medium">Loading positions...</p>
                  </div>
                ) : jobDescriptions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-medium">No job positions created yet.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {jobDescriptions.map((jd) => {
                      const isSelected = selectedJd?.id === jd.id;
                      return (
                        <button
                          key={jd.id}
                          onClick={() => setSelectedJd(jd)}
                          className={`px-4 py-2 rounded-full text-xs font-bold transition border ${
                            isSelected
                              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                              : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          {jd.title}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected JD Requirements Matrix */}
              {selectedJd && (() => {
                const allReqs = Array.isArray(selectedJd.requirements) ? selectedJd.requirements : [];
                const scoringReqs = allReqs.filter((r) => r.category !== "PERK_OR_CULTURE");
                const perkReqs = allReqs.filter((r) => r.category === "PERK_OR_CULTURE");

                const getCategoryBadgeClass = (category?: string) => {
                  switch (category) {
                    case "EXPERIENCE":
                      return "bg-[#E1F3FE] text-[#1F6C9F] border border-[#C6E7FD]";
                    case "EDUCATION":
                      return "bg-[#FBF3DB] text-[#8F6B00] border border-[#F5E5B8]";
                    case "RESPONSIBILITY":
                      return "bg-purple-50 text-purple-700 border border-purple-200";
                    default:
                      return "bg-[#EDF3EC] text-[#346538] border border-[#D3E5D2]";
                  }
                };

                return (
                  <div className="space-y-6">
                    {/* Genuine Candidate Scoring Requirements */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <h3 className="font-extrabold text-base text-slate-900">{selectedJd.title}</h3>
                          <p className="text-xs text-slate-500 font-medium">
                            {scoringReqs.length} Candidate Scoring Requirements Extracted
                          </p>
                        </div>

                        <Link
                          href={`/dashboard?jobDescriptionId=${selectedJd.id}`}
                          className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition inline-flex items-center gap-1"
                        >
                          Evaluate Candidates <ArrowRight weight="bold" className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                      <div className="space-y-3">
                        {scoringReqs.map((req, rIdx) => (
                          <div
                            key={rIdx}
                            className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex items-start justify-between gap-3"
                          >
                            <div className="flex items-start gap-3">
                              <span className="font-mono font-bold text-xs text-slate-400">
                                #{String(rIdx + 1).padStart(2, "0")}
                              </span>
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                                  {req.text}
                                </p>
                                <div className="flex items-center gap-1.5 pt-0.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getCategoryBadgeClass(
                                      req.category
                                    )}`}
                                  >
                                    {req.category || "SKILL"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase flex-shrink-0 ${
                                req.priority === "REQUIRED"
                                  ? "bg-slate-900 text-white"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {req.priority}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Role & Company Context (Perks & Culture - Excluded from candidate scoring) */}
                    {perkReqs.length > 0 && (
                      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-slate-900">Role & Company Context</h4>
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                                Recruiter Reference Only
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                              Benefits, workplace culture, and company amenities. These items are excluded from candidate scoring calculations.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2.5">
                          {perkReqs.map((perk, pIdx) => (
                            <div
                              key={pIdx}
                              className="bg-slate-50/70 rounded-2xl p-3.5 border border-slate-200/70 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2.5 text-slate-700 font-medium">
                                <span className="text-slate-400">•</span>
                                <span>{perk.text}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-600 text-[10px] font-semibold flex-shrink-0">
                                Context Only
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>
          </div>

        </div>
      </main>
    </ErrorBoundary>
  );
}
