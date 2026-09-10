-- Broadcast row changes on public.workbook so every open tab picks up a
-- teammate's edits live instead of silently overwriting them on next save.
-- Safe to re-run: skips if the table is already in the publication.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'workbook'
  ) then
    alter publication supabase_realtime add table public.workbook;
  end if;
end $$;
