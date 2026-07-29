export type ClaimStatus =
  | "Verified"
  | "Contradicted"
  | "Partially Supported"
  | "Unable to Verify";

export type SourceKind =
  | "Wikipedia"
  | "MDN Web Docs"
  | "Stack Overflow"
  | "Official Documentation"
  | "Academic Reference"
  | "Government"
  | "News"
  | "Web";

export type SourceStatus = "Supports" | "Contradicts" | "Related";

export interface Source {
  id: string;
  kind: SourceKind;
  title: string;
  domain: string;
  publisher?: string;
  publishedAt?: string;
  favicon?: string;
  relevance: number;
  trustScore: number;
  snippet: string;
  url: string;
  status: SourceStatus;
}

export interface Claim {
  id: string;
  text: string;
  status: ClaimStatus;
  confidence: number;
  reasoning?: string;
  agreement?: string[];
  contradiction?: string[];
  sourceIds?: string[];
}

export interface VerificationResult {
  overallConfidence: number;
  hallucinationRisk: number;
  claims: Claim[];
  sources: Source[];
  summary: string;
  reasoning?: string;
  mode: "live" | "fallback";
  createdAt: string;
  inputPreview: string;
}
