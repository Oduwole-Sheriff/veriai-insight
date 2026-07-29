import { ScanLine } from "lucide-react";
import { ResultsSkeleton } from "./ResultsSkeleton";
import type { VerificationPhase } from "@/hooks/useVerification";

interface VerifyingStateProps {
  progress: number;
  phase: VerificationPhase;
}

const LABELS: Record<VerificationPhase, string> = {
  extracting: "Extracting factual claims with AI…",
  researching: "Searching trusted sources across the web…",
  reasoning: "Cross-referencing evidence and scoring confidence…",
  done: "Finalizing results…",
};

export function VerifyingState({ progress, phase }: VerifyingStateProps) {
  return (
    <div className="mt-10 space-y-6">
      <section className="rounded-2xl border border-border bg-card/60 p-8 text-center backdrop-blur sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10">
          <ScanLine className="h-7 w-7 animate-pulse text-indigo-500" />
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">Live verification in progress</p>
        <p className="mt-1 text-xs text-muted-foreground">{LABELS[phase]}</p>
        <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground/70">
          {Math.round(progress)}%
        </p>
      </section>
      <ResultsSkeleton />
    </div>
  );
}
