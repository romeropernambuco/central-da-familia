-- f_14 (fase final, revisão E12): o reajuste aprovado tem prazo. Regra do coordenador: pode ser aplicado até o
-- ÚLTIMO DIA do mês de vale_a_partir (dia de Recife, produto._hoje()); depois disso o voto vence e precisa votar de novo
-- (num mês de vigência que ainda não começou, como sempre).
--  * produto._reajuste_aplicar_ate(vale_a_partir): o último dia daquele mês
--  * produto._reajuste_dentro_do_prazo(hoje, vale_a_partir): hoje entre o 1º dia de vale_a_partir e aplicar_ate
--  * reajuste_situacao passa a devolver aplicar_ate (data 'AAAA-MM-DD') e vencido; ja_vale só é verdade dentro do prazo
--  * reajuste_aplicar recusa (22023) depois de aplicar_ate
--  * (E13) reajuste_situacao devolve voto_aberto: se o mês pedido não está vivo (sem voto, vencido ou não aprovado com
--    vigência passada), o voto aberto mais recente da família em outro mês; nulo com o mês pedido em votação ou aprovado no prazo
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
    'vencido', a.vale_a_partir is not null and produto._hoje() > produto._reajuste_aplicar_ate(a.vale_a_partir),
    -- (revisão E13) quando o mês pedido NÃO está vivo (sem voto, com votos vencidos ou com votos não aprovados de vigência
    -- que já passou), vem o voto aberto mais recente da família em outro mês (vigência futura, ainda não aprovado por
    -- todos): o outro adulto acha o voto refeito sem depender da config da tela. Nulo só com o mês pedido em votação
    -- (vigência futura com voto, ainda não aprovado) ou aprovado dentro do prazo.
    'voto_aberto', case
      when (a.vale_a_partir is null and m > date_trunc('month', produto._hoje())::date
            and exists (select 1 from produto.reajuste_votos v0 where v0.familia_id = f and v0.mes_vigencia = m))
        or (a.vale_a_partir is not null and produto._hoje() <= produto._reajuste_aplicar_ate(a.vale_a_partir))
      then null else
      (select jsonb_build_object('mes_vigencia', to_char(x.mes_vigencia, 'YYYY-MM'), 'teto_centavos', x.teto_centavos, 'ipca', x.ipca,
              'votou', (select jsonb_agg(jsonb_build_object('membro_id', v.membro_id, 'nome', o.nome) order by v.votou_em)
                          from produto.reajuste_votos v join produto.membros o on o.familia_id = v.familia_id and o.id = v.membro_id
                         where v.familia_id = f and v.mes_vigencia = x.mes_vigencia))
         from produto.reajuste_votos x
        where x.familia_id = f and x.mes_vigencia > date_trunc('month', produto._hoje())::date
          and x.mes_vigencia <> m
          and not exists (select 1 from produto._reajuste_aprovado(f, x.mes_vigencia))
        order by x.votou_em desc limit 1) end,$b$);
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
