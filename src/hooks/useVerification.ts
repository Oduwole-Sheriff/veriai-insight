import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { verifyContentLive } from "@/lib/veriai/verify.functions";
import { fallbackVerify } from "@/lib/veriai/fallback";
import { saveHistory } from "@/lib/veriai/history";
import { getVerifyEndpoint, isOfflineModeEnabled } from "@/lib/veriai/config";
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
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const runIdRef = useRef(0);
  const mountedRef = useRef(true);

  const verifyFn = useServerFn(verifyContentLive);

  const cancelRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelRaf();
      clearTimers();
    };
  }, [cancelRaf, clearTimers]);

  const tick = useCallback(() => {
    setProgress((p) => {
      const t = targetRef.current;
      const next = p >= t ? p : Math.min(t, p + Math.max(0.4, (t - p) * 0.05));
      return next;
    });
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const setPhaseAndTarget = useCallback((next: VerificationPhase) => {
    setPhase(next);
    targetRef.current = PHASE_TARGETS[next];
  }, []);

  const finish = useCallback(
    (res: VerificationResult, errMessage: string | null) => {
      cancelRaf();
      clearTimers();
      setPhase("done");
      targetRef.current = 100;
      setProgress(100);
      setResult(res);
      setError(errMessage);
      setState("results");
      // eslint-disable-next-line no-console
      console.log("[VeriAI] state updated → results", {
        claims: res.claims.length,
        sources: res.sources.length,
        mode: res.mode,
        error: errMessage,
      });
    },
    [cancelRaf, clearTimers],
  );

  const run = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (rafRef.current !== null) return; // a run is already in flight

      const runId = ++runIdRef.current;
      cancelRaf();
      clearTimers();
      setState("verifying");
      setResult(null);
      setError(null);
      setProgress(0);
      setPhaseAndTarget("extracting");
      rafRef.current = requestAnimationFrame(tick);

      // eslint-disable-next-line no-console
      console.log("[VeriAI] request started", { chars: trimmed.length });

      timersRef.current.push(setTimeout(() => setPhaseAndTarget("researching"), 1200));
      timersRef.current.push(setTimeout(() => setPhaseAndTarget("reasoning"), 3600));

      try {
        const res = await verifyFn({ data: { text: trimmed } });
        // eslint-disable-next-line no-console
        console.log("[VeriAI] request completed", res);
        if (!mountedRef.current || runId !== runIdRef.current) return;
        finish(res, null);
        try {
          saveHistory(trimmed, res);
        } catch {
          /* ignore */
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Live verification failed";
        // eslint-disable-next-line no-console
        console.log("[VeriAI] request failed → fallback", message);
        if (!mountedRef.current || runId !== runIdRef.current) return;
        finish(fallbackVerify(trimmed, "Live verification unavailable —"), message);
      } finally {
        // Loading is always cleared, no matter what happened above.
        cancelRaf();
        clearTimers();
        if (mountedRef.current && runId === runIdRef.current) {
          setState((s) => (s === "verifying" ? "results" : s));
          setProgress(100);
        }
      }
    },
    [cancelRaf, clearTimers, tick, setPhaseAndTarget, verifyFn, finish],
  );

  const reset = useCallback(() => {
    runIdRef.current++;
    cancelRaf();
    clearTimers();
    setState("idle");
    setResult(null);
    setError(null);
    setProgress(0);
    setPhase("extracting");
  }, [cancelRaf, clearTimers]);

  const openResult = useCallback(
    (r: VerificationResult) => {
      runIdRef.current++;
      cancelRaf();
      clearTimers();
      setResult(r);
      setError(null);
      setProgress(100);
      setPhase("done");
      setState("results");
    },
    [cancelRaf, clearTimers],
  );

  const isVerifying = state === "verifying";

  return { state, isVerifying, result, progress, phase, error, run, reset, openResult } as const;
}
