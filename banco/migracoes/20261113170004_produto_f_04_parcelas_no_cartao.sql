-- f_04 (fase final): compra parcelada no cartão. Regra do dono (13/11, TIME.md):
--  * cada parcela entra no limite do MÊS DA FATURA como compromisso daquele mês, abatida no dia 1, FORA do ritmo do
--    dia e da semana; compra à vista no cartão continua saindo no dia da compra; parcelado sem cartão é recusado.
--  * lancamentos.parcelas (1 a 12, padrão 1) e lancamentos.pago_por (membro que pagou; opcional)
--  * lancar e lancar_com_chave aceitam "parcelas" no fim (padrão 1: quem não manda nada continua igual)
--  * produto._parcela_valor(valor, n, i): a 1ª parcela leva os centavos que sobram (1.000 em 3x = 333,34 + 333,33 + 333,33)
--  * produto._compromisso_mes(envelope, mes): soma das parcelas daquele envelope que vencem na fatura do mês
--    (parcela i no mês _mes_fatura(fecha, vence, data) + i). Ex.: 1.200 em 6x em 05/11, cartão fecha 1 e vence 10:
--    dez a mai, 200 por mês; nov e jun, nada.
--  * _gasto continua sendo o RITMO (dia e semana): só compra à vista (parcelas = 1). O total do mês = _gasto + _compromisso_mes.
--  * _faturas, _plano (pote do dia sem o compromisso; gasto_mes com ele), _diario (sobra de mês passado com ele),
--    _pote_inicio (semanal: a semana antes do começo usa o teto já sem a parcela), _resumo (mensal; semanal com o teto
--    da semana = (limite menos as parcelas do mês) x 12 / 52, revisão N1; "no cartão" e a linha de explicação) e _esc_brutas (Contador:
--    "hoje já saiu" sem a compra parcelada) passam a seguir a regra. Com parcelas = 1 nenhuma conta muda.
--  * (revisão B6) quem lança acha a própria chave repetida por _lanc_repetido (a equipe não lê lançamentos, mas
--    continua recebendo "repetido" em vez de erro quando a internet cai e a tela manda de novo)
-- Desfazer: banco/migracoes/desfazer/f_04.sql (só desfaz se nenhum lançamento usar parcelas > 1 ou pago_por)

alter table produto.lancamentos
  add column parcelas smallint not null default 1 constraint lancamentos_parcelas_faixa check (parcelas between 1 and 12),
  add column pago_por uuid;
alter table produto.lancamentos
  add constraint lancamentos_pago_por_fk foreign key (familia_id, pago_por) references produto.membros(familia_id, id),
  add constraint lancamentos_parcelado_no_cartao check (parcelas = 1 or cartao_id is not null);
comment on column produto.lancamentos.parcelas is 'em quantas parcelas foi a compra (1 a 12). valor = total da compra (f_04)';
comment on column produto.lancamentos.pago_por is 'membro que pagou (opcional) (f_04)';
grant insert (parcelas, pago_por), update (parcelas, pago_por) on produto.lancamentos to authenticated;

create or replace function produto._parcela_valor(p_valor numeric, p_n smallint, p_i integer) returns numeric
language sql immutable set search_path = '' as $$
  select case when coalesce(p_n, 1) <= 1 then p_valor
              when p_i = 0 then p_valor - trunc(p_valor / p_n, 2) * (p_n - 1)
              else trunc(p_valor / p_n, 2) end
$$;
revoke all on function produto._parcela_valor(numeric, smallint, integer) from public, anon;
grant execute on function produto._parcela_valor(numeric, smallint, integer) to authenticated, service_role;

create or replace function produto._compromisso_mes(p_env uuid, p_mes date) returns numeric
language sql stable set search_path = '' as $$
  select coalesce(sum(produto._parcela_valor(l.valor, l.parcelas, g.i)), 0)
    from produto.lancamentos l
    join produto.cartoes c on c.id = l.cartao_id and c.familia_id = l.familia_id
   cross join lateral generate_series(0, l.parcelas - 1) g(i)
   where l.envelope_id = p_env and l.apagado_em is null and l.parcelas > 1
     and l.data between (date_trunc('month', p_mes) - interval '15 months')::date and (date_trunc('month', p_mes) + interval '1 month')::date
     and (produto._mes_fatura(c.dia_fechamento, c.dia_vencimento, l.data) + make_interval(months => g.i))::date = date_trunc('month', p_mes)::date
