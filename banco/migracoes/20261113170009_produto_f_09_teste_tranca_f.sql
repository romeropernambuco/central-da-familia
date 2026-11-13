-- f_09 (fase final): os testes da fase final, rodando no banco e toda noite.
--  * produto.teste_tranca_f(): monta 1 família de teste com 5 pessoas de mentira (casal A, casal B, filha, equipe e um
--    estranho de outra família), tenta ler e escrever como cada uma e desfaz tudo no fim (nada fica gravado).
--    As pessoas de mentira NÃO entram em auth.users (igual ao teste_vazamento): o RLS só olha o login (request.jwt.claims),
--    e assim o teste não depende do gatilho de auth.users, que no banco real está diferente das migrações (ver BANCO_E1.md).
--  * produto.teste_futuro_ir(): os 10 casos IR de fase_final/casos_teste.json contra produto._aliq_ir (a mesma tabela
--    que o motor usa em codigo/src/lib/futuro/f1_rendimento.ts). Os números estão copiados aqui; o rodar.sh confere
--    se continuam iguais aos do json.
--  * rodar_testes_noturnos passa a gravar os 2 em produto.teste_resultados.
-- Desfazer: banco/migracoes/desfazer/f_09.sql

create function produto.teste_tranca_f()
returns table (caso text, esperado text, obtido text, ok boolean)
language plpgsql security invoker set search_path = '' as $$
declare
  -- tudo inventado; prefixo ...f0xx pra não bater com as famílias de exemplo
  fam   constant text := 'f0000000-0000-4e0e-8000-00000000f001';
  fam2  constant text := 'f0000000-0000-4e0e-8000-00000000f002';
  ua    constant text := 'a0000000-0000-4e0e-8000-00000000fa01';  -- casal A
  ub    constant text := 'a0000000-0000-4e0e-8000-00000000fb01';  -- casal B
  up    constant text := 'a0000000-0000-4e0e-8000-00000000fc01';  -- filha (pessoa)
  ue    constant text := 'a0000000-0000-4e0e-8000-00000000fd01';  -- equipe da casa
  ux    constant text := 'a0000000-0000-4e0e-8000-00000000fe01';  -- estranho (casal de outra família)
  ma    constant text := 'd0000000-0000-4e0e-8000-00000000fa01';
  mb    constant text := 'd0000000-0000-4e0e-8000-00000000fb01';
  mp    constant text := 'd0000000-0000-4e0e-8000-00000000fc01';
  me    constant text := 'd0000000-0000-4e0e-8000-00000000fd01';
  mx    constant text := 'd0000000-0000-4e0e-8000-00000000fe01';
  env_a constant text := 'e0000000-0000-4e0e-8000-00000000fa01';
  env_b constant text := 'e0000000-0000-4e0e-8000-00000000fb01';
  env_p constant text := 'e0000000-0000-4e0e-8000-00000000fc01';
  env_casa  constant text := 'e0000000-0000-4e0e-8000-00000000f0c1';
  env_comum constant text := 'e0000000-0000-4e0e-8000-00000000f0c2';  -- sem dono: "do casal"
  env_x constant text := 'e0000000-0000-4e0e-8000-00000000fe01';
  env_s constant text := 'e0000000-0000-4e0e-8000-00000000f0c3';  -- semanal, sem dono
  l_parc_s constant text := 'b0000000-0000-4e0e-8000-00000000fa04';
  cart_a constant text := 'c0000000-0000-4e0e-8000-00000000fa01';
  cart_b constant text := 'c0000000-0000-4e0e-8000-00000000fb01';
  cart_b2 constant text := 'c0000000-0000-4e0e-8000-00000000fb02';  -- de B, sem os dias
  l_a   constant text := 'b0000000-0000-4e0e-8000-00000000fa01';
  l_b   constant text := 'b0000000-0000-4e0e-8000-00000000fb01';
  l_b_lixo constant text := 'b0000000-0000-4e0e-8000-00000000fb02';  -- de B, na lixeira
  chave_e constant text := '60000000-0000-4e0e-8000-00000000fd01';
  l_p   constant text := 'b0000000-0000-4e0e-8000-00000000fc01';
  l_casa_a constant text := 'b0000000-0000-4e0e-8000-00000000fa02';
  l_parc constant text := 'b0000000-0000-4e0e-8000-00000000fa03';
  l_x   constant text := 'b0000000-0000-4e0e-8000-00000000fe01';
  rec_a constant text := '90000000-0000-4e0e-8000-00000000fa01';
  rec_b constant text := '90000000-0000-4e0e-8000-00000000fb01';
  des_a constant text := '80000000-0000-4e0e-8000-00000000fa01';
  des_b constant text := '80000000-0000-4e0e-8000-00000000fb01';
  des_p constant text := '80000000-0000-4e0e-8000-00000000fc01';
  app_a constant text := '70000000-0000-4e0e-8000-00000000fa01';
  app_b constant text := '70000000-0000-4e0e-8000-00000000fb01';
  app_c constant text := '70000000-0000-4e0e-8000-00000000f0c1';  -- do casal (sem titular)
  obj   constant text := '{"gasto_2029_hoje": null, "renda_certa_2029": 0, "margem": "0.10", "taxa_real_trabalho": "0.04",
                          "taxa_bruta_ano": {"2026": "0.1375", "2027": "0.1250", "2028": "0.1100"},
                          "ipca_ano": {"2026": "0.0522", "2027": "0.0490", "2028": "0.0400", "2029": "0.0400"},
                          "aliq_proj": "0.225", "piso_meses": null, "mes_reajuste": 1, "travado_focus": false}';
  sem_valor constant text := 'lax $.**.valor';
  r_caso text[] := '{}'; r_esp text[] := '{}'; r_obt text[] := '{}';
  c record; i int; v text; nova uuid; u text; en text; r1 text; r2 text; difere int;
