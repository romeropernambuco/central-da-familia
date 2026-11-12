
-- feriado de banco (ANBIMA 2026 e 2027; outros anos: so os nacionais de data fixa). Diferente de produto.feriados, que tem os de Pernambuco.
create function produto._feriado_banco(d date) returns boolean language sql immutable set search_path = '' as $$
  select d = any (array['2026-01-01','2026-02-16','2026-02-17','2026-04-03','2026-04-21','2026-05-01','2026-06-04','2026-09-07','2026-10-12',
    '2026-11-02','2026-11-15','2026-11-20','2026-12-25','2027-01-01','2027-02-08','2027-02-09','2027-03-26','2027-04-21','2027-05-01',
    '2027-05-27','2027-09-07','2027-10-12','2027-11-02','2027-11-15','2027-11-20','2027-12-25']::date[])
    or (extract(year from d) not in (2026, 2027) and to_char(d, 'MM-DD') in ('01-01','04-21','05-01','09-07','10-12','11-02','11-15','11-20','12-25'))
$$;
create function produto._dia_util(d date) returns boolean language sql immutable set search_path = '' as $$
  select extract(isodow from d) < 6 and not produto._feriado_banco(d)
$$;
create function produto._aliq_ir(dias integer) returns numeric language sql immutable set search_path = '' as $$
  select case when dias <= 180 then 0.225 when dias <= 360 then 0.20 when dias <= 720 then 0.175 else 0.15 end
$$;
create function produto._iof_pct(dias integer) returns numeric language sql immutable set search_path = '' as $$
  select case when dias >= 30 then 0 else (array[96,93,90,86,83,80,76,73,70,66,63,60,56,53,50,46,43,40,36,33,30,26,23,20,16,13,10,6,3,0])[greatest(dias, 1)]::numeric end
$$;
create function produto._dia_nome(d date) returns text language sql immutable set search_path = '' as $$
  select (array['segunda','terça','quarta','quinta','sexta','sábado','domingo'])[extract(isodow from d)::int]
$$;

-- 1 aplicacao, dia a dia, aporte por aporte (o resgate sai do aporte mais antigo)
create function produto._guardado_app(p_app uuid, p_hoje date, p_cdi_fixo numeric default null)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  a produto.pat_aplicacoes%rowtype;
  m_data date[]; m_tipo text[]; m_valor numeric[]; nm int; k int := 1;
  l_data date[] := '{}'; l_saldo numeric[] := '{}'; l_rend numeric[] := '{}'; n int := 0; i int;
  ini date; idx record; d date; util boolean;
  selic numeric; taxa1 numeric; taxa numeric; fator numeric; taxa_m numeric;
  y numeric; al numeric; v numeric; tot numeric; tira numeric;
  dia_b numeric; dia_l numeric;
  hoje_b numeric := 0; hoje_l numeric := 0; mes_b numeric := 0; mes_l numeric := 0; tot_b numeric := 0; tot_l numeric := 0;
  ult_data date; ult_l numeric := 0; aplicado numeric := 0; ajuste numeric := 0; iof numeric := 0; estim boolean := false;
  dias jsonb := '[]'::jsonb; faixa numeric := 0; saldo numeric := 0;
