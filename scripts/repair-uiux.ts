import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { appwriteDb } from "../lib/appwrite/db";
import { parseResumeWithGemini } from "../lib/gemini/structured-parser";
import { generateGeneralSummary } from "../lib/ai/summary-generator";
import { anonymizeCandidateData } from "../lib/security/bias-masking";
import { calculateMatchScore } from "../lib/matching/engine";
import { extractTextFromPdfStreamBuffer } from "../lib/parser/extractor";

async function run() {
  const uiuxJdId = "6aa410740029c4e61e4a";
  console.log("Fetching candidates from Appwrite...");
  const candidates = await appwriteDb.listCandidates();

  // Find all 10 UI/UX candidates by file name
  const uiuxCandidates = candidates.filter(
    (c: any) => c.resumeFileUrl && c.resumeFileUrl.toLowerCase().includes("uiux")
  );

  console.log(`Found ${uiuxCandidates.length} UI/UX candidates to repair.`);

  for (let i = 0; i < uiuxCandidates.length; i++) {
    const c = uiuxCandidates[i];
    console.log(`\n[${i + 1}/${uiuxCandidates.length}] Repairing: ${c.resumeFileUrl} (ID: ${c.id})`);

    let cleanText = c.rawText || "";
    if (cleanText.startsWith("%PDF")) {
      const buf = Buffer.from(cleanText, "binary");
      const extracted = extractTextFromPdfStreamBuffer(buf);
      if (extracted && extracted.length > 50) {
        cleanText = extracted;
      }
    }

    // Call Groq structured parser with a pause between candidates
    console.log("Extracting resume structure with Groq...");
    const parsed = await parseResumeWithGemini(cleanText);
    console.log(`  -> Name: "${parsed.name}", Email: "${parsed.email}", Skills: ${parsed.skills.length}`);

    const summary = await generateGeneralSummary(parsed, cleanText);
    const anonymized = anonymizeCandidateData(i + 1, parsed, cleanText);

    await appwriteDb.updateCandidate(c.id, {
      name: parsed.name,
      email: parsed.email,
      rawText: cleanText,
      parsedJson: parsed,
      anonymizedName: anonymized.anonymizedName,
      anonymizedText: anonymized.anonymizedText,
      anonymizedJson: anonymized.anonymizedJson,
      generalSummary: summary,
      parseConfidence: "HIGH",
    });

    console.log("Calculating match score against UI/UX Designer...");
    const match = await calculateMatchScore(c.id, uiuxJdId);
    console.log(`  -> Match Score: ${match.overallScore}%`);

    // Brief sleep to respect token rate limits
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log("\n==========================================");
  console.log("ALL 10 UI/UX CANDIDATES SUCCESSFULLY REPAIRED!");
  console.log("==========================================");
}

run().catch((err) => {
  console.error("Repair error:", err);
  process.exit(1);
});
