// Legacy deterministic engine, kept as offline fallback source.
// Uses its own local types to stay decoupled from the live pipeline.
import sourcesData from "./sources.json";

type LegacyStatus = "Verified" | "Contradicted" | "Unverified";
type LegacySourceStatus = "Supports" | "Contradicts" | "Related";

interface RawSource {
  id: string;
  kind: string;
  title: string;
  domain: string;
  relevance: number;
  snippet: string;
  url: string;
}

interface LegacyClaim {
  id: string;
  text: string;
  status: LegacyStatus;
  confidence: number;
}

interface LegacySource extends RawSource {
  status: LegacySourceStatus;
}

export interface LegacyResult {
  overallConfidence: number;
  claims: LegacyClaim[];
  sources: LegacySource[];
  summary: string;
}

const SOURCES = sourcesData as Record<string, RawSource[]>;

interface TopicEntry {
  topic: string;
  sourceKey: string;
  keywords: string[];
  truths: string[];
  falsehoods: string[];
}

const TOPICS: TopicEntry[] = [
  {
    topic: "ACID Properties",
    sourceKey: "ACID Properties",
    keywords: ["acid", "atomicity", "consistency", "isolation", "durability", "transaction"],
    truths: ["atomicity", "consistency", "isolation", "durability", "all or nothing", "transaction", "commit", "rollback"],
    falsehoods: ["availability", "cap theorem replaces acid", "acid stands for availability"],
  },
  {
    topic: "Dijkstra's Algorithm",
    sourceKey: "Dijkstra's Algorithm",
    keywords: ["dijkstra", "shortest path", "graph", "priority queue", "bfs"],
    truths: ["shortest path", "non-negative", "priority queue", "greedy", "o((v+e) log v)", "o(e log v)", "min-heap"],
    falsehoods: ["negative weight", "o(n)", "o(v)", "o(log n)", "dynamic programming", "works on negative", "always o(n log n)", "linear time", "bellman-ford is faster"],
  },
  {
    topic: "Big-O Notation",
    sourceKey: "Big-O Notation",
    keywords: ["big-o", "big o", "complexity", "asymptotic"],
    truths: ["upper bound", "worst case", "asymptotic", "growth"],
    falsehoods: ["exact runtime", "always tight bound"],
  },
];

const STOP = new Set([
  "the","a","an","is","are","of","to","in","and","or","for","with","on","as","by","it","that","this","be","at","from","which","can","has","have","its","into","using","use",
]);

function splitClaims(text: string): string[] {
  return text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 12);
}

function matchTopic(text: string): TopicEntry | null {
  const lower = text.toLowerCase();
  let best: { entry: TopicEntry; hits: number } | null = null;
  for (const entry of TOPICS) {
    const hits = entry.keywords.reduce((n, kw) => (lower.includes(kw) ? n + 1 : n), 0);
    if (hits > 0 && (!best || hits > best.hits)) best = { entry, hits };
  }
  return best?.entry ?? null;
}

function classify(claim: string, topic: TopicEntry | null): { status: LegacyStatus; confidence: number } {
  const lower = claim.toLowerCase();
  if (!topic) {
    const tokens = lower.split(/\W+/).filter((t) => t.length > 3 && !STOP.has(t));
    return { status: "Unverified", confidence: Math.min(60, 30 + tokens.length * 2) };
  }
  const truthHits = topic.truths.filter((t) => lower.includes(t)).length;
  const falseHits = topic.falsehoods.filter((f) => lower.includes(f)).length;
  if (falseHits > 0) return { status: "Contradicted", confidence: Math.max(8, 35 - falseHits * 10 - truthHits * 2) };
  if (truthHits >= 1) return { status: "Verified", confidence: Math.min(98, 72 + truthHits * 7) };
  return { status: "Unverified", confidence: 55 };
}

function buildSources(topic: TopicEntry | null, claims: LegacyClaim[]): LegacySource[] {
  const raw = topic ? SOURCES[topic.sourceKey] : SOURCES._fallback;
  const contradicted = claims.filter((c) => c.status === "Contradicted").length;
  const verified = claims.filter((c) => c.status === "Verified").length;
  let overall: LegacySourceStatus;
  if (!topic) overall = "Related";
  else if (contradicted > verified) overall = "Contradicts";
  else if (verified > 0) overall = "Supports";
  else overall = "Related";
  return raw.map((s, i) => {
    let status: LegacySourceStatus = overall;
    if (overall !== "Related" && i === raw.length - 1 && raw.length > 2) status = "Related";
    return { ...s, status };
  });
}

export function verifyContent(text: string): LegacyResult {
  const topic = matchTopic(text);
  const sentences = splitClaims(text);
  const claims: LegacyClaim[] = sentences.slice(0, 8).map((s, i) => {
    const { status, confidence } = classify(s, topic);
    return { id: `c-${i}`, text: s.length > 220 ? s.slice(0, 217) + "…" : s, status, confidence };
  });
  if (claims.length === 0) {
    claims.push({ id: "c-0", text: text.trim().slice(0, 200) || "(empty input)", status: "Unverified", confidence: 40 });
  }
  const weight = (c: LegacyClaim) =>
    c.status === "Verified" ? c.confidence : c.status === "Contradicted" ? c.confidence * 0.4 : c.confidence * 0.7;
  const overall = Math.round(claims.reduce((sum, c) => sum + weight(c), 0) / claims.length);
  const sources = buildSources(topic, claims);
  const contradicted = claims.filter((c) => c.status === "Contradicted").length;
  const verified = claims.filter((c) => c.status === "Verified").length;
  const summary =
    contradicted > 0
      ? `Detected ${contradicted} potentially hallucinated claim${contradicted > 1 ? "s" : ""}${topic ? ` related to ${topic.topic}` : ""}.`
      : verified > 0
        ? `Cross-verified ${verified} claim${verified > 1 ? "s" : ""}${topic ? ` against ${topic.topic} references` : ""}.`
        : "Content is outside the indexed undergraduate CS domain.";
  return { overallConfidence: Math.max(0, Math.min(100, overall)), claims, sources, summary };
}

export interface SampleDataset {
  id: string;
  name: string;
  description: string;
  content: string;
}

export const SAMPLES: SampleDataset[] = [
  {
    id: "sample-acid",
    name: "Sample 1 — ACID Properties (Correct)",
    description: "Accurate undergraduate explanation of database transaction guarantees.",
    content:
      "ACID stands for Atomicity, Consistency, Isolation, and Durability. Atomicity ensures that a transaction is all or nothing, so either every operation commits or the database is rolled back to its prior state. Consistency guarantees that a transaction moves the database from one valid state to another. Isolation prevents concurrent transactions from interfering with each other. Durability ensures that once a transaction has been committed, it remains so even in the event of a system crash.",
  },
  {
    id: "sample-dijkstra",
    name: "Sample 2 — Dijkstra's Algorithm (Hallucinated)",
    description: "Common LLM hallucinations about complexity and negative weights.",
    content:
      "Dijkstra's algorithm is a dynamic programming technique that computes the shortest path in O(n) linear time. It works on graphs with negative weight edges and is always faster than Bellman-Ford. The algorithm uses a stack to expand nodes in BFS order and guarantees the optimal path in O(log n) regardless of the graph size.",
  },
];
