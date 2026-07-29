// Deterministic offline fallback used when the live pipeline errors.
import type { VerificationResult } from "./types";
import { verifyContent as verifyContentLegacy } from "./engine";

export function fallbackVerify(text: string, note?: string): VerificationResult {
  const legacy = verifyContentLegacy(text);
  return {
    overallConfidence: legacy.overallConfidence,
    hallucinationRisk: Math.max(0, 100 - legacy.overallConfidence),
    claims: legacy.claims.map((c) => ({
      ...c,
      status:
        c.status === "Verified"
          ? "Verified"
          : c.status === "Contradicted"
            ? "Contradicted"
            : "Unable to Verify",
      reasoning: "Offline heuristic classification (live verification unavailable).",
      agreement: [],
      contradiction: [],
      sourceIds: [],
    })),
    sources: legacy.sources.map((s, i) => ({
      ...s,
      id: `src-${i}`,
      publisher: s.domain,
      favicon: `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(s.domain)}`,
      trustScore: 60,
    })),
    summary:
      (note ? `${note} ` : "") +
      (legacy.summary || "Offline heuristic result; live verification was unavailable."),
    mode: "fallback",
    createdAt: new Date().toISOString(),
    inputPreview: text.slice(0, 240),
  };
}
