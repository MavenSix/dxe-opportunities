-- Single-row JSON workbook for DXE opportunities (last-write-wins).
-- Run in Supabase SQL Editor or via CLI after linking the project.

create table if not exists public.workbook (
  id text primary key default 'dxe-main',
  payload jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.workbook is 'DXE opportunities sheet; one shared row id dxe-main.';

alter table public.workbook enable row level security;

-- v1: open read/write for clients using the anon key. Tighten later (Auth + RLS) if the project is public.
create policy "workbook_select" on public.workbook for select using (true);

create policy "workbook_insert" on public.workbook for insert with check (true);

create policy "workbook_update" on public.workbook for update using (true);
