import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { appwriteDb } from "../appwrite/db";
import { SkillGapItem } from "../matching/gap-analysis";
import { RequirementMatchDetail } from "../matching/engine";

export interface GeneratedQuestion {
  questionText: string;
  reasoning: string;
  category: "TECHNICAL" | "BEHAVIORAL";
}

const questionSchema = {
  type: SchemaType.OBJECT,
  properties: {
    questions: {
      type: SchemaType.ARRAY,
      description: "List of grounded interview questions",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          questionText: {
            type: SchemaType.STRING,
            description: "Targeted interview question probing a specific gap or behavioral competency",
          },
          reasoning: {
            type: SchemaType.STRING,
            description: "Explicit rationale explaining why this question was generated, referencing the specific skill gap, missing evidence, or seniority level",
          },
          category: {
            type: SchemaType.STRING,
            enum: ["TECHNICAL", "BEHAVIORAL"],
          },
        },
        required: ["questionText", "reasoning", "category"],
      },
    },
  },
  required: ["questions"],
};

/**
 * Detects seniority level (JUNIOR, MID, SENIOR) from parsed work history and text.
 */

export function inferSeniorityLevel(parsedJson: any, rawText: string): "JUNIOR" | "MID" | "SENIOR" {
  const experiences = Array.isArray(parsedJson?.workExperience) ? parsedJson.workExperience : [];
  const textLower = rawText.toLowerCase();

  if (textLower.includes("senior") || textLower.includes("lead") || textLower.includes("architect") || experiences.length >= 4) {
    return "SENIOR";
  } else if (experiences.length >= 2 || textLower.includes("mid") || textLower.includes("developer")) {
    return "MID";
  }
  return "JUNIOR";
}

/**
 * Heuristic fallback question generator when Gemini API is unconfigured.
 */
function generateFallbackQuestions(
  skillGaps: SkillGapItem[],
  seniority: "JUNIOR" | "MID" | "SENIOR"
): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];

  // Technical questions for skill gaps
  skillGaps.slice(0, 3).forEach((gap) => {
    if (gap.gapType === "UNPROVEN") {
      questions.push({
        questionText: `You list ${gap.skillName} under your core skills, but your resume bullets do not detail a production project using it. Can you walk me through a specific feature you built using ${gap.skillName}?`,
        reasoning: `UNPROVEN SKILL GAP: Candidate claimed ${gap.skillName} in skills section, but zero supporting work experience bullets were found.`,
        category: "TECHNICAL",
      });
    } else {
      questions.push({
        questionText: `Our role requires experience with "${gap.skillName}". Could you describe your hands-on experience or how you would approach architectural tasks involving ${gap.skillName}?`,
        reasoning: `${gap.gapType} GAP: Candidate scored low similarity (${gap.gapType}) on the requirement for "${gap.skillName}".`,
        category: "TECHNICAL",
      });
    }
  });

  // Default technical question if no gaps
  if (questions.length === 0) {
    questions.push({
      questionText: "Walk us through a challenging technical bug or performance bottleneck you identified and solved in a recent production deployment.",
      reasoning: "GENERAL TECHNICAL PROBE: High match score candidate; probing deep debugging capabilities.",
      category: "TECHNICAL",
    });
  }

  // Behavioral questions calibrated to seniority
  if (seniority === "SENIOR") {
    questions.push(
      {
        questionText: "Describe a situation where you had an architectural disagreement with another senior engineer or lead. How did you resolve it?",
        reasoning: "SENIORITY CALIBRATION (SENIOR): Probing technical leadership, consensus building, and architectural decision-making.",
        category: "BEHAVIORAL",
      },
      {
        questionText: "Tell me about a project where you mentored junior team members while delivering a high-priority system migration under tight deadlines.",
        reasoning: "SENIORITY CALIBRATION (SENIOR): Probing team mentorship and delivery under pressure.",
        category: "BEHAVIORAL",
      }
    );
  } else if (seniority === "MID") {
    questions.push(
      {
        questionText: "Tell me about a time you had to take ownership of a feature with ambiguous requirements. How did you clarify requirements and deliver?",
        reasoning: "SENIORITY CALIBRATION (MID): Probing feature ownership, initiative, and communication.",
        category: "BEHAVIORAL",
      },
      {
        questionText: "Describe a situation where a code review raised significant changes to your implementation. How did you respond?",
        reasoning: "SENIORITY CALIBRATION (MID): Probing receptiveness to feedback and code quality standards.",
        category: "BEHAVIORAL",
      }
    );
  } else {
    questions.push(
      {
        questionText: "Describe a time when you were assigned a task using a technology or library you had never used before. How did you ramp up?",
        reasoning: "SENIORITY CALIBRATION (JUNIOR): Probing adaptability, learning speed, and problem solving.",
        category: "BEHAVIORAL",
      },
      {
        questionText: "Tell me about a time you felt stuck on a coding task. At what point did you ask for help, and how did you approach your team?",
        reasoning: "SENIORITY CALIBRATION (JUNIOR): Probing communication and team collaboration.",
        category: "BEHAVIORAL",
      }
    );
  }

  return questions;
}

