create or replace function produto._hoje() returns date language sql stable set search_path = '' as
$$ select (now() at time zone 'America/Recife')::date $$;

create or replace function produto._brl(v numeric) returns text language sql immutable set search_path = '' as
$$ select case when v < 0 then '-' else '' end || 'R$ ' || translate(to_char(abs(round(v,2)), 'FM999G999G990D00'), ',.', '.,') $$;

create or replace function produto._peso(p_peso_fds numeric, d date) returns numeric language sql stable set search_path = '' as
$$ select case when extract(isodow from d) in (6,7) or to_char(d,'MM-DD') in ('12-24','12-31')
            or exists (select 1 from produto.feriados f where f.data = d)
       then greatest(coalesce(p_peso_fds,1.5),1) else 1 end $$;

create or replace function produto._lim(p_env uuid, p_mes date) returns numeric language sql stable set search_path = '' as
$$ select coalesce(
     (select l.valor from produto.limites_mes l where l.envelope_id = p_env and l.mes <= to_char(p_mes,'YYYY-MM') order by l.mes desc limit 1),
     (select l.valor from produto.limites_mes l where l.envelope_id = p_env order by l.mes asc limit 1),
     (select e.limite_mes from produto.envelopes e where e.id = p_env), 0) $$;

create or replace function produto._segundas(p_mes date) returns setof date language sql immutable set search_path = '' as
$$ select d::date from generate_series(date_trunc('month',p_mes), date_trunc('month',p_mes) + interval '1 month' - interval '1 day', interval '1 day') d
   where extract(isodow from d) = 1 order by 1 $$;

create or replace function produto._gasto(p_env uuid, p_de date, p_ate date) returns numeric language sql stable set search_path = '' as
$$ select coalesce(sum(l.valor),0) from produto.lancamentos l
   where l.envelope_id = p_env and l.apagado_em is null and l.data between p_de and p_ate $$;

create or replace function produto._mes_fatura(p_fecha int, p_vence int, d date) returns date language sql immutable set search_path = '' as
$$ select (date_trunc('month', d)
          + (case when extract(day from d) < least(p_fecha, extract(day from date_trunc('month',d) + interval '1 month' - interval '1 day')) then 0 else 1 end) * interval '1 month'
          + (case when p_vence > p_fecha then 0 else 1 end) * interval '1 month')::date $$;

create or replace function produto._pote_inicio(p_env uuid, p_mes date) returns numeric language plpgsql stable set search_path = '' as
$$
declare ini date; s0 date; x date; lx numeric; tx numeric; t numeric := 0; s date;
begin
  select min(l.data) into ini from produto.lancamentos l where l.envelope_id = p_env and l.apagado_em is null;
  if ini is null then return 0; end if;
  s0 := ini - (extract(isodow from ini)::int - 1);
  x := date_trunc('month', s0)::date;
  while x < date_trunc('month', p_mes)::date loop
    if x = date_trunc('month', s0)::date or exists (select 1 from produto.lancamentos l where l.envelope_id = p_env and l.apagado_em is null and date_trunc('month', l.data) = x) then
      lx := produto._lim(p_env, x); tx := round(lx * 12 / 52, 2); t := t + lx;
      for s in select * from produto._segundas(x) loop
        t := t - case when s < s0 then tx else produto._gasto(p_env, s, s + 6) end;
      end loop;
    end if;
    x := (x + interval '1 month')::date;
  end loop;
  return round(t, 2);
end $$;

create or replace function produto._plano(p_env uuid, p_mes date, p_liq numeric, p_ini date, p_hoje date,
  out pote_dias numeric, out w_total numeric, out fora numeric, out valor_dia numeric, out valor_dia_plano numeric,
  out gasto_hoje numeric, out saldo_hoje numeric, out gasto_mes numeric)
