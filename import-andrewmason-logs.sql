-- Import river-log entries for andrewcmason05@gmail.com
-- Run once in the Supabase SQL Editor (uses auth.users, so run as the project owner).
--
-- Source: four photographed CDPW On-River Log sheets (IMG_0013–0016).
--   IMG_0015, IMG_0016 = header "Commercial"  (all Sage / ROL 653 / role guide)
--   IMG_0013, IMG_0014 = header "Private"
-- Guide: Mason, Andrew, Crawford (middle "C"), DOB 06/23/2006.
--
-- Classification rule: role is set by the SHEET HEADER, not the company column.
--   * Commercial sheets (0015/0016) -> role 'guide', company 'Sage Outdoor Adventures', ROL '653'
--   * Private sheets (0013/0014)     -> role 'private', company 'PRIVATE', ROL ''
--     (even rows that had "Sage" + ROL 653 written on the private sheets are marked
--      private -- the outfitter/ROL info is disregarded for those, per instruction.)
--
-- CONFLICTS RESOLVED (VERIFY):
--   1. 06/08 Shoshone->Two Rivers Park appears on BOTH commercial sheets
--      (0015 & 0016, marked "checkout"). Treated as ONE commercial trip.
--   2. 06/27 Shoshone->Two Rivers Park appears on 0015 (commercial) AND 0013
--      (private), same 2h/8mi run. Kept as COMMERCIAL, private copy dropped.
--   3. Row 06/09 "Horse Creek -> Dotsero" (8h/10mi, oar) put-in name is a best-guess
--      from handwriting -- VERIFY put-in.
--   4. Row 06/06 Eagle "Dowe Junction -> Allison" take-out name is a best-guess -- VERIFY.
--   5. Two separate trips are logged on 06/17 (a Lyons oar run and a Shoshone paddle run).
--
-- Boat type: "Paddle" circled -> 'paddle'; "Oar" circled -> 'oar'.
-- CFS was not recorded on any sheet -> cfs left null.
--
-- The NOT EXISTS guard makes this safe to re-run: it skips a row if an entry with the
-- same date + river + put-in + take-out + role + miles + hours already exists.

insert into public.log_entries
  (user_id, date, river, put_in, take_out, boat_type, role, hours, miles, company_name, rol_license, notes, cfs)
select u.id, t.date::date, t.river, t.put_in, t.take_out, t.boat_type, t.role,
       t.hours::numeric, t.miles::numeric, t.company_name, t.rol_license, t.notes, null::numeric
from (select id from auth.users where email = 'andrewcmason05@gmail.com') u
cross join (values
  -- ===== Commercial (Sage Outdoor Adventures, ROL 653) =====
  ('2026-06-01','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653',null),
  ('2026-06-02','Colorado River','Lyons Gulch','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653',null),
  ('2026-06-03','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653',null),
  ('2026-06-08','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653','Checkout (also appeared on 2nd commercial sheet - counted once)'),
  ('2026-06-17','Colorado River','Lyons Gulch','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653',null),
  ('2026-06-17','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653',null),
  ('2026-06-20','Colorado River','Lyons Gulch','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653',null),
  ('2026-06-21','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653',null),
  ('2026-06-27','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653','Also on private sheet - kept as commercial'),
  ('2026-06-29','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653',null),
  ('2026-06-30','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653',null),
  ('2026-07-10','Colorado River','Lyons Gulch','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653',null),
  ('2026-07-13','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653',null),
  ('2026-07-15','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653',null),
  ('2026-07-17','Colorado River','Shoshone','Two Rivers Park','paddle','guide',2,8,'Sage Outdoor Adventures','653',null),

  -- ===== Private (everything on the Private-labelled sheets, incl. rows that
  --        had Sage/ROL 653 written -- outfitter & ROL disregarded per instruction) =====
  ('2026-06-06','Eagle River','Dowe Junction','Allison','paddle','private',2,6,'PRIVATE','','Take-out name uncertain - VERIFY'),
  ('2026-06-09','Colorado River','Horse Creek','Dotsero','oar','private',8,10,'PRIVATE','','Put-in name uncertain - VERIFY'),
  ('2026-06-09','Colorado River','Shoshone','Grizzly Creek','paddle','private',2,8,'PRIVATE','',null),
  ('2026-06-23','Colorado River','Shoshone','Grizzly Creek','paddle','private',4,6,'PRIVATE','','2 laps'),
  ('2026-06-24','Colorado River','Shoshone','Grizzly Creek','paddle','private',4,6,'PRIVATE','','2 laps'),
  ('2026-06-28','Colorado River','Shoshone','Grizzly Creek','paddle','private',2,6,'PRIVATE','',null),
  ('2026-07-08','Colorado River','Lyons Gulch','Dotsero','oar','private',2,4,'PRIVATE','',null)
) as t(date, river, put_in, take_out, boat_type, role, hours, miles, company_name, rol_license, notes)
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
--   select date, river, put_in, take_out, role, boat_type, miles, hours, notes
--   from public.log_entries
--   where user_id = (select id from auth.users where email = 'andrewcmason05@gmail.com')
--   order by date;
