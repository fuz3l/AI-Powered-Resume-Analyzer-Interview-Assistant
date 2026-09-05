import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { wrapInSafetyBoundary } from "../security/sanitizer";

export interface WorkExperienceItem {
  company: string;
  role: string;
  duration: string;
  bullets: string[];
}

export interface EducationItem {
  institution: string;
  degree: string;
  year?: string;
}

export interface CandidateParsedJson {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  workExperience: WorkExperienceItem[];
  education: EducationItem[];
  certifications: string[];
}

const candidateSchema = {
  type: SchemaType.OBJECT,
  properties: {
    name: { type: SchemaType.STRING, description: "Full name of the candidate" },
    email: { type: SchemaType.STRING, description: "Email address of candidate" },
    phone: { type: SchemaType.STRING, description: "Phone number of candidate" },
    skills: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "List of technical and soft skills",
    },
    workExperience: {
      type: SchemaType.ARRAY,
      description: "Work history entries",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          company: { type: SchemaType.STRING },
          role: { type: SchemaType.STRING },
          duration: { type: SchemaType.STRING },
          bullets: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: ["company", "role", "bullets"],
      },
    },
    education: {
      type: SchemaType.ARRAY,
      description: "Educational history",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          institution: { type: SchemaType.STRING },
          degree: { type: SchemaType.STRING },
          year: { type: SchemaType.STRING },
        },
        required: ["institution", "degree"],
      },
    },
    certifications: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Licenses or professional certifications",
    },
  },
  required: ["name", "email", "skills", "workExperience", "education"],
};

/**
 * Heuristic fallback parser when API key is not configured or network call is unreachable.
 */
function fallbackHeuristicParser(rawText: string): CandidateParsedJson {
  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = rawText.match(/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);

  const name = lines[0] && lines[0].length < 40 ? lines[0] : "Candidate";
  const email = emailMatch ? emailMatch[0] : "";
  const phone = phoneMatch ? phoneMatch[0] : "";

  const techKeywords = [
    "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Python",
    "Java", "C++", "C#", "Go", "PostgreSQL", "Prisma", "Tailwind CSS", "HTML", "CSS",
    "Git", "Docker", "AWS", "REST API", "GraphQL", "SQL", "Agile", "DevOps"
  ];
  const detectedSkills = techKeywords.filter((skill) => {
    try {
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const endsWithWord = /\w$/.test(skill);
      const regex = new RegExp(`\\b${escaped}${endsWithWord ? "\\b" : "(?:\\s|$|[^\\w]|,)"}`, "i");
      return regex.test(rawText);
    } catch {
      return rawText.toLowerCase().includes(skill.toLowerCase());
    }
  });

  return {
    name,
    email,
    phone,
    skills: detectedSkills.length > 0 ? detectedSkills : ["Software Development", "Problem Solving"],
    workExperience: [
      {
        company: "Extracted Experience",
        role: "Software Developer",
        duration: "Recent",
        bullets: lines.slice(2, 6).filter((line) => line.length > 15),
      },
    ],
    education: [
      {
        institution: "University / Institution",
        degree: "Degree in relevant field",
      },
    ],
    certifications: [],
  };
}

/**
 * Sends raw resume text to Gemini API using JSON Structured Mode.
 */
export async function parseResumeWithGemini(
  rawText: string
): Promise<CandidateParsedJson> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "your_gemini_api_key_here" || apiKey.trim() === "") {
    console.warn("GEMINI_API_KEY not configured. Utilizing fallback heuristic extraction.");
    return fallbackHeuristicParser(rawText);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-flash-latest",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: candidateSchema,
        temperature: 0.1,
      },
    });

    const safeInputText = wrapInSafetyBoundary(rawText);
    const prompt = `
You are an expert ATS (Applicant Tracking System) resume parser. 
Extract structured information from the provided resume text into clean JSON.

${safeInputText}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsedData = JSON.parse(responseText) as CandidateParsedJson;

    // Ensure empty defaults for missing keys
    return {
      name: parsedData.name || "Unknown Candidate",
      email: parsedData.email || "",
      phone: parsedData.phone || "",
      skills: Array.isArray(parsedData.skills) ? parsedData.skills : [],
      workExperience: Array.isArray(parsedData.workExperience) ? parsedData.workExperience : [],
      education: Array.isArray(parsedData.education) ? parsedData.education : [],
      certifications: Array.isArray(parsedData.certifications) ? parsedData.certifications : [],
    };
  } catch (error) {
    console.error("Gemini Structured Parsing failed, switching to heuristic fallback:", error);
    return fallbackHeuristicParser(rawText);
  }
}
