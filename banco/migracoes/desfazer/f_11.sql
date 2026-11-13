-- Desfaz f_11. Recusa se já houver saldo gravado.
do $$ begin
  if exists (select 1 from produto.saldos_conta) then raise exception 'desfazer f_11: ha saldos gravados; confira antes'; end if;
end $$;
do $$ begin
  if position($a$    'saldos_conta', (select coalesce(json_agg(to_jsonb(x) || jsonb_build_object('dono_nome', coalesce((select o.nome from produto.membros o where o.familia_id = x.familia_id and o.id = x.dono_membro), 'Da família')) order by x.banco), '[]') from produto.saldos_conta x where x.familia_id = f),
    'uso_da_ia', $a$ in (select prosrc from pg_proc where oid = 'produto.exportar_familia(uuid)'::regprocedure)) = 0 then
    raise exception 'desfazer f_11: trecho nao achado em produto.exportar_familia(uuid)';
  end if;
  execute replace(pg_get_functiondef('produto.exportar_familia(uuid)'::regprocedure), $a$    'saldos_conta', (select coalesce(json_agg(to_jsonb(x) || jsonb_build_object('dono_nome', coalesce((select o.nome from produto.membros o where o.familia_id = x.familia_id and o.id = x.dono_membro), 'Da família')) order by x.banco), '[]') from produto.saldos_conta x where x.familia_id = f),
    'uso_da_ia', $a$, $b$    'uso_da_ia', $b$);
end $$;
do $$ begin
  if position($a$    'dividas', '[]'::jsonb,
    -- f_11: dinheiro parado em conta corrente (fora das aplicações), por conta e somado
    'saldo_caixa', (select coalesce(sum(s.valor_centavos), 0) from produto.saldos_conta s where s.familia_id = f and s.apagado_em is null),
    'saldos_conta', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'dono_membro', s.dono_membro, 'banco', s.banco,
        'valor_centavos', s.valor_centavos, 'atualizado_em', s.atualizado_em) order by s.banco, s.id), '[]'::jsonb)
        from produto.saldos_conta s where s.familia_id = f and s.apagado_em is null),$a$ in (select prosrc from pg_proc where oid = 'produto.futuro_entradas(uuid)'::regprocedure)) = 0 then
    raise exception 'desfazer f_11: trecho nao achado em produto.futuro_entradas(uuid)';
  end if;
  execute replace(pg_get_functiondef('produto.futuro_entradas(uuid)'::regprocedure), $a$    'dividas', '[]'::jsonb,
    -- f_11: dinheiro parado em conta corrente (fora das aplicações), por conta e somado
    'saldo_caixa', (select coalesce(sum(s.valor_centavos), 0) from produto.saldos_conta s where s.familia_id = f and s.apagado_em is null),
    'saldos_conta', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'dono_membro', s.dono_membro, 'banco', s.banco,
        'valor_centavos', s.valor_centavos, 'atualizado_em', s.atualizado_em) order by s.banco, s.id), '[]'::jsonb)
        from produto.saldos_conta s where s.familia_id = f and s.apagado_em is null),$a$, $b$    'dividas', '[]'::jsonb,$b$);
end $$;
drop table produto.saldos_conta;
drop function produto._saldo_conta_carimbo();
