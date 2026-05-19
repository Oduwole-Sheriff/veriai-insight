export type ClaimStatus = "Verified" | "Contradicted" | "Unverified";

export interface Claim {
  id: string;
  text: string;
  status: ClaimStatus;
  confidence: number; // 0-100
}

export interface Source {
  id: string;
  title: string;
  domain: string;
  relevance: number; // 0-100
  snippet: string;
  url: string;
}

export interface VerificationResult {
  overallConfidence: number; // 0-100
  claims: Claim[];
  sources: Source[];
  summary: string;
}
