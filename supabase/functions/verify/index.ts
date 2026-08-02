// VeriAI verification Edge Function (Deno) — deploy to YOUR OWN Supabase project.
//
//   supabase functions deploy verify --no-verify-jwt
//   supabase secrets set TAVILY_API_KEY=... OPENAI_API_KEY=...   (or GEMINI_API_KEY)
//
// Then point the frontend at it:
//   VITE_VERIFY_ENDPOINT=https://<your-project-ref>.supabase.co/functions/v1/verify
//
// No project id, key, or host is hardcoded here.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NO_SEARCH_PROVIDER_MESSAGE =
  "Live verification is unavailable because no search provider is configured.";
const NO_AI_PROVIDER_MESSAGE =
  "Live verification is unavailable because no AI provider is configured.";

function env(...names: string[]): string | null {
  for (const name of names) {
    const value = Deno.env.get(name);
    if (value && value.trim()) return value.trim();
  }
  return null;
}

function resolveAi() {
  const openai = env("OPENAI_API_KEY");
  const gemini = env("GEMINI_API_KEY");
  const base = env("AI_BASE_URL");
  const custom = env("AI_API_KEY");
  const model = env("AI_MODEL");
  if (base && custom)
    return { url: `${base.replace(/\/$/, "")}/chat/completions`, key: custom, model: model ?? "gpt-4o-mini" };
  if (openai)
    return { url: "https://api.openai.com/v1/chat/completions", key: openai, model: model ?? "gpt-4o-mini" };
  if (gemini)
    return {
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      key: gemini,
      model: model ?? "gemini-2.0-flash",
    };
  return null;
}

async function chat(messages: unknown[], jsonMode = false, temperature = 0.1): Promise<string> {
  const ai = resolveAi();
  if (!ai) throw new Error(NO_AI_PROVIDER_MESSAGE);
  const res = await fetch(ai.url, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${ai.key}` },
    body: JSON.stringify({
      model: ai.model,
      messages,
      temperature,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`AI provider ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json?.choices?.[0]?.message?.content ?? "";
}

function parseJson<T>(text: string): T | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const m = cleaned.match(/[\[{][\s\S]*[\]}]/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]) as T;
    } catch {
      return null;
    }
  }
}

async function tavilySearch(query: string, maxResults = 5) {
  const key = env("TAVILY_API_KEY");
  if (!key) throw new Error(NO_SEARCH_PROVIDER_MESSAGE);
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query, search_depth: "advanced", max_results: maxResults, include_answer: false }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return (json?.results ?? []) as Array<{
    title: string;
    url: string;
    content: string;
    published_date?: string;
    score?: number;
  }>;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function trustScore(domain: string): number {
  if (domain.endsWith(".gov")) return 96;
  if (domain.endsWith(".edu")) return 92;
  if (domain.includes("developer.mozilla.org")) return 90;
  if (domain.includes("wikipedia.org")) return 80;
  if (domain.includes("stackoverflow.com")) return 74;
  return 60;
}

