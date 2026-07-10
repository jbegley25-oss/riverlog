-- Import river-log entries for ciela.heiles@icloud.com
-- Run once in the Supabase SQL Editor (uses auth.users, so run as the project owner).
--
-- Source: user-provided "River log.pdf". Mapping decisions:
--   * Trip type from the "Company" column: "Sage" -> role 'guide',
--     company 'Sage Outdoor Adventures', ROL '653'; "Private" -> role 'private',
--     company 'PRIVATE', ROL ''.
--   * Paddle type: "Paddle" -> 'paddle'; "Oars" -> 'oar';
--     "Ducky" -> 'paddle' (inflatable kayak, paddle-propelled) — noted in notes.
--   * Put-in/take-out normalized to match existing data conventions:
--     "Two rivers" -> "Two Rivers Park", "Grizzly" -> "Grizzly Creek" — VERIFY.
--   * CFS column was blank for every row -> cfs left null.
--   * River "Colorado" -> "Colorado River", "Eagle" -> "Eagle River".
--   * 7/3/26 has three identical Upper-C oar trips; all three are kept as
--     separate logged runs.
--
-- The NOT EXISTS guard makes this safe to re-run: it skips a row if an entry with
-- the same date + river + put-in + take-out + role + miles + hours already exists.

insert into public.log_entries
  (user_id, date, river, put_in, take_out, boat_type, role, hours, miles, company_name, rol_license, notes, cfs)
select u.id, t.date::date, t.river, t.put_in, t.take_out, t.boat_type, t.role,
       t.hours::numeric, t.miles::numeric, t.company_name, t.rol_license, t.notes, null::numeric
from (select id from auth.users where email = 'ciela.heiles@icloud.com') u
cross join (values
  -- ===== Commercial (Sage Outdoor Adventures) =====
  ('2026-05-29','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653','Ride-along'),
  ('2026-06-01','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653','Turkey boat'),
  ('2026-06-02','Colorado River','Lyons Gulch','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Ride-along'),
  ('2026-06-03','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653','Turkey boat'),
  ('2026-06-04','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653','Turkey boat'),
  ('2026-06-07','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653','Failed check out'),
  ('2026-06-08','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653','Ride-along with Griffin'),
  ('2026-06-24','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653','Failed check out'),
  ('2026-06-28','Colorado River','Lyons Gulch','Dotsero','oar','guide',2,6,'Sage Outdoor Adventures','653','Upper c check out'),
  ('2026-06-28','Colorado River','Lyons Gulch','Dotsero','oar','guide',2,6,'Sage Outdoor Adventures','653','Upper c trip'),
  ('2026-07-03','Colorado River','Lyons Gulch','Dotsero','oar','guide',2,6,'Sage Outdoor Adventures','653','Upper c trip'),
  ('2026-07-03','Colorado River','Lyons Gulch','Dotsero','oar','guide',2,6,'Sage Outdoor Adventures','653','Upper c trip'),
  ('2026-07-03','Colorado River','Lyons Gulch','Dotsero','oar','guide',2,6,'Sage Outdoor Adventures','653','Upper c trip'),
  ('2026-07-05','Colorado River','Lyons Gulch','Dotsero','oar','guide',2,6,'Sage Outdoor Adventures','653','Upper c trip'),
  ('2026-07-06','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653','Failed check out #3'),
  ('2026-07-07','Colorado River','Lyons Gulch','Dotsero','oar','guide',2,6,'Sage Outdoor Adventures','653','Upper c trip'),
  ('2026-07-08','Colorado River','Lyons Gulch','Dotsero','oar','guide',2,6,'Sage Outdoor Adventures','653','Upper c trip'),

  -- ===== Private =====
  ('2026-06-03','Colorado River','Shoshone','Grizzly Creek','paddle','private',2,4,'PRIVATE','','Private R2, 2 laps of rapids'),
  ('2026-06-04','Eagle River','Dowe Junction','Dow Junction','paddle','private',2,6,'PRIVATE','','The chute'),
  ('2026-06-05','Eagle River','HPI','Fairgrounds','paddle','private',2,8,'PRIVATE','','Duckies (inflatable kayak)'),
  ('2026-06-07','Eagle River','Bob''s Bridge','Eagle sanitation plant','paddle','private',2,8,'PRIVATE','','Duckies (inflatable kayak)'),
  ('2026-06-22','Colorado River','Shoshone','Grizzly Creek','paddle','private',2,4,'PRIVATE','','2 laps rapids'),
  ('2026-06-23','Colorado River','Shoshone','Grizzly Creek','paddle','private',2,4,'PRIVATE','','2 laps rapids'),
  ('2026-06-29','Colorado River','Shoshone','Grizzly Creek','paddle','private',2,4,'PRIVATE','','Shoshone laps'),
  ('2026-06-30','Colorado River','Shoshone','Grizzly Creek','paddle','private',2,4,'PRIVATE','','Shoshone laps'),
  ('2026-07-06','Colorado River','Shoshone','Grizzly Creek','paddle','private',1,4,'PRIVATE','','Shoshone laps')
) as t(date, river, put_in, take_out, boat_type, role, hours, miles, company_name, rol_license, notes)
where not exists (
  select 1 from public.log_entries le
  where le.user_id = u.id
    and le.date    = t.date::date
    and le.river   = t.river
    and le.put_in  = t.put_in
    and le.take_out = t.take_out
    and le.role    = t.role
    and le.miles   = t.miles::numeric
    and le.hours   = t.hours::numeric
);

-- Verify:
--   select date, river, put_in, take_out, role, miles, hours, notes
--   from public.log_entries
--   where user_id = (select id from auth.users where email = 'ciela.heiles@icloud.com')
--   order by date;
