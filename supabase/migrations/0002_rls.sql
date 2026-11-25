-- RLS on EVERY table. No policy and no privileges for anon. Policies only for authenticated teachers.
alter table public.teachers    enable row level security;
alter table public.submissions enable row level security;
alter table public.grades      enable row level security;

-- Defense in depth: strip default Supabase grants, then grant only what teachers need.
revoke all on public.teachers, public.submissions, public.grades from anon, authenticated;
grant select on public.teachers to authenticated;
grant select, delete on public.submissions to authenticated;
grant select, insert, update, delete on public.grades to authenticated;

-- teachers: a user can only see their own row; nobody writes via the API (add via SQL, see README)
create policy teachers_select_self on public.teachers
  for select to authenticated using (user_id = auth.uid());

-- submissions: teachers read and delete (term cleanup). Students write only via the service-role Function.
create policy submissions_select on public.submissions
  for select to authenticated using (public.is_teacher());
create policy submissions_delete on public.submissions
  for delete to authenticated using (public.is_teacher());

-- grades: full control for teachers
create policy grades_select on public.grades
  for select to authenticated using (public.is_teacher());
create policy grades_insert on public.grades
  for insert to authenticated with check (public.is_teacher());
create policy grades_update on public.grades
  for update to authenticated using (public.is_teacher()) with check (public.is_teacher());
create policy grades_delete on public.grades
  for delete to authenticated using (public.is_teacher());
