-- Run this in your Supabase SQL Editor to add river flow (CFS) tracking
-- to existing log_entries rows without losing data.

alter table public.log_entries
  add column if not exists cfs numeric(8,1);
