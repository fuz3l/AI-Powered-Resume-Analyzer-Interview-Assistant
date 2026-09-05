import { NextRequest, NextResponse } from "next/server";
import { appwriteDb } from "@/lib/appwrite/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const candidateId = params.id;
    const candidate = await appwriteDb.getCandidateById(candidateId);

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found." },
        { status: 404 }
      );
    }

    let latestMatch = candidate.latestMatch || null;

    if (!latestMatch) {
      try {
        const jds = await appwriteDb.listJobDescriptions();
        if (jds.length > 0) {
          const { calculateMatchScore } = await import("@/lib/matching/engine");
          const targetJdId = jds[0].id || jds[0].$id;
          await calculateMatchScore(candidateId, targetJdId);
          const refreshed = await appwriteDb.getCandidateById(candidateId);
          latestMatch = refreshed?.latestMatch || null;
        }
      } catch (autoErr) {
        console.warn("Auto-match on candidate detail error:", autoErr);
      }
    }

    return NextResponse.json({
      success: true,
      candidate: {
        id: candidate.id || candidate.$id,
        name: candidate.name,
        email: candidate.email,
        anonymizedName: candidate.anonymizedName || "Candidate X",
        anonymizedText: candidate.anonymizedText || candidate.rawText,
        anonymizedJson: candidate.anonymizedJson || candidate.parsedJson,
        generalSummary: candidate.generalSummary || null,
        rawText: candidate.rawText,
        parsedJson: candidate.parsedJson,
        parseConfidence: candidate.parseConfidence,
        createdAt: candidate.createdAt,
        suspiciousContents: candidate.suspiciousContents || [],
        latestMatch: latestMatch
          ? {
              matchScoreId: latestMatch.id || latestMatch.matchScoreId,
              jobDescriptionTitle: latestMatch.jobDescriptionTitle || "Job Position",
              overallScore: latestMatch.overallScore,
              contextualSummary: latestMatch.contextualSummary || null,
              requirementScores: latestMatch.requirementScores || [],
              skillGaps: latestMatch.skillGaps || [],
              interviewQuestions: latestMatch.interviewQuestions || [],
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error("GET Candidate Detail API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch candidate detail." },
      { status: 500 }
    );
  }
}
