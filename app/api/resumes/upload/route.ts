import { NextRequest, NextResponse } from "next/server";
import { extractTextFromBuffer } from "@/lib/parser/extractor";
import { parseResumeWithGemini } from "@/lib/gemini/structured-parser";
import { appwriteDb } from "@/lib/appwrite/db";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided in request." },
        { status: 400 }
      );
    }

    const filename = file.name || "resume.pdf";
    const mimeType = file.type || "";

    // Validate file type
    const isPdf =
      mimeType.includes("pdf") || filename.toLowerCase().endsWith(".pdf");
    const isDocx =
      mimeType.includes("word") ||
      mimeType.includes("docx") ||
      filename.toLowerCase().endsWith(".docx");

    if (!isPdf && !isDocx) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file type. Only PDF (.pdf) and DOCX (.docx) files are supported.",
        },
        { status: 400 }
      );
    }

    // Convert file to ArrayBuffer -> Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Step 1: Extract Raw Text & Calculate Parse Confidence
    const extractionResult = await extractTextFromBuffer(
      buffer,
      mimeType,
      filename
    );

    const rawTextTrimmed = extractionResult.rawText ? extractionResult.rawText.trim() : "";
    
    // Edge Case #2: Detect scanned image / minimal text resumes (< 150 chars or < 20 words)
    let parseConfidence = extractionResult.confidence;
    let isScannedImage = false;

    if (rawTextTrimmed.length < 150 || rawTextTrimmed.split(/\s+/).length < 20) {
      parseConfidence = "LOW";
      isScannedImage = true;
    }

    if (!rawTextTrimmed) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not extract any readable text from document. This resume appears to be an unreadable scanned image PDF.",
        },
        { status: 422 }
      );
    }

    // Step 2: Gemini AI Structured Extraction
    const parsedJson = await parseResumeWithGemini(rawTextTrimmed);

    // Step 2b: Isolated summary generation & bias anonymization (Edge Case #10)
    let generalSummary: string | null = null;
    try {
      const { generateGeneralSummary } = await import("@/lib/ai/summary-generator");
      generalSummary = await generateGeneralSummary(parsedJson, rawTextTrimmed);
    } catch (sumErr) {
      console.warn("General summary generation warning (isolated failure):", sumErr);
      generalSummary = "General summary currently unavailable.";
    }

    const { anonymizeCandidateData } = await import("@/lib/security/bias-masking");
    const existingCandidates = await appwriteDb.listCandidates();
    const anonymized = anonymizeCandidateData(existingCandidates.length + 1, parsedJson, rawTextTrimmed);

    // Step 3: Candidate Persistence in Appwrite (with deduplication)
    let candidateRecord: any = null;
    let savedToDb = false;

    try {
      const candidateEmail = parsedJson.email || null;
      const candidateName = parsedJson.name || "Unknown Candidate";

      // Detect duplicate candidate — only block truly identical submissions
      // (same raw text content OR same exact filename+name). Do NOT deduplicate
      // by email alone — multiple distinct candidates can share the same email
      // in bulk uploads / sample data sets.
      const existingCandidate = existingCandidates.find((c: any) => {
        // Exact same raw text = same document re-uploaded
        if (c.rawText && c.rawText.trim() === rawTextTrimmed) {
          return true;
        }
        // Same filename AND same name = same candidate file re-uploaded
        if (
          c.name &&
          candidateName &&
          c.name.toLowerCase().trim() === candidateName.toLowerCase().trim() &&
          c.resumeFileUrl === filename
        ) {
          return true;
        }
        return false;
      });

      const targetJobId = (formData.get("jobDescriptionId") as string) || "";
      const parsedWithJd = {
        ...parsedJson,
        jobDescriptionId: targetJobId || undefined,
      };

      const candidateData = {
        name: candidateName,
        email: candidateEmail,
        rawText: rawTextTrimmed,
        parsedJson: parsedWithJd,
        anonymizedName: anonymized.anonymizedName,
        anonymizedText: anonymized.anonymizedText,
        anonymizedJson: anonymized.anonymizedJson,
        generalSummary,
        parseConfidence,
        resumeFileUrl: filename,
        jobDescriptionId: targetJobId || undefined,
      };

      if (existingCandidate) {
        const targetId = existingCandidate.id || existingCandidate.$id;
        candidateRecord = await appwriteDb.updateCandidate(targetId, candidateData);
      } else {
        candidateRecord = await appwriteDb.createCandidate(candidateData);
      }

      savedToDb = true;

      // Part C: Run prompt injection defense & store suspicious content flags
      const { sanitizeAndStoreCandidate } = await import("@/lib/security/sanitizer");
      await sanitizeAndStoreCandidate(candidateRecord.id || candidateRecord.$id, rawTextTrimmed);
    } catch (dbError) {
      console.warn("Database save warning (running in preview/degraded mode):", dbError);
      candidateRecord = {
        id: `temp-${Date.now()}`,
        name: parsedJson.name || "Unknown Candidate",
        email: parsedJson.email || null,
        rawText: rawTextTrimmed,
        parsedJson,
        parseConfidence,
        resumeFileUrl: filename,
        createdAt: new Date().toISOString(),
      };
    }

    const targetJobId = (formData.get("jobDescriptionId") as string) || "";

    // Part D: Automatically compute vector match score against target job position
    let initialMatchScore = 0;
    try {
      const jds = await appwriteDb.listJobDescriptions();
      const targetJd = targetJobId
        ? jds.find((j: any) => (j.id || j.$id) === targetJobId)
        : jds[0];

      if (targetJd) {
        const { calculateMatchScore } = await import("@/lib/matching/engine");
        const matchResult = await calculateMatchScore(
          candidateRecord.id || candidateRecord.$id,
          targetJd.id || targetJd.$id
        );
        initialMatchScore = matchResult.overallScore;
      }
    } catch (scoreErr) {
      console.warn("Initial auto-match scoring warning:", scoreErr);
    }

    return NextResponse.json({
      success: true,
      message: "Resume processed successfully.",
      savedToDb,
      candidate: {
        id: candidateRecord.id || candidateRecord.$id,
        name: parsedJson.name,
        email: parsedJson.email,
        phone: parsedJson.phone,
        parseConfidence: extractionResult.confidence,
        sectionsDetected: extractionResult.sectionsDetected,
        rawText: extractionResult.rawText,
        parsedJson,
        overallScore: initialMatchScore,
        createdAt: candidateRecord.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Resume Upload API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "An unexpected error occurred during resume processing.",
      },
      { status: 500 }
    );
  }
}
