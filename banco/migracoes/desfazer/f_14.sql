-- Desfaz f_14: volta reajuste_situacao e reajuste_aplicar sem prazo e apaga as 2 funções do prazo.
do $$ begin
  if position($a$  if produto._hoje() > produto._reajuste_aplicar_ate(a.vale_a_partir) then
    raise exception 'o reajuste aprovado vencia em %; votem de novo', to_char(produto._reajuste_aplicar_ate(a.vale_a_partir), 'DD/MM/YYYY') using errcode = '22023';
  end if;
  -- o limite que valia antes do reajuste, vezes (1 + IPCA votado); aplicar de novo dá o mesmo número$a$ in (select prosrc from pg_proc where oid = 'produto.reajuste_aplicar(uuid,uuid,date)'::regprocedure)) = 0 then
    raise exception 'desfazer f_14: trecho nao achado em produto.reajuste_aplicar(uuid,uuid,date)';
  end if;
  execute replace(pg_get_functiondef('produto.reajuste_aplicar(uuid,uuid,date)'::regprocedure), $a$  if produto._hoje() > produto._reajuste_aplicar_ate(a.vale_a_partir) then
    raise exception 'o reajuste aprovado vencia em %; votem de novo', to_char(produto._reajuste_aplicar_ate(a.vale_a_partir), 'DD/MM/YYYY') using errcode = '22023';
  end if;
  -- o limite que valia antes do reajuste, vezes (1 + IPCA votado); aplicar de novo dá o mesmo número$a$, $b$  -- o limite que valia antes do reajuste, vezes (1 + IPCA votado); aplicar de novo dá o mesmo número$b$);
end $$;
do $$ begin
  if position($a$    'ja_vale', a.vale_a_partir is not null and produto._reajuste_dentro_do_prazo(produto._hoje(), a.vale_a_partir),
    'aplicar_ate', produto._reajuste_aplicar_ate(a.vale_a_partir),
    'vencido', a.vale_a_partir is not null and produto._hoje() > produto._reajuste_aplicar_ate(a.vale_a_partir),
    -- (revisão E13) se o mês pedido não tem voto, o voto aberto mais recente da família (vigência futura, ainda não
    -- aprovado por todos), pro outro adulto achar o voto refeito sem depender da config da tela
    'voto_aberto', case when exists (select 1 from produto.reajuste_votos v0 where v0.familia_id = f and v0.mes_vigencia = m) then null else
      (select jsonb_build_object('mes_vigencia', to_char(x.mes_vigencia, 'YYYY-MM'), 'teto_centavos', x.teto_centavos, 'ipca', x.ipca,
              'votou', (select jsonb_agg(jsonb_build_object('membro_id', v.membro_id, 'nome', o.nome) order by v.votou_em)
                          from produto.reajuste_votos v join produto.membros o on o.familia_id = v.familia_id and o.id = v.membro_id
                         where v.familia_id = f and v.mes_vigencia = x.mes_vigencia))
         from produto.reajuste_votos x
        where x.familia_id = f and x.mes_vigencia > date_trunc('month', produto._hoje())::date
          and not exists (select 1 from produto._reajuste_aprovado(f, x.mes_vigencia))
        order by x.votou_em desc limit 1) end,$a$ in (select prosrc from pg_proc where oid = 'produto.reajuste_situacao(uuid,date)'::regprocedure)) = 0 then
    raise exception 'desfazer f_14: trecho nao achado em produto.reajuste_situacao(uuid,date)';
  end if;
  execute replace(pg_get_functiondef('produto.reajuste_situacao(uuid,date)'::regprocedure), $a$    'ja_vale', a.vale_a_partir is not null and produto._reajuste_dentro_do_prazo(produto._hoje(), a.vale_a_partir),
    'aplicar_ate', produto._reajuste_aplicar_ate(a.vale_a_partir),
    'vencido', a.vale_a_partir is not null and produto._hoje() > produto._reajuste_aplicar_ate(a.vale_a_partir),
    -- (revisão E13) se o mês pedido não tem voto, o voto aberto mais recente da família (vigência futura, ainda não
    -- aprovado por todos), pro outro adulto achar o voto refeito sem depender da config da tela
    'voto_aberto', case when exists (select 1 from produto.reajuste_votos v0 where v0.familia_id = f and v0.mes_vigencia = m) then null else
      (select jsonb_build_object('mes_vigencia', to_char(x.mes_vigencia, 'YYYY-MM'), 'teto_centavos', x.teto_centavos, 'ipca', x.ipca,
              'votou', (select jsonb_agg(jsonb_build_object('membro_id', v.membro_id, 'nome', o.nome) order by v.votou_em)
                          from produto.reajuste_votos v join produto.membros o on o.familia_id = v.familia_id and o.id = v.membro_id
                         where v.familia_id = f and v.mes_vigencia = x.mes_vigencia))
         from produto.reajuste_votos x
        where x.familia_id = f and x.mes_vigencia > date_trunc('month', produto._hoje())::date
          and not exists (select 1 from produto._reajuste_aprovado(f, x.mes_vigencia))
        order by x.votou_em desc limit 1) end,$a$, $b$    'ja_vale', a.vale_a_partir is not null and date_trunc('month', produto._hoje())::date >= a.vale_a_partir,$b$);
end $$;
drop function produto._reajuste_dentro_do_prazo(date, date);
drop function produto._reajuste_aplicar_ate(date);
