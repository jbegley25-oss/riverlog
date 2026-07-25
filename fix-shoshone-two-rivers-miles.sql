-- Correct mileage for Shoshone -> Two Rivers Park trips.
-- Most guides logged this reach as 8 miles; the surveyed distance is 10.1 miles.
-- Only touches rows that still hold the old estimate so it's safe to re-run.
-- Run this in the Supabase SQL Editor.

update public.log_entries
set miles = 10.1
where put_in = 'Shoshone'
  and take_out = 'Two Rivers Park'
  and miles = 8;
