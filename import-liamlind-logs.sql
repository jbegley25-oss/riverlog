-- Import river-log entries for liam.lind256@gmail.com
-- Run once in the Supabase SQL Editor (uses auth.users, so run as the project owner).
--
-- Source: user-provided Google Sheet (two columns: "Commercial" and "Private").
--   Commercial column -> role 'guide', company 'Sage Outdoor Adventures', ROL '653'
--   Private column     -> role 'private', company 'PRIVATE', ROL ''
--
-- NOTES / ASSUMPTIONS (VERIFY):
--   * The sheet has NO boat-type column, so boat_type was inferred from the run:
--       Shoshone put-in -> 'paddle'; Lyons Gulch / Cotton (upper C) -> 'oar';
--       Eagle "Dow Junction" -> 'paddle'.  VERIFY these.
--   * Three private "Shoshone -> Bear creek" rows were dated 6/14/2029 in the
--     sheet -- treated as a typo for 2026-06-14.
--   * 6/6/2026 "Lyons Gulch -> Dotsero" (2h/4mi) is listed in BOTH the Commercial
--     and Private columns; kept as two separate entries per the sheet -- VERIFY.
--   * "Cotton" put-in (7/4 private) is the sheet's spelling -- VERIFY (Cottonwood?).
--   * Take-out "2 rivers" normalized to "Two Rivers Park"; "Bear creek" -> "Bear Creek".
--   * Several commercial Shoshone runs list take-out "Dotsero" as written on the sheet.
--   * CFS not recorded -> cfs left null.
--   * Sheet miles totals: Commercial 128 (matches), Private ~42-44.
--
-- The NOT EXISTS guard makes this safe to re-run: it skips a row if an entry with the
-- same date + river + put-in + take-out + role + miles + hours already exists.

insert into public.log_entries
  (user_id, date, river, put_in, take_out, boat_type, role, hours, miles, company_name, rol_license, notes, cfs)
select u.id, t.date::date, t.river, t.put_in, t.take_out, t.boat_type, t.role,
       t.hours::numeric, t.miles::numeric, t.company_name, t.rol_license, null::text, null::numeric
from (select id from auth.users where email = 'liam.lind256@gmail.com') u
cross join (values
  -- ===== Commercial (Sage Outdoor Adventures, ROL 653) =====
  ('2026-06-01','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653'),
  ('2026-06-02','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653'),
  ('2026-06-03','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653'),
  ('2026-06-04','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653'),
  ('2026-06-06','Colorado River','Lyons Gulch','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653'),
  ('2026-06-15','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653'),
  ('2026-06-16','Colorado River','Lyons Gulch','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653'),
  ('2026-06-17','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653'),
  ('2026-06-18','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653'),
  ('2026-06-19','Colorado River','Lyons Gulch','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653'),
  ('2026-06-22','Colorado River','Lyons Gulch','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653'),
  ('2026-06-27','Colorado River','Shoshone','Dotsero','paddle','guide',2,8,'Sage Outdoor Adventures','653'),
  ('2026-06-29','Colorado River','Lyons Gulch','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653'),
  ('2026-07-01','Colorado River','Shoshone','Dotsero','paddle','guide',2,8,'Sage Outdoor Adventures','653'),
  ('2026-07-03','Colorado River','Shoshone','Dotsero','paddle','guide',2,8,'Sage Outdoor Adventures','653'),
  ('2026-07-06','Colorado River','Lyons Gulch','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653'),
  ('2026-07-07','Colorado River','Shoshone','Dotsero','paddle','guide',2,8,'Sage Outdoor Adventures','653'),
  ('2026-07-08','Colorado River','Shoshone','Dotsero','paddle','guide',2,8,'Sage Outdoor Adventures','653'),
  ('2026-07-10','Colorado River','Shoshone','Dotsero','paddle','guide',2,8,'Sage Outdoor Adventures','653'),

  -- ===== Private =====
  ('2026-06-04','Eagle River','Dow Junction','Bob''s Bridge','paddle','private',2,6,'PRIVATE',''),
  ('2026-06-06','Colorado River','Lyons Gulch','Dotsero','oar','private',2,4,'PRIVATE',''),
  ('2026-06-12','Colorado River','Shoshone','Bear Creek','paddle','private',1,2,'PRIVATE',''),
  ('2026-06-12','Colorado River','Shoshone','Bear Creek','paddle','private',1,2,'PRIVATE',''),
  ('2026-06-24','Colorado River','Shoshone','Bear Creek','paddle','private',1,2,'PRIVATE',''),
  ('2026-06-24','Colorado River','Shoshone','Bear Creek','paddle','private',1,2,'PRIVATE',''),
  ('2026-06-24','Colorado River','Shoshone','Bear Creek','paddle','private',1,2,'PRIVATE',''),
  ('2026-06-14','Colorado River','Shoshone','Bear Creek','paddle','private',1,2,'PRIVATE',''),
  ('2026-06-14','Colorado River','Shoshone','Bear Creek','paddle','private',1,2,'PRIVATE',''),
  ('2026-06-14','Colorado River','Shoshone','Bear Creek','paddle','private',1,2,'PRIVATE',''),
  ('2026-07-04','Colorado River','Cotton','Dotsero','oar','private',2,6,'PRIVATE',''),
  ('2026-07-06','Colorado River','Shoshone','Bear Creek','paddle','private',1,2,'PRIVATE',''),
  ('2026-07-09','Colorado River','Shoshone','Dotsero','paddle','private',2,8,'PRIVATE','')
) as t(date, river, put_in, take_out, boat_type, role, hours, miles, company_name, rol_license)
where not exists (
  select 1 from public.log_entries le
  where le.user_id  = u.id
    and le.date     = t.date::date
    and le.river    = t.river
    and le.put_in   = t.put_in
    and le.take_out = t.take_out
    and le.role     = t.role
    and le.miles    = t.miles::numeric
    and le.hours    = t.hours::numeric
);

-- Verify:
--   select date, river, put_in, take_out, role, boat_type, miles, hours
--   from public.log_entries
--   where user_id = (select id from auth.users where email = 'liam.lind256@gmail.com')
--   order by date;
