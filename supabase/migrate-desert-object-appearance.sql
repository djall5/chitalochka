-- Add per-object reflection and scale without rewriting existing worlds.
begin;

do $migration$
declare
  definition text := pg_get_functiondef('public.mutate_student_desert(jsonb,text,text)'::regprocedure);
  old_placement text := $old$
    v_id := p_action ->> 'id';
$old$;
  new_placement text := $new$
    if p_action ? 'mirrored' and jsonb_typeof(p_action -> 'mirrored') <> 'boolean' then raise exception 'Некорректное зеркалирование предмета.'; end if;
    v_mirrored := coalesce((p_action ->> 'mirrored')::boolean, false);
    if coalesce(p_action ->> 'scale', '1') !~ '^(0\.[5-9][0-9]*|1(\.[0-9]+)?|2(\.0+)?)$' then raise exception 'Некорректный размер предмета.'; end if;
    v_scale := coalesce((p_action ->> 'scale')::numeric, 1);
    v_id := p_action ->> 'id';
$new$;
  old_object text := $old$
        else '{}'::jsonb end);
$old$;
  new_object text := $new$
        else '{}'::jsonb end || jsonb_build_object('mirrored', v_mirrored, 'scale', v_scale));
$new$;
begin
  if position('  v_mirrored boolean;' in definition) > 0 then return; end if;
  if position('  v_facing text;' in definition) = 0 or position(old_placement in definition) = 0 or position(old_object in definition) = 0 then
    raise exception 'Текущая версия функции отличается от ожидаемой. Миграция отменена.';
  end if;
  definition := replace(definition, '  v_facing text;', E'  v_facing text;\n  v_mirrored boolean;\n  v_scale numeric;');
  definition := replace(definition, old_placement, new_placement);
  definition := replace(definition, old_object, new_object);
  execute definition;
end;
$migration$;

commit;
