import { Sparkles, Radio, WifiOff, AlertCircle } from "lucide-react";
import type { VerificationResult, ClaimStatus } from "@/lib/veriai/types";
import { ConfidenceGauge } from "./ConfidenceGauge";
import { ClaimRow } from "./ClaimRow";
import { SourceCard } from "./SourceCard";
import { StatBox } from "./StatBox";
import { ExportMenu } from "./ExportMenu";

interface ResultsViewProps {
  result: VerificationResult;
  error?: string | null;
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
    case "Partially Supported":
      return "text-amber-500";
    default:
      return "text-slate-500";
  }
}

export function ResultsView({ result, error }: ResultsViewProps) {
  const verified = countBy(result, "Verified");
  const contradicted = countBy(result, "Contradicted");
  const partial = countBy(result, "Partially Supported");
  const unverified = countBy(result, "Unable to Verify");

  return (
    <section className="mt-10 grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {(result.mode === "fallback" || error) && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Offline heuristic mode</p>
            <p className="mt-0.5 opacity-90">
              {error ?? "Live verification is unavailable; results come from local heuristics only."}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="mt-10 md:mt-15 lg:mt-0 grid place-items-center rounded-2xl border border-dashed border-border bg-card/30 px-6 py-16 text-center">
          <ConfidenceGauge value={result.overallConfidence} />
          <p className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            Hallucination risk {result.hallucinationRisk}%
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card/70 p-4 sm:p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              Verification Summary
              <span
                className={`ml-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] normal-case tracking-normal ${
                  result.mode === "live"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}
              >
                {result.mode === "live" ? <Radio className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {result.mode}
              </span>
            </div>
            <ExportMenu result={result} />
          </div>

          <p className="mt-3 text-sm leading-relaxed text-foreground sm:text-base">{result.summary}</p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBox label="Verified" value={verified} tone="emerald" />
            <StatBox label="Contradicted" value={contradicted} tone="rose" />
            <StatBox label="Partial" value={partial} tone="amber" />
            <StatBox label="Unverified" value={unverified} tone="amber" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/70 p-4 sm:p-6 backdrop-blur-xl">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-foreground">Claim Analysis</h3>
          <span className="text-xs text-muted-foreground">
            {result.claims.length} extracted claim{result.claims.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="space-y-3 sm:hidden">
          {result.claims.map((claim) => (
            <div key={claim.id} className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-sm leading-relaxed text-foreground">{claim.text}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className={`text-xs font-medium ${statusColor(claim.status)}`}>{claim.status}</span>
                <span className="text-xs text-muted-foreground">{claim.confidence}%</span>
              </div>
              {claim.reasoning && (
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{claim.reasoning}</p>
              )}
            </div>
          ))}
        </div>

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

      <div className="rounded-2xl border border-border bg-card/70 p-4 sm:p-6 backdrop-blur-xl">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-foreground">Supporting Sources</h3>
          <span className="text-xs text-muted-foreground">
            {result.sources.length} matched reference{result.sources.length !== 1 ? "s" : ""}
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
