import { useState } from "react";
import { AlertTriangle, CheckCircle, ChevronDown, ChevronRight, HelpCircle, XCircle } from "lucide-react";
import type { Claim, ClaimStatus } from "@/lib/veriai/types";
import { ReasoningPanel } from "./ReasoningPanel";

interface Props {
  claim: Claim;
  index: number;
}

function statusMeta(status: ClaimStatus) {
  switch (status) {
    case "Verified":
      return {
        Icon: CheckCircle,
        iconColor: "text-emerald-500",
        badgeBg:
          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        barColor: "bg-emerald-500",
      };
    case "Contradicted":
      return {
        Icon: XCircle,
        iconColor: "text-rose-500",
        badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
        barColor: "bg-rose-500",
      };
    case "Partially Supported":
      return {
        Icon: AlertTriangle,
        iconColor: "text-amber-500",
        badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        barColor: "bg-amber-500",
      };
    default:
      return {
        Icon: HelpCircle,
        iconColor: "text-slate-500",
        badgeBg: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
        barColor: "bg-slate-500",
      };
  }
}

export function ClaimRow({ claim, index }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { Icon, iconColor, badgeBg, barColor } = statusMeta(claim.status);
  const hasDetail = !!(claim.reasoning || claim.agreement?.length || claim.contradiction?.length);

  return (
    <>
      <tr
        className="border-b border-border/60 transition-colors hover:bg-accent/40 animate-in fade-in slide-in-from-bottom-1"
        style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
      >
        <td className="py-4 pr-4 align-top">
          <button
            type="button"
            onClick={() => hasDetail && setExpanded((v) => !v)}
            disabled={!hasDetail}
            className="flex items-start gap-2 text-left"
          >
            {hasDetail ? (
              expanded ? (
                <ChevronDown className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )
            ) : (
              <span className="mt-1 h-3.5 w-3.5 shrink-0" />
            )}
            <span className="text-sm leading-relaxed text-foreground">{claim.text}</span>
          </button>
        </td>
        <td className="py-4 pr-4 align-top">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${badgeBg}`}>
            <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
            {claim.status}
          </span>
        </td>
        <td className="py-4 align-top">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full ${barColor} transition-[width] duration-700`}
                style={{ width: `${claim.confidence}%` }}
              />
            </div>
            <span className="w-10 text-xs font-medium tabular-nums text-muted-foreground">
              {claim.confidence}%
            </span>
          </div>
        </td>
      </tr>
      {expanded && hasDetail && (
        <tr className="border-b border-border/60 bg-background/30">
          <td colSpan={3} className="px-6 pb-4 pt-0">
            <ReasoningPanel claim={claim} />
          </td>
        </tr>
      )}
    </>
  );
}
