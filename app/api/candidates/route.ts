import { NextResponse } from "next/server";
import { appwriteDb } from "@/lib/appwrite/db";

export async function GET() {
  try {
    const candidateDocs = await appwriteDb.listCandidates();
    const candidates = candidateDocs.map((c: any) => ({
      id: c.id || c.$id,
      name: c.name,
      email: c.email,
      parseConfidence: c.parseConfidence,
      createdAt: c.createdAt,
    }));

    return NextResponse.json({
      success: true,
      candidates,
    });
  } catch (error: any) {
    console.error("GET Candidates API Error:", error);
    return NextResponse.json({
      success: true,
      candidates: [],
    });
  }
}
