const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.0-flash";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CallOptions {
  model?: string;
  temperature?: number;
  jsonMode?: boolean;
}

/** Reads the Gemini key from server env only. Never bundled into the browser. */
export function readGeminiKey(): string | undefined {
  const env = process.env as Record<string, string | undefined>;
  const key = env["GEMINI_API_KEY"];
  return key && key.trim().length > 0 ? key.trim() : undefined;
}

let loggedStartup = false;
export function logGeminiStartupOnce(): void {
  if (loggedStartup) return;
  loggedStartup = true;
  const key = readGeminiKey();
  console.log(
    key
      ? `✓ Gemini API configured (key length ${key.length})`
      : "✗ Gemini API missing — set GEMINI_API_KEY in the server environment",
  );
}

async function callGemini(messages: ChatMessage[], opts: CallOptions = {}): Promise<string> {
  logGeminiStartupOnce();
  const key = readGeminiKey();
  if (!key) throw new Error("GEMINI_API_KEY is not configured");

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

  const model = opts.model ?? DEFAULT_MODEL;
  const url = `${GEMINI_BASE}/${model}:generateContent`;

  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": key,
        },
        body: JSON.stringify(body),
      });
      if (res.status === 429 || res.status >= 500) {
        const retryBody = await res.text().catch(() => "");
        console.warn(`[Gemini] retryable ${res.status}: ${retryBody.slice(0, 300)}`);
        lastErr = new Error(`Gemini ${res.status}`);
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Gemini ${res.status}: ${errBody.slice(0, 500)}`);
      }
      const json = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      return (json.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text ?? "")
        .join("")
        .trim();
    } catch (err) {
      lastErr = err;
      console.error(
        `[Gemini] request error (attempt ${attempt + 1}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
  throw lastErr ?? new Error("Gemini call failed");
}

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

  const raw = await callGemini(
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

  const raw = await callGemini(
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
  const raw = await callGemini(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.3 },
  );
  return raw.trim().slice(0, 600);
}