begin
  begin
    -- ===== montagem (como dono do banco; tudo some no fim) =====
    insert into produto.familias (id, nome, exemplo) values (fam::uuid, 'Familia Tranca F (teste)', true), (fam2::uuid, 'Familia Estranha (teste)', true);
    insert into produto.envelopes (id, familia_id, nome, regra, limite_mes, casa) values
      (env_a::uuid, fam::uuid, 'Limite A', 'mensal', 3000, false),
      (env_b::uuid, fam::uuid, 'Limite B', 'mensal', 3000, false),
      (env_p::uuid, fam::uuid, 'Limite da filha', 'mensal', 300, false),
      (env_casa::uuid, fam::uuid, 'Casa', 'mensal', 2000, true),
      (env_comum::uuid, fam::uuid, 'Lazer do casal', 'mensal', 500, false),
      (env_s::uuid, fam::uuid, 'Feira da semana', 'semanal', 2600, false),
      (env_x::uuid, fam2::uuid, 'Geral', 'mensal', 1000, false);
    insert into produto.membros (id, familia_id, user_id, papel, nome, envelope_id) values
      (ma::uuid, fam::uuid, ua::uuid, 'casal', 'Adulto A', env_a::uuid),
      (mb::uuid, fam::uuid, ub::uuid, 'casal', 'Adulto B', env_b::uuid),
      (mp::uuid, fam::uuid, up::uuid, 'pessoa', 'Filha', env_p::uuid),
      (me::uuid, fam::uuid, ue::uuid, 'equipe', 'Equipe', null),
      (mx::uuid, fam2::uuid, ux::uuid, 'casal', 'Estranho', env_x::uuid);
    insert into produto.cartoes (id, familia_id, nome, dia_fechamento, dia_vencimento, titular_membro, final4) values
      (cart_a::uuid, fam::uuid, 'Cartao de A', 1, 10, ma::uuid, '1111'),
      (cart_b::uuid, fam::uuid, 'Cartao de B', 1, 10, mb::uuid, '2222'),
      (cart_b2::uuid, fam::uuid, 'Outro de B', null, null, mb::uuid, '3333');
    insert into produto.lancamentos (id, familia_id, envelope_id, cartao_id, valor, data, descricao, autor) values
      (l_a::uuid, fam::uuid, env_a::uuid, null, 50, date '2026-09-10', 'gasto de A', ua::uuid),
      (l_b::uuid, fam::uuid, env_b::uuid, cart_b::uuid, 80, date '2026-09-11', 'gasto de B', ub::uuid),
      (l_p::uuid, fam::uuid, env_p::uuid, null, 20, date '2026-09-12', 'gasto da filha', up::uuid),
      (l_casa_a::uuid, fam::uuid, env_casa::uuid, null, 30, date '2026-09-13', 'casa por A', ua::uuid),
      (l_x::uuid, fam2::uuid, env_x::uuid, null, 99, date '2026-09-14', 'gasto do estranho', ux::uuid),
      ('b0000000-0000-4e0e-8000-00000000fb03', fam::uuid, env_b::uuid, cart_b::uuid, 70, date '2026-12-05', 'a vista no cartao de B', ub::uuid);
    insert into produto.lancamentos (id, familia_id, envelope_id, valor, data, descricao, autor, apagado_em) values
      (l_b_lixo::uuid, fam::uuid, env_b::uuid, 40, date '2026-09-15', 'de B na lixeira', ub::uuid, now());
    insert into produto.lancamentos (id, familia_id, envelope_id, cartao_id, valor, data, descricao, autor, parcelas) values
      (l_parc::uuid, fam::uuid, env_a::uuid, cart_a::uuid, 1200, date '2026-11-05', 'compra em 6x (exemplo)', ua::uuid, 6),
      (l_parc_s::uuid, fam::uuid, env_s::uuid, cart_a::uuid, 520, date '2026-12-05', 'compra em 4x no semanal (exemplo)', ua::uuid, 4);
    insert into produto.config_familia (familia_id, chave, valor, atualizado_por) values (fam::uuid, 'renda_mes', '9000', ua::uuid);
    insert into produto.recebimentos (id, familia_id, dono_membro, descricao, valor_centavos, mes_previsto, tipo, certo, criado_por) values
      (rec_a::uuid, fam::uuid, ma::uuid, 'contrato de A (exemplo)', 1000000, date '2027-03-01', 'contrato', true, ua::uuid),
      (rec_b::uuid, fam::uuid, mb::uuid, 'retorno de B (exemplo)', 500000, date '2027-06-01', 'retorno', false, ub::uuid);
    insert into produto.desejos (id, familia_id, dono_membro, nome, valor_centavos, mes, volta_de, volta_centavos, volta_mes, volta_certa) values
      (des_a::uuid, fam::uuid, ma::uuid, 'viagem (exemplo)', 5000000, date '2027-07-01', 'contrato', 5000000, date '2027-12-01', true),
      (des_b::uuid, fam::uuid, mb::uuid, 'carro (exemplo)', 9000000, date '2027-02-01', 'nada', 0, null, false),
      (des_p::uuid, fam::uuid, mp::uuid, 'bicicleta (exemplo)', 80000, date '2026-12-01', 'nada', 0, null, false);
    insert into produto.pat_aplicacoes (id, familia_id, titular_membro, nome, banco, tipo, pct_cdi, criado_por) values
      (app_a::uuid, fam::uuid, ma::uuid, 'Caixinha de A', 'Banco X', 'caixinha', 100, ua::uuid),
      (app_b::uuid, fam::uuid, mb::uuid, 'CDB de B', 'Banco Y', 'cdb', 105, ub::uuid),
      (app_c::uuid, fam::uuid, null, 'Conta conjunta', 'Banco W', 'cdb', 100, ua::uuid);
    insert into produto.pat_movimentos (familia_id, aplicacao_id, data, tipo, valor, chave, autor) values
      (fam::uuid, app_a::uuid, date '2026-10-01', 'aporte', 1000, gen_random_uuid(), ua::uuid),
      (fam::uuid, app_b::uuid, date '2026-10-01', 'aporte', 5000, gen_random_uuid(), ub::uuid),
      (fam::uuid, app_c::uuid, date '2026-10-01', 'aporte', 3000, gen_random_uuid(), ua::uuid);
    -- o objetivo gravado "por A": o histórico tem que registrar A como quem mudou
    perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
    insert into produto.objetivo (familia_id, parametros) values (fam::uuid, obj::jsonb);
    perform set_config('request.jwt.claims', '', true);

    -- ===== tentativas (cada uma desfeita na hora) =====
    for c in select * from (values
      -- casal lê tudo da família, com o dono
      ('A le o lancamento de B', ua, 'authenticated', format('select count(*) from produto.lancamentos where id = %L', l_b), 'contar', '1'),
      ('A le os lancamentos da filha', ua, 'authenticated', format('select count(*) from produto.lancamentos where id = %L', l_p), 'contar', '1'),
      ('A baixa a familia e o gasto de B vem com o nome de B', ua, 'authenticated', format('select count(*) from json_array_elements(produto.exportar_familia(%L)->''lancamentos'') x where x->>''id'' = %L and x->>''dono_nome'' = ''Adulto B''', fam, l_b), 'contar', '1'),
      ('A baixa a familia com recebimentos, desejos e objetivo', ua, 'authenticated', format('select count(*) from json_object_keys(produto.exportar_familia(%L)) k where k in (''recebimentos'',''desejos'',''objetivo'',''objetivo_historico'')', fam), 'contar', '4'),
      ('A le os cartoes da familia (o dele e os 2 de B)', ua, 'authenticated', format('select count(*) from produto.cartoes where familia_id = %L', fam), 'contar', '3'),
      ('A le os recebimentos de B', ua, 'authenticated', format('select count(*) from produto.recebimentos where id = %L', rec_b), 'contar', '1'),
      ('A le os desejos de B', ua, 'authenticated', format('select count(*) from produto.desejos where id = %L', des_b), 'contar', '1'),
      ('A le os desejos da filha', ua, 'authenticated', format('select count(*) from produto.desejos where id = %L', des_p), 'contar', '1'),
      ('A le a aplicacao de B', ua, 'authenticated', format('select count(*) from produto.pat_aplicacoes where id = %L', app_b), 'contar', '1'),
      -- casal só escreve no que é seu, na Casa e no envelope sem dono
      ('A insere direto no envelope de B', ua, 'authenticated', format('insert into produto.lancamentos (familia_id, envelope_id, valor, autor) values (%L, %L, 10, %L)', fam, env_b, ua), 'linhas', 'bloqueado'),
      ('A lanca no envelope de B pelo lancar()', ua, 'authenticated', format('select 1 from produto.lancar(%L, %L, 10)', fam, env_b), 'contar', 'bloqueado'),
      ('A lanca no envelope da filha pelo lancar()', ua, 'authenticated', format('select 1 from produto.lancar(%L, %L, 10)', fam, env_p), 'contar', 'bloqueado'),
      ('A insere em nome de B (autor trocado)', ua, 'authenticated', format('insert into produto.lancamentos (familia_id, envelope_id, valor, autor) values (%L, %L, 10, %L)', fam, env_a, ub), 'linhas', 'bloqueado'),
      ('CONTROLE A lanca no proprio limite', ua, 'authenticated', format('select case when produto.lancar(%L, %L, 10) is not null then 1 else 0 end', fam, env_a), 'contar', '1'),
      ('CONTROLE A lanca na Casa', ua, 'authenticated', format('select case when produto.lancar(%L, %L, 10) is not null then 1 else 0 end', fam, env_casa), 'contar', '1'),
      ('CONTROLE A lanca no envelope sem dono (do casal)', ua, 'authenticated', format('select case when produto.lancar(%L, %L, 10) is not null then 1 else 0 end', fam, env_comum), 'contar', '1'),
      ('A corrige o lancamento de B', ua, 'authenticated', format('update produto.lancamentos set valor = 1 where id = %L', l_b), 'linhas', '0'),
      ('B corrige o gasto da Casa lancado por A', ub, 'authenticated', format('update produto.lancamentos set valor = 1 where id = %L', l_casa_a), 'linhas', '0'),
      ('A muda o lancamento proprio pro envelope de B', ua, 'authenticated', format('update produto.lancamentos set envelope_id = %L where id = %L', env_b, l_a), 'linhas', 'bloqueado'),
      ('CONTROLE A corrige o proprio lancamento', ua, 'authenticated', format('update produto.lancamentos set valor = 51 where id = %L', l_a), 'linhas', '1'),
      ('A manda o lancamento de B pra lixeira', ua, 'authenticated', format('select 1 from produto.apagar_lancamento(%L)', l_b), 'contar', 'erro: lancamento nao encontrado, ja na lixeira ou sem permissao'),
      ('CONTROLE A manda o proprio lancamento pra lixeira', ua, 'authenticated', format('select case when produto.apagar_lancamento(%L) is not null then 1 else 0 end', l_a), 'contar', '1'),
      ('A apaga direto o proprio lancamento (DELETE)', ua, 'authenticated', format('delete from produto.lancamentos where id = %L', l_a), 'linhas', '0'),
      ('B apaga direto os lancamentos da familia (DELETE)', ub, 'authenticated', format('delete from produto.lancamentos where familia_id = %L', fam), 'linhas', '0'),
      ('A muda o desejo de B', ua, 'authenticated', format('update produto.desejos set valor_centavos = 1 where id = %L', des_b), 'linhas', '0'),
      ('A muda o desejo da filha', ua, 'authenticated', format('update produto.desejos set valor_centavos = 1 where id = %L', des_p), 'linhas', '0'),
      ('A cria desejo em nome de B', ua, 'authenticated', format('insert into produto.desejos (familia_id, dono_membro, nome, valor_centavos, mes) values (%L, %L, ''x'', 100, ''2027-01-01'')', fam, mb), 'linhas', 'bloqueado'),
      ('CONTROLE A muda o proprio desejo', ua, 'authenticated', format('update produto.desejos set situacao = ''combinado'' where id = %L', des_a), 'linhas', '1'),
      ('A muda o recebimento de B', ua, 'authenticated', format('update produto.recebimentos set certo = true where id = %L', rec_b), 'linhas', '0'),
      ('A cria recebimento em nome de B', ua, 'authenticated', format('insert into produto.recebimentos (familia_id, dono_membro, descricao, valor_centavos, mes_previsto, tipo, criado_por) values (%L, %L, ''x'', 100, ''2027-01-01'', ''contrato'', %L)', fam, mb, ua), 'linhas', 'bloqueado'),
      ('CONTROLE A cria o proprio recebimento', ua, 'authenticated', format('insert into produto.recebimentos (familia_id, dono_membro, descricao, valor_centavos, mes_previsto, tipo, criado_por) values (%L, %L, ''x'', 100, ''2027-01-01'', ''contrato'', %L)', fam, ma, ua), 'linhas', '1'),
      ('Recebimento com tipo 13o nao existe', ua, 'authenticated', format('insert into produto.recebimentos (familia_id, dono_membro, descricao, valor_centavos, mes_previsto, tipo, criado_por) values (%L, %L, ''x'', 100, ''2027-12-01'', ''decimo_terceiro'', %L)', fam, ma, ua), 'linhas', 'bloqueado'),
      ('A apaga o recebimento de B (DELETE)', ua, 'authenticated', format('delete from produto.recebimentos where id = %L', rec_b), 'linhas', 'bloqueado'),
      ('A apaga o desejo de B (DELETE)', ua, 'authenticated', format('delete from produto.desejos where id = %L', des_b), 'linhas', 'bloqueado'),
      ('A muda o cartao de B', ua, 'authenticated', format('update produto.cartoes set nome = ''x'' where id = %L', cart_b), 'linhas', '0'),
      ('A apaga o cartao de B', ua, 'authenticated', format('delete from produto.cartoes where id = %L', cart_b), 'linhas', '0'),
      ('CONTROLE A muda o proprio cartao', ua, 'authenticated', format('update produto.cartoes set nome = ''Cartao de A 2'' where id = %L', cart_a), 'linhas', '1'),
      ('A muda a aplicacao de B', ua, 'authenticated', format('update produto.pat_aplicacoes set nome = ''x'' where id = %L', app_b), 'linhas', '0'),
      ('A aplica dinheiro na aplicacao de B', ua, 'authenticated', format('insert into produto.pat_movimentos (familia_id, aplicacao_id, tipo, valor, chave, autor) values (%L, %L, ''aporte'', 10, gen_random_uuid(), %L)', fam, app_b, ua), 'linhas', 'bloqueado'),
      ('A anula movimento da aplicacao de B', ua, 'authenticated', format('update produto.pat_movimentos set anulado_em = now() where aplicacao_id = %L', app_b), 'linhas', '0'),
      ('CONTROLE A aplica na propria aplicacao', ua, 'authenticated', format('insert into produto.pat_movimentos (familia_id, aplicacao_id, tipo, valor, chave, autor) values (%L, %L, ''aporte'', 10, gen_random_uuid(), %L)', fam, app_a, ua), 'linhas', '1'),
      ('A grava objetivo com chave errada', ua, 'authenticated', format('update produto.objetivo set parametros = parametros || ''{"chave_inventada": 1}'' where familia_id = %L', fam), 'linhas', 'bloqueado'),
      ('A grava taxa como numero (tem que ser texto)', ua, 'authenticated', format('update produto.objetivo set parametros = jsonb_set(parametros, ''{margem}'', ''0.1'') where familia_id = %L', fam), 'linhas', 'bloqueado'),
      ('CONTROLE B muda a margem do objetivo', ub, 'authenticated', format('update produto.objetivo set parametros = jsonb_set(parametros, ''{margem}'', ''"0.12"'') where familia_id = %L', fam), 'linhas', '1'),
      ('O historico do objetivo diz que foi A', ua, 'authenticated', format('select count(*) from produto.objetivo_historico where familia_id = %L and quem = %L', fam, ua), 'contar', '1'),
      ('Ninguem escreve no historico do objetivo', ua, 'authenticated', format('insert into produto.objetivo_historico (familia_id, quem, depois) values (%L, %L, ''{}'')', fam, ua), 'linhas', 'bloqueado'),
      ('CONTROLE A recebe os dados do futuro (os 12 blocos de base)', ua, 'authenticated', format('select count(*) from jsonb_object_keys(produto.futuro_entradas(%L)) k where k in (''hoje'',''mes_base'',''aplicacoes'',''cdi_hoje'',''recebimentos'',''limites_mes'',''config'',''parcelas_futuras'',''dividas'',''desejos'',''parametros'',''focus'')', fam), 'contar', '12'),
      ('Dados do futuro trazem os recebimentos dos 2', ub, 'authenticated', format('select jsonb_array_length(produto.futuro_entradas(%L)->''recebimentos'')', fam), 'contar', '2'),
      ('Dados do futuro trazem as 2 compras parceladas', ua, 'authenticated', format('select jsonb_array_length(produto.futuro_entradas(%L)->''parcelas_futuras'')', fam), 'contar', '2'),
      -- aplicação "do casal" (pedido C2) e a lista de titulares pro motor (pedido C5)
      ('CONTROLE A cria aplicacao do casal (do_casal)', ua, 'authenticated', format('select count(*) from (select produto.guardado_criar(%L, ''Conjunta nova (exemplo)'', ''Banco Z'', ''cdb'', 100, 0, null, null, null, null, true)::jsonb r) q, jsonb_array_elements(q.r->''aplicacoes'') x where x->>''id'' = q.r->>''aplicacao_id'' and x->>''titular_membro'' is null', fam), 'contar', '1'),
      ('CONTROLE sem do_casal continua no nome de quem cria', ua, 'authenticated', format('select count(*) from (select produto.guardado_criar(%L, ''Minha (exemplo)'', ''Banco Z'', ''cdb'', 100, 0)::jsonb r) q, jsonb_array_elements(q.r->''aplicacoes'') x where x->>''id'' = q.r->>''aplicacao_id'' and x->>''titular_membro'' = %L', fam, ma), 'contar', '1'),
      ('A cria aplicacao no nome de B', ua, 'authenticated', format('select 1 from produto.guardado_criar(%L, ''x'', ''Banco Z'', ''cdb'', 100, 0, null, null, null, %L)', fam, mb), 'contar', 'bloqueado'),
      ('A manda titular e do casal juntos', ua, 'authenticated', format('select 1 from produto.guardado_criar(%L, ''x'', ''Banco Z'', ''cdb'', 100, 0, null, null, null, %L, true)', fam, ma), 'contar', 'erro: escolha: no nome de alguem ou do casal, nao os 2'),
      ('Filha cria aplicacao do casal', up, 'authenticated', format('select 1 from produto.guardado_criar(%L, ''x'', ''Banco Z'', ''cdb'', 100, 0, null, null, null, null, true)', fam), 'contar', 'bloqueado'),
      ('B movimenta a aplicacao do casal', ub, 'authenticated', format('insert into produto.pat_movimentos (familia_id, aplicacao_id, tipo, valor, chave, autor) values (%L, %L, ''aporte'', 10, gen_random_uuid(), %L)', fam, app_c, ub), 'linhas', '1'),
      ('Dados do futuro: a conta do casal tem os 2 adultos como titulares', ua, 'authenticated', format('select count(*) from jsonb_array_elements(produto.futuro_entradas(%L)->''aplicacoes'') x where x->>''id'' = %L and (x->>''conta_conjunta'')::boolean and jsonb_array_length(x->''titulares'') = 2 and x->''titulares'' @> jsonb_build_array(jsonb_build_object(''membro_id'', %L), jsonb_build_object(''membro_id'', %L))', fam, app_c, ma, mb), 'contar', '1'),
      ('Dados do futuro: a aplicacao de A tem so A como titular', ub, 'authenticated', format('select count(*) from jsonb_array_elements(produto.futuro_entradas(%L)->''aplicacoes'') x where x->>''id'' = %L and not (x->>''conta_conjunta'')::boolean and jsonb_array_length(x->''titulares'') = 1 and x->''titulares''->0->>''membro_id'' = %L', fam, app_a, ma), 'contar', '1'),
      ('Dados do futuro: a filha nunca entra como titular', ua, 'authenticated', format('select count(*) from jsonb_array_elements(produto.futuro_entradas(%L)->''aplicacoes'') x, jsonb_array_elements(x->''titulares'') t where t->>''membro_id'' = %L', fam, mp), 'contar', '0'),
      -- revisão do E1, B1: cadastro do outro adulto
      ('A pega o envelope de B pra si', ua, 'authenticated', format('update produto.membros set envelope_id = %L where id = %L', env_b, ma), 'linhas', 'bloqueado'),
      ('A tira o dono do envelope de B', ua, 'authenticated', format('update produto.membros set envelope_id = null where id = %L', mb), 'linhas', 'bloqueado'),
      ('A tira o envelope da filha', ua, 'authenticated', format('update produto.membros set envelope_id = null where id = %L', mp), 'linhas', 'bloqueado'),
      ('A rebaixa B pra equipe', ua, 'authenticated', format('update produto.membros set papel = ''equipe'' where id = %L', mb), 'linhas', 'bloqueado'),
      ('A desliga B', ua, 'authenticated', format('update produto.membros set ativo = false where id = %L', mb), 'linhas', '0'),
      ('A muda o nome de B', ua, 'authenticated', format('update produto.membros set nome = ''x'' where id = %L', mb), 'linhas', '0'),
      ('A apaga o membro B', ua, 'authenticated', format('delete from produto.membros where id = %L', mb), 'linhas', '0'),
      ('CONTROLE A muda o proprio nome', ua, 'authenticated', format('update produto.membros set nome = ''Adulto A 2'' where id = %L', ma), 'linhas', '1'),
      ('CONTROLE A desliga a equipe', ua, 'authenticated', format('update produto.membros set ativo = false where id = %L', me), 'linhas', '1'),
      -- B2: limite e envelope do outro adulto, pelas 3 portas
      ('A muda o limite de B (envelopes)', ua, 'authenticated', format('update produto.envelopes set limite_mes = 1 where id = %L', env_b), 'linhas', '0'),
      ('A muda o limite de B (definir_limite)', ua, 'authenticated', format('select 1 from produto.definir_limite(%L, %L, 1)', fam, env_b), 'contar', 'bloqueado'),
      ('A grava limites_mes de B', ua, 'authenticated', format('insert into produto.limites_mes (familia_id, envelope_id, mes, valor) values (%L, %L, to_char(current_date + 40, ''YYYY-MM''), 1)', fam, env_b), 'linhas', 'bloqueado'),
      ('A apaga o envelope de B', ua, 'authenticated', format('delete from produto.envelopes where id = %L', env_b), 'linhas', '0'),
      ('A marca o envelope de B como Casa', ua, 'authenticated', format('update produto.envelopes set casa = true where id = %L', env_b), 'linhas', 'bloqueado'),
      ('CONTROLE A muda o proprio limite (definir_limite)', ua, 'authenticated', format('select case when produto.definir_limite(%L, %L, 2500) is not null then 1 else 0 end', fam, env_a), 'contar', '1'),
      ('CONTROLE A muda o limite da filha', ua, 'authenticated', format('select case when produto.definir_limite(%L, %L, 350) is not null then 1 else 0 end', fam, env_p), 'contar', '1'),
      ('CONTROLE B tambem muda o limite da filha', ub, 'authenticated', format('select case when produto.definir_limite(%L, %L, 360) is not null then 1 else 0 end', fam, env_p), 'contar', '1'),
      ('Filha muda o proprio limite (definir_limite)', up, 'authenticated', format('select 1 from produto.definir_limite(%L, %L, 9999)', fam, env_p), 'contar', 'bloqueado'),
      ('Filha muda o proprio limite (envelopes)', up, 'authenticated', format('update produto.envelopes set limite_mes = 9999 where id = %L', env_p), 'linhas', '0'),
      ('Filha grava limites_mes dela', up, 'authenticated', format('insert into produto.limites_mes (familia_id, envelope_id, mes, valor) values (%L, %L, to_char(current_date + 40, ''YYYY-MM''), 9999)', fam, env_p), 'linhas', 'bloqueado'),
      -- B3: cartão, fatura e custo do outro
      ('A marca a fatura do cartao de B como paga', ua, 'authenticated', format('select 1 from produto.fatura_informar(%L, %L, to_char(current_date, ''YYYY-MM''), 100, current_date)', fam, cart_b), 'contar', 'bloqueado'),
      ('A cria cartao no nome de B', ua, 'authenticated', format('insert into produto.cartoes (familia_id, nome, titular_membro) values (%L, ''x'', %L)', fam, mb), 'linhas', 'bloqueado'),
      ('A grava custo do cartao de B', ua, 'authenticated', format('insert into produto.cartao_custos (familia_id, cartao_id, limite) values (%L, %L, 1)', fam, cart_b), 'linhas', 'bloqueado'),
      ('CONTROLE A marca a fatura do proprio cartao', ua, 'authenticated', format('select case when produto.fatura_informar(%L, %L, to_char(current_date, ''YYYY-MM''), 100, current_date) is not null then 1 else 0 end', fam, cart_a), 'contar', '1'),
      -- B4: lançamento no cartão de outra pessoa
      ('Filha lanca no cartao de B', up, 'authenticated', format('select 1 from produto.lancar(%L, %L, 10, null, null, %L)', fam, env_p, cart_b), 'contar', 'bloqueado'),
      ('A lanca no proprio limite com o cartao de B', ua, 'authenticated', format('select 1 from produto.lancar(%L, %L, 10, null, null, %L)', fam, env_a, cart_b), 'contar', 'bloqueado'),
      ('A troca o cartao do proprio lancamento pro de B', ua, 'authenticated', format('update produto.lancamentos set cartao_id = %L where id = %L', cart_b, l_a), 'linhas', 'bloqueado'),
      ('A restaura da lixeira o lancamento de B', ua, 'authenticated', format('select 1 from produto.restaurar_lancamento(%L)', l_b_lixo), 'contar', 'erro: lancamento nao esta na lixeira ou sem permissao'),
      ('CONTROLE A lanca no proprio cartao', ua, 'authenticated', format('select case when produto.lancar(%L, %L, 10, null, null, %L) is not null then 1 else 0 end', fam, env_a, cart_a), 'contar', '1'),
      -- B5: parcela no MÊS DA FATURA, dia 1, fora do ritmo; à vista no cartão no dia da compra; parcelado sem cartão recusado
      ('Parcela: nov/26 (mes da compra) nao tem parcela', ua, 'authenticated', format('select (produto._compromisso_mes(%L, ''2026-11-01'') * 100)::bigint', env_a), 'contar', '0'),
      ('Parcela: dez/26 (1a fatura) tem 200', ua, 'authenticated', format('select (produto._compromisso_mes(%L, ''2026-12-01'') * 100)::bigint', env_a), 'contar', '20000'),
      ('Parcela: mai/27 (6a fatura) tem 200', ua, 'authenticated', format('select (produto._compromisso_mes(%L, ''2027-05-01'') * 100)::bigint', env_a), 'contar', '20000'),
      ('Parcela: jun/27 ja nao tem', ua, 'authenticated', format('select (produto._compromisso_mes(%L, ''2027-06-01'') * 100)::bigint', env_a), 'contar', '0'),
      ('Parcela: de dez a mai soma os 1.200', ua, 'authenticated', format('select (sum(produto._compromisso_mes(%L, m::date)) * 100)::bigint from generate_series(date ''2026-12-01'', date ''2027-05-01'', interval ''1 month'') m', env_a), 'contar', '120000'),
      ('Ritmo do dia: a compra parcelada nao entra no dia da compra', ua, 'authenticated', format('select (produto._gasto(%L, ''2026-11-05'', ''2026-11-05'') * 100)::bigint', env_a), 'contar', '0'),
      ('Ritmo: a semana do dia 1 de dez nao recebe a parcela', ua, 'authenticated', format('select (produto._gasto(%L, ''2026-11-30'', ''2026-12-06'') * 100)::bigint', env_a), 'contar', '0'),
      ('A vista no cartao conta no dia da compra', ub, 'authenticated', format('select (produto._gasto(%L, ''2026-09-11'', ''2026-09-11'') * 100)::bigint', env_b), 'contar', '8000'),
      ('Pote do dia de dez ja sem a parcela (3.000 menos 200)', ua, 'authenticated', format('select (p.pote_dias * 100)::bigint from produto._plano(%L, ''2026-12-01'', 3000, ''2026-12-01'', ''2026-12-05'') p', env_a), 'contar', '280000'),
      ('Gasto do mes de dez conta a parcela', ua, 'authenticated', format('select (p.gasto_mes * 100)::bigint from produto._plano(%L, ''2026-12-01'', 3000, ''2026-12-01'', ''2026-12-05'') p', env_a), 'contar', '20000'),
      ('Dia da compra parcelada: gasto do dia zero', ua, 'authenticated', format('select (p.gasto_hoje * 100)::bigint from produto._plano(%L, ''2026-11-01'', 3000, ''2026-11-01'', ''2026-11-05'') p', env_a), 'contar', '0'),
      ('Parcelado sem cartao e recusado', ua, 'authenticated', format('select 1 from produto.lancar(%L, %L, 300, null, null, null, null, 3::smallint)', fam, env_a), 'contar', 'erro: parcelado so no cartao com dia de fechamento e de vencimento'),
      ('Parcelado sem cartao direto na tabela', ua, 'authenticated', format('insert into produto.lancamentos (familia_id, envelope_id, valor, autor, parcelas) values (%L, %L, 300, %L, 3)', fam, env_a, ua), 'linhas', 'bloqueado'),
      ('Dados do futuro: compra parcelada com o mes da 1a fatura', ua, 'authenticated', format('select count(*) from jsonb_array_elements(produto.futuro_entradas(%L)->''parcelas_futuras'') x where x->>''mes_primeira_fatura'' = ''2026-12''', fam), 'contar', '1'),
      -- N1 (2ª revisão): no semanal a parcela também baixa o teto da semana e o "hoje" (520 em 4x: 130 por mês de jan a abr)
      ('Semanal: teto da semana de jan/27 ja sem a parcela (2.470 x 12 / 52 = 570)', ua, 'authenticated', format('select ((x->>''teto_semana'')::numeric * 100)::bigint from jsonb_array_elements(produto._resumo(%L, ''2027-01-15'')->''envelopes'') x where x->>''id'' = %L', fam, env_s), 'contar', '57000'),
      ('Semanal: o hoje de sex 15/01/27 sai do teto menor (570 / 3 dias)', ua, 'authenticated', format('select ((x->>''hoje'')::numeric * 100)::bigint from jsonb_array_elements(produto._resumo(%L, ''2027-01-15'')->''envelopes'') x where x->>''id'' = %L', fam, env_s), 'contar', '19000'),
      ('Semanal: livre de jan/27 sem descontar a parcela 2 vezes (570 x 4 semanas)', ua, 'authenticated', format('select ((x->>''livre'')::numeric * 100)::bigint from jsonb_array_elements(produto._resumo(%L, ''2027-01-15'')->''envelopes'') x where x->>''id'' = %L', fam, env_s), 'contar', '228000'),
      ('Semanal: dez/26 (antes da 1a fatura) tem o teto cheio (600)', ua, 'authenticated', format('select ((x->>''teto_semana'')::numeric * 100)::bigint from jsonb_array_elements(produto._resumo(%L, ''2026-12-15'')->''envelopes'') x where x->>''id'' = %L', fam, env_s), 'contar', '60000'),
      -- N3: a lista de parcelas vai pronta pro motor
      ('Dados do futuro: as 6 parcelas prontas, dez a mai, 200 cada', ua, 'authenticated', format('select count(*) from jsonb_array_elements(produto.futuro_entradas(%L)->''parcelas_futuras'') x, jsonb_array_elements(x->''parcelas_lista'') p where x->>''lancamento_id'' = %L and p->>''mes_fatura'' between ''2026-12'' and ''2027-05'' and p->>''valor_centavos'' = ''20000''', fam, l_parc), 'contar', '6'),
      -- N4: contagens do produto só pro dono do produto
      ('Casal chama _numeros direto', ua, 'authenticated', 'select 1 from produto._numeros(now())', 'contar', 'bloqueado'),
      ('Quem nao e dono do produto pede numeros_semana', ua, 'authenticated', 'select 1 from produto.numeros_semana()', 'contar', 'bloqueado'),
      -- pedido do TELAS: dono e gasto de hoje em cada envelope do resumo
      ('Resumo: Lazer do casal vem sem dono', ua, 'authenticated', format('select count(*) from jsonb_array_elements(produto._resumo(%L, produto._hoje())->''envelopes'') x where x->>''id'' = %L and x->''dono'' = ''null''::jsonb', fam, env_comum), 'contar', '1'),
      ('Resumo: o limite de B vem com o dono B e sem escrever pra A', ua, 'authenticated', format('select count(*) from jsonb_array_elements(produto._resumo(%L, produto._hoje())->''envelopes'') x where x->>''id'' = %L and x->''dono''->>''membro_id'' = %L and not (x->>''escreve'')::boolean', fam, env_b, mb), 'contar', '1'),
      ('Resumo: todo envelope do casal traz gasto_hoje', ua, 'authenticated', format('select count(*) from jsonb_array_elements(produto._resumo(%L, produto._hoje())->''envelopes'') x where not (x ? ''gasto_hoje'')', fam), 'contar', '0'),
      ('Resumo da equipe continua sem R$ (so nomes, dono e escreve)', ue, 'authenticated', format('select count(*) from jsonb_array_elements(produto._resumo(%L, produto._hoje())->''envelopes'') x where x ?| array[''gasto_hoje'', ''livre'', ''limite_mes'', ''hoje'']', fam), 'contar', '0'),
      -- B10: o Escritório só pergunta o que a pessoa pode responder
      ('Escritorio: A nao recebe pergunta da fatura do cartao de B', ua, 'authenticated', format('select count(*) from jsonb_array_elements(produto._esc_brutas(%L, ''2027-01-08 15:00-03'', ''casal'', ''Adulto A'')->''q'') x where x->>''id'' like ''fatura:%s%%''', fam, cart_b), 'contar', '0'),
      ('CONTROLE Escritorio: B recebe a pergunta da fatura do cartao dele', ub, 'authenticated', format('select count(*) from jsonb_array_elements(produto._esc_brutas(%L, ''2027-01-08 15:00-03'', ''casal'', ''Adulto B'')->''q'') x where x->>''id'' like ''fatura:%s%%''', fam, cart_b), 'contar', '1'),
      ('CONTROLE Escritorio: A recebe as perguntas das faturas do proprio cartao (dez e jan)', ua, 'authenticated', format('select count(*) from jsonb_array_elements(produto._esc_brutas(%L, ''2027-01-08 15:00-03'', ''casal'', ''Adulto A'')->''q'') x where x->>''id'' like ''fatura:%s%%''', fam, cart_a), 'contar', '2'),
      ('Escritorio: A nao recebe pergunta dos dias do cartao de B', ua, 'authenticated', format('select count(*) from jsonb_array_elements(produto._esc_brutas(%L, ''2027-01-08 15:00-03'', ''casal'', ''Adulto A'')->''q'') x where x->>''id'' = ''cartao_dias:%s''', fam, cart_b2), 'contar', '0'),
      ('CONTROLE Escritorio: B recebe a pergunta dos dias do cartao dele', ub, 'authenticated', format('select count(*) from jsonb_array_elements(produto._esc_brutas(%L, ''2027-01-08 15:00-03'', ''casal'', ''Adulto B'')->''q'') x where x->>''id'' = ''cartao_dias:%s''', fam, cart_b2), 'contar', '1'),
      ('Escritorio: A nao confere o saldo da aplicacao de B', ua, 'authenticated', format('select count(*) from jsonb_array_elements(produto._esc_brutas(%L, ''2027-01-04 15:00-03'', ''casal'', ''Adulto A'')->''q'') x where x->>''id'' like ''saldo_conferir:%s%%''', fam, app_b), 'contar', '0'),
      ('CONTROLE Escritorio: A confere o saldo da propria e da do casal', ua, 'authenticated', format('select count(*) from jsonb_array_elements(produto._esc_brutas(%L, ''2027-01-04 15:00-03'', ''casal'', ''Adulto A'')->''q'') x where x->>''id'' like ''saldo_conferir:%s%%'' or x->>''id'' like ''saldo_conferir:%s%%''', fam, app_a, app_c), 'contar', '2'),
      ('Contador: guardar a sobra nunca escolhe a aplicacao de B (a maior)', ua, 'authenticated', format('select count(*) from (select produto._aplicacao_pra_guardar(%L, produto._hoje()) id) q where q.id = %L', fam, app_c), 'contar', '1'),
      -- B6: a equipe manda a mesma compra 2 vezes (internet caiu): a 2a volta "repetido", não erro
      ('Equipe manda a mesma chave 2 vezes e recebe repetido', ue, 'authenticated', format('select count(*) from (values (1), (2)) v(n) cross join lateral (select produto.lancar_com_chave(%L, %L, 10 + 0 * v.n, %L::uuid)::jsonb->>''repetido'' r) x where x.r = ''true''', fam, env_casa, chave_e), 'contar', '1'),
      ('CONTROLE equipe recebe o id do que anotou', ue, 'authenticated', format('select case when produto.lancar(%L, %L, 10)::jsonb->''lancamento''->>''id'' is not null then 1 else 0 end', fam, env_casa), 'contar', '1'),
      -- B7: diário da Casa (a equipe lê) não aceita R$
      ('Casal grava R$ no diario da Casa', ua, 'authenticated', format('insert into produto.esc_diario (familia_id, funcionario, assunto, ref, pergunta, resposta, dados, respondido_por, casa) values (%L, ''fiscal_feira'', ''feira_feita'', ''feira_feita:x'', ''A feira foi feita?'', ''Foi feita, R$ 298,50'', ''{"valor": 298.5}'', %L, true)', fam, ua), 'linhas', 'bloqueado'),
      ('CONTROLE casal grava no diario da Casa sem R$', ua, 'authenticated', format('insert into produto.esc_diario (familia_id, funcionario, assunto, ref, pergunta, resposta, dados, respondido_por, casa) values (%L, ''fiscal_feira'', ''feira_feita'', ''feira_feita:y'', ''A feira foi feita?'', ''Foi feita'', ''{}'', %L, true)', fam, ua), 'linhas', '1'),
      -- B8: o FGC é conta do motor; o banco não manda "garantia"
      ('Dados do futuro sem o campo garantia', ua, 'authenticated', format('select count(*) from jsonb_array_elements(produto.futuro_entradas(%L)->''aplicacoes'') x where x ? ''garantia''', fam), 'contar', '0'),
      -- filha: só o dela
      ('Filha le cartoes', up, 'authenticated', 'select count(*) from produto.cartoes', 'contar', '0'),
      ('Filha le recebimentos', up, 'authenticated', 'select count(*) from produto.recebimentos', 'contar', '0'),
      ('Filha le o objetivo', up, 'authenticated', 'select count(*) from produto.objetivo', 'contar', '0'),
      ('Filha le o historico do objetivo', up, 'authenticated', 'select count(*) from produto.objetivo_historico', 'contar', '0'),
      ('Filha le config da familia', up, 'authenticated', 'select count(*) from produto.config_familia', 'contar', '0'),
      ('Filha le desejos de A', up, 'authenticated', format('select count(*) from produto.desejos where dono_membro = %L', ma), 'contar', '0'),
      ('Filha le lancamentos de A', up, 'authenticated', format('select count(*) from produto.lancamentos where envelope_id = %L', env_a), 'contar', '0'),
      ('Filha le aplicacoes', up, 'authenticated', 'select count(*) from produto.pat_aplicacoes', 'contar', '0'),
      ('CONTROLE filha le o proprio limite', up, 'authenticated', format('select count(*) from produto.envelopes where id = %L', env_p), 'contar', '1'),
      ('CONTROLE filha le o proprio desejo', up, 'authenticated', format('select count(*) from produto.desejos where id = %L', des_p), 'contar', '1'),
      ('CONTROLE filha cria desejo dela', up, 'authenticated', format('insert into produto.desejos (familia_id, dono_membro, nome, valor_centavos, mes) values (%L, %L, ''tenis (exemplo)'', 30000, ''2027-01-01'')', fam, mp), 'linhas', '1'),
      ('Filha cria desejo em nome de A', up, 'authenticated', format('insert into produto.desejos (familia_id, dono_membro, nome, valor_centavos, mes) values (%L, %L, ''x'', 100, ''2027-01-01'')', fam, ma), 'linhas', 'bloqueado'),
      ('CONTROLE filha lanca no proprio limite', up, 'authenticated', format('select case when produto.lancar(%L, %L, 10) is not null then 1 else 0 end', fam, env_p), 'contar', '1'),
      ('Filha lanca no limite de A', up, 'authenticated', format('select 1 from produto.lancar(%L, %L, 10)', fam, env_a), 'contar', 'bloqueado'),
      ('CONTROLE filha baixa so o dela (1 desejo)', up, 'authenticated', format('select json_array_length(produto.exportar_meu(%L)->''desejos'')', fam), 'contar', '1'),
      ('Filha baixa so o dela: nenhum lancamento dos pais', up, 'authenticated', format('select count(*) from json_array_elements(produto.exportar_meu(%L)->''lancamentos'') x where x->>''envelope_id'' <> %L', fam, env_p), 'contar', '0'),
      ('Filha baixa a familia inteira', up, 'authenticated', format('select 1 from produto.exportar_familia(%L)', fam), 'contar', 'bloqueado'),
      ('Filha pede os dados do futuro', up, 'authenticated', format('select 1 from produto.futuro_entradas(%L)', fam), 'contar', 'bloqueado'),
      -- equipe: nunca R$
      ('Equipe le valor de lancamento', ue, 'authenticated', 'select count(valor) from produto.lancamentos', 'contar', '0'),
      ('Equipe pede os dados do futuro', ue, 'authenticated', format('select 1 from produto.futuro_entradas(%L)', fam), 'contar', 'bloqueado'),
      ('Equipe le recebimentos', ue, 'authenticated', 'select count(*) from produto.recebimentos', 'contar', '0'),
      ('Equipe le desejos', ue, 'authenticated', 'select count(*) from produto.desejos', 'contar', '0'),
      ('Equipe le o objetivo', ue, 'authenticated', 'select count(*) from produto.objetivo', 'contar', '0'),
      ('Equipe le cartoes', ue, 'authenticated', 'select count(*) from produto.cartoes', 'contar', '0'),
      ('Equipe baixa so o dela', ue, 'authenticated', format('select 1 from produto.exportar_meu(%L)', fam), 'contar', 'bloqueado'),
      ('Casa da equipe sem a chave valor em nenhum nivel', ue, 'authenticated', format('select count(*) from jsonb_path_query(produto.casa_da_equipe(%L)::jsonb, %L)', fam, sem_valor), 'contar', '0'),
      ('CONTROLE casa da equipe responde', ue, 'authenticated', format('select case when produto.casa_da_equipe(%L) is not null then 1 else 0 end', fam), 'contar', '1'),
      ('CONTROLE equipe lanca na Casa', ue, 'authenticated', format('select case when produto.lancar(%L, %L, 10) is not null then 1 else 0 end', fam, env_casa), 'contar', '1'),
      ('Equipe lanca no limite de A', ue, 'authenticated', format('select 1 from produto.lancar(%L, %L, 10)', fam, env_a), 'contar', 'bloqueado'),
      ('Equipe cria desejo', ue, 'authenticated', format('insert into produto.desejos (familia_id, dono_membro, nome, valor_centavos, mes) values (%L, %L, ''x'', 100, ''2027-01-01'')', fam, me), 'linhas', 'bloqueado'),
      -- estranho (casal de outra família): nada
      ('Estranho le lancamentos da familia', ux, 'authenticated', format('select count(*) from produto.lancamentos where familia_id = %L', fam), 'contar', '0'),
      ('Estranho le envelopes da familia', ux, 'authenticated', format('select count(*) from produto.envelopes where familia_id = %L', fam), 'contar', '0'),
      ('Estranho le membros da familia', ux, 'authenticated', format('select count(*) from produto.membros where familia_id = %L', fam), 'contar', '0'),
      ('Estranho le cartoes da familia', ux, 'authenticated', format('select count(*) from produto.cartoes where familia_id = %L', fam), 'contar', '0'),
      ('Estranho le recebimentos da familia', ux, 'authenticated', format('select count(*) from produto.recebimentos where familia_id = %L', fam), 'contar', '0'),
      ('Estranho le desejos da familia', ux, 'authenticated', format('select count(*) from produto.desejos where familia_id = %L', fam), 'contar', '0'),
      ('Estranho le o objetivo da familia', ux, 'authenticated', format('select count(*) from produto.objetivo where familia_id = %L', fam), 'contar', '0'),
      ('Estranho le o historico do objetivo', ux, 'authenticated', format('select count(*) from produto.objetivo_historico where familia_id = %L', fam), 'contar', '0'),
      ('Estranho le config da familia', ux, 'authenticated', format('select count(*) from produto.config_familia where familia_id = %L', fam), 'contar', '0'),
      ('Estranho le aplicacoes da familia', ux, 'authenticated', format('select count(*) from produto.pat_aplicacoes where familia_id = %L', fam), 'contar', '0'),
      ('Estranho pede os dados do futuro da familia', ux, 'authenticated', format('select 1 from produto.futuro_entradas(%L)', fam), 'contar', 'bloqueado'),
      ('Estranho baixa o meu da familia', ux, 'authenticated', format('select 1 from produto.exportar_meu(%L)', fam), 'contar', 'bloqueado'),
      ('Estranho muda desejo da familia', ux, 'authenticated', format('update produto.desejos set nome = ''x'' where familia_id = %L', fam), 'linhas', '0'),
      ('Estranho apaga lancamentos da familia', ux, 'authenticated', format('delete from produto.lancamentos where familia_id = %L', fam), 'linhas', '0'),
      ('CONTROLE estranho le a propria familia', ux, 'authenticated', format('select count(*) from produto.lancamentos where id = %L', l_x), 'contar', '1'),
      -- sem login (chave pública)
      ('Sem login le recebimentos', null, 'anon', 'select count(*) from produto.recebimentos', 'contar', 'bloqueado'),
      ('Sem login le desejos', null, 'anon', 'select count(*) from produto.desejos', 'contar', 'bloqueado'),
      ('Sem login le o objetivo', null, 'anon', 'select count(*) from produto.objetivo', 'contar', 'bloqueado'),
      ('Sem login pede os dados do futuro', null, 'anon', format('select 1 from produto.futuro_entradas(%L)', fam), 'contar', 'bloqueado'),
      ('Logado sem familia pede os dados do futuro', 'a0000000-0000-4e0e-8000-00000000ff01', 'authenticated', format('select 1 from produto.futuro_entradas(%L)', fam), 'contar', 'bloqueado'),
      -- parcelas (f_04)
      ('Parcelas acima de 12 sao recusadas', ua, 'authenticated', format('select 1 from produto.lancar(%L, %L, 100, null, null, %L, null, 13::smallint)', fam, env_a, cart_a), 'contar', 'erro: parcelas de 1 a 12'),
      ('CONTROLE A lanca em 3x no proprio cartao', ua, 'authenticated', format('select case when (produto.lancar(%L, %L, 100, null, null, %L, null, 3::smallint)->''lancamento''->>''parcelas'') = ''3'' then 1 else 0 end', fam, env_a, cart_a), 'contar', '1')
    ) as v(nome, uid, papel_db, sql, modo, esp) loop
      r_caso := r_caso || c.nome; r_esp := r_esp || c.esp;
      r_obt := r_obt || produto._tentativa(c.uid, c.papel_db, c.sql, c.modo);
    end loop;

    -- tabela do Focus (f_10), quando existir
    if to_regclass('produto.focus_indices') is not null then
      for c in select * from (values
        ('CONTROLE casal le o Focus', ua, 'authenticated', 'select case when count(*) >= 0 then 1 else 0 end from produto.focus_indices', 'contar', '1'),
        ('Casal grava no Focus (so o dono do produto grava)', ua, 'authenticated', 'insert into produto.focus_indices (ano, selic_fim, ipca, divulgado_em, fonte) values (2029, ''0.1000'', ''0.0400'', ''2026-11-13'', ''teste'')', 'linhas', 'bloqueado'),
        ('Equipe grava no Focus', ue, 'authenticated', 'insert into produto.focus_indices (ano, selic_fim, ipca, divulgado_em, fonte) values (2029, ''0.1000'', ''0.0400'', ''2026-11-13'', ''teste'')', 'linhas', 'bloqueado'),
        ('Sem login le o Focus', null, 'anon', 'select count(*) from produto.focus_indices', 'contar', 'bloqueado'),
        ('Focus guarda as taxas como texto decimal', ua, 'authenticated', 'select count(*) from information_schema.columns where table_schema = ''produto'' and table_name = ''focus_indices'' and column_name in (''selic_fim'', ''ipca'') and data_type = ''text''', 'contar', '2')
      ) as v(nome, uid, papel_db, sql, modo, esp) loop
        r_caso := r_caso || c.nome; r_esp := r_esp || c.esp;
        r_obt := r_obt || produto._tentativa(c.uid, c.papel_db, c.sql, c.modo);
      end loop;
    end if;

    -- saldo em conta corrente (f_11), quando existir: tranca igual à das aplicações
    if to_regclass('produto.saldos_conta') is not null then
      execute format('insert into produto.saldos_conta (id, familia_id, dono_membro, banco, valor_centavos) values
        (%L, %L, %L, ''Banco X'', 100000), (%L, %L, %L, ''Banco Y'', 200000), (%L, %L, null, ''Banco W'', 50000)',
        '50000000-0000-4e0e-8000-00000000fa01', fam, ma, '50000000-0000-4e0e-8000-00000000fb01', fam, mb, '50000000-0000-4e0e-8000-00000000f0c1', fam);
      for c in select * from (values
        ('Conta: A le o saldo de B (com dono)', ua, 'authenticated', 'select count(*) from produto.saldos_conta where dono_membro = ''' || mb || '''', 'contar', '1'),
        ('Conta: A muda o saldo de B', ua, 'authenticated', 'update produto.saldos_conta set valor_centavos = 1 where id = ''50000000-0000-4e0e-8000-00000000fb01''', 'linhas', '0'),
        ('Conta: A cria conta no nome de B', ua, 'authenticated', format('insert into produto.saldos_conta (familia_id, dono_membro, banco, valor_centavos) values (%L, %L, ''x'', 1)', fam, mb), 'linhas', 'bloqueado'),
        ('CONTROLE Conta: A muda o proprio saldo', ua, 'authenticated', 'update produto.saldos_conta set valor_centavos = 120000 where id = ''50000000-0000-4e0e-8000-00000000fa01''', 'linhas', '1'),
        ('CONTROLE Conta: B muda o saldo da conta do casal', ub, 'authenticated', 'update produto.saldos_conta set valor_centavos = 60000 where id = ''50000000-0000-4e0e-8000-00000000f0c1''', 'linhas', '1'),
        ('Conta: ninguem apaga linha (DELETE)', ua, 'authenticated', 'delete from produto.saldos_conta where id = ''50000000-0000-4e0e-8000-00000000fa01''', 'linhas', 'bloqueado'),
        ('Conta: filha le os saldos', up, 'authenticated', 'select count(*) from produto.saldos_conta', 'contar', '0'),
        ('Conta: equipe le os saldos', ue, 'authenticated', 'select count(*) from produto.saldos_conta', 'contar', '0'),
        ('Conta: estranho le os saldos da familia', ux, 'authenticated', format('select count(*) from produto.saldos_conta where familia_id = %L', fam), 'contar', '0'),
        ('Conta: sem login le os saldos', null, 'anon', 'select count(*) from produto.saldos_conta', 'contar', 'bloqueado'),
        ('Conta: dados do futuro mandam saldo_caixa somado (1.000 + 2.000 + 500)', ua, 'authenticated', format('select (produto.futuro_entradas(%L)->>''saldo_caixa'')::bigint', fam), 'contar', '350000'),
        ('Conta: A baixa a familia com os saldos e o dono', ua, 'authenticated', format('select count(*) from json_array_elements(produto.exportar_familia(%L)->''saldos_conta'') x where x->>''dono_nome'' = ''Adulto B''', fam), 'contar', '1')
      ) as v(nome, uid, papel_db, sql, modo, esp) loop
        r_caso := r_caso || c.nome; r_esp := r_esp || c.esp;
        r_obt := r_obt || produto._tentativa(c.uid, c.papel_db, c.sql, c.modo);
      end loop;
      -- o carimbo: B muda a conta do casal e o banco grava B como quem atualizou
      r_caso := r_caso || 'Conta: o banco grava quem mudou o saldo'::text;
      r_esp := r_esp || 'B'::text;
      perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
      execute 'update produto.saldos_conta set valor_centavos = 70000 where id = ''50000000-0000-4e0e-8000-00000000f0c1''';
      perform set_config('request.jwt.claims', '', true);
      execute 'select case when atualizado_por = $1::uuid then ''B'' else coalesce(atualizado_por::text, ''ninguem'') end from produto.saldos_conta where id = ''50000000-0000-4e0e-8000-00000000f0c1''' into v using ub;
      r_obt := r_obt || v;
    end if;

    -- reajuste do teto com voto de cada adulto (f_12), quando existir
    if to_regprocedure('produto.reajuste_votar(uuid,date,bigint)') is not null then
      declare
        m_cur constant date := date_trunc('month', produto._hoje())::date;
        m_ant constant date := (date_trunc('month', produto._hoje()) - interval '1 month')::date;
        m_dif constant date := (date_trunc('month', produto._hoje()) - interval '2 months')::date;
      begin
        perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
        perform produto.reajuste_votar(fam::uuid, m_ant, 300000);   -- só A votou
        perform produto.reajuste_votar(fam::uuid, m_cur, 310000);   -- A e B, mesmo teto
        perform produto.reajuste_votar(fam::uuid, m_dif, 300000);   -- A e B, tetos diferentes
        perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
        perform produto.reajuste_votar(fam::uuid, m_cur, 310000);
        perform produto.reajuste_votar(fam::uuid, m_dif, 310000);
        perform set_config('request.jwt.claims', json_build_object('sub', ux, 'role', 'authenticated')::text, true);
        perform produto.reajuste_votar(fam2::uuid, m_cur, 100000);   -- família de 1 adulto
        perform set_config('request.jwt.claims', '', true);
        for c in select * from (values
          ('Reajuste: A grava o voto de B direto na tabela', ua, 'authenticated', format('insert into produto.reajuste_votos (familia_id, mes_vigencia, membro_id, teto_centavos) values (%L, %L, %L, 1)', fam, m_ant, mb), 'linhas', 'bloqueado'),
          ('Reajuste: A muda o voto de B', ua, 'authenticated', format('update produto.reajuste_votos set teto_centavos = 1 where membro_id = %L', mb), 'linhas', '0'),
          ('Reajuste: A apaga o voto de B', ua, 'authenticated', format('delete from produto.reajuste_votos where membro_id = %L', mb), 'linhas', 'bloqueado'),
          ('Reajuste: os 2 votos juntos ficam os 2 (nenhum apaga o outro)', ua, 'authenticated', format('select count(*) from produto.reajuste_votos where familia_id = %L and mes_vigencia = %L', fam, m_cur), 'contar', '2'),
          ('Reajuste: com os 2 no mesmo teto esta aprovado', ub, 'authenticated', format('select case when (produto.reajuste_situacao(%L, %L)->>''aprovado'')::boolean then 1 else 0 end', fam, m_cur), 'contar', '1'),
          ('Reajuste: so A votou, falta B', ua, 'authenticated', format('select jsonb_array_length(produto.reajuste_situacao(%L, %L)->''faltam'')', fam, m_ant), 'contar', '1'),
          ('Reajuste: aplicar com 1 voto so', ua, 'authenticated', format('select 1 from produto.reajuste_aplicar(%L, %L, %L, 3100)', fam, env_a, m_ant), 'contar', 'bloqueado'),
          ('Reajuste: aplicar com tetos diferentes', ua, 'authenticated', format('select 1 from produto.reajuste_aplicar(%L, %L, %L, 3100)', fam, env_a, m_dif), 'contar', 'bloqueado'),
          ('CONTROLE Reajuste: aplicar com os 2 no mesmo teto', ua, 'authenticated', format('select case when produto.reajuste_aplicar(%L, %L, %L, 3100) is not null then 1 else 0 end', fam, env_a, m_cur), 'contar', '1'),
          ('Reajuste: aprovado nao abre o limite de B pra A', ua, 'authenticated', format('select 1 from produto.reajuste_aplicar(%L, %L, %L, 3100)', fam, env_b, m_cur), 'contar', 'bloqueado'),
          ('CONTROLE Reajuste: na familia de 1 adulto, 1 voto basta', ux, 'authenticated', format('select case when produto.reajuste_aplicar(%L, %L, %L, 1000) is not null then 1 else 0 end', fam2, env_x, m_cur), 'contar', '1'),
          ('Reajuste: a filha vota', up, 'authenticated', format('select 1 from produto.reajuste_votar(%L, %L, 1)', fam, m_cur), 'contar', 'bloqueado'),
          ('Reajuste: a equipe vota', ue, 'authenticated', format('select 1 from produto.reajuste_votar(%L, %L, 1)', fam, m_cur), 'contar', 'bloqueado'),
          ('Reajuste: a filha le os votos', up, 'authenticated', 'select count(*) from produto.reajuste_votos', 'contar', '0'),
          ('Reajuste: a equipe le o teto aprovado', ue, 'authenticated', format('select count(produto._reajuste_aprovado(%L, %L))', fam, m_cur), 'contar', '0'),
          ('Reajuste: o estranho le o teto aprovado', ux, 'authenticated', format('select count(produto._reajuste_aprovado(%L, %L))', fam, m_cur), 'contar', '0'),
          ('Reajuste: vale so a partir do mes de vigencia', ua, 'authenticated', format('select 1 from produto.reajuste_aplicar(%L, %L, %L, 3100)', fam, env_a, (m_cur + interval '1 month')::date), 'contar', 'bloqueado'),
          -- B5: objetivo salvo 2 vezes (como os 2 salvando juntos) não dá erro nem deixa linha fantasma no histórico
          ('Objetivo: 1o salvar pela funcao na familia sem objetivo', ux, 'authenticated', format('select case when produto.objetivo_salvar(%L, %L::jsonb) is not null then 1 else 0 end', fam2, obj), 'contar', '1'),
          ('Objetivo: salvar quando o outro ja criou vira mudanca, sem erro', ub, 'authenticated', format('select case when produto.objetivo_salvar(%L, jsonb_set(%L::jsonb, ''{margem}'', ''"0.15"'')) is not null then 1 else 0 end', fam, obj), 'contar', '1')
        ) as v(nome, uid, papel_db, sql, modo, esp) loop
          r_caso := r_caso || c.nome; r_esp := r_esp || c.esp;
          r_obt := r_obt || produto._tentativa(c.uid, c.papel_db, c.sql, c.modo);
        end loop;
        -- o mesmo salvar de B, de verdade: 1 linha no objetivo e só 1 linha nova no histórico
        perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
        perform produto.objetivo_salvar(fam::uuid, jsonb_set(obj::jsonb, '{margem}', '"0.15"'));
        perform set_config('request.jwt.claims', '', true);
        r_caso := r_caso || 'Objetivo: 2 salvamentos = 1 linha e 2 registros no historico (sem fantasma)'::text;
        r_esp := r_esp || '1 linha, 2 registros, margem 0.15'::text;
        r_obt := r_obt || ((select count(*) from produto.objetivo where familia_id = fam::uuid) || ' linha, '
                           || (select count(*) from produto.objetivo_historico where familia_id = fam::uuid) || ' registros, margem '
                           || (select parametros->>'margem' from produto.objetivo where familia_id = fam::uuid));
      end;
    end if;

    -- ===== contas que o banco ainda faz (sem login, como o turno da noite) =====
    -- 1.200 em 6x comprado em 05/11/2026, cartão fecha dia 1 e vence dia 10: faturas de dez a mai, 200 cada
    select string_agg((x->>'mes') || ':' || (x->>'total'), ',' order by x->>'mes') into v
      from jsonb_array_elements(produto._faturas(fam::uuid, date '2026-12-01', 6)) x where x->>'cartao_id' = cart_a;
    r_caso := r_caso || 'Fatura do cartao de A: 1.200 em 6x (dez a mai, 200) + 520 em 4x (jan a abr, 130)'::text;
    r_esp := r_esp || '2026-12:200.00,2027-01:330.00,2027-02:330.00,2027-03:330.00,2027-04:330.00,2027-05:200.00'::text;
    r_obt := r_obt || v;
    r_caso := r_caso || 'Parcela: 1.000 em 3x = 333,34 + 333,33 + 333,33'::text;
    r_esp := r_esp || '333.34,333.33,333.33'::text;
    r_obt := r_obt || (select string_agg(produto._parcela_valor(1000, 3::smallint, g)::text, ',' order by g) from generate_series(0, 2) g);

    -- criar_familia: quem cria já nasce ligado ao "Pessoa 1"; o 2º adulto pega o "Pessoa 2"
    perform set_config('request.jwt.claims', json_build_object('sub', ux, 'role', 'authenticated')::text, true);
    nova := (produto.criar_familia('Familia Nova (teste)', 'Estranho')->>'familia_id')::uuid;
    perform set_config('request.jwt.claims', '', true);
    r_caso := r_caso || 'Quem cria a familia nasce com o proprio limite'::text;
    r_esp := r_esp || 'Pessoa 1'::text;
    r_obt := r_obt || (select e.nome from produto.membros m join produto.envelopes e on e.id = m.envelope_id
                        where m.familia_id = nova and m.user_id = ux::uuid);
    insert into produto.membros (id, familia_id, user_id, papel, nome) values ('d0000000-0000-4e0e-8000-00000000ff02', nova, null, 'casal', 'Segundo adulto');
    perform produto._ligar_envelope(nova, 'd0000000-0000-4e0e-8000-00000000ff02');
    r_caso := r_caso || 'O 2o adulto fica com o outro limite'::text;
    r_esp := r_esp || 'Pessoa 2'::text;
    r_obt := r_obt || (select e.nome from produto.membros m join produto.envelopes e on e.id = m.envelope_id
                        where m.id = 'd0000000-0000-4e0e-8000-00000000ff02');

    -- N2: o 3o adulto que entra não pega o envelope comum do casal; ganha um limite novo
    insert into produto.envelopes (familia_id, nome, regra, limite_mes, casa) values (nova, 'Lazer do casal', 'mensal', 300, false);
    insert into produto.membros (id, familia_id, user_id, papel, nome) values ('d0000000-0000-4e0e-8000-00000000ff04', nova, null, 'casal', 'Terceiro');
    perform produto._ligar_envelope(nova, 'd0000000-0000-4e0e-8000-00000000ff04');
    r_caso := r_caso || 'Adulto que entra nunca pega o envelope comum do casal'::text;
    r_esp := r_esp || 'Limite de Terceiro'::text;
    r_obt := r_obt || (select e.nome from produto.membros m join produto.envelopes e on e.id = m.envelope_id
                        where m.id = 'd0000000-0000-4e0e-8000-00000000ff04');

    -- a filha que entra pelo convite ganha o limite dela (envelope novo), nunca um 2º, nunca o de ninguém
    insert into produto.membros (id, familia_id, user_id, papel, nome) values ('d0000000-0000-4e0e-8000-00000000ff03', fam::uuid, null, 'pessoa', 'Filha nova');
    v := produto._ligar_envelope_pessoa(fam::uuid, 'd0000000-0000-4e0e-8000-00000000ff03')::text;
    r_caso := r_caso || 'Filha entra e ja tem o envelope dela'::text;
    r_esp := r_esp || 'Limite de Filha nova'::text;
    r_obt := r_obt || (select e.nome from produto.membros m join produto.envelopes e on e.id = m.envelope_id
                        where m.id = 'd0000000-0000-4e0e-8000-00000000ff03');
    r_caso := r_caso || 'Filha nao ganha 2o envelope (chamar de novo devolve o mesmo)'::text;
    r_esp := r_esp || 'mesmo envelope, 1 so'::text;
    r_obt := r_obt || (case when produto._ligar_envelope_pessoa(fam::uuid, 'd0000000-0000-4e0e-8000-00000000ff03')::text = v
                             and (select count(*) from produto.envelopes e where e.familia_id = fam::uuid and e.nome like 'Limite de Filha nova%') = 1
                            then 'mesmo envelope, 1 so' else 'ganhou outro' end);
    r_caso := r_caso || 'Filha nao pega envelope de ninguem (nem o sem dono, nem o de outro)'::text;
    r_esp := r_esp || 'envelope novo'::text;
    r_obt := r_obt || (case when v not in (env_a, env_b, env_p, env_casa, env_comum)
                             and (select count(*) from produto.membros m where m.envelope_id = v::uuid) = 1
                             and (select envelope_id::text from produto.membros where id = mp::uuid) = env_p
                            then 'envelope novo' else 'pegou de alguem' end);
    r_caso := r_caso || 'Convite da filha chama a funcao do limite dela'::text;
    r_esp := r_esp || 'sim'::text;
    r_obt := r_obt || (case when (select prosrc from pg_proc where oid = 'produto.entrar_por_convite()'::regprocedure) like '%_ligar_envelope_pessoa%' then 'sim' else 'nao' end);

    -- pedido do TELAS: "escreve" do _resumo bate com o que o banco aceita de verdade, pra cada papel
    foreach u in array array[ua, ub, up, ue] loop
      difere := 0;
      foreach en in array array[env_a, env_b, env_p, env_casa, env_comum, env_s] loop
        r1 := produto._tentativa(u, 'authenticated', format('select count(*) from jsonb_array_elements(produto._resumo(%L, produto._hoje())->''envelopes'') x where x->>''id'' = %L and (x->>''escreve'')::boolean', fam, en), 'contar');
        r2 := produto._tentativa(u, 'authenticated', format('insert into produto.lancamentos (familia_id, envelope_id, valor, autor) values (%L, %L, 10, %L)', fam, en, u), 'linhas');
        if (r1 = '1') is distinct from (r2 = '1') then difere := difere + 1; end if;
      end loop;
      r_caso := r_caso || ('Resumo: "escreve" bate com o que o banco aceita (' || case u when ua then 'adulto A' when ub then 'adulto B' when up then 'filha' else 'equipe' end || ')');
      r_esp := r_esp || '0 diferencas'::text;
      r_obt := r_obt || (difere || ' diferencas');
    end loop;

    -- vigia noturno (sem login) nunca recebe os dados do futuro
    r_caso := r_caso || 'Turno da noite (sem login) pede os dados do futuro'::text;
    r_esp := r_esp || 'bloqueado'::text;
    begin
      perform produto.futuro_entradas(fam::uuid);
      r_obt := r_obt || 'liberado'::text;
    exception when insufficient_privilege then r_obt := r_obt || 'bloqueado'::text;
    end;

    raise exception using errcode = 'P0001', message = 'desfazer';
  exception when sqlstate 'P0001' then null;
  end;

  for i in 1 .. coalesce(array_length(r_caso, 1), 0) loop
    caso := r_caso[i]; esperado := r_esp[i]; obtido := r_obt[i];
    ok := obtido is not distinct from esperado;
    return next;
  end loop;
