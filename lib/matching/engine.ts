import { appwriteDb } from "../appwrite/db";
import { getEmbedding, cosineSimilarity } from "../gemini/embeddings";
import { evaluateSkillGaps, SkillGapItem } from "./gap-analysis";

export interface CandidateResumeItem {
  text: string;
  sourceSpan: string;
  embedding: number[];
}

export interface RequirementMatchDetail {
  requirementText: string;
  priority: "REQUIRED" | "NICE_TO_HAVE";
  similarityScore: number; // 0.0 to 1.0
  evidenceText: string;
  evidenceSourceSpan: string;
}

export interface MatchEngineResult {
  matchScoreId: string;
  candidateId: string;
  jobDescriptionId: string;
  overallScore: number; // 0.0 to 100.0
  requirementScores: RequirementMatchDetail[];
  skillGaps: SkillGapItem[];
  contextualSummary?: string | null;
  interviewQuestions?: any[];
}

/**
 * Extracts discrete testable items from a candidate's parsed JSON and raw text.
 */
export function extractResumeItems(parsedJson: any, rawText: string): { text: string; sourceSpan: string }[] {
  const items: { text: string; sourceSpan: string }[] = [];

  // 1. Extract Skills
  if (parsedJson?.skills && Array.isArray(parsedJson.skills)) {
    parsedJson.skills.forEach((skill: string) => {
      if (typeof skill === "string" && skill.trim()) {
        items.push({
          text: `Skill: ${skill.trim()}`,
          sourceSpan: "Skills",
        });
      }
    });
  }

  // 2. Extract Work Experience bullets and roles
  if (parsedJson?.workExperience && Array.isArray(parsedJson.workExperience)) {
    parsedJson.workExperience.forEach((exp: any) => {
      const company = exp?.company || "Company";
      const role = exp?.role || "Role";
      const spanLabel = `Work Experience (${role} at ${company})`;

      items.push({
        text: `Role: ${role} at ${company}. ${exp?.duration || ""}`,
        sourceSpan: spanLabel,
      });

      if (exp?.bullets && Array.isArray(exp.bullets)) {
        exp.bullets.forEach((bullet: string) => {
          if (typeof bullet === "string" && bullet.trim().length > 5) {
            items.push({
              text: bullet.trim(),
              sourceSpan: spanLabel,
            });
          }
        });
      }
    });
  }

  // 3. Extract Education entries
  if (parsedJson?.education && Array.isArray(parsedJson.education)) {
    parsedJson.education.forEach((edu: any) => {
      const inst = edu?.institution || "University";
      const deg = edu?.degree || "Degree";
      items.push({
        text: `${deg} from ${inst} (${edu?.year || ""})`,
        sourceSpan: "Education",
      });
    });
  }

  // 4. Extract Certifications
  if (parsedJson?.certifications && Array.isArray(parsedJson.certifications)) {
    parsedJson.certifications.forEach((cert: string) => {
      if (typeof cert === "string" && cert.trim()) {
        items.push({
          text: `Certification: ${cert.trim()}`,
          sourceSpan: "Certifications",
        });
      }
    });
  }

  // Fallback if structured items are minimal: extract sentences from rawText
  if (items.length < 3 && rawText) {
    const lines = rawText.split("\n").map((l) => l.trim()).filter((l) => l.length > 15);
    lines.forEach((line) => {
      items.push({
        text: line,
        sourceSpan: "Resume Text",
      });
    });
  }

  return items;
}

/**
 * Calculates vector cosine similarity matching between a Candidate and a Job Description.
 */
