import { useCallback, useEffect, useState } from "react";
import { useVerification } from "@/hooks/useVerification";
import { Header } from "./Header";
import { WorkspacePanel } from "./WorkspacePanel";
import { IdleState } from "./IdleState";
import { VerifyingState } from "./VerifyingState";
import { ResultsView } from "./ResultsView";
import { FooterDisclaimer } from "./FooterDisclaimer";

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
          isVerifying={state === "verifying"}
          progress={progress}
        />

        {state === "idle" && <IdleState />}
        {state === "verifying" && <VerifyingState progress={progress} phase={phase} />}
        {state === "results" && result && <ResultsView result={result} error={error} />}

        <FooterDisclaimer />
      </div>
    </div>
  );
}
