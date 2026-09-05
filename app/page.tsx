"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import Link from "next/link";
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Sparkles,
  Zap,
  Layers,
  Plus,
} from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface BatchFileStatus {
  id: string;
  file: File;
  name: string;
  size: number;
  status: "QUEUED" | "PARSING" | "SUMMARIZING" | "SCORING" | "DONE" | "FAILED";
  stepMessage: string;
  candidateId?: string;
  candidateName?: string;
  error?: string;
  retryCount: number;
}

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [batchQueue, setBatchQueue] = useState<BatchFileStatus[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArr = Array.from(e.dataTransfer.files);
      addFilesToBatch(filesArr);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      addFilesToBatch(filesArr);
    }
  };

  const addFilesToBatch = (files: File[]) => {
    setGlobalError(null);

    if (!files || files.length === 0) {
      setGlobalError("Please select at least one PDF or DOCX file to upload.");
      return;
    }

    const validFiles: File[] = [];

    files.forEach((f) => {
      const nameLower = f.name.toLowerCase();
      if (nameLower.endsWith(".pdf") || nameLower.endsWith(".docx")) {
        validFiles.push(f);
      }
    });

    if (validFiles.length === 0) {
      setGlobalError("Invalid file type(s). Please upload PDF (.pdf) or Word (.docx) documents.");
      return;
    }

    const newQueueItems: BatchFileStatus[] = [];
    setBatchQueue((prev) => {
      const existingKeys = new Set(prev.map((item) => `${item.name}-${item.size}`));
      validFiles.forEach((file, idx) => {
        const key = `${file.name}-${file.size}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          newQueueItems.push({
            id: `batch-file-${Date.now()}-${idx}`,
            file,
            name: file.name,
            size: file.size,
            status: "QUEUED",
            stepMessage: "Queued for pipeline processing...",
            retryCount: 0,
          });
        }
      });
      return [...prev, ...newQueueItems];
    });
  };

  const startBatchPipeline = async () => {
    if (batchQueue.length === 0 || isProcessingBatch) return;

    setIsProcessingBatch(true);
    setGlobalError(null);

    for (let i = 0; i < batchQueue.length; i++) {
      const item = batchQueue[i];
      if (item.status === "DONE") continue;

      await processSingleFileWithRetries(item.id);
    }

    setIsProcessingBatch(false);
  };

  const processSingleFileWithRetries = async (itemId: string) => {
    let currentItem: BatchFileStatus | undefined;
    setBatchQueue((prev) => {
      currentItem = prev.find((x) => x.id === itemId);
      return prev;
    });

    if (!currentItem) return;

    const maxRetries = 3;
    let attempt = 0;
    let success = false;

    while (attempt < maxRetries && !success) {
      attempt++;

      updateFileStatus(itemId, {
        status: "PARSING",
        stepMessage: attempt > 1 ? `Parsing text (Retry ${attempt}/${maxRetries})...` : "Extracting text from document...",
      });

      try {
        const formData = new FormData();
        formData.append("file", currentItem.file);

        updateFileStatus(itemId, {
          status: "SUMMARIZING",
          stepMessage: "Generating AI recruiter summary & bias anonymization...",
        });

        const res = await fetch("/api/resumes/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to process resume.");
        }

        updateFileStatus(itemId, {
          status: "SCORING",
          stepMessage: "Evaluating vector match score & skill gaps...",
        });

        await new Promise((resolve) => setTimeout(resolve, 300));

        updateFileStatus(itemId, {
          status: "DONE",
          stepMessage: "Processed & stored successfully!",
          candidateId: data.candidate.id,
          candidateName: data.candidate.name || "Candidate",
        });

        success = true;
      } catch (err: any) {
        if (attempt >= maxRetries) {
          updateFileStatus(itemId, {
            status: "FAILED",
            stepMessage: `Failed after ${maxRetries} attempts: ${err.message || "Upload error"}`,
            error: err.message || "Failed to process",
          });
        } else {
          const delay = 1000 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  };

  const updateFileStatus = (id: string, update: Partial<BatchFileStatus>) => {
    setBatchQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...update } : item))
    );
  };

  const clearQueue = () => {
    setBatchQueue([]);
    setGlobalError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <ErrorBoundary fallbackTitle="Resume Upload Error">
      <main className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-16">
        <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Header Card */}
          <header className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 font-extrabold text-sm shadow-sm">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  Candidate Matrix
                </h1>
                <p className="text-xs font-medium text-slate-500">
                  Bulk Resume Upload & Async Evaluation Pipeline
                </p>
              </div>
            </div>

            <nav className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-full border border-slate-200/80 font-medium text-xs">
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-full text-slate-600 hover:text-slate-900 transition"
              >
                Dashboard
              </Link>
              <Link
                href="/job-descriptions"
                className="px-4 py-2 rounded-full text-slate-600 hover:text-slate-900 transition"
              >
                Job Positions
              </Link>
              <Link
                href="/"
                className="px-5 py-2 rounded-full bg-slate-900 text-white font-semibold shadow-sm transition"
              >
                Batch Pipeline
              </Link>
              <Link
                href="/how-to-use"
                className="px-4 py-2 rounded-full text-slate-600 hover:text-slate-900 transition"
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

          {/* Main Upload Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                ✨ Gemini 1.5 Flash + pgvector Engine
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Bulk Resume Pipeline Upload
              </h1>
              <p className="text-xs text-slate-500 font-medium max-w-2xl leading-relaxed">
                Select multiple candidate resumes (PDF or DOCX) to execute async text extraction, AI recruiter summaries, prompt injection defense, and structural bias masking.
              </p>
            </div>

            {/* Drag & Drop Box */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-emerald-500 bg-emerald-50 scale-[1.01]"
                  : "border-slate-300 hover:border-emerald-500/60 bg-slate-50/70"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="space-y-4 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-slate-900">
                    Click to select files or drag & drop a batch of resumes
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    Supports PDF (.pdf) and Word (.docx) documents
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition"
                >
                  Select Files
                </button>
              </div>
            </div>

            {/* Error Message */}
            {globalError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-3 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{globalError}</span>
              </div>
            )}

            {/* Live Per-File Batch Pipeline Tracker Table */}
            {batchQueue.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Batch Upload Queue ({batchQueue.length} Files)
                    </h3>
                    {isProcessingBatch && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold animate-pulse">
                        Processing Batch...
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={startBatchPipeline}
                      disabled={isProcessingBatch || batchQueue.every((x) => x.status === "DONE")}
                      className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow transition"
                    >
                      {isProcessingBatch ? "Processing..." : "Process Batch Pipeline"}
                    </button>
                    <button
                      onClick={clearQueue}
                      disabled={isProcessingBatch}
                      className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-semibold text-xs transition"
                    >
                      Clear Queue
                    </button>
                  </div>
                </div>

                {/* Per-File Status Table */}
                <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3.5 px-5">File Name</th>
                        <th className="py-3.5 px-5">Size</th>
                        <th className="py-3.5 px-5">Status & Step</th>
                        <th className="py-3.5 px-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80">
                      {batchQueue.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-100/60 transition">
                          <td className="py-4 px-5">
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-emerald-600" />
                              {item.name}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{item.stepMessage}</div>
                          </td>

                          <td className="py-4 px-5 font-mono text-slate-500">
                            {(item.size / 1024).toFixed(1)} KB
                          </td>

                          <td className="py-4 px-5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                                  item.status === "DONE"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : item.status === "FAILED"
                                    ? "bg-rose-100 text-rose-800"
                                    : item.status === "QUEUED"
                                    ? "bg-slate-200 text-slate-700"
                                    : "bg-blue-500 text-white animate-pulse"
                                }`}
                              >
                                {item.status}
                              </span>

                              {["PARSING", "SUMMARIZING", "SCORING"].includes(item.status) && (
                                <img src="/loading.gif" alt="processing" className="w-4 h-4 object-contain" />
                              )}
                            </div>
                          </td>

                          <td className="py-4 px-5 text-right">
                            {item.status === "DONE" && item.candidateId ? (
                              <Link
                                href={`/candidates/${item.candidateId}`}
                                className="px-3.5 py-1.5 rounded-full bg-slate-900 text-white font-bold text-xs shadow-sm hover:bg-slate-800 transition inline-flex items-center gap-1"
                              >
                                Inspect Profile <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            ) : item.status === "FAILED" ? (
                              <button
                                onClick={() => processSingleFileWithRetries(item.id)}
                                className="px-3 py-1 rounded-full bg-rose-600 text-white text-[10px] font-bold shadow transition"
                              >
                                Retry File
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">Wait</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </ErrorBoundary>
  );
}
