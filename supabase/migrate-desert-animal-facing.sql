-- Keep existing student worlds and extend only the desert mutation function.
begin;

do $migration$
declare
  definition text := pg_get_functiondef('public.mutate_student_desert(jsonb,text,text)'::regprocedure);
  old_declaration text := '  v_rotation integer;';
  old_fence_sample text := '        v_sample_y := v_y + sin(radians(v_rotation)) * (v_sample * 20.0 / 675.0);';
  old_placement text := $old$
    v_id := p_action ->> 'id';
$old$;
  new_placement text := $new$
    if v_item in ('rabbit','hedgehog','bird','squirrel','fox','wolf','deer') then
      v_facing := coalesce(p_action ->> 'facing', 'right');
      if v_facing not in ('left', 'right') then raise exception 'Некорректное направление животного.'; end if;
    end if;
    v_id := p_action ->> 'id';
$new$;
  old_object text := $old$
      case when v_item = 'fence' then jsonb_build_object('rotation', v_rotation) else '{}'::jsonb end);
$old$;
  new_object text := $new$
      case when v_item = 'fence' then jsonb_build_object('rotation', v_rotation)
        when v_item in ('rabbit','hedgehog','bird','squirrel','fox','wolf','deer') then jsonb_build_object('facing', v_facing)
        else '{}'::jsonb end);
$new$;
begin
  if position('  v_facing text;' in definition) > 0 then return; end if;
  if position(old_declaration in definition) = 0 or position(old_placement in definition) = 0 or position(old_object in definition) = 0 or position(old_fence_sample in definition) = 0 then
    raise exception 'Текущая версия функции отличается от ожидаемой. Миграция отменена.';
  end if;
  definition := replace(definition, old_declaration, old_declaration || E'\n  v_facing text;');
  definition := replace(definition, old_placement, new_placement);
  definition := replace(definition, old_object, new_object);
  definition := replace(definition, old_fence_sample, '        v_sample_y := v_y;');
  execute definition;
end;
$migration$;

commit;
