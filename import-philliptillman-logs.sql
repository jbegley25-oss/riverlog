-- Import river-log entries for philliptillman05@gmail.com
-- Run once in the Supabase SQL Editor (uses auth.users, so run as the project owner).
--
-- Source: user-provided Google Sheet. Mapping decisions:
--   * Trip type determined by the sheet's "Company" column ("Private" -> role 'private';
--     "sage"/"Sage Adv." -> role 'guide', company 'Sage Outdoor Adventures', ROL '653').
--     Note: several commercial rows had their miles/hours typed under the sheet's
--     "Private Miles"/"Priv. Hours" columns instead of "Comerc." — company field was used
--     as the source of truth, not column position.
--   * Boat type: "Mix. Paddle boat and oar boat" / "paddle/oar" -> 'combined';
--     "paddle"/"padddle" -> 'paddle'; "Oar Rig" -> 'oar'.
--   * "Flow" column -> cfs (numeric part only).
--   * Bare "shoshone" section (no explicit take-out) assumed "Shoshone -> Two Rivers Park"
--     to match the many other rows that spell this out explicitly — VERIFY.
--   * 6/4/2026 row had a BLANK company in the source sheet — assumed commercial/Sage
--     since it sits between two other Sage rows and notes mention working with another
--     rafting company (GAC) — VERIFY.
--   * 7/8/2026 has two rows same day. The second listed both "8" commercial miles (with
--     no matching hours) AND "4mi/2hr" under the private-style columns. Company = sage on
--     both, so both are treated as commercial Shoshone runs; the stray unmatched "8" with
--     no hours was dropped as a likely duplicate/entry error — VERIFY.
--
-- The NOT EXISTS guard makes this safe to re-run: it skips a row if an entry with the
-- same date + river + put-in + role + miles + hours already exists for this user.

insert into public.log_entries
  (user_id, date, river, put_in, take_out, boat_type, role, hours, miles, company_name, rol_license, notes, cfs)
select u.id, t.date::date, t.river, t.put_in, t.take_out, t.boat_type, t.role,
       t.hours::numeric, t.miles::numeric, t.company_name, t.rol_license, t.notes, t.cfs::numeric
from (select id from auth.users where email = 'philliptillman05@gmail.com') u
cross join (values
  -- ===== Private =====
  ('2026-03-16','San Juan River','Mexican Hat','Clay Hills','combined','private',35,57,'PRIVATE','',null,600),
  ('2026-04-22','Middle Fork of the Salmon','ask a guide','ask a guide','combined','private',25,100,'PRIVATE','',null,1200),

  -- ===== Commercial (Sage Outdoor Adventures) =====
  ('2026-06-01','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653','Turkey',null),
  ('2026-06-02','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653','Ride along. Wes TL',null),
  ('2026-06-03','Colorado River','Lyons Gulch','Dotsero','oar','guide',4,8,'Sage Outdoor Adventures','653','One ride along, one turkey on oars. Caleb TL',750),
  ('2026-06-04','Colorado River','Shoshone','Grizzly Creek','paddle','guide',4,4,'Sage Outdoor Adventures','653','Spent time making a Z-Drag to help another company (GAC). Company not listed in source sheet — assumed Sage.',1220),
  ('2026-06-11','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653',null,1200),
  ('2026-06-16','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653',null,1270),
  ('2026-06-17','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653',null,1200),
  ('2026-06-18','Colorado River','Shoshone','Two Rivers Park','paddle','guide',4,16,'Sage Outdoor Adventures','653','x2 runs',1170),
  ('2026-06-20','Colorado River','Lyons Gulch','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653',null,800),
  ('2026-06-23','Colorado River','Lyons Gulch','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653',null,800),
  ('2026-06-23','Colorado River','Shoshone','Two Rivers Park','paddle','guide',3,4,'Sage Outdoor Adventures','653','Swam Baptism',1200),
  ('2026-06-24','Colorado River','Shoshone','Two Rivers Park','paddle','guide',5,8,'Sage Outdoor Adventures','653','Swam Maneater',1200),
  ('2026-06-27','Colorado River','Lyons Gulch','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Windy as hell',970),
  ('2026-06-30','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653','Good crew, 4 families from AR, RI, TX, SC',1100),
  ('2026-07-03','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653','11 boats on water, great family from RI',1370),
  ('2026-07-03','Colorado River','Lyons Gulch','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Family of 3 from NC',1070),
  ('2026-07-04','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653','Wind was like nothing, 2 husbands!!',1270),
  ('2026-07-06','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653',null,1300),
  ('2026-07-08','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653','Pulled out the oars, didn''t need em, first autistic kid handled',1270),
  ('2026-07-08','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,4,'Sage Outdoor Adventures','653','Omg, best day ever, met Sean Paul Wes Max, all Missoulians. (Source row also listed 8mi with no hours — dropped as likely duplicate.)',1270)
) as t(date, river, put_in, take_out, boat_type, role, hours, miles, company_name, rol_license, notes, cfs)
where not exists (
  select 1 from public.log_entries le
  where le.user_id = u.id
    and le.date  = t.date::date
    and le.river = t.river
    and le.put_in = t.put_in
    and le.role  = t.role
    and le.miles = t.miles::numeric
    and le.hours = t.hours::numeric
);

-- Verify:
--   select date, river, put_in, take_out, role, miles, hours, cfs, notes
--   from public.log_entries
--   where user_id = (select id from auth.users where email = 'philliptillman05@gmail.com')
--   order by date;
