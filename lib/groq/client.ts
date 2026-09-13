/**
 * Groq Cloud Inference Client
 * Provides high-speed LLM processing for Resume Parsing, JD Itemization,
 * Recruiter Summaries, and Grounded Interview Question Generation.
 */

export interface GroqChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqChatOptions {
  messages: GroqChatMessage[];
  model?: string;
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export function isGroqConfigured(): boolean {
  const apiKey = process.env.GROQ_API_KEY;
  return !!apiKey && apiKey !== "your_groq_api_key_here" && apiKey.trim().length > 0;
}

export async function callGroqChat(options: GroqChatOptions): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "your_groq_api_key_here" || apiKey.trim().length === 0) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const primaryModel = options.model || process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  const fallbackModel = "qwen/qwen3.8-27b";
  const modelsToTry = primaryModel === fallbackModel ? [primaryModel] : [primaryModel, fallbackModel];

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      const payload: Record<string, any> = {
        model: modelName,
        messages: options.messages,
        temperature: options.temperature ?? 0.1,
        max_tokens: options.maxTokens ?? 1200,
      };

      if (options.jsonMode) {
        payload.response_format = { type: "json_object" };
      }


      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errBody = await response.text();
        if (response.status === 429) {
          // Parse retry delay like "Please try again in 6.48s"
          const match = errBody.match(/try again in ([\d.]+)s/i);
          const waitSec = match ? parseFloat(match[1]) : 5;
          const waitMs = Math.min(15000, Math.max(1000, Math.ceil(waitSec * 1000) + 500));
          console.warn(`Groq rate limit reached (429). Waiting ${waitMs}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          // Retry once with the same model after waiting
          const retryRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });
          if (retryRes.ok) {
            const data = await retryRes.json();
            const content = data?.choices?.[0]?.message?.content;
            if (typeof content === "string") return content.trim();
          }
        }
        throw new Error(`Groq API error [${response.status}]: ${errBody}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content === "string") {
        return content.trim();
      }

      throw new Error("Empty response returned from Groq API.");
    } catch (err) {
      lastError = err;
      console.warn(`Groq request with model ${modelName} failed, trying next fallback if available:`, err);
    }
  }

  throw lastError || new Error("Failed to call Groq API.");
}

/**
 * Convenience helper to execute a Groq prompt expecting a JSON response
 */
export async function callGroqJson<T = any>(
  systemPrompt: string,
  userPrompt: string,
  model?: string
): Promise<T> {
  const rawResponse = await callGroqChat({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    jsonMode: true,
    model,
    temperature: 0.1,
  });

  // Strip markdown code fences if model enclosed JSON in ```json ... ```
  let cleaned = rawResponse.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  }

  return JSON.parse(cleaned) as T;
}