begin
  select * into a from produto.pat_aplicacoes x where x.id = p_app;
  if not found then return null; end if;
  select array_agg(mv.data order by mv.data, mv.criado_em, mv.id), array_agg(mv.tipo order by mv.data, mv.criado_em, mv.id),
         array_agg(mv.valor order by mv.data, mv.criado_em, mv.id), count(*), min(mv.data)
    into m_data, m_tipo, m_valor, nm, ini
    from produto.pat_movimentos mv
   where mv.familia_id = a.familia_id and mv.aplicacao_id = p_app and mv.anulado_em is null and mv.data <= p_hoje;
  select x.selic_meta into selic from produto.pat_indices x where x.selic_meta is not null and x.data <= p_hoje order by x.data desc limit 1;
  select x.cdi_dia into taxa1 from produto.pat_indices x where x.cdi_dia is not null order by x.data limit 1;
  if a.tipo = 'poupanca' then estim := true; end if;

  if ini is not null then
  for idx in
    select g::date as d, t.cdi_dia, t.data as tdata
      from generate_series(ini, p_hoje, interval '1 day') g
      left join lateral (select x.cdi_dia, x.data from produto.pat_indices x
                          where x.data <= g::date and x.cdi_dia is not null order by x.data desc limit 1) t on true
     order by 1
  loop
    d := idx.d;
    while k <= nm and m_data[k] = d loop
      if m_tipo[k] = 'aporte' then
        n := n + 1; l_data[n] := d; l_saldo[n] := m_valor[k]; l_rend[n] := 0; aplicado := aplicado + m_valor[k];
      elsif m_tipo[k] = 'resgate' then
        v := m_valor[k];
        for i in 1..n loop
          exit when v <= 0;
          tira := least(l_saldo[i], v); l_saldo[i] := l_saldo[i] - tira; v := v - tira; aplicado := aplicado - tira;
        end loop;
      else
        tot := 0; for i in 1..n loop tot := tot + l_saldo[i]; end loop;
        if tot > 0 then
          for i in 1..n loop l_saldo[i] := round(l_saldo[i] * m_valor[k] / tot, 10); end loop;
        elsif m_valor[k] > 0 then
          n := n + 1; l_data[n] := d; l_saldo[n] := m_valor[k]; l_rend[n] := 0;
        end if;
        ajuste := ajuste + m_valor[k] - tot;
      end if;
      k := k + 1;
    end loop;

    dia_b := 0; dia_l := 0; util := produto._dia_util(d);
    if a.tipo = 'poupanca' then
      taxa_m := case when coalesce(selic, 13.75) > 8.5 then 0.005 else round(coalesce(selic, 13.75) * 0.7 / 1200, 10) end;
      for i in 1..n loop
        if l_saldo[i] > 0 and d > l_data[i] and extract(day from d) = least(extract(day from l_data[i]), 28) then
          y := round(l_saldo[i] * taxa_m, 10); l_saldo[i] := l_saldo[i] + y; l_rend[i] := l_rend[i] + y; dia_b := dia_b + y; dia_l := dia_l + y;
        end if;
      end loop;
    elsif util then
      taxa := coalesce(p_cdi_fixo, idx.cdi_dia, taxa1, 0.050788);
      if p_cdi_fixo is null and idx.tdata is distinct from d then estim := true; end if;
      if a.tipo = 'tesouro_selic' and p_cdi_fixo is null and selic is not null then
        fator := round(power(1 + selic / 100, 1.0 / 252) - 1, 16);
      else
        fator := round(taxa / 100 * (case when a.tipo = 'tesouro_selic' then 100 else a.pct_cdi end) / 100, 16);
      end if;
      for i in 1..n loop
        if l_saldo[i] > 0 then
          y := round(l_saldo[i] * fator, 10);
          al := case when a.isento_ir then 0 else produto._aliq_ir(d - l_data[i]) end;
          l_saldo[i] := l_saldo[i] + y; l_rend[i] := l_rend[i] + y; dia_b := dia_b + y; dia_l := dia_l + y * (1 - al);
        end if;
      end loop;
    end if;

    tot_b := tot_b + dia_b; tot_l := tot_l + dia_l;
    if date_trunc('month', d) = date_trunc('month', p_hoje) then mes_b := mes_b + dia_b; mes_l := mes_l + dia_l; end if;
    if d = p_hoje then hoje_b := dia_b; hoje_l := dia_l;
    elsif dia_b > 0 then ult_data := d; ult_l := dia_l; end if;
    if d > p_hoje - 30 then
      dias := dias || jsonb_build_object('data', d, 'bruto', round(dia_b, 2), 'liquido', round(dia_l, 2));
    end if;
  end loop;
  end if;

  for i in 1..n loop
    saldo := saldo + l_saldo[i];
    if l_saldo[i] > 0 then
      if faixa = 0 and not a.isento_ir then faixa := produto._aliq_ir(p_hoje - l_data[i]) * 100; end if;
      if a.tipo <> 'poupanca' and p_hoje - l_data[i] < 30 then iof := iof + l_rend[i] * produto._iof_pct(p_hoje - l_data[i]) / 100; end if;
    end if;
  end loop;

  return jsonb_build_object(
    'id', a.id, 'nome', a.nome, 'banco', a.banco, 'tipo', a.tipo, 'pct_cdi', a.pct_cdi, 'isento_ir', a.isento_ir,
    'liquidez', a.liquidez, 'vence_em', a.vence_em, 'titular_membro', a.titular_membro, 'inicio', ini,
    'saldo', round(saldo, 2), 'aplicado', round(aplicado, 2), 'ajuste_conferido', round(ajuste, 2),
    'rendeu_hoje_bruto', round(hoje_b, 2), 'rendeu_hoje_liquido', round(hoje_l, 2),
    'rendeu_mes_bruto', round(mes_b, 2), 'rendeu_mes_liquido', round(mes_l, 2),
    'rendeu_desde_inicio_bruto', round(tot_b, 2), 'rendeu_desde_inicio_liquido', round(tot_l, 2),
    'ir_faixa', faixa, 'iof_se_sacar_hoje', round(iof, 2), 'estimativa', estim,
    'ultimo_dia_que_rendeu', case when ult_data is not null then jsonb_build_object('data', ult_data, 'liquido', round(ult_l, 2)) end,
    'dias', dias);
