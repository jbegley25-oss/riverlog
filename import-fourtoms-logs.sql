-- Import river-log entries for fourtoms36@gmail.com
-- Run once in the Supabase SQL Editor (uses auth.users, so run as the project owner).
--
-- Mapping decisions:
--   * boat_type "Oar Frame"        -> 'oar'
--   * Commercial rows              -> role 'guide',   company 'Sage Outdoor Adventures', ROL '653'
--   * Private rows                 -> role 'private', company 'PRIVATE',                 ROL ''  (app convention)
--   * Trip Ct. (x2/x3/multi-day), Photo Ref, and verify/comment text folded into notes
--   * Multi-day rows use the trip START date; date range noted in notes
--   * Green River (Desolation) had blank put-in/take-out -> 'Desolation Canyon' placeholder
--
-- The NOT EXISTS guard makes this safe to re-run: it skips a row if an entry with the
-- same date + river + put-in + role + miles + hours already exists for this user.

insert into public.log_entries
  (user_id, date, river, put_in, take_out, boat_type, role, hours, miles, company_name, rol_license, notes)
select u.id, t.date::date, t.river, t.put_in, t.take_out, t.boat_type, t.role,
       t.hours::numeric, t.miles::numeric, t.company_name, t.rol_license, t.notes
from (select id from auth.users where email = 'fourtoms36@gmail.com') u
cross join (values
  -- ===== Commercial (Sage Outdoor Adventures) =====
  ('2025-06-12','Colorado River','Lyons','Dotsero','oar','guide',4,8,'Sage Outdoor Adventures','653','x2 runs. Photo ref: IMG_3937'),
  ('2025-06-13','Colorado River','Lyons','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Photo ref: IMG_3937'),
  ('2025-06-16','Eagle River','Ritten House','Community','oar','guide',1.75,3.5,'Sage Outdoor Adventures','653','Photo ref: IMG_3937'),
  ('2025-06-26','Eagle River','Rodeo','Community','oar','guide',4.25,8.5,'Sage Outdoor Adventures','653','Photo ref: IMG_3937'),
  ('2025-06-28','Colorado River','Rancho','Dotsero','oar','guide',8,4,'Sage Outdoor Adventures','653','Photo ref: IMG_3937'),
  ('2025-07-01','Colorado River','Lyons','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Photo ref: IMG_3937'),
  ('2025-07-03','Colorado River','Cottonwood','Dotsero','oar','guide',3,6,'Sage Outdoor Adventures','653','Photo ref: IMG_3937'),
  ('2025-07-04','Eagle River','Rodeo','Community','oar','guide',4.25,8.5,'Sage Outdoor Adventures','653','Photo ref: IMG_3937'),
  ('2025-07-06','Eagle River','Ritten House','Community','oar','guide',1.75,3.5,'Sage Outdoor Adventures','653','Photo ref: IMG_3937'),
  ('2025-07-07','Eagle River','Ritten House','Community','oar','guide',1.75,3.5,'Sage Outdoor Adventures','653','Photo ref: IMG_3937'),
  ('2025-07-08','Colorado River','Lyons','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Photo ref: IMG_3937'),
  ('2025-07-09','Colorado River','Lyons','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Photo ref: IMG_3937'),
  ('2025-07-10','Colorado River','Lyons','Dotsero','oar','guide',4,8,'Sage Outdoor Adventures','653','x2 runs. Photo ref: IMG_3937'),
  ('2025-07-12','Colorado River','Lyons','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Photo ref: IMG_3937'),
  ('2025-07-14','Colorado River','Lyons','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Photo ref: IMG_3937'),
  ('2025-07-17','Colorado River','Lyons','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Photo ref: IMG_3937'),
  ('2025-07-19','Colorado River','Lyons','Dotsero','oar','guide',6,12,'Sage Outdoor Adventures','653','x3 runs. Photo ref: IMG_3937'),
  ('2025-07-20','Colorado River','Lyons','Dotsero','oar','guide',4,8,'Sage Outdoor Adventures','653','Photo ref: IMG_3937. no x2 seen - verify'),
  ('2025-07-24','Eagle River','Rodeo','Community','oar','guide',4.25,8.5,'Sage Outdoor Adventures','653','Photo ref: IMG_3937'),
  ('2025-07-25','Colorado River','Lyons','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Photo ref: IMG_3937'),
  ('2025-07-26','Colorado River','Lyons','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Photo ref: IMG_3937'),
  ('2025-07-30','Colorado River','Lyons','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Photo ref: IMG_3937'),
  ('2025-07-31','Colorado River','Lyons','Dotsero','oar','guide',4,8,'Sage Outdoor Adventures','653','x2 runs. Photo ref: IMG_3937'),
  ('2025-08-08','Colorado River','Lyons','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Photo ref: IMG_3938'),
  ('2025-08-10','Colorado River','Lyons','Dotsero','oar','guide',4,8,'Sage Outdoor Adventures','653','x2 runs. Photo ref: IMG_3938'),
  ('2025-08-11','Colorado River','Lyons','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Photo ref: IMG_3938'),
  ('2025-08-14','Colorado River','Lyons','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Photo ref: IMG_3938'),
  ('2025-08-16','Colorado River','Lyons','Dotsero','oar','guide',4,8,'Sage Outdoor Adventures','653','x2 runs. Photo ref: IMG_3938'),
  ('2025-08-17','Colorado River','Cottonwood','Dotsero','oar','guide',3,6,'Sage Outdoor Adventures','653','Photo ref: IMG_3938'),
  ('2025-08-19','Colorado River','Cottonwood','Dotsero','oar','guide',3,6,'Sage Outdoor Adventures','653','Photo ref: IMG_3938'),
  ('2025-08-21','Colorado River','Lyons','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Photo ref: IMG_3938'),
  ('2025-08-24','Colorado River','Lyons','Dotsero','oar','guide',4,8,'Sage Outdoor Adventures','653','x2 runs. Photo ref: IMG_3938'),
  ('2025-08-25','Colorado River','Lyons','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Photo ref: IMG_3938'),
  ('2025-08-26','Colorado River','Lyons','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Photo ref: IMG_3938'),
  ('2025-08-27','Colorado River','Lyons','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Photo ref: IMG_3938'),
  ('2025-08-30','Colorado River','Lyons','Dotsero','oar','guide',4,8,'Sage Outdoor Adventures','653','x2 runs. Photo ref: IMG_3938'),
  ('2025-09-16','Colorado River','Cottonwood','Dotsero','oar','guide',3,6,'Sage Outdoor Adventures','653','Photo ref: IMG_3938'),
  ('2025-09-18','Colorado River','Lyons','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Photo ref: IMG_3938'),
  ('2025-09-20','Colorado River','Lyons','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Photo ref: IMG_3938'),
  ('2025-09-21','Colorado River','Lyons','Dotsero','oar','guide',4,8,'Sage Outdoor Adventures','653','x2 runs. Photo ref: IMG_3938'),
  ('2025-09-22','Colorado River','Lyons','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Photo ref: IMG_3938'),
  ('2026-03-27','Colorado River','Lyons','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Photo ref: IMG_3940'),
  ('2026-03-30','Colorado River','Lyons','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Photo ref: IMG_3940'),
  ('2026-04-10','Colorado River','Lyons','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Photo ref: IMG_3940'),
  ('2026-06-15','Colorado River','Lyons','Dotsero','oar','guide',2,4,'Sage Outdoor Adventures','653','Photo ref: IMG_3940'),
  ('2026-06-25','Colorado River','Cottonwood','Dotsero','oar','guide',3,6,'Sage Outdoor Adventures','653','Photo ref: IMG_3940'),
  -- ===== Private =====
  ('2025-10-22','Colorado River','Horse Creek','Dotsero','oar','private',5,10,'PRIVATE','','Photo ref: IMG_3939'),
  ('2025-11-13','Colorado River','Cottonwood','Dotsero','oar','private',3,6,'PRIVATE','','Photo ref: IMG_3939'),
  ('2025-11-14','Colorado River','Cottonwood','Dotsero','oar','private',3,6,'PRIVATE','','Photo ref: IMG_3939'),
  ('2025-11-15','Colorado River','Cottonwood','Dotsero','oar','private',3,6,'PRIVATE','','Photo ref: IMG_3939'),
  ('2025-11-18','Colorado River','Cottonwood','Dotsero','oar','private',3,6,'PRIVATE','','Photo ref: IMG_3939'),
  ('2025-11-22','Colorado River','Horse Creek','Dotsero','oar','private',5,10,'PRIVATE','','Photo ref: IMG_3939'),
  ('2025-11-23','Colorado River','Cottonwood','Dotsero','oar','private',3,6,'PRIVATE','','Photo ref: IMG_3939'),
  ('2026-06-03','Colorado River','Horse Creek','Dotsero','oar','private',5,10,'PRIVATE','','Photo ref: IMG_3939'),
  ('2026-06-04','Colorado River','Cottonwood','Dotsero','oar','private',3,6,'PRIVATE','','Photo ref: IMG_3939'),
  ('2026-06-14','Colorado River','Horse Creek','Dotsero','oar','private',5,10,'PRIVATE','','Photo ref: IMG_3939'),
  ('2026-06-24','Colorado River','Horse Creek','Dotsero','oar','private',5,10,'PRIVATE','','Photo ref: IMG_3939'),
  ('2026-06-15','Colorado River','Lyons','Dotsero','oar','private',2,4,'PRIVATE','','Photo ref: IMG_3940. written after 254mi tally - verify not duplicate'),
  ('2026-06-25','Colorado River','Cottonwood','Dotsero','oar','private',3,6,'PRIVATE','','Photo ref: IMG_3940. written after 254mi tally - verify not duplicate'),
  ('2026-03-16','San Juan River','Sand Island','Clay Hills','oar','private',84,84,'PRIVATE','','6-day trip (2026-03-16 to 2026-03-22). Photo ref: IMG_3939'),
  ('2026-04-19','Green River','Desolation Canyon','Desolation Canyon','oar','private',72,84,'PRIVATE','','Multi-day trip (2026-04-19 to 2026-04-24). Desolation Canyon. Photo ref: IMG_3939')
) as t(date, river, put_in, take_out, boat_type, role, hours, miles, company_name, rol_license, notes)
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
--   select date, river, put_in, role, miles, hours, notes
--   from public.log_entries
--   where user_id = (select id from auth.users where email = 'fourtoms36@gmail.com')
--   order by date;
