// Client-side runtime configuration. Everything is environment driven —
// no project IDs, hosts, or API endpoints are hardcoded anywhere.

const OFFLINE_MODE_KEY = "veriai.offlineMode";

function envString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Optional external verification endpoint (e.g. your own Supabase Edge Function):
 *   VITE_VERIFY_ENDPOINT=https://<your-project>.supabase.co/functions/v1/verify
 * When unset, the app calls its own same-origin server function (relative path),
 * so the frontend never targets a hardcoded external host.
 */
export function getVerifyEndpoint(): string | null {
  return envString(import.meta.env.VITE_VERIFY_ENDPOINT);
}

/** Offline heuristic mode is opt-in only. */
export function isOfflineModeEnabled(): boolean {
  if (envString(import.meta.env.VITE_ENABLE_OFFLINE_MODE) === "true") return true;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(OFFLINE_MODE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setOfflineModeEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OFFLINE_MODE_KEY, enabled ? "true" : "false");
  } catch {
    /* ignore */
  }
}
