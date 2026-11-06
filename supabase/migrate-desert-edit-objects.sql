-- Extend the existing desert RPC to edit placed objects without charging points.
begin;

do $migration$
declare
  definition text := pg_get_functiondef('public.mutate_student_desert(jsonb,text,text)'::regprocedure);
  old_marker text := $old$
  else raise exception 'Неизвестное действие.';
$old$;
  new_branch text := $branch$
  elsif p_action ->> 'type' = 'edit' then
    v_id := p_action ->> 'id';
    select obj, ordinal::integer - 1 into v_existing_object, v_object_index
    from jsonb_array_elements(v_objects) with ordinality as o(obj, ordinal)
    where obj ->> 'id' = v_id limit 1;
    if v_existing_object is null then raise exception 'Предмет не найден. Обнови мир и попробуй снова.'; end if;
    v_item := v_existing_object ->> 'itemId';
    if v_item not in ('flower','purpleFlower','bush','tree','willow','mushroom','butterfly','bee','rabbit','hedgehog','bird','ladybug','fence','woodenCottage','treehouse','stoneCottage','squirrel','fox','wolf','deer') then raise exception 'Неизвестный предмет.'; end if;
    if coalesce(p_action ->> 'x', '') !~ '^(0(\.[0-9]+)?|1(\.0+)?)$' or coalesce(p_action ->> 'y', '') !~ '^(0(\.[0-9]+)?|1(\.0+)?)$' then raise exception 'Некорректное место.'; end if;
    v_x := (p_action ->> 'x')::numeric;
    v_y := (p_action ->> 'y')::numeric;
    if v_x >= 1 or v_y < 0.28 or v_y >= 1 then raise exception 'Выбери участок земли.'; end if;
    v_index := least(3, floor((v_y - 0.28) / 0.72 * 4)::integer) * 12 + floor(v_x * 12)::integer;
    if (v_cells ->> v_index)::integer <> 3 then raise exception 'Разместить предмет можно только на зелёном участке.'; end if;
    if v_item = 'fence' then
      if coalesce(p_action ->> 'rotation', v_existing_object ->> 'rotation', '0') !~ '^[0-9]{1,3}$' then raise exception 'Некорректный поворот забора.'; end if;
      v_rotation := coalesce((p_action ->> 'rotation')::integer, (v_existing_object ->> 'rotation')::integer, 0);
      if v_rotation >= 360 or mod(v_rotation, 15) <> 0 then raise exception 'Некорректный поворот забора.'; end if;
      for v_sample in -4..4 loop
        v_sample_x := v_x + cos(radians(v_rotation)) * (v_sample * 20.0 / 1200.0);
        if v_sample_x < 0 or v_sample_x >= 1 then raise exception 'Вся секция забора должна стоять на зелёной земле.'; end if;
        v_sample_index := least(3, floor((v_y - 0.28) / 0.72 * 4)::integer) * 12 + floor(v_sample_x * 12)::integer;
        if (v_cells ->> v_sample_index)::integer <> 3 then raise exception 'Вся секция забора должна стоять на зелёной земле.'; end if;
      end loop;
    end if;
    if v_item in ('rabbit','hedgehog','bird','squirrel','fox','wolf','deer') then
      v_facing := coalesce(p_action ->> 'facing', v_existing_object ->> 'facing', 'right');
      if v_facing not in ('left', 'right') then raise exception 'Некорректное направление животного.'; end if;
    end if;
    if p_action ? 'mirrored' and jsonb_typeof(p_action -> 'mirrored') <> 'boolean' then raise exception 'Некорректное зеркалирование предмета.'; end if;
    v_mirrored := coalesce((p_action ->> 'mirrored')::boolean, (v_existing_object ->> 'mirrored')::boolean, false);
    if coalesce(p_action ->> 'scale', v_existing_object ->> 'scale', '1') !~ '^(0\.[5-9][0-9]*|1(\.[0-9]+)?|2(\.0+)?)$' then raise exception 'Некорректный размер предмета.'; end if;
    v_scale := coalesce((p_action ->> 'scale')::numeric, (v_existing_object ->> 'scale')::numeric, 1);
    if coalesce(p_action ->> 'layer', v_existing_object ->> 'layer', '0') !~ '^(-10|-[1-9]|0|[1-9]|10)$' then raise exception 'Некорректный слой предмета.'; end if;
    v_layer := coalesce((p_action ->> 'layer')::integer, (v_existing_object ->> 'layer')::integer, 0);
    v_objects := jsonb_set(v_objects, array[v_object_index::text], v_existing_object || jsonb_build_object('x', v_x, 'y', v_y, 'mirrored', v_mirrored, 'scale', v_scale, 'layer', v_layer) ||
      case when v_item = 'fence' then jsonb_build_object('rotation', v_rotation)
        when v_item in ('rabbit','hedgehog','bird','squirrel','fox','wolf','deer') then jsonb_build_object('facing', v_facing)
        else '{}'::jsonb end, false);
$branch$;
begin
  if position('elsif p_action ->> ''type'' = ''edit''' in definition) > 0 then return; end if;
  if position('  v_objects jsonb;' in definition) = 0 or position(old_marker in definition) = 0 then
    raise exception 'Текущая версия функции отличается от ожидаемой. Миграция отменена.';
  end if;
  definition := replace(definition, '  v_objects jsonb;', E'  v_objects jsonb;\n  v_existing_object jsonb;\n  v_object_index integer;\n  v_layer integer;');
  definition := replace(definition, old_marker, new_branch || old_marker);
  execute definition;
end;
$migration$;

commit;