end $$;
revoke all on function produto.teste_tranca_f() from public, anon, authenticated, service_role;

-- os 10 casos IR de fase_final/casos_teste.json (copiados; o rodar.sh confere se continuam iguais ao json)
create function produto.teste_futuro_ir()
returns table (caso text, esperado text, obtido text, ok boolean)
language plpgsql security invoker set search_path = '' as $$
declare c record; d int; al numeric; ir numeric;
begin
  for c in select * from (values
    ('IR-179', 1000.00, 179, false, null::date, null::date, 'aliquota_pct=22.5000 ir=225.00 rendimento_liquido=775.00'),
    ('IR-180', 1000.00, 180, false, null, null, 'aliquota_pct=22.5000 ir=225.00 rendimento_liquido=775.00'),
    ('IR-181', 1000.00, 181, false, null, null, 'aliquota_pct=20.0000 ir=200.00 rendimento_liquido=800.00'),
    ('IR-360', 1000.00, 360, false, null, null, 'aliquota_pct=20.0000 ir=200.00 rendimento_liquido=800.00'),
    ('IR-361', 1000.00, 361, false, null, null, 'aliquota_pct=17.5000 ir=175.00 rendimento_liquido=825.00'),
    ('IR-720', 1000.00, 720, false, null, null, 'aliquota_pct=17.5000 ir=175.00 rendimento_liquido=825.00'),
    ('IR-721', 1000.00, 721, false, null, null, 'aliquota_pct=15.0000 ir=150.00 rendimento_liquido=850.00'),
    ('IR-LCA', 1000.00, 100, true, null, null, 'aliquota_pct=0.0000 ir=0.00 rendimento_liquido=1000.00'),
    ('IR-DATA-2027-06-30', null, null, false, date '2027-01-01', date '2027-06-30', 'dias_corridos=180 aliquota_pct=22.5000'),
    ('IR-DATA-2027-07-01', null, null, false, date '2027-01-01', date '2027-07-01', 'dias_corridos=181 aliquota_pct=20.0000')
  ) as v(id, bruto, dias, isenta, aplicou, resgate, esp) loop
    caso := c.id; esperado := c.esp;
    if c.aplicou is not null then
      d := c.resgate - c.aplicou;
      obtido := 'dias_corridos=' || d || ' aliquota_pct=' || round(produto._aliq_ir(d) * 100, 4)::text;
    else
      al := case when c.isenta then 0 else produto._aliq_ir(c.dias) end;
      ir := round(c.bruto * al, 2);
      obtido := 'aliquota_pct=' || round(al * 100, 4)::text || ' ir=' || round(ir, 2)::text
             || ' rendimento_liquido=' || round(c.bruto - ir, 2)::text;
    end if;
    ok := obtido = esperado;
    return next;
  end loop;
