import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export type ParseConfidenceLevel = "LOW" | "MEDIUM" | "HIGH";

export interface TextExtractionResult {
  rawText: string;
  confidence: ParseConfidenceLevel;
  sectionsDetected: {
    experience: boolean;
    education: boolean;
    skills: boolean;
  };
}

/**
 * Evaluates parse confidence based on presence of expected resume sections:
 * Work Experience, Education, and Skills.
 */
export function evaluateParseConfidence(rawText: string): {
  confidence: ParseConfidenceLevel;
  sectionsDetected: { experience: boolean; education: boolean; skills: boolean };
} {
  const textLower = rawText.toLowerCase();

  const experienceKeywords = [
    "experience",
    "work history",
    "employment",
    "professional experience",
    "work experience",
    "career history",
    "positions held",
    "projects",
  ];

  const educationKeywords = [
    "education",
    "academic",
    "university",
    "college",
    "degree",
    "qualifications",
    "education & training",
    "background",
  ];

  const skillsKeywords = [
    "skill",
    "skills",
    "technologies",
    "technical skills",
    "core competencies",
    "expertise",
    "tools",
    "proficiencies",
    "languages",
  ];

  const hasExperience = experienceKeywords.some((kw) => textLower.includes(kw));
  const hasEducation = educationKeywords.some((kw) => textLower.includes(kw));
  const hasSkills = skillsKeywords.some((kw) => textLower.includes(kw));

  const sectionsCount = (hasExperience ? 1 : 0) + (hasEducation ? 1 : 0) + (hasSkills ? 1 : 0);

  let confidence: ParseConfidenceLevel = "LOW";
  if (sectionsCount === 3 && rawText.trim().length > 150) {
    confidence = "HIGH";
  } else if (sectionsCount >= 2 || rawText.trim().length > 200) {
    confidence = "MEDIUM";
  } else {
    confidence = "LOW";
  }

  return {
    confidence,
    sectionsDetected: {
      experience: hasExperience,
      education: hasEducation,
      skills: hasSkills,
    },
  };
}

/**
 * Extracts raw text from PDF or DOCX buffer gracefully without crashing.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<TextExtractionResult> {
  let rawText = "";

  const isPdf =
    mimeType.includes("pdf") || filename.toLowerCase().endsWith(".pdf");
  const isDocx =
    mimeType.includes("word") ||
    mimeType.includes("docx") ||
    filename.toLowerCase().endsWith(".docx");

  try {
    if (isPdf) {
      const pdfData = await pdfParse(buffer);
      rawText = pdfData.text || "";
    } else if (isDocx) {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value || "";
    } else {
      // Fallback for plain text or generic files
      rawText = buffer.toString("utf-8");
    }
  } catch (error) {
    console.error("Error during document text extraction:", error);
    // Graceful fallback on messy / corrupted extraction: preserve whatever string content exists
    rawText = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ");
  }

  // Clean up excessive whitespace/null bytes while preserving structure
  const cleanedText = rawText
    .replace(/\0/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();

  const confidenceEval = evaluateParseConfidence(cleanedText);

  return {
    rawText: cleanedText,
    confidence: confidenceEval.confidence,
    sectionsDetected: confidenceEval.sectionsDetected,
  };
}
