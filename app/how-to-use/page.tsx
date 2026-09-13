"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  FileText,
  CloudArrowUp,
  Lightning,
  ShieldCheck,
  CaretDown,
  ArrowRight,
  Sparkle,
  Lock,
  SquaresFour,
  CheckCircle,
  Warning,
  Question,
  Clock,
  Trophy,
} from "@phosphor-icons/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function HowToUsePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const steps = [
    {
      index: "01",
      tag: "Configuration",
      tagStyle: "bg-[#E1F3FE] text-[#1F6C9F] border border-[#C6E7FD]",
      iconColor: "bg-blue-600",
      title: "Establish Job Criteria & Priorities",
      summary: "Define target positions and extract structured requirements from raw text.",
      description:
        "Every evaluation in Evidently functions relative to a defined job position. Paste job postings directly into the system. The parser decomposes unstructured text into discrete competencies, years of experience, and qualifications, calibrating relative weights for each requirement.",
      actionLabel: "Set Up Job Positions",
      actionHref: "/job-descriptions",
      points: [
        {
          label: "Position Setup",
          detail: "Specify job title, department, and paste the raw job description.",
        },
        {
          label: "Attribute Extraction",
          detail: "Automated extraction of core skills, experience depth, and education standards.",
        },
        {
          label: "Weight Calibration",
          detail: "Requirements classified by priority (Required vs. Nice-to-Have).",
        },
      ],
      shortcut: "Alt + 1",
    },
    {
      index: "02",
      tag: "Ingestion",
      tagStyle: "bg-[#EDF3EC] text-[#346538] border border-[#D3E5D2]",
      iconColor: "bg-teal-500",
      title: "Batch Resume Ingestion & Parsing",
      summary: "Multi-document ingestion with PDF & DOCX structural parsing.",
      description:
        "Upload batches of candidate resumes directly. The background parser handles complex multi-column layouts, runs textual extraction with OCR fallback for scanned documents, structures candidate experience chronologically, and computes 768-dimensional semantic embeddings.",
      actionLabel: "Go to Batch Ingestion",
      actionHref: "/",
      points: [
        {
          label: "Multi-File Queue",
          detail: "Upload single documents or bulk folders up to 10MB per document.",
        },
        {
          label: "Pipeline States",
          detail: "Real-time state transitions through Parsing, Summarizing, and Vectorization.",
        },
        {
          label: "Embedding Indexing",
          detail: "Dense 768-dimensional vector representations indexed for ultra-fast matching.",
        },
      ],
      shortcut: "Alt + 2",
    },
    {
      index: "03",
      tag: "Scoring Engine",
      tagStyle: "bg-[#FBF3DB] text-[#8F6B00] border border-[#F5E5B8]",
      iconColor: "bg-purple-600",
      title: "Matrix Evaluation & Blind Screening",
      summary: "Two-phase scoring combining vector cosine similarity with generative reasoning.",
      description:
        "Match your candidate pool against the chosen job position with a single click. The dual-layer pipeline first performs high-speed cosine vector ranking, followed by requirement-by-requirement verification with quote extraction. Enable Blind Screening to mask candidate names and emails for unbiased preliminary reviews.",
      actionLabel: "View Candidate Matrix",
      actionHref: "/dashboard",
      points: [
        {
          label: "Position Selection",
          detail: "Select the active job position from the matrix header dropdown.",
        },
        {
          label: "Scoring Execution",
          detail: "Trigger scoring to generate granular, weighted 0–100% match scores.",
        },
        {
          label: "PII Masking",
          detail: "Toggle Blind Screening to redact names, contact details, and identifiers.",
        },
      ],
      shortcut: "Alt + 3",
    },
    {
      index: "04",
      tag: "Investigation",
      tagStyle: "bg-[#FDEBEC] text-[#9F2F2D] border border-[#F9D2D5]",
      iconColor: "bg-rose-500",
      title: "Audit Evidence & Generate Interview Questions",
      summary: "Inspect verified resume citations, categorize skill gaps, and build targeted question sets.",
      description:
        "Select any candidate record to view their detailed dossier. Instead of opaque scoring, inspect the exact sentence citations extracted from their resume that substantiate each requirement score. Review identified skill gaps and generate technical and behavioral interview questions targeted directly at unverified claims.",
      actionLabel: "Inspect Candidates",
      actionHref: "/dashboard",
      points: [
        {
          label: "Evidence Citations",
          detail: "Every requirement score links directly to verifiable quotes in the candidate resume.",
        },
        {
          label: "Gap Categorization",
          detail: "Deficits classified as Missing (absent), Partial (insufficient), or Unproven (unverified).",
        },
        {
          label: "Question Generation",
          detail: "Targeted interview prompts designed to probe identified candidate weaknesses.",
        },
      ],
      shortcut: "Alt + 4",
    },
  ];

  const faqs = [
    {
      q: "Why are candidates only displayed for their selected Job Position?",
      a: "Evidently strictly isolates candidates to the job positions they were uploaded for. Each role's talent pool is independently maintained to avoid cross-job contamination. If you switch positions in the matrix dropdown, you see only the resumes designated for that specific role.",
    },
    {
      q: "How does the dual-stage scoring algorithm operate?",
      a: "The engine employs two complementary layers: First, 768-dimensional vector cosine similarity evaluates global semantic alignment between candidate competency embeddings and requirement vectors. Second, Gemini performs strict textual reasoning across each requirement, verifying concrete project evidence and calculating a weighted 0–100% composite score.",
    },
    {
      q: "What data is redacted during Blind Screening mode?",
      a: "Blind Screening strips all Personally Identifiable Information (PII), including candidate legal names, phone numbers, and email addresses, replacing them with anonymous identifiers (e.g., Candidate 6aa4) to prevent unconscious bias during initial shortlisting.",
    },
    {
      q: "Which file formats are supported for ingestion?",
      a: "Evidently accepts PDF (.pdf) and Microsoft Word (.docx) documents. Ingestion includes automated structural cleanup, multi-column compensation, and an OCR fallback heuristic for scanned documents.",
    },
    {
      q: "Can job requirements be modified after candidates are scored?",
      a: "Yes. You can edit requirements or adjust importance weights in Job Positions at any time. Returning to the Candidate Matrix and triggering 'Run AI Match' will recalculate scores against the revised specification.",
    },
    {
      q: "How does Prompt Injection defense work?",
      a: "All uploaded resumes are sanitized by a multi-tier security filter. Resumes attempting to override evaluation instructions (such as hidden text instructing the AI to output a 100% score) are flagged with a Security Alert badge and neutralized before scoring.",
    },
  ];

  return (
    <ErrorBoundary fallbackTitle="User Guide Error">
      <main className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-16">
        <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Header Card (Matching Dashboard & Job Positions Navigation) */}
          <header className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <Link href="/dashboard" className="flex items-center">
                <img
                  src="/logo.png"
                  alt="Evidently"
                  className="h-8 sm:h-9 w-auto object-contain"
                />
              </Link>
              <div className="hidden xl:flex items-center gap-2 pl-3.5 border-l border-slate-200">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                  v2.0
                </span>
                <p className="text-xs font-medium text-slate-500 whitespace-nowrap">
                  Operating guide, system architecture, & evaluation protocols
                </p>
              </div>
            </div>

            {/* Navigation Pills */}
            <nav className="flex items-center gap-1 sm:gap-1.5 bg-slate-100 p-1.5 rounded-full border border-slate-200/80 font-medium text-xs flex-shrink-0">
              <Link
                href="/dashboard"
                className="px-3 sm:px-4 py-2 rounded-full text-slate-600 hover:text-slate-900 transition whitespace-nowrap"
              >
                Candidate Matrix
              </Link>
              <Link
                href="/job-descriptions"
                className="px-3 sm:px-4 py-2 rounded-full text-slate-600 hover:text-slate-900 transition whitespace-nowrap"
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
                className="px-4 sm:px-5 py-2 rounded-full bg-slate-900 text-white font-semibold shadow-sm transition whitespace-nowrap"
              >
                How to Use
              </Link>
            </nav>

            {/* Quick Action Button */}
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm flex items-center gap-1.5"
              >
                <Sparkle weight="fill" className="w-3.5 h-3.5" />
                <span>Open Matrix</span>
              </Link>
            </div>
          </header>

          {/* Hero / Overview Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#E1F3FE] text-[#1F6C9F] border border-[#C6E7FD] text-xs font-semibold">
                System Guide
              </span>
              <span className="text-xs text-slate-400 font-medium">Standard Operating Protocol</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                A methodical approach to objective candidate evaluation.
              </h2>
              <p className="text-sm text-slate-500 font-medium max-w-3xl leading-relaxed">
                Evidently structures talent acquisition into an auditable, verifiable pipeline:
                decomposing job requirements into semantic vectors, batch processing multi-format resumes,
                extracting grounded proof citations, and generating tailored interview questions without recruiter bias.
              </p>
            </div>

            {/* Quick Stats Bento Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Phase 01</span>
                <h4 className="text-sm font-bold text-slate-900">Define Position</h4>
                <p className="text-xs text-slate-500">Decompose unstructured text into weighted requirements.</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Phase 02</span>
                <h4 className="text-sm font-bold text-slate-900">Batch Ingest</h4>
                <p className="text-xs text-slate-500">PDF/DOCX extraction & 768d vectorization.</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Phase 03</span>
                <h4 className="text-sm font-bold text-slate-900">Evaluate & Mask</h4>
                <p className="text-xs text-slate-500">Cosine similarity matching + PII blind mode.</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Phase 04</span>
                <h4 className="text-sm font-bold text-slate-900">Audit & Probe</h4>
                <p className="text-xs text-slate-500">Grounded quote citations & targeted interview questions.</p>
              </div>
            </div>
          </div>

          {/* Section: 4 Operating Steps */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Step-by-Step Operating Protocol</h2>
                <p className="text-xs text-slate-500 font-medium">Follow this sequence to set up, ingest, and screen candidates</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-200 text-slate-700">
                4 Phases
              </span>
            </div>

            <div className="space-y-6">
              {steps.map((step) => (
                <div
                  key={step.index}
                  className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6 hover:border-teal-500/40 transition-all"
                >
                  {/* Step Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                        {step.index}
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${step.tagStyle}`}>
                        {step.tag}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">
                        {step.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">Shortcut:</span>
                      <kbd className="px-2 py-0.5 text-xs font-mono rounded bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
                        {step.shortcut}
                      </kbd>
                    </div>
                  </div>

                  {/* Summary & Description */}
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {step.summary}
                    </p>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* 3 Sub-phase detail cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {step.points.map((pt, pIdx) => (
                      <div
                        key={pIdx}
                        className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-1.5"
                      >
                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                          Phase {step.index}.{pIdx + 1}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">
                          {pt.label}
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          {pt.detail}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Step Footer with Action Link */}
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                    <span className="text-slate-400 font-medium">Ready to execute?</span>
                    <Link
                      href={step.actionHref}
                      className="px-4 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-sm flex items-center gap-1.5"
                    >
                      <span>{step.actionLabel}</span>
                      <ArrowRight weight="bold" className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Technical Specifications & Fit Tier Standards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left 7 Cols: Dual-Layer Scoring Logic */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
              <div className="border-b border-slate-100 pb-4 space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-teal-700 font-bold bg-teal-50 border border-teal-100 px-2.5 py-0.5 rounded-full">
                  Mathematical Framework
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Dual-Stage Scoring Architecture
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Deterministic evaluation standards combining vector similarity with grounded LLM reasoning
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Layer 1 */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-400">LAYER 01</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#E1F3FE] text-[#1F6C9F] text-xs font-semibold">
                      Vector Space
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">768-Dim Cosine Distance</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Resume items and requirement statements are projected into 768-dimensional space.
                    Cosine similarity calculates semantic proximity before qualitative verification.
                  </p>
                  <div className="font-mono text-[11px] text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">
                    cos(θ) = (A · B) / (||A|| ||B||)
                  </div>
                </div>

                {/* Layer 2 */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-400">LAYER 02</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#EDF3EC] text-[#346538] text-xs font-semibold">
                      Evidence Audit
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Proof Citation Verification</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    The engine audits candidate claims requirement-by-requirement, extracting direct
                    quotes from work experience bullets to prevent hallucination.
                  </p>
                  <div className="font-mono text-[11px] text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">
                    Score = ∑(S_i × W_i) / ∑W_i
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Score Classification Standards */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-5">
              <div className="border-b border-slate-100 pb-3 space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                  Score Calibration
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Fit Tier Classification Matrix
                </h3>
              </div>

              <div className="space-y-3">
                {/* Tier 1 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#EDF3EC] text-[#346538] border border-[#D3E5D2] text-xs font-semibold flex-shrink-0 mt-0.5">
                    ≥ 80%
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Strong Fit</h5>
                    <p className="text-xs text-slate-500 font-medium">
                      Demonstrates comprehensive evidence across all required competencies and multiple preferred skills.
                    </p>
                  </div>
                </div>

                {/* Tier 2 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FBF3DB] text-[#8F6B00] border border-[#F5E5B8] text-xs font-semibold flex-shrink-0 mt-0.5">
                    50% – 79%
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Moderate Fit</h5>
                    <p className="text-xs text-slate-500 font-medium">
                      Covers majority of baseline requirements with minor partial gaps or adjacent technologies.
                    </p>
                  </div>
                </div>

                {/* Tier 3 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FDEBEC] text-[#9F2F2D] border border-[#F9D2D5] text-xs font-semibold flex-shrink-0 mt-0.5">
                    &lt; 50%
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Gap Risk</h5>
                    <p className="text-xs text-slate-500 font-medium">
                      Significant missing prerequisites or unverified skill claims with absent work experience citations.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Section: Frequently Asked Questions (Interactive Accordion) */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
            <div className="border-b border-slate-100 pb-4 space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-xs">
                  <Question weight="fill" className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Frequently Asked Questions</h2>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Common questions about candidate matching, PII protection, and file processing
              </p>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border transition-all ${
                      isOpen
                        ? "bg-slate-50 border-teal-500/40 shadow-xs"
                        : "bg-white border-slate-200/80 hover:border-slate-300"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        {faq.q}
                      </span>
                      <CaretDown
                        weight="fill"
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                          isOpen ? "rotate-180 text-teal-600" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 sm:px-5 pb-4 text-xs text-slate-500 font-medium leading-relaxed border-t border-slate-200/40 pt-3">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Call to Action Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900">
                Ready to evaluate candidates against a position?
              </h3>
              <p className="text-xs text-slate-500 font-medium max-w-xl">
                Navigate to the Candidate Matrix to view score rankings and skill gaps, or upload fresh resumes to your pool.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <Link
                href="/dashboard"
                className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
              >
                <span>Candidate Matrix</span>
                <ArrowRight weight="bold" className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/"
                className="px-5 py-2.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition shadow-sm"
              >
                Batch Upload
              </Link>
            </div>
          </div>

        </div>
      </main>
    </ErrorBoundary>
  );
}
