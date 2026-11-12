CREATE OR REPLACE FUNCTION produto._teste_vazamento_rpc()
 RETURNS TABLE(caso text, esperado text, obtido text, ok boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  ana constant text := 'a0000000-0000-4e0e-8000-0000000000a1';
  carla constant text := 'a0000000-0000-4e0e-8000-0000000000c1';
  davi constant text := 'a0000000-0000-4e0e-8000-0000000000d1';
  paulo constant text := 'a0000000-0000-4e0e-8000-0000000000f2';
  estranho constant text := 'a0000000-0000-4e0e-8000-0000000000ff';
  silva constant text := 'f0000000-0000-4e0e-8000-000000000001';
  t2 constant text := 'f0000000-0000-4e0e-8000-000000000002';
  dinheiro constant text := '"[a-z_]*(valor|preco|custo|salario|total|limite|gasto)[a-z_]*"\s*:';
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
    -- casa_da_equipe e casa_marcar (produto_15)
    ('Equipe da Silva chama casa_da_equipe da Teste 2', carla, 'authenticated', format('select 1 from produto.casa_da_equipe(%L)', t2), 'contar', 'bloqueado'),
    ('Equipe da Silva marca chegada na Teste 2', carla, 'authenticated', format('select 1 from produto.casa_marcar(%L, %L, %L)', t2, 'cheguei', '{}'), 'contar', 'bloqueado'),
    ('Equipe da Silva marca item na lista da Teste 2', carla, 'authenticated', format('select 1 from produto.casa_marcar(%L, %L, %L)', t2, 'acabou', '{"nome":"x"}'), 'contar', 'bloqueado'),
    ('Casal Silva chama casa_da_equipe da Teste 2', ana, 'authenticated', format('select 1 from produto.casa_da_equipe(%L)', t2), 'contar', 'bloqueado'),
    ('Casal Teste 2 chama casa_da_equipe da Silva', paulo, 'authenticated', format('select 1 from produto.casa_da_equipe(%L)', silva), 'contar', 'bloqueado'),
    ('Pessoa chama casa_da_equipe', davi, 'authenticated', format('select 1 from produto.casa_da_equipe(%L)', silva), 'contar', 'bloqueado'),
    ('Pessoa chama casa_marcar', davi, 'authenticated', format('select 1 from produto.casa_marcar(%L, %L, %L)', silva, 'troquei_gas', '{}'), 'contar', 'bloqueado'),
    ('Logado sem familia chama casa_da_equipe', estranho, 'authenticated', format('select 1 from produto.casa_da_equipe(%L)', silva), 'contar', 'bloqueado'),
    ('anon chama casa_da_equipe', null, 'anon', format('select 1 from produto.casa_da_equipe(%L)', silva), 'contar', 'bloqueado'),
    ('anon chama casa_marcar', null, 'anon', format('select 1 from produto.casa_marcar(%L, %L, %L)', silva, 'cheguei', '{}'), 'contar', 'bloqueado'),
    ('Resposta da equipe tem chave de dinheiro (valor, preco, custo, salario)', carla, 'authenticated', format('select case when produto.casa_da_equipe(%L)::text ~* %L then 1 else 0 end', silva, dinheiro), 'contar', '0'),
    ('Resposta da equipe tem R$ ou o numero 150 ou 1800', carla, 'authenticated', format('select case when produto.casa_da_equipe(%L)::text ~ %L then 1 else 0 end', silva, '(R\$|\m150\M|\m1800\M|28\.9)'), 'contar', '0'),
    ('Resposta de casa_marcar da equipe tem chave de dinheiro', carla, 'authenticated', format('select case when produto.casa_marcar(%L, %L, %L)::text ~* %L then 1 else 0 end', silva, 'prestador_veio', '{"id":"p1"}', dinheiro), 'contar', '0'),
    ('Equipe continua sem ler config_familia direto', carla, 'authenticated', 'select count(*) from produto.config_familia', 'contar', '0'),
    ('CONTROLE casal Silva ve o resumo com 5 envelopes', ana, 'authenticated', format('select json_array_length(produto.resumo_hoje(%L)->''envelopes'')', silva), 'contar', '5'),
    ('CONTROLE casal Silva lanca pelo lancar()', ana, 'authenticated', format('select case when produto.lancar(%L, %L, 10) is not null then 1 else 0 end', silva, 'e0000000-0000-4e0e-8000-000000000013'), 'contar', '1'),
    ('CONTROLE casal Silva baixa os dados (5 lancamentos)', ana, 'authenticated', format('select json_array_length(produto.exportar_familia(%L)->''lancamentos'')', silva), 'contar', '5'),
    ('CONTROLE equipe lanca na Casa pelo lancar()', carla, 'authenticated', format('select case when produto.lancar(%L, %L, 10) is not null then 1 else 0 end', silva, 'e0000000-0000-4e0e-8000-000000000011'), 'contar', '1'),
    ('CONTROLE logado cria a propria familia', estranho, 'authenticated', 'select case when produto.criar_familia(''Familia Nova'',''Eu'') is not null then 1 else 0 end', 'contar', '1'),
    ('CONTROLE equipe ve a lista da casa (2 itens)', carla, 'authenticated', format('select json_array_length(produto.casa_da_equipe(%L)->''lista'')', silva), 'contar', '2'),
    ('CONTROLE equipe ve 1 prestador com proxima visita', carla, 'authenticated', format('select count(*) from json_array_elements(produto.casa_da_equipe(%L)->''prestadores'') p where p->>''proxima_visita'' is not null', silva), 'contar', '1'),
    ('CONTROLE equipe ve a proxima troca do gas', carla, 'authenticated', format('select case when produto.casa_da_equipe(%L)->''gas''->>''proxima_troca'' is not null then 1 else 0 end', silva), 'contar', '1'),
    ('CONTROLE equipe marca comprei e o item fica ok', carla, 'authenticated', format('select count(*) from json_array_elements(produto.casa_marcar(%L, %L, %L)->''lista'') i where i->>''id'' = ''i1'' and (i->>''ok'')::boolean', silva, 'comprei', '{"id":"i1"}'), 'contar', '1'),
    ('CONTROLE equipe marca acabou e o item entra na lista', carla, 'authenticated', format('select json_array_length(produto.casa_marcar(%L, %L, %L)->''lista'')', silva, 'acabou', '{"nome":"Sabao"}'), 'contar', '3'),
    ('CONTROLE equipe marca cheguei e aparece em quem veio', carla, 'authenticated', format('select json_array_length(produto.casa_marcar(%L, %L, %L)->''presenca''->''hoje'')', silva, 'cheguei', '{}'), 'contar', '1'),
    ('CONTROLE equipe marca troquei o gas', carla, 'authenticated', format('select json_array_length(produto.casa_marcar(%L, %L, %L)->''gas''->''trocas'')', silva, 'troquei_gas', '{}'), 'contar', '4'),
    ('CONTROLE casal Silva chama casa_da_equipe', ana, 'authenticated', format('select json_array_length(produto.casa_da_equipe(%L)->''lista'')', silva), 'contar', '2')
  ) as v(nome, uid, papel_db, sql, modo, esp) loop
    caso := c.nome; esperado := c.esp;
    obtido := produto._tentativa(c.uid, c.papel_db, c.sql, c.modo);
    ok := obtido = esperado; return next;
  end loop;
end $function$;;