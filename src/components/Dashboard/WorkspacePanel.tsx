import { Loader2, ScanLine, Sparkles } from "lucide-react";
import { SamplesDropdown } from "./SamplesDropdown";

interface WorkspacePanelProps {
  text: string;
  onTextChange: (text: string) => void;
  onVerify: () => void;
  onLoadSample: (content: string) => void;
  isVerifying: boolean;
  progress: number;
}

export function WorkspacePanel({
  text,
  onTextChange,
  onVerify,
  onLoadSample,
  isVerifying,
  progress,
}: WorkspacePanelProps) {
  const canVerify = text.trim().length > 0 && !isVerifying;

  return (
    <section className="mt-8">
      <div className="rounded-2xl border border-border bg-card/70 p-5 shadow-xl shadow-black/5 backdrop-blur-xl transition-all sm:p-6 lg:p-8">
        <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
          <span>Verification Workspace</span>
        </div>

        <label htmlFor="veriai-input" className="sr-only">
          AI-generated answer
        </label>
        <textarea
          id="veriai-input"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          disabled={isVerifying}
          placeholder="Paste the AI-generated answer or response here to cross-verify..."
          className="min-h-[180px] w-full resize-y rounded-xl border border-border bg-background/60 px-4 py-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70 transition-all focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-60"
        />

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:gap-3">
            <span className="tabular-nums">{text.trim().length} chars</span>
            <span className="hidden h-1 w-1 rounded-full bg-muted-foreground/40 sm:inline-block" />
            <span>Frontend prototype • mock heuristics</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SamplesDropdown onSelect={onLoadSample} />
            <button
              type="button"
              onClick={onVerify}
              disabled={!canVerify}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isVerifying ? (
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

        {isVerifying && (
          <div
            className="mt-5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-1 bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-500 transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
