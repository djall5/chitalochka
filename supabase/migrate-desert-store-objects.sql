-- Return a placed object to inventory without changing points spent.
begin;

do $migration$
declare
  definition text := pg_get_functiondef('public.mutate_student_desert(jsonb,text,text)'::regprocedure);
  marker text := '  elsif p_action ->> ''type'' = ''edit'' then';
  store_branch text := $branch$
  elsif p_action ->> 'type' = 'store' then
    v_id := p_action ->> 'id';
    if v_id is null or v_id !~ '^[a-f0-9-]{36}$' then raise exception 'Некорректный предмет.'; end if;
    select obj, ordinal::integer - 1 into v_existing_object, v_object_index
    from jsonb_array_elements(v_objects) with ordinality as o(obj, ordinal)
    where obj ->> 'id' = v_id limit 1;
    if v_existing_object is null then raise exception 'Предмет не найден. Обнови мир и попробуй снова.'; end if;
    v_item := v_existing_object ->> 'itemId';
    if v_item not in ('flower','purpleFlower','bush','tree','willow','mushroom','butterfly','bee','rabbit','hedgehog','bird','ladybug','fence','woodenCottage','treehouse','stoneCottage','squirrel','fox','wolf','deer','stonePathThree','stonePathTwo','stonePathOne','stream','pond') then raise exception 'Неизвестный предмет.'; end if;
    v_amount := coalesce((v_inventory ->> v_item)::integer, 0);
    if v_amount >= 1000 then raise exception 'Для этого предмета больше нет места в рюкзаке.'; end if;
    v_inventory := jsonb_set(v_inventory, array[v_item], to_jsonb(v_amount + 1), true);
    v_objects := v_objects - v_object_index;
$branch$;
begin
  if position('p_action ->> ''type'' = ''store''' in definition) > 0 then return; end if;
  if position(marker in definition) = 0 then raise exception 'Текущая версия функции отличается от ожидаемой. Миграция отменена.'; end if;
  execute replace(definition, marker, store_branch || marker);
end;
$migration$;

commit;
