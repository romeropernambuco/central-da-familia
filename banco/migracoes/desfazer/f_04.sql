-- Desfaz f_04: volta as contas (_plano, _diario, _pote_inicio, _resumo, _esc_brutas) pelo texto exato,
-- lancar, lancar_com_chave, _lancar, _gasto e _faturas como eram (copiado do banco em 13/11/26) e tira as colunas.
-- Recusa se algum lançamento já usa parcelas > 1 ou pago_por (dado não se apaga sem conferência).
do $$ begin
  if exists (select 1 from produto.lancamentos where parcelas <> 1 or pago_por is not null) then
    raise exception 'desfazer f_04: ha lancamentos parcelados ou com pago_por; confira antes de tirar as colunas';
  end if;
end $$;

do $$ begin
  if position($a$select count(*), coalesce(sum(l.valor) filter (where l.parcelas = 1), 0) into n, tot from produto.lancamentos l where l.familia_id = f and l.data = hoje and l.apagado_em is null;$a$ in (select prosrc from pg_proc where oid = 'produto._esc_brutas(uuid,timestamp with time zone,text,text)'::regprocedure)) = 0 then
    raise exception 'desfazer f_04: trecho nao achado em produto._esc_brutas(uuid,timestamp with time zone,text,text)';
  end if;
  execute replace(pg_get_functiondef('produto._esc_brutas(uuid,timestamp with time zone,text,text)'::regprocedure), $a$select count(*), coalesce(sum(l.valor) filter (where l.parcelas = 1), 0) into n, tot from produto.lancamentos l where l.familia_id = f and l.data = hoje and l.apagado_em is null;$a$, $b$select count(*), coalesce(sum(l.valor), 0) into n, tot from produto.lancamentos l where l.familia_id = f and l.data = hoje and l.apagado_em is null;$b$);
end $$;
do $$ begin
  if position($a$'Compra à vista no cartão conta no dia da compra; compra parcelada conta cada parcela no mês da fatura, no dia 1 (veja faturas)'$a$ in (select prosrc from pg_proc where oid = 'produto._resumo(uuid,date)'::regprocedure)) = 0 then
    raise exception 'desfazer f_04: trecho nao achado em produto._resumo(uuid,date)';
  end if;
  execute replace(pg_get_functiondef('produto._resumo(uuid,date)'::regprocedure), $a$'Compra à vista no cartão conta no dia da compra; compra parcelada conta cada parcela no mês da fatura, no dia 1 (veja faturas)'$a$, $b$'Compra no cartão conta no dia da compra; o banco cobra na fatura (veja faturas)'$b$);
end $$;
do $$ begin
  if position($a$    if produto._compromisso_mes(e.id, m0) > 0 then
      expl := expl || jsonb_build_object('linha', e.nome || ': ' || produto._brl(produto._compromisso_mes(e.id, m0)) || ' de parcelas que vencem na fatura deste mês, tiradas no dia 1', 'valor', produto._compromisso_mes(e.id, m0));
    end if;
    o := o || jsonb_build_object('livre', livre, 'hoje', hoje_v, 'colchao', col, 'colchao_meta', e.colchao, 'no_cartao', cart, 'parcelas_mes', produto._compromisso_mes(e.id, m0), 'sem_limite', livre is null);$a$ in (select prosrc from pg_proc where oid = 'produto._resumo(uuid,date)'::regprocedure)) = 0 then
    raise exception 'desfazer f_04: trecho nao achado em produto._resumo(uuid,date)';
  end if;
  execute replace(pg_get_functiondef('produto._resumo(uuid,date)'::regprocedure), $a$    if produto._compromisso_mes(e.id, m0) > 0 then
      expl := expl || jsonb_build_object('linha', e.nome || ': ' || produto._brl(produto._compromisso_mes(e.id, m0)) || ' de parcelas que vencem na fatura deste mês, tiradas no dia 1', 'valor', produto._compromisso_mes(e.id, m0));
    end if;
    o := o || jsonb_build_object('livre', livre, 'hoje', hoje_v, 'colchao', col, 'colchao_meta', e.colchao, 'no_cartao', cart, 'parcelas_mes', produto._compromisso_mes(e.id, m0), 'sem_limite', livre is null);$a$, $b$    o := o || jsonb_build_object('livre', livre, 'hoje', hoje_v, 'colchao', col, 'colchao_meta', e.colchao, 'no_cartao', cart, 'sem_limite', livre is null);$b$);
