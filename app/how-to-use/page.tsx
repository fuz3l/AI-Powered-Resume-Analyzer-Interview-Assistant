"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function HowToUsePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const steps = [
    {
      index: "01",
      tag: "Configuration",
      tagStyle: "bg-[#E1F3FE] text-[#1F6C9F]",
      title: "Establish Job Criteria",
      summary:
        "Define target positions and extract structured requirements from raw text.",
      description:
        "Every evaluation within Candidate Matrix functions relative to a defined job position. Paste job descriptions directly from your existing postings. Gemini decomposes unstructured text into discrete competencies, required years of practice, and qualifications, assigning relative weights to each requirement.",
      actions: [
        {
          label: "Open Job Positions",
          href: "/job-descriptions",
        },
      ],
      points: [
        {
          label: "Position Setup",
          detail: "Specify job title, department, and paste the raw description document.",
        },
        {
          label: "Attribute Extraction",
          detail: "Automated extraction of core skills, education standards, and seniority level.",
        },
        {
          label: "Weight Calibration",
          detail: "Requirements are calibrated by priority (Essential, Preferred, Secondary).",
        },
      ],
      shortcut: "Alt + 1",
    },
    {
      index: "02",
      tag: "Ingestion",
      tagStyle: "bg-[#EDF3EC] text-[#346538]",
      title: "Batch Resume Processing",
      summary:
        "Multi-document ingestion with PDF and DOCX structural parsing.",
      description:
        "Upload batches of candidate resumes directly. The background parser handles complex multi-column layouts, runs textual extraction with OCR fallback for scanned documents, structures candidate experience chronologically, and computes 768-dimensional semantic embeddings.",
      actions: [
        {
          label: "Go to Batch Ingestion",
          href: "/",
        },
      ],
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
          detail: "Dense vector representations stored directly in PostgreSQL pgvector.",
        },
      ],
      shortcut: "Alt + 2",
    },
    {
      index: "03",
      tag: "Scoring Engine",
      tagStyle: "bg-[#FBF3DB] text-[#956400]",
      title: "Run Matrix Evaluation & Blind Screening",
      summary:
        "Two-phase scoring combining pgvector cosine distance with generative reasoning.",
      description:
        "Match your candidate pool against the chosen job position with a single operation. The dual-layer pipeline first performs high-speed cosine vector ranking, followed by requirement-by-requirement verification with quote extraction. Enable Blind Screening to mask candidate names and institutions for unbiased preliminary reviews.",
      actions: [
        {
          label: "View Candidate Matrix",
          href: "/dashboard",
        },
      ],
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
          detail: "Toggle Blind Screening to redact names, contact details, and school prestige.",
        },
      ],
      shortcut: "Alt + 3",
    },
    {
      index: "04",
      tag: "Investigation",
      tagStyle: "bg-[#FDEBEC] text-[#9F2F2D]",
      title: "Audit Evidence & Generate Interview Questions",
      summary:
        "Inspect verified resume citations, categorize skill gaps, and build targeted question sets.",
      description:
        "Select any candidate record to view their detailed dossier. Instead of opaque scoring, inspect the exact sentence citations extracted from their resume that substantiate each requirement score. Review identified skill gaps and generate technical and behavioral interview questions targeted directly at unverified claims.",
      actions: [
        {
          label: "Inspect Candidates",
          href: "/dashboard",
        },
      ],
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
      q: "Why is a candidate's score marked as Pending?",
      a: "When resumes are initially uploaded, they are ingested into your talent pool without an active job comparison. Scores are calculated relative to a specific Job Position. To generate scores, navigate to the Candidate Matrix dashboard, choose your target job from the dropdown, and select Run AI Match.",
    },
    {
      q: "How does the dual-stage scoring algorithm operate?",
      a: "The engine employs two complementary layers: First, PostgreSQL pgvector computes cosine similarity between candidate semantic embeddings and requirement vectors. Second, Gemini performs strict textual reasoning across each requirement, verifying concrete project evidence and calculating a weighted 0–100% composite score.",
    },
    {
      q: "What data is redacted during Blind Screening mode?",
      a: "Blind Screening strips all Personally Identifiable Information (PII), including candidate legal names, contact numbers, email addresses, geographical locations, and academic institutions, replacing them with anonymous identifiers (e.g., Candidate #8A2F) to prevent bias during initial shortlisting.",
    },
    {
      q: "Which file formats are supported for ingestion?",
      a: "Candidate Matrix accepts PDF (.pdf) and Microsoft Word (.docx) documents. Ingestion includes automated structural cleanup and multi-column compensation.",
    },
    {
      q: "Can job requirements be modified after candidates are scored?",
      a: "Yes. You can edit requirements or adjust importance weights in Job Positions at any time. Returning to the Candidate Matrix and triggering Run AI Match will recalculate scores against the revised specification.",
    },
  ];

  return (
    <main className="min-h-screen bg-[#FBFBFA] text-[#111111] font-sans pb-24">
      <div className="max-w-5xl mx-auto px-6 pt-10 space-y-20">
        
        {/* Editorial Top Navigation */}
        <header className="border-b border-[#EAEAEA] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-[#111111] rounded-sm"></span>
            <div>
              <span className="text-sm font-semibold tracking-tight text-[#111111] block">
                Candidate Matrix
              </span>
              <span className="text-[11px] text-[#787774]">
                Operating Protocol & Documentation
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-1 text-xs">
            <Link
              href="/dashboard"
              className="px-3 py-1.5 text-[#787774] hover:text-[#111111] transition-colors"
            >
              Candidate Matrix
            </Link>
            <Link
              href="/job-descriptions"
              className="px-3 py-1.5 text-[#787774] hover:text-[#111111] transition-colors"
            >
              Job Positions
            </Link>
            <Link
              href="/"
              className="px-3 py-1.5 text-[#787774] hover:text-[#111111] transition-colors"
            >
              Batch Upload
            </Link>
            <span className="px-3 py-1.5 font-medium text-[#111111] border-b border-[#111111]">
              Guide
            </span>
          </nav>
        </header>

        {/* Hero Section: Editorial Serif Typography & Clean Macro-Whitespace */}
        <section className="space-y-6 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.05em] px-2.5 py-0.5 rounded-full bg-[#E1F3FE] text-[#1F6C9F] font-medium border border-[#1F6C9F]/10">
              System Manual
            </span>
            <span className="text-xs text-[#787774]">Document Reference: CM-2026</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#111111] tracking-tightest leading-[1.08] max-w-3xl">
            A methodical guide to automated candidate evaluation.
          </h1>

          <p className="text-[#787774] text-base sm:text-lg leading-relaxed max-w-2xl">
            Candidate Matrix structures recruitment into an auditable evaluation pipeline: 
            specifying requirement vectors, batch processing resumes, computing semantic 
            evidence citations, and generating targeted interview protocols.
          </p>

          <div className="pt-2 flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-[#111111] text-white text-xs font-medium rounded-md hover:bg-[#333333] active:scale-[0.98] transition-all"
            >
              Open Candidate Matrix
            </Link>
            <Link
              href="#protocol"
              className="px-4 py-2 border border-[#EAEAEA] text-[#111111] text-xs font-medium rounded-md hover:bg-[#F7F6F3] active:scale-[0.98] transition-all"
            >
              Read Operating Steps ↓
            </Link>
          </div>
        </section>

        {/* Faux-OS Window Chrome: Workflow Pipeline Preview */}
        <section className="border border-[#EAEAEA] rounded-xl bg-white overflow-hidden">
          {/* OS Window Top Bar */}
          <div className="px-4 py-3 bg-[#FBFBFA] border-b border-[#EAEAEA] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EAEAEA]"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#EAEAEA]"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#EAEAEA]"></span>
              <span className="text-[11px] font-mono text-[#787774] ml-2">pipeline.matrix.overview</span>
            </div>
            <span className="text-[10px] font-mono text-[#787774]">STATUS: SYNCHRONIZED</span>
          </div>

          {/* Asymmetrical Bento Grid */}
          <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2 border-l-2 border-[#111111] pl-3">
              <span className="font-mono text-xs text-[#787774]">01 / CRITERIA</span>
              <h3 className="text-sm font-semibold text-[#111111]">Job Position</h3>
              <p className="text-xs text-[#787774] leading-relaxed">
                Gemini parses raw job text into structured, weighted requirements.
              </p>
            </div>

            <div className="space-y-2 border-l-2 border-[#EAEAEA] pl-3">
              <span className="font-mono text-xs text-[#787774]">02 / INGESTION</span>
              <h3 className="text-sm font-semibold text-[#111111]">Batch Upload</h3>
              <p className="text-xs text-[#787774] leading-relaxed">
                Multi-format resume parsing and 768-dimensional vectorization.
              </p>
            </div>

            <div className="space-y-2 border-l-2 border-[#EAEAEA] pl-3">
              <span className="font-mono text-xs text-[#787774]">03 / MATCHING</span>
              <h3 className="text-sm font-semibold text-[#111111]">AI Evaluation</h3>
              <p className="text-xs text-[#787774] leading-relaxed">
                pgvector cosine distance + generative proof verification.
              </p>
            </div>

            <div className="space-y-2 border-l-2 border-[#EAEAEA] pl-3">
              <span className="font-mono text-xs text-[#787774]">04 / AUDITING</span>
              <h3 className="text-sm font-semibold text-[#111111]">Candidate Dossier</h3>
              <p className="text-xs text-[#787774] leading-relaxed">
                Verifiable quote citations, skill gap tags, and interview prompts.
              </p>
            </div>
          </div>
        </section>

        {/* Step-by-Step Operating Protocol (Bento Architecture) */}
        <section id="protocol" className="space-y-10">
          <div className="border-b border-[#EAEAEA] pb-4 flex items-end justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-[0.05em] text-[#787774] font-mono">
                PROCEDURAL WORKFLOW
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-[#111111] tracking-tight mt-1">
                Step-by-step operating execution
              </h2>
            </div>
            <span className="font-mono text-xs text-[#787774] hidden sm:block">
              4 SEQUENTIAL PHASES
            </span>
          </div>

          <div className="space-y-8">
            {steps.map((step) => (
              <article
                key={step.index}
                className="border border-[#EAEAEA] rounded-xl bg-white p-6 sm:p-8 space-y-6 hover:border-[#111111]/30 transition-colors"
              >
                {/* Header of Step Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAEAEA] pb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-[#111111] bg-[#F7F6F3] border border-[#EAEAEA] px-2.5 py-0.5 rounded">
                      {step.index}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-[0.05em] px-2 py-0.5 rounded-full font-medium ${step.tagStyle}`}
                    >
                      {step.tag}
                    </span>
                    <h3 className="text-base font-semibold text-[#111111]">
                      {step.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#787774]">Shortcut:</span>
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded border border-[#EAEAEA] bg-[#F7F6F3] text-[#2F3437]">
                      {step.shortcut}
                    </kbd>
                  </div>
                </div>

                {/* Body Text */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#111111]">
                    {step.summary}
                  </p>
                  <p className="text-xs text-[#787774] leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Sub-points Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {step.points.map((pt, pIdx) => (
                    <div
                      key={pIdx}
                      className="border border-[#EAEAEA] rounded-lg p-3.5 bg-[#FBFBFA] space-y-1"
                    >
                      <span className="font-mono text-[10px] text-[#787774] block">
                        Phase {step.index}.{pIdx + 1}
                      </span>
                      <h4 className="text-xs font-semibold text-[#111111]">
                        {pt.label}
                      </h4>
                      <p className="text-[11px] text-[#787774] leading-relaxed">
                        {pt.detail}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Card Action Footnote */}
                <div className="pt-2 flex items-center justify-between border-t border-[#EAEAEA]">
                  <span className="text-[11px] text-[#787774]">
                    Ready to execute?
                  </span>
                  <Link
                    href={step.actions[0].href}
                    className="text-xs font-medium text-[#111111] hover:underline flex items-center gap-1"
                  >
                    <span>{step.actions[0].label}</span>
                    <span>→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Technical Architecture: Dual-Layer Scoring */}
        <section className="space-y-6">
          <div className="border-b border-[#EAEAEA] pb-4">
            <span className="text-[10px] uppercase tracking-[0.05em] text-[#787774] font-mono">
              MATHEMATICAL SPECIFICATION
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#111111] tracking-tight mt-1">
              Scoring logic & evidence thresholds
            </h2>
            <p className="text-xs text-[#787774] mt-1">
              Deterministic evaluation standards with citation backing
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vector Space */}
            <div className="border border-[#EAEAEA] rounded-xl bg-white p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.05em] font-mono text-[#787774]">
                  LAYER 01
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E1F3FE] text-[#1F6C9F] font-mono">
                  pgvector
                </span>
              </div>
              <h3 className="text-sm font-semibold text-[#111111]">
                768-Dimensional Cosine Space
              </h3>
              <p className="text-xs text-[#787774] leading-relaxed">
                Full-text representations of candidate competency profiles and job specifications 
                are transformed into 768-dimensional floating-point embeddings. Cosine distance 
                computations rank global semantic relevance prior to granular verification.
              </p>
              <div className="border border-[#EAEAEA] rounded bg-[#FBFBFA] p-3 font-mono text-[11px] text-[#111111]">
                sim(A, B) = cos(θ) = (A · B) / (||A|| ||B||)
              </div>
            </div>

            {/* Generative Reasoning */}
            <div className="border border-[#EAEAEA] rounded-xl bg-white p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.05em] font-mono text-[#787774]">
                  LAYER 02
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EDF3EC] text-[#346538] font-mono">
                  Gemini 1.5
                </span>
              </div>
              <h3 className="text-sm font-semibold text-[#111111]">
                Requirement Evidence Audit
              </h3>
              <p className="text-xs text-[#787774] leading-relaxed">
                The model audits candidate records against each requirement independently. 
                Scores require textual citation extracted directly from the resume text. 
                Deficits are flagged as Missing, Partial, or Unproven.
              </p>
              <div className="border border-[#EAEAEA] rounded bg-[#FBFBFA] p-3 font-mono text-[11px] text-[#111111]">
                Score = ∑ (Score_i × Weight_i) / ∑ Weight_i
              </div>
            </div>
          </div>

          {/* Calibrated Brackets */}
          <div className="border border-[#EAEAEA] rounded-xl bg-white p-6 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-[#111111]">
              Score Classification Matrix
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border-l-2 border-[#346538] pl-3 space-y-1">
                <span className="font-mono text-xs font-bold text-[#346538]">85% — 100%</span>
                <h5 className="text-xs font-semibold text-[#111111]">Qualified Shortlist</h5>
                <p className="text-[11px] text-[#787774] leading-relaxed">
                  Direct verifiable evidence for all essential criteria. Recommended for interview.
                </p>
              </div>

              <div className="border-l-2 border-[#956400] pl-3 space-y-1">
                <span className="font-mono text-xs font-bold text-[#956400]">65% — 84%</span>
                <h5 className="text-xs font-semibold text-[#111111]">Review Required</h5>
                <p className="text-[11px] text-[#787774] leading-relaxed">
                  Demonstrates core capabilities with documented partial skill gaps in secondary areas.
                </p>
              </div>

              <div className="border-l-2 border-[#9F2F2D] pl-3 space-y-1">
                <span className="font-mono text-xs font-bold text-[#9F2F2D]">&lt; 65%</span>
                <h5 className="text-xs font-semibold text-[#111111]">Unqualified</h5>
                <p className="text-[11px] text-[#787774] leading-relaxed">
                  Missing primary qualifications or lacking evidence within submitted resume files.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Accordion FAQ (Stripped Container, Minimalist Borders, Sharp + / -) */}
        <section className="space-y-6">
          <div className="border-b border-[#EAEAEA] pb-4">
            <span className="text-[10px] uppercase tracking-[0.05em] text-[#787774] font-mono">
              INQUIRIES & RESOLUTIONS
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#111111] tracking-tight mt-1">
              Frequently asked questions
            </h2>
          </div>

          <div className="divide-y divide-[#EAEAEA] border-t border-b border-[#EAEAEA]">
            {faqs.map((faq, fIdx) => (
              <div key={fIdx} className="py-4">
                <button
                  type="button"
                  onClick={() => toggleFaq(fIdx)}
                  className="w-full text-left flex items-center justify-between gap-4 group cursor-pointer"
                >
                  <span className="text-sm font-medium text-[#111111] group-hover:text-[#787774] transition-colors">
                    {faq.q}
                  </span>
                  <span className="font-mono text-base text-[#787774] w-5 text-right shrink-0">
                    {openFaq === fIdx ? "−" : "+"}
                  </span>
                </button>
                {openFaq === fIdx && (
                  <div className="pt-3 pr-8 text-xs text-[#787774] leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Terminal Callout Box */}
        <section className="border border-[#EAEAEA] rounded-xl bg-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[#111111]">
              Initialize evaluation workflow
            </h3>
            <p className="text-xs text-[#787774]">
              Start by uploading candidate resumes or defining requirement criteria.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 bg-[#111111] text-white text-xs font-medium rounded-md hover:bg-[#333333] active:scale-[0.98] transition-all"
            >
              Batch Upload
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 border border-[#EAEAEA] text-[#111111] text-xs font-medium rounded-md hover:bg-[#F7F6F3] active:scale-[0.98] transition-all"
            >
              Open Matrix
            </Link>
          </div>
        </section>

      </div>
    </main>
  );
}