end $$;
revoke all on function produto.teste_futuro_ir() from public, anon, authenticated, service_role;

-- turno da noite grava os 2 testes novos junto com os antigos
do $$ begin
  execute replace(pg_get_functiondef('produto.rodar_testes_noturnos()'::regprocedure),
    $a$  exception when others then quebrou := sqlerrm;$a$,
    $b$    insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe) select rid, 'teste_tranca_f', t.caso, t.ok, 'esperado ' || coalesce(t.esperado,'') || ', obtido ' || left(coalesce(t.obtido,''), 300) from produto.teste_tranca_f() t;
    insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe) select rid, 'teste_futuro_ir', t.caso, t.ok, 'esperado ' || coalesce(t.esperado,'') || ', obtido ' || coalesce(t.obtido,'') from produto.teste_futuro_ir() t;
  exception when others then quebrou := sqlerrm;$b$);
  if (select prosrc from pg_proc where oid = 'produto.rodar_testes_noturnos()'::regprocedure) not like '%teste_tranca_f%' then
    raise exception 'f_09: nao consegui ligar os testes novos no turno da noite';
  end if;
end $$;

-- portão: todos os testes que existirem no banco têm que continuar 100% ok
do $$
declare t text; n int;
begin
  foreach t in array array['teste_vazamento','teste_contas_casos','teste_guardado','teste_escritorio','teste_tranca_f','teste_futuro_ir'] loop
    if to_regprocedure('produto.' || t || '()') is not null then
      execute format('select count(*) from produto.%I() where not ok', t) into n;
      if n > 0 then raise exception 'f_09: % tem % caso(s) falhando; nada foi gravado', t, n; end if;
    end if;
  end loop;
  select count(*) into n from produto.teste_conta() where not ok;
  if n > 0 then raise exception 'f_09: teste_conta tem % caso(s) falhando; nada foi gravado', n; end if;
end $$;
