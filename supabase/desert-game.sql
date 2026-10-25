-- Persistent desert worlds. Run after schema.sql and student-portal.sql.
create table if not exists public.student_deserts (
  teacher_id uuid not null references public.teacher_workspaces(user_id) on delete cascade,
  student_id text not null,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (teacher_id, student_id)
);

alter table public.student_deserts enable row level security;
revoke all on public.student_deserts from public, anon, authenticated;

create or replace function public.read_student_desert(p_student_id text default null, p_token_hash text default null)
returns jsonb
language plpgsql security definer set search_path = pg_catalog, pg_temp
as $$
declare
  v_teacher uuid;
  v_student text;
  v_record jsonb;
  v_state jsonb;
  v_earned integer;
begin
  if p_token_hash is not null then
    select teacher_id, student_id into v_teacher, v_student
    from public.student_portal_links where token_hash = p_token_hash;
  elsif auth.uid() is not null then
    v_teacher := auth.uid();
    v_student := p_student_id;
  end if;
  if v_teacher is null or v_student is null then raise exception 'Нет доступа к оазису.'; end if;
  select student into v_record
  from public.teacher_workspaces w
  cross join lateral jsonb_array_elements(coalesce(w.data -> 'students', '[]'::jsonb)) as s(student)
  where w.user_id = v_teacher and student ->> 'id' = v_student limit 1;
  if v_record is null then raise exception 'Карточка ученика не найдена.'; end if;
  select coalesce(sum(greatest(0, least(5000, (attempt ->> 'points')::integer))), 0) into v_earned
  from jsonb_array_elements(coalesce(v_record -> 'attempts', '[]'::jsonb)) as a(attempt)
  where attempt ->> 'points' ~ '^[0-9]{1,5}$';
  select state into v_state from public.student_deserts where teacher_id = v_teacher and student_id = v_student;
  v_state := coalesce(v_state, jsonb_build_object('spent', 0, 'water', 0, 'cells', to_jsonb(array_fill(0, array[96])), 'inventory', '{}'::jsonb, 'objects', '[]'::jsonb));
  return jsonb_build_object('desert', v_state, 'earned', v_earned);
end;
$$;

create or replace function public.mutate_student_desert(p_action jsonb, p_student_id text default null, p_token_hash text default null)
returns jsonb
language plpgsql security definer set search_path = pg_catalog, pg_temp
as $$
declare
  v_teacher uuid;
  v_student text;
  v_workspace jsonb;
  v_record jsonb;
  v_state jsonb;
  v_cells jsonb;
  v_inventory jsonb;
  v_objects jsonb;
  v_earned integer;
  v_spent integer;
  v_water integer;
  v_item text;
  v_price integer;
  v_quantity integer;
  v_total_price integer;
  v_amount integer;
  v_index integer;
  v_stage integer;
  v_x numeric;
  v_y numeric;
  v_id text;
  v_seen integer[] := '{}'::integer[];
  v_changed integer := 0;
  entry jsonb;
