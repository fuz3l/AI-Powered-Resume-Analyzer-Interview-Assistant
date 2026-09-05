import { NextRequest, NextResponse } from "next/server";
import { extractTextFromBuffer } from "@/lib/parser/extractor";
import { parseJobDescriptionWithGemini } from "@/lib/gemini/jd-parser";
import { getEmbedding } from "@/lib/gemini/embeddings";
import { appwriteDb } from "@/lib/appwrite/db";

export async function POST(req: NextRequest) {
  try {
    let title = "";
    let rawText = "";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const textInput = (formData.get("rawText") as string) || "";
      title = (formData.get("title") as string) || "";

      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const extraction = await extractTextFromBuffer(buffer, file.type, file.name);
        rawText = extraction.rawText;
      } else {
        rawText = textInput;
      }
    } else {
      const body = await req.json();
      title = body.title || "";
      rawText = body.rawText || "";
    }

    const cleanText = rawText.trim();
    if (!cleanText || cleanText.length < 30) {
      return NextResponse.json(
        {
          success: false,
          error: "Job Description text is too short. Please provide a full job description (at least 30 characters).",
        },
        { status: 400 }
      );
    }

    // Garbage text check: must contain at least 4 space-separated words
    const words = cleanText.split(/\s+/).filter((w) => w.length > 1);
    if (words.length < 4) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Job Description text. Please paste a complete job description with realistic role requirements.",
        },
        { status: 400 }
      );
    }

    // Step 1: Parse requirements using Gemini Structured JSON Mode
    const parsedJd = await parseJobDescriptionWithGemini(rawText);
    const finalTitle = title || parsedJd.title || "Job Position";

    // Step 2: Generate Vector Embeddings ONLY for candidate scoring requirements (exclude PERK_OR_CULTURE)
    const scoringRequirements = parsedJd.requirements.filter(
      (req) => req.category !== "PERK_OR_CULTURE"
    );

    const requirementItemsWithEmbeddings = [];
    for (const reqItem of scoringRequirements) {
      const embedding = await getEmbedding(reqItem.text);
      requirementItemsWithEmbeddings.push({
        text: reqItem.text,
        priority: reqItem.priority,
        embeddingJson: embedding,
      });
    }

    // Step 3: Database Persistence in Appwrite Collections
    let jobDescriptionRecord = null;
    let savedToDb = false;

    try {
      jobDescriptionRecord = await appwriteDb.createJobDescription({
        title: finalTitle,
        rawText: rawText,
        requirements: parsedJd.requirements,
        requirementsList: requirementItemsWithEmbeddings,
      });
      savedToDb = true;
    } catch (dbErr) {
      console.warn("Job Description DB save warning (preview mode):", dbErr);
      jobDescriptionRecord = {
        id: `temp-jd-${Date.now()}`,
        title: finalTitle,
        rawText,
        requirements: parsedJd.requirements,
        requirementsList: requirementItemsWithEmbeddings.map((item, idx) => ({
          id: `temp-req-${idx}`,
          jobDescriptionId: `temp-jd-${Date.now()}`,
          text: item.text,
          priority: item.priority,
          embeddingJson: item.embeddingJson,
          createdAt: new Date().toISOString(),
        })),
        createdAt: new Date().toISOString(),
      };
    }

    return NextResponse.json({
      success: true,
      savedToDb,
      jobDescription: jobDescriptionRecord,
    });
  } catch (error: any) {
    console.error("Job Description API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An error occurred while creating Job Description." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const jobDescriptions = await appwriteDb.listJobDescriptions();

    return NextResponse.json({
      success: true,
      jobDescriptions,
    });
  } catch (error: any) {
    console.error("GET Job Descriptions Error:", error);
    return NextResponse.json(
      { success: true, jobDescriptions: [] },
      { status: 200 }
    );
  }
}
