import type { VerificationResult } from "./types";

const KEY = "veriai:history:v1";
const MAX_ENTRIES = 50;

export interface HistoryEntry {
  id: string;
  createdAt: string;
  input: string;
  result: VerificationResult;
}

function safeRead(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(entries: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // storage full — drop oldest and retry once
    try {
      window.localStorage.setItem(KEY, JSON.stringify(entries.slice(0, 20)));
    } catch {
      /* noop */
    }
  }
}

export function listHistory(): HistoryEntry[] {
  return safeRead().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveHistory(input: string, result: VerificationResult): HistoryEntry {
  const entry: HistoryEntry = {
    id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    input,
    result,
  };
  const next = [entry, ...safeRead()];
  safeWrite(next);
  return entry;
}

export function deleteHistory(id: string) {
  safeWrite(safeRead().filter((e) => e.id !== id));
}

export function clearHistory() {
  safeWrite([]);
}

export function searchHistory(query: string): HistoryEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return listHistory();
  return listHistory().filter(
    (e) =>
      e.input.toLowerCase().includes(q) ||
      e.result.summary.toLowerCase().includes(q) ||
      e.result.claims.some((c) => c.text.toLowerCase().includes(q)),
  );
}