language plpgsql stable set search_path = '' as
$$
declare e record; fim date; n int; i int; d date; pesos numeric[]; gastos numeric[]; antes numeric := 0; saldo numeric; pode numeric; wrem numeric; g numeric;
begin
  select en.peso_fds, en.colchao into e from produto.envelopes en where en.id = p_env;
  fim := (date_trunc('month', p_mes) + interval '1 month' - interval '1 day')::date;
  n := extract(day from fim)::int;
  pote_dias := greatest(0, p_liq - coalesce(e.colchao,0));
  select array_agg(produto._peso(e.peso_fds, dd::date) order by dd),
         array_agg(coalesce((select sum(l.valor) from produto.lancamentos l where l.envelope_id = p_env and l.apagado_em is null and l.data = dd::date),0) order by dd)
    into pesos, gastos from generate_series(date_trunc('month', p_mes), fim, interval '1 day') dd;
  select sum(x) into w_total from unnest(pesos) x;
  fora := 0; gasto_mes := 0; valor_dia := 0; valor_dia_plano := 0; gasto_hoje := 0;
  for i in 1..n loop
    d := (date_trunc('month', p_mes) + (i-1) * interval '1 day')::date;
    select sum(x) into wrem from unnest(pesos[i:n]) x;
    saldo := pote_dias - antes;
    pode := case when saldo <= 0 then 0 else saldo * pesos[i] / wrem end;
    g := case when d < p_ini then 0 else gastos[i] end;
    gasto_mes := gasto_mes + g;
    if d = p_hoje then valor_dia := round(pode,2); valor_dia_plano := round(pote_dias * pesos[i] / w_total, 2); gasto_hoje := g; saldo_hoje := round(saldo,2); end if;
    if d < p_ini then antes := antes + pode; fora := fora + pode;
    elsif d < p_hoje then antes := antes + g;
    elsif d = p_hoje then antes := antes + greatest(g, pode);
    else antes := antes + pode; end if;
  end loop;
  fora := round(fora, 2);
end $$;

create or replace function produto._diario(p_env uuid, p_hoje date) returns jsonb language plpgsql stable set search_path = '' as
$$
declare ini date; m0 date := date_trunc('month', p_hoje)::date; k date; liq numeric; falta numeric := 0; tot numeric; tem boolean; p record; fora_ini numeric := 0;
begin
  select min(l.data) into ini from produto.lancamentos l where l.envelope_id = p_env and l.apagado_em is null;
  ini := least(coalesce(ini, p_hoje), p_hoje);
  k := least(date_trunc('month', ini)::date, m0);
  liq := produto._lim(p_env, k);
  while k < m0 loop
    if k = date_trunc('month', ini)::date then
      select * into p from produto._plano(p_env, k, liq, ini, (k + interval '1 month' - interval '1 day')::date);
      fora_ini := p.fora;
    else fora_ini := 0; end if;
    select coalesce(sum(l.valor),0), count(*) > 0 into tot, tem from produto.lancamentos l
      where l.envelope_id = p_env and l.apagado_em is null and l.data >= ini and date_trunc('month', l.data) = k;
    falta := case when tem then greatest(0, tot + fora_ini - liq) else 0 end;
    k := (k + interval '1 month')::date;
    liq := produto._lim(p_env, k) - falta;
  end loop;
  select * into p from produto._plano(p_env, m0, liq, ini, p_hoje);
  return jsonb_build_object('inicio', ini, 'liquido', round(liq,2), 'falta_mes_anterior', round(falta,2), 'fora', p.fora,
    'pote_dias', round(p.pote_dias,2), 'valor_dia', p.valor_dia, 'valor_dia_plano', p.valor_dia_plano, 'gasto_hoje', p.gasto_hoje,
    'pode_hoje', round(p.valor_dia - p.gasto_hoje, 2), 'ate_fim_mes', round(coalesce(p.saldo_hoje,0) - p.gasto_hoje, 2),
    'mes_valor', round(liq - p.fora, 2), 'gasto_mes', round(p.gasto_mes, 2));
end $$;

create or replace function produto._resumo(p_familia uuid, p_hoje date) returns jsonb language plpgsql stable set search_path = '' as
$$
declare
  papel text; meu_env uuid; m0 date := date_trunc('month', p_hoje)::date;
  fim date := (date_trunc('month', p_hoje) + interval '1 month' - interval '1 day')::date;
  dias int; seg date; dl int; e record; envs jsonb := '[]'::jsonb; expl jsonb := '[]'::jsonb; o jsonb; dj jsonb;
  lim numeric; g numeric; livre numeric; hoje_v numeric; col numeric; t numeric; gs numeric; nseg int; cart numeric;
  tot_hoje numeric := 0; tot_livre numeric := 0; tot_col numeric := 0; conta_hoje boolean;