$$;
comment on function produto._compromisso_mes(uuid, date) is 'Parcelas do envelope que vencem na fatura do mês (f_04). Saem do limite no dia 1.';
revoke all on function produto._compromisso_mes(uuid, date) from public, anon;
grant execute on function produto._compromisso_mes(uuid, date) to authenticated, service_role;

-- B6: acha a chave (ou o mesmo toque em 10 s) só entre os lançamentos de quem chama; devolve só o id
create or replace function produto._lanc_repetido(p_familia uuid, p_chave uuid, p_env uuid, p_valor numeric, p_data date,
                                                  p_desc text, p_cartao uuid, p_parc smallint) returns uuid
language sql stable security definer set search_path = '' as $$
  select l.id from produto.lancamentos l
   where l.familia_id = p_familia and l.autor = (select auth.uid())
     and ( (p_chave is not null and l.chave_cliente = p_chave)
        or (p_chave is null and l.envelope_id = p_env and l.valor = p_valor and l.data = p_data
            and l.descricao is not distinct from p_desc and l.cartao_id is not distinct from p_cartao
            and l.parcelas = coalesce(p_parc, 1) and l.apagado_em is null and l.criado_em > now() - interval '10 seconds') )
   order by l.criado_em limit 1
$$;
revoke all on function produto._lanc_repetido(uuid, uuid, uuid, numeric, date, text, uuid, smallint) from public, anon;
grant execute on function produto._lanc_repetido(uuid, uuid, uuid, numeric, date, text, uuid, smallint) to authenticated;

CREATE OR REPLACE FUNCTION produto._lancar(familia uuid, envelope uuid, valor numeric, data date, descricao text, cartao uuid, segundos numeric, chave uuid, parcelas smallint)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare v_id uuid; v_dup uuid; v_data date := coalesce(_lancar.data, produto._hoje()); v_valor numeric := round(_lancar.valor, 2);
        v_desc text := nullif(left(trim(_lancar.descricao), 300), ''); v_papel text;
        v_parc smallint := coalesce(_lancar.parcelas, 1::smallint);
begin
  if (select auth.uid()) is null then raise exception 'precisa entrar no app antes de lancar' using errcode = '42501'; end if;
  if v_valor is null or v_valor <= 0 then raise exception 'o valor tem que ser maior que zero' using errcode = '22023'; end if;
  if v_valor > 1000000 then raise exception 'o valor passou de 1 milhao; confira os numeros' using errcode = '22023'; end if;
  if v_parc < 1 or v_parc > 12 then raise exception 'parcelas de 1 a 12' using errcode = '22023'; end if;
  -- parcelado só no cartão com dia de fechamento e de vencimento (decisão do dono: a parcela cai no mês da fatura)
  if v_parc > 1 and not exists (select 1 from produto.cartoes c where c.id = _lancar.cartao and c.familia_id = _lancar.familia
                                   and c.dia_fechamento is not null and c.dia_vencimento is not null) then
    raise exception 'parcelado so no cartao com dia de fechamento e de vencimento' using errcode = '22023';
  end if;
  if v_data < date '2000-01-01' or v_data > date '2100-12-31' then raise exception 'a data esta fora do calendario do app' using errcode = '22023'; end if;
  v_papel := produto.meu_papel(_lancar.familia);
  if _lancar.chave is not null then
    -- chave do toque: a mesma chave nunca grava 2 vezes, nem depois de 10 s, nem com a internet caindo no meio
    perform pg_advisory_xact_lock(hashtextextended('lancar:' || _lancar.familia::text || ':' || _lancar.chave::text, 0));
    v_dup := produto._lanc_repetido(_lancar.familia, _lancar.chave, null, null, null, null, null, null);
  else
    perform pg_advisory_xact_lock(hashtextextended('lancar:' || (select auth.uid())::text || ':' || coalesce(_lancar.envelope::text, ''), 0));
    v_dup := produto._lanc_repetido(_lancar.familia, null, _lancar.envelope, v_valor, v_data, v_desc, _lancar.cartao, v_parc);
  end if;
  if v_dup is null then
    v_id := gen_random_uuid();
    begin
      insert into produto.lancamentos (id, familia_id, envelope_id, cartao_id, valor, data, descricao, chave_cliente, parcelas)
      values (v_id, _lancar.familia, _lancar.envelope, _lancar.cartao, v_valor, v_data, v_desc, _lancar.chave, v_parc);
    exception when unique_violation then
      raise exception 'esse lancamento ja foi gravado (mesma chave)' using errcode = '23505';
    end;
    insert into produto.eventos (familia_id, tipo, segundos)
    values (_lancar.familia, 'lancamento', case when _lancar.segundos between 0 and 600 then round(_lancar.segundos, 1) end);
  else
    v_id := v_dup;
  end if;
  return json_build_object(
    'lancamento', case when v_papel = 'equipe'
       then json_build_object('id', v_id, 'envelope_id', _lancar.envelope, 'data', v_data, 'descricao', v_desc)
       else (select to_json(l) from produto.lancamentos l where l.id = v_id) end,
    'repetido', v_dup is not null,
    'resumo', produto._resumo(_lancar.familia, produto._hoje()));
