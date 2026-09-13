import { ID, Query } from "node-appwrite";
import { createAdminClient } from "./client";
import { COLLECTIONS } from "./init";

// In-memory store fallback when Appwrite credentials are not yet configured or during development
const memoryStore = {
  candidates: new Map<string, any>(),
  suspiciousContents: new Map<string, any>(),
  jobDescriptions: new Map<string, any>(),
  jobRequirements: new Map<string, any>(),
  matchScores: new Map<string, any>(),
  requirementScores: new Map<string, any>(),
  skillGaps: new Map<string, any>(),
  interviewQuestions: new Map<string, any>(),
};

// Seed in-memory store with default sample role
if (memoryStore.jobDescriptions.size === 0) {
  const sampleJdId = "jd-default-react-lead";
  memoryStore.jobDescriptions.set(sampleJdId, {
    $id: sampleJdId,
    id: sampleJdId,
    title: "Senior React & Next.js Full-Stack Developer",
    rawText: "Senior Full-Stack Engineer with React, Next.js, TypeScript, PostgreSQL, and AWS.",
    requirements: [
      { text: "3+ years professional experience with React and Next.js", priority: "REQUIRED" },
      { text: "Strong proficiency in TypeScript and asynchronous API design", priority: "REQUIRED" },
      { text: "Hands-on experience with PostgreSQL and relational databases", priority: "REQUIRED" },
      { text: "Familiarity with Vector embeddings, AI APIs, or pgvector", priority: "NICE_TO_HAVE" },
    ],
    createdAt: new Date().toISOString(),
  });

  memoryStore.jobRequirements.set("req-1", {
    $id: "req-1",
    id: "req-1",
    jobDescriptionId: sampleJdId,
    text: "3+ years professional experience with React and Next.js",
    priority: "REQUIRED",
    embeddingJson: null,
    createdAt: new Date().toISOString(),
  });
  memoryStore.jobRequirements.set("req-2", {
    $id: "req-2",
    id: "req-2",
    jobDescriptionId: sampleJdId,
    text: "Strong proficiency in TypeScript and asynchronous API design",
    priority: "REQUIRED",
    embeddingJson: null,
    createdAt: new Date().toISOString(),
  });
  memoryStore.jobRequirements.set("req-3", {
    $id: "req-3",
    id: "req-3",
    jobDescriptionId: sampleJdId,
    text: "Hands-on experience with PostgreSQL and relational databases",
    priority: "REQUIRED",
    embeddingJson: null,
    createdAt: new Date().toISOString(),
  });
  memoryStore.jobRequirements.set("req-4", {
    $id: "req-4",
    id: "req-4",
    jobDescriptionId: sampleJdId,
    text: "Familiarity with Vector embeddings, AI APIs, or pgvector",
    priority: "NICE_TO_HAVE",
    embeddingJson: null,
    createdAt: new Date().toISOString(),
  });
}

