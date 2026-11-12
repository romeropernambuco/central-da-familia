
-- a Familia Silva ganhou 1 lancamento de exemplo (a compra da fatura do Nubank): os 2 controles que contavam 5 passam a contar 6
do $$ declare r record; s text; begin
  for r in select p.oid::regprocedure sig from pg_proc p where p.pronamespace = 'produto'::regnamespace
            and p.proname in ('_teste_vazamento_tabelas', '_teste_vazamento_rpc', '_teste_revisao', '_teste_revisao_2') loop
    s := pg_get_functiondef(r.sig);
    if s ~ 'CONTROLE casal Silva (ve os 5 lancamentos dela|baixa os dados \(5 lancamentos\))' then
      s := regexp_replace(s, '(CONTROLE casal Silva ve os )5( lancamentos dela''[^\n]*)''5''\)', '\16\2''6'')');
      s := regexp_replace(s, '(CONTROLE casal Silva baixa os dados \()5( lancamentos\)''[^\n]*)''5''\)', '\16\2''6'')');
      execute s;
    end if;
  end loop;
end $$;

create function produto._teste_vazamento_escritorio() returns table(caso text, esperado text, obtido text, ok boolean)
language plpgsql set search_path = '' as $$
declare
  ana constant text := 'a0000000-0000-4e0e-8000-0000000000a1'; carla constant text := 'a0000000-0000-4e0e-8000-0000000000c1';
  davi constant text := 'a0000000-0000-4e0e-8000-0000000000d1'; paulo constant text := 'a0000000-0000-4e0e-8000-0000000000f2';
  estranho constant text := 'a0000000-0000-4e0e-8000-0000000000ff';
  silva constant text := 'f0000000-0000-4e0e-8000-000000000001'; t2 constant text := 'f0000000-0000-4e0e-8000-000000000002';
  t text; c record;