import { isGroqConfigured, callGroqJson } from "../groq/client";

/**
 * Generates grounded interview questions tailored to specific candidate skill gaps and seniority level.
 */
export async function generateGroundedInterviewQuestions(
  matchScoreId: string,
  candidate: any,
  jobDescription: any,
  requirementScores: RequirementMatchDetail[],
  skillGaps: SkillGapItem[]
): Promise<GeneratedQuestion[]> {
  const seniority = inferSeniorityLevel(candidate.parsedJson, candidate.rawText);

  const gapsFormatted = skillGaps
    .map((g) => `- Skill Gap [${g.gapType}]: "${g.skillName}" (${g.reason || "Low match"})`)
    .join("\n");

  const prompt = `You are an expert interviewer creating candidate-specific, grounded interview questions.
Target Job Title: "${jobDescription.title || "Software Developer"}"
Candidate Seniority Level Detected: "${seniority}"

CANDIDATE SKILL GAPS DETECTED:
${gapsFormatted || "No major skill gaps."}

INSTRUCTIONS FOR QUESTION GENERATION:
1. For each MISSING, PARTIAL, or UNPROVEN skill gap, generate 1 targeted TECHNICAL question probing that exact gap.
   The 'reasoning' field MUST explicitly reference why this question was generated (e.g. "Resume mentions Redis under skills but zero caching projects - ask them to describe a caching bug they debugged").
2. Generate 2-3 BEHAVIORAL questions calibrated specifically to the candidate's detected seniority level ("${seniority}").
`;

  let questions: GeneratedQuestion[] = [];

  // 1. Try Groq Cloud if configured
  if (isGroqConfigured()) {
    try {
      const systemPrompt = `You are an expert interviewer creating candidate-specific, grounded interview questions.
Respond with valid JSON matching:
{
  "questions": [
    {
      "questionText": "string",
      "reasoning": "string",
      "category": "TECHNICAL" | "BEHAVIORAL"
    }
  ]
}`;
      const parsedData = await callGroqJson<{ questions: GeneratedQuestion[] }>(systemPrompt, prompt);
      if (Array.isArray(parsedData?.questions) && parsedData.questions.length > 0) {
        questions = parsedData.questions.map((q) => ({
          questionText: String(q.questionText || "").trim(),
          reasoning: String(q.reasoning || "").trim(),
          category: q.category === "BEHAVIORAL" ? "BEHAVIORAL" : "TECHNICAL",
        }));
      }
    } catch (groqErr) {
      console.warn("Groq question generation failed, attempting Gemini fallback:", groqErr);
    }
  }

  // 2. Try Gemini AI if Groq was not used or failed
  if (questions.length === 0) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "your_gemini_api_key_here" && apiKey.trim() !== "" && !apiKey.startsWith("AQ.")) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: process.env.GEMINI_MODEL || "gemini-flash-latest",
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: questionSchema,
            temperature: 0.2,
          },
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const parsedData = JSON.parse(responseText);

        if (Array.isArray(parsedData.questions) && parsedData.questions.length > 0) {
          questions = parsedData.questions;
        }
      } catch (err) {
        console.warn("Gemini question generation failed, using fallback:", err);
      }
    }
  }

  // 3. Fallback to heuristic questions if neither provider returned questions
  if (questions.length === 0) {
    questions = generateFallbackQuestions(skillGaps, seniority);
  }

  // Store in InterviewQuestions collection in Appwrite DB
  if (matchScoreId && !matchScoreId.startsWith("temp-")) {
    try {
      await appwriteDb.saveInterviewQuestions(
        matchScoreId,
        questions.map((q) => ({
          questionText: q.questionText,
          reasoning: q.reasoning,
          category: q.category,
        }))
      );
    } catch (dbErr) {
      console.warn("Could not save InterviewQuestions to Appwrite database:", dbErr);
    }
  }

  return questions;
}


export const generateInterviewQuestions = generateGroundedInterviewQuestions;
