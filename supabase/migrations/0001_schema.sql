-- Tables, constraints, indexes, triggers. RLS is enabled in 0002.

create table public.teachers (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_teacher() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.teachers where user_id = auth.uid())
$$;
revoke all on function public.is_teacher() from public, anon;
grant execute on function public.is_teacher() to authenticated;

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('ป.1','ป.2','ป.3','ป.4','ป.5','ป.6','ม.1','ม.2','ม.3','ม.4','ม.5','ม.6')),
  room int not null check (room between 1 and 30),
  student_no int not null check (student_no between 1 and 99),
  student_name text not null check (char_length(student_name) between 1 and 80),
  name_norm text not null,
  digits smallint[] not null check (
    array_length(digits, 1) = 4
    and array_position(digits, null) is null
    and digits <@ array[0,1,2,3,4,5,6,7,8,9]::smallint[]
  ),
  drawn_nouns text[] not null check (array_length(drawn_nouns, 1) = 4),
  words jsonb not null check (jsonb_typeof(words) = 'array' and jsonb_array_length(words) = 4),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (level, room, student_no)  -- also serves as the (level, room, student_no) list index
);
create index submissions_submitted_at_idx on public.submissions (submitted_at desc);

create or replace function public.count_true(b boolean[]) returns smallint
language sql immutable as $$ select count(*)::smallint from unnest(b) x where x $$;

create table public.grades (
  submission_id uuid primary key references public.submissions on delete cascade,
  marks boolean[] not null check (array_length(marks, 1) = 4 and array_position(marks, null) is null),
  comments text[] not null check (array_length(comments, 1) = 4),
  note text,
  total smallint not null check (total = public.count_true(marks)),
  graded_by uuid references auth.users,
  graded_at timestamptz not null default now()
);
create index grades_graded_at_idx on public.grades (graded_at desc);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
create trigger submissions_touch before update on public.submissions
  for each row execute function public.touch_updated_at();

-- total is always derived from marks; grader and time are stamped server-side
create or replace function public.grades_before_write() returns trigger
language plpgsql as $$
begin
  new.total := public.count_true(new.marks);
  new.graded_by := auth.uid();
  new.graded_at := now();
  return new;
end $$;
create trigger grades_stamp before insert or update on public.grades
  for each row execute function public.grades_before_write();