begin
  if p_token_hash is not null then
    select teacher_id, student_id into v_teacher, v_student
    from public.student_portal_links where token_hash = p_token_hash;
  elsif auth.uid() is not null then
    v_teacher := auth.uid();
    v_student := p_student_id;
  end if;
  if v_teacher is null or v_student is null then raise exception 'Нет доступа к оазису.'; end if;
  select data into v_workspace from public.teacher_workspaces where user_id = v_teacher for update;
  select student into v_record from jsonb_array_elements(coalesce(v_workspace -> 'students', '[]'::jsonb)) as s(student)
  where student ->> 'id' = v_student limit 1;
  if v_record is null then raise exception 'Карточка ученика не найдена.'; end if;
  select coalesce(sum(greatest(0, least(5000, (attempt ->> 'points')::integer))), 0) into v_earned
  from jsonb_array_elements(coalesce(v_record -> 'attempts', '[]'::jsonb)) as a(attempt)
  where attempt ->> 'points' ~ '^[0-9]{1,5}$';
  insert into public.student_deserts(teacher_id, student_id, state)
  values (v_teacher, v_student, jsonb_build_object('spent', 0, 'water', 0, 'cells', to_jsonb(array_fill(0, array[96])), 'inventory', '{}'::jsonb, 'objects', '[]'::jsonb))
  on conflict do nothing;
  select state into v_state from public.student_deserts where teacher_id = v_teacher and student_id = v_student for update;
  v_spent := coalesce((v_state ->> 'spent')::integer, 0);
  v_water := coalesce((v_state ->> 'water')::integer, 0);
  v_cells := v_state -> 'cells';
  v_inventory := coalesce(v_state -> 'inventory', '{}'::jsonb);
  v_objects := coalesce(v_state -> 'objects', '[]'::jsonb);
  if jsonb_typeof(v_cells) <> 'array' or jsonb_array_length(v_cells) <> 96 then raise exception 'Повреждён прогресс пустыни.'; end if;

  if p_action ->> 'type' = 'buy' then
    v_item := p_action ->> 'itemId';
    v_price := case v_item when 'water' then 20 when 'flower' then 20 when 'purpleFlower' then 25
      when 'bush' then 35 when 'tree' then 70 when 'willow' then 85
      when 'mushroom' then 25 when 'butterfly' then 35 when 'bee' then 35
      when 'rabbit' then 60 when 'hedgehog' then 45 when 'bird' then 50 when 'ladybug' then 25 else null end;
    if v_price is null then raise exception 'Неизвестный предмет.'; end if;
    if coalesce(p_action ->> 'quantity', '1') !~ '^([1-9]|1[0-9]|20)$' then raise exception 'Выбери от 1 до 20 предметов.'; end if;
    v_quantity := coalesce((p_action ->> 'quantity')::integer, 1);
    v_total_price := v_price * v_quantity;
    if v_earned - v_spent < v_total_price then raise exception 'Недостаточно баллов для покупки.'; end if;
    v_spent := v_spent + v_total_price;
    if v_item = 'water' then v_water := v_water + 4 * v_quantity;
    else
      v_amount := coalesce((v_inventory ->> v_item)::integer, 0) + v_quantity;
      v_inventory := jsonb_set(v_inventory, array[v_item], to_jsonb(v_amount), true);
    end if;
  elsif p_action ->> 'type' = 'water' then
    if jsonb_typeof(p_action -> 'cells') <> 'array' or jsonb_array_length(p_action -> 'cells') > 96 then raise exception 'Некорректный полив.'; end if;
    for entry in select value from jsonb_array_elements(p_action -> 'cells') loop
      if jsonb_typeof(entry) <> 'number' or entry::text !~ '^[0-9]{1,2}$' then raise exception 'Некорректный участок.'; end if;
      v_index := (entry::text)::integer;
      if v_index < 0 or v_index >= 96 then raise exception 'Некорректный участок.'; end if;
      if v_index = any(v_seen) then continue; end if;
      v_seen := array_append(v_seen, v_index);
      v_stage := (v_cells ->> v_index)::integer;
      if v_stage < 3 and v_water > 0 then
        v_cells := jsonb_set(v_cells, array[v_index::text], to_jsonb(v_stage + 1), false);
        v_water := v_water - 1;
        v_changed := v_changed + 1;
      end if;
    end loop;
    if v_changed = 0 then raise exception 'Нет воды или участок уже зелёный.'; end if;
  elsif p_action ->> 'type' = 'place' then
    v_item := p_action ->> 'itemId';
    if v_item not in ('flower','purpleFlower','bush','tree','willow','mushroom','butterfly','bee','rabbit','hedgehog','bird','ladybug') then raise exception 'Неизвестный предмет.'; end if;
    if coalesce((v_inventory ->> v_item)::integer, 0) < 1 then raise exception 'Предмет не куплен.'; end if;
    if (p_action ->> 'x') !~ '^(0(\.[0-9]+)?|1(\.0+)?)$' or (p_action ->> 'y') !~ '^(0(\.[0-9]+)?|1(\.0+)?)$' then raise exception 'Некорректное место.'; end if;
    v_x := (p_action ->> 'x')::numeric;
    v_y := (p_action ->> 'y')::numeric;
    if v_x >= 1 or v_y < 0.28 or v_y >= 1 then raise exception 'Выбери участок земли.'; end if;
    v_index := least(7, floor((v_y - 0.28) / 0.72 * 8)::integer) * 12 + floor(v_x * 12)::integer;
    if (v_cells ->> v_index)::integer <> 3 then raise exception 'Разместить предмет можно только на зелёном участке.'; end if;
    v_id := p_action ->> 'id';
    if v_id is null or v_id !~ '^[a-f0-9-]{36}$' then raise exception 'Некорректный предмет.'; end if;
    if exists (select 1 from jsonb_array_elements(v_objects) as o(object) where object ->> 'id' = v_id) then raise exception 'Предмет уже размещён.'; end if;
    if jsonb_array_length(v_objects) >= 500 then raise exception 'Мир уже заполнен.'; end if;
    v_inventory := jsonb_set(v_inventory, array[v_item], to_jsonb((v_inventory ->> v_item)::integer - 1), false);
    v_objects := v_objects || jsonb_build_array(jsonb_build_object('id', v_id, 'itemId', v_item, 'x', v_x, 'y', v_y));
  else raise exception 'Неизвестное действие.';
  end if;

  v_state := jsonb_build_object('spent', v_spent, 'water', v_water, 'cells', v_cells, 'inventory', v_inventory, 'objects', v_objects);
  update public.student_deserts set state = v_state, updated_at = now() where teacher_id = v_teacher and student_id = v_student;
  return jsonb_build_object('desert', v_state, 'earned', v_earned);
end;
$$;

revoke all on function public.read_student_desert(text, text) from public, anon;
revoke all on function public.mutate_student_desert(jsonb, text, text) from public, anon;
grant execute on function public.read_student_desert(text, text) to anon, authenticated;
grant execute on function public.mutate_student_desert(jsonb, text, text) to anon, authenticated;