end $$;
do $$ begin
  if position($a$      g := produto._gasto(e.id, m0, fim) + produto._compromisso_mes(e.id, m0);$a$ in (select prosrc from pg_proc where oid = 'produto._resumo(uuid,date)'::regprocedure)) = 0 then
    raise exception 'desfazer f_04: trecho nao achado em produto._resumo(uuid,date)';
  end if;
  execute replace(pg_get_functiondef('produto._resumo(uuid,date)'::regprocedure), $a$      g := produto._gasto(e.id, m0, fim) + produto._compromisso_mes(e.id, m0);$a$, $b$      g := produto._gasto(e.id, m0, fim);$b$);
end $$;
do $$ begin
  execute replace(pg_get_functiondef('produto._pote_inicio(uuid,date)'::regprocedure), $b$lx := produto._lim(p_env, x); tx := round(greatest(0, lx - produto._compromisso_mes(p_env, x)) * 12 / 52, 2);$b$, $a$lx := produto._lim(p_env, x); tx := round(lx * 12 / 52, 2);$a$);
  execute replace(pg_get_functiondef('produto._resumo(uuid,date)'::regprocedure), $b$produto._brl(lim - produto._compromisso_mes(e.id, m0)) || ' por mês (já sem as parcelas) × 12 ÷ 52 = '$b$, $a$produto._brl(lim) || ' por mês × 12 ÷ 52 = '$a$);
  execute replace(pg_get_functiondef('produto._resumo(uuid,date)'::regprocedure), $b$      lim := produto._lim(e.id, m0); t := round(greatest(0, lim - produto._compromisso_mes(e.id, m0)) * 12 / 52, 2);$b$, $a$      lim := produto._lim(e.id, m0); t := round(lim * 12 / 52, 2);$a$);
end $$;
do $$ begin
  if position($a$    where l.envelope_id = e.id and l.apagado_em is null and l.parcelas = 1 and date_trunc('month', l.data) = m0
        and produto._mes_fatura$a$ in (select prosrc from pg_proc where oid = 'produto._resumo(uuid,date)'::regprocedure)) = 0 then
    raise exception 'desfazer f_04: trecho nao achado em produto._resumo(uuid,date)';
  end if;
  execute replace(pg_get_functiondef('produto._resumo(uuid,date)'::regprocedure), $a$    where l.envelope_id = e.id and l.apagado_em is null and l.parcelas = 1 and date_trunc('month', l.data) = m0
        and produto._mes_fatura$a$, $b$    where l.envelope_id = e.id and l.apagado_em is null and date_trunc('month', l.data) = m0
        and produto._mes_fatura$b$);
end $$;
do $$ begin
  if position($a$        t := t - case when s < s0 then tx else produto._gasto(p_env, s, s + 6) end;
      end loop;
      t := t - produto._compromisso_mes(p_env, x);$a$ in (select prosrc from pg_proc where oid = 'produto._pote_inicio(uuid,date)'::regprocedure)) = 0 then
    raise exception 'desfazer f_04: trecho nao achado em produto._pote_inicio(uuid,date)';
  end if;
  execute replace(pg_get_functiondef('produto._pote_inicio(uuid,date)'::regprocedure), $a$        t := t - case when s < s0 then tx else produto._gasto(p_env, s, s + 6) end;
      end loop;
      t := t - produto._compromisso_mes(p_env, x);$a$, $b$        t := t - case when s < s0 then tx else produto._gasto(p_env, s, s + 6) end;
      end loop;$b$);
end $$;
do $$ begin
  if position($a$date_trunc('month', l.data) = x) or produto._compromisso_mes(p_env, x) > 0 then$a$ in (select prosrc from pg_proc where oid = 'produto._pote_inicio(uuid,date)'::regprocedure)) = 0 then
    raise exception 'desfazer f_04: trecho nao achado em produto._pote_inicio(uuid,date)';
  end if;
  execute replace(pg_get_functiondef('produto._pote_inicio(uuid,date)'::regprocedure), $a$date_trunc('month', l.data) = x) or produto._compromisso_mes(p_env, x) > 0 then$a$, $b$date_trunc('month', l.data) = x) then$b$);
end $$;
do $$ begin
  if position($a$      where l.envelope_id = p_env and l.apagado_em is null and l.parcelas = 1 and l.data >= ini and date_trunc('month', l.data) = k;
    tot := tot + produto._compromisso_mes(p_env, k); tem := tem or tot > 0;$a$ in (select prosrc from pg_proc where oid = 'produto._diario(uuid,date)'::regprocedure)) = 0 then
    raise exception 'desfazer f_04: trecho nao achado em produto._diario(uuid,date)';
  end if;
  execute replace(pg_get_functiondef('produto._diario(uuid,date)'::regprocedure), $a$      where l.envelope_id = p_env and l.apagado_em is null and l.parcelas = 1 and l.data >= ini and date_trunc('month', l.data) = k;
    tot := tot + produto._compromisso_mes(p_env, k); tem := tem or tot > 0;$a$, $b$      where l.envelope_id = p_env and l.apagado_em is null and l.data >= ini and date_trunc('month', l.data) = k;$b$);
end $$;
do $$ begin
  if position($a$  gasto_mes := gasto_mes + comp;
  fora := round(fora, 2);
end$a$ in (select prosrc from pg_proc where oid = 'produto._plano(uuid,date,numeric,date,date)'::regprocedure)) = 0 then
    raise exception 'desfazer f_04: trecho nao achado em produto._plano(uuid,date,numeric,date,date)';
  end if;
  execute replace(pg_get_functiondef('produto._plano(uuid,date,numeric,date,date)'::regprocedure), $a$  gasto_mes := gasto_mes + comp;
  fora := round(fora, 2);
end$a$, $b$  fora := round(fora, 2);
end$b$);
end $$;
do $$ begin
  if position($a$l.apagado_em is null and l.parcelas = 1 and l.data = dd::date),0) order by dd)$a$ in (select prosrc from pg_proc where oid = 'produto._plano(uuid,date,numeric,date,date)'::regprocedure)) = 0 then
    raise exception 'desfazer f_04: trecho nao achado em produto._plano(uuid,date,numeric,date,date)';
  end if;
  execute replace(pg_get_functiondef('produto._plano(uuid,date,numeric,date,date)'::regprocedure), $a$l.apagado_em is null and l.parcelas = 1 and l.data = dd::date),0) order by dd)$a$, $b$l.apagado_em is null and l.data = dd::date),0) order by dd)$b$);
end $$;
do $$ begin
  if position($a$  -- f_04: as parcelas que vencem na fatura deste mês saem do pote no dia 1, fora do ritmo do dia
  comp := produto._compromisso_mes(p_env, p_mes);
  pote_dias := greatest(0, p_liq - coalesce(e.colchao,0) - comp);$a$ in (select prosrc from pg_proc where oid = 'produto._plano(uuid,date,numeric,date,date)'::regprocedure)) = 0 then
    raise exception 'desfazer f_04: trecho nao achado em produto._plano(uuid,date,numeric,date,date)';
  end if;
  execute replace(pg_get_functiondef('produto._plano(uuid,date,numeric,date,date)'::regprocedure), $a$  -- f_04: as parcelas que vencem na fatura deste mês saem do pote no dia 1, fora do ritmo do dia
  comp := produto._compromisso_mes(p_env, p_mes);
  pote_dias := greatest(0, p_liq - coalesce(e.colchao,0) - comp);$a$, $b$  pote_dias := greatest(0, p_liq - coalesce(e.colchao,0));$b$);
end $$;
do $$ begin
  if position($a$declare comp numeric; e record; fim date;$a$ in (select prosrc from pg_proc where oid = 'produto._plano(uuid,date,numeric,date,date)'::regprocedure)) = 0 then
    raise exception 'desfazer f_04: trecho nao achado em produto._plano(uuid,date,numeric,date,date)';
  end if;
  execute replace(pg_get_functiondef('produto._plano(uuid,date,numeric,date,date)'::regprocedure), $a$declare comp numeric; e record; fim date;$a$, $b$declare e record; fim date;$b$);
end $$;

drop function produto.lancar(uuid,uuid,numeric,date,text,uuid,numeric,smallint);
drop function produto.lancar_com_chave(uuid,uuid,numeric,uuid,date,text,uuid,numeric,smallint);
CREATE OR REPLACE FUNCTION produto._lancar(familia uuid, envelope uuid, valor numeric, data date, descricao text, cartao uuid, segundos numeric, chave uuid)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare v_id uuid; v_dup uuid; v_data date := coalesce(_lancar.data, produto._hoje()); v_valor numeric := round(_lancar.valor, 2);
        v_desc text := nullif(left(trim(_lancar.descricao), 300), ''); v_papel text;
