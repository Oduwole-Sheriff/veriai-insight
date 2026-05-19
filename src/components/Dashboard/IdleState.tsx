import { Sparkles } from "lucide-react";

export function IdleState() {
  return (
    <section className="mt-10 grid place-items-center rounded-2xl border border-dashed border-border bg-card/30 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10">
        <Sparkles className="h-6 w-6 text-indigo-500" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-foreground">Ready when you are</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Paste an AI-generated answer above, or load a sample dataset to see VeriAI's
        multi-source cross-verification in action.
      </p>
    </section>
  );
}
