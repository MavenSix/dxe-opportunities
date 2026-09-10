import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  getMissingSupabaseEnv,
  resolveSupabaseConfig,
  type SupabaseConfig,
} from "@/lib/supabaseEnv";

export {
  classifySupabaseKey,
  describeSupabaseError,
  resolveSupabaseConfig,
} from "@/lib/supabaseEnv";
export type { SupabaseConfig, SupabaseKeyKind } from "@/lib/supabaseEnv";

let cachedConfig: SupabaseConfig | null | undefined;
let cachedClient: SupabaseClient | null | undefined;

/**
 * Resolved connection settings (URL + which variable supplied the key and
 * what kind of key it is). Never expose `key` in the UI.
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  if (cachedConfig === undefined) {
    cachedConfig = resolveSupabaseConfig(import.meta.env);
    if (cachedConfig) {
      for (const w of cachedConfig.warnings) {
        console.warn(`[supabase] ${w}`);
      }
    }
  }
  return cachedConfig;
}

/** Which variables are still needed to enable cloud sync (names only). */
export function getMissingViteSupabaseEnv(): string[] {
  return getMissingSupabaseEnv(import.meta.env);
}

/** Returns null when nothing usable is configured (browser-only mode). */
export function getSupabase(): SupabaseClient | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }
  const cfg = getSupabaseConfig();
  if (!cfg) {
    cachedClient = null;
    return null;
  }
  cachedClient = createClient(cfg.url, cfg.key, {
    auth: {
      // This app has no user sign-in; skip the session bookkeeping.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return cachedClient;
}