export async function calculateMatchScore(
  candidateId: string,
  jobDescriptionId: string
): Promise<MatchEngineResult> {
  // Fetch Candidate
  const candidate = await appwriteDb.getCandidateById(candidateId);

  if (!candidate) {
    throw new Error(`Candidate with ID ${candidateId} not found.`);
  }

  // Fetch JobDescription with requirements
  const jobDescription = await appwriteDb.getJobDescriptionById(jobDescriptionId);

  if (!jobDescription) {
    throw new Error(`Job Description with ID ${jobDescriptionId} not found.`);
  }

  // Step 1: Extract and Embed Candidate Resume Items (using anonymized data for structural bias reduction)
  const targetJson = candidate.anonymizedJson || candidate.parsedJson;
  const targetText = candidate.anonymizedText || candidate.rawText;
  const rawResumeItems = extractResumeItems(targetJson, targetText);
  const embeddedCandidateItems: CandidateResumeItem[] = [];

  for (const item of rawResumeItems) {
    const embedding = await getEmbedding(item.text);
    embeddedCandidateItems.push({
      text: item.text,
      sourceSpan: item.sourceSpan,
      embedding,
    });
  }

  // Step 2: Fetch / Generate Embeddings for Job Requirements
  const rawReqList = jobDescription.requirementsList.length > 0
    ? jobDescription.requirementsList
    : (Array.isArray(jobDescription.requirements) ? jobDescription.requirements : []).map((req: any, i: number) => ({
        id: `temp-req-${i}`,
        jobDescriptionId,
        text: typeof req === "string" ? req : req.text || "Requirement",
        category: typeof req === "object" ? req.category : undefined,
        priority: (typeof req === "object" && req.priority) ? req.priority : "REQUIRED",
        embeddingJson: null,
      }));

  // Exclude any perks, culture statements, or section headings from candidate scoring
  const isExcludedItem = (r: any) => {
    if (r.category === "PERK_OR_CULTURE") return true;
    const lower = (r.text || "").toLowerCase().trim();
    if (
      lower.includes("celebration") ||
      lower.includes("festival") ||
      lower.includes("birthday") ||
      lower.includes("infrastructure") ||
      lower.includes("engagement activit") ||
      lower.includes("flexible working culture") ||
      lower.includes("onsite opportunity") ||
      lower.includes("perks and benefits") ||
      lower.includes("experience and qualifications") ||
      lower === "requirements" ||
      lower === "qualifications"
    ) {
      return true;
    }
    return false;
  };

  const requirementsList = rawReqList.filter((r: any) => !isExcludedItem(r));

  const requirementDetails: RequirementMatchDetail[] = [];
  let totalWeightedScore = 0;
  let totalWeight = 0;

  // Step 3: For each requirement, compute similarity against ALL candidate resume items
  const candidateDim = embeddedCandidateItems[0]?.embedding?.length || 768;

  for (const req of requirementsList) {
    let reqEmbedding: number[] = [];
    if (
      req.embeddingJson &&
      Array.isArray(req.embeddingJson) &&
      req.embeddingJson.length === candidateDim
    ) {
      reqEmbedding = req.embeddingJson as number[];
    } else {
      reqEmbedding = await getEmbedding(req.text);
      if (reqEmbedding.length !== candidateDim) {
        // Force deterministic alignment if different embedding sources were used
        const { generateDeterministicFallbackEmbedding } = await import("../gemini/embeddings");
        reqEmbedding = generateDeterministicFallbackEmbedding(req.text, candidateDim);
      }
    }

    let highestScore = 0;
    let bestMatchItem = embeddedCandidateItems[0]?.text || "No direct resume match";
    let bestSourceSpan = embeddedCandidateItems[0]?.sourceSpan || "General";

    for (const candidateItem of embeddedCandidateItems) {
      const score = cosineSimilarity(reqEmbedding, candidateItem.embedding);
      if (score > highestScore) {
        highestScore = score;
        bestMatchItem = candidateItem.text;
        bestSourceSpan = candidateItem.sourceSpan;
      }
    }

    const priority: "REQUIRED" | "NICE_TO_HAVE" =
      req.priority === "NICE_TO_HAVE" ? "NICE_TO_HAVE" : "REQUIRED";

    // Rescale neural embedding similarity from baseline floor (~0.55) to full ATS range
    const similarityScore = reqEmbedding.length >= 768
      ? Math.max(0.10, Math.min(0.99, (highestScore - 0.55) / 0.20))
      : Math.max(0.10, Math.min(0.99, highestScore));

    const weight = priority === "REQUIRED" ? 1.5 : 1.0;
    totalWeightedScore += similarityScore * weight;
    totalWeight += weight;

    requirementDetails.push({
      requirementText: req.text,
      priority,
      similarityScore: Math.round(similarityScore * 1000) / 1000,
      evidenceText: bestMatchItem,
      evidenceSourceSpan: bestSourceSpan,
    });
  }

  // Step 4: Calculate weighted overall score (0 - 100%)
  const rawOverall = totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0;
  const overallScore = Math.round(rawOverall * 10) / 10;

  // Step 5: Generate JD-specific Contextual Summary with neutral {{CANDIDATE_NAME}} template token
  const { generateContextualSummary } = await import("../ai/summary-generator");
  const contextualSummary = await generateContextualSummary(
    "{{CANDIDATE_NAME}}",
    jobDescription.title,
    requirementScoresToSummarize(requirementDetails),
    overallScore
  );

  // Step 6: Evaluate Skill Gaps (MISSING, PARTIAL, UNPROVEN)
  const candidateSkills = (targetJson as any)?.skills || [];
  const workExperienceBullets: string[] = [];
  if ((targetJson as any)?.workExperience && Array.isArray((targetJson as any).workExperience)) {
    (targetJson as any).workExperience.forEach((exp: any) => {
      if (exp?.bullets && Array.isArray(exp.bullets)) {
        workExperienceBullets.push(...exp.bullets);
      }
    });
  }

  // Step 7: Save MatchScore, ContextualSummary, and RequirementScores in Appwrite DB
  let matchScoreRecord: any = null;
  try {
    matchScoreRecord = await appwriteDb.createMatchScore({
      candidateId,
      jobDescriptionId,
      overallScore,
      contextualSummary,
    });

    for (const rd of requirementDetails) {
      await appwriteDb.createRequirementScore({
        matchScoreId: matchScoreRecord.id || matchScoreRecord.$id,
        requirementText: rd.requirementText,
        priority: rd.priority,
        similarityScore: rd.similarityScore,
        evidenceText: rd.evidenceText,
        evidenceSourceSpan: rd.evidenceSourceSpan,
      });
    }
  } catch (dbErr) {
    console.warn("MatchScore database save warning (running in preview mode):", dbErr);
    matchScoreRecord = {
      id: `temp-match-${Date.now()}`,
    };
  }

  const matchId = matchScoreRecord.id || matchScoreRecord.$id;

  const skillGaps = await evaluateSkillGaps(
    matchId,
    requirementDetails,
    candidateSkills,
    workExperienceBullets
  );

  // Step 8: Generate Grounded Interview Questions
  const { generateGroundedInterviewQuestions } = await import("../ai/question-generator");
  const interviewQuestions = await generateGroundedInterviewQuestions(
    matchId,
    candidate,
    jobDescription,
    requirementDetails,
    skillGaps
  );

  return {
    matchScoreId: matchScoreRecord.id,
    candidateId,
    jobDescriptionId,
    overallScore,
    contextualSummary,
    requirementScores: requirementDetails,
    skillGaps,
    interviewQuestions,
  } as any;
}

function requirementScoresToSummarize(details: RequirementMatchDetail[]) {
  return details.map((d) => ({
    priority: d.priority,
    requirementText: d.requirementText,
    similarityScore: d.similarityScore,
    evidenceText: d.evidenceText,
  }));
}
