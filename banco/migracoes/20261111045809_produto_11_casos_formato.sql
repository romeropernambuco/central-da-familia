create or replace function produto.teste_contas_casos() returns table(caso text, esperado text, obtido text, ok boolean) language plpgsql volatile set search_path = '' as
$$
declare
  silva constant uuid := 'f0000000-0000-4e0e-8000-000000000001';
  feira constant uuid := 'e0000000-0000-4e0e-8000-000000000011';
  contas constant uuid := 'e0000000-0000-4e0e-8000-000000000012';
  lazer constant uuid := 'e0000000-0000-4e0e-8000-000000000013';
  cartao_ana constant uuid := 'c0000000-0000-4e0e-8000-000000000011';
  ana constant text := 'a0000000-0000-4e0e-8000-0000000000a1';
  davi constant text := 'a0000000-0000-4e0e-8000-0000000000d1';
  dia constant date := '2026-11-11';
  r jsonb; j json; res text[] := '{}'; i int; lid uuid; a text; b text;
  function_env jsonb;
begin
  begin
    insert into produto.limites_mes (familia_id, envelope_id, mes, valor) values (silva, feira, '2026-11', 5000)
      on conflict (envelope_id, mes) do update set valor = excluded.valor;
    r := produto._resumo(silva, dia);
    select v into function_env from jsonb_array_elements(r->'envelopes') v where v->>'id' = feira::text;
    res := res || array['Feira R$ 5.000 por mês vira quanto por semana', '1153.85', function_env->>'teto_semana'];
    res := res || array['Feira de novembro (5 segundas, a 5ª sai do pote)', '5769.25', function_env->>'limite_mes'];
    raise exception using errcode = 'P0001', message = 'desfazer';
  exception when sqlstate 'P0001' then null; end;

  begin
    insert into produto.limites_mes (familia_id, envelope_id, mes, valor) values (silva, feira, '2026-11', 15167)
      on conflict (envelope_id, mes) do update set valor = excluded.valor;
    r := produto._resumo(silva, dia);
    select v into function_env from jsonb_array_elements(r->'envelopes') v where v->>'id' = feira::text;
    res := res || array['Feira R$ 15.167 por mês vira R$ 3.500,08 por semana (tela mostra R$ 3.500)', '3500.08', function_env->>'teto_semana'];
    raise exception using errcode = 'P0001', message = 'desfazer';
  exception when sqlstate 'P0001' then null; end;

  r := produto._resumo(silva, '2026-12-02');
  select v into function_env from jsonb_array_elements(r->'envelopes') v where v->>'id' = feira::text;
  res := res || array['Pote da Feira no início de dezembro', '1659.75', function_env->>'pote_inicio'];

  begin
    perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
    set local role authenticated;
    j := produto.lancar(silva, contas, 300, '2026-11-10', 'Teste cartão', cartao_ana, 7.5);
    lid := (j->'lancamento'->>'id')::uuid;
    r := produto._resumo(silva, dia);
    select v into function_env from jsonb_array_elements(r->'envelopes') v where v->>'id' = contas::text;
    a := function_env->>'livre';
    select v->>'total' into b from jsonb_array_elements(produto._faturas(silva, '2026-11-01', 2)) v where v->>'mes' = '2026-12';
    res := res || array['R$ 300 no cartão em 10/11: livre de novembro do envelope (4.750 − 300)', '4450.00', a];
    res := res || array['R$ 300 no cartão em 10/11: entra na fatura de dezembro (1.250 + 300)', '1550.00', b];
    select v->>'total' into b from jsonb_array_elements(produto._faturas(silva, '2026-11-01', 2)) v where v->>'mes' = '2026-11';
    res := res || array['R$ 300 no cartão em 10/11: fatura de novembro não muda', '0', b];
    j := produto.lancar(silva, contas, 300, '2026-11-10', 'Teste cartão', cartao_ana, 7.5);
    res := res || array['Toque duplo em 10 segundos não grava 2 vezes', 'true', j->>'repetido'];
    perform produto.apagar_lancamento(lid);
    r := produto._resumo(silva, dia);
    select v into function_env from jsonb_array_elements(r->'envelopes') v where v->>'id' = contas::text;
    a := function_env->>'livre';
    select v->>'total' into b from jsonb_array_elements(produto._faturas(silva, '2026-11-01', 2)) v where v->>'mes' = '2026-12';
    res := res || array['Lixeira: livre volta pra 4.750 e a fatura de dez pra 1.250', '4750.00 | 1250.00', a || ' | ' || b];
    perform produto.restaurar_lancamento(lid);
    r := produto._resumo(silva, dia);
    select v into function_env from jsonb_array_elements(r->'envelopes') v where v->>'id' = contas::text;
    res := res || array['Restaurar da lixeira desconta de novo', '4450.00', function_env->>'livre'];
    perform produto.lancar(silva, contas, 4000, '2026-11-11', 'Teste colchão', null, 5);
    r := produto._resumo(silva, dia);
    select v into function_env from jsonb_array_elements(r->'envelopes') v where v->>'id' = contas::text;
    res := res || array['Colchão cobre quando o mês aperta (livre 450, colchão 450, hoje 0)', '450.00 | 450.00 | 0.00',
                        (function_env->>'livre') || ' | ' || (function_env->>'colchao') || ' | ' || (function_env->>'hoje')];
    perform produto.lancar(silva, contas, 1500, '2026-11-11', 'Teste colchão 2', null, 5);
    r := produto._resumo(silva, dia);
    select v into function_env from jsonb_array_elements(r->'envelopes') v where v->>'id' = contas::text;
    res := res || array['Colchão nunca fica negativo (livre −1.050, colchão 0, hoje 0)', '-1050.00 | 0 | 0.00',
                        (function_env->>'livre') || ' | ' || (function_env->>'colchao') || ' | ' || (function_env->>'hoje')];
    res := res || array['Evento de tempo gravado a cada lançamento (3, com segundos)', '3',
                        (select count(*)::text from produto.eventos e where e.familia_id = silva and e.tipo = 'lancamento' and e.segundos is not null and e.criado_em = now())];
    raise exception using errcode = 'P0001', message = 'desfazer';
  exception when sqlstate 'P0001' then null; end;

  r := produto._resumo(silva, '2026-12-01');
  select v into function_env from jsonb_array_elements(r->'envelopes') v where v->>'id' = lazer::text;
  res := res || array['Valor do dia útil 01/12 (900 ÷ 37)', '24.32', function_env->>'valor_dia'];
  r := produto._resumo(silva, '2026-12-05');
  select v into function_env from jsonb_array_elements(r->'envelopes') v where v->>'id' = lazer::text;
  res := res || array['Sábado 05/12 sem gasto antes (900 × 1,5 ÷ 33)', '40.91', function_env->>'valor_dia'];
  select (produto._diario(lazer, '2026-12-05')->>'valor_dia_plano') into a;
  res := res || array['Plano do sábado = 1,5 × dia útil (900 × 1,5 ÷ 37)', '36.49', a];

  begin
    perform set_config('request.jwt.claims', json_build_object('sub', davi, 'role', 'authenticated')::text, true);
    set local role authenticated;
    r := produto._resumo(silva, dia);
    res := res || array['Davi (pessoa) em 11/11: pode gastar hoje = (400 − 35) ÷ 20 dias, e só vê 1 envelope', '18.25 | 1',
                        (r->>'pode_gastar_hoje') || ' | ' || jsonb_array_length(r->'envelopes')::text];
    raise exception using errcode = 'P0001', message = 'desfazer';
  exception when sqlstate 'P0001' then null; end;

  i := 1;
  while i <= array_length(res, 1) loop
    caso := res[i]; esperado := res[i+1]; obtido := res[i+2]; ok := esperado is not distinct from obtido; return next;
    i := i + 3;
  end loop;
end $$;
revoke execute on function produto.teste_contas_casos() from public, anon, authenticated;
;