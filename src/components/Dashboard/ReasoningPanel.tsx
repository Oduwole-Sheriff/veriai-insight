import { Brain, Check, X } from "lucide-react";
import type { Claim } from "@/lib/veriai/types";

interface Props {
  claim: Claim;
}

export function ReasoningPanel({ claim }: Props) {
  if (!claim.reasoning && !claim.agreement?.length && !claim.contradiction?.length) return null;
  return (
    <div className="mt-3 rounded-lg border border-border/70 bg-background/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Brain className="h-3 w-3 text-indigo-500" />
        AI Reasoning
      </div>
      {claim.reasoning && (
        <p className="mt-1.5 text-xs leading-relaxed text-foreground/90">{claim.reasoning}</p>
      )}
      {(claim.agreement?.length ?? 0) > 0 && (
        <ul className="mt-2 space-y-1">
          {claim.agreement!.map((a, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
              <Check className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{a}</span>
            </li>
          ))}
        </ul>
      )}
      {(claim.contradiction?.length ?? 0) > 0 && (
        <ul className="mt-1 space-y-1">
          {claim.contradiction!.map((c, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] text-rose-600 dark:text-rose-400">
              <X className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
