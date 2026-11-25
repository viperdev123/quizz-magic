-- Demo data for LOCAL development only (`supabase db reset`). Never run against a real project.
insert into public.submissions (level, room, student_no, student_name, name_norm, digits, drawn_nouns, words) values
('ม.1', 2, 12, 'พิมพ์ชนก ใจดี', 'พิมพ์ชนก ใจดี', '{2,5,7,9}', '{แมว,โรงเรียน,ดินสอ,ความสุข}',
 '[{"word":"แมว","reason":"ใช้เรียกชื่อสัตว์"},{"word":"โรงเรียน","reason":"ใช้เรียกชื่อสถานที่"},{"word":"ดินสอ","reason":"ใช้เรียกชื่อสิ่งของ"},{"word":"วิ่ง","reason":"เป็นการกระทำของคน"}]'),
('ม.1', 2, 13, 'ธนกร รักเรียน', 'ธนกร รักเรียน', '{1,3,4,8}', '{ช้าง,สวน,ปากกา,ความดี}',
 '[{"word":"ช้าง","reason":"เป็นสัตว์"},{"word":"สวน","reason":"เป็นสถานที่"},{"word":"ปากกา","reason":"เป็นสิ่งของ"},{"word":"ความดี","reason":"เป็นนามธรรม"}]');
-- Create a demo teacher in Auth, then: insert into public.teachers values ('<auth user uuid>');
