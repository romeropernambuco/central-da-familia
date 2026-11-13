-- Desfaz f_07. Recusa se a família já gravou parâmetros.
do $$ begin
  if exists (select 1 from produto.objetivo) then raise exception 'desfazer f_07: ha parametros gravados; confira antes'; end if;
end $$;
do $$ begin
  execute replace(pg_get_functiondef('produto.exportar_familia(uuid)'::regprocedure),
    $b$    'objetivo', (select to_json(x) from produto.objetivo x where x.familia_id = f),
    'objetivo_historico', (select coalesce(json_agg(x order by x.quando), '[]') from produto.objetivo_historico x where x.familia_id = f),
    'uso_da_ia', $b$,
    $a$    'uso_da_ia', $a$);
end $$;
drop table produto.objetivo_historico;
drop table produto.objetivo;
drop function produto._objetivo_guardar_historico();
drop function produto._objetivo_carimbo();
drop function produto._objetivo_ok(jsonb);
