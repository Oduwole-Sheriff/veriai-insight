import { Info } from "lucide-react";

export function FooterDisclaimer() {
  return (
    <footer className="mt-12">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-500" />
        <p>
          VeriAI currently optimizes exclusively for undergraduate-level Computer Science
          factual claims in English. It does not evaluate logical runtime correctness or
          advanced reasoning accuracy.
        </p>
      </div>
    </footer>
  );
}
