import { rankDomain, faviconFor } from "./trustRank";
import type { Source } from "@/lib/veriai/types";
import { ConfigurationError, NO_SEARCH_PROVIDER_MESSAGE } from "@/lib/veriai/errors";

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

const REQUEST_TIMEOUT_MS = 20_000;

class TavilyProvider implements SearchProvider {
  name = "tavily";
  constructor(private apiKey: string) {}

  async search(query: string, opts?: { maxResults?: number }): Promise<RawSearchHit[]> {
    const body = {
      query,
      search_depth: "advanced",
      max_results: opts?.maxResults ?? 5,
      include_answer: false,
    };

    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const res = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (res.status === 429 || res.status >= 500) {
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
          continue;
        }
        if (!res.ok) throw new Error(`Tavily ${res.status}: ${await res.text()}`);
        const json = (await res.json()) as {
          results?: Array<{
            title: string;
            url: string;
            content: string;
            published_date?: string;
            score?: number;
          }>;
        };
        return (json.results ?? []).map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.content,
          publishedAt: r.published_date,
          score: r.score,
        }));
      } catch (err) {
        lastErr = err;
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastErr ?? new Error("Tavily search failed");
  }
}

function tavilyKey(): string | null {
  for (const name of ["TAVILY_API_KEY", "VITE_TAVILY_API_KEY"]) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

/** True when a search provider key is configured. */
export function isSearchConfigured(): boolean {
  return tavilyKey() !== null;
}

/** Throws a ConfigurationError (never hangs) when no provider key is present. */
export function getSearchProvider(): SearchProvider {
  const key = tavilyKey();
  if (!key) throw new ConfigurationError(NO_SEARCH_PROVIDER_MESSAGE);
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