function parseJsonSafe(val: any, fallback: any = null) {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function stringifyJsonSafe(val: any): string {
  if (typeof val === "string") return val;
  return JSON.stringify(val || {});
}

async function safeListDocuments(
  databases: any,
  databaseId: string,
  collectionId: string,
  field: string,
  value: string,
  orderByField?: string
) {
  try {
    const queries = [Query.equal(field, value), Query.limit(100)];
    if (orderByField) {
      queries.push(Query.orderDesc(orderByField));
    }
    return await databases.listDocuments(databaseId, collectionId, queries);
  } catch (err: any) {
    // If index is missing or building, fetch collection and filter client-side
    const res = await databases.listDocuments(databaseId, collectionId, [Query.limit(100)]);
    const filtered = res.documents.filter((d: any) => d[field] === value);
    if (orderByField) {
      filtered.sort((a: any, b: any) => new Date(b[orderByField]).getTime() - new Date(a[orderByField]).getTime());
    }
    return { ...res, documents: filtered };
  }
}


export const appwriteDb = {
  // ==================== CANDIDATES ====================
  async createCandidate(data: {
    id?: string;
    name?: string | null;
    email?: string | null;
    rawText: string;
    parsedJson: any;
    anonymizedName?: string | null;
    anonymizedText?: string | null;
    anonymizedJson?: any;
    generalSummary?: string | null;
    parseConfidence?: string;
    resumeFileUrl?: string | null;
  }) {
    const candidateId = data.id || ID.unique();
    const docData = {
      name: data.name || "",
      email: data.email || "",
      rawText: data.rawText,
      parsedJson: stringifyJsonSafe(data.parsedJson),
      anonymizedName: data.anonymizedName || "",
      anonymizedText: data.anonymizedText || "",
      anonymizedJson: stringifyJsonSafe(data.anonymizedJson),
      generalSummary: data.generalSummary || "",
      parseConfidence: data.parseConfidence || "HIGH",
      resumeFileUrl: data.resumeFileUrl || "",
      createdAt: new Date().toISOString(),
    };

    try {
      const { databases, config } = createAdminClient();
      if (!config.projectId || !config.apiKey) throw new Error("No Appwrite config");
      const doc = await databases.createDocument(
        config.databaseId,
        COLLECTIONS.CANDIDATES,
        candidateId,
        docData
      );
      return {
        id: doc.$id,
        ...doc,
        parsedJson: parseJsonSafe(doc.parsedJson),
        anonymizedJson: parseJsonSafe(doc.anonymizedJson),
      };
    } catch (err) {
      console.warn("Saving candidate to in-memory store (Appwrite fallback):", err);
      const record = {
        id: candidateId,
        $id: candidateId,
        ...data,
        createdAt: docData.createdAt,
      };
      memoryStore.candidates.set(candidateId, record);
      return record;
    }
  },

  async updateCandidate(candidateId: string, data: Partial<{
    name: string | null;
    email: string | null;
    rawText: string;
    parsedJson: any;
    anonymizedName: string | null;
    anonymizedText: string | null;
    anonymizedJson: any;
    generalSummary: string | null;
    parseConfidence: string;
    resumeFileUrl: string | null;
  }>) {
    const docData: any = {};
    if (data.name !== undefined) docData.name = data.name || "";
    if (data.email !== undefined) docData.email = data.email || "";
    if (data.rawText !== undefined) docData.rawText = data.rawText;
    if (data.parsedJson !== undefined) docData.parsedJson = stringifyJsonSafe(data.parsedJson);
    if (data.anonymizedName !== undefined) docData.anonymizedName = data.anonymizedName || "";
    if (data.anonymizedText !== undefined) docData.anonymizedText = data.anonymizedText || "";
    if (data.anonymizedJson !== undefined) docData.anonymizedJson = stringifyJsonSafe(data.anonymizedJson);
    if (data.generalSummary !== undefined) docData.generalSummary = data.generalSummary || "";
    if (data.parseConfidence !== undefined) docData.parseConfidence = data.parseConfidence || "HIGH";
    if (data.resumeFileUrl !== undefined) docData.resumeFileUrl = data.resumeFileUrl || "";

    try {
      const { databases, config } = createAdminClient();
      if (!config.projectId || !config.apiKey) throw new Error("No Appwrite config");
      const doc = await databases.updateDocument(
        config.databaseId,
        COLLECTIONS.CANDIDATES,
        candidateId,
        docData
      );
      return {
        id: doc.$id,
        ...doc,
        parsedJson: parseJsonSafe(doc.parsedJson),
        anonymizedJson: parseJsonSafe(doc.anonymizedJson),
      };
    } catch (err) {
      const existing = memoryStore.candidates.get(candidateId) || { id: candidateId, $id: candidateId };
      const updated = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      memoryStore.candidates.set(candidateId, updated);
      return updated;
    }
  },

  async getCandidateById(candidateId: string) {
    let candidate: any = null;

    try {
      const { databases, config } = createAdminClient();
      if (!config.projectId || !config.apiKey) throw new Error("No Appwrite config");
      const doc = await databases.getDocument(
        config.databaseId,
        COLLECTIONS.CANDIDATES,
        candidateId
      );
      candidate = {
        id: doc.$id,
        ...doc,
        parsedJson: parseJsonSafe(doc.parsedJson),
        anonymizedJson: parseJsonSafe(doc.anonymizedJson),
      };
    } catch (err) {
      candidate = memoryStore.candidates.get(candidateId) || null;
    }

    if (!candidate) return null;

    const parsedJsonObj = parseJsonSafe(candidate.parsedJson);
    const anonymizedJsonObj = parseJsonSafe(candidate.anonymizedJson);
    const resolvedJdId = candidate.jobDescriptionId || parsedJsonObj?.jobDescriptionId || null;

    // Fetch related records
    const [suspiciousContents, matchScores] = await Promise.all([
      this.getSuspiciousContentsByCandidateId(candidateId),
      this.getMatchScoresByCandidateId(candidateId),
    ]);

    const latestMatch = matchScores.length > 0 ? matchScores[0] : null;

    return {
      ...candidate,
      parsedJson: parsedJsonObj,
      anonymizedJson: anonymizedJsonObj,
      jobDescriptionId: resolvedJdId,
      suspiciousContents,
      matchScores,
      latestMatch,
    };
  },

  async listCandidates() {
    try {
      const { databases, config } = createAdminClient();
      if (!config.projectId || !config.apiKey) throw new Error("No Appwrite config");
      const res = await databases.listDocuments(
        config.databaseId,
        COLLECTIONS.CANDIDATES,
        [Query.orderDesc("createdAt"), Query.limit(100)]
      );
      return res.documents.map((doc: any) => {
        const parsed = parseJsonSafe(doc.parsedJson);
        return {
          id: doc.$id,
          ...doc,
          parsedJson: parsed,
          anonymizedJson: parseJsonSafe(doc.anonymizedJson),
          jobDescriptionId: doc.jobDescriptionId || parsed?.jobDescriptionId || null,
        };
      });
    } catch {
      return Array.from(memoryStore.candidates.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
  },

  // ==================== SUSPICIOUS CONTENTS ====================
  async createSuspiciousContent(data: {
    candidateId: string;
    flaggedText: string;
    detectionReason: string;
  }) {
    const id = ID.unique();
    const docData = {
      candidateId: data.candidateId,
      flaggedText: data.flaggedText,
      detectionReason: data.detectionReason,
      createdAt: new Date().toISOString(),
    };

    try {
      const { databases, config } = createAdminClient();
      if (!config.projectId || !config.apiKey) throw new Error("No Appwrite config");
      const doc = await databases.createDocument(
        config.databaseId,
        COLLECTIONS.SUSPICIOUS_CONTENTS,
        id,
        docData
      );
      return { id: doc.$id, ...doc };
    } catch {
      const record = { id, $id: id, ...docData };
      memoryStore.suspiciousContents.set(id, record);
      return record;
    }
  },

  async getSuspiciousContentsByCandidateId(candidateId: string) {
    try {
      const { databases, config } = createAdminClient();
      if (!config.projectId || !config.apiKey) throw new Error("No Appwrite config");
      const res = await safeListDocuments(
        databases,
        config.databaseId,
        COLLECTIONS.SUSPICIOUS_CONTENTS,
        "candidateId",
        candidateId,
        "createdAt"
      );
      return res.documents.map((doc: any) => ({ id: doc.$id, ...doc }));
    } catch {
      return Array.from(memoryStore.suspiciousContents.values()).filter(
        (x) => x.candidateId === candidateId
      );
    }
  },

  // ==================== JOB DESCRIPTIONS ====================
  async createJobDescription(data: {
    id?: string;
    title: string;
    rawText: string;
    requirements: any[];
    requirementsList?: Array<{ text: string; priority: string; embeddingJson?: any }>;
  }) {
    const jdId = data.id || ID.unique();
    const docData = {
      title: data.title,
      rawText: data.rawText,
      requirements: stringifyJsonSafe(data.requirements),
      createdAt: new Date().toISOString(),
    };

    let savedJd: any = null;

    try {
      const { databases, config } = createAdminClient();
      if (!config.projectId || !config.apiKey) throw new Error("No Appwrite config");
      const doc = await databases.createDocument(
        config.databaseId,
        COLLECTIONS.JOB_DESCRIPTIONS,
        jdId,
        docData
      );
      savedJd = {
        id: doc.$id,
        ...doc,
        requirements: parseJsonSafe(doc.requirements),
      };
    } catch {
      savedJd = {
        id: jdId,
        $id: jdId,
        title: data.title,
        rawText: data.rawText,
        requirements: data.requirements,
        createdAt: docData.createdAt,
      };
      memoryStore.jobDescriptions.set(jdId, savedJd);
    }

    // Save requirement items with embeddings
    const savedRequirements: any[] = [];
    if (data.requirementsList && data.requirementsList.length > 0) {
      for (const item of data.requirementsList) {
        const reqDoc = await this.createJobRequirement({
          jobDescriptionId: jdId,
          text: item.text,
          priority: item.priority,
          embeddingJson: item.embeddingJson,
        });
        savedRequirements.push(reqDoc);
      }
    }

    return {
      ...savedJd,
      requirementsList: savedRequirements,
    };
  },

  async createJobRequirement(data: {
    jobDescriptionId: string;
    text: string;
    priority: string;
    embeddingJson?: any;
  }) {
    const id = ID.unique();
    const docData = {
      jobDescriptionId: data.jobDescriptionId,
      text: data.text,
      priority: data.priority,
      embeddingJson: data.embeddingJson ? stringifyJsonSafe(data.embeddingJson) : "",
      createdAt: new Date().toISOString(),
    };

    try {
      const { databases, config } = createAdminClient();
      if (!config.projectId || !config.apiKey) throw new Error("No Appwrite config");
      const doc = await databases.createDocument(
        config.databaseId,
        COLLECTIONS.JOB_REQUIREMENTS,
        id,
        docData
      );
      return {
        id: doc.$id,
        ...doc,
        embeddingJson: parseJsonSafe(doc.embeddingJson),
      };
    } catch {
      const record = {
        id,
        $id: id,
        ...data,
        createdAt: docData.createdAt,
      };
      memoryStore.jobRequirements.set(id, record);
      return record;
    }
  },

  async getJobDescriptionById(id: string) {
    let jd: any = null;

    try {
      const { databases, config } = createAdminClient();
      if (!config.projectId || !config.apiKey) throw new Error("No Appwrite config");
      const doc = await databases.getDocument(
        config.databaseId,
        COLLECTIONS.JOB_DESCRIPTIONS,
        id
      );
      jd = {
        id: doc.$id,
        ...doc,
        requirements: parseJsonSafe(doc.requirements),
      };
    } catch {
      jd = memoryStore.jobDescriptions.get(id) || null;
    }

    if (!jd) return null;

    const requirementsList = await this.getJobRequirementsByJdId(id);
    return {
      ...jd,
      requirementsList,
    };
  },

  async getJobRequirementsByJdId(jobDescriptionId: string) {
    try {
      const { databases, config } = createAdminClient();
      if (!config.projectId || !config.apiKey) throw new Error("No Appwrite config");
      const res = await safeListDocuments(
        databases,
        config.databaseId,
        COLLECTIONS.JOB_REQUIREMENTS,
        "jobDescriptionId",
        jobDescriptionId
      );
      return res.documents.map((doc: any) => ({
        id: doc.$id,
        ...doc,
        embeddingJson: parseJsonSafe(doc.embeddingJson),
      }));
    } catch {
      return Array.from(memoryStore.jobRequirements.values()).filter(
        (x) => x.jobDescriptionId === jobDescriptionId
      );
    }
  },

  async listJobDescriptions() {
    let jds: any[] = [];
    try {
      const { databases, config } = createAdminClient();
      if (!config.projectId || !config.apiKey) throw new Error("No Appwrite config");
      const res = await databases.listDocuments(
        config.databaseId,
        COLLECTIONS.JOB_DESCRIPTIONS,
        [Query.orderDesc("createdAt"), Query.limit(100)]
      );
      jds = res.documents.map((doc) => ({
        id: doc.$id,
        ...doc,
        requirements: parseJsonSafe(doc.requirements),
      }));
    } catch {
      jds = Array.from(memoryStore.jobDescriptions.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    // Attach requirementsList to each
    const result = [];
    for (const jd of jds) {
      const reqs = await this.getJobRequirementsByJdId(jd.id || jd.$id);
      result.push({
        ...jd,
        requirementsList: reqs,
      });
    }

    return result;
  },

  // ==================== MATCH SCORES ====================
  async createMatchScore(data: {
    id?: string;
    candidateId: string;
    jobDescriptionId: string;
    overallScore: number;
    contextualSummary?: string | null;
  }) {
    const id = data.id || ID.unique();
    const docData = {
      candidateId: data.candidateId,
      jobDescriptionId: data.jobDescriptionId,
      overallScore: Number(data.overallScore),
      contextualSummary: data.contextualSummary || "",
      createdAt: new Date().toISOString(),
    };

    try {
      const { databases, config } = createAdminClient();
      if (!config.projectId || !config.apiKey) throw new Error("No Appwrite config");
      const doc = await databases.createDocument(
        config.databaseId,
        COLLECTIONS.MATCH_SCORES,
        id,
        docData
      );
      return { id: doc.$id, ...doc };
    } catch {
      const record = { id, $id: id, ...docData };
      memoryStore.matchScores.set(id, record);
      return record;
    }
  },

  async getMatchScoresByCandidateId(candidateId: string) {
    let scores: any[] = [];
    try {
      const { databases, config } = createAdminClient();
      if (!config.projectId || !config.apiKey) throw new Error("No Appwrite config");
      const res = await safeListDocuments(
        databases,
        config.databaseId,
        COLLECTIONS.MATCH_SCORES,
        "candidateId",
        candidateId,
        "createdAt"
      );
      scores = res.documents.map((doc: any) => ({ id: doc.$id, ...doc }));
    } catch {
      scores = Array.from(memoryStore.matchScores.values())
        .filter((x) => x.candidateId === candidateId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const populated = [];
    for (const score of scores) {
      const jd = await this.getJobDescriptionById(score.jobDescriptionId);
      const scoreId = score.id || score.$id;
      const [requirementScores, skillGaps, interviewQuestions] = await Promise.all([
        this.getRequirementScoresByMatchId(scoreId),
        this.getSkillGapsByMatchId(scoreId),
        this.getInterviewQuestionsByMatchId(scoreId),
      ]);

      populated.push({
        ...score,
        id: scoreId,
        matchScoreId: scoreId,
        jobDescriptionTitle: jd?.title || "Job Position",
        requirementScores,
        skillGaps,
        interviewQuestions,
      });
    }

    return populated;
  },

  async getMatchScoresSummaryByCandidateId(candidateId: string) {
    let scores: any[] = [];
    try {
      const { databases, config } = createAdminClient();
      if (!config.projectId || !config.apiKey) throw new Error("No Appwrite config");
      const res = await safeListDocuments(
        databases,
        config.databaseId,
        COLLECTIONS.MATCH_SCORES,
        "candidateId",
        candidateId,
        "createdAt"
      );
      scores = res.documents.map((doc: any) => ({ id: doc.$id, ...doc }));
    } catch {
      scores = Array.from(memoryStore.matchScores.values())
        .filter((x) => x.candidateId === candidateId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const populated = await Promise.all(
      scores.map(async (score) => {
        const scoreId = score.id || score.$id;
        const skillGaps = await this.getSkillGapsByMatchId(scoreId);
        return {
          ...score,
          id: scoreId,
          matchScoreId: scoreId,
          skillGaps,
        };
      })
    );

    return populated;
  },

  async getMatchScoresByJobDescriptionId(jobDescriptionId: string) {
    try {
      const { databases, config } = createAdminClient();
      if (!config.projectId || !config.apiKey) throw new Error("No Appwrite config");
      const res = await safeListDocuments(
        databases,
        config.databaseId,
        COLLECTIONS.MATCH_SCORES,
        "jobDescriptionId",
        jobDescriptionId
      );
      return res.documents.map((doc: any) => ({ id: doc.$id, ...doc }));
    } catch {
      return Array.from(memoryStore.matchScores.values())
        .filter((x) => x.jobDescriptionId === jobDescriptionId)
        .sort((a, b) => b.overallScore - a.overallScore);
    }
  },

  // ==================== REQUIREMENT SCORES ====================
  async createRequirementScore(data: {
    matchScoreId: string;
    requirementText: string;
    priority: string;
    similarityScore: number;
    evidenceText?: string | null;
    evidenceSourceSpan?: string | null;
  }) {
    const id = ID.unique();
    const docData = {
      matchScoreId: data.matchScoreId,
      requirementText: data.requirementText,
      priority: data.priority,
      similarityScore: Number(data.similarityScore),
      evidenceText: data.evidenceText || "",
      evidenceSourceSpan: data.evidenceSourceSpan || "",
    };

    try {
      const { databases, config } = createAdminClient();
      if (!config.projectId || !config.apiKey) throw new Error("No Appwrite config");
      const doc = await databases.createDocument(
        config.databaseId,
        COLLECTIONS.REQUIREMENT_SCORES,
        id,
        docData
      );
      return { id: doc.$id, ...doc };
    } catch {
      const record = { id, $id: id, ...docData };
      memoryStore.requirementScores.set(id, record);
      return record;
    }
  },

  async getRequirementScoresByMatchId(matchScoreId: string) {
    try {
      const { databases, config } = createAdminClient();
      if (!config.projectId || !config.apiKey) throw new Error("No Appwrite config");
      const res = await safeListDocuments(
        databases,
        config.databaseId,
        COLLECTIONS.REQUIREMENT_SCORES,
        "matchScoreId",
        matchScoreId
      );
      return res.documents.map((doc: any) => ({ id: doc.$id, ...doc }));
    } catch {
      return Array.from(memoryStore.requirementScores.values()).filter(
        (x) => x.matchScoreId === matchScoreId
      );
    }
  },

  // ==================== SKILL GAPS ====================
  async saveSkillGaps(matchScoreId: string, gaps: Array<{ skillName: string; gapType: string }>) {
    const results = [];
    for (const g of gaps) {
      const id = ID.unique();
      const docData = {
        matchScoreId,
        skillName: g.skillName,
        gapType: g.gapType,
      };

      try {
        const { databases, config } = createAdminClient();
        if (!config.projectId || !config.apiKey) throw new Error("No Appwrite config");
        const doc = await databases.createDocument(
          config.databaseId,
          COLLECTIONS.SKILL_GAPS,
          id,
          docData
        );
        results.push({ id: doc.$id, ...doc });
      } catch {
        const record = { id, $id: id, ...docData };
        memoryStore.skillGaps.set(id, record);
        results.push(record);
      }
    }
    return results;
  },

  async getSkillGapsByMatchId(matchScoreId: string) {
    try {
      const { databases, config } = createAdminClient();
      if (!config.projectId || !config.apiKey) throw new Error("No Appwrite config");
      const res = await safeListDocuments(
        databases,
        config.databaseId,
        COLLECTIONS.SKILL_GAPS,
        "matchScoreId",
        matchScoreId
      );
      return res.documents.map((doc: any) => ({ id: doc.$id, ...doc }));
    } catch {
      return Array.from(memoryStore.skillGaps.values()).filter(
        (x) => x.matchScoreId === matchScoreId
      );
    }
  },

  // ==================== INTERVIEW QUESTIONS ====================
  async saveInterviewQuestions(
    matchScoreId: string,
    questions: Array<{ questionText: string; reasoning?: string | null; category: string }>
  ) {
    const results = [];
    for (const q of questions) {
      const id = ID.unique();
      const docData = {
        matchScoreId,
        questionText: q.questionText,
        reasoning: q.reasoning || "",
        category: q.category,
      };

      try {
        const { databases, config } = createAdminClient();
        if (!config.projectId || !config.apiKey) throw new Error("No Appwrite config");
        const doc = await databases.createDocument(
          config.databaseId,
          COLLECTIONS.INTERVIEW_QUESTIONS,
          id,
          docData
        );
        results.push({ id: doc.$id, ...doc });
      } catch {
        const record = { id, $id: id, ...docData };
        memoryStore.interviewQuestions.set(id, record);
        results.push(record);
      }
    }
    return results;
  },

  async getInterviewQuestionsByMatchId(matchScoreId: string) {
    try {
      const { databases, config } = createAdminClient();
      if (!config.projectId || !config.apiKey) throw new Error("No Appwrite config");
      const res = await safeListDocuments(
        databases,
        config.databaseId,
        COLLECTIONS.INTERVIEW_QUESTIONS,
        "matchScoreId",
        matchScoreId
      );
      return res.documents.map((doc: any) => ({ id: doc.$id, ...doc }));
    } catch {
      return Array.from(memoryStore.interviewQuestions.values()).filter(
        (x) => x.matchScoreId === matchScoreId
      );
    }
  },
};
