import { NextRequest, NextResponse } from "next/server";
import { calculateMatchScore } from "@/lib/matching/engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { candidateId, jobDescriptionId } = body;

    if (!candidateId || !jobDescriptionId) {
      return NextResponse.json(
        { success: false, error: "Both candidateId and jobDescriptionId are required." },
        { status: 400 }
      );
    }

    const matchResult = await calculateMatchScore(candidateId, jobDescriptionId);

    return NextResponse.json({
      success: true,
      match: matchResult,
    });
  } catch (error: any) {
    console.error("Match Engine API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An error occurred during matching." },
      { status: 500 }
    );
  }
}
