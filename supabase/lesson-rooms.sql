-- Temporary, protected rooms for live lessons. Run once in Supabase SQL Editor.
-- The raw invitation token never reaches the database.

create table if not exists public.lesson_rooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null check (token_hash ~ '^[a-f0-9]{64}$'),
  lesson jsonb not null,
  games jsonb not null default '[]'::jsonb,
  state jsonb not null default '{"currentStep":0,"score":0,"showCompletion":false}'::jsonb,
  student_name text not null default 'Ученик',
  student_id text,
  character jsonb,
  expires_at timestamptz not null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lesson_rooms enable row level security;
revoke all on public.lesson_rooms from public, anon, authenticated;

create or replace function public.create_lesson_room(
  p_token_hash text, p_lesson jsonb, p_games jsonb, p_state jsonb,
  p_student_name text, p_student_id text default null, p_character jsonb default null
) returns jsonb
language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare result public.lesson_rooms;
begin
  if auth.uid() is null then raise exception 'Требуется вход учителя.'; end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'Некорректная ссылка комнаты.'; end if;
  if jsonb_typeof(p_lesson) <> 'object' or jsonb_typeof(p_games) <> 'array' or jsonb_typeof(p_state) <> 'object' then
    raise exception 'Некорректные данные урока.';
  end if;
  insert into public.lesson_rooms (teacher_id, token_hash, lesson, games, state, student_name, student_id, character, expires_at)
  values (auth.uid(), p_token_hash, p_lesson, p_games, p_state, left(coalesce(nullif(trim(p_student_name), ''), 'Ученик'), 80), p_student_id, p_character, now() + interval '3 hours')
  returning * into result;
  return jsonb_build_object('roomId', result.id, 'expiresAt', result.expires_at);
end;
$$;

create or replace function public.read_lesson_room(p_room_id uuid, p_token_hash text)
returns jsonb
language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' then return null; end if;
  return (
    select jsonb_build_object('roomId', id, 'expiresAt', expires_at, 'lesson', lesson, 'games', games, 'state', state,
      'studentName', student_name, 'studentId', student_id, 'character', character)
    from public.lesson_rooms
    where id = p_room_id and token_hash = p_token_hash and closed_at is null and expires_at > now()
  );
end;
$$;

create or replace function public.update_lesson_room_state(p_room_id uuid, p_state jsonb)
returns void
language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Требуется вход учителя.'; end if;
  if jsonb_typeof(p_state) <> 'object' then raise exception 'Некорректное состояние комнаты.'; end if;
  update public.lesson_rooms set state = p_state, updated_at = now()
  where id = p_room_id and teacher_id = auth.uid() and closed_at is null and expires_at > now();
  if not found then raise exception 'Комната закрыта или истекла.'; end if;
end;
$$;

create or replace function public.close_lesson_room(p_room_id uuid)
returns void
language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Требуется вход учителя.'; end if;
  update public.lesson_rooms set closed_at = now(), updated_at = now()
  where id = p_room_id and teacher_id = auth.uid() and closed_at is null;
end;
$$;

revoke all on function public.create_lesson_room(text, jsonb, jsonb, jsonb, text, text, jsonb) from public, anon;
revoke all on function public.read_lesson_room(uuid, text) from public;
revoke all on function public.update_lesson_room_state(uuid, jsonb) from public, anon;
revoke all on function public.close_lesson_room(uuid) from public, anon;
grant execute on function public.create_lesson_room(text, jsonb, jsonb, jsonb, text, text, jsonb) to authenticated;
grant execute on function public.read_lesson_room(uuid, text) to anon, authenticated;
grant execute on function public.update_lesson_room_state(uuid, jsonb) to authenticated;
grant execute on function public.close_lesson_room(uuid) to authenticated;
