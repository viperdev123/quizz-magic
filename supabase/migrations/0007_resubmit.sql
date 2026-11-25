-- Re-submitting is allowed: the seat (level + room + number) is the identity.
--   * a different name on the same seat simply replaces the old name
--   * the new answers replace the old submission AND its grade (graded automatically again)
-- Same signature as 0006, so the API needs no change. Run in the Supabase SQL editor as one block.

begin;

create or replace function public.submit_worksheet(
  p_level text, p_room int, p_student_no int,
  p_name text, p_name_norm text,
  p_digits smallint[], p_nouns text[], p_words jsonb,
  p_type_ok boolean[], p_reason_ok boolean[], p_comments text[], p_note text
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext(p_level || ':' || p_room || ':' || p_student_no));

  select id into v_id
  from public.submissions
  where level = p_level and room = p_room and student_no = p_student_no
  for update;

  if v_id is null then
    insert into public.submissions (level, room, student_no, student_name, name_norm, digits, drawn_nouns, words)
    values (p_level, p_room, p_student_no, p_name, p_name_norm, p_digits, p_nouns, p_words)
    returning id into v_id;
  else
    update public.submissions
    set student_name = p_name, name_norm = p_name_norm, digits = p_digits, drawn_nouns = p_nouns,
        words = p_words, submitted_at = now()
    where id = v_id;
  end if;

  insert into public.grades (submission_id, type_ok, reason_ok, comments, note, total)
  values (v_id, p_type_ok, p_reason_ok, p_comments, p_note, 0)  -- total is recomputed by the trigger
  on conflict (submission_id) do update
    set type_ok = excluded.type_ok, reason_ok = excluded.reason_ok,
        comments = excluded.comments, note = excluded.note, total = 0;
  return 'ok';
end $$;

commit;

-- VERIFY: select pg_get_functiondef('public.submit_worksheet(text,int,int,text,text,smallint[],text[],jsonb,boolean[],boolean[],text[],text)'::regprocedure);
--   -> body no longer contains 'mismatch' or 'locked'
