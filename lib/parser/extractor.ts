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

import zlib from "zlib";

function decodeAscii85(str: string): Buffer {
  let clean = str.replace(/\s+/g, "");
  if (clean.endsWith("~>")) clean = clean.slice(0, -2);
  if (clean.startsWith("<~")) clean = clean.slice(2);
  
  const bytes: number[] = [];
  let tuple = 0;
  let count = 0;
  
  for (let i = 0; i < clean.length; i++) {
    const c = clean.charCodeAt(i);
    if (c === 122 && count === 0) { // "z" represents 4 zeroes
      bytes.push(0, 0, 0, 0);
      continue;
    }
    if (c < 33 || c > 117) continue;
    tuple = tuple * 85 + (c - 33);
    count++;
    if (count === 5) {
      bytes.push((tuple >> 24) & 255, (tuple >> 16) & 255, (tuple >> 8) & 255, tuple & 255);
      tuple = 0;
      count = 0;
    }
  }
  if (count > 0) {
    for (let i = count; i < 5; i++) tuple = tuple * 85 + 84;
    for (let i = 0; i < count - 1; i++) {
      bytes.push((tuple >> (24 - i * 8)) & 255);
    }
  }
  return Buffer.from(bytes);
}

export function extractTextFromPdfStreamBuffer(buffer: Buffer): string {
  const fileStr = buffer.toString("binary");
  let extractedText = "";

  const streamRegex = /stream[\r\n]+([\s\S]+?)[\r\n]*endstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(fileStr)) !== null) {
    const streamContent = match[1];
    const streamIndex = match.index;
    const headerContext = fileStr.slice(Math.max(0, streamIndex - 400), streamIndex);

    let uncompressed: string = "";
    try {
      if (headerContext.includes("ASCII85Decode")) {
        const decodedA85 = decodeAscii85(streamContent);
        if (headerContext.includes("FlateDecode")) {
          uncompressed = zlib.inflateSync(decodedA85).toString("utf-8");
        } else {
          uncompressed = decodedA85.toString("utf-8");
        }
      } else if (headerContext.includes("FlateDecode")) {
        const rawBuf = Buffer.from(streamContent, "binary");
        uncompressed = zlib.inflateSync(rawBuf).toString("utf-8");
      } else {
        uncompressed = streamContent;
      }
    } catch {
      continue;
    }

    if (!uncompressed) continue;

    // Parse (Text) Tj patterns
    const tjMatches = uncompressed.match(/\((.*?)\)\s*Tj/g);
    if (tjMatches) {
      for (const m of tjMatches) {
        const textPart = m.replace(/^\(/, "").replace(/\)\s*Tj$/, "");
        const cleanPart = textPart
          .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
          .replace(/\\([nrtbf()])/g, "$1")
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ");
        extractedText += " " + cleanPart;
      }
      extractedText += "\n";
    }

    // Parse [(Text) (More)] TJ patterns
    const arrayTjMatches = uncompressed.match(/\[([\s\S]*?)\]\s*TJ/g);
    if (arrayTjMatches) {
      for (const m of arrayTjMatches) {
        const inner = m.replace(/^\[/, "").replace(/\]\s*TJ$/, "");
        const parts = inner.match(/\((.*?)\)/g);
        if (parts) {
          const str = parts
            .map((p) =>
              p
                .slice(1, -1)
                .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
                .replace(/\\([nrtbf()])/g, "$1")
            )
            .join("");
          extractedText += " " + str;
        }
      }
      extractedText += "\n";
    }
  }

  return extractedText.trim();
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
      try {
        const pdfData = await pdfParse(buffer);
        if (pdfData.text && pdfData.text.trim().length > 50 && !pdfData.text.startsWith("%PDF")) {
          rawText = pdfData.text;
        }
      } catch (pdfErr) {
        console.warn("pdf-parse parser warning, attempting resilient stream extraction:", pdfErr);
      }

      // If pdf-parse failed or returned minimal/empty/raw text, use resilient stream decoder
      if (!rawText || rawText.trim().length < 50 || rawText.startsWith("%PDF")) {
        const streamText = extractTextFromPdfStreamBuffer(buffer);
        if (streamText && streamText.length > 50) {
          rawText = streamText;
        }
      }
    } else if (isDocx) {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value || "";
    } else {
      // Fallback for plain text or generic files
      rawText = buffer.toString("utf-8");
    }
  } catch (error) {
    console.error("Error during document text extraction:", error);
    // Graceful fallback
    const streamText = isPdf ? extractTextFromPdfStreamBuffer(buffer) : "";
    rawText = streamText || buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ");
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

