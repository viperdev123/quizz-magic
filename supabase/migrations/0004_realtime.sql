-- Teacher list live updates. Realtime enforces RLS, so only teachers receive events.
alter publication supabase_realtime add table public.submissions, public.grades;
