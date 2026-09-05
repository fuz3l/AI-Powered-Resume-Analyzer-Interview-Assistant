import { GoogleGenerativeAI } from "@google/generative-ai";
import { wrapInSafetyBoundary } from "../security/sanitizer";

/**
 * Generates a 3-4 line JD-independent recruiter summary synthesizing:
 * 1. Inferred seniority level (Junior/Mid/Senior)
 * 2. 2-3 standout strengths
 * 3. 1 notable career pattern
 */
export async function generateGeneralSummary(
  parsedJson: any,
  rawText: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  const experienceCount = Array.isArray(parsedJson?.workExperience) ? parsedJson.workExperience.length : 0;
  const skillsList = Array.isArray(parsedJson?.skills) ? parsedJson.skills.join(", ") : "software development";
  
  let fallbackSeniority = "Mid-level";
  if (experienceCount >= 3 || rawText.toLowerCase().includes("senior") || rawText.toLowerCase().includes("lead")) {
    fallbackSeniority = "Senior-level";
  } else if (experienceCount <= 1) {
    fallbackSeniority = "Junior-level";
  }

  const fallbackSummary = `${fallbackSeniority} candidate demonstrating primary technical proficiency across ${skillsList.slice(0, 80)}. Key strengths include practical software development experience, component design, and problem solving. Displays a consistent focus on full-lifecycle application engineering across recent roles.`;

  if (!apiKey || apiKey === "your_gemini_api_key_here" || apiKey.trim() === "") {
    return fallbackSummary;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-flash-latest" });

    const safeInputText = wrapInSafetyBoundary(rawText);
    const prompt = `
You are an executive tech recruiter. Write a concise, 3-4 sentence professional candidate summary based on the resume data below.
Requirements for the summary:
1. Infer and state candidate's seniority level (Junior / Mid-level / Senior / Lead).
2. Highlight 2-3 standout technical or domain strengths.
3. Identify 1 notable career pattern (e.g. "consistent backend focus across all roles", "recent shift from frontend to full-stack", or "strong product engineering ownership").
Do NOT just list facts; synthesize them into a fluent executive recruiter summary paragraph.

${safeInputText}
`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim() || fallbackSummary;
  } catch (err) {
    return fallbackSummary;
  }
}

/**
 * Generates a JD-specific contextual summary in prose explaining "why this score" relative to the target role.
 * Uses "{{CANDIDATE_NAME}}" as a template token so DB persistence remains neutral and dynamically rendered.
 */
export async function generateContextualSummary(
  candidateName: string = "{{CANDIDATE_NAME}}",
  jobTitle: string,
  requirementScores: any[],
  overallScore: number
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  const topMatches = requirementScores
    .filter((r) => r.similarityScore >= 0.7)
    .map((r) => r.requirementText)
    .slice(0, 2);

  const weakMatches = requirementScores
    .filter((r) => r.similarityScore < 0.6)
    .map((r) => r.requirementText)
    .slice(0, 2);

  let fallbackContextual = `${candidateName} achieves an overall match score of ${overallScore}% for the ${jobTitle} position. `;
  if (topMatches.length > 0) {
    fallbackContextual += `Demonstrates strong alignment on core requirements including ${topMatches.join(" and ")}. `;
  }
  if (weakMatches.length > 0) {
    fallbackContextual += `Weaker alignment noted on ${weakMatches.join(" and ")}, representing potential onboarding focus areas.`;
  } else {
    fallbackContextual += `Presents solid coverage across essential requirements for this role.`;
  }

  if (!apiKey || apiKey === "your_gemini_api_key_here" || apiKey.trim() === "") {
    return fallbackContextual;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-flash-latest" });

    const reqBreakdown = requirementScores
      .map(
        (r) =>
          `- Requirement [${r.priority}]: "${r.requirementText}" | Score: ${(r.similarityScore * 100).toFixed(1)}% | Evidence: "${r.evidenceText || "None"}"`
      )
      .join("\n");

    const prompt = `
You are an executive hiring manager. Write a 2-3 sentence role-fit synthesis explaining WHY the candidate received an overall match score of ${overallScore}% for the position of "${jobTitle}".
CRITICAL INSTRUCTION:
Always use the exact placeholder "{{CANDIDATE_NAME}}" whenever referring to the candidate by name. Never use any personal names or 'Candidate X'.

Reframe their background around fit for this specific job description:
1. Summarize their strongest requirement alignments.
2. Note any missing or weaker components relative to this specific role.

REQUIREMENT MATCH BREAKDOWN:
${reqBreakdown}
`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim() || fallbackContextual;
  } catch (err) {
    console.warn("Contextual summary generation failed, using fallback:", err);
    return fallbackContextual;
  }
}
