import { NextRequest, NextResponse } from "next/server";
import { appwriteDb } from "@/lib/appwrite/db";

export const dynamic = "force-dynamic";

// In-memory cache for ultra-fast dashboard queries (10s TTL)
const DASHBOARD_CACHE = new Map<string, { data: any; expiresAt: number }>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const selectedJdId = searchParams.get("jobDescriptionId") || "";
    const noCache = searchParams.get("nocache") === "true";

    const cacheKey = `dashboard-${selectedJdId}`;
    const cached = DASHBOARD_CACHE.get(cacheKey);
    if (!noCache && cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.data);
    }

    // Fetch all job descriptions and candidates concurrently
    const [jobDescriptions, candidateDocs] = await Promise.all([
      appwriteDb.listJobDescriptions(),
      appwriteDb.listCandidates(),
    ]);

    const activeJdId = selectedJdId || jobDescriptions[0]?.id || jobDescriptions[0]?.$id;

    if (!activeJdId) {
      return NextResponse.json({
        jobDescriptions: [],
        activeJobDescription: null,
        candidates: [],
      });
    }

    const activeJd = await appwriteDb.getJobDescriptionById(activeJdId);

    // Process all candidates in parallel concurrently
    const candidateRankings = await Promise.all(
      candidateDocs.map(async (c: any) => {
        const candidateId = c.id || c.$id;
        const [suspiciousContents, matchScores] = await Promise.all([
          appwriteDb.getSuspiciousContentsByCandidateId(candidateId),
          appwriteDb.getMatchScoresSummaryByCandidateId(candidateId),
        ]);

        let matchForThisJd = matchScores.find((m: any) => m.jobDescriptionId === activeJdId) || null;

        // Auto-compute match score on-the-fly if not already calculated
        if (!matchForThisJd && activeJdId) {
          try {
            const { calculateMatchScore } = await import("@/lib/matching/engine");
            const calcResult = await calculateMatchScore(candidateId, activeJdId);
            matchForThisJd = {
              id: calcResult.matchScoreId,
              matchScoreId: calcResult.matchScoreId,
              overallScore: calcResult.overallScore,
              contextualSummary: calcResult.contextualSummary,
              skillGaps: calcResult.skillGaps,
            };
          } catch (calcErr) {
            console.warn(`Could not auto-match candidate ${candidateId}:`, calcErr);
          }
        }

        const overallScore = matchForThisJd ? matchForThisJd.overallScore : 0;
        const topSkillGaps = matchForThisJd
          ? (matchForThisJd.skillGaps || []).map((g: any) => ({ skillName: g.skillName, gapType: g.gapType }))
          : [];

        // Extract dynamic per-candidate skills
        let candidateSkills: string[] = [];
        try {
          const rawTarget = c.anonymizedJson || c.parsedJson;
          const parsedTarget = typeof rawTarget === "string" ? JSON.parse(rawTarget) : rawTarget;
          if (parsedTarget?.skills && Array.isArray(parsedTarget.skills)) {
            candidateSkills = parsedTarget.skills
              .map((s: any) => (typeof s === "string" ? s.trim() : ""))
              .filter(Boolean);
          }
        } catch {
          candidateSkills = [];
        }

        return {
          id: candidateId,
          name: c.name || "Unknown Candidate",
          email: c.email || "",
          anonymizedName: c.anonymizedName || "Candidate X",
          skills: candidateSkills.slice(0, 4),
          generalSummary: c.generalSummary || null,
          parseConfidence: c.parseConfidence || "HIGH",
          overallScore,
          matchScoreId: matchForThisJd?.id || matchForThisJd?.matchScoreId || null,
          contextualSummary: matchForThisJd?.contextualSummary || null,
          topSkillGaps,
          suspiciousCount: suspiciousContents.length,
          createdAt: c.createdAt,
        };
      })
    );

    const responseData = {
      jobDescriptions,
      activeJobDescription: activeJd,
      candidates: candidateRankings,
    };

    // Cache for 10 seconds to make filtering and tab switching instantaneous
    DASHBOARD_CACHE.set(cacheKey, {
      data: responseData,
      expiresAt: Date.now() + 10_000,
    });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard candidate rankings." },
      { status: 500 }
    );
  }
}
