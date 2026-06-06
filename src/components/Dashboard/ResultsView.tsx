import { Sparkles } from "lucide-react";
import type { VerificationResult, ClaimStatus } from "@/lib/veriai/types";
import { ConfidenceGauge } from "./ConfidenceGauge";
import { ClaimRow } from "./ClaimRow";
import { SourceCard } from "./SourceCard";
import { StatBox } from "./StatBox";

interface ResultsViewProps {
  result: VerificationResult;
}

function countBy(result: VerificationResult, status: ClaimStatus): number {
  return result.claims.filter((c) => c.status === status).length;
}

function statusColor(status: ClaimStatus) {
  switch (status) {
    case "Verified":
      return "text-emerald-500";
    case "Contradicted":
      return "text-rose-500";
    default:
      return "text-amber-500";
  }
}

export function ResultsView({ result }: ResultsViewProps) {
  const verified = countBy(result, "Verified");
  const contradicted = countBy(result, "Contradicted");
  const unverified = countBy(result, "Unverified");

  return (
    <section className="mt-10 grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="mt-10 md:mt-15 lg:mt-0 grid place-items-center rounded-2xl border border-dashed border-border bg-card/30 px-6 py-16 text-center">
          <ConfidenceGauge value={result.overallConfidence} />
        </div>

        <div className="rounded-2xl border border-border bg-card/70 p-4 sm:p-6 lg:col-span-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            Verification Summary
          </div>

          <p className="mt-3 text-sm leading-relaxed text-foreground sm:text-base">
            {result.summary}
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatBox label="Verified" value={verified} tone="emerald" />
            <StatBox label="Contradicted" value={contradicted} tone="rose" />
            <StatBox label="Unverified" value={unverified} tone="amber" />
          </div>
        </div>
      </div>

      {/* Claim Analysis */}
      <div className="rounded-2xl border border-border bg-card/70 p-4 sm:p-6 backdrop-blur-xl">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Claim Analysis
          </h3>

          <span className="text-xs text-muted-foreground">
            {result.claims.length} extracted claim
            {result.claims.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Mobile Cards */}
        <div className="space-y-3 sm:hidden">
          {result.claims.map((claim) => (
            <div
              key={claim.id}
              className="rounded-xl border border-border bg-background/40 p-4"
            >
              <p className="text-sm leading-relaxed text-foreground">
                {claim.text}
              </p>

              <div className="mt-3 flex items-center justify-between">
                <span
                  className={`text-xs font-medium ${statusColor(
                    claim.status
                  )}`}
                >
                  {claim.status}
                </span>

                <span className="text-xs text-muted-foreground">
                  {claim.confidence}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">Claim</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 font-medium">Confidence</th>
              </tr>
            </thead>

            <tbody>
              {result.claims.map((c, i) => (
                <ClaimRow key={c.id} claim={c} index={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sources */}
      <div className="rounded-2xl border border-border bg-card/70 p-4 sm:p-6 backdrop-blur-xl">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Supporting Sources
          </h3>

          <span className="text-xs text-muted-foreground">
            {result.sources.length} matched reference
            {result.sources.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {result.sources.map((s, i) => (
            <SourceCard key={s.id} source={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}