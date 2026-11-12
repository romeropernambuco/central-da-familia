create or replace function produto.teste_conta() returns table(caso text, ok boolean) language plpgsql stable security invoker set search_path = '' as
$$
declare f record; r jsonb; hoje date := produto._hoje(); okv boolean; m date; ini date; fim date; tot_cart numeric; tot_fat numeric; nmeses int;
begin
  for f in select x.id, x.nome from produto.familias x order by x.nome loop
    r := produto._resumo(f.id, hoje);
    okv := abs((r->>'livre_mes')::numeric - (select coalesce(sum((v->>'livre')::numeric),0) from jsonb_array_elements(r->'envelopes') v where jsonb_typeof(v->'livre') = 'number')) < 0.01
       and not exists (select 1 from jsonb_array_elements(r->'envelopes') v where v->>'regra' = 'mensal'
             and abs((v->>'gasto_mes')::numeric - (select coalesce(sum(l.valor),0) from produto.lancamentos l
                  where l.envelope_id = (v->>'id')::uuid and l.apagado_em is null and date_trunc('month', l.data) = date_trunc('month', hoje))) >= 0.01);
    select coalesce(sum(l.valor),0), min(l.data), max(l.data) into tot_cart, ini, fim
      from produto.lancamentos l where l.familia_id = f.id and l.cartao_id is not null and l.apagado_em is null;
    if ini is not null then
      nmeses := (extract(year from age(date_trunc('month', fim), date_trunc('month', ini))) * 12 + extract(month from age(date_trunc('month', fim), date_trunc('month', ini))))::int + 3;
      select coalesce(sum((v->>'total')::numeric),0) into tot_fat from jsonb_array_elements(produto._faturas(f.id, ini, nmeses)) v;
      okv := okv and abs(tot_fat - tot_cart) < 0.01;
    end if;
    caso := f.nome || ': a soma bate (livre do mês, gastos e faturas)'; ok := okv; return next;

    okv := true;
    select min(l.data) into ini from produto.lancamentos l where l.familia_id = f.id and l.apagado_em is null;
    m := date_trunc('month', coalesce(ini, hoje))::date;
    while m <= date_trunc('month', hoje)::date loop
      r := produto._resumo(f.id, least(hoje, (m + interval '1 month' - interval '1 day')::date));
      okv := okv and (r->>'colchao')::numeric >= 0 and (r->>'pode_gastar_hoje')::numeric >= 0
         and not exists (select 1 from jsonb_array_elements(r->'envelopes') v
               where (v->>'colchao')::numeric < 0 or (v->>'colchao')::numeric > (v->>'colchao_meta')::numeric
                  or (jsonb_typeof(v->'hoje') = 'number' and (v->>'hoje')::numeric < 0));
      m := (m + interval '1 month')::date;
    end loop;
    caso := f.nome || ': nenhum mês abaixo do colchão'; ok := okv; return next;

    caso := f.nome || ': nenhum lançamento repetido';
    ok := not exists (select 1 from produto.lancamentos a join produto.lancamentos b
            on a.familia_id = b.familia_id and a.envelope_id = b.envelope_id and a.valor = b.valor and a.data = b.data
           and a.descricao is not distinct from b.descricao and a.cartao_id is not distinct from b.cartao_id and a.autor = b.autor
           and a.id < b.id and abs(extract(epoch from (a.criado_em - b.criado_em))) < 10
           where a.familia_id = f.id and a.apagado_em is null and b.apagado_em is null);
    return next;
  end loop;
end $$;

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
    res := res || array['Feira R$ 15.167 por mês vira R$ 3.500 por semana', '3500.00', function_env->>'teto_semana'];
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
    res := res || array['R$ 300 no cartão em 10/11: entra na fatura de dezembro (1.250 + 300)', '1550', b];
    select v->>'total' into b from jsonb_array_elements(produto._faturas(silva, '2026-11-01', 2)) v where v->>'mes' = '2026-11';
    res := res || array['R$ 300 no cartão em 10/11: fatura de novembro não muda', '0', b];
    j := produto.lancar(silva, contas, 300, '2026-11-10', 'Teste cartão', cartao_ana, 7.5);
    res := res || array['Toque duplo em 10 segundos não grava 2 vezes', 'true', j->>'repetido'];
    perform produto.apagar_lancamento(lid);
    r := produto._resumo(silva, dia);
    select v into function_env from jsonb_array_elements(r->'envelopes') v where v->>'id' = contas::text;
    a := function_env->>'livre';
    select v->>'total' into b from jsonb_array_elements(produto._faturas(silva, '2026-11-01', 2)) v where v->>'mes' = '2026-12';
    res := res || array['Lixeira: livre volta pra 4.750 e a fatura de dez pra 1.250', '4750.00 | 1250', a || ' | ' || b];
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

alter function produto.teste_vazamento() rename to _teste_vazamento_tabelas;

create or replace function produto._teste_vazamento_rpc() returns table(caso text, esperado text, obtido text, ok boolean) language plpgsql volatile set search_path = '' as
$$
declare
  ana constant text := 'a0000000-0000-4e0e-8000-0000000000a1';
  carla constant text := 'a0000000-0000-4e0e-8000-0000000000c1';
  davi constant text := 'a0000000-0000-4e0e-8000-0000000000d1';
  estranho constant text := 'a0000000-0000-4e0e-8000-0000000000ff';
  silva constant text := 'f0000000-0000-4e0e-8000-000000000001';
  t2 constant text := 'f0000000-0000-4e0e-8000-000000000002';
  c record;
begin
  for c in select * from (values
    ('Silva chama resumo_hoje da Teste 2', ana, 'authenticated', format('select 1 from produto.resumo_hoje(%L)', t2), 'contar', 'bloqueado'),
    ('Silva chama faturas da Teste 2', ana, 'authenticated', format('select 1 from produto.faturas(%L, 3)', t2), 'contar', 'bloqueado'),
    ('Silva lanca na Teste 2 pelo lancar()', ana, 'authenticated', format('select 1 from produto.lancar(%L, %L, 10)', t2, 'e0000000-0000-4e0e-8000-000000000022'), 'contar', 'bloqueado'),
    ('Silva lanca na Silva com envelope da Teste 2', ana, 'authenticated', format('select 1 from produto.lancar(%L, %L, 10)', silva, 'e0000000-0000-4e0e-8000-000000000022'), 'contar', 'bloqueado'),
    ('Silva apaga lancamento da Teste 2', ana, 'authenticated', 'select 1 from produto.apagar_lancamento(''b9077088-a3a8-4736-95ce-f29553ad3ef1'')', 'contar', 'erro: lancamento nao encontrado, ja na lixeira ou sem permissao'),
    ('Silva convida gente na Teste 2', ana, 'authenticated', format('select 1 from produto.convidar(%L, %L, %L)', t2, 'equipe', 'X'), 'contar', 'bloqueado'),
    ('Silva baixa os dados da Teste 2', ana, 'authenticated', format('select 1 from produto.exportar_familia(%L)', t2), 'contar', 'bloqueado'),
    ('Equipe chama exportar_familia', carla, 'authenticated', format('select 1 from produto.exportar_familia(%L)', silva), 'contar', 'bloqueado'),
    ('Pessoa chama exportar_familia', davi, 'authenticated', format('select 1 from produto.exportar_familia(%L)', silva), 'contar', 'bloqueado'),
    ('Equipe convida alguem', carla, 'authenticated', format('select 1 from produto.convidar(%L, %L, %L)', silva, 'equipe', 'X'), 'contar', 'bloqueado'),
    ('Equipe lanca com cartao pelo lancar()', carla, 'authenticated', format('select 1 from produto.lancar(%L, %L, 10, null, null, %L)', silva, 'e0000000-0000-4e0e-8000-000000000011', 'c0000000-0000-4e0e-8000-000000000011'), 'contar', 'bloqueado'),
    ('Equipe lanca no envelope do casal pelo lancar()', carla, 'authenticated', format('select 1 from produto.lancar(%L, %L, 10)', silva, 'e0000000-0000-4e0e-8000-000000000012'), 'contar', 'bloqueado'),
    ('Equipe ve no resumo so o envelope Casa', carla, 'authenticated', format('select json_array_length(produto.resumo_hoje(%L)->''envelopes'')', silva), 'contar', '1'),
    ('Pessoa ve no resumo so o envelope dela', davi, 'authenticated', format('select json_array_length(produto.resumo_hoje(%L)->''envelopes'')', silva), 'contar', '1'),
    ('Equipe ve faturas (cartoes)', carla, 'authenticated', format('select json_array_length(produto.faturas(%L, 3)->''faturas'')', silva), 'contar', '0'),
    ('Logado sem familia chama resumo_hoje da Silva', estranho, 'authenticated', format('select 1 from produto.resumo_hoje(%L)', silva), 'contar', 'bloqueado'),
    ('Logado sem familia entra com codigo errado', estranho, 'authenticated', 'select case when (produto.entrar_equipe(''abcd'')->>''ok'')::boolean then 1 else 0 end', 'contar', '0'),
    ('Casal que nao e dono chama numeros_semana', ana, 'authenticated', 'select 1 from produto.numeros_semana()', 'contar', 'bloqueado'),
    ('Casal le resultados dos testes', ana, 'authenticated', 'select count(*) from produto.teste_resultados', 'contar', '0'),
    ('Casal le a lista de donos', ana, 'authenticated', 'select count(*) from produto.donos_produto', 'contar', '0'),
    ('Casal chama o turno noturno', ana, 'authenticated', 'select 1 from produto.rodar_testes_noturnos()', 'contar', 'bloqueado'),
    ('Casal chama o teste de vazamento', ana, 'authenticated', 'select count(*) from produto.teste_vazamento()', 'contar', 'bloqueado'),
    ('anon chama resumo_hoje', null, 'anon', format('select 1 from produto.resumo_hoje(%L)', silva), 'contar', 'bloqueado'),
    ('anon chama criar_familia', null, 'anon', 'select 1 from produto.criar_familia(''x'',''y'')', 'contar', 'bloqueado'),
    ('anon chama entrar_equipe', null, 'anon', 'select 1 from produto.entrar_equipe(''1234'')', 'contar', 'bloqueado'),
    ('CONTROLE casal Silva ve o resumo com 5 envelopes', ana, 'authenticated', format('select json_array_length(produto.resumo_hoje(%L)->''envelopes'')', silva), 'contar', '5'),
    ('CONTROLE casal Silva lanca pelo lancar()', ana, 'authenticated', format('select case when produto.lancar(%L, %L, 10) is not null then 1 else 0 end', silva, 'e0000000-0000-4e0e-8000-000000000013'), 'contar', '1'),
    ('CONTROLE casal Silva baixa os dados (5 lancamentos)', ana, 'authenticated', format('select json_array_length(produto.exportar_familia(%L)->''lancamentos'')', silva), 'contar', '5'),
    ('CONTROLE equipe lanca na Casa pelo lancar()', carla, 'authenticated', format('select case when produto.lancar(%L, %L, 10) is not null then 1 else 0 end', silva, 'e0000000-0000-4e0e-8000-000000000011'), 'contar', '1'),
    ('CONTROLE logado cria a propria familia', estranho, 'authenticated', 'select case when produto.criar_familia(''Familia Nova'',''Eu'') is not null then 1 else 0 end', 'contar', '1')
  ) as v(nome, uid, papel_db, sql, modo, esp) loop
    caso := c.nome; esperado := c.esp;
    obtido := produto._tentativa(c.uid, c.papel_db, c.sql, c.modo);
    ok := obtido = esperado; return next;
  end loop;
end $$;

create or replace function produto.teste_vazamento() returns table(caso text, esperado text, obtido text, ok boolean) language sql volatile set search_path = '' as
$$ select * from produto._teste_vazamento_tabelas() union all select * from produto._teste_vazamento_rpc() $$;

create or replace function produto.rodar_testes_noturnos() returns text language plpgsql volatile set search_path = '' as
$$
declare rid uuid := gen_random_uuid(); n_falha int; quebrou text;
begin
  begin
    insert into produto.teste_resultados (rodada, teste, caso, ok) select rid, 'teste_conta', t.caso, t.ok from produto.teste_conta() t;
    insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe) select rid, 'teste_contas_casos', t.caso, t.ok, 'esperado ' || coalesce(t.esperado,'') || ', obtido ' || coalesce(t.obtido,'') from produto.teste_contas_casos() t;
    insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe) select rid, 'teste_vazamento', t.caso, t.ok, 'esperado ' || coalesce(t.esperado,'') || ', obtido ' || coalesce(t.obtido,'') from produto.teste_vazamento() t;
  exception when others then quebrou := sqlerrm;
  end;
  if quebrou is not null then
    insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe) values (rid, 'turno', 'precisa de você', false, 'o turno de teste quebrou: ' || quebrou);
    return 'precisa de você: ' || quebrou;
  end if;
  select count(*) into n_falha from produto.teste_resultados r where r.rodada = rid and not r.ok;
  insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe)
  values (rid, 'turno', case when n_falha = 0 then 'tudo certo' else 'precisa de você' end, n_falha = 0,
          n_falha || ' caso(s) falharam de ' || (select count(*) from produto.teste_resultados r where r.rodada = rid));
  return case when n_falha = 0 then 'tudo certo' else 'precisa de você: ' || n_falha || ' caso(s) falharam' end;
end $$;

revoke execute on function produto.teste_contas_casos() from public, anon, authenticated;
revoke execute on function produto._teste_vazamento_rpc() from public, anon, authenticated;
revoke execute on function produto.teste_vazamento() from public, anon, authenticated;
revoke execute on function produto._teste_vazamento_tabelas() from public, anon, authenticated;
revoke execute on function produto.rodar_testes_noturnos() from public, anon, authenticated;
revoke execute on function produto.teste_conta() from public, anon;
grant execute on function produto.teste_conta() to authenticated;
;