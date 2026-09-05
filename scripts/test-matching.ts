import { loadEnv } from "../lib/load-env";
loadEnv();

import { PrismaClient } from "@prisma/client";
import { calculateMatchScore, extractResumeItems } from "../lib/matching/engine";
import { getEmbedding, cosineSimilarity } from "../lib/gemini/embeddings";

const prisma = new PrismaClient();

async function runSanityCheck() {
  console.log("========================================================================");
  console.log("🔍 VECTOR MATCHING ENGINE - CONSOLE SANITY CHECK");
  console.log("========================================================================\n");

  let candidate: any = null;
  let jobDescription: any = null;

  try {
    candidate = await prisma.candidate.findFirst({
      orderBy: { createdAt: "desc" },
    });

    jobDescription = await prisma.jobDescription.findFirst({
      orderBy: { createdAt: "desc" },
      include: { requirementsList: true },
    });
  } catch (err) {
    // Database connection fallback for instant console test
  }

  // Fallback candidate & JD data if database is uninitialized
  if (!candidate) {
    candidate = {
      id: "demo-cand-001",
      name: "Alex Rivera",
      email: "alex.rivera@example.com",
      rawText: "Senior Full-Stack Engineer with 5+ years experience building Next.js, React, Node.js, and PostgreSQL web applications.",
      parsedJson: {
        name: "Alex Rivera",
        email: "alex.rivera@example.com",
        skills: ["React", "Next.js", "TypeScript", "Node.js", "PostgreSQL", "Prisma", "AWS", "Docker", "REST API"],
        workExperience: [
          {
            company: "TechScale Solutions",
            role: "Senior Full-Stack Engineer",
            duration: "2021 - Present",
            bullets: [
              "Architected scalable Next.js 14 Web applications serving 500k monthly active users.",
              "Designed PostgreSQL schema and optimized query performance using Prisma ORM.",
              "Led a team of 4 engineers in migrating legacy REST APIs to GraphQL microservices on AWS.",
              "Implemented responsive UI components using TypeScript, React, and Tailwind CSS.",
            ],
          },
        ],
        education: [{ institution: "UC Berkeley", degree: "B.S. in Computer Science", year: "2019" }],
        certifications: ["AWS Certified Solutions Architect – Associate"],
      },
    };
  }

  if (!jobDescription) {
    jobDescription = {
      id: "demo-jd-001",
      title: "Senior React & Next.js Full-Stack Developer",
      requirementsList: [
        { text: "4+ years experience with React, Next.js, and TypeScript", priority: "REQUIRED" },
        { text: "Proficiency in PostgreSQL database design and Prisma ORM", priority: "REQUIRED" },
        { text: "Experience building REST APIs and microservices in Node.js", priority: "REQUIRED" },
        { text: "Familiarity with Cloud Infrastructure such as AWS, Vercel, or Docker", priority: "NICE_TO_HAVE" },
        { text: "Prior experience leading engineering sprints or mentoring junior developers", priority: "NICE_TO_HAVE" },
      ],
    };
  }

  console.log(`👤 Candidate: ${candidate.name} (${candidate.email})`);
  console.log(`📋 Job Description: "${jobDescription.title}"`);
  console.log(`📊 Requirements Count: ${jobDescription.requirementsList.length}\n`);

  console.log("⏳ Extracting candidate items & generating Gemini text-embedding-004 vectors...\n");

  const rawResumeItems = extractResumeItems(candidate.parsedJson, candidate.rawText);
  const embeddedCandidateItems = [];

  for (const item of rawResumeItems) {
    const embedding = await getEmbedding(item.text);
    embeddedCandidateItems.push({
      text: item.text,
      sourceSpan: item.sourceSpan,
      embedding,
    });
  }

  console.log(`✅ Computed embeddings for ${embeddedCandidateItems.length} discrete candidate resume items.`);
  console.log("------------------------------------------------------------------------");
  console.log("📌 RAW COSINE SIMILARITY MATCHING BREAKDOWN");
  console.log("------------------------------------------------------------------------\n");

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (let index = 0; index < jobDescription.requirementsList.length; index++) {
    const req = jobDescription.requirementsList[index];
    const reqEmbedding = await getEmbedding(req.text);

    let highestScore = 0;
    let bestMatchItem = embeddedCandidateItems[0]?.text || "";
    let bestSourceSpan = embeddedCandidateItems[0]?.sourceSpan || "";

    for (const candidateItem of embeddedCandidateItems) {
      const score = cosineSimilarity(reqEmbedding, candidateItem.embedding);
      if (score > highestScore) {
        highestScore = score;
        bestMatchItem = candidateItem.text;
        bestSourceSpan = candidateItem.sourceSpan;
      }
    }

    const priority = req.priority || "REQUIRED";
    const weight = priority === "REQUIRED" ? 1.5 : 1.0;
    totalWeightedScore += highestScore * weight;
    totalWeight += weight;

    const priorityTag = priority === "REQUIRED" ? "[REQUIRED  ]" : "[NICE_TO_HAVE]";
    const roundedScore = Math.round(highestScore * 1000) / 1000;
    const scoreBar = "█".repeat(Math.round(highestScore * 20)).padEnd(20, "░");

    console.log(`${index + 1}. ${priorityTag} "${req.text}"`);
    console.log(`   Cosine Similarity Score : ${roundedScore.toFixed(3)} (${(roundedScore * 100).toFixed(1)}%) | ${scoreBar}`);
    console.log(`   Evidence Matched        : "${bestMatchItem}"`);
    console.log(`   Source Section Span     : ${bestSourceSpan}`);
    console.log("");
  }

  const rawOverall = totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0;
  const overallScore = Math.round(rawOverall * 10) / 10;

  console.log("========================================================================");
  console.log(`🎯 WEIGHTED OVERALL MATCH SCORE: ${overallScore}%`);
  console.log("   (REQUIRED requirements weighted 1.5x, NICE_TO_HAVE weighted 1.0x)");
  console.log("========================================================================\n");
}

runSanityCheck()
  .catch((err) => {
    console.error("❌ Sanity check failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
