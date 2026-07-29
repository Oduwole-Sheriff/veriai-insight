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
      try {
        const res = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
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
      }
    }
    throw lastErr ?? new Error("Tavily search failed");
  }
}

export function getSearchProvider(): SearchProvider {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error("TAVILY_API_KEY is not configured");
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
