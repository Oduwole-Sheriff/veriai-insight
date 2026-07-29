import {
  extractClaims,
  summarizeVerification,
  verifyClaimWithSources,
} from "@/services/aiProvider.server";
import { getSearchProvider, hitToSource } from "@/services/searchProvider.server";
import type { Claim, Source, SourceStatus, VerificationResult } from "./types";

const MAX_CLAIMS = 6;
const SOURCES_PER_CLAIM = 5;

function statusToSourceStatus(claimStatus: Claim["status"]): SourceStatus {
  if (claimStatus === "Verified") return "Supports";
  if (claimStatus === "Contradicted") return "Contradicts";
  return "Related";
}

async function pMapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function runLiveVerification(text: string): Promise<VerificationResult> {
  const search = getSearchProvider();

  const extracted = await extractClaims(text);
  const claimTexts = (extracted.length > 0 ? extracted : [{ text: text.slice(0, 240) }])
    .slice(0, MAX_CLAIMS)
    .map((c) => c.text.trim());

  const perClaim = await pMapLimit(claimTexts, 3, async (claimText) => {
    let hits: Awaited<ReturnType<typeof search.search>> = [];
    try {
      hits = await search.search(claimText, { maxResults: SOURCES_PER_CLAIM });
    } catch {
      hits = [];
    }
    const sources = hits.map((h, i) => hitToSource(h, i));

    if (sources.length === 0) {
      return {
        claimText,
        sources: [] as Source[],
        verdict: {
          status: "Unable to Verify" as const,
          confidence: 35,
          reasoning: "No live sources were retrieved for this claim.",
          agreement: [] as string[],
          contradiction: [] as string[],
          supporting_source_indices: [] as number[],
        },
      };
    }

    const verdict = await verifyClaimWithSources(
      claimText,
      sources.map((s, idx) => ({
        index: idx,
        title: s.title,
        domain: s.domain,
        snippet: s.snippet,
      })),
    );
    return { claimText, sources, verdict };
  });

  // Deduplicate & re-id sources across claims
  const sourceMap = new Map<string, Source>();
  const claims: Claim[] = perClaim.map((row, i) => {
    const sourceStatus = statusToSourceStatus(row.verdict.status);
    const claimSourceIds: string[] = [];
    row.sources.forEach((s, idx) => {
      const isSupporting = row.verdict.supporting_source_indices.includes(idx);
      const key = s.url;
      if (!sourceMap.has(key)) {
        sourceMap.set(key, { ...s, id: `src-${sourceMap.size}`, status: isSupporting ? sourceStatus : "Related" });
      } else if (isSupporting) {
        const existing = sourceMap.get(key)!;
        existing.status = sourceStatus;
      }
      const stored = sourceMap.get(key)!;
      if (isSupporting) claimSourceIds.push(stored.id);
    });

    return {
      id: `c-${i}`,
      text: row.claimText,
      status: row.verdict.status,
      confidence: row.verdict.confidence,
      reasoning: row.verdict.reasoning,
      agreement: row.verdict.agreement,
      contradiction: row.verdict.contradiction,
      sourceIds: claimSourceIds,
    };
  });

  const sources = Array.from(sourceMap.values()).sort((a, b) => b.trustScore - a.trustScore);

  const verified = claims.filter((c) => c.status === "Verified").length;
  const contradicted = claims.filter((c) => c.status === "Contradicted").length;
  const partial = claims.filter((c) => c.status === "Partially Supported").length;

  const weight = (c: Claim) => {
    if (c.status === "Verified") return c.confidence;
    if (c.status === "Partially Supported") return c.confidence * 0.6;
    if (c.status === "Contradicted") return c.confidence * 0.15;
    return c.confidence * 0.4;
  };
  const overallConfidence = Math.round(
    claims.reduce((sum, c) => sum + weight(c), 0) / Math.max(1, claims.length),
  );
  const hallucinationRisk = Math.max(
    0,
    Math.min(100, Math.round(100 - (overallConfidence * 0.8 + verified * 3 - contradicted * 10))),
  );

  let summary: string;
  try {
    summary = await summarizeVerification(
      text,
      claims.map((c) => ({ text: c.text, status: c.status, confidence: c.confidence })),
    );
  } catch {
    summary =
      contradicted > 0
        ? `Detected ${contradicted} contradicted claim${contradicted > 1 ? "s" : ""} against live sources.`
        : verified > 0
          ? `Cross-verified ${verified} claim${verified > 1 ? "s" : ""} against live sources${partial ? `, ${partial} partially supported` : ""}.`
          : "Live sources were inconclusive for the extracted claims.";
  }

  return {
    overallConfidence: Math.max(0, Math.min(100, overallConfidence)),
    hallucinationRisk,
    claims,
    sources,
    summary,
    mode: "live",
    createdAt: new Date().toISOString(),
    inputPreview: text.slice(0, 240),
  };
}
