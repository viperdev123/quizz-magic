-- ลบข้อมูลนักเรียนเมื่อสิ้นภาคเรียน / End-of-term data deletion
-- Run in the Supabase SQL editor. Grades are removed automatically (ON DELETE CASCADE).
-- THIS IS IRREVERSIBLE: export the CSV from the teacher page first (and keep it somewhere safe).

-- 1) PREVIEW: how many rows would be deleted? (change the class below)
select level, room, count(*) as submissions,
       count(*) filter (where exists (select 1 from public.grades g where g.submission_id = s.id)) as graded
from public.submissions s
where level = 'ม.1' and room = 2
group by level, room;

-- 2) DELETE one class (uncomment after checking the preview)
-- delete from public.submissions where level = 'ม.1' and room = 2;

-- 3) DELETE everything submitted before a date (e.g. all of last term)
-- delete from public.submissions where submitted_at < '2026-10-01';

-- 4) VERIFY
-- select count(*) from public.submissions;
-- select count(*) from public.grades;   -- must also have dropped
