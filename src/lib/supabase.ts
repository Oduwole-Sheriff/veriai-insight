// Supabase client for YOUR OWN project.
// Reads only import.meta.env.VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
// No project id, URL, or key is hardcoded; if unconfigured, the app runs without Supabase.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  typeof import.meta.env.VITE_SUPABASE_URL === "string" ? import.meta.env.VITE_SUPABASE_URL.trim() : "";
const SUPABASE_PUBLISHABLE_KEY =
  typeof import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY === "string"
    ? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY.trim()
    : "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

let client: SupabaseClient | null = null;

/** Returns a Supabase client, or null when env vars are not set. Never throws. */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
        persistSession: typeof window !== "undefined",
        autoRefreshToken: typeof window !== "undefined",
      },
    });
  }
  return client;
}
