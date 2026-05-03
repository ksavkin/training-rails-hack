-- Optional: enable Postgres → client realtime for existing `public.pins`.
-- Skip if the table is already in the publication (Supabase may error on duplicate add).

alter publication supabase_realtime add table public.pins;

-- Ensure anon/authenticated clients used by the dashboard can read rows (adjust to your RLS model).
-- Example if RLS is enabled:
-- create policy "pins_select_anon" on public.pins for select to anon, authenticated using (true);
