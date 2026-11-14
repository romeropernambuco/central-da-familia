-- f_14 (fase final, revisão E12): o reajuste aprovado tem prazo. Regra do coordenador: pode ser aplicado até o
-- ÚLTIMO DIA do mês de vale_a_partir (dia de Recife, produto._hoje()); depois disso o voto vence e precisa votar de novo
-- (num mês de vigência que ainda não começou, como sempre).
--  * produto._reajuste_aplicar_ate(vale_a_partir): o último dia daquele mês
--  * produto._reajuste_dentro_do_prazo(hoje, vale_a_partir): hoje entre o 1º dia de vale_a_partir e aplicar_ate
--  * reajuste_situacao passa a devolver aplicar_ate (data 'AAAA-MM-DD') e vencido; ja_vale só é verdade dentro do prazo
--  * reajuste_aplicar recusa (22023) depois de aplicar_ate
-- Desfazer: banco/migracoes/desfazer/f_14.sql

create function produto._reajuste_aplicar_ate(p_vale date) returns date
language sql immutable set search_path = '' as $$
  select (date_trunc('month', p_vale) + interval '1 month' - interval '1 day')::date
$$;
create function produto._reajuste_dentro_do_prazo(p_hoje date, p_vale date) returns boolean
language sql immutable set search_path = '' as $$
  select p_vale is not null and p_hoje >= date_trunc('month', p_vale)::date and p_hoje <= produto._reajuste_aplicar_ate(p_vale)
$$;
revoke all on function produto._reajuste_aplicar_ate(date), produto._reajuste_dentro_do_prazo(date, date) from public, anon;
grant execute on function produto._reajuste_aplicar_ate(date), produto._reajuste_dentro_do_prazo(date, date) to authenticated, service_role;

do $$ begin
  if position($a$    'ja_vale', a.vale_a_partir is not null and date_trunc('month', produto._hoje())::date >= a.vale_a_partir,$a$ in (select prosrc from pg_proc where oid = 'produto.reajuste_situacao(uuid,date)'::regprocedure)) = 0 then
    raise exception 'f_14: trecho nao achado em produto.reajuste_situacao(uuid,date)';
  end if;
  execute replace(pg_get_functiondef('produto.reajuste_situacao(uuid,date)'::regprocedure), $a$    'ja_vale', a.vale_a_partir is not null and date_trunc('month', produto._hoje())::date >= a.vale_a_partir,$a$, $b$    'ja_vale', a.vale_a_partir is not null and produto._reajuste_dentro_do_prazo(produto._hoje(), a.vale_a_partir),
    'aplicar_ate', produto._reajuste_aplicar_ate(a.vale_a_partir),
    'vencido', a.vale_a_partir is not null and produto._hoje() > produto._reajuste_aplicar_ate(a.vale_a_partir),$b$);
end $$;
do $$ begin
  if position($a$  -- o limite que valia antes do reajuste, vezes (1 + IPCA votado); aplicar de novo dá o mesmo número$a$ in (select prosrc from pg_proc where oid = 'produto.reajuste_aplicar(uuid,uuid,date)'::regprocedure)) = 0 then
    raise exception 'f_14: trecho nao achado em produto.reajuste_aplicar(uuid,uuid,date)';
  end if;
  execute replace(pg_get_functiondef('produto.reajuste_aplicar(uuid,uuid,date)'::regprocedure), $a$  -- o limite que valia antes do reajuste, vezes (1 + IPCA votado); aplicar de novo dá o mesmo número$a$, $b$  if produto._hoje() > produto._reajuste_aplicar_ate(a.vale_a_partir) then
    raise exception 'o reajuste aprovado vencia em %; votem de novo', to_char(produto._reajuste_aplicar_ate(a.vale_a_partir), 'DD/MM/YYYY') using errcode = '22023';
  end if;
  -- o limite que valia antes do reajuste, vezes (1 + IPCA votado); aplicar de novo dá o mesmo número$b$);
end $$;

-- portão: todos os testes que existirem no banco têm que continuar 100% ok
do $$
declare t text; n int;
begin
  foreach t in array array['teste_vazamento','teste_contas_casos','teste_guardado','teste_escritorio','teste_tranca_f','teste_futuro_ir'] loop
    if to_regprocedure('produto.' || t || '()') is not null then
      execute format('select count(*) from produto.%I() where not ok', t) into n;
      if n > 0 then raise exception 'f_14: % tem % caso(s) falhando; nada foi gravado', t, n; end if;
    end if;
  end loop;
  select count(*) into n from produto.teste_conta() where not ok;
  if n > 0 then raise exception 'f_14: teste_conta tem % caso(s) falhando; nada foi gravado', n; end if;
end $$;
