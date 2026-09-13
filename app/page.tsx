"use client";

import { useState, useEffect, useRef, DragEvent, ChangeEvent } from "react";
import Link from "next/link";
import {
  CloudArrowUp,
  FileText,
  Warning,
  CircleNotch,
  ArrowRight,
  Sparkle,
  Lightning,
  SquaresFour,
  Plus,
} from "@phosphor-icons/react";
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
  const [jobPositions, setJobPositions] = useState<{ id: string; title: string }[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadJobPositions() {
      try {
        const res = await fetch("/api/job-descriptions");
        const data = await res.json();
        const jds = Array.isArray(data) ? data : data?.jobDescriptions || [];
        if (jds.length > 0) {
          const list = jds.map((j: any) => ({ id: j.id || j.$id, title: j.title }));
          setJobPositions(list);
          // Default to UI/UX if present, otherwise first JD
          const uiux = list.find((j: any) => j.title.toLowerCase().includes("ui") || j.title.toLowerCase().includes("design"));
          setSelectedJobId(uiux ? uiux.id : list[0].id);
        }
      } catch (err) {
        console.warn("Could not load job descriptions for batch upload:", err);
      }
    }
    loadJobPositions();
  }, []);


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

  const batchQueueRef = useRef<BatchFileStatus[]>(batchQueue);
  useEffect(() => {
    batchQueueRef.current = batchQueue;
  }, [batchQueue]);

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
    if (e.target) {
      e.target.value = "";
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

    setBatchQueue((prev) => {
      const existingKeys = new Set(prev.map((item) => `${item.name}-${item.size}`));
      const newQueueItems: BatchFileStatus[] = [];
      validFiles.forEach((file, idx) => {
        const key = `${file.name}-${file.size}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          newQueueItems.push({
            id: `batch-file-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
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
    const queueSnapshot = [...batchQueueRef.current];
    if (queueSnapshot.length === 0 || isProcessingBatch) return;

    setIsProcessingBatch(true);
    setGlobalError(null);

    const pendingItems = queueSnapshot.filter((item) => item.status !== "DONE");

    // Process resumes concurrently (2 at a time) to maximize throughput without hitting Gemini API rate limits
    const CONCURRENCY = 2;
    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < pendingItems.length) {
        const item = pendingItems[nextIndex++];
        if (item) {
          await processSingleFileWithRetries(item.id);
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(CONCURRENCY, pendingItems.length) },
      () => worker()
    );

    await Promise.all(workers);

    setIsProcessingBatch(false);
  };

  const processSingleFileWithRetries = async (itemId: string) => {
    const currentItem = batchQueueRef.current.find((x) => x.id === itemId);
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
        if (selectedJobId) {
          formData.append("jobDescriptionId", selectedJobId);
        }

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
                  Bulk Resume Upload & Async Evaluation Pipeline
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
                className="px-3 sm:px-4 py-2 rounded-full text-slate-600 hover:text-slate-900 transition whitespace-nowrap"
              >
                Job Positions
              </Link>
              <Link
                href="/"
                className="px-4 sm:px-5 py-2 rounded-full bg-slate-900 text-white font-semibold shadow-sm transition whitespace-nowrap"
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

            {/* Target Job Position Selector */}
            {jobPositions.length > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50/90 rounded-2xl border border-slate-200">
                <div className="space-y-0.5">
                  <label htmlFor="target-role-select" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Target Job Position for this Batch:
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Resumes will be automatically evaluated, scored, and categorized for this specific role.
                  </p>
                </div>
                <select
                  id="target-role-select"
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[260px] cursor-pointer"
                >
                  {jobPositions.map((jp) => (
                    <option key={jp.id} value={jp.id}>
                      {jp.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                  <CloudArrowUp weight="fill" className="w-8 h-8" />
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
                <Warning weight="fill" className="w-4 h-4 flex-shrink-0 text-rose-600" />
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
                              <FileText weight="fill" className="w-4 h-4 text-emerald-600" />
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
                                Inspect Profile <ArrowRight weight="bold" className="w-3.5 h-3.5" />
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
