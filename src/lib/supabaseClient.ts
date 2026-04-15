import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

/** Which `VITE_*` vars are unset or blank — for troubleshooting (names only, no secrets). */
export function getMissingViteSupabaseEnv(): string[] {
  const missing: string[] = [];
  if (!import.meta.env.VITE_SUPABASE_URL?.trim()) {
    missing.push("VITE_SUPABASE_URL");
  }
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()) {
    missing.push("VITE_SUPABASE_ANON_KEY");
  }
  return missing;
}

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
