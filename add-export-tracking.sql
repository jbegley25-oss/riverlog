-- Tracks when each trip was last included in an admin PDF export, so the
-- admin export tools can generate a sheet containing only newly logged trips.

alter table public.log_entries add column if not exists exported_at timestamptz;

-- Admins need to be able to stamp exported_at on entries that belong to
-- other users (the existing owner-only update policy doesn't cover this).
drop policy if exists "Admins can update all entries" on public.log_entries;
create policy "Admins can update all entries" on public.log_entries
  for update using (
    (select is_admin from public.profiles where id = auth.uid()) = true
  );