end $function$;
revoke all on function produto._lancar(uuid,uuid,numeric,date,text,uuid,numeric,uuid,smallint) from public, anon;
grant execute on function produto._lancar(uuid,uuid,numeric,date,text,uuid,numeric,uuid,smallint) to authenticated;

-- a versão antiga de 8 argumentos (usada pela feira) vira só um atalho pra nova, com 1 parcela
create or replace function produto._lancar(familia uuid, envelope uuid, valor numeric, data date, descricao text, cartao uuid, segundos numeric, chave uuid)
returns json language sql set search_path = '' as $$
  select produto._lancar(familia, envelope, valor, data, descricao, cartao, segundos, chave, 1::smallint)
$$;

drop function produto.lancar(uuid, uuid, numeric, date, text, uuid, numeric);
create function produto.lancar(familia uuid, envelope uuid, valor numeric, data date default null, descricao text default null,
                               cartao uuid default null, segundos numeric default null, parcelas smallint default 1)
returns json language sql set search_path = '' as $$
  select produto._lancar(familia, envelope, valor, data, descricao, cartao, segundos, null, parcelas)
$$;
revoke all on function produto.lancar(uuid,uuid,numeric,date,text,uuid,numeric,smallint) from public, anon;
grant execute on function produto.lancar(uuid,uuid,numeric,date,text,uuid,numeric,smallint) to authenticated;

drop function produto.lancar_com_chave(uuid, uuid, numeric, uuid, date, text, uuid, numeric);
create function produto.lancar_com_chave(familia uuid, envelope uuid, valor numeric, chave uuid, data date default null,
                                         descricao text default null, cartao uuid default null, segundos numeric default null,
                                         parcelas smallint default 1)
returns json language plpgsql set search_path = '' as $$
begin
  if chave is null then raise exception 'falta a chave do toque' using errcode = '22023'; end if;
  return produto._lancar(familia, envelope, valor, data, descricao, cartao, segundos, chave, parcelas);
end $$;
revoke all on function produto.lancar_com_chave(uuid,uuid,numeric,uuid,date,text,uuid,numeric,smallint) from public, anon;
grant execute on function produto.lancar_com_chave(uuid,uuid,numeric,uuid,date,text,uuid,numeric,smallint) to authenticated;

-- o ritmo (dia e semana) só conta compra à vista; a parcela entra pelo _compromisso_mes
create or replace function produto._gasto(p_env uuid, p_de date, p_ate date) returns numeric
language sql stable set search_path = '' as $$ select coalesce(sum(l.valor),0) from produto.lancamentos l
   where l.envelope_id = p_env and l.apagado_em is null and l.parcelas = 1 and l.data between p_de and p_ate $$;

CREATE OR REPLACE FUNCTION produto._faturas(p_familia uuid, p_de date, p_meses integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is not null and produto.meu_papel(p_familia) is null then
    raise exception 'sem acesso a esta familia' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('cartao_id', c.id, 'cartao', c.nome, 'ativo', c.ativo, 'mes', to_char(m.mes,'YYYY-MM'),
      'fecha_em', make_date(extract(year from f.fm)::int, extract(month from f.fm)::int, least(c.dia_fechamento::int, extract(day from (f.fm + interval '1 month' - interval '1 day'))::int)),
      'vence_em', make_date(extract(year from m.mes)::int, extract(month from m.mes)::int, least(c.dia_vencimento::int, extract(day from (m.mes + interval '1 month' - interval '1 day'))::int)),
      'total', coalesce(x.total,0), 'compras', coalesce(x.n,0)) order by c.nome, m.mes)
    from produto.cartoes c
    cross join lateral (select gs::date as mes from generate_series(date_trunc('month',p_de), date_trunc('month',p_de) + (greatest(p_meses,1)-1) * interval '1 month', interval '1 month') gs) m
    cross join lateral (select case when c.dia_vencimento > c.dia_fechamento then m.mes else (m.mes - interval '1 month')::date end as fm) f
    left join lateral (select sum(produto._parcela_valor(l.valor, l.parcelas, g.i)) total, count(*) n from produto.lancamentos l
       cross join lateral generate_series(0, greatest(l.parcelas, 1) - 1) g(i)
       where l.cartao_id = c.id and l.familia_id = c.familia_id and l.apagado_em is null
         and (produto._mes_fatura(c.dia_fechamento, c.dia_vencimento, l.data) + make_interval(months => g.i))::date = m.mes) x on true
    where c.familia_id = p_familia and (c.ativo or coalesce(x.n,0) > 0)), '[]'::jsonb);
