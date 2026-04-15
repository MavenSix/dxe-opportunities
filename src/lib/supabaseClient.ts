import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

/** Returns null when env vars are missing (local dev without cloud). */
export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) {
    return cached;
  }
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    cached = null;
    return null;
  }
  cached = createClient(url, key);
  return cached;
}
