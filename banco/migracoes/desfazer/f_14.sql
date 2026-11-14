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
    'vencido', a.vale_a_partir is not null and produto._hoje() > produto._reajuste_aplicar_ate(a.vale_a_partir),$a$ in (select prosrc from pg_proc where oid = 'produto.reajuste_situacao(uuid,date)'::regprocedure)) = 0 then
    raise exception 'desfazer f_14: trecho nao achado em produto.reajuste_situacao(uuid,date)';
  end if;
  execute replace(pg_get_functiondef('produto.reajuste_situacao(uuid,date)'::regprocedure), $a$    'ja_vale', a.vale_a_partir is not null and produto._reajuste_dentro_do_prazo(produto._hoje(), a.vale_a_partir),
    'aplicar_ate', produto._reajuste_aplicar_ate(a.vale_a_partir),
    'vencido', a.vale_a_partir is not null and produto._hoje() > produto._reajuste_aplicar_ate(a.vale_a_partir),$a$, $b$    'ja_vale', a.vale_a_partir is not null and date_trunc('month', produto._hoje())::date >= a.vale_a_partir,$b$);
end $$;
drop function produto._reajuste_dentro_do_prazo(date, date);
drop function produto._reajuste_aplicar_ate(date);
