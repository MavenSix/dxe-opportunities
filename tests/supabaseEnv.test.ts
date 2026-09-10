import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveSupabaseConfig,
  classifySupabaseKey,
  describeSupabaseError,
  getMissingSupabaseEnv,
} from "../src/lib/supabaseEnv.ts";

const b64url = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (role: string) => `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${b64url({ iss: "supabase", ref: "abc", role })}.sig`;
const ANON_JWT = jwt("anon");
const SERVICE_JWT = jwt("service_role");
const PUB_GOOD = "sb_publishable_GOODGOODGOODGOODGOODGOOD_abc";
const PUB_STALE = "sb_publishable_STALESTALESTALESTALE_xyz";
const URL = "https://abcdefghijklmnop.supabase.co";

test("integration publishable key beats a stale manual VITE_SUPABASE_ANON_KEY (the production bug)", () => {
  const cfg = resolveSupabaseConfig({
    VITE_SUPABASE_URL: URL,
    VITE_SUPABASE_ANON_KEY: PUB_STALE,
    NEXT_PUBLIC_OPPORTUNTIES_SUPABASE_URL: URL,
    NEXT_PUBLIC_OPPORTUNTIES_SUPABASE_PUBLISHABLE_KEY: PUB_GOOD,
    NEXT_PUBLIC_OPPORTUNTIES_SUPABASE_ANON_KEY: PUB_GOOD,
  });
  assert.ok(cfg);
  assert.equal(cfg.key, PUB_GOOD);
  assert.equal(cfg.keyVar, "NEXT_PUBLIC_OPPORTUNTIES_SUPABASE_PUBLISHABLE_KEY");
  assert.equal(cfg.urlVar, "NEXT_PUBLIC_OPPORTUNTIES_SUPABASE_URL");
  assert.equal(cfg.keyKind, "publishable");
  assert.deepEqual(cfg.warnings, []);
});

test("any publishable key beats any legacy JWT, regardless of variable order", () => {
  const cfg = resolveSupabaseConfig({
    VITE_SUPABASE_URL: URL,
    NEXT_PUBLIC_OPPORTUNTIES_SUPABASE_PUBLISHABLE_KEY: ANON_JWT, // integration still on legacy
    VITE_SUPABASE_ANON_KEY: PUB_GOOD, // but a publishable key was set manually
  });
  assert.ok(cfg);
  assert.equal(cfg.key, PUB_GOOD);
  assert.equal(cfg.keyVar, "VITE_SUPABASE_ANON_KEY");
});

test("legacy-only setup still works but carries a warning", () => {
  const cfg = resolveSupabaseConfig({ VITE_SUPABASE_URL: URL, VITE_SUPABASE_ANON_KEY: ANON_JWT });
  assert.ok(cfg);
  assert.equal(cfg.keyKind, "legacy-jwt");
  assert.match(cfg.warnings.join("\n"), /legacy JWT/);
});

test("service-role / secret keys are never used in the browser", () => {
  assert.equal(resolveSupabaseConfig({ VITE_SUPABASE_URL: URL, VITE_SUPABASE_ANON_KEY: SERVICE_JWT }), null);
  assert.equal(resolveSupabaseConfig({ VITE_SUPABASE_URL: URL, VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_abc" }), null);
  const cfg = resolveSupabaseConfig({ VITE_SUPABASE_URL: URL, VITE_SUPABASE_ANON_KEY: SERVICE_JWT, VITE_SUPABASE_PUBLISHABLE_KEY: PUB_GOOD });
  assert.ok(cfg);
  assert.equal(cfg.key, PUB_GOOD);
  assert.match(cfg.warnings.join("\n"), /secret key; ignored/);
});

test("quotes, whitespace and trailing slashes are tolerated", () => {
  const cfg = resolveSupabaseConfig({ VITE_SUPABASE_URL: ` "${URL}/" `, VITE_SUPABASE_PUBLISHABLE_KEY: `'${PUB_GOOD}'` });
  assert.ok(cfg);
  assert.equal(cfg.url, URL);
  assert.equal(cfg.key, PUB_GOOD);
});

test("missing config → null, and the missing list names the simple vars", () => {
  assert.equal(resolveSupabaseConfig({}), null);
  assert.equal(resolveSupabaseConfig({ VITE_SUPABASE_URL: URL }), null);
  assert.equal(resolveSupabaseConfig({ VITE_SUPABASE_PUBLISHABLE_KEY: PUB_GOOD }), null);
  assert.deepEqual(getMissingSupabaseEnv({}), ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"]);
  assert.deepEqual(getMissingSupabaseEnv({ VITE_SUPABASE_URL: URL }), ["VITE_SUPABASE_PUBLISHABLE_KEY"]);
  assert.deepEqual(getMissingSupabaseEnv({ NEXT_PUBLIC_OPPORTUNTIES_SUPABASE_URL: URL, NEXT_PUBLIC_OPPORTUNTIES_SUPABASE_PUBLISHABLE_KEY: PUB_GOOD }), []);
});

test("classifySupabaseKey", () => {
  assert.equal(classifySupabaseKey(PUB_GOOD), "publishable");
  assert.equal(classifySupabaseKey(ANON_JWT), "legacy-jwt");
  assert.equal(classifySupabaseKey(SERVICE_JWT), "secret");
  assert.equal(classifySupabaseKey("sb_secret_x"), "secret");
  assert.equal(classifySupabaseKey(""), "unknown");
  assert.equal(classifySupabaseKey(undefined), "unknown");
});

test("describeSupabaseError maps the two real production messages to actionable text", () => {
  assert.match(describeSupabaseError("Unregistered API key"), /isn't registered.*Redeploy/);
  assert.match(describeSupabaseError("Legacy API keys are disabled"), /disabled.*publishable key/);
  assert.match(describeSupabaseError("TypeError: Failed to fetch"), /Can't reach Supabase/);
  assert.match(describeSupabaseError("Could not find the table 'public.workbook' in the schema cache"), /doesn't exist/);
  assert.equal(describeSupabaseError("something else"), "something else");
  assert.equal(describeSupabaseError(undefined), "Unknown error");
});
