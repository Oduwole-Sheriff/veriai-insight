import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { verifyContentLive } from "@/lib/veriai/verify.functions";
import { fallbackVerify } from "@/lib/veriai/fallback";
import { saveHistory } from "@/lib/veriai/history";
import type { VerificationResult } from "@/lib/veriai/types";

export type VerificationState = "idle" | "verifying" | "results" | "error";
export type VerificationPhase = "extracting" | "researching" | "reasoning" | "done";

const PHASE_TARGETS: Record<VerificationPhase, number> = {
  extracting: 30,
  researching: 65,
  reasoning: 92,
  done: 100,
};

export function useVerification() {
  const [state, setState] = useState<VerificationState>("idle");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<VerificationPhase>("extracting");
  const [error, setError] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef<number>(0);
  const verifyFn = useServerFn(verifyContentLive);

  const cancelRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => cancelRaf, [cancelRaf]);

  const tick = useCallback(() => {
    setProgress((p) => {
      const t = targetRef.current;
      if (p >= t) {
        rafRef.current = requestAnimationFrame(tick);
        return p;
      }
      const next = Math.min(t, p + Math.max(0.4, (t - p) * 0.05));
      rafRef.current = requestAnimationFrame(tick);
      return next;
    });
  }, []);

  const setPhaseAndTarget = useCallback((next: VerificationPhase) => {
    setPhase(next);
    targetRef.current = PHASE_TARGETS[next];
  }, []);

  const run = useCallback(
    async (text: string) => {
      if (!text.trim() || state === "verifying") return;
      cancelRaf();
      setState("verifying");
      setResult(null);
      setError(null);
      setProgress(0);
      setPhaseAndTarget("extracting");
      rafRef.current = requestAnimationFrame(tick);

      // Phase pacing — best-effort visual sync with backend work.
      const researchTimer = setTimeout(() => setPhaseAndTarget("researching"), 1200);
      const reasoningTimer = setTimeout(() => setPhaseAndTarget("reasoning"), 3600);

      try {
        const res = await verifyFn({ data: { text: text.trim() } });
        clearTimeout(researchTimer);
        clearTimeout(reasoningTimer);
        setPhaseAndTarget("done");
        setResult(res);
        try {
          saveHistory(text.trim(), res);
        } catch {
          /* ignore */
        }
        // Allow gauge to reach 100 before switching states.
        setTimeout(() => {
          cancelRaf();
          setProgress(100);
          setState("results");
        }, 300);
      } catch (err) {
        clearTimeout(researchTimer);
        clearTimeout(reasoningTimer);
        const message = err instanceof Error ? err.message : "Live verification failed";
        // Offline fallback keeps the UX intact.
        const fb = fallbackVerify(text.trim(), "Live verification unavailable —");
        setPhaseAndTarget("done");
        setResult(fb);
        setError(message);
        setTimeout(() => {
          cancelRaf();
          setProgress(100);
          setState("results");
        }, 300);
      }
    },
    [state, cancelRaf, tick, setPhaseAndTarget, verifyFn],
  );

  const reset = useCallback(() => {
    cancelRaf();
    setState("idle");
    setResult(null);
    setError(null);
    setProgress(0);
    setPhase("extracting");
  }, [cancelRaf]);

  const openResult = useCallback((r: VerificationResult) => {
    cancelRaf();
    setResult(r);
    setError(null);
    setProgress(100);
    setPhase("done");
    setState("results");
  }, [cancelRaf]);

  return { state, result, progress, phase, error, run, reset, openResult } as const;
}
