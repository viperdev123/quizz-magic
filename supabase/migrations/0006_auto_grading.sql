-- Auto-grading: every word is worth 1 point = 0.5 (noun type right) + 0.5 (reason right).
--   * grades.marks (one boolean per word)  ->  grades.type_ok + grades.reason_ok (one boolean per half)
--   * grades.total smallint                ->  numeric(3,1)   (0, 0.5, ... 4)
--   * submit_worksheet now stores the submission AND its grade in one transaction, so a student
--     sees the score the moment they submit. One attempt only: a graded seat is locked.
-- Existing grades are converted: a word that was marked correct becomes (type_ok, reason_ok) = (true, true).
-- Run in the Supabase SQL editor, as one block. It is safe to read the "VERIFY" queries at the bottom afterwards.

begin;

-- 1. new columns, filled from the old marks (triggers off so graded_at / graded_by of old rows are kept)
alter table public.grades disable trigger grades_stamp;
alter table public.grades add column type_ok boolean[];
alter table public.grades add column reason_ok boolean[];
update public.grades set type_ok = marks, reason_ok = marks;

-- 2. total helper: half a point per correct half
create or replace function public.score_total(t boolean[], r boolean[]) returns numeric
language sql immutable as $$ select ((public.count_true(t) + public.count_true(r))::numeric / 2) $$;

-- 3. drop the old per-word marks (this also drops the old "total = count_true(marks)" check)
alter table public.grades drop column marks;

alter table public.grades alter column type_ok set not null;
alter table public.grades alter column reason_ok set not null;
alter table public.grades add constraint grades_type_ok_check
  check (array_length(type_ok, 1) = 4 and array_position(type_ok, null) is null);
alter table public.grades add constraint grades_reason_ok_check
  check (array_length(reason_ok, 1) = 4 and array_position(reason_ok, null) is null);

-- 4. total becomes a half-point number, always derived from the two arrays
alter table public.grades alter column total type numeric(3,1) using total::numeric;
alter table public.grades add constraint grades_total_check check (total = public.score_total(type_ok, reason_ok));

create or replace function public.grades_before_write() returns trigger
language plpgsql as $$
begin
  new.total := public.score_total(new.type_ok, new.reason_ok);
  new.graded_by := auth.uid();   -- null when the server grades automatically
  new.graded_at := now();
  return new;
end $$;
alter table public.grades enable trigger grades_stamp;

-- 5. submit + grade in one transaction (service role only)
drop function if exists public.submit_worksheet(text, int, int, text, text, smallint[], text[], jsonb);

create function public.submit_worksheet(
  p_level text, p_room int, p_student_no int,
  p_name text, p_name_norm text,
  p_digits smallint[], p_nouns text[], p_words jsonb,
  p_type_ok boolean[], p_reason_ok boolean[], p_comments text[], p_note text
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_norm text;
begin
  -- serialise concurrent submits for the same seat
  perform pg_advisory_xact_lock(hashtext(p_level || ':' || p_room || ':' || p_student_no));

  select id, name_norm into v_id, v_norm
  from public.submissions
  where level = p_level and room = p_room and student_no = p_student_no
  for update;

  if v_id is null then
    insert into public.submissions (level, room, student_no, student_name, name_norm, digits, drawn_nouns, words)
    values (p_level, p_room, p_student_no, p_name, p_name_norm, p_digits, p_nouns, p_words)
    returning id into v_id;
  else
    -- a different name on the same seat: refuse first, so a wrong name never learns whether it is graded
    if v_norm <> p_name_norm then return 'mismatch'; end if;
    -- one attempt: once graded, the seat is locked
    if exists (select 1 from public.grades where submission_id = v_id) then return 'locked'; end if;
    -- (an old submission that was never graded may still be replaced)
    update public.submissions
    set student_name = p_name, digits = p_digits, drawn_nouns = p_nouns, words = p_words, submitted_at = now()
    where id = v_id;
  end if;

  insert into public.grades (submission_id, type_ok, reason_ok, comments, note, total)
  values (v_id, p_type_ok, p_reason_ok, p_comments, p_note, 0); -- total is recomputed by the trigger
  return 'ok';
end $$;

revoke all on function public.submit_worksheet(text,int,int,text,text,smallint[],text[],jsonb,boolean[],boolean[],text[],text)
  from public, anon, authenticated;
grant execute on function public.submit_worksheet(text,int,int,text,text,smallint[],text[],jsonb,boolean[],boolean[],text[],text)
  to service_role;

commit;

-- VERIFY (run separately afterwards) --------------------------------------------------------------
-- select column_name, data_type from information_schema.columns
--   where table_schema = 'public' and table_name = 'grades' order by ordinal_position;
--   -> type_ok / reason_ok are ARRAY, total is numeric, there is no "marks" column
-- select submission_id, type_ok, reason_ok, total from public.grades;   -- old grades converted, total unchanged
-- select count(*) from pg_proc where proname = 'submit_worksheet';       -- must be 1
