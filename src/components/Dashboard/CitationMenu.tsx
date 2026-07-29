import { useState, useRef } from "react";
import { Quote, Copy, Check } from "lucide-react";
import type { Source } from "@/lib/veriai/types";
import { CITATION_STYLES, formatCitation, type CitationStyle } from "@/lib/veriai/citations";
import { useClickOutside } from "@/hooks/useClickOutside";

interface Props {
  source: Source;
  index: number;
}

export function CitationMenu({ source, index }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<CitationStyle | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const copy = async (style: CitationStyle, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const text = formatCitation(source, style, index + 1);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(style);
      setTimeout(() => setCopied(null), 1400);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="relative" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex items-center gap-1 rounded-md border border-border bg-background/60 px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:border-indigo-500/50 hover:text-foreground"
        aria-label="Cite this source"
      >
        <Quote className="h-3 w-3" />
        Cite
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl">
          {CITATION_STYLES.map((style) => (
            <button
              key={style}
              type="button"
              onClick={(e) => copy(style, e)}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
            >
              <span className="font-medium">{style}</span>
              {copied === style ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
