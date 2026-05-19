import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  FileText,
  Info,
  Loader2,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SAMPLES, verifyContent } from "@/lib/veriai/engine";
import type { VerificationResult } from "@/lib/veriai/types";
import { ThemeToggle } from "./ThemeToggle";
import { ConfidenceGauge } from "./ConfidenceGauge";
import { ClaimRow } from "./ClaimRow";
import { SourceCard } from "./SourceCard";

type AppState = "idle" | "verifying" | "results";

export function Dashboard() {
  const [text, setText] = useState("");
  const [state, setState] = useState<AppState>("idle");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [showSamples, setShowSamples] = useState(false);
  const samplesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (samplesRef.current && !samplesRef.current.contains(e.target as Node)) {
        setShowSamples(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const runVerification = () => {
    if (!text.trim() || state === "verifying") return;
    setState("verifying");
    setResult(null);
    setProgress(0);

    const start = performance.now();
    const duration = 1600;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setProgress(Math.round(t * 100));
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        const r = verifyContent(text);
        setResult(r);
        setState("results");
      }
    };
    requestAnimationFrame(tick);
  };

  const loadSample = (id: string) => {
    const s = SAMPLES.find((x) => x.id === id);
    if (!s) return;
    setText(s.content);
    setShowSamples(false);
    setState("idle");
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background relative overflow-hidden">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-30">
        <div className="absolute -top-40 left-1/2 h-[480px] w-[680px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute top-1/3 right-0 h-[320px] w-[420px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex items-center justify-between rounded-2xl border border-border bg-card/60 px-5 py-4 backdrop-blur-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                VeriAI
              </h1>
              <p className="text-xs text-muted-foreground">
                Multi-Source Cross-Verification System for Academic Computer Science
              </p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        {/* Workspace */}
        <section className="mt-8">
          <div className="rounded-2xl border border-border bg-card/70 p-6 shadow-xl shadow-black/5 backdrop-blur-xl transition-all sm:p-8">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              <span>Verification Workspace</span>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={state === "verifying"}
              placeholder="Paste the AI-generated answer or response here to cross-verify..."
              className="min-h-[180px] w-full resize-y rounded-xl border border-border bg-background/60 px-4 py-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70 transition-all focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-60"
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="tabular-nums">{text.trim().length} chars</span>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                <span>Frontend prototype • mock heuristics</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative" ref={samplesRef}>
                  <button
                    type="button"
                    onClick={() => setShowSamples((s) => !s)}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/60 px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-indigo-500/40 hover:bg-accent"
                  >
                    <FileText className="h-4 w-4" />
                    Load Sample Dataset
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${showSamples ? "rotate-180" : ""}`}
                    />
                  </button>

                  {showSamples && (
                    <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-popover shadow-2xl animate-in fade-in slide-in-from-top-2">
                      {SAMPLES.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => loadSample(s.id)}
                          className="block w-full border-b border-border/60 px-4 py-3 text-left text-sm transition-colors last:border-b-0 hover:bg-accent"
                        >
                          <div className="font-medium text-foreground">{s.name}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {s.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={runVerification}
                  disabled={!text.trim() || state === "verifying"}
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {state === "verifying" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying… {progress}%
                    </>
                  ) : (
                    <>
                      <ScanLine className="h-4 w-4 transition-transform group-hover:rotate-6" />
                      Verify Content
                    </>
                  )}
                </button>
              </div>
            </div>

            {state === "verifying" && (
              <div className="mt-5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-1 bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-500 transition-[width] duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </section>

        {/* States */}
        {state === "idle" && !result && (
          <section className="mt-10 grid place-items-center rounded-2xl border border-dashed border-border bg-card/30 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10">
              <Sparkles className="h-6 w-6 text-indigo-500" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-foreground">
              Ready when you are
            </h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Paste an AI-generated answer above, or load a sample dataset to see VeriAI's
              multi-source cross-verification in action.
            </p>
          </section>
        )}

        {state === "verifying" && (
          <section className="mt-10 rounded-2xl border border-border bg-card/60 p-10 text-center backdrop-blur">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10">
              <ScanLine className="h-7 w-7 animate-pulse text-indigo-500" />
            </div>
            <p className="mt-4 text-sm font-medium text-foreground">
              Scanning claims and cross-referencing academic sources…
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {progress < 35
                ? "Extracting factual claims"
                : progress < 70
                  ? "Matching topic domain & sources"
                  : "Computing confidence scores"}
            </p>
          </section>
        )}

        {state === "results" && result && (
          <section className="mt-10 grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top row: gauge + summary */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-xl">
                <ConfidenceGauge value={result.overallConfidence} />
              </div>

              <div className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-xl lg:col-span-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                  Verification Summary
                </div>
                <p className="mt-3 text-base leading-relaxed text-foreground">
                  {result.summary}
                </p>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <StatBox
                    label="Verified"
                    value={result.claims.filter((c) => c.status === "Verified").length}
                    tone="emerald"
                  />
                  <StatBox
                    label="Contradicted"
                    value={result.claims.filter((c) => c.status === "Contradicted").length}
                    tone="rose"
                  />
                  <StatBox
                    label="Unverified"
                    value={result.claims.filter((c) => c.status === "Unverified").length}
                    tone="amber"
                  />
                </div>
              </div>
            </div>

            {/* Claims table */}
            <div className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Claim Analysis</h3>
                <span className="text-xs text-muted-foreground">
                  {result.claims.length} extracted claim
                  {result.claims.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">Claim</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 font-medium">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.claims.map((c, i) => (
                      <ClaimRow key={c.id} claim={c} index={i} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sources */}
            <div className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Supporting Sources</h3>
                <span className="text-xs text-muted-foreground">
                  {result.sources.length} matched reference
                  {result.sources.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {result.sources.map((s, i) => (
                  <SourceCard key={s.id} source={s} index={i} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Footer warning */}
        <footer className="mt-12">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-500" />
            <p>
              VeriAI currently optimizes exclusively for undergraduate-level Computer
              Science factual claims in English. It does not evaluate logical runtime
              correctness or advanced reasoning accuracy.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "rose" | "amber";
}) {
  const toneClasses =
    tone === "emerald"
      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
      : tone === "rose"
        ? "text-rose-500 bg-rose-500/10 border-rose-500/20"
        : "text-amber-500 bg-amber-500/10 border-amber-500/20";
  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClasses}`}>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs uppercase tracking-wider opacity-80">{label}</div>
    </div>
  );
}
