-- Desfaz f_06. Recusa se já houver desejo gravado.
do $$ begin
  if exists (select 1 from produto.desejos) then raise exception 'desfazer f_06: ha desejos gravados; confira antes'; end if;
end $$;
do $$ begin
  execute replace(pg_get_functiondef('produto.exportar_meu(uuid)'::regprocedure),
    $b$                     where x.familia_id = f and (x.envelope_id = v_env or x.autor = (select auth.uid()))),
    'desejos', (select coalesce(json_agg(x order by x.criado_em), '[]') from produto.desejos x where x.familia_id = f and x.dono_membro = v_mid));$b$,
    $a$                     where x.familia_id = f and (x.envelope_id = v_env or x.autor = (select auth.uid()))));$a$);
end $$;
do $$ begin
  execute replace(pg_get_functiondef('produto.exportar_familia(uuid)'::regprocedure),
    $b$    'desejos', (select coalesce(json_agg(to_jsonb(x) || jsonb_build_object('dono_nome', coalesce((select o.nome from produto.membros o where o.familia_id = x.familia_id and o.id = x.dono_membro), 'Da família')) order by x.criado_em), '[]') from produto.desejos x where x.familia_id = f),
    'uso_da_ia', $b$,
    $a$    'uso_da_ia', $a$);
end $$;
drop table produto.desejos;
