import { useCallback, useEffect, useRef, useState } from "react";
import { verifyContent } from "@/lib/veriai/engine";
import type { VerificationResult } from "@/lib/veriai/types";

export type VerificationState = "idle" | "verifying" | "results";

const ANIMATION_DURATION_MS = 1600;

export function useVerification() {
  const [state, setState] = useState<VerificationState>("idle");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  const cancel = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => cancel, [cancel]);

  const run = useCallback(
    (text: string) => {
      if (!text.trim() || state === "verifying") return;
      cancel();
      setState("verifying");
      setResult(null);
      setProgress(0);

      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / ANIMATION_DURATION_MS);
        setProgress(Math.round(t * 100));
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
          setResult(verifyContent(text));
          setState("results");
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [state, cancel],
  );

  const reset = useCallback(() => {
    cancel();
    setState("idle");
    setResult(null);
    setProgress(0);
  }, [cancel]);

  return { state, result, progress, run, reset } as const;
}
