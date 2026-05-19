import { ShieldCheck } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 px-4 py-4 backdrop-blur-xl shadow-sm sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 shadow-lg shadow-indigo-500/20">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">VeriAI</h1>
          <p className="truncate text-xs text-muted-foreground sm:whitespace-normal">
            Multi-Source Cross-Verification System for Academic Computer Science
          </p>
        </div>
      </div>
      <ThemeToggle />
    </header>
  );
}