end $$;

-- a familia inteira
create function produto._guardado(p_familia uuid, p_hoje date, p_cdi_fixo numeric default null)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  apps jsonb; ix record; cdi numeric; cdi_data date; cdi_fonte text; selic numeric;
  util boolean := produto._dia_util(p_hoje); prox date; aviso text; motivo text;
  total numeric; hb numeric; hl numeric; ml numeric; tl numeric; tb numeric; iof numeric; fora numeric := 0;
  por_dia jsonb; expl jsonb := '[]'::jsonb; a jsonb; ult jsonb; n_apps int;
begin
  select coalesce(jsonb_agg(produto._guardado_app(x.id, p_hoje, p_cdi_fixo) order by x.criado_em, x.id), '[]'::jsonb) into apps
    from produto.pat_aplicacoes x where x.familia_id = p_familia and x.encerrada_em is null;
  n_apps := jsonb_array_length(apps);

  select x.data, x.cdi_dia, x.fonte into cdi_data, cdi, cdi_fonte from produto.pat_indices x
   where x.cdi_dia is not null and x.data <= p_hoje order by x.data desc limit 1;
  if cdi is null then
    select x.data, x.cdi_dia, x.fonte into cdi_data, cdi, cdi_fonte from produto.pat_indices x where x.cdi_dia is not null order by x.data limit 1;
  end if;
  select x.selic_meta into selic from produto.pat_indices x where x.selic_meta is not null and x.data <= p_hoje order by x.data desc limit 1;
  if p_cdi_fixo is not null then cdi := p_cdi_fixo; cdi_data := p_hoje; cdi_fonte := 'teste'; end if;
  if cdi is null then cdi := 0.050788; cdi_data := '2026-11-10'; cdi_fonte := 'manual'; end if;

  prox := p_hoje + 1;
  while not produto._dia_util(prox) loop prox := prox + 1; end loop;
  if not util then
    motivo := case when extract(isodow from p_hoje) = 6 then 'sábado' when extract(isodow from p_hoje) = 7 then 'domingo' else 'feriado dos bancos' end;
    aviso := 'hoje é ' || motivo || ': rende de novo ' || case when prox = p_hoje + 1 then 'amanhã' when extract(isodow from prox) >= 6 then 'no ' || produto._dia_nome(prox) else 'na ' || produto._dia_nome(prox) end;
  end if;

  -- garantia do FGC: soma por titular e por banco, ate R$ 250.000
  select coalesce(jsonb_agg(x.app || jsonb_build_object(
           'fgc_ok', x.app->>'tipo' = 'tesouro_selic' or x.soma <= 250000,
           'garantia', case when x.app->>'tipo' = 'tesouro_selic' then 'Tesouro Nacional' else 'FGC' end) order by x.ord), '[]'::jsonb),
         coalesce(sum(distinct case when x.app->>'tipo' <> 'tesouro_selic' and x.soma > 250000 then x.soma - 250000 else 0 end), 0)
    into apps, fora
    from (select t.app, t.ord,
                 sum(case when t.app->>'tipo' <> 'tesouro_selic' then (t.app->>'saldo')::numeric else 0 end)
                   over (partition by t.app->>'titular_membro', lower(btrim(t.app->>'banco'))) as soma
            from jsonb_array_elements(apps) with ordinality t(app, ord)) x;

  select coalesce(sum((x->>'saldo')::numeric), 0), coalesce(sum((x->>'rendeu_hoje_bruto')::numeric), 0), coalesce(sum((x->>'rendeu_hoje_liquido')::numeric), 0),
         coalesce(sum((x->>'rendeu_mes_liquido')::numeric), 0), coalesce(sum((x->>'rendeu_desde_inicio_liquido')::numeric), 0),
         coalesce(sum((x->>'rendeu_desde_inicio_bruto')::numeric), 0), coalesce(sum((x->>'iof_se_sacar_hoje')::numeric), 0)
    into total, hb, hl, ml, tl, tb, iof from jsonb_array_elements(apps) x;

  select jsonb_agg(jsonb_build_object('data', g::date, 'liquido', coalesce(s.liq, 0), 'bruto', coalesce(s.bru, 0), 'util', produto._dia_util(g::date),
           'motivo', case when produto._dia_util(g::date) then null when extract(isodow from g) = 6 then 'sábado'
                          when extract(isodow from g) = 7 then 'domingo' else 'feriado dos bancos' end) order by g)
    into por_dia
    from generate_series(p_hoje - 29, p_hoje, interval '1 day') g
    left join lateral (select sum((dd->>'liquido')::numeric) liq, sum((dd->>'bruto')::numeric) bru
                         from jsonb_array_elements(apps) ap, jsonb_array_elements(ap->'dias') dd where (dd->>'data')::date = g::date) s on true;

  select jsonb_build_object('data', x->>'data', 'liquido', (x->>'liquido')::numeric) into ult
    from jsonb_array_elements(por_dia) x where (x->>'data')::date < p_hoje and (x->>'liquido')::numeric > 0 order by x->>'data' desc limit 1;

  expl := expl || jsonb_build_object('linha', 'Você tem guardado (soma das aplicações, com o que já rendeu)', 'valor', round(total, 2));
  expl := expl || jsonb_build_object('linha', 'Taxa do dia: CDI de ' || to_char(cdi_data, 'DD/MM') || ' = ' || translate(trim(to_char(cdi, 'FM0D000000')), '.', ',') || '% ao dia ('
            || translate(trim(to_char(round((power(1 + cdi / 100, 252) - 1) * 100, 2), 'FM990D00')), '.', ',') || '% ao ano), fonte ' || cdi_fonte, 'valor', cdi);
  for a in select x from jsonb_array_elements(apps) x loop
    if a->>'tipo' = 'poupanca' then
      expl := expl || jsonb_build_object('linha', (a->>'nome') || ': poupança só rende no dia do aniversário de cada depósito (0,5% ao mês, estimativa sem a TR)', 'valor', (a->>'rendeu_hoje_liquido')::numeric);
    elsif not util then
      expl := expl || jsonb_build_object('linha', (a->>'nome') || ': ' || aviso, 'valor', 0);
    else
      expl := expl || jsonb_build_object('linha', (a->>'nome') || ': ' || produto._brl((a->>'saldo')::numeric - (a->>'rendeu_hoje_bruto')::numeric) || ' × taxa do dia'
            || case when a->>'tipo' = 'tesouro_selic' then ' (Selic)' else ' × ' || translate(trim(to_char((a->>'pct_cdi')::numeric, 'FM990D##')), '.', ',') || '% do CDI' end, 'valor', (a->>'rendeu_hoje_bruto')::numeric);
      if (a->>'isento_ir')::boolean then
        expl := expl || jsonb_build_object('linha', (a->>'nome') || ': sem imposto de renda (isenta)', 'valor', 0);
      else
        expl := expl || jsonb_build_object('linha', (a->>'nome') || ': imposto de renda de ' || translate(trim(to_char((a->>'ir_faixa')::numeric, 'FM990D0')), '.', ',') || '% sobre o rendimento (cai com o tempo, até 15%)',
                 'valor', (a->>'rendeu_hoje_liquido')::numeric - (a->>'rendeu_hoje_bruto')::numeric);
      end if;
    end if;
  end loop;
  expl := expl || jsonb_build_object('linha', 'Rendeu hoje, já sem o imposto', 'valor', round(hl, 2));
  if iof > 0 then
    expl := expl || jsonb_build_object('linha', 'Se tirar hoje o dinheiro guardado há menos de 30 dias, o banco cobra IOF sobre o rendimento dele', 'valor', -round(iof, 2));
  end if;
  expl := expl || jsonb_build_object('linha', 'Estimativa: quem manda é o extrato do banco. Confira o saldo no dia 1 e digite aqui', 'valor', round(total, 2));

  return jsonb_build_object(
    'familia_id', p_familia, 'data', p_hoje, 'vazio', n_apps = 0,
    'total', round(total, 2), 'rendeu_hoje_bruto', round(hb, 2), 'rendeu_hoje_liquido', round(hl, 2),
    'rendeu_mes_liquido', round(ml, 2), 'rendeu_desde_inicio_liquido', round(tl, 2), 'rendeu_desde_inicio_bruto', round(tb, 2),
    'hoje_rende', util, 'aviso', aviso, 'proximo_dia_util', prox, 'ultimo_dia_que_rendeu', ult,
    'iof_se_sacar_hoje', round(iof, 2), 'fora_do_fgc', round(fora, 2),
    'cdi_usado', jsonb_build_object('data', cdi_data, 'pct_dia', cdi, 'pct_ano', round((power(1 + cdi / 100, 252) - 1) * 100, 2), 'fonte', cdi_fonte,
                   'selic_meta', selic, 'estimativa', cdi_data is distinct from p_hoje),
    'por_dia_30', por_dia,
    'aplicacoes', (select coalesce(jsonb_agg(x - 'dias' order by o), '[]'::jsonb) from jsonb_array_elements(apps) with ordinality t(x, o)),
    'explicacao', expl,
    'exemplo', jsonb_build_object('valor', 10000, 'pct_cdi', 100, 'rende_por_dia_util_bruto', round(10000 * cdi / 100, 2),
                 'rende_por_dia_util_liquido', round(10000 * cdi / 100 * 0.775, 2), 'rende_em_21_dias_uteis_liquido', round(10000 * (power(1 + cdi / 100, 21) - 1) * 0.775, 2)),
    'atualizado_em', now());
