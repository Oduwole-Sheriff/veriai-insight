// Provider-agnostic AI abstraction. Configured entirely through environment variables:
//   AI_PROVIDER   (openai | gemini | custom)  – optional, auto-detected from keys
//   OPENAI_API_KEY  / VITE_OPENAI_API_KEY
//   GEMINI_API_KEY  / VITE_GEMINI_API_KEY
//   AI_API_KEY      / VITE_AI_API_KEY   (for a custom OpenAI-compatible gateway)
//   AI_BASE_URL     / VITE_AI_BASE_URL  (custom OpenAI-compatible base, e.g. https://host/v1)
//   AI_MODEL        / VITE_AI_MODEL
// No vendor endpoint or key is hardcoded to a hosted Lovable service.
import { ConfigurationError, NO_AI_PROVIDER_MESSAGE } from "@/lib/veriai/errors";

function env(...names: string[]): string | null {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

interface ResolvedProvider {
  url: string;
  apiKey: string;
  model: string;
}

function resolveProvider(): ResolvedProvider {
  const explicit = (env("AI_PROVIDER", "VITE_AI_PROVIDER") ?? "").toLowerCase();
  const openaiKey = env("OPENAI_API_KEY", "VITE_OPENAI_API_KEY");
  const geminiKey = env("GEMINI_API_KEY", "VITE_GEMINI_API_KEY");
  const customKey = env("AI_API_KEY", "VITE_AI_API_KEY");
  const customBase = env("AI_BASE_URL", "VITE_AI_BASE_URL");
  const model = env("AI_MODEL", "VITE_AI_MODEL");

  const provider =
    explicit ||
    (customBase && customKey ? "custom" : openaiKey ? "openai" : geminiKey ? "gemini" : "");

  if (provider === "openai" && openaiKey) {
    return {
      url: `${(customBase ?? "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`,
      apiKey: openaiKey,
      model: model ?? "gpt-4o-mini",
    };
  }
  if (provider === "gemini" && geminiKey) {
    return {
      url: `${(customBase ?? "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/$/, "")}/chat/completions`,
      apiKey: geminiKey,
      model: model ?? "gemini-2.0-flash",
    };
  }
  if (provider === "custom" && customBase && customKey) {
    return {
      url: `${customBase.replace(/\/$/, "")}/chat/completions`,
      apiKey: customKey,
      model: model ?? "gpt-4o-mini",
    };
  }

  throw new ConfigurationError(NO_AI_PROVIDER_MESSAGE);
}

/** True when at least one AI provider key is present. */
export function isAiConfigured(): boolean {
  try {
    resolveProvider();
    return true;
  } catch {
    return false;
  }
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CallOptions {
  temperature?: number;
  jsonMode?: boolean;
}

const REQUEST_TIMEOUT_MS = 30_000;

async function callProvider(messages: ChatMessage[], opts: CallOptions = {}): Promise<string> {
  const { url, apiKey, model } = resolveProvider();

  const body: Record<string, unknown> = { model, messages };
  if (opts.jsonMode) body.response_format = { type: "json_object" };
  if (typeof opts.temperature === "number") body.temperature = opts.temperature;

  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      if (!res.ok) throw new Error(`AI provider ${res.status}: ${await res.text()}`);
      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return json.choices?.[0]?.message?.content ?? "";
    } catch (err) {
      lastErr = err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error("AI provider call failed");
}

function stripCodeFence(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
}

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(stripCodeFence(text)) as T;
  } catch {
    const match = text.match(/[\[{][\s\S]*[\]}]/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export interface ExtractedClaim {
  text: string;
}

export async function extractClaims(input: string): Promise<ExtractedClaim[]> {
  const system = `You extract concise, atomic factual claims from a passage of text.
Return ONLY valid JSON matching: {"claims": [{"text": "..."}]}
Rules:
- Each claim is a single verifiable statement (max 240 chars).
- Skip opinions, greetings, filler.
- Keep at most 8 claims, preserving the passage's order.
- If nothing is verifiable, return {"claims": []}.`;

  const raw = await callProvider(
    [
      { role: "system", content: system },
      { role: "user", content: input.slice(0, 6000) },
    ],
    { jsonMode: true, temperature: 0.1 },
  );
  const parsed = safeJsonParse<{ claims?: ExtractedClaim[] }>(raw);
  return (parsed?.claims ?? []).filter((c) => c.text && c.text.trim().length > 0);
}

export interface ClaimVerdict {
  status: "Verified" | "Contradicted" | "Partially Supported" | "Unable to Verify";
  confidence: number;
  reasoning: string;
  agreement: string[];
  contradiction: string[];
  supporting_source_indices: number[];
}

export async function verifyClaimWithSources(
  claim: string,
  sources: Array<{ index: number; title: string; domain: string; snippet: string }>,
): Promise<ClaimVerdict> {
  const system = `You are a rigorous fact-checker. Given ONE claim and a list of web sources, decide whether the claim is supported.
Return ONLY valid JSON matching:
{"status":"Verified|Contradicted|Partially Supported|Unable to Verify","confidence":0-100,"reasoning":"<=2 sentences","agreement":["short bullet"],"contradiction":["short bullet"],"supporting_source_indices":[0,1]}
Guidelines:
- "Verified" = strong direct support in >=1 trustworthy source.
- "Contradicted" = at least one source directly refutes the claim.
- "Partially Supported" = sources support part of the claim only.
- "Unable to Verify" = sources are unrelated or insufficient.
- confidence reflects your certainty in the verdict (not the claim being true).
- supporting_source_indices refer to the "index" field of the sources array.`;

  const user = `CLAIM:\n${claim}\n\nSOURCES:\n${JSON.stringify(sources, null, 2)}`;

  const raw = await callProvider(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { jsonMode: true, temperature: 0.1 },
  );
  const parsed = safeJsonParse<ClaimVerdict>(raw);
  if (!parsed) {
    return {
      status: "Unable to Verify",
      confidence: 40,
      reasoning: "The AI response could not be parsed.",
      agreement: [],
      contradiction: [],
      supporting_source_indices: [],
    };
  }
  parsed.confidence = Math.max(0, Math.min(100, Math.round(parsed.confidence ?? 50)));
  parsed.agreement = parsed.agreement ?? [];
  parsed.contradiction = parsed.contradiction ?? [];
  parsed.supporting_source_indices = parsed.supporting_source_indices ?? [];
  return parsed;
}

export async function summarizeVerification(
  input: string,
  claimsSummary: Array<{ text: string; status: string; confidence: number }>,
): Promise<string> {
  const system = `You write a 2-3 sentence executive summary explaining the overall trustworthiness of an AI-generated passage after fact-checking. Be direct, cite the number of verified/contradicted claims when useful, mention topic domain if obvious. Do not use markdown.`;
  const user = `INPUT PASSAGE:\n${input.slice(0, 2000)}\n\nCLAIM VERDICTS:\n${JSON.stringify(claimsSummary, null, 2)}`;
  const raw = await callProvider(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.3 },
  );
  return raw.trim().slice(0, 600);
}