begin
  if (select auth.uid()) is null then raise exception 'precisa entrar no app antes de lancar' using errcode = '42501'; end if;
  if v_valor is null or v_valor <= 0 then raise exception 'o valor tem que ser maior que zero' using errcode = '22023'; end if;
  if v_valor > 1000000 then raise exception 'o valor passou de 1 milhao; confira os numeros' using errcode = '22023'; end if;
  if v_data < date '2000-01-01' or v_data > date '2100-12-31' then raise exception 'a data esta fora do calendario do app' using errcode = '22023'; end if;
  v_papel := produto.meu_papel(_lancar.familia);
  if _lancar.chave is not null then
    -- chave do toque: a mesma chave nunca grava 2 vezes, nem depois de 10 s, nem com a internet caindo no meio
    perform pg_advisory_xact_lock(hashtextextended('lancar:' || _lancar.familia::text || ':' || _lancar.chave::text, 0));
    select l.id into v_dup from produto.lancamentos l where l.familia_id = _lancar.familia and l.chave_cliente = _lancar.chave limit 1;
  else
    perform pg_advisory_xact_lock(hashtextextended('lancar:' || (select auth.uid())::text || ':' || coalesce(_lancar.envelope::text, ''), 0));
    select l.id into v_dup from produto.lancamentos l
     where l.familia_id = _lancar.familia and l.envelope_id = _lancar.envelope and l.valor = v_valor and l.data = v_data
       and l.descricao is not distinct from v_desc and l.cartao_id is not distinct from _lancar.cartao
       and l.autor = (select auth.uid()) and l.apagado_em is null and l.criado_em > now() - interval '10 seconds'
     limit 1;
  end if;
  if v_dup is null then
    v_id := gen_random_uuid();
    begin
      insert into produto.lancamentos (id, familia_id, envelope_id, cartao_id, valor, data, descricao, chave_cliente)
      values (v_id, _lancar.familia, _lancar.envelope, _lancar.cartao, v_valor, v_data, v_desc, _lancar.chave);
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
       then (select json_build_object('id', l.id, 'envelope_id', l.envelope_id, 'data', l.data, 'descricao', l.descricao, 'criado_em', l.criado_em) from produto.lancamentos l where l.id = v_id)
       else (select to_json(l) from produto.lancamentos l where l.id = v_id) end,
    'repetido', v_dup is not null,
    'resumo', produto._resumo(_lancar.familia, produto._hoje()));
end $function$;
drop function produto._lancar(uuid,uuid,numeric,date,text,uuid,numeric,uuid,smallint);
drop function produto._lanc_repetido(uuid, uuid, uuid, numeric, date, text, uuid, smallint);

CREATE OR REPLACE FUNCTION produto.lancar(familia uuid, envelope uuid, valor numeric, data date DEFAULT NULL::date, descricao text DEFAULT NULL::text, cartao uuid DEFAULT NULL::uuid, segundos numeric DEFAULT NULL::numeric)
 RETURNS json
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select produto._lancar(familia, envelope, valor, data, descricao, cartao, segundos, null) $function$;
revoke all on function produto.lancar(uuid,uuid,numeric,date,text,uuid,numeric) from public, anon;
grant execute on function produto.lancar(uuid,uuid,numeric,date,text,uuid,numeric) to authenticated;

CREATE OR REPLACE FUNCTION produto.lancar_com_chave(familia uuid, envelope uuid, valor numeric, chave uuid, data date DEFAULT NULL::date, descricao text DEFAULT NULL::text, cartao uuid DEFAULT NULL::uuid, segundos numeric DEFAULT NULL::numeric)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if chave is null then raise exception 'falta a chave do toque' using errcode = '22023'; end if;
  return produto._lancar(familia, envelope, valor, data, descricao, cartao, segundos, chave);
end $function$;
revoke all on function produto.lancar_com_chave(uuid,uuid,numeric,uuid,date,text,uuid,numeric) from public, anon;
grant execute on function produto.lancar_com_chave(uuid,uuid,numeric,uuid,date,text,uuid,numeric) to authenticated;

CREATE OR REPLACE FUNCTION produto._gasto(p_env uuid, p_de date, p_ate date)
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select coalesce(sum(l.valor),0) from produto.lancamentos l
   where l.envelope_id = p_env and l.apagado_em is null and l.data between p_de and p_ate $function$;

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
    left join lateral (select sum(l.valor) total, count(*) n from produto.lancamentos l
       where l.cartao_id = c.id and l.familia_id = c.familia_id and l.apagado_em is null
         and produto._mes_fatura(c.dia_fechamento, c.dia_vencimento, l.data) = m.mes) x on true
    where c.familia_id = p_familia and (c.ativo or coalesce(x.n,0) > 0)), '[]'::jsonb);
end $function$;

drop function produto._compromisso_mes(uuid, date);
drop function produto._parcela_valor(numeric, smallint, integer);
alter table produto.lancamentos drop constraint lancamentos_parcelado_no_cartao;
alter table produto.lancamentos drop constraint lancamentos_pago_por_fk;
alter table produto.lancamentos drop column pago_por, drop column parcelas;
