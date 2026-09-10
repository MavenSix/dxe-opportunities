/**
 * Pure helpers for resolving Supabase connection settings from environment
 * variables. No imports, no `import.meta` — so this file can be unit-tested
 * with plain Node and reused by both the browser client and diagnostics UI.
 *
 * Two families of variables are supported:
 *
 *  1. Vercel Marketplace (Supabase integration). Vercel writes these
 *     automatically and re-syncs them whenever Supabase rotates keys:
 *       NEXT_PUBLIC_OPPORTUNTIES_SUPABASE_URL
 *       NEXT_PUBLIC_OPPORTUNTIES_SUPABASE_PUBLISHABLE_KEY
 *       NEXT_PUBLIC_OPPORTUNTIES_SUPABASE_ANON_KEY
 *     (The "OPPORTUNTIES" spelling is the integration's prefix — keep it.)
 *
 *  2. Manual Vite variables, for local dev or non-Vercel hosts:
 *       VITE_SUPABASE_URL
 *       VITE_SUPABASE_PUBLISHABLE_KEY   (preferred, sb_publishable_…)
 *       VITE_SUPABASE_ANON_KEY          (legacy JWT; Supabase may disable it)
 *
 * Integration vars win because they are kept current by Supabase. Among
 * keys, any `sb_publishable_…` value wins over any legacy JWT, because
 * Supabase projects can (and this one did) disable legacy keys.
 */

export type SupabaseKeyKind =
  | "publishable"
  | "legacy-jwt"
  | "secret"
  | "unknown";

export type SupabaseEnvSource = Partial<
  Record<(typeof URL_VARS)[number] | (typeof KEY_VARS)[number], string | undefined>
>;

export type SupabaseConfig = {
  url: string;
  key: string;
  /** Which variable supplied the URL (for diagnostics). */
  urlVar: string;
  /** Which variable supplied the key (for diagnostics; never the value). */
  keyVar: string;
  keyKind: SupabaseKeyKind;
  /** Non-fatal notes worth surfacing in dev tools. */
  warnings: string[];
};

export const URL_VARS = [
  "NEXT_PUBLIC_OPPORTUNTIES_SUPABASE_URL",
  "VITE_SUPABASE_URL",
] as const;

/** Ordered by preference within the same key kind. */
export const KEY_VARS = [
  "NEXT_PUBLIC_OPPORTUNTIES_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_OPPORTUNTIES_SUPABASE_ANON_KEY",
  "VITE_SUPABASE_ANON_KEY",
] as const;

function clean(v: string | undefined): string {
  return (v ?? "").trim().replace(/^["']|["']$/g, "");
}

function decodeJwtRole(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    // `atob` exists in browsers and in Node ≥ 16, so no Buffer needed.
    if (typeof atob !== "function") return null;
    const json = atob(b64 + pad);
    const payload = JSON.parse(json) as { role?: unknown };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export function classifySupabaseKey(raw: string | undefined): SupabaseKeyKind {
  const key = clean(raw);
  if (!key) return "unknown";
  if (key.startsWith("sb_publishable_")) return "publishable";
  if (key.startsWith("sb_secret_")) return "secret";
  if (key.startsWith("eyJ")) {
    const role = decodeJwtRole(key);
    if (role === "service_role") return "secret";
    return "legacy-jwt";
  }
  return "unknown";
}

/**
 * Pick the best URL + key from the given env. Returns null when nothing
 * usable is configured (the app then runs in browser-only mode).
 */
export function resolveSupabaseConfig(
  env: SupabaseEnvSource,
): SupabaseConfig | null {
  const warnings: string[] = [];

  let url = "";
  let urlVar = "";
  for (const name of URL_VARS) {
    const v = clean(env[name]);
    if (v) {
      url = v;
      urlVar = name;
      break;
    }
  }

  // Secret / service-role keys are never used in the browser — flag every
  // one we see so a misconfiguration is visible even when another key wins.
  const kinds = new Map<string, SupabaseKeyKind>();
  for (const name of KEY_VARS) {
    const v = clean(env[name]);
    if (!v) continue;
    const kind = classifySupabaseKey(v);
    kinds.set(name, kind);
    if (kind === "secret") warnings.push(`${name} holds a secret key; ignored`);
  }

  // Pass 1: any publishable key, in preference order.
  // Pass 2: any legacy JWT anon key, in preference order.
  let key = "";
  let keyVar = "";
  let keyKind: SupabaseKeyKind = "unknown";
  for (const wanted of ["publishable", "legacy-jwt"] as const) {
    for (const name of KEY_VARS) {
      const v = clean(env[name]);
      if (!v) continue;
      const kind = kinds.get(name);
      if (kind === wanted) {
        key = v;
        keyVar = name;
        keyKind = kind;
        break;
      }
    }
    if (key) break;
  }

  if (!url || !key) return null;

  if (keyKind === "legacy-jwt") {
    warnings.push(
      `${keyVar} is a legacy JWT anon key. Supabase can disable these; switch to the sb_publishable_ key.`,
    );
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i.test(url) && !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(url)) {
    warnings.push(`${urlVar} does not look like a Supabase project URL`);
  }

  return { url: url.replace(/\/+$/, ""), key, urlVar, keyVar, keyKind, warnings };
}

/** Names of the simplest variables still needed to enable cloud sync. */
export function getMissingSupabaseEnv(env: SupabaseEnvSource): string[] {
  const missing: string[] = [];
  if (!URL_VARS.some((n) => clean(env[n]))) missing.push("VITE_SUPABASE_URL");
  const hasUsableKey = KEY_VARS.some((n) => {
    const kind = classifySupabaseKey(env[n]);
    return kind === "publishable" || kind === "legacy-jwt";
  });
  if (!hasUsableKey) missing.push("VITE_SUPABASE_PUBLISHABLE_KEY");
  return missing;
}

/**
 * Turn a raw Supabase/PostgREST/network error message into something a
 * teammate can act on. Falls back to the original message.
 */
export function describeSupabaseError(message: string | undefined | null): string {
  const m = (message ?? "").trim();
  if (!m) return "Unknown error";
  if (/legacy api keys? (are|is) disabled/i.test(m)) {
    return "Supabase disabled this project's legacy anon key. Deploy with the publishable key (sb_publishable_…) from Supabase → Project Settings → API Keys.";
  }
  if (/unregistered api key/i.test(m)) {
    return "This build was deployed with a Supabase key that isn't registered to the project. Redeploy with the current publishable key from Supabase → Project Settings → API Keys.";
  }
  if (/invalid api key/i.test(m)) {
    return "Supabase rejected the API key. Check VITE_SUPABASE_PUBLISHABLE_KEY (or the Vercel integration variables) and redeploy.";
  }
  if (/jwt expired|invalid jwt|jws/i.test(m)) {
    return "Supabase rejected the key as an expired or malformed token. Use the current publishable key and redeploy.";
  }
  if (/failed to fetch|networkerror|load failed|network request failed|fetch failed/i.test(m)) {
    return "Can't reach Supabase — check your connection and try again.";
  }
  if (/could not find the table|relation .* does not exist|schema cache/i.test(m)) {
    return "The workbook table doesn't exist in this Supabase project yet. Run the SQL in supabase/migrations.";
  }
  if (/row-level security|permission denied|violates row-level/i.test(m)) {
    return "Supabase blocked the write (row-level security). Check the workbook policies in supabase/migrations.";
  }
  return m;
}