function kindOf(domain: string): string {
  if (domain.includes("wikipedia.org")) return "Wikipedia";
  if (domain.includes("developer.mozilla.org")) return "MDN Web Docs";
  if (domain.includes("stackoverflow.com")) return "Stack Overflow";
  if (domain.endsWith(".gov")) return "Government";
  if (domain.endsWith(".edu")) return "Academic Reference";
  return "Web";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST")
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS, "content-type": "application/json" },
    });

  try {
    const { text } = await req.json();
    if (typeof text !== "string" || text.trim().length < 20)
      throw new Error("Provide at least 20 characters of text to verify.");
    if (!env("TAVILY_API_KEY")) throw new Error(NO_SEARCH_PROVIDER_MESSAGE);
    if (!resolveAi()) throw new Error(NO_AI_PROVIDER_MESSAGE);

    const input = text.trim();

    const extractRaw = await chat(
      [
        {
          role: "system",
          content:
            'Extract atomic factual claims. Return ONLY JSON: {"claims":[{"text":"..."}]} (max 6, each <=240 chars).',
        },
        { role: "user", content: input.slice(0, 6000) },
      ],
      true,
    );
    const extracted = parseJson<{ claims?: Array<{ text: string }> }>(extractRaw)?.claims ?? [];
    const claimTexts = (extracted.length ? extracted : [{ text: input.slice(0, 240) }])
      .slice(0, 6)
      .map((c) => c.text.trim())
      .filter(Boolean);

    const sourceMap = new Map<string, Record<string, unknown>>();
    const claims: Array<Record<string, unknown>> = [];

    for (const [i, claimText] of claimTexts.entries()) {
      let hits: Awaited<ReturnType<typeof tavilySearch>> = [];
      try {
        hits = await tavilySearch(claimText, 5);
      } catch {
        hits = [];
      }

      const sources = hits.map((h, idx) => {
        const domain = domainOf(h.url);
        return {
          id: `s-${idx}`,
          kind: kindOf(domain),
          title: h.title || domain,
          domain,
          publisher: domain,
          publishedAt: h.published_date,
          favicon: `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(domain)}`,
          relevance: typeof h.score === "number" ? Math.round(Math.max(10, Math.min(100, h.score * 100))) : 70,
          trustScore: trustScore(domain),
          snippet: (h.content ?? "").slice(0, 320),
          url: h.url,
          status: "Related",
        };
      });

      let verdict = {
        status: "Unable to Verify",
        confidence: 35,
        reasoning: "No live sources were retrieved for this claim.",
        agreement: [] as string[],
        contradiction: [] as string[],
        supporting_source_indices: [] as number[],
      };

      if (sources.length) {
        const raw = await chat(
          [
            {
              role: "system",
              content:
                'Fact-check ONE claim against sources. Return ONLY JSON: {"status":"Verified|Contradicted|Partially Supported|Unable to Verify","confidence":0-100,"reasoning":"<=2 sentences","agreement":[],"contradiction":[],"supporting_source_indices":[]}',
            },
            {
              role: "user",
              content: `CLAIM:\n${claimText}\n\nSOURCES:\n${JSON.stringify(
                sources.map((s, index) => ({ index, title: s.title, domain: s.domain, snippet: s.snippet })),
              )}`,
            },
          ],
          true,
        );
        verdict = { ...verdict, ...(parseJson<typeof verdict>(raw) ?? {}) };
        verdict.confidence = Math.max(0, Math.min(100, Math.round(verdict.confidence ?? 50)));
      }

      const supporting = verdict.supporting_source_indices ?? [];
      const sourceIds: string[] = [];
      sources.forEach((s, idx) => {
        const stored = sourceMap.get(s.url) ?? { ...s, id: `src-${sourceMap.size}` };
        if (supporting.includes(idx)) {
          stored.status =
            verdict.status === "Verified"
              ? "Supports"
              : verdict.status === "Contradicted"
                ? "Contradicts"
                : "Related";
          sourceIds.push(stored.id as string);
        }
        sourceMap.set(s.url, stored);
      });

      claims.push({
        id: `c-${i}`,
        text: claimText,
        status: verdict.status,
        confidence: verdict.confidence,
        reasoning: verdict.reasoning,
        agreement: verdict.agreement ?? [],
        contradiction: verdict.contradiction ?? [],
        sourceIds,
      });
    }

    const allSources = [...sourceMap.values()].sort(
      (a, b) => (b.trustScore as number) - (a.trustScore as number),
    );
    const verified = claims.filter((c) => c.status === "Verified").length;
    const contradicted = claims.filter((c) => c.status === "Contradicted").length;
    const weight = (c: Record<string, unknown>) => {
      const conf = c.confidence as number;
      if (c.status === "Verified") return conf;
      if (c.status === "Partially Supported") return conf * 0.6;
      if (c.status === "Contradicted") return conf * 0.15;
      return conf * 0.4;
    };
    const overallConfidence = Math.round(
      claims.reduce((sum, c) => sum + weight(c), 0) / Math.max(1, claims.length),
    );

    let summary = "";
    try {
      summary = await chat(
        [
          { role: "system", content: "Write a 2-3 sentence plain-text trustworthiness summary." },
          {
            role: "user",
            content: JSON.stringify(claims.map((c) => ({ text: c.text, status: c.status, confidence: c.confidence }))),
          },
        ],
        false,
        0.3,
      );
    } catch {
      summary = `Cross-verified ${verified} claim(s) against live sources; ${contradicted} contradicted.`;
    }

    return new Response(
      JSON.stringify({
        overallConfidence: Math.max(0, Math.min(100, overallConfidence)),
        hallucinationRisk: Math.max(
          0,
          Math.min(100, Math.round(100 - (overallConfidence * 0.8 + verified * 3 - contradicted * 10))),
        ),
        claims,
        sources: allSources,
        summary: summary.trim().slice(0, 600),
        mode: "live",
        createdAt: new Date().toISOString(),
        inputPreview: input.slice(0, 240),
      }),
      { headers: { ...CORS, "content-type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }
});
