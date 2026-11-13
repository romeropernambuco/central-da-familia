-- Desfaz f_05. Recusa se já houver recebimento gravado (dado não se apaga sem conferência).
do $$ begin
  if exists (select 1 from produto.recebimentos) then raise exception 'desfazer f_05: ha recebimentos gravados; confira antes'; end if;
end $$;
do $$ begin
  execute replace(pg_get_functiondef('produto.exportar_familia(uuid)'::regprocedure),
    $b$    'recebimentos', (select coalesce(json_agg(to_jsonb(x) || jsonb_build_object('dono_nome', coalesce((select o.nome from produto.membros o where o.familia_id = x.familia_id and o.id = x.dono_membro), 'Da família')) order by x.mes_previsto, x.criado_em), '[]') from produto.recebimentos x where x.familia_id = f),
    'uso_da_ia', $b$,
    $a$    'uso_da_ia', $a$);
end $$;
drop table produto.recebimentos;