end $function$;

do $$ begin
  if position($a$declare e record; fim date;$a$ in (select prosrc from pg_proc where oid = 'produto._plano(uuid,date,numeric,date,date)'::regprocedure)) = 0 then
    raise exception 'f_04: trecho nao achado em produto._plano(uuid,date,numeric,date,date)';
  end if;
  execute replace(pg_get_functiondef('produto._plano(uuid,date,numeric,date,date)'::regprocedure), $a$declare e record; fim date;$a$, $b$declare comp numeric; e record; fim date;$b$);
end $$;
do $$ begin
  if position($a$  pote_dias := greatest(0, p_liq - coalesce(e.colchao,0));$a$ in (select prosrc from pg_proc where oid = 'produto._plano(uuid,date,numeric,date,date)'::regprocedure)) = 0 then
    raise exception 'f_04: trecho nao achado em produto._plano(uuid,date,numeric,date,date)';
  end if;
  execute replace(pg_get_functiondef('produto._plano(uuid,date,numeric,date,date)'::regprocedure), $a$  pote_dias := greatest(0, p_liq - coalesce(e.colchao,0));$a$, $b$  -- f_04: as parcelas que vencem na fatura deste mês saem do pote no dia 1, fora do ritmo do dia
  comp := produto._compromisso_mes(p_env, p_mes);
  pote_dias := greatest(0, p_liq - coalesce(e.colchao,0) - comp);$b$);
end $$;
do $$ begin
  if position($a$l.apagado_em is null and l.data = dd::date),0) order by dd)$a$ in (select prosrc from pg_proc where oid = 'produto._plano(uuid,date,numeric,date,date)'::regprocedure)) = 0 then
    raise exception 'f_04: trecho nao achado em produto._plano(uuid,date,numeric,date,date)';
  end if;
  execute replace(pg_get_functiondef('produto._plano(uuid,date,numeric,date,date)'::regprocedure), $a$l.apagado_em is null and l.data = dd::date),0) order by dd)$a$, $b$l.apagado_em is null and l.parcelas = 1 and l.data = dd::date),0) order by dd)$b$);
end $$;
do $$ begin
  if position($a$  fora := round(fora, 2);
end$a$ in (select prosrc from pg_proc where oid = 'produto._plano(uuid,date,numeric,date,date)'::regprocedure)) = 0 then
    raise exception 'f_04: trecho nao achado em produto._plano(uuid,date,numeric,date,date)';
  end if;
  execute replace(pg_get_functiondef('produto._plano(uuid,date,numeric,date,date)'::regprocedure), $a$  fora := round(fora, 2);
end$a$, $b$  gasto_mes := gasto_mes + comp;
  fora := round(fora, 2);
end$b$);
end $$;
do $$ begin
  if position($a$      where l.envelope_id = p_env and l.apagado_em is null and l.data >= ini and date_trunc('month', l.data) = k;$a$ in (select prosrc from pg_proc where oid = 'produto._diario(uuid,date)'::regprocedure)) = 0 then
    raise exception 'f_04: trecho nao achado em produto._diario(uuid,date)';
  end if;
  execute replace(pg_get_functiondef('produto._diario(uuid,date)'::regprocedure), $a$      where l.envelope_id = p_env and l.apagado_em is null and l.data >= ini and date_trunc('month', l.data) = k;$a$, $b$      where l.envelope_id = p_env and l.apagado_em is null and l.parcelas = 1 and l.data >= ini and date_trunc('month', l.data) = k;
    tot := tot + produto._compromisso_mes(p_env, k); tem := tem or tot > 0;$b$);
end $$;
do $$ begin
  if position($a$date_trunc('month', l.data) = x) then$a$ in (select prosrc from pg_proc where oid = 'produto._pote_inicio(uuid,date)'::regprocedure)) = 0 then
    raise exception 'f_04: trecho nao achado em produto._pote_inicio(uuid,date)';
  end if;
  execute replace(pg_get_functiondef('produto._pote_inicio(uuid,date)'::regprocedure), $a$date_trunc('month', l.data) = x) then$a$, $b$date_trunc('month', l.data) = x) or produto._compromisso_mes(p_env, x) > 0 then$b$);
end $$;
do $$ begin
  if position($a$        t := t - case when s < s0 then tx else produto._gasto(p_env, s, s + 6) end;
      end loop;$a$ in (select prosrc from pg_proc where oid = 'produto._pote_inicio(uuid,date)'::regprocedure)) = 0 then
    raise exception 'f_04: trecho nao achado em produto._pote_inicio(uuid,date)';
  end if;
  execute replace(pg_get_functiondef('produto._pote_inicio(uuid,date)'::regprocedure), $a$        t := t - case when s < s0 then tx else produto._gasto(p_env, s, s + 6) end;
      end loop;$a$, $b$        t := t - case when s < s0 then tx else produto._gasto(p_env, s, s + 6) end;
      end loop;
      t := t - produto._compromisso_mes(p_env, x);$b$);
end $$;
do $$ begin
  if position($a$    where l.envelope_id = e.id and l.apagado_em is null and date_trunc('month', l.data) = m0
        and produto._mes_fatura$a$ in (select prosrc from pg_proc where oid = 'produto._resumo(uuid,date)'::regprocedure)) = 0 then
    raise exception 'f_04: trecho nao achado em produto._resumo(uuid,date)';
  end if;
  execute replace(pg_get_functiondef('produto._resumo(uuid,date)'::regprocedure), $a$    where l.envelope_id = e.id and l.apagado_em is null and date_trunc('month', l.data) = m0
        and produto._mes_fatura$a$, $b$    where l.envelope_id = e.id and l.apagado_em is null and l.parcelas = 1 and date_trunc('month', l.data) = m0
        and produto._mes_fatura$b$);
end $$;
do $$ begin
  if position($a$      lim := produto._lim(e.id, m0); t := round(lim * 12 / 52, 2);$a$ in (select prosrc from pg_proc where oid = 'produto._resumo(uuid,date)'::regprocedure)) = 0 then
    raise exception 'f_04: trecho nao achado em produto._resumo(uuid,date)';
  end if;
  execute replace(pg_get_functiondef('produto._resumo(uuid,date)'::regprocedure), $a$      lim := produto._lim(e.id, m0); t := round(lim * 12 / 52, 2);$a$, $b$      lim := produto._lim(e.id, m0); t := round(greatest(0, lim - produto._compromisso_mes(e.id, m0)) * 12 / 52, 2);$b$);
end $$;
do $$ begin
  if position($a$produto._brl(lim) || ' por mês × 12 ÷ 52 = '$a$ in (select prosrc from pg_proc where oid = 'produto._resumo(uuid,date)'::regprocedure)) = 0 then
    raise exception 'f_04: trecho nao achado em produto._resumo(uuid,date)';
  end if;
  execute replace(pg_get_functiondef('produto._resumo(uuid,date)'::regprocedure), $a$produto._brl(lim) || ' por mês × 12 ÷ 52 = '$a$, $b$produto._brl(lim - produto._compromisso_mes(e.id, m0)) || ' por mês (já sem as parcelas) × 12 ÷ 52 = '$b$);
end $$;
do $$ begin
  if position($a$lx := produto._lim(p_env, x); tx := round(lx * 12 / 52, 2);$a$ in (select prosrc from pg_proc where oid = 'produto._pote_inicio(uuid,date)'::regprocedure)) = 0 then
    raise exception 'f_04: trecho nao achado em produto._pote_inicio(uuid,date)';
  end if;
  execute replace(pg_get_functiondef('produto._pote_inicio(uuid,date)'::regprocedure), $a$lx := produto._lim(p_env, x); tx := round(lx * 12 / 52, 2);$a$, $b$lx := produto._lim(p_env, x); tx := round(greatest(0, lx - produto._compromisso_mes(p_env, x)) * 12 / 52, 2);$b$);
end $$;
do $$ begin
  if position($a$      g := produto._gasto(e.id, m0, fim);$a$ in (select prosrc from pg_proc where oid = 'produto._resumo(uuid,date)'::regprocedure)) = 0 then
    raise exception 'f_04: trecho nao achado em produto._resumo(uuid,date)';
  end if;
  execute replace(pg_get_functiondef('produto._resumo(uuid,date)'::regprocedure), $a$      g := produto._gasto(e.id, m0, fim);$a$, $b$      g := produto._gasto(e.id, m0, fim) + produto._compromisso_mes(e.id, m0);$b$);
end $$;
do $$ begin
  if position($a$    o := o || jsonb_build_object('livre', livre, 'hoje', hoje_v, 'colchao', col, 'colchao_meta', e.colchao, 'no_cartao', cart, 'sem_limite', livre is null);$a$ in (select prosrc from pg_proc where oid = 'produto._resumo(uuid,date)'::regprocedure)) = 0 then
    raise exception 'f_04: trecho nao achado em produto._resumo(uuid,date)';
  end if;
  execute replace(pg_get_functiondef('produto._resumo(uuid,date)'::regprocedure), $a$    o := o || jsonb_build_object('livre', livre, 'hoje', hoje_v, 'colchao', col, 'colchao_meta', e.colchao, 'no_cartao', cart, 'sem_limite', livre is null);$a$, $b$    if produto._compromisso_mes(e.id, m0) > 0 then
      expl := expl || jsonb_build_object('linha', e.nome || ': ' || produto._brl(produto._compromisso_mes(e.id, m0)) || ' de parcelas que vencem na fatura deste mês, tiradas no dia 1', 'valor', produto._compromisso_mes(e.id, m0));
    end if;
    o := o || jsonb_build_object('livre', livre, 'hoje', hoje_v, 'colchao', col, 'colchao_meta', e.colchao, 'no_cartao', cart, 'parcelas_mes', produto._compromisso_mes(e.id, m0), 'sem_limite', livre is null);$b$);
end $$;
do $$ begin
  if position($a$'Compra no cartão conta no dia da compra; o banco cobra na fatura (veja faturas)'$a$ in (select prosrc from pg_proc where oid = 'produto._resumo(uuid,date)'::regprocedure)) = 0 then
    raise exception 'f_04: trecho nao achado em produto._resumo(uuid,date)';
  end if;
  execute replace(pg_get_functiondef('produto._resumo(uuid,date)'::regprocedure), $a$'Compra no cartão conta no dia da compra; o banco cobra na fatura (veja faturas)'$a$, $b$'Compra à vista no cartão conta no dia da compra; compra parcelada conta cada parcela no mês da fatura, no dia 1 (veja faturas)'$b$);
end $$;
do $$ begin
  if position($a$select count(*), coalesce(sum(l.valor), 0) into n, tot from produto.lancamentos l where l.familia_id = f and l.data = hoje and l.apagado_em is null;$a$ in (select prosrc from pg_proc where oid = 'produto._esc_brutas(uuid,timestamp with time zone,text,text)'::regprocedure)) = 0 then
    raise exception 'f_04: trecho nao achado em produto._esc_brutas(uuid,timestamp with time zone,text,text)';
  end if;
  execute replace(pg_get_functiondef('produto._esc_brutas(uuid,timestamp with time zone,text,text)'::regprocedure), $a$select count(*), coalesce(sum(l.valor), 0) into n, tot from produto.lancamentos l where l.familia_id = f and l.data = hoje and l.apagado_em is null;$a$, $b$select count(*), coalesce(sum(l.valor) filter (where l.parcelas = 1), 0) into n, tot from produto.lancamentos l where l.familia_id = f and l.data = hoje and l.apagado_em is null;$b$);
end $$;

-- portão: todos os testes que existirem no banco têm que continuar 100% ok
do $$
declare t text; n int;
begin
  foreach t in array array['teste_vazamento','teste_contas_casos','teste_guardado','teste_escritorio','teste_tranca_f','teste_futuro_ir'] loop
    if to_regprocedure('produto.' || t || '()') is not null then
      execute format('select count(*) from produto.%I() where not ok', t) into n;
      if n > 0 then raise exception 'f_04: % tem % caso(s) falhando; nada foi gravado', t, n; end if;
    end if;
  end loop;
  select count(*) into n from produto.teste_conta() where not ok;
  if n > 0 then raise exception 'f_04: teste_conta tem % caso(s) falhando; nada foi gravado', n; end if;
end $$;
