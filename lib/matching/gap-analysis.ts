import { appwriteDb } from "../appwrite/db";
import { RequirementMatchDetail } from "./engine";

export interface SkillGapItem {
  skillName: string;
  gapType: "MISSING" | "PARTIAL" | "UNPROVEN";
  reason?: string;
}

/**
 * Runs skill gap analysis after matching completes:
 * 1. Requirements < 0.5 similarity -> MISSING
 * 2. Requirements 0.5 - 0.75 similarity -> PARTIAL
 * 3. Skills claimed in skills list with 0 supporting experience bullets -> UNPROVEN
 */
export async function evaluateSkillGaps(
  matchScoreId: string,
  requirementScores: RequirementMatchDetail[],
  candidateSkills: string[] = [],
  workExperienceBullets: string[] = []
): Promise<SkillGapItem[]> {
  const gapsMap = new Map<string, SkillGapItem>();

  // Rule 1 & 2: Evaluate JD Requirements similarity scores
  for (const req of requirementScores) {
    if (req.similarityScore < 0.5) {
      gapsMap.set(`missing-${req.requirementText}`, {
        skillName: req.requirementText,
        gapType: "MISSING",
        reason: "No sufficient evidence found in candidate's resume.",
      });
    } else if (req.similarityScore >= 0.5 && req.similarityScore < 0.75) {
      gapsMap.set(`partial-${req.requirementText}`, {
        skillName: req.requirementText,
        gapType: "PARTIAL",
        reason: "Skill is mentioned but not strongly evidenced in work history.",
      });
    }
  }

  // Rule 3: Flag UNPROVEN skills (Claimed in Skills list, but 0 supporting work experience bullets)
  const experienceTextLower = workExperienceBullets.join(" ").toLowerCase();

  for (const skill of candidateSkills) {
    if (!skill || skill.trim().length === 0) continue;
    const cleanSkill = skill.trim();
    const skillLower = cleanSkill.toLowerCase();

    // Check if skill is mentioned anywhere in work experience bullets
    const isDemonstratedInExperience =
      experienceTextLower.includes(skillLower) ||
      workExperienceBullets.some((bullet) => {
        try {
          const escaped = cleanSkill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const endsWithWord = /\w$/.test(cleanSkill);
          const regex = new RegExp(`\\b${escaped}${endsWithWord ? "\\b" : "(?:\\s|$|[^\\w]|,)"}`, "i");
          return regex.test(bullet);
        } catch {
          return bullet.toLowerCase().includes(skillLower);
        }
      });

    if (!isDemonstratedInExperience) {
      gapsMap.set(`unproven-${cleanSkill}`, {
        skillName: cleanSkill,
        gapType: "UNPROVEN",
        reason: "Claimed in skills list, but has zero supporting bullets in work experience.",
      });
    }
  }

  const gapItems = Array.from(gapsMap.values());

  // Store in SkillGap collection in Appwrite DB
  if (matchScoreId && !matchScoreId.startsWith("temp-")) {
    try {
      await appwriteDb.saveSkillGaps(
        matchScoreId,
        gapItems.map((g) => ({
          skillName: g.skillName,
          gapType: g.gapType,
        }))
      );
    } catch (err) {
      console.warn("Could not save SkillGaps to Appwrite database:", err);
    }
  }

  return gapItems;
}
