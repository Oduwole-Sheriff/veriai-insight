import { ExternalLink, Globe } from "lucide-react";
import type { Source } from "@/lib/veriai/types";

interface Props {
  source: Source;
  index: number;
}

export function SourceCard({ source, index }: Props) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer noopener"
      className="group block rounded-xl border border-border bg-card/60 p-4 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-indigo-500/40 hover:bg-card hover:shadow-lg animate-in fade-in slide-in-from-bottom-1"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Globe className="h-3.5 w-3.5 text-indigo-500" />
          <span>{source.domain}</span>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-indigo-500" />
      </div>
      <h4 className="mt-2 text-sm font-semibold leading-snug text-foreground group-hover:text-indigo-500">
        {source.title}
      </h4>
      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
        {source.snippet}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500"
            style={{ width: `${source.relevance}%` }}
          />
        </div>
        <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
          {source.relevance}% match
        </span>
      </div>
    </a>
  );
}
