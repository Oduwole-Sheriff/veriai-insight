import { useState } from "react";
import { History, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { HistoryDrawer } from "./HistoryDrawer";
import type { VerificationResult } from "@/lib/veriai/types";

interface Props {
  onOpenEntry: (result: VerificationResult) => void;
}

export function Header({ onOpenEntry }: Props) {
  const [historyOpen, setHistoryOpen] = useState(false);
  return (
    <>
      <header className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 px-4 py-4 backdrop-blur-xl shadow-sm sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">VeriAI</h1>
            <p className="truncate text-xs text-muted-foreground sm:whitespace-normal">
              Live AI Hallucination Detection · Multi-Source Cross-Verification
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-indigo-500/50"
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">History</span>
          </button>
          <ThemeToggle />
        </div>
      </header>
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onOpenEntry={onOpenEntry}
      />
    </>
  );
}
