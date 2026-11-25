-- New Supabase projects do not auto-grant privileges on tables you create.
-- The Pages Functions use the service_role key, so it needs explicit table privileges
-- (service_role bypasses RLS, but RLS bypass is not the same as having table grants).
-- anon deliberately gets nothing; authenticated grants are in 0002.
grant select, insert, update, delete on public.teachers, public.submissions, public.grades to service_role;