begin
  dias := fim - p_hoje + 1;
  seg := p_hoje - (extract(isodow from p_hoje)::int - 1);
  dl := 8 - extract(isodow from p_hoje)::int;
  if (select auth.uid()) is not null then
    papel := produto.meu_papel(p_familia);
    if papel is null then raise exception 'sem acesso a esta familia' using errcode = '42501'; end if;
    if papel = 'pessoa' then select m.envelope_id into meu_env from produto.membros m where m.familia_id = p_familia and m.user_id = (select auth.uid()); end if;
  end if;
  for e in select en.* from produto.envelopes en where en.familia_id = p_familia order by en.criado_em, en.nome loop
    hoje_v := null; livre := null; col := 0;
    select coalesce(sum(l.valor),0) into cart from produto.lancamentos l join produto.cartoes c on c.id = l.cartao_id
      where l.envelope_id = e.id and l.apagado_em is null and date_trunc('month', l.data) = m0
        and produto._mes_fatura(c.dia_fechamento, c.dia_vencimento, l.data) > m0;
    if e.regra = 'semanal' then
      lim := produto._lim(e.id, m0); t := round(lim * 12 / 52, 2);
      select count(*) into nseg from produto._segundas(m0);
      gs := produto._gasto(e.id, seg, seg + 6);
      select coalesce(sum(produto._gasto(e.id, s, s + 6)),0) into g from produto._segundas(m0) s;
      o := jsonb_build_object('id', e.id, 'nome', e.nome, 'regra', e.regra, 'casa', e.casa, 'limite_base', lim,
             'limite_mes', round(t * nseg, 2), 'gasto_mes', g, 'teto_semana', t, 'gasto_semana', gs, 'restam_semana', round(t - gs, 2),
             'segundas', nseg, 'pote_inicio', produto._pote_inicio(e.id, m0),
             'texto', produto._brl(t) || ' por semana · ' || produto._brl(t * nseg) || ' neste mês (' || nseg || ' segundas' || case when nseg = 5 then ', a 5ª sai do pote' else '' end || ')');
      if lim > 0 then
        livre := round(t * nseg - g, 2); hoje_v := round(greatest(0, t - gs) / dl, 2);
        expl := expl || jsonb_build_object('linha', e.nome || ': ' || produto._brl(lim) || ' por mês × 12 ÷ 52 = ' || produto._brl(t) || ' por semana', 'valor', t)
                     || jsonb_build_object('linha', e.nome || ': ' || produto._brl(t) || ' − ' || produto._brl(gs) || ' gastos desde segunda = ' || produto._brl(t - gs) || ' até domingo, ÷ ' || dl || ' dias', 'valor', hoje_v);
      end if;
    elsif e.regra = 'diario' then
      dj := produto._diario(e.id, p_hoje);
      lim := (dj->>'mes_valor')::numeric; g := (dj->>'gasto_mes')::numeric;
      o := jsonb_build_object('id', e.id, 'nome', e.nome, 'regra', e.regra, 'casa', e.casa, 'limite_base', produto._lim(e.id, m0),
             'limite_mes', lim, 'gasto_mes', g, 'valor_dia', (dj->>'valor_dia')::numeric, 'gasto_hoje', (dj->>'gasto_hoje')::numeric,
             'ate_fim_mes', (dj->>'ate_fim_mes')::numeric, 'inicio', dj->'inicio', 'falta_mes_anterior', (dj->>'falta_mes_anterior')::numeric,
             'peso_fds', e.peso_fds);
      if produto._lim(e.id, m0) > 0 then
        livre := round(lim - g, 2); hoje_v := greatest(0, (dj->>'pode_hoje')::numeric);
        expl := expl || jsonb_build_object('linha', e.nome || ': ' || produto._brl((dj->>'pote_dias')::numeric) || ' pros dias (limite − ' || produto._brl(e.colchao) || ' de colchão' ||
                  case when (dj->>'falta_mes_anterior')::numeric > 0 then ' − ' || produto._brl((dj->>'falta_mes_anterior')::numeric) || ' que o mês passado passou' else '' end ||
                  '), dividido pelos dias; fim de semana e feriado valem ' || replace(e.peso_fds::text, '.', ',') || ' dia', 'valor', (dj->>'pote_dias')::numeric)
                     || jsonb_build_object('linha', e.nome || ': o dia de hoje tem ' || produto._brl((dj->>'valor_dia')::numeric) || ' − ' || produto._brl((dj->>'gasto_hoje')::numeric) || ' gastos hoje', 'valor', hoje_v);
      end if;
    else
      lim := produto._lim(e.id, m0);
      g := produto._gasto(e.id, m0, fim);
      o := jsonb_build_object('id', e.id, 'nome', e.nome, 'regra', e.regra, 'casa', e.casa, 'limite_base', lim, 'limite_mes', lim, 'gasto_mes', g);
      if lim > 0 then
        livre := round(lim - g, 2); hoje_v := round(greatest(0, livre - e.colchao) / dias, 2);
        expl := expl || jsonb_build_object('linha', e.nome || ': ' || produto._brl(lim) || ' − ' || produto._brl(g) || ' gastos no mês = ' || produto._brl(livre) || ' livres', 'valor', livre)
                     || jsonb_build_object('linha', e.nome || ': ' || produto._brl(greatest(0, livre - e.colchao)) || ' (livre menos o colchão) ÷ ' || dias || ' dias que faltam', 'valor', hoje_v);
      end if;
    end if;
    if livre is not null then col := greatest(0, least(e.colchao, livre)); end if;
    if cart > 0 then
      expl := expl || jsonb_build_object('linha', e.nome || ': ' || produto._brl(cart) || ' no cartão, já descontado; o banco cobra na fatura', 'valor', cart);
    end if;
    o := o || jsonb_build_object('livre', livre, 'hoje', hoje_v, 'colchao', col, 'colchao_meta', e.colchao, 'no_cartao', cart, 'sem_limite', livre is null);
    envs := envs || o;
    conta_hoje := case when papel = 'pessoa' then e.id = meu_env when papel = 'equipe' then e.casa else true end;
    if conta_hoje and hoje_v is not null then tot_hoje := tot_hoje + hoje_v; end if;
    if livre is not null then tot_livre := tot_livre + livre; tot_col := tot_col + col; end if;
  end loop;
  expl := jsonb_build_object('linha', 'Livre do mês = soma do que cada envelope ainda tem', 'valor', round(tot_livre,2))
       || jsonb_build_object('linha', 'Hoje você pode gastar = soma do valor de hoje dos envelopes ' || case when papel = 'pessoa' then 'seu' when papel = 'equipe' then 'da casa' else 'da família' end, 'valor', round(tot_hoje,2))
       || jsonb_build_object('linha', 'Colchão = reserva que não entra no valor do dia; se o mês passar, ele cobre até zerar, nunca fica negativo', 'valor', round(tot_col,2))
       || expl;
  return jsonb_build_object('familia_id', p_familia, 'data', p_hoje, 'papel', coalesce(papel,'sistema'),
    'pode_gastar_hoje', round(tot_hoje,2), 'livre_mes', round(tot_livre,2), 'colchao', round(tot_col,2),
    'dias_restantes', dias, 'envelopes', envs, 'explicacao', expl,
    'regra_cartao', 'Compra no cartão conta no dia da compra; o banco cobra na fatura (veja faturas)');
end $$;

create or replace function produto.resumo_hoje(familia uuid) returns json language sql stable security invoker set search_path = '' as
$$ select produto._resumo(familia, produto._hoje())::json $$;

create or replace function produto._faturas(p_familia uuid, p_de date, p_meses int) returns jsonb language plpgsql stable set search_path = '' as
$$
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
end $$;

create or replace function produto.faturas(familia uuid, meses int default 3) returns json language sql stable security invoker set search_path = '' as
$$ select jsonb_build_object('regra', 'A compra conta no saldo pelo dia da compra e na fatura pelo mês de vencimento',
     'faturas', produto._faturas(familia, produto._hoje(), meses))::json $$;
;