import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import type { Claim } from "@/lib/veriai/types";

interface Props {
  claim: Claim;
  index: number;
}

export function ClaimRow({ claim, index }: Props) {
  const isVerified = claim.status === "Verified";
  const isContradicted = claim.status === "Contradicted";

  const Icon = isVerified ? CheckCircle : isContradicted ? XCircle : AlertTriangle;
  const iconColor = isVerified
    ? "text-emerald-500"
    : isContradicted
      ? "text-rose-500"
      : "text-amber-500";
  const badgeBg = isVerified
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
    : isContradicted
      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  const barColor = isVerified
    ? "bg-emerald-500"
    : isContradicted
      ? "bg-rose-500"
      : "bg-amber-500";

  return (
    <tr
      className="border-b border-border/60 transition-colors hover:bg-accent/40 animate-in fade-in slide-in-from-bottom-1"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
    >
      <td className="py-4 pr-4 align-top">
        <p className="text-sm leading-relaxed text-foreground">{claim.text}</p>
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
  );
}
