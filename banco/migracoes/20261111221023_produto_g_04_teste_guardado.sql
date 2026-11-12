
create or replace function produto._guardado_movimentar(p_app uuid, p_tipo text, p_valor numeric, p_data date, p_chave uuid, p_hoje date)
returns jsonb language plpgsql set search_path = '' as $$
declare a produto.pat_aplicacoes%rowtype; dt date := coalesce(p_data, p_hoje); mid uuid; saldo numeric; dif numeric; ja boolean := false; g jsonb;
begin
  select * into a from produto.pat_aplicacoes x where x.id = p_app;
  if not found or produto.meu_papel(a.familia_id) is distinct from 'casal' then
    raise exception 'aplicacao nao encontrada ou sem permissao' using errcode = '42501';
  end if;
  if p_chave is null then raise exception 'falta a chave do toque' using errcode = '22023'; end if;
  if p_tipo is null or p_tipo not in ('aporte', 'resgate', 'saldo_conferido') then raise exception 'tipo invalido: use aporte, resgate ou saldo_conferido' using errcode = '22023'; end if;
  if p_valor is null or p_valor < 0 or p_valor > 100000000 or (p_tipo <> 'saldo_conferido' and p_valor < 0.01) then raise exception 'valor invalido' using errcode = '22023'; end if;
  if dt > p_hoje then raise exception 'a data nao pode ser no futuro' using errcode = '22023'; end if;
  if dt < p_hoje - 3660 then raise exception 'data muito antiga' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('guardado:' || a.familia_id::text, 0));
  select mv.id into mid from produto.pat_movimentos mv where mv.familia_id = a.familia_id and mv.chave = p_chave;
  if mid is not null then
    ja := true;
  else
    if a.encerrada_em is not null then raise exception 'essa aplicacao ja foi encerrada' using errcode = '22023'; end if;
    if p_tipo = 'saldo_conferido' then
      -- compara com o saldo calculado antes do rendimento do proprio dia (e o que o app do banco mostra durante o dia)
      g := produto._guardado_app(p_app, dt);
      saldo := (g->>'saldo')::numeric - (g->>'rendeu_hoje_bruto')::numeric;
      dif := round(p_valor, 2) - saldo;
    else
      saldo := (produto._guardado_app(p_app, p_hoje)->>'saldo')::numeric;
      if p_tipo = 'resgate' and round(p_valor, 2) > saldo then
        raise exception 'so tem % nessa aplicacao', produto._brl(saldo) using errcode = '22023';
      end if;
    end if;
    insert into produto.pat_movimentos (familia_id, aplicacao_id, data, tipo, valor, chave, autor)
    values (a.familia_id, p_app, dt, p_tipo, round(p_valor, 2), p_chave, (select auth.uid())) returning id into mid;
  end if;
  return produto._guardado(a.familia_id, p_hoje) || jsonb_strip_nulls(jsonb_build_object('aplicacao_id', p_app, 'movimento_id', mid, 'repetido', ja, 'diferenca', dif));
end $$;

create function produto.teste_guardado() returns table(caso text, esperado text, obtido text, ok boolean)
language plpgsql set search_path = '' as $$
declare
  res text[] := '{}'; i int; c record; obt text;
  f uuid := gen_random_uuid(); u uuid := gen_random_uuid(); mb uuid := gen_random_uuid();
  a1 uuid := gen_random_uuid(); a2 uuid := gen_random_uuid(); a3 uuid := gen_random_uuid(); a4 uuid := gen_random_uuid();
  a5 uuid := gen_random_uuid(); a6 uuid := gen_random_uuid(); a7 uuid := gen_random_uuid(); aid uuid;
  k uuid := gen_random_uuid(); k2 uuid := gen_random_uuid();
  g jsonb; j jsonb; cdi constant numeric := 0.050788;
  carla constant text := 'a0000000-0000-4e0e-8000-0000000000c1'; davi constant text := 'a0000000-0000-4e0e-8000-0000000000d1';
  paulo constant text := 'a0000000-0000-4e0e-8000-0000000000f2'; silva constant text := 'f0000000-0000-4e0e-8000-000000000001';
