// Deterministic offline fallback used when the live pipeline errors.
import type { Source, SourceKind, VerificationResult } from "./types";
import { verifyContent as verifyContentLegacy } from "./engine";

const KIND_ALLOW: SourceKind[] = [
  "Wikipedia",
  "MDN Web Docs",
  "Stack Overflow",
  "Official Documentation",
  "Academic Reference",
];

function coerceKind(raw: string): SourceKind {
  return (KIND_ALLOW as string[]).includes(raw) ? (raw as SourceKind) : "Web";
}

export function fallbackVerify(text: string, note?: string): VerificationResult {
  const legacy = verifyContentLegacy(text);
  const sources: Source[] = legacy.sources.map((s, i) => ({
    id: `src-${i}`,
    kind: coerceKind(s.kind),
    title: s.title,
    domain: s.domain,
    publisher: s.domain,
    favicon: `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(s.domain)}`,
    relevance: s.relevance,
    trustScore: 60,
    snippet: s.snippet,
    url: s.url,
    status: s.status,
  }));
  return {
    overallConfidence: legacy.overallConfidence,
    hallucinationRisk: Math.max(0, 100 - legacy.overallConfidence),
    claims: legacy.claims.map((c) => ({
      id: c.id,
      text: c.text,
      status:
        c.status === "Verified"
          ? "Verified"
          : c.status === "Contradicted"
            ? "Contradicted"
            : "Unable to Verify",
      confidence: c.confidence,
      reasoning: "Offline heuristic classification (live verification unavailable).",
      agreement: [],
      contradiction: [],
      sourceIds: [],
    })),
    sources,
    summary:
      (note ? `${note} ` : "") +
      (legacy.summary || "Offline heuristic result; live verification was unavailable."),
    mode: "fallback",
    createdAt: new Date().toISOString(),
    inputPreview: text.slice(0, 240),
  };
}

