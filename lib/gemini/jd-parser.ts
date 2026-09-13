import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export type RequirementCategory =
  | "SKILL"
  | "EXPERIENCE"
  | "EDUCATION"
  | "RESPONSIBILITY"
  | "PERK_OR_CULTURE";

export interface ParsedJobRequirementItem {
  text: string;
  category: RequirementCategory;
  priority: "REQUIRED" | "NICE_TO_HAVE";
}

export interface ParsedJobDescriptionResult {
  title: string;
  requirements: ParsedJobRequirementItem[];
}

const jdSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING, description: "Job title or role designation" },
    requirements: {
      type: SchemaType.ARRAY,
      description: "Itemized discrete list of requirements and company context extracted from the job description",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          text: {
            type: SchemaType.STRING,
            description: "Clear, concise requirement string without bullet characters or numbering",
          },
          category: {
            type: SchemaType.STRING,
            enum: ["SKILL", "EXPERIENCE", "EDUCATION", "RESPONSIBILITY", "PERK_OR_CULTURE"],
            description: "Classification category for the extracted item",
          },
          priority: {
            type: SchemaType.STRING,
            enum: ["REQUIRED", "NICE_TO_HAVE"],
            description: "Classification of whether requirement is strictly required or preferred",
          },
        },
        required: ["text", "category", "priority"],
      },
    },
  },
  required: ["title", "requirements"],
};

const SECTION_HEADING_REGEX = /^(experience\s+and\s+qualifications|perks\s+and\s+benefits|requirements|qualifications|responsibilities|what\s+we\s+offer|benefits|perks|about\s+the\s+role|about\s+us|key\s+responsibilities|job\s+summary|role\s+overview|nice\s+to\s+have|preferred\s+qualifications|training\s+and\s+development)[\s:]*$/i;

const PERK_OR_CULTURE_REGEX = /(celebration|festival|birthday|engagement\s+activit|good\s+infrastructure|flexible\s+working\s+culture|onsite\s+opportunity|game\s+room|snack|happy\s+hour|casual\s+dress|wellness|insurance|health\s+cover|paid\s+time\s+off|pto\b|commuter|gym|cafeteria|parental\s+leave|bonus\s+policy|referral\s+bonus|days\s+a\s+week|working\s+days)/i;

/**
 * Heuristic fallback parser when GEMINI_API_KEY is unconfigured or call fails.
 */
