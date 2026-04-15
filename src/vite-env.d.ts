/// <reference types="vite/client" />

declare module "@fontsource-variable/inter";
declare module "@fontsource/urbanist/400.css";
declare module "@fontsource/urbanist/500.css";
declare module "@fontsource/urbanist/600.css";
declare module "@fontsource/urbanist/700.css";

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string | undefined;
  readonly VITE_SUPABASE_ANON_KEY: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
