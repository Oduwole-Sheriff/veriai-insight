import type { SourceKind } from "@/lib/veriai/types";

const HIGH_TRUST_HOSTS = new Set([
  "developer.mozilla.org",
  "www.w3.org",
  "w3.org",
  "www.ietf.org",
  "datatracker.ietf.org",
  "docs.python.org",
  "nodejs.org",
  "reactjs.org",
  "react.dev",
  "docs.oracle.com",
  "learn.microsoft.com",
  "docs.microsoft.com",
  "cloud.google.com",
  "docs.aws.amazon.com",
]);

const ACADEMIC_HOSTS = new Set([
  "arxiv.org",
  "dl.acm.org",
  "ieeexplore.ieee.org",
  "link.springer.com",
  "www.nature.com",
  "www.science.org",
  "scholar.google.com",
  "www.jstor.org",
]);

const WIKIPEDIA_HOSTS = new Set(["en.wikipedia.org", "wikipedia.org"]);
const FORUM_HOSTS = new Set([
  "stackoverflow.com",
  "reddit.com",
  "www.reddit.com",
  "medium.com",
  "dev.to",
  "quora.com",
]);

export interface RankedSource {
  domain: string;
  trustScore: number;
  kind: SourceKind;
  publisher: string;
}

export function rankDomain(rawUrl: string): RankedSource {
  let host = "";
  try {
    host = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    host = rawUrl.toLowerCase();
  }
  const bare = host.replace(/^www\./, "");
  const publisher = bare.split(".").slice(-2).join(".");

  if (host.endsWith(".gov")) {
    return { domain: host, trustScore: 96, kind: "Government", publisher };
  }
  if (host.endsWith(".edu")) {
    return { domain: host, trustScore: 92, kind: "Academic Reference", publisher };
  }
  if (ACADEMIC_HOSTS.has(host)) {
    return { domain: host, trustScore: 88, kind: "Academic Reference", publisher };
  }
  if (host === "developer.mozilla.org") {
    return { domain: host, trustScore: 90, kind: "MDN Web Docs", publisher };
  }
  if (HIGH_TRUST_HOSTS.has(host)) {
    return { domain: host, trustScore: 90, kind: "Official Documentation", publisher };
  }
  if (WIKIPEDIA_HOSTS.has(host)) {
    return { domain: host, trustScore: 72, kind: "Wikipedia", publisher };
  }
  if (host === "stackoverflow.com") {
    return { domain: host, trustScore: 62, kind: "Stack Overflow", publisher };
  }
  if (FORUM_HOSTS.has(host)) {
    return { domain: host, trustScore: 45, kind: "Web", publisher };
  }
  if (/docs?\.|developer\.|api\./.test(host)) {
    return { domain: host, trustScore: 78, kind: "Official Documentation", publisher };
  }
  return { domain: host, trustScore: 55, kind: "Web", publisher };
}

export function faviconFor(domain: string): string {
  return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(domain)}`;
}