begin
  begin
    insert into produto.familias (id, nome, exemplo) values (f, 'Teste Guardado', true);
    insert into produto.membros (id, familia_id, user_id, papel, nome) values (mb, f, u, 'casal', 'Teste');
    perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
    insert into produto.pat_aplicacoes (id, familia_id, titular_membro, nome, banco, tipo, pct_cdi, isento_ir, criado_por) values
      (a1, f, mb, 'Caixinha 105', 'Banco A', 'caixinha', 105, false, u), (a2, f, mb, 'Caixinha com gastos', 'Banco B', 'caixinha', 105, false, u),
      (a3, f, mb, 'CDB 110', 'Banco C', 'cdb', 110, false, u), (a4, f, mb, 'LCA 92', 'Banco D', 'lci_lca', 92, true, u),
      (a5, f, mb, 'Poupança', 'Banco E', 'poupanca', 100, true, u), (a6, f, mb, 'CDB grande', 'Banco X', 'cdb', 100, false, u),
      (a7, f, mb, 'LCA grande', ' banco x', 'lci_lca', 90, true, u);
    insert into produto.pat_movimentos (familia_id, aplicacao_id, data, tipo, valor, chave, autor) values
      (f, a1, '2026-11-09', 'aporte', 10000, gen_random_uuid(), u),
      (f, a2, '2026-11-09', 'aporte', 10000, gen_random_uuid(), u), (f, a2, '2026-11-10', 'resgate', 300, gen_random_uuid(), u), (f, a2, '2026-11-16', 'resgate', 2000, gen_random_uuid(), u),
      (f, a3, '2026-05-11', 'aporte', 40000, gen_random_uuid(), u), (f, a3, '2026-11-11', 'saldo_conferido', 50000, gen_random_uuid(), u),
      (f, a4, '2026-11-11', 'aporte', 50000, gen_random_uuid(), u), (f, a5, '2026-10-11', 'aporte', 10000, gen_random_uuid(), u),
      (f, a6, '2026-11-08', 'aporte', 180000, gen_random_uuid(), u), (f, a7, '2026-11-08', 'aporte', 95000, gen_random_uuid(), u);

    g := produto._guardado_app(a1, '2026-11-09', cdi);
    res := res || array['R$ 10.000 a 105% do CDI de 13,65% a.a.: rende no 1º dia útil (bruto)', '5.33', g->>'rendeu_hoje_bruto'];
    res := res || array['mesmo caso: líquido do 1º dia (IR 22,5%)', '4.13', g->>'rendeu_hoje_liquido'];
    g := produto._guardado_app(a1, '2026-12-08', cdi);
    res := res || array['R$ 10.000 a 105%: 21 dias úteis de 09/11 a 08/12 (bruto)', '112.59', g->>'rendeu_desde_inicio_bruto'];
    res := res || array['mesmo caso: saldo em 08/12', '10112.59', g->>'saldo'];
    res := res || array['mesmo caso: dias que renderam (20/11 é feriado dos bancos)', '21', (select count(*)::text from jsonb_array_elements(g->'dias') x where (x->>'bruto')::numeric > 0)];
    res := res || array['mesmo caso: líquido com IR de 22,5% (conta de referência dá 87,26; aceita 1 centavo)', 'sim', case when abs((g->>'rendeu_desde_inicio_liquido')::numeric - 87.26) <= 0.01 then 'sim' else g->>'rendeu_desde_inicio_liquido' end];
    res := res || array['IOF: não cobra depois de 30 dias (09/12)', '0.00', produto._guardado_app(a1, '2026-12-09', cdi)->>'iof_se_sacar_hoje'];
    res := res || array['IOF: cobra se sacar no 10º dia (19/11), 66% do rendimento', 'sim', case when (produto._guardado_app(a1, '2026-11-19', cdi)->>'iof_se_sacar_hoje')::numeric between 20 and 30 then 'sim' else produto._guardado_app(a1, '2026-11-19', cdi)->>'iof_se_sacar_hoje' end];
    res := res || array['tabela do IOF: dia 1, dia 10 e dia 30', '96/66/0', produto._iof_pct(1) || '/' || produto._iof_pct(10) || '/' || produto._iof_pct(30)];
    res := res || array['faixas do IR: 180, 181, 360, 361, 720 e 721 dias', '22.5/20/20/17.5/17.5/15',
      (produto._aliq_ir(180) * 100)::float8 || '/' || (produto._aliq_ir(181) * 100)::float8 || '/' || (produto._aliq_ir(360) * 100)::float8 || '/' || (produto._aliq_ir(361) * 100)::float8 || '/' || (produto._aliq_ir(720) * 100)::float8 || '/' || (produto._aliq_ir(721) * 100)::float8];

    g := produto._guardado_app(a2, '2026-11-29', cdi);
    res := res || array['R$ 10.000 em 09/11, tirou R$ 300 em 10/11 e R$ 2.000 em 16/11: saldo em 29/11', '7763.21', g->>'saldo'];
    res := res || array['mesmo caso: rendeu (bruto)', '63.21', g->>'rendeu_desde_inicio_bruto'];

    g := produto._guardado_app(a3, '2026-11-11', cdi);
    res := res || array['R$ 50.000 a 110% com CDI diário 0,050788%: rende hoje (bruto)', '27.93', g->>'rendeu_hoje_bruto'];
    res := res || array['mesmo caso: líquido na faixa de 20% (aplicado há 184 dias)', '22.35', g->>'rendeu_hoje_liquido'];
    res := res || array['mesmo caso: faixa do IR', '20', (g->>'ir_faixa')::float8::text];
    res := res || array['mesmo CDB em 06/11 (179 dias): faixa do IR', '22.5', (produto._guardado_app(a3, '2026-11-06', cdi)->>'ir_faixa')::float8::text];

    g := produto._guardado_app(a4, '2026-11-11', cdi);
    res := res || array['LCA 92% de R$ 50.000: rende hoje bruto = líquido (isenta)', '23.36/23.36', (g->>'rendeu_hoje_bruto') || '/' || (g->>'rendeu_hoje_liquido')];
    res := res || array['Poupança R$ 10.000 de 11/10: rende no aniversário 11/11 (0,5%, sem TR)', '50.00', produto._guardado_app(a5, '2026-11-11', cdi)->>'rendeu_hoje_liquido'];
    res := res || array['Poupança: na véspera do aniversário não rende', '0.00', produto._guardado_app(a5, '2026-11-10', cdi)->>'rendeu_hoje_liquido'];
    res := res || array['Poupança marcada como estimativa', 'true', produto._guardado_app(a5, '2026-11-11', cdi)->>'estimativa'];

    g := produto._guardado(f, '2026-11-08', cdi);
    res := res || array['FGC: CDB R$ 180.000 + LCA R$ 95.000 no mesmo banco e titular: fora da garantia', '25000.00', g->>'fora_do_fgc'];
    res := res || array['FGC: a aplicação do banco estourado fica marcada', 'false', (select x->>'fgc_ok' from jsonb_array_elements(g->'aplicacoes') x where x->>'id' = a6::text)];
    res := res || array['FGC: aplicação em outro banco continua ok', 'true', (select x->>'fgc_ok' from jsonb_array_elements(g->'aplicacoes') x where x->>'id' = a1::text)];
    res := res || array['Domingo 08/11: não rende e diz por quê', 'hoje é domingo: rende de novo amanhã', g->>'aviso'];
    g := produto._guardado(f, '2026-11-14', cdi);
    res := res || array['Sábado 14/11: rendeu hoje', '0.00', g->>'rendeu_hoje_liquido'];
    res := res || array['Sábado 14/11: aviso', 'hoje é sábado: rende de novo na segunda', g->>'aviso'];
    res := res || array['Sábado 14/11: mostra o último dia que rendeu (sexta 13/11)', '2026-11-13', g->'ultimo_dia_que_rendeu'->>'data'];
    res := res || array['Feriado 20/11 (sexta): aviso', 'hoje é feriado dos bancos: rende de novo na segunda', produto._guardado(f, '2026-11-20', cdi)->>'aviso'];
    res := res || array['Taxa ao ano mostrada pra 0,050788% ao dia', '13.65', g->'cdi_usado'->>'pct_ano'];
    res := res || array['Barra dos últimos 30 dias tem 30 dias', '30', jsonb_array_length(g->'por_dia_30')::text];
    res := res || array['Soma das aplicações = total', 'true', ((select sum((x->>'saldo')::numeric) from jsonb_array_elements(g->'aplicacoes') x) = (g->>'total')::numeric)::text];
    res := res || array['Dia sem taxa publicada usa a última e marca estimativa', 'true', produto._guardado(f, '2027-03-01')->'cdi_usado'->>'estimativa'];

    j := produto._guardado_custo(f, 300, '2026-11-10', cdi, 105);
    res := res || array['Gasto de R$ 300 em 10/11 a 105%: dias úteis até virar o mês e em 12 meses', '13/250', (j->'ate_fim_do_mes'->>'dias_uteis') || '/' || (j->'em_12_meses'->>'dias_uteis')];
    res := res || array['mesmo gasto: deixa de render até o fim do mês (bruto)', '2.09', j->'ate_fim_do_mes'->>'bruto'];
    res := res || array['mesmo gasto: em 12 meses, bruto e líquido (IR 17,5%)', '42.77/35.29', (j->'em_12_meses'->>'bruto') || '/' || (j->'em_12_meses'->>'liquido')];

    -- funcoes que o app chama, como casal, na data de hoje
    j := produto.guardado_criar(f, 'Caixinha teste', 'Banco G', 'caixinha', 100, 1000, null, null, k)::jsonb;
    aid := (j->>'aplicacao_id')::uuid;
    j := produto.guardado_criar(f, 'Caixinha teste', 'Banco G', 'caixinha', 100, 1000, null, null, k)::jsonb;
    res := res || array['guardado_criar 2 vezes com a mesma chave: 1 aplicação só', '1/true', (select count(*)::text from produto.pat_aplicacoes x where x.chave = k) || '/' || (j->>'repetido')];
    perform produto.guardado_movimentar(aid, 'aporte', 500, null, k2);
    j := produto.guardado_movimentar(aid, 'aporte', 500, null, k2)::jsonb;
    res := res || array['guardado_movimentar 2 vezes com a mesma chave: 1 aporte só', '2/true', (select count(*)::text from produto.pat_movimentos x where x.aplicacao_id = aid) || '/' || (j->>'repetido')];
    begin perform produto.guardado_movimentar(aid, 'resgate', 999999, null, gen_random_uuid()); obt := 'aceitou'; exception when others then obt := 'recusou'; end;
    res := res || array['Tirar mais do que tem', 'recusou', obt];
    begin perform produto.guardado_movimentar(aid, 'aporte', 10, null, null); obt := 'aceitou'; exception when others then obt := 'recusou'; end;
    res := res || array['Movimento sem chave', 'recusou', obt];
    begin perform produto.guardado_movimentar(aid, 'aporte', 10, produto._hoje() + 1, gen_random_uuid()); obt := 'aceitou'; exception when others then obt := 'recusou'; end;
    res := res || array['Movimento com data no futuro', 'recusou', obt];
    begin perform produto.guardado_criar(f, 'X', 'Y', 'acoes', 100, 10); obt := 'aceitou'; exception when others then obt := 'recusou'; end;
    res := res || array['Aplicação de tipo que não existe', 'recusou', obt];
    j := produto.guardado_movimentar(aid, 'saldo_conferido', 1600, null, gen_random_uuid())::jsonb;
    res := res || array['Saldo conferido de R$ 1.600 com R$ 1.500 calculados: mostra a diferença', '100.00', j->>'diferenca'];
    j := produto.guardado_hoje(f)::jsonb;
    res := res || array['guardado_hoje traz as 8 aplicações e os campos do contrato', '8/true',
      jsonb_array_length(j->'aplicacoes')::text || '/' || (j ?& array['total','rendeu_hoje_bruto','rendeu_hoje_liquido','rendeu_mes_liquido','rendeu_desde_inicio_liquido','cdi_usado','por_dia_30','aplicacoes','explicacao','atualizado_em'])::text];
    j := produto.guardado_encerrar(aid)::jsonb;
    res := res || array['Encerrar tira a aplicação da lista', '7', jsonb_array_length(j->'aplicacoes')::text];
    res := res || array['guardado_custo_do_gasto devolve a frase', 'true', (produto.guardado_custo_do_gasto(f, 300)::jsonb->>'frase' like 'Esse gasto também custou R$ %')::text];

    -- vazamento (com a tranca de verdade ligada)
    for c in select * from (values
      ('Outra família chama guardado_hoje da Silva', paulo, format('select 1 from produto.guardado_hoje(%L)', silva), 'contar', 'bloqueado'),
      ('Pessoa (filho) chama guardado_hoje', davi, format('select 1 from produto.guardado_hoje(%L)', silva), 'contar', 'bloqueado'),
      ('Equipe chama guardado_hoje', carla, format('select 1 from produto.guardado_hoje(%L)', silva), 'contar', 'bloqueado'),
      ('Outra família lê as aplicações', paulo, 'select count(*) from produto.pat_aplicacoes', 'contar', '0'),
      ('Pessoa lê as aplicações', davi, 'select count(*) from produto.pat_aplicacoes', 'contar', '0'),
      ('Equipe lê as aplicações', carla, 'select count(*) from produto.pat_aplicacoes', 'contar', '0'),
      ('Outra família lê os movimentos', paulo, 'select count(*) from produto.pat_movimentos', 'contar', '0'),
      ('Pessoa lê os movimentos', davi, 'select count(*) from produto.pat_movimentos', 'contar', '0'),
      ('Equipe lê os movimentos', carla, 'select count(*) from produto.pat_movimentos', 'contar', '0'),
      ('Outra família calcula o Guardado desta (função interna)', paulo, format('select (produto._guardado(%L, current_date)->>''total'')::numeric::int', f), 'contar', '0'),
      ('Outra família movimenta aplicação desta', paulo, format('select 1 from produto.guardado_movimentar(%L, ''resgate'', 10, null, %L)', a1, gen_random_uuid()), 'contar', 'bloqueado'),
      ('Outra família grava movimento direto na tabela', paulo, format('insert into produto.pat_movimentos (familia_id, aplicacao_id, tipo, valor, chave, autor) values (%L, %L, ''aporte'', 10, %L, %L)', f, a1, gen_random_uuid(), paulo), 'linhas', 'bloqueado'),
      ('Equipe cria aplicação na Silva', carla, format('select 1 from produto.guardado_criar(%L, ''X'', ''Y'', ''cdb'', 100, 10)', silva), 'contar', 'bloqueado'),
      ('Casal muda o valor de um movimento já gravado', u::text, 'update produto.pat_movimentos set valor = 1', 'linhas', 'bloqueado'),
      ('Casal grava taxa do CDI direto na tabela', u::text, 'insert into produto.pat_indices (data, cdi_dia) values (''2020-01-02'', 0.4)', 'linhas', 'bloqueado'),
      ('Casal chama indice_informar (só o dono do produto pode)', u::text, 'select 1 from produto.indice_informar(''2026-11-10'', 0.05)', 'contar', 'bloqueado'),
      ('Equipe pergunta o custo do gasto: não recebe valor', carla, format('select (produto.guardado_custo_do_gasto(%L, 300)::text ~ ''bruto|liquido|frase'')::int', silva), 'contar', '0'),
      ('CONTROLE casal desta família vê as 8 aplicações dela', u::text, 'select count(*) from produto.pat_aplicacoes', 'contar', '8'),
      ('CONTROLE casal lê a tabela de taxas', u::text, 'select (count(*) > 0)::int from produto.pat_indices', 'contar', '1')
    ) as t(caso, uid, q, modo, esperado) loop
      res := res || array[c.caso, c.esperado, produto._tentativa(c.uid, 'authenticated', c.q, c.modo)];
    end loop;
    res := res || array['anon chama guardado_hoje', 'bloqueado', produto._tentativa(null, 'anon', format('select 1 from produto.guardado_hoje(%L)', silva), 'contar')];
    res := res || array['anon lê a tabela de taxas', 'bloqueado', produto._tentativa(null, 'anon', 'select count(*) from produto.pat_indices', 'contar')];

    raise exception using errcode = 'P9999', message = 'desfazer';
  exception
    when sqlstate 'P9999' then null;
    when others then res := res || array['o teste do Guardado quebrou no meio', 'sem erro', sqlerrm];
  end;
  for i in 1..coalesce(array_length(res, 1), 0) / 3 loop
    caso := res[i * 3 - 2]; esperado := res[i * 3 - 1]; obtido := res[i * 3]; ok := esperado is not distinct from obtido;
    return next;
  end loop;
end $$;
revoke execute on function produto.teste_guardado() from public, anon, authenticated;
;