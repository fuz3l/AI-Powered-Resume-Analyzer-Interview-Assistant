import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-[#FFFFFF] border-t border-[#EAEAEA] text-[#787774] text-xs mt-auto">
      <div className="max-w-5xl mx-auto px-6 py-16">
        
        {/* Top Grid: Bento-style minimal layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#EAEAEA]">
          
          {/* Brand & Editorial Mission */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 bg-[#111111] rounded-sm"></span>
              <span className="text-sm font-semibold tracking-tight text-[#111111]">
                Candidate Matrix
              </span>
              <span className="text-[10px] uppercase tracking-[0.05em] px-2 py-0.5 rounded-full bg-[#F7F6F3] text-[#787774] border border-[#EAEAEA]">
                v2.0
              </span>
            </div>

            <p className="text-xs text-[#787774] leading-relaxed max-w-sm">
              An editorial candidate evaluation system. Combines high-dimensional vector 
              indexing with structured textual reasoning to provide verifiable resume 
              citations and bias-free screening.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EDF3EC] text-[#346538] text-[10px] uppercase tracking-[0.05em] font-medium border border-[#346538]/10">
                <span className="w-1.5 h-1.5 rounded-full bg-[#346538]"></span>
                Gemini Engine Active
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E1F3FE] text-[#1F6C9F] text-[10px] uppercase tracking-[0.05em] font-medium border border-[#1F6C9F]/10">
                Blind Screening Ready
              </span>
            </div>
          </div>

          {/* Navigation Directory */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#111111]">
              Platform Index
            </h4>
            <ul className="space-y-2 font-normal text-xs text-[#787774]">
              <li>
                <Link
                  href="/dashboard"
                  className="hover:text-[#111111] transition-colors"
                >
                  Candidate Matrix
                </Link>
              </li>
              <li>
                <Link
                  href="/job-descriptions"
                  className="hover:text-[#111111] transition-colors"
                >
                  Job Positions
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="hover:text-[#111111] transition-colors"
                >
                  Batch Upload
                </Link>
              </li>
              <li>
                <Link
                  href="/how-to-use"
                  className="hover:text-[#111111] transition-colors font-medium text-[#111111]"
                >
                  User Guide & Documentation
                </Link>
              </li>
            </ul>
          </div>

          {/* Technical Specifications */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#111111]">
              System Parameters
            </h4>
            <div className="border border-[#EAEAEA] rounded-lg p-3.5 space-y-2 bg-[#FBFBFA]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#787774]">Inference Model</span>
                <span className="font-mono text-[#111111]">Gemini 1.5</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#787774]">Embedding Index</span>
                <span className="font-mono text-[#111111]">pgvector 768d</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#787774]">Bias Protocol</span>
                <span className="font-mono text-[#111111]">PII Masking</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Colophon */}
        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-[#787774]">
          <div>
            Candidate Matrix — Editorial Candidate Intelligence Protocol.
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#346538]"></span>
            <span>All systems nominal</span>
            <span>·</span>
            <Link href="/how-to-use" className="hover:text-[#111111] transition-colors">
              Documentation
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