function fallbackJdParser(rawText: string): ParsedJobDescriptionResult {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  
  let title = "Job Position";
  if (lines.length > 0 && lines[0].length < 60) {
    title = lines[0].replace(/^#+\s*/, "").replace(/^Job Title:\s*/i, "");
  }

  const requirements: ParsedJobRequirementItem[] = [];

  for (const line of lines) {
    const cleanLine = line.replace(/^[-*•\d.]+\s*/, "").trim();
    if (cleanLine.length < 5 || cleanLine.length > 200) continue;

    // Ignore section headings
    if (SECTION_HEADING_REGEX.test(cleanLine)) continue;

    const lower = cleanLine.toLowerCase();
    let priority: "REQUIRED" | "NICE_TO_HAVE" = "REQUIRED";

    if (
      lower.includes("nice to have") ||
      lower.includes("bonus") ||
      lower.includes("plus") ||
      lower.includes("preferred") ||
      lower.includes("optional")
    ) {
      priority = "NICE_TO_HAVE";
    }

    let category: RequirementCategory = "SKILL";

    if (PERK_OR_CULTURE_REGEX.test(lower)) {
      category = "PERK_OR_CULTURE";
      priority = "NICE_TO_HAVE";
    } else if (
      lower.includes("degree") ||
      lower.includes("bachelor") ||
      lower.includes("master") ||
      lower.includes("b.s") ||
      lower.includes("b.tech") ||
      lower.includes("certification")
    ) {
      category = "EDUCATION";
    } else if (
      lower.includes("year") ||
      lower.includes("senior") ||
      lower.includes("lead") ||
      lower.includes("proven track record") ||
      lower.includes("prior experience")
    ) {
      category = "EXPERIENCE";
    } else if (
      lower.startsWith("design") ||
      lower.startsWith("develop") ||
      lower.startsWith("architect") ||
      lower.startsWith("maintain") ||
      lower.startsWith("collaborate") ||
      lower.startsWith("lead") ||
      lower.startsWith("build")
    ) {
      category = "RESPONSIBILITY";
    }

    requirements.push({ text: cleanLine, category, priority });
  }

  if (requirements.filter((r) => r.category !== "PERK_OR_CULTURE").length === 0) {
    requirements.push(
      { text: "3+ years of professional software development experience", category: "EXPERIENCE", priority: "REQUIRED" },
      { text: "Strong proficiency in TypeScript and React / Next.js", category: "SKILL", priority: "REQUIRED" },
      { text: "Experience with PostgreSQL and ORMs (Prisma)", category: "SKILL", priority: "REQUIRED" },
      { text: "Familiarity with Cloud Deployment (AWS / Vercel)", category: "SKILL", priority: "NICE_TO_HAVE" }
    );
  }

  return { title, requirements };
}

import { isGroqConfigured, callGroqJson } from "../groq/client";

/**
 * Extracts a discrete, itemized list of requirements tagged with category and priority using Groq or Gemini AI.
 */
export async function parseJobDescriptionWithGemini(
  rawText: string
): Promise<ParsedJobDescriptionResult> {
  const sanitizeRequirements = (title: string, rawReqs: any[]): ParsedJobDescriptionResult => {
    let requirements = Array.isArray(rawReqs) ? rawReqs : [];

    // Filter out any section headings that slipped through
    requirements = requirements.filter(
      (r) => r?.text && !SECTION_HEADING_REGEX.test(r.text.trim())
    );

    // Ensure category is set
    requirements = requirements.map((r) => {
      let cat = r.category;
      if (!cat || !["SKILL", "EXPERIENCE", "EDUCATION", "RESPONSIBILITY", "PERK_OR_CULTURE"].includes(cat)) {
        cat = PERK_OR_CULTURE_REGEX.test(r.text) ? "PERK_OR_CULTURE" : "SKILL";
      }
      let priority = r.priority === "NICE_TO_HAVE" ? "NICE_TO_HAVE" : "REQUIRED";
      if (cat === "PERK_OR_CULTURE") priority = "NICE_TO_HAVE";
      return {
        text: String(r.text).trim(),
        category: cat,
        priority,
      };
    });

    // Ensure at least 3 genuine scoring requirements are returned
    const scoringReqs = requirements.filter((r) => r.category !== "PERK_OR_CULTURE");
    if (scoringReqs.length < 3) {
      const fallbackReqs = fallbackJdParser(rawText).requirements;
      for (const req of fallbackReqs) {
        if (!requirements.some((r) => r.text.toLowerCase() === req.text.toLowerCase())) {
          requirements.push(req);
        }
      }
    }

    return {
      title: title || "Job Position",
      requirements,
    };
  };

  // 1. Try Groq Cloud if configured
  if (isGroqConfigured()) {
    try {
      const systemPrompt = `You are an expert technical recruiter and ATS parser.
Analyze the job description below and extract:
1. The exact or inferred Job Title.
2. A discrete list of individual items categorized into:
   - "SKILL": technical skills, programming languages, frameworks, libraries, tools, soft skills.
   - "EXPERIENCE": years of experience, seniority level, domain or industry background.
   - "EDUCATION": degrees, academic background, formal certifications.
   - "RESPONSIBILITY": day-to-day duties, expectations, role responsibilities.
   - "PERK_OR_CULTURE": employee benefits, perks, workplace culture, celebrations, festivals, birthdays, office infrastructure, flexible hours, PTO, engagement activities — anything describing company perks rather than candidate qualifications.

CRITICAL PARSING RULES:
1. NEVER extract section headings as requirements! Ignore headers like "Experience And Qualifications", "Perks And Benefits", "Requirements", "About Us", "What We Offer", "Responsibilities", "Qualifications", "Nice to Haves".
2. Break multi-point statements into distinct individual items.
3. Classify each item as "REQUIRED" (must have / essential) or "NICE_TO_HAVE" (preferred / bonus / perk). For PERK_OR_CULTURE items, always set priority to "NICE_TO_HAVE".
4. Real candidate scoring will ONLY be evaluated against SKILL, EXPERIENCE, EDUCATION, and RESPONSIBILITY. Company perks, celebrations, and office amenities MUST be classified as "PERK_OR_CULTURE".

Respond with valid JSON matching:
{
  "title": "string",
  "requirements": [
    {
      "text": "string",
      "category": "SKILL" | "EXPERIENCE" | "EDUCATION" | "RESPONSIBILITY" | "PERK_OR_CULTURE",
      "priority": "REQUIRED" | "NICE_TO_HAVE"
    }
  ]
}`;

      const userPrompt = `JOB DESCRIPTION TEXT:\n"""\n${rawText}\n"""`;
      const parsedData = await callGroqJson<ParsedJobDescriptionResult>(systemPrompt, userPrompt);
      return sanitizeRequirements(parsedData.title, parsedData.requirements);
    } catch (groqErr) {
      console.warn("Groq Job Description parsing warning, attempting Gemini fallback:", groqErr);
    }
  }

  // 2. Try Gemini AI if configured
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== "your_gemini_api_key_here" && apiKey.trim() !== "" && !apiKey.startsWith("AQ.")) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-flash-latest",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: jdSchema,
          temperature: 0.1,
        },
      });

      const prompt = `
You are an expert technical recruiter and ATS parser.
Analyze the job description below and extract:
1. The exact or inferred Job Title.
2. A discrete list of individual items categorized into:
   - "SKILL": technical skills, programming languages, frameworks, libraries, tools, soft skills.
   - "EXPERIENCE": years of experience, seniority level, domain or industry background.
   - "EDUCATION": degrees, academic background, formal certifications.
   - "RESPONSIBILITY": day-to-day duties, expectations, role responsibilities.
   - "PERK_OR_CULTURE": employee benefits, perks, workplace culture, celebrations, festivals, birthdays, office infrastructure, flexible hours, PTO, engagement activities — anything describing company perks rather than candidate qualifications.

CRITICAL PARSING RULES:
1. NEVER extract section headings as requirements! Ignore headers like "Experience And Qualifications", "Perks And Benefits", "Requirements", "About Us", "What We Offer", "Responsibilities", "Qualifications", "Nice to Haves".
2. Break multi-point statements into distinct individual items.
3. Classify each item as "REQUIRED" (must have / essential) or "NICE_TO_HAVE" (preferred / bonus / perk). For PERK_OR_CULTURE items, always set priority to "NICE_TO_HAVE".
4. Real candidate scoring will ONLY be evaluated against SKILL, EXPERIENCE, EDUCATION, and RESPONSIBILITY. Company perks, celebrations, and office amenities MUST be classified as "PERK_OR_CULTURE".

JOB DESCRIPTION TEXT:
"""
${rawText}
"""
`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsedData = JSON.parse(responseText) as ParsedJobDescriptionResult;

      return sanitizeRequirements(parsedData.title, parsedData.requirements);
    } catch (error) {
      console.warn("Gemini Job Description parsing warning, using fallback:", error);
    }
  }

  return fallbackJdParser(rawText);
}

