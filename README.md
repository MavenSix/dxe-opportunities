# DXE Opportunities sheet

Single-page team workbook for XCentium's DXE practice: every opportunity
(pipeline, client growth, prospects, projects) on one page with filters,
overview charts, inline editing, and a pinned save-status bar.

- **Stack:** Vite 8 · React 19 · TypeScript · Tailwind 4 · shadcn/ui · Recharts · Motion
- **Data:** one shared JSON row in Supabase (`public.workbook`, id `dxe-main`), mirrored
  to `localStorage`. Realtime keeps every open tab in sync.
- **Hosting:** Vercel (static build, SPA rewrite). Netlify config is included too.

## Run locally

```bash
npm install
vercel env pull .env.local   # pulls the Supabase variables from the Vercel project
npm run dev
```

Without `.env.local` the app still runs, in **browser-only** mode (data lives in
this browser's `localStorage`). See [`.env.example`](.env.example) for the manual
variable names if you are not using Vercel.

```bash
npm run build     # tsc -b && vite build → dist/
npm run preview   # serve dist/ locally
npm run lint
```

## How Supabase is configured

The app looks for connection settings in this order (see
[`src/lib/supabaseEnv.ts`](src/lib/supabaseEnv.ts)):

| Priority | Variable | Written by |
| --- | --- | --- |
| 1 | `NEXT_PUBLIC_OPPORTUNTIES_SUPABASE_URL` / `…_PUBLISHABLE_KEY` | Vercel ⇄ Supabase Marketplace integration (auto re-synced on key rotation) |
| 2 | `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | you, by hand |
| 3 | `VITE_SUPABASE_ANON_KEY` (legacy JWT) | you, by hand — deprecated |

Rules baked into the resolver:

- A `sb_publishable_…` key always beats a legacy `eyJ…` JWT, wherever it lives.
- `sb_secret_…` and `service_role` keys are ignored (and logged) — never ship them to a browser.
- Only the `VITE_` and `NEXT_PUBLIC_OPPORTUNTIES_SUPABASE_` prefixes are exposed to
  the client (`vite.config.ts` → `envPrefix`). The `OPPORTUNTIES_POSTGRES_*` and
  secret variables the integration also writes are **not** bundled.

### Database

Run the files in [`supabase/migrations`](supabase/migrations) in order (SQL editor or CLI):

1. `20250409120000_workbook.sql` — table + open RLS policies (anon read/write).
2. `20260910120000_workbook_realtime.sql` — adds the table to the `supabase_realtime`
   publication so edits broadcast to other tabs.

> RLS is intentionally open because the app has no sign-in. If the URL ever becomes
> public, add Supabase Auth and tighten the policies.

## Deploy

**Vercel (CLI, no Git connection needed):**

```bash
vercel deploy --prod
```

**Vercel (Git):** connect the `MavenSix/dxe-opportunities` repo in Project → Settings →
Git; every push to `main` deploys. Environment variables come from the Supabase
integration; there is nothing to add manually.

## Troubleshooting

| Symptom (status bar) | Cause | Fix |
| --- | --- | --- |
| *This build was deployed with a Supabase key that isn't registered…* (`Unregistered API key`) | The key baked into the bundle was rotated or belongs to another project | Redeploy. The integration variables are current; delete any stale hand-set `VITE_SUPABASE_ANON_KEY` in Vercel. |
| *Supabase disabled this project's legacy anon key…* (`Legacy API keys are disabled`) | Supabase turned off JWT keys (happened 2026-09-03) | Use the `sb_publishable_…` key. |
| *Cloud sync off* in the header | No variables found at build time | `vercel env pull .env.local` (local) or check Vercel → Settings → Environment Variables. |
| *Cloud unavailable — showing this device's copy* | Load failed (key, network, missing table) | Fix the cause, then click **Reconnect** — it reloads from the cloud instead of pushing the local copy. |

Open the browser console: the app logs `[supabase] …` warnings when it detects a
legacy key, a secret key in a public variable, or an odd project URL.

## Sync semantics

- Saves are debounced 500 ms and write the whole workbook (last-write-wins).
- Realtime `UPDATE` events replace the rows in every other open tab, so a stale tab
  no longer overwrites a teammate's edits on its next save.
- If this tab has an unsaved edit when a remote update arrives, the local edit wins
  (it lands within 500 ms anyway).
- While the cloud is unreachable the app never writes; edits stay in `localStorage`
  until **Reconnect** succeeds.
