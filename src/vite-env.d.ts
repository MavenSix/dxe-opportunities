/// <reference types="vite/client" />

declare module "@fontsource-variable/inter";
declare module "@fontsource/urbanist/400.css";
declare module "@fontsource/urbanist/500.css";
declare module "@fontsource/urbanist/600.css";
declare module "@fontsource/urbanist/700.css";

interface ImportMetaEnv {
  // Manual (local dev / any host). See .env.example.
  readonly VITE_SUPABASE_URL: string | undefined;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string | undefined;
  /** Legacy JWT anon key. Supabase may disable these; prefer the publishable key. */
  readonly VITE_SUPABASE_ANON_KEY: string | undefined;

  // Written by the Vercel ⇄ Supabase Marketplace integration and re-synced on
  // key rotation. Exposed to the client via `envPrefix` in vite.config.ts.
  readonly NEXT_PUBLIC_OPPORTUNTIES_SUPABASE_URL: string | undefined;
  readonly NEXT_PUBLIC_OPPORTUNTIES_SUPABASE_PUBLISHABLE_KEY: string | undefined;
  readonly NEXT_PUBLIC_OPPORTUNTIES_SUPABASE_ANON_KEY: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