begin
  foreach t in array array['pat_aplicacoes','pat_movimentos','esc_lembretes','esc_diario','feiras','estoque_itens','estoque_contagens','cartao_custos','cartao_faturas'] loop
    caso := 'Teste 2 lê ' || t || ' da Silva'; esperado := '0'; obtido := produto._tentativa(paulo, 'authenticated', format('select count(*) from produto.%I', t), 'contar'); ok := obtido = esperado; return next;
    caso := 'Pessoa (filho) lê ' || t; esperado := '0'; obtido := produto._tentativa(davi, 'authenticated', format('select count(*) from produto.%I', t), 'contar'); ok := obtido = esperado; return next;
    caso := 'Logado sem família lê ' || t; esperado := '0'; obtido := produto._tentativa(estranho, 'authenticated', format('select count(*) from produto.%I', t), 'contar'); ok := obtido = esperado; return next;
    caso := 'anon lê ' || t; esperado := 'bloqueado'; obtido := produto._tentativa(null, 'anon', format('select count(*) from produto.%I', t), 'contar'); ok := obtido = esperado; return next;
    caso := 'Silva apaga linhas de ' || t || ' (ninguém apaga pelo app)'; esperado := 'bloqueado'; obtido := produto._tentativa(ana, 'authenticated', format('delete from produto.%I', t), 'linhas'); ok := obtido = esperado; return next;
    if t in ('pat_aplicacoes','pat_movimentos','esc_lembretes','cartao_custos','cartao_faturas') then
      caso := 'Equipe lê ' || t || ' (dinheiro)'; esperado := '0'; obtido := produto._tentativa(carla, 'authenticated', format('select count(*) from produto.%I', t), 'contar'); ok := obtido = esperado; return next;
    end if;
  end loop;
  for c in select * from (values
    ('Silva chama guardado_hoje da Teste 2', ana, format('select 1 from produto.guardado_hoje(%L)', t2), 'contar', 'bloqueado'),
    ('Silva cria aplicação na Teste 2', ana, format('select 1 from produto.guardado_criar(%L, ''x'', ''y'', ''cdb'', 100, 10)', t2), 'contar', 'bloqueado'),
    ('Silva pergunta o custo do gasto da Teste 2', ana, format('select 1 from produto.guardado_custo_do_gasto(%L, 100)', t2), 'contar', 'bloqueado'),
    ('Teste 2 movimenta aplicação da Silva', paulo, 'select 1 from produto.guardado_movimentar(''aa000000-0000-4e0e-8000-000000000001'', ''resgate'', 10, null, gen_random_uuid())', 'contar', 'bloqueado'),
    ('Teste 2 encerra aplicação da Silva', paulo, 'select 1 from produto.guardado_encerrar(''aa000000-0000-4e0e-8000-000000000001'')', 'contar', 'bloqueado'),
    ('Silva grava movimento direto na Teste 2', ana, format('insert into produto.pat_movimentos (familia_id, aplicacao_id, tipo, valor, chave, autor) values (%L, ''aa000000-0000-4e0e-8000-000000000001'', ''aporte'', 10, gen_random_uuid(), %L)', t2, ana), 'linhas', 'bloqueado'),
    ('Silva chama escritorio_hoje da Teste 2', ana, format('select 1 from produto.escritorio_hoje(%L)', t2), 'contar', 'bloqueado'),
    ('Silva responde pergunta da Teste 2', ana, format('select 1 from produto.escritorio_responder(%L, ''x'', ''y'')', t2), 'contar', 'bloqueado'),
    ('Silva pede relatório da Teste 2', ana, format('select 1 from produto.escritorio_relatorio(%L)', t2), 'contar', 'bloqueado'),
    ('Silva pede diário da Teste 2', ana, format('select 1 from produto.escritorio_diario(%L)', t2), 'contar', 'bloqueado'),
    ('Silva cria lembrete na Teste 2', ana, format('select 1 from produto.lembrete_criar(%L, ''x'', now())', t2), 'contar', 'bloqueado'),
    ('Teste 2 conclui lembrete da Silva', paulo, 'select 1 from produto.lembrete_concluir(''ac000000-0000-4e0e-8000-000000000001'')', 'contar', 'bloqueado'),
    ('Teste 2 apaga lembrete da Silva', paulo, 'select 1 from produto.lembrete_apagar(''ac000000-0000-4e0e-8000-000000000001'')', 'contar', 'bloqueado'),
    ('Silva salva cartão na Teste 2', ana, format('select 1 from produto.cartao_salvar(%L, ''x'')', t2), 'contar', 'bloqueado'),
    ('Silva informa fatura na Teste 2', ana, format('select 1 from produto.fatura_informar(%L, ''c0000000-0000-4e0e-8000-000000000021'', ''2026-11'', 10)', t2), 'contar', 'bloqueado'),
    ('Silva registra feira na Teste 2', ana, format('select 1 from produto.feira_registrar(%L)', t2), 'contar', 'bloqueado'),
    ('Teste 2 anexa nota em feira da Silva', paulo, format('select 1 from produto.feira_anexar_nota(''ae000000-0000-4e0e-8000-000000000001'', %L)', silva || '/x.jpg'), 'contar', 'bloqueado'),
    ('Teste 2 marca "sem nota" em feira da Silva', paulo, 'select 1 from produto.feira_sem_nota(''ae000000-0000-4e0e-8000-000000000001'', ''x'')', 'contar', 'bloqueado'),
    ('Silva conta estoque da Teste 2', ana, format('select 1 from produto.estoque_contar(%L, ''[{"item_id":"af000000-0000-4e0e-8000-000000000001","estado":"tem"}]'')', t2), 'contar', 'bloqueado'),
    ('Silva salva item de estoque na Teste 2', ana, format('select 1 from produto.estoque_item_salvar(%L, ''x'')', t2), 'contar', 'bloqueado'),
    ('Pessoa chama guardado_hoje', davi, format('select 1 from produto.guardado_hoje(%L)', silva), 'contar', 'bloqueado'),
    ('Pessoa chama escritorio_hoje: vem vazio', davi, format('select (produto.escritorio_hoje(%L)::jsonb->>''total_precisa'')::int + jsonb_array_length(produto.escritorio_hoje(%L)::jsonb->''funcionarios'')', silva, silva), 'contar', '0'),
    ('Pessoa responde ao escritório', davi, format('select 1 from produto.escritorio_responder(%L, ''x'', ''y'')', silva), 'contar', 'bloqueado'),
    ('Pessoa registra feira', davi, format('select 1 from produto.feira_registrar(%L)', silva), 'contar', 'bloqueado'),
    ('Pessoa vê o limite e a anuidade dos cartões', davi, 'select count(*) from produto.cartao_custos', 'contar', '0'),
    ('Equipe chama guardado_hoje', carla, format('select 1 from produto.guardado_hoje(%L)', silva), 'contar', 'bloqueado'),
    ('Equipe chama escritorio_hoje: nenhum R$, valor, limite, salário ou saldo', carla, format($q$select (produto.escritorio_hoje(%L)::text ~* 'R\$|"valor"|"limite"|salario|"saldo"|"total"|custo')::int$q$, silva), 'contar', '0'),
    ('Equipe: escritorio_hoje só traz os funcionários da Casa', carla, format($q$select count(*) from jsonb_array_elements(produto.escritorio_hoje(%L)::jsonb->'funcionarios') x where x->>'id' not in ('comprador', 'fiscal_feira')$q$, silva), 'contar', '0'),
    ('Equipe pede o diário: nenhum R$', carla, format($q$select (produto.escritorio_diario(%L)::text ~* 'R\$|"valor"')::int$q$, silva), 'contar', '0'),
    ('Equipe pede o relatório: nenhum R$', carla, format($q$select (produto.escritorio_relatorio(%L)::text ~* 'R\$|"valor"')::int$q$, silva), 'contar', '0'),
    ('Equipe cria lembrete', carla, format('select 1 from produto.lembrete_criar(%L, ''x'', now())', silva), 'contar', 'bloqueado'),
    ('Equipe salva cartão', carla, format('select 1 from produto.cartao_salvar(%L, ''x'')', silva), 'contar', 'bloqueado'),
    ('Equipe informa fatura', carla, format('select 1 from produto.fatura_informar(%L, ''c0000000-0000-4e0e-8000-000000000011'', ''2026-11'', 10)', silva), 'contar', 'bloqueado'),
    ('Equipe vê a feira sem o valor', carla, format($q$select (produto.feira_registrar(%L, '2026-11-09')::text ~* 'R\$|"valor"|lancamento')::int$q$, silva), 'contar', '0'),
    ('Equipe muda quem fez a feira', carla, 'update produto.feiras set feita_por = gen_random_uuid()', 'linhas', 'bloqueado'),
    ('Casal muda o texto de uma resposta do diário', ana, 'update produto.esc_diario set resposta = ''x''', 'linhas', 'bloqueado'),
    ('CONTROLE casal Silva vê as 2 aplicações e os 5 movimentos', ana, 'select (select count(*) from produto.pat_aplicacoes) * 10 + (select count(*) from produto.pat_movimentos)', 'contar', '25'),
    ('CONTROLE casal Silva vê os custos dos 2 cartões e 1 fatura informada', ana, 'select (select count(*) from produto.cartao_custos) * 10 + (select count(*) from produto.cartao_faturas)', 'contar', '21'),
    ('CONTROLE equipe vê 1 feira e os 7 itens da casa', carla, 'select (select count(*) from produto.feiras) * 10 + (select count(*) from produto.estoque_itens)', 'contar', '17'),
    ('CONTROLE casal Silva recebe perguntas do escritório', ana, format('select (jsonb_array_length(produto.escritorio_hoje(%L)::jsonb->''funcionarios'') = 8)::int', silva), 'contar', '1')
  ) as x(caso, uid, q, modo, esperado) loop
    caso := c.caso; esperado := c.esperado; obtido := produto._tentativa(c.uid, 'authenticated', c.q, c.modo); ok := obtido = esperado; return next;
  end loop;
  for c in select * from (values ('guardado_hoje'), ('escritorio_hoje'), ('escritorio_relatorio'), ('escritorio_diario')) as x(fn) loop
    caso := 'anon chama ' || c.fn; esperado := 'bloqueado'; obtido := produto._tentativa(null, 'anon', format('select 1 from produto.%I(%L)', c.fn, silva), 'contar'); ok := obtido = esperado; return next;
  end loop;
end $$;
revoke execute on function produto._teste_vazamento_escritorio() from public, anon, authenticated;

create or replace function produto.teste_vazamento() returns table(caso text, esperado text, obtido text, ok boolean)
language sql set search_path = '' as $$
  select * from produto._teste_vazamento_tabelas() union all select * from produto._teste_vazamento_rpc()
  union all select * from produto._teste_revisao() union all select * from produto._teste_revisao_2()
  union all select * from produto._teste_vazamento_escritorio()
$$;

-- turno da noite: entram os 2 testes novos
do $$ begin
  execute replace(pg_get_functiondef('produto.rodar_testes_noturnos()'::regprocedure),
    $a$  exception when others then quebrou := sqlerrm;$a$,
    $b$    insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe) select rid, 'teste_guardado', t.caso, t.ok, 'esperado ' || coalesce(t.esperado,'') || ', obtido ' || coalesce(t.obtido,'') from produto.teste_guardado() t;
    insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe) select rid, 'teste_escritorio', t.caso, t.ok, 'esperado ' || coalesce(t.esperado,'') || ', obtido ' || left(coalesce(t.obtido,''), 300) from produto.teste_escritorio() t;
  exception when others then quebrou := sqlerrm;$b$);
end $$;

-- LGPD: o que a familia baixa passa a incluir o Guardado, o Escritorio, os cartoes, a feira e o estoque
do $$ begin
  execute replace(pg_get_functiondef('produto.exportar_familia(uuid)'::regprocedure),
    $a$    'uso_da_ia', $a$,
    $b$    'guardado_aplicacoes', (select coalesce(json_agg(x order by x.criado_em), '[]') from produto.pat_aplicacoes x where x.familia_id = f),
    'guardado_movimentos', (select coalesce(json_agg(x order by x.data, x.criado_em), '[]') from produto.pat_movimentos x where x.familia_id = f),
    'lembretes', (select coalesce(json_agg(x order by x.quando), '[]') from produto.esc_lembretes x where x.familia_id = f),
    'diario_do_escritorio', (select coalesce(json_agg(x order by x.quando), '[]') from produto.esc_diario x where x.familia_id = f),
    'cartao_custos', (select coalesce(json_agg(x), '[]') from produto.cartao_custos x where x.familia_id = f),
    'cartao_faturas', (select coalesce(json_agg(x order by x.mes), '[]') from produto.cartao_faturas x where x.familia_id = f),
    'feiras', (select coalesce(json_agg(x order by x.data), '[]') from produto.feiras x where x.familia_id = f),
    'estoque_itens', (select coalesce(json_agg(x order by x.nome), '[]') from produto.estoque_itens x where x.familia_id = f),
    'estoque_contagens', (select coalesce(json_agg(x order by x.data), '[]') from produto.estoque_contagens x where x.familia_id = f),
    'uso_da_ia', $b$);
end $$;
;