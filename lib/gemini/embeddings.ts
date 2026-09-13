import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Computes Cosine Similarity between two numerical vector embeddings vecA and vecB.
 * Returns a score between -1.0 and 1.0 (typically 0.0 to 1.0 for normalized text embeddings).
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1, similarity)); // Clamp between 0.0 and 1.0
}

// Semantic clusters for deterministic similarity fallbacks
const SEMANTIC_CLUSTERS = [
  { name: "fullstack_web", keywords: ["javascript", "typescript", "react", "next.js", "node", "node.js", "express", "express.js", "mongodb", "html", "css", "web", "full stack", "fullstack", "php", "frontend", "backend"], weight: 5.0 },
  { name: "apis_and_services", keywords: ["api", "apis", "rest", "restful", "endpoints", "microservices", "web services", "integration", "http", "json"], weight: 3.5 },
  { name: "software_engineering", keywords: ["scalable", "maintainable", "clean code", "code reviews", "unit tests", "testing", "collaborate", "deploy", "git", "ci/cd", "agile", "scrum"], weight: 3.0 },
  { name: "backend_db", keywords: ["database", "sql", "postgresql", "mysql", "mongodb", "orm", "prisma", "nosql", "redis"], weight: 3.2 },
  { name: "languages", keywords: ["java", "spring", "spring boot", "c#", ".net", "python", "golang", "ruby"], weight: 2.5 },
  { name: "education", keywords: ["degree", "b.tech", "be", "mca", "msc", "b.s", "computer science", "information technology", "engineering", "certifications", "certification"], weight: 2.8 },
  { name: "soft_skills", keywords: ["communication", "verbal", "written", "english", "problem-solving", "logical thinking", "leadership", "team", "discussions"], weight: 2.2 },
  { name: "design_marketing", keywords: ["figma", "illustrator", "photoshop", "ui/ux", "graphic design", "seo", "marketing", "copywriting"], weight: 2.0 }
];

function hashWordToken(w: string): number {
  let h = 5381;
  for (let i = 0; i < w.length; i++) {
    h = ((h << 5) + h) + w.charCodeAt(i);
  }
  return Math.abs(h);
}

/**
 * Deterministic pseudo-embedding generator fallback for testing and quota exhaustion resilience.
 */
export function generateDeterministicFallbackEmbedding(text: string, dim = 768): number[] {
  const vec: number[] = new Array(dim).fill(0);
  const textLower = (text || "").toLowerCase();
  const words = textLower.match(/[a-z0-9+#.]+/g) || [];

  // 1. Sparse token hashing
  for (const w of words) {
    const h = hashWordToken(w);
    const idx = h % dim;
    const sign = (h % 2 === 0) ? 1.0 : -1.0;
    vec[idx] += sign * (1.0 + Math.min(2.0, w.length * 0.2));
  }

  // 2. Semantic cluster dense activations
  SEMANTIC_CLUSTERS.forEach((cluster, cIdx) => {
    let matchCount = 0;
    for (const kw of cluster.keywords) {
      if (textLower.includes(kw)) matchCount++;
    }
    if (matchCount > 0) {
      const baseOffset = (cIdx * 75) % dim;
      const boost = cluster.weight * Math.min(3.5, 1.0 + matchCount * 0.45);
      for (let j = 0; j < 45; j++) {
        vec[(baseOffset + j) % dim] += boost;
      }
    }
  });

  const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  return vec.map((val) => val / (norm || 1));
}

// Global in-memory cache to eliminate redundant embedding API calls
const EMBEDDING_CACHE = new Map<string, number[]>();

/**
 * Generates vector embedding for input text using Gemini `embedding-001`.
 * Includes caching and automatic text chunking for 10+ page resumes.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const cleanText = text ? text.trim() : "";
  if (!cleanText) {
    return generateDeterministicFallbackEmbedding("empty");
  }

  // Cache Lookup
  if (EMBEDDING_CACHE.has(cleanText)) {
    return EMBEDDING_CACHE.get(cleanText)!;
  }

  // Edge Case #3: Chunk long resumes (> 1500 words / 10+ pages)
  const words = cleanText.split(/\s+/);
  if (words.length > 500) {
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += 400) {
      chunks.push(words.slice(i, i + 400).join(" "));
    }

    const chunkEmbeddings = await getBatchEmbeddings(chunks.slice(0, 8)); // Max 8 chunks
    const dim = chunkEmbeddings[0].length;
    const avgVec: number[] = new Array(dim).fill(0);

    for (const vec of chunkEmbeddings) {
      for (let i = 0; i < dim; i++) {
        avgVec[i] += vec[i];
      }
    }

    const norm = Math.sqrt(avgVec.reduce((sum, val) => sum + val * val, 0));
    const normalizedAvg = avgVec.map((val) => val / (norm || 1));
    EMBEDDING_CACHE.set(cleanText, normalizedAvg);
    return normalizedAvg;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here" || apiKey.trim() === "" || apiKey.startsWith("AQ.")) {
    const fallback = generateDeterministicFallbackEmbedding(cleanText);
    EMBEDDING_CACHE.set(cleanText, fallback);
    return fallback;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent(cleanText);
    const embedding = result.embedding.values;
    EMBEDDING_CACHE.set(cleanText, embedding);
    return embedding;
  } catch (error) {
    const fallback = generateDeterministicFallbackEmbedding(cleanText);
    EMBEDDING_CACHE.set(cleanText, fallback);
    return fallback;
  }
}

/**
 * Generates vector embeddings for an array of text strings with batch concurrency control.
 */
export async function getBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map((t) => getEmbedding(t)));
    results.push(...batchResults);

    if (i + BATCH_SIZE < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  return results;
}
