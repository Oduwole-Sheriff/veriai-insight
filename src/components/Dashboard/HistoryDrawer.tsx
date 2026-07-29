import { useEffect, useMemo, useState } from "react";
import { History, Search, Trash2, X } from "lucide-react";
import {
  clearHistory,
  deleteHistory,
  listHistory,
  searchHistory,
  type HistoryEntry,
} from "@/lib/veriai/history";
import type { VerificationResult } from "@/lib/veriai/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenEntry: (result: VerificationResult) => void;
}

export function HistoryDrawer({ open, onClose, onOpenEntry }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) setEntries(listHistory());
  }, [open]);

  const filtered = useMemo(() => (query ? searchHistory(query) : entries), [entries, query]);

  const remove = (id: string) => {
    deleteHistory(id);
    setEntries(listHistory());
  };
  const clearAll = () => {
    clearHistory();
    setEntries([]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-500" />
            <h2 className="text-sm font-semibold">Verification History</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close history"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="border-b border-border p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search history…"
              className="w-full rounded-lg border border-border bg-background/60 py-2 pl-8 pr-3 text-xs text-foreground outline-none focus:border-indigo-500/50"
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{filtered.length} entries</span>
            {entries.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-rose-500 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <p className="mt-10 text-center text-xs text-muted-foreground">
              {query ? "No matches." : "No verifications saved yet."}
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((e) => (
                <li
                  key={e.id}
                  className="group rounded-xl border border-border bg-background/40 p-3 transition-colors hover:border-indigo-500/40"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onOpenEntry(e.result);
                      onClose();
                    }}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                      <span>{new Date(e.createdAt).toLocaleString()}</span>
                      <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-indigo-500">
                        {e.result.overallConfidence}%
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-foreground/90">
                      {e.input.slice(0, 160)}
                    </p>
                    <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                      {e.result.summary}
                    </p>
                  </button>
                  <div className="mt-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => remove(e.id)}
                      className="inline-flex items-center gap-1 rounded-md p-1 text-[10px] text-muted-foreground hover:bg-accent hover:text-rose-500"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
