import { BookOpen, Building2, CheckCircle2, ExternalLink, FileCode2, Globe, GraduationCap, Info, MessageSquare, Newspaper, XCircle } from "lucide-react";
import type { Source, SourceKind, SourceStatus } from "@/lib/veriai/types";
import { CitationMenu } from "./CitationMenu";

interface Props {
  source: Source;
  index: number;
}

const KIND_ICON: Record<SourceKind, typeof Globe> = {
  Wikipedia: BookOpen,
  "MDN Web Docs": FileCode2,
  "Stack Overflow": MessageSquare,
  "Official Documentation": Globe,
  "Academic Reference": GraduationCap,
  Government: Building2,
  News: Newspaper,
  Web: Globe,
};

const STATUS_STYLES: Record<SourceStatus, { icon: typeof CheckCircle2; cls: string; label: string }> = {
  Supports: {
    icon: CheckCircle2,
    cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    label: "Supports",
  },
  Contradicts: {
    icon: XCircle,
    cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    label: "Contradicts",
  },
  Related: {
    icon: Info,
    cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    label: "Related",
  },
};

export function SourceCard({ source, index }: Props) {
  const KindIcon = KIND_ICON[source.kind] ?? Globe;
  const status = STATUS_STYLES[source.status];
  const StatusIcon = status.icon;

  const trustColor =
    source.trustScore >= 85
      ? "text-emerald-500"
      : source.trustScore >= 65
        ? "text-indigo-500"
        : "text-amber-500";

  return (
    <div
      className="group relative block rounded-xl border border-border bg-card/60 p-4 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-indigo-500/40 hover:bg-card hover:shadow-lg animate-in fade-in slide-in-from-bottom-1"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
    >
      <a href={source.url} target="_blank" rel="noreferrer noopener" className="block">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            {source.favicon ? (
              <img src={source.favicon} alt="" className="h-4 w-4 shrink-0 rounded-sm" loading="lazy" />
            ) : (
              <KindIcon className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
            )}
            <span className="truncate font-medium text-foreground/80">{source.kind}</span>
            <span className="h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
            <span className="truncate">{source.publisher ?? source.domain}</span>
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-indigo-500" />
        </div>

        <h4 className="mt-2 text-sm font-semibold leading-snug text-foreground group-hover:text-indigo-500">
          {source.title}
        </h4>
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
          {source.snippet}
        </p>

        <div className="mt-3 flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${status.cls}`}
          >
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500"
              style={{ width: `${source.relevance}%` }}
            />
          </div>
          <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
            {source.relevance}%
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className={`font-medium ${trustColor}`}>Trust {source.trustScore}</span>
          {source.publishedAt && <span>{new Date(source.publishedAt).toLocaleDateString()}</span>}
        </div>
      </a>
      <div className="mt-2 flex justify-end">
        <CitationMenu source={source} index={index} />
      </div>
    </div>
  );
}

