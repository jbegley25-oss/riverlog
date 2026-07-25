-- Store where the trip actually started and ended, plus how the mileage was
-- arrived at. The coordinates let a saved trip be re-drawn on the map and
-- re-measured later without the guide re-typing the access point names.
-- Run this in the Supabase SQL Editor.

alter table public.log_entries
  add column if not exists put_in_lat double precision,
  add column if not exists put_in_lng double precision,
  add column if not exists take_out_lat double precision,
  add column if not exists take_out_lng double precision,
  add column if not exists miles_source text;

alter table public.log_entries
  drop constraint if exists log_entries_miles_source_check;

alter table public.log_entries
  add constraint log_entries_miles_source_check
  check (miles_source is null or miles_source in ('nhd', 'manual'));

-- Colorado only: 37-41N, 102.03-109.03W, with a tenth of a degree of slack for
-- access points that sit right on a state line.
alter table public.log_entries
  drop constraint if exists log_entries_coords_in_colorado_check;

alter table public.log_entries
  add constraint log_entries_coords_in_colorado_check check (
    (put_in_lat is null or (put_in_lat between 36.9 and 41.1 and put_in_lng between -109.16 and -101.94))
    and
    (take_out_lat is null or (take_out_lat between 36.9 and 41.1 and take_out_lng between -109.16 and -101.94))
  );
