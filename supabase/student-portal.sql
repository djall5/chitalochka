-- Student portal access by a private teacher-generated link.
-- Safe to run more than once. The raw link token is never stored in the database.

create table if not exists public.student_portal_links (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  teacher_id uuid not null references public.teacher_workspaces (user_id) on delete cascade,
  student_id text not null,
  created_at timestamptz not null default now(),
  unique (teacher_id, student_id)
);

alter table public.student_portal_links enable row level security;
revoke all on public.student_portal_links from public, anon, authenticated;

create or replace function public.create_student_portal_link(p_student_id text, p_token_hash text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Требуется вход учителя.';
  end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Некорректная ссылка.';
  end if;
  if not exists (
    select 1
    from public.teacher_workspaces w,
      lateral jsonb_array_elements(coalesce(w.data -> 'students', '[]'::jsonb)) as students(student)
    where w.user_id = auth.uid()
      and student ->> 'id' = p_student_id
  ) then
    raise exception 'Карточка ученика не найдена.';
  end if;

  insert into public.student_portal_links (token_hash, teacher_id, student_id)
  values (p_token_hash, auth.uid(), p_student_id)
  on conflict (teacher_id, student_id) do update
    set token_hash = excluded.token_hash,
        created_at = now();
end;
$$;

create or replace function public.read_student_portal(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  result jsonb;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' then
    return null;
  end if;

  select jsonb_build_object(
    'student', student,
    'games', coalesce(w.data -> 'games', '[]'::jsonb)
  ) into result
  from public.student_portal_links link
  join public.teacher_workspaces w on w.user_id = link.teacher_id
  cross join lateral jsonb_array_elements(coalesce(w.data -> 'students', '[]'::jsonb)) as students(student)
  where link.token_hash = p_token_hash
    and student ->> 'id' = link.student_id
  limit 1;

  return result;
end;
$$;

create or replace function public.record_student_portal_attempt(
  p_token_hash text,
  p_lesson_id text,
  p_points integer,
  p_learning_progress jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  linked_teacher uuid;
  linked_student text;
  lesson_title text;
  attempt jsonb;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Ссылка кабинета недействительна.';
  end if;
  if p_points is null or p_points < 0 or p_points > 5000 then
    raise exception 'Некорректный результат.';
  end if;
  if p_learning_progress is not null and jsonb_typeof(p_learning_progress) <> 'object' then
    raise exception 'Некорректные данные прогресса.';
  end if;

  select teacher_id, student_id into linked_teacher, linked_student
  from public.student_portal_links
  where token_hash = p_token_hash;
  if linked_teacher is null then
    raise exception 'Ссылка кабинета недействительна.';
  end if;

  select lesson ->> 'title' into lesson_title
  from public.teacher_workspaces w
  cross join lateral jsonb_array_elements(coalesce(w.data -> 'students', '[]'::jsonb)) as students(student)
  cross join lateral jsonb_array_elements(coalesce(student -> 'lessons', '[]'::jsonb)) as lessons(lesson)
  where w.user_id = linked_teacher
    and student ->> 'id' = linked_student
    and lesson ->> 'id' = p_lesson_id
  limit 1;
  if lesson_title is null then
    raise exception 'Это занятие больше не доступно.';
  end if;

  attempt := jsonb_build_object(
    'id', gen_random_uuid()::text,
    'lessonId', p_lesson_id,
    'lessonTitle', lesson_title,
    'points', p_points,
    'completedAt', now()
  );

  update public.teacher_workspaces w
  set data = jsonb_set(
        w.data,
        '{students}',
        coalesce((
          select jsonb_agg(
            case when student ->> 'id' = linked_student then
              jsonb_set(
                jsonb_set(
                  student,
                  '{attempts}',
                  (case when jsonb_typeof(student -> 'attempts') = 'array' then student -> 'attempts' else '[]'::jsonb end)
                    || jsonb_build_array(attempt),
                  true
                ),
                '{learningProgress}',
                coalesce(p_learning_progress, student -> 'learningProgress', jsonb_build_object('letters', '[]'::jsonb, 'syllables', '[]'::jsonb, 'words', '[]'::jsonb)),
                true
              )
            else student end order by position
          )
          from jsonb_array_elements(coalesce(w.data -> 'students', '[]'::jsonb)) with ordinality as item(student, position)
        ), '[]'::jsonb),
        true
      ),
      updated_at = now()
  where w.user_id = linked_teacher;

  return attempt;
end;
$$;

revoke all on function public.create_student_portal_link(text, text) from public, anon;
revoke all on function public.read_student_portal(text) from public;
revoke all on function public.record_student_portal_attempt(text, text, integer, jsonb) from public;
grant execute on function public.create_student_portal_link(text, text) to authenticated;
grant execute on function public.read_student_portal(text) to anon, authenticated;
grant execute on function public.record_student_portal_attempt(text, text, integer, jsonb) to anon, authenticated;
