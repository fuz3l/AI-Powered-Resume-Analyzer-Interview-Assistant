import { loadEnv } from "../lib/load-env";
loadEnv();

import { createAdminClient } from "../lib/appwrite/client";
import { COLLECTIONS } from "../lib/appwrite/init";
import { appwriteDb } from "../lib/appwrite/db";
import { parseJobDescriptionWithGemini } from "../lib/gemini/jd-parser";
import { getEmbedding } from "../lib/gemini/embeddings";
import { calculateMatchScore } from "../lib/matching/engine";

function stringifyJson(val: any) {
  try {
    return JSON.stringify(val);
  } catch {
    return "";
  }
}

async function main() {
  console.log("=== STARTING RE-CLASSIFICATION AND RE-SCORING ===");

  const jdId = "6a996ccd0014b4b95d6a";
  const jd = await appwriteDb.getJobDescriptionById(jdId);
  if (!jd) {
    console.error("Target JD not found:", jdId);
    process.exit(1);
  }

  console.log(`\n1. Found JD "${jd.title}" (ID: ${jdId})`);
  console.log(`Original requirements count in DB: ${Array.isArray(jd.requirements) ? jd.requirements.length : 0}`);

  console.log("\n2. Parsing rawText with updated Gemini parser & category classification...");
  const parseResult = await parseJobDescriptionWithGemini(jd.rawText);

  console.log(`\nExtracted total items: ${parseResult.requirements.length}`);
  const scoringItems = parseResult.requirements.filter((r) => r.category !== "PERK_OR_CULTURE");
  const perkItems = parseResult.requirements.filter((r) => r.category === "PERK_OR_CULTURE");

  console.log(`-> Candidate Scoring Requirements: ${scoringItems.length}`);
  scoringItems.forEach((r, idx) => {
    console.log(`   [${r.category}] #${idx + 1}: ${r.text} (${r.priority})`);
  });

  console.log(`\n-> Role & Company Context / Perks: ${perkItems.length}`);
  perkItems.forEach((r, idx) => {
    console.log(`   [${r.category}] #${idx + 1}: ${r.text}`);
  });

  // Update JD document in Appwrite
  const { databases, config } = createAdminClient();
  await databases.updateDocument(
    config.databaseId,
    COLLECTIONS.JOB_DESCRIPTIONS,
    jdId,
    {
      requirements: stringifyJson(parseResult.requirements),
    }
  );
  console.log("\n3. Successfully updated JD document in Appwrite collection job_descriptions.");

  // Clean up old job_requirements for this JD
  console.log("\n4. Replacing job_requirements for candidate matching...");
  const existingReqs = await appwriteDb.getJobRequirementsByJdId(jdId);
  console.log(`Deleting ${existingReqs.length} old requirement documents...`);
  for (const req of existingReqs) {
    try {
      await databases.deleteDocument(config.databaseId, COLLECTIONS.JOB_REQUIREMENTS, req.id || req.$id);
    } catch (e: any) {
      console.warn("Could not delete old req doc:", req.id, e.message);
    }
  }

  // Create new embeddings and documents ONLY for candidate scoring requirements
  console.log(`Generating embeddings and saving ${scoringItems.length} genuine scoring requirements...`);
  for (const item of scoringItems) {
    const embedding = await getEmbedding(item.text);
    await appwriteDb.createJobRequirement({
      jobDescriptionId: jdId,
      text: item.text,
      priority: item.priority,
      embeddingJson: embedding,
    });
  }
  console.log("Job requirements replaced successfully.");

  // Re-score all candidates
  console.log("\n5. Re-scoring candidates against the updated JD...");
  const candidates = await appwriteDb.listCandidates();
  console.log(`Found ${candidates.length} candidates in database:`);

  // Delete old match scores for this JD to have clean new scores
  const oldMatchScores = await appwriteDb.getMatchScoresSummaryByCandidateId("");
  // Let's re-run calculateMatchScore for each candidate
  for (const cand of candidates) {
    const cid = cand.id || cand.$id;
    console.log(`\n--- Scoring Candidate: ${cand.name} (${cand.anonymizedName || "No Anon"}) [${cid}] ---`);
    try {
      const matchResult = await calculateMatchScore(cid, jdId);
      console.log(`Overall Score: ${matchResult.overallScore}%`);
      console.log(`Contextual Summary: ${matchResult.contextualSummary}`);
      console.log(`Skill Gaps: ${matchResult.skillGaps.length}`);
    } catch (err: any) {
      console.error(`Failed to score candidate ${cid}:`, err.message);
    }
  }

  console.log("\n=== RE-CLASSIFICATION AND RE-SCORING FINISHED SUCCESSFULLY ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
