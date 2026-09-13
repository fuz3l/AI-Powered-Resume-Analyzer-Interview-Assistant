"use client";

import React from "react";
import Link from "next/link";
import {
  SquaresFour,
  ShieldCheck,
  Sparkle,
  Cpu,
  ArrowRight,
  FileText,
  Lock,
} from "@phosphor-icons/react";

export default function Footer() {
  return (
    <footer className="w-full bg-slate-100 border-t border-slate-200/80 mt-auto py-8">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Main Footer Bento Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-8">
          
          {/* Header Row: Brand Identity & Active Protocols */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center">
                <img
                  src="/logo.png"
                  alt="Evidently"
                  className="h-9 sm:h-10 w-auto object-contain"
                />
              </Link>
              <div className="hidden sm:block border-l border-slate-200 pl-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    v2.0
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500">
                  AI ATS evaluation, vector match scoring, & bias masking
                </p>
              </div>
            </div>

            {/* Protocol Status Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDF3EC] text-[#346538] border border-[#D3E5D2] text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#346538] animate-pulse"></span>
                Gemini Engine Active
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E1F3FE] text-[#1F6C9F] border border-[#C6E7FD] text-xs font-semibold">
                <Cpu weight="fill" className="w-3.5 h-3.5" />
                768d Vector Index
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold">
                <Lock weight="fill" className="w-3.5 h-3.5" />
                Blind Screening Ready
              </span>
            </div>
          </div>

          {/* 4-Column Navigation & Spec Directory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8">
            
            {/* Col 1: Platform Overview */}
            <div className="lg:col-span-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Sparkle weight="fill" className="w-3.5 h-3.5 text-teal-600" />
                About Evidently
              </h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                An objective candidate evaluation system. Combines 768-dimensional
                semantic embedding similarity with structured textual reasoning to provide
                auditable evidence citations, skill gap categorizations, and grounded
                interview questions without subjective recruiter bias.
              </p>
              <div className="pt-1 text-xs text-slate-400 font-medium">
                Built with Next.js, Google Gemini, and Appwrite Database.
              </div>
            </div>

            {/* Col 2: Platform Navigation */}
            <div className="lg:col-span-2 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Platform Index
              </h4>
              <ul className="space-y-2 text-xs font-medium text-slate-600">
                <li>
                  <Link
                    href="/dashboard"
                    className="hover:text-teal-600 transition flex items-center gap-1.5"
                  >
                    <ArrowRight weight="bold" className="w-3 h-3 text-slate-400" />
                    Candidate Matrix
                  </Link>
                </li>
                <li>
                  <Link
                    href="/job-descriptions"
                    className="hover:text-teal-600 transition flex items-center gap-1.5"
                  >
                    <ArrowRight weight="bold" className="w-3 h-3 text-slate-400" />
                    Job Positions
                  </Link>
                </li>
                <li>
                  <Link
                    href="/"
                    className="hover:text-teal-600 transition flex items-center gap-1.5"
                  >
                    <ArrowRight weight="bold" className="w-3 h-3 text-slate-400" />
                    Batch Upload
                  </Link>
                </li>
                <li>
                  <Link
                    href="/how-to-use"
                    className="hover:text-teal-600 transition flex items-center gap-1.5"
                  >
                    <ArrowRight weight="bold" className="w-3 h-3 text-slate-400" />
                    How to Use
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Verification Standards */}
            <div className="lg:col-span-3 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <FileText weight="fill" className="w-3.5 h-3.5 text-teal-600" />
                Audit Standards
              </h4>
              <ul className="space-y-2 text-xs text-slate-500 font-medium">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0"></span>
                  <span><strong>Grounded Proof:</strong> Scores link directly to verbatim quotes in the resume.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0"></span>
                  <span><strong>Deficit Typology:</strong> Gaps tagged as Missing, Partial, or Unproven.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0"></span>
                  <span><strong>Injection Defense:</strong> Multi-layer defense filters malicious prompts.</span>
                </li>
              </ul>
            </div>

            {/* Col 4: Live Technical Specifications */}
            <div className="lg:col-span-3 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <ShieldCheck weight="fill" className="w-3.5 h-3.5 text-teal-600" />
                System Parameters
              </h4>
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Vector Dimension</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200">
                    768-dim
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">AI Inference</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200">
                    Gemini Flash
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Data Store</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200">
                    Appwrite DB
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Bias Protocol</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200">
                    PII Redaction
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Bar: Copyright & Operational State */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500">
            <p>
              Evidently © {new Date().getFullYear()} — Autonomous Resume Intelligence & Screening.
            </p>
            <div className="flex items-center gap-4 text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                All Systems Operational
              </span>
              <span>•</span>
              <Link href="/how-to-use" className="text-slate-600 hover:text-slate-900 transition">
                Documentation
              </Link>
            </div>
          </div>

        </div>

      </div>
    </footer>
  );
}
