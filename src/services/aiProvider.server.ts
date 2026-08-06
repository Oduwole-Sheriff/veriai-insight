/**
 * Multi-provider AI router.
 *
 * Order: OpenRouter (primary) → Groq (secondary) → Gemini (last fallback).
 * Callers only ever use callAI(); the router decides the backend.
 * Keys are read from process.env only — never exposed to the browser.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/** Configurable models — one constant per provider. */
export const OPENROUTER_MODEL = "deepseek/deepseek-chat-v3";
export const GROQ_MODEL = "llama-3.3-70b-versatile";
export const GEMINI_MODEL = "gemini-2.0-flash";

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 3;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CallOptions {
  model?: string;
  temperature?: number;
  jsonMode?: boolean;
}

type ProviderName = "OpenRouter" | "Groq" | "Gemini";

function readEnv(name: string): string | undefined {
  const env = process.env as Record<string, string | undefined>;
  const value = env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export function readOpenRouterKey(): string | undefined {
  return readEnv("OPENROUTER_API_KEY");
}

export function readGroqKey(): string | undefined {
  return readEnv("GROQ_API_KEY");
}

/** Reads the Gemini key from server env only. Never bundled into the browser. */
export function readGeminiKey(): string | undefined {
  return readEnv("GEMINI_API_KEY");
}

let loggedStartup = false;
export function logAiStartupOnce(): void {
  if (loggedStartup) return;
  loggedStartup = true;
  console.log(readOpenRouterKey() ? "✓ OpenRouter configured" : "✗ OpenRouter missing (OPENROUTER_API_KEY)");
  console.log(readGroqKey() ? "✓ Groq configured" : "✗ Groq missing (GROQ_API_KEY)");
  console.log(readGeminiKey() ? "✓ Gemini configured" : "✗ Gemini missing (GEMINI_API_KEY)");
}

/** Backwards-compatible alias (previously Gemini-only startup log). */
export function logGeminiStartupOnce(): void {
  logAiStartupOnce();
}

/** Error carrying whether the failure is worth retrying / failing over. */
class ProviderError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "ProviderError";
    this.retryable = retryable;
  }
}

const RETRYABLE_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 404]);

function statusIsRetryable(status: number): boolean {
  if (NON_RETRYABLE_STATUSES.has(status)) return false;
  if (RETRYABLE_STATUSES.has(status)) return true;
  return status >= 500;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Timeouts and network errors are transient → retryable.
    throw new ProviderError(message, true);
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* OpenAI-compatible providers (OpenRouter, Groq)                      */
/* ------------------------------------------------------------------ */

async function callOpenAICompatible(
  provider: ProviderName,
  url: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  opts: CallOptions,
  extraHeaders: Record<string, string> = {},
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    ...(typeof opts.temperature === "number" ? { temperature: opts.temperature } : {}),
    ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
  };

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new ProviderError(
      `${provider} ${res.status}: ${errBody.slice(0, 300)}`,
      statusIsRetryable(res.status),
    );
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = (json.choices?.[0]?.message?.content ?? "").trim();
  if (!text) throw new ProviderError(`${provider} returned an empty response`, true);
  return text;
}

async function callOpenRouter(messages: ChatMessage[], opts: CallOptions): Promise<string> {
  const key = readOpenRouterKey();
  if (!key) throw new ProviderError("OPENROUTER_API_KEY is not configured", false);
  return callOpenAICompatible(
    "OpenRouter",
    OPENROUTER_URL,
    key,
    opts.model ?? OPENROUTER_MODEL,
    messages,
    opts,
    {
      "HTTP-Referer": "https://veriai-insight.onrender.com",
      "X-Title": "VeriAI Insight",
    },
  );
}

async function callGroq(messages: ChatMessage[], opts: CallOptions): Promise<string> {
  const key = readGroqKey();
  if (!key) throw new ProviderError("GROQ_API_KEY is not configured", false);
  return callOpenAICompatible("Groq", GROQ_URL, key, GROQ_MODEL, messages, opts);
}

/* ------------------------------------------------------------------ */
/* Gemini                                                              */
/* ------------------------------------------------------------------ */

async function callGemini(messages: ChatMessage[], opts: CallOptions): Promise<string> {
  const key = readGeminiKey();
  if (!key) throw new ProviderError("GEMINI_API_KEY is not configured", false);

  const systemText = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      ...(typeof opts.temperature === "number" ? { temperature: opts.temperature } : {}),
      ...(opts.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (systemText) {
    body.systemInstruction = { parts: [{ text: systemText }] };
  }

  const model = GEMINI_MODEL;
  const res = await fetchWithTimeout(`${GEMINI_BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new ProviderError(
      `Gemini ${res.status}: ${errBody.slice(0, 300)}`,
      statusIsRetryable(res.status),
    );
  }

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = (json.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) throw new ProviderError("Gemini returned an empty response", true);
  return text;
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

const PROVIDERS: Array<{
  name: ProviderName;
  hasKey: () => boolean;
  call: (messages: ChatMessage[], opts: CallOptions) => Promise<string>;
}> = [
  { name: "OpenRouter", hasKey: () => Boolean(readOpenRouterKey()), call: callOpenRouter },
  { name: "Groq", hasKey: () => Boolean(readGroqKey()), call: callGroq },
  { name: "Gemini", hasKey: () => Boolean(readGeminiKey()), call: callGemini },
];

async function callProviderWithRetries(
  provider: (typeof PROVIDERS)[number],
  messages: ChatMessage[],
  opts: CallOptions,
): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await provider.call(messages, opts);
    } catch (err) {
      lastErr = err;
      const retryable = err instanceof ProviderError ? err.retryable : true;
      if (!retryable) break;
      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }
  throw lastErr ?? new ProviderError(`${provider.name} call failed`, true);
}

/** Single entry point for every AI call in the app. */
export async function callAI(messages: ChatMessage[], opts: CallOptions = {}): Promise<string> {
  logAiStartupOnce();

  const available = PROVIDERS.filter((p) => p.hasKey());
  if (available.length === 0) {
    throw new Error(
      "No AI provider configured — set OPENROUTER_API_KEY, GROQ_API_KEY or GEMINI_API_KEY",
    );
  }

  let lastErr: unknown;
  for (let i = 0; i < available.length; i++) {
    const provider = available[i];
    try {
      const text = await callProviderWithRetries(provider, messages, opts);
      console.log(`✓ ${provider.name} succeeded`);
      return text;
    } catch (err) {
      lastErr = err;
      const next = available[i + 1];
      console.warn(
        next
          ? `⚠ ${provider.name} unavailable, switching to ${next.name}`
          : `⚠ ${provider.name} unavailable and no fallback providers remain`,
      );
    }
  }

  throw new Error(
    `All AI providers failed: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
  );
}

/* ------------------------------------------------------------------ */
/* Public API (unchanged signatures)                                   */
/* ------------------------------------------------------------------ */

function stripCodeFence(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
}

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(stripCodeFence(text)) as T;
  } catch {
    // Attempt to extract first JSON object/array
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

  const raw = await callAI(
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

  const raw = await callAI(
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
  const raw = await callAI(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.3 },
  );
  return raw.trim().slice(0, 600);
}
