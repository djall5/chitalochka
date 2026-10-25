-- One-time production migration from 12x8 to 12x4 plots.
-- The original 96 stages remain in state.cells96Backup for recovery.
begin;

update public.student_deserts as d
set state = jsonb_set(
  d.state || jsonb_build_object('cells96Backup', d.state -> 'cells'),
  '{cells}',
  (select jsonb_agg(
    least(3,
      greatest(0, coalesce((d.state -> 'cells' ->> ((r.row_index * 2) * 12 + c.col_index))::integer, 0)) +
      greatest(0, coalesce((d.state -> 'cells' ->> ((r.row_index * 2 + 1) * 12 + c.col_index))::integer, 0))
    ) order by r.row_index, c.col_index)
   from generate_series(0, 3) as r(row_index)
   cross join generate_series(0, 11) as c(col_index)),
  true
), updated_at = now()
where jsonb_typeof(d.state -> 'cells') = 'array' and jsonb_array_length(d.state -> 'cells') = 96;

do $migration$
declare
  read_sql text := pg_get_functiondef('public.read_student_desert(text,text)'::regprocedure);
  write_sql text := pg_get_functiondef('public.mutate_student_desert(jsonb,text,text)'::regprocedure);
begin
  if position('array[96]' in read_sql) = 0
    or position('array[96]' in write_sql) = 0
    or position('jsonb_array_length(v_cells) <> 96' in write_sql) = 0
    or position('jsonb_array_length(p_action -> ''cells'') > 96' in write_sql) = 0
    or position('v_index >= 96' in write_sql) = 0
    or position('least(7, floor((v_y - 0.28) / 0.72 * 8)::integer) * 12' in write_sql) = 0
    or position('v_state := jsonb_build_object(' in write_sql) = 0
  then raise exception 'Функции пустыни отличаются от ожидаемой версии; миграция отменена.';
  end if;

  execute replace(read_sql, 'array[96]', 'array[48]');
  write_sql := replace(write_sql, 'array[96]', 'array[48]');
  write_sql := replace(write_sql, 'jsonb_array_length(v_cells) <> 96', 'jsonb_array_length(v_cells) <> 48');
  write_sql := replace(write_sql, 'jsonb_array_length(p_action -> ''cells'') > 96', 'jsonb_array_length(p_action -> ''cells'') > 48');
  write_sql := replace(write_sql, 'v_index >= 96', 'v_index >= 48');
  write_sql := replace(write_sql, 'least(7, floor((v_y - 0.28) / 0.72 * 8)::integer) * 12', 'least(3, floor((v_y - 0.28) / 0.72 * 4)::integer) * 12');
  write_sql := replace(write_sql, 'v_state := jsonb_build_object(', 'v_state := v_state || jsonb_build_object(');
  execute write_sql;
end;
$migration$;

do $verify$
begin
  if exists (select 1 from public.student_deserts where jsonb_array_length(state -> 'cells') <> 48) then
    raise exception 'Не все пустыни перенесены на 48 участков.';
  end if;
end;
$verify$;

commit;
