import { rankDomain, faviconFor } from "./trustRank";
import type { Source } from "@/lib/veriai/types";

export interface RawSearchHit {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
  score?: number;
}

export interface SearchProvider {
  name: string;
  search(query: string, opts?: { maxResults?: number }): Promise<RawSearchHit[]>;
}

const TAVILY_TIMEOUT_MS = 15000;

/** Reads the Tavily key from server env only. Never bundled into the browser. */
export function readTavilyKey(): string | undefined {
  const env = process.env as Record<string, string | undefined>;
  const key = env["TAVILY_API_KEY"] ?? env["VITE_TAVILY_API_KEY"];
  return key && key.trim().length > 0 ? key.trim() : undefined;
}

let loggedStartup = false;
export function logTavilyStartupOnce(): void {
  if (loggedStartup) return;
  loggedStartup = true;
  const key = readTavilyKey();
  // Never print the secret itself — only presence and length.
  console.log(
    key
      ? `✓ Tavily API configured (key length ${key.length})`
      : "✗ Tavily API missing — set TAVILY_API_KEY in the server environment",
  );
}

class TavilyProvider implements SearchProvider {
  name = "tavily";
  constructor(private apiKey: string) {}

  async search(query: string, opts?: { maxResults?: number }): Promise<RawSearchHit[]> {
    const body = {
      api_key: this.apiKey,
      query,
      search_depth: "advanced",
      max_results: opts?.maxResults ?? 5,
      include_answer: false,
    };

    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TAVILY_TIMEOUT_MS);
      try {
        console.log(`[Tavily] request attempt ${attempt + 1} (${query.slice(0, 80)})`);
        const res = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        console.log(`[Tavily] HTTP ${res.status}`);
        if (res.status === 429 || res.status >= 500) {
          const retryBody = await res.text().catch(() => "");
          console.warn(`[Tavily] retryable ${res.status}: ${retryBody.slice(0, 300)}`);
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
          continue;
        }
        if (!res.ok) {
          const errBody = await res.text().catch(() => "");
          throw new Error(`Tavily ${res.status}: ${errBody.slice(0, 500)}`);
        }
        const json = (await res.json()) as {
          results?: Array<{
            title: string;
            url: string;
            content: string;
            published_date?: string;
            score?: number;
          }>;
        };
        const hits = json.results ?? [];
        console.log(`[Tavily] ${hits.length} results returned`);
        return hits.map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.content,
          publishedAt: r.published_date,
          score: r.score,
        }));
      } catch (err) {
        lastErr = err;
        const aborted = err instanceof Error && err.name === "AbortError";
        console.error(
          aborted
            ? `[Tavily] timeout after ${TAVILY_TIMEOUT_MS}ms (attempt ${attempt + 1})`
            : `[Tavily] network/request error (attempt ${attempt + 1}): ${
                err instanceof Error ? err.message : String(err)
              }`,
        );
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastErr ?? new Error("Tavily search failed after 3 attempts");
  }
}

export function getSearchProvider(): SearchProvider {
  logTavilyStartupOnce();
  const key = readTavilyKey();
  if (!key) {
    throw new Error(
      "TAVILY_API_KEY is not configured on the server (checked process.env.TAVILY_API_KEY and VITE_TAVILY_API_KEY)",
    );
  }
  return new TavilyProvider(key);
}


export function hitToSource(hit: RawSearchHit, idx: number): Source {
  const ranked = rankDomain(hit.url);
  const relevance =
    typeof hit.score === "number"
      ? Math.round(Math.max(10, Math.min(100, hit.score * 100)))
      : Math.max(45, 90 - idx * 8);
  return {
    id: `s-${idx}`,
    kind: ranked.kind,
    title: hit.title || ranked.domain,
    domain: ranked.domain,
    publisher: ranked.publisher,
    publishedAt: hit.publishedAt,
    favicon: faviconFor(ranked.domain),
    relevance,
    trustScore: ranked.trustScore,
    snippet: hit.snippet?.slice(0, 320) ?? "",
    url: hit.url,
    status: "Related",
  };
}
