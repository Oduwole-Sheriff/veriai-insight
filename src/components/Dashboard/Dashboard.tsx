import { useCallback, useEffect, useState } from "react";
import { useVerification } from "@/hooks/useVerification";
import { Header } from "./Header";
import { WorkspacePanel } from "./WorkspacePanel";
import { IdleState } from "./IdleState";
import { VerifyingState } from "./VerifyingState";
import { ResultsView } from "./ResultsView";
import { FooterDisclaimer } from "./FooterDisclaimer";
import { AlertTriangle } from "lucide-react";

export function Dashboard() {
  const [text, setText] = useState("");
  const { state, isVerifying, result, progress, phase, error, run, reset, openResult } =
    useVerification();

  const handleVerify = useCallback(() => run(text), [run, text]);
  const handleLoadSample = useCallback(
    (content: string) => {
      setText(content);
      reset();
    },
    [reset],
  );

  const showResults = state === "results" && !!result;
  useEffect(() => {
    if (showResults) console.log("[VeriAI] ResultsView rendered");
  }, [showResults]);


  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-background to-background">
      <div className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-30">
        <div className="absolute -top-40 left-1/2 h-[480px] w-[680px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute top-1/3 right-0 h-[320px] w-[420px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <Header onOpenEntry={openResult} />

        <WorkspacePanel
          text={text}
          onTextChange={setText}
          onVerify={handleVerify}
          onLoadSample={handleLoadSample}
          isVerifying={isVerifying}
          progress={progress}
        />

        {state === "error" && (
          <div className="mt-8 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Verification could not run</p>
              <p className="mt-1 text-xs opacity-90">{error}</p>
              <p className="mt-1 text-xs opacity-75">
                Configure a search provider and an AI provider in your environment variables, or
                enable offline mode explicitly (VITE_ENABLE_OFFLINE_MODE=true).
              </p>
            </div>
          </div>
        )}

        {state === "idle" && <IdleState />}
        {isVerifying && !showResults && <VerifyingState progress={progress} phase={phase} />}
        {showResults && <ResultsView result={result} error={error} />}

        <FooterDisclaimer />
      </div>
    </div>
  );
}
