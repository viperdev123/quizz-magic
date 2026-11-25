-- Run in the Supabase SQL editor (as postgres) AFTER creating the user in Authentication > Users.
insert into public.teachers (user_id)
select id from auth.users where email = 'teacher@example.com'
on conflict do nothing;
