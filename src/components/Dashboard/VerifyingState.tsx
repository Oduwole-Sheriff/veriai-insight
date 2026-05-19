import { ScanLine } from "lucide-react";
import { ResultsSkeleton } from "./ResultsSkeleton";

interface VerifyingStateProps {
  progress: number;
}

function progressLabel(progress: number): string {
  if (progress < 35) return "Extracting factual claims";
  if (progress < 70) return "Matching topic domain & sources";
  return "Computing confidence scores";
}

export function VerifyingState({ progress }: VerifyingStateProps) {
  return (
    <div className="mt-10 space-y-6">
      <section className="rounded-2xl border border-border bg-card/60 p-8 text-center backdrop-blur sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10">
          <ScanLine className="h-7 w-7 animate-pulse text-indigo-500" />
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">
          Scanning claims and cross-referencing academic sources…
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{progressLabel(progress)}</p>
      </section>

      <ResultsSkeleton />
    </div>
  );
}
