import { useRef, useState } from "react";
import { Download, FileJson, FileSpreadsheet, FileText, FileType } from "lucide-react";
import type { VerificationResult } from "@/lib/veriai/types";
import { exportCsv, exportJson, exportMarkdown, exportPdf } from "@/lib/veriai/exporters";
import { useClickOutside } from "@/hooks/useClickOutside";

interface Props {
  result: VerificationResult;
}

export function ExportMenu({ result }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const items = [
    { label: "JSON", icon: FileJson, run: () => exportJson(result) },
    { label: "CSV", icon: FileSpreadsheet, run: () => exportCsv(result) },
    { label: "Markdown", icon: FileText, run: () => exportMarkdown(result) },
    { label: "PDF", icon: FileType, run: () => void exportPdf(result) },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-indigo-500/50"
      >
        <Download className="h-3.5 w-3.5" />
        Export
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl">
          {items.map(({ label, icon: Icon, run }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setOpen(false);
                run();
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
            >
              <Icon className="h-3.5 w-3.5 text-indigo-500" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
