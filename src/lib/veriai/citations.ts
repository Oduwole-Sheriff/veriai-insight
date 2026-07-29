import type { Source } from "./types";

export type CitationStyle = "APA" | "IEEE" | "MLA" | "Harvard" | "Chicago";

function yearOf(source: Source): string {
  if (!source.publishedAt) return "n.d.";
  const d = new Date(source.publishedAt);
  return Number.isFinite(d.getTime()) ? String(d.getFullYear()) : "n.d.";
}

function accessed(): string {
  const d = new Date();
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function formatCitation(source: Source, style: CitationStyle, index = 1): string {
  const year = yearOf(source);
  const publisher = source.publisher ?? source.domain;
  const title = source.title;
  const url = source.url;

  switch (style) {
    case "APA":
      return `${publisher}. (${year}). ${title}. Retrieved from ${url}`;
    case "IEEE":
      return `[${index}] "${title}," ${publisher}, ${year}. [Online]. Available: ${url}`;
    case "MLA":
      return `"${title}." ${publisher}, ${year}, ${url}. Accessed ${accessed()}.`;
    case "Harvard":
      return `${publisher} (${year}) '${title}'. Available at: ${url} (Accessed: ${accessed()}).`;
    case "Chicago":
      return `${publisher}. "${title}." Accessed ${accessed()}. ${url}.`;
  }
}

export const CITATION_STYLES: CitationStyle[] = ["APA", "IEEE", "MLA", "Harvard", "Chicago"];
