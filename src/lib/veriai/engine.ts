import type { Claim, Source, VerificationResult, ClaimStatus } from "./types";

/**
 * Mock academic knowledge base mapping topics to authoritative claims.
 * Deterministic, frontend-only heuristic.
 */
interface TopicEntry {
  topic: string;
  keywords: string[];
  truths: string[]; // substrings that indicate correct understanding
  falsehoods: string[]; // substrings that indicate common hallucinations
  sources: Source[];
}

const KNOWLEDGE: TopicEntry[] = [
  {
    topic: "ACID Properties",
    keywords: ["acid", "atomicity", "consistency", "isolation", "durability", "transaction"],
    truths: [
      "atomicity",
      "consistency",
      "isolation",
      "durability",
      "all or nothing",
      "transaction",
      "commit",
      "rollback",
    ],
    falsehoods: ["availability", "cap theorem replaces acid", "acid stands for"],
    sources: [
      {
        id: "s-acid-1",
        title: "Database System Concepts (Silberschatz, Korth, Sudarshan)",
        domain: "db-book.com",
        relevance: 96,
        snippet:
          "ACID properties guarantee that database transactions are processed reliably: Atomicity, Consistency, Isolation, and Durability.",
        url: "https://www.db-book.com",
      },
      {
        id: "s-acid-2",
        title: "ACID — PostgreSQL Documentation",
        domain: "postgresql.org",
        relevance: 91,
        snippet:
          "PostgreSQL transactions adhere to the ACID model, ensuring atomic commits and durable writes through WAL.",
        url: "https://www.postgresql.org/docs/current/tutorial-transactions.html",
      },
      {
        id: "s-acid-3",
        title: "Transactions — MIT 6.830 Lecture Notes",
        domain: "mit.edu",
        relevance: 84,
        snippet:
          "A transaction is a sequence of operations performed as a single logical unit of work satisfying ACID.",
        url: "https://dspace.mit.edu",
      },
    ],
  },
  {
    topic: "Dijkstra's Algorithm",
    keywords: ["dijkstra", "shortest path", "graph", "priority queue", "bfs"],
    truths: [
      "shortest path",
      "non-negative",
      "priority queue",
      "greedy",
      "o((v+e) log v)",
      "o(e log v)",
      "min-heap",
    ],
    falsehoods: [
      "negative weight",
      "o(n)",
      "o(v)",
      "o(log n)",
      "dynamic programming",
      "works on negative",
      "always o(n log n)",
      "linear time",
      "bellman-ford is faster",
    ],
    sources: [
      {
        id: "s-dij-1",
        title: "Introduction to Algorithms (CLRS) — Chapter 24",
        domain: "mitpress.mit.edu",
        relevance: 97,
        snippet:
          "Dijkstra's algorithm solves the single-source shortest-paths problem on a weighted, directed graph with non-negative edge weights in O((V+E) log V) using a binary heap.",
        url: "https://mitpress.mit.edu/books/introduction-algorithms-third-edition",
      },
      {
        id: "s-dij-2",
        title: "Dijkstra's Algorithm — Stanford CS161",
        domain: "stanford.edu",
        relevance: 92,
        snippet:
          "The algorithm requires non-negative edge weights. For negative weights, Bellman-Ford must be used instead.",
        url: "https://stanford.edu/~rezab/classes/cme323",
      },
      {
        id: "s-dij-3",
        title: "Shortest Paths — Princeton Algorithms",
        domain: "princeton.edu",
        relevance: 88,
        snippet:
          "Using a Fibonacci heap, Dijkstra runs in O(E + V log V); with a binary heap, O((V+E) log V).",
        url: "https://algs4.cs.princeton.edu/44sp",
      },
    ],
  },
  {
    topic: "Big-O Notation",
    keywords: ["big-o", "big o", "complexity", "asymptotic"],
    truths: ["upper bound", "worst case", "asymptotic", "growth"],
    falsehoods: ["exact runtime", "always tight bound"],
    sources: [
      {
        id: "s-bo-1",
        title: "Asymptotic Analysis — CLRS Chapter 3",
        domain: "mitpress.mit.edu",
        relevance: 90,
        snippet: "Big-O describes an asymptotic upper bound on the growth rate of a function.",
        url: "https://mitpress.mit.edu",
      },
    ],
  },
];

const STOP = new Set([
  "the","a","an","is","are","of","to","in","and","or","for","with","on","as","by","it","that","this","be","at","from","which","can","has","have","its","into","using","use",
]);

function splitClaims(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
}

function matchTopic(text: string): TopicEntry | null {
  const lower = text.toLowerCase();
  let best: { entry: TopicEntry; hits: number } | null = null;
  for (const entry of KNOWLEDGE) {
    const hits = entry.keywords.reduce((n, kw) => (lower.includes(kw) ? n + 1 : n), 0);
    if (hits > 0 && (!best || hits > best.hits)) best = { entry, hits };
  }
  return best?.entry ?? null;
}

function classifyClaim(claim: string, topic: TopicEntry | null): { status: ClaimStatus; confidence: number } {
  const lower = claim.toLowerCase();
  if (!topic) {
    // Out-of-domain: cannot verify
    const tokens = lower.split(/\W+/).filter((t) => t.length > 3 && !STOP.has(t));
    const score = Math.min(60, 30 + tokens.length * 2);
    return { status: "Unverified", confidence: score };
  }
  const truthHits = topic.truths.filter((t) => lower.includes(t)).length;
  const falseHits = topic.falsehoods.filter((f) => lower.includes(f)).length;

  if (falseHits > 0) {
    const conf = Math.max(8, 35 - falseHits * 10 - truthHits * 2);
    return { status: "Contradicted", confidence: conf };
  }
  if (truthHits >= 1) {
    const conf = Math.min(98, 72 + truthHits * 7);
    return { status: "Verified", confidence: conf };
  }
  return { status: "Unverified", confidence: 55 };
}

export function verifyContent(text: string): VerificationResult {
  const topic = matchTopic(text);
  const sentences = splitClaims(text);
  const claims: Claim[] = sentences.slice(0, 8).map((s, i) => {
    const { status, confidence } = classifyClaim(s, topic);
    return {
      id: `c-${i}`,
      text: s.length > 220 ? s.slice(0, 217) + "…" : s,
      status,
      confidence,
    };
  });

  if (claims.length === 0) {
    claims.push({
      id: "c-0",
      text: text.trim().slice(0, 200) || "(empty input)",
      status: "Unverified",
      confidence: 40,
    });
  }

  // Overall confidence: weighted by status
  const weight = (c: Claim) =>
    c.status === "Verified" ? c.confidence : c.status === "Contradicted" ? c.confidence * 0.4 : c.confidence * 0.7;
  const overall = Math.round(claims.reduce((sum, c) => sum + weight(c), 0) / claims.length);

  const sources: Source[] = topic ? topic.sources : [
    {
      id: "s-generic-1",
      title: "ACM Computing Classification System",
      domain: "acm.org",
      relevance: 42,
      snippet: "No direct topic match found in the indexed undergraduate CS knowledge base.",
      url: "https://www.acm.org/publications/class-2012",
    },
  ];

  const contradicted = claims.filter((c) => c.status === "Contradicted").length;
  const verified = claims.filter((c) => c.status === "Verified").length;
  const summary = contradicted > 0
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
