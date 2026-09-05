import { Client, Databases, Storage, Users } from "node-appwrite";
import dotenv from "dotenv";
import path from "path";

// Ensure environment variables are loaded in standalone scripts
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export interface AppwriteConfig {
  endpoint: string;
  projectId: string;
  apiKey: string;
  databaseId: string;
  bucketId: string;
}

export function getAppwriteConfig(): AppwriteConfig {
  return {
    endpoint: (process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1").trim(),
    projectId: (process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "").trim(),
    apiKey: (process.env.APPWRITE_API_KEY || "").trim(),
    databaseId: (process.env.APPWRITE_DATABASE_ID || "ats_matrix_db").trim(),
    bucketId: (process.env.APPWRITE_BUCKET_ID || "resumes_bucket").trim(),
  };
}

export function createAdminClient() {
  const config = getAppwriteConfig();

  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId);

  if (config.apiKey) {
    client.setKey(config.apiKey);
  }

  return {
    client,
    databases: new Databases(client),
    storage: new Storage(client),
    users: new Users(client),
    config,
  };
}
