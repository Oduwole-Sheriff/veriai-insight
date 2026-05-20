export type ClaimStatus = "Verified" | "Contradicted" | "Unverified";

export type SourceKind =
  | "Wikipedia"
  | "MDN Web Docs"
  | "Stack Overflow"
  | "Official Documentation"
  | "Academic Reference";

export type SourceStatus = "Supports" | "Contradicts" | "Related";

export interface Claim {
  id: string;
  text: string;
  status: ClaimStatus;
  confidence: number;
}

export interface Source {
  id: string;
  kind: SourceKind;
  title: string;
  domain: string;
  relevance: number;
  snippet: string;
  url: string;
  status: SourceStatus;
}

export interface VerificationResult {
  overallConfidence: number;
  claims: Claim[];
  sources: Source[];
  summary: string;
}
