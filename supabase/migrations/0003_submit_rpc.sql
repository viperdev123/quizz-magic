-- Atomic implementation of business rules 2-4. Callable ONLY by the service role (Pages Function).
create or replace function public.submit_worksheet(
  p_level text, p_room int, p_student_no int,
  p_name text, p_name_norm text,
  p_digits smallint[], p_nouns text[], p_words jsonb
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
    values (p_level, p_room, p_student_no, p_name, p_name_norm, p_digits, p_nouns, p_words);
    return 'ok';
  end if;

  -- rule 3 first, so a wrong name never learns whether the seat is graded
  if v_norm <> p_name_norm then return 'mismatch'; end if;
  -- rule 2
  if exists (select 1 from public.grades where submission_id = v_id) then return 'locked'; end if;
  -- rule 4: same name, not graded -> overwrite
  update public.submissions
  set student_name = p_name, digits = p_digits, drawn_nouns = p_nouns, words = p_words, submitted_at = now()
  where id = v_id;
  return 'ok';
end $$;

revoke all on function public.submit_worksheet(text,int,int,text,text,smallint[],text[],jsonb) from public, anon, authenticated;
grant execute on function public.submit_worksheet(text,int,int,text,text,smallint[],text[],jsonb) to service_role;