end $$;

-- quanto um gasto deixa de render (ate o fim do mes e em 12 meses)
create function produto._guardado_custo(p_familia uuid, p_valor numeric, p_hoje date, p_cdi_fixo numeric default null, p_pct_fixo numeric default null)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  g jsonb; a jsonb; pct numeric; cdi numeric; isento boolean := false; f numeric; n_mes int; n_ano int;
  fim date := (date_trunc('month', p_hoje) + interval '1 month - 1 day')::date;
  b_mes numeric; b_ano numeric; l_mes numeric; l_ano numeric; nome text;
begin
  if p_valor is null or p_valor <= 0 or p_valor > 100000000 then raise exception 'valor invalido' using errcode = '22023'; end if;
  if p_pct_fixo is null then
    g := produto._guardado(p_familia, p_hoje, p_cdi_fixo);
    select x into a from jsonb_array_elements(g->'aplicacoes') x where (x->>'saldo')::numeric > 0
     order by (x->>'liquidez' = 'diaria' and x->>'tipo' not in ('poupanca')) desc, (x->>'saldo')::numeric desc limit 1;
    if a is null then return jsonb_build_object('tem_guardado', false); end if;
    pct := case when a->>'tipo' in ('tesouro_selic', 'poupanca') then 100 else (a->>'pct_cdi')::numeric end;
    isento := (a->>'isento_ir')::boolean; nome := a->>'nome'; cdi := (g->'cdi_usado'->>'pct_dia')::numeric;
  else
    pct := p_pct_fixo; cdi := coalesce(p_cdi_fixo, 0.050788); nome := 'teste';
  end if;
  if p_cdi_fixo is not null then cdi := p_cdi_fixo; end if;
  f := round(cdi / 100 * pct / 100, 16);
  select count(*) filter (where g2::date < fim), count(*) into n_mes, n_ano
    from generate_series(p_hoje, (p_hoje + interval '1 year - 1 day')::date, interval '1 day') g2 where produto._dia_util(g2::date);
  b_mes := round(p_valor * (power(1 + f, n_mes) - 1), 2); b_ano := round(p_valor * (power(1 + f, n_ano) - 1), 2);
  l_mes := case when isento then b_mes else round(b_mes * 0.775, 2) end;
  l_ano := case when isento then b_ano else round(b_ano * 0.825, 2) end;
  return jsonb_build_object('tem_guardado', true, 'valor', p_valor, 'aplicacao', nome, 'pct_cdi', pct,
    'ate_fim_do_mes', jsonb_build_object('dias_uteis', n_mes, 'bruto', b_mes, 'liquido', l_mes),
    'em_12_meses', jsonb_build_object('dias_uteis', n_ano, 'bruto', b_ano, 'liquido', l_ano),
    'frase', case when l_mes >= 0.01 then 'Esse gasto também custou ' || produto._brl(l_mes) || ' de rendimento até o fim do mês (' || produto._brl(l_ano) || ' em 12 meses).'
                  else 'Esse gasto também custou ' || produto._brl(l_ano) || ' de rendimento em 12 meses.' end,
    'estimativa', true);
end $$;

revoke execute on function produto._feriado_banco(date), produto._dia_util(date), produto._aliq_ir(integer), produto._iof_pct(integer), produto._dia_nome(date),
  produto._guardado_app(uuid, date, numeric), produto._guardado(uuid, date, numeric), produto._guardado_custo(uuid, numeric, date, numeric, numeric) from public, anon;
grant execute on function produto._feriado_banco(date), produto._dia_util(date), produto._aliq_ir(integer), produto._iof_pct(integer), produto._dia_nome(date),
  produto._guardado_app(uuid, date, numeric), produto._guardado(uuid, date, numeric), produto._guardado_custo(uuid, numeric, date, numeric, numeric) to authenticated;
;