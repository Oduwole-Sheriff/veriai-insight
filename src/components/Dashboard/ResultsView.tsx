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

export function ResultsView({ result }: ResultsViewProps) {
  const verified = countBy(result, "Verified");
  const contradicted = countBy(result, "Contradicted");
  const unverified = countBy(result, "Unverified");

  return (
    <section className="mt-10 grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-xl">
          <ConfidenceGauge value={result.overallConfidence} />
        </div>

        <div className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-xl lg:col-span-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            Verification Summary
          </div>
          <p className="mt-3 text-base leading-relaxed text-foreground">{result.summary}</p>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <StatBox label="Verified" value={verified} tone="emerald" />
            <StatBox label="Contradicted" value={contradicted} tone="rose" />
            <StatBox label="Unverified" value={unverified} tone="amber" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Claim Analysis</h3>
          <span className="text-xs text-muted-foreground">
            {result.claims.length} extracted claim{result.claims.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="-mx-6 overflow-x-auto px-6">
          <table className="w-full min-w-[520px] text-left">
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

      <div className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Supporting Sources</h3>
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
