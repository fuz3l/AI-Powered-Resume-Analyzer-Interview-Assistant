import { ID, Permission, Role } from "node-appwrite";
import { createAdminClient } from "./client";

export const COLLECTIONS = {
  CANDIDATES: "candidates",
  SUSPICIOUS_CONTENTS: "suspicious_contents",
  JOB_DESCRIPTIONS: "job_descriptions",
  JOB_REQUIREMENTS: "job_requirements",
  MATCH_SCORES: "match_scores",
  REQUIREMENT_SCORES: "requirement_scores",
  SKILL_GAPS: "skill_gaps",
  INTERVIEW_QUESTIONS: "interview_questions",
} as const;

/**
 * Initializes the Appwrite database and provisions all needed collections, attributes, and storage buckets.
 */
export async function initAppwrite() {
  const { databases, storage, config } = createAdminClient();

  if (!config.projectId || !config.apiKey) {
    console.warn("⚠️ Appwrite credentials not provided in environment variables (APPWRITE_PROJECT_ID / APPWRITE_API_KEY). Running in in-memory fallback mode.");
    return false;
  }

  console.log(`🚀 Connecting to Appwrite (${config.endpoint}) for project: ${config.projectId}...`);

  // 1. Ensure Database Exists
  try {
    await databases.get(config.databaseId);
    console.log(`✅ Database "${config.databaseId}" already exists.`);
  } catch (err: any) {
    if (err?.code === 404) {
      console.log(`📦 Creating Database "${config.databaseId}"...`);
      await databases.create(config.databaseId, "ATS Matrix Database");
    } else {
      console.error("Database check error:", err);
      throw err;
    }
  }

  // 2. Ensure Storage Bucket Exists
  try {
    await storage.getBucket(config.bucketId);
    console.log(`✅ Storage Bucket "${config.bucketId}" already exists.`);
  } catch (err: any) {
    if (err?.code === 404) {
      console.log(`🗂️ Creating Storage Bucket "${config.bucketId}"...`);
      await storage.createBucket(
        config.bucketId,
        "Resume Documents",
        [
          Permission.read(Role.any()),
          Permission.create(Role.any()),
          Permission.update(Role.any()),
          Permission.delete(Role.any()),
        ],
        false,
        true,
        undefined,
        ["pdf", "docx", "doc"]
      );
    }
  }

  // Helper to ensure collection exists
  async function ensureCollection(collectionId: string, name: string) {
    try {
      await databases.getCollection(config.databaseId, collectionId);
      console.log(`  - Collection "${collectionId}" exists.`);
    } catch (err: any) {
      if (err?.code === 404) {
        console.log(`  + Creating Collection "${collectionId}"...`);
        await databases.createCollection(
          config.databaseId,
          collectionId,
          name,
          [
            Permission.read(Role.any()),
            Permission.create(Role.any()),
            Permission.update(Role.any()),
            Permission.delete(Role.any()),
          ]
        );
      } else {
        throw err;
      }
    }
  }

  // Helper to ensure attribute exists
  async function ensureStringAttr(colId: string, key: string, size: number, required = false) {
    try {
      await databases.getAttribute(config.databaseId, colId, key);
    } catch (err: any) {
      if (err?.code === 404) {
        await databases.createStringAttribute(config.databaseId, colId, key, size, required);
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  }

  async function ensureFloatAttr(colId: string, key: string, required = false) {
    try {
      await databases.getAttribute(config.databaseId, colId, key);
    } catch (err: any) {
      if (err?.code === 404) {
        await databases.createFloatAttribute(config.databaseId, colId, key, required);
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  }

  // 3. Provision Collections & Attributes
  console.log("🛠️ Provisioning Appwrite Collections & Attributes...");

  // Candidates Collection
  await ensureCollection(COLLECTIONS.CANDIDATES, "Candidates");
  await ensureStringAttr(COLLECTIONS.CANDIDATES, "name", 255, false);
  await ensureStringAttr(COLLECTIONS.CANDIDATES, "email", 255, false);
  await ensureStringAttr(COLLECTIONS.CANDIDATES, "rawText", 100000, true);
  await ensureStringAttr(COLLECTIONS.CANDIDATES, "parsedJson", 100000, true);
  await ensureStringAttr(COLLECTIONS.CANDIDATES, "anonymizedName", 255, false);
  await ensureStringAttr(COLLECTIONS.CANDIDATES, "anonymizedText", 100000, false);
  await ensureStringAttr(COLLECTIONS.CANDIDATES, "anonymizedJson", 100000, false);
  await ensureStringAttr(COLLECTIONS.CANDIDATES, "generalSummary", 20000, false);
  await ensureStringAttr(COLLECTIONS.CANDIDATES, "parseConfidence", 50, false);
  await ensureStringAttr(COLLECTIONS.CANDIDATES, "resumeFileUrl", 1000, false);
  await ensureStringAttr(COLLECTIONS.CANDIDATES, "createdAt", 100, true);

  // Suspicious Contents Collection
  await ensureCollection(COLLECTIONS.SUSPICIOUS_CONTENTS, "Suspicious Contents");
  await ensureStringAttr(COLLECTIONS.SUSPICIOUS_CONTENTS, "candidateId", 255, true);
  await ensureStringAttr(COLLECTIONS.SUSPICIOUS_CONTENTS, "flaggedText", 20000, true);
  await ensureStringAttr(COLLECTIONS.SUSPICIOUS_CONTENTS, "detectionReason", 5000, true);
  await ensureStringAttr(COLLECTIONS.SUSPICIOUS_CONTENTS, "createdAt", 100, true);

  // Job Descriptions Collection
  await ensureCollection(COLLECTIONS.JOB_DESCRIPTIONS, "Job Descriptions");
  await ensureStringAttr(COLLECTIONS.JOB_DESCRIPTIONS, "title", 255, true);
  await ensureStringAttr(COLLECTIONS.JOB_DESCRIPTIONS, "rawText", 100000, true);
  await ensureStringAttr(COLLECTIONS.JOB_DESCRIPTIONS, "requirements", 50000, true);
  await ensureStringAttr(COLLECTIONS.JOB_DESCRIPTIONS, "createdAt", 100, true);

  // Job Requirements Collection
  await ensureCollection(COLLECTIONS.JOB_REQUIREMENTS, "Job Requirements");
  await ensureStringAttr(COLLECTIONS.JOB_REQUIREMENTS, "jobDescriptionId", 255, true);
  await ensureStringAttr(COLLECTIONS.JOB_REQUIREMENTS, "text", 5000, true);
  await ensureStringAttr(COLLECTIONS.JOB_REQUIREMENTS, "priority", 50, true);
  await ensureStringAttr(COLLECTIONS.JOB_REQUIREMENTS, "embeddingJson", 100000, false);
  await ensureStringAttr(COLLECTIONS.JOB_REQUIREMENTS, "createdAt", 100, true);

  // Match Scores Collection
  await ensureCollection(COLLECTIONS.MATCH_SCORES, "Match Scores");
  await ensureStringAttr(COLLECTIONS.MATCH_SCORES, "candidateId", 255, true);
  await ensureStringAttr(COLLECTIONS.MATCH_SCORES, "jobDescriptionId", 255, true);
  await ensureFloatAttr(COLLECTIONS.MATCH_SCORES, "overallScore", true);
  await ensureStringAttr(COLLECTIONS.MATCH_SCORES, "contextualSummary", 20000, false);
  await ensureStringAttr(COLLECTIONS.MATCH_SCORES, "createdAt", 100, true);

  // Requirement Scores Collection
  await ensureCollection(COLLECTIONS.REQUIREMENT_SCORES, "Requirement Scores");
  await ensureStringAttr(COLLECTIONS.REQUIREMENT_SCORES, "matchScoreId", 255, true);
  await ensureStringAttr(COLLECTIONS.REQUIREMENT_SCORES, "requirementText", 5000, true);
  await ensureStringAttr(COLLECTIONS.REQUIREMENT_SCORES, "priority", 50, true);
  await ensureFloatAttr(COLLECTIONS.REQUIREMENT_SCORES, "similarityScore", true);
  await ensureStringAttr(COLLECTIONS.REQUIREMENT_SCORES, "evidenceText", 10000, false);
  await ensureStringAttr(COLLECTIONS.REQUIREMENT_SCORES, "evidenceSourceSpan", 500, false);

  // Skill Gaps Collection
  await ensureCollection(COLLECTIONS.SKILL_GAPS, "Skill Gaps");
  await ensureStringAttr(COLLECTIONS.SKILL_GAPS, "matchScoreId", 255, true);
  await ensureStringAttr(COLLECTIONS.SKILL_GAPS, "skillName", 500, true);
  await ensureStringAttr(COLLECTIONS.SKILL_GAPS, "gapType", 50, true);

  // Interview Questions Collection
  await ensureCollection(COLLECTIONS.INTERVIEW_QUESTIONS, "Interview Questions");
  await ensureStringAttr(COLLECTIONS.INTERVIEW_QUESTIONS, "matchScoreId", 255, true);
  await ensureStringAttr(COLLECTIONS.INTERVIEW_QUESTIONS, "questionText", 5000, true);
  await ensureStringAttr(COLLECTIONS.INTERVIEW_QUESTIONS, "reasoning", 5000, false);
  await ensureStringAttr(COLLECTIONS.INTERVIEW_QUESTIONS, "category", 50, true);

  console.log("🎉 Appwrite schema provisioning complete!");
  return true;
}

// Allow running directly via ts-node: npx ts-node lib/appwrite/init.ts
if (require.main === module) {
  initAppwrite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Appwrite initialization failed:", err);
      process.exit(1);
    });
}
