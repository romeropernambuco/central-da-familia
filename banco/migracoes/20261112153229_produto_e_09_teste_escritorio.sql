
do $$ begin
  execute replace(pg_get_functiondef('produto._escritorio(uuid,timestamptz)'::regprocedure),
    $a$where d.familia_id = f and d.ref = t->>'id' order by d.quando desc limit 1;$a$,
    $b$where d.familia_id = f and d.ref = t->>'id' and not (papel = 'equipe' and d.dados->>'opcao' = 'pedir_equipe') order by d.quando desc limit 1;$b$);
end $$;

create function produto._t(p text) returns timestamptz language sql immutable set search_path = '' as $$ select p::timestamp at time zone 'America/Recife' $$;
create function produto._tem(p_txt text, variadic p_pedacos text[]) returns text language sql immutable set search_path = '' as $$
  select case when p_txt is not null and (select bool_and(position(x in p_txt) > 0) from unnest(p_pedacos) x) then 'sim' else coalesce(p_txt, '(nada)') end
$$;
create function produto._esc_achar(p_esc jsonb, p_prefixo text) returns jsonb language sql immutable set search_path = '' as $$
  select x from jsonb_array_elements(p_esc->'precisa_de_voce') x where x->>'id' like p_prefixo || '%' limit 1
$$;

create function produto.teste_escritorio() returns table(caso text, esperado text, obtido text, ok boolean)
language plpgsql set search_path = '' as $$
declare
  res text[] := '{}'; i int; c record; obt text; e jsonb; q jsonb; j jsonb; n int; txt text; todas text := '';
  f uuid := gen_random_uuid(); u uuid := gen_random_uuid(); ue uuid := gen_random_uuid(); mb uuid := gen_random_uuid(); me uuid := gen_random_uuid();
  ef uuid := gen_random_uuid(); ec uuid := gen_random_uuid(); cn uuid := gen_random_uuid(); cm uuid := gen_random_uuid(); cs uuid := gen_random_uuid();
  ax uuid := gen_random_uuid(); ab uuid := gen_random_uuid(); lb uuid := gen_random_uuid(); i1 uuid := gen_random_uuid(); i2 uuid := gen_random_uuid(); fid uuid; l2 uuid := gen_random_uuid();
  cu text; ceq text;
  carla constant text := 'a0000000-0000-4e0e-8000-0000000000c1'; davi constant text := 'a0000000-0000-4e0e-8000-0000000000d1';
  paulo constant text := 'a0000000-0000-4e0e-8000-0000000000f2'; silva constant text := 'f0000000-0000-4e0e-8000-000000000001';
begin
  cu := json_build_object('sub', u, 'role', 'authenticated')::text; ceq := json_build_object('sub', ue, 'role', 'authenticated')::text;
  begin
    insert into produto.familias (id, nome, exemplo) values (f, 'Teste Escritorio', true);
    insert into produto.membros (id, familia_id, user_id, papel, nome) values (mb, f, u, 'casal', 'Romero Teste'), (me, f, ue, 'equipe', 'Givaldo');
    insert into produto.envelopes (id, familia_id, nome, regra, limite_mes, colchao, casa) values (ef, f, 'Feira', 'semanal', 5000, 0, true), (ec, f, 'Contas', 'mensal', 6000, 1000, false);
    insert into produto.cartoes (id, familia_id, nome, dia_fechamento, dia_vencimento) values (cn, f, 'Nubank', 8, 15), (cm, f, 'Mensal', 15, 22), (cs, f, 'Sem dia', null, null);
    insert into produto.cartao_custos (familia_id, cartao_id, limite, taxa_valor, taxa_periodo, taxa_mes, taxa_isenta_acima) values (f, cn, 8000, 480, 'ano', 12, null), (f, cm, 3000, 30, 'mes', null, 1000);
    insert into produto.lancamentos (familia_id, envelope_id, cartao_id, valor, data, descricao, autor) values
      (f, ec, cn, 2340, '2026-10-20', 'Compra no cartão', u), (f, ec, null, 5500, '2026-11-10', 'Conserto', u);
    insert into produto.config_familia (familia_id, chave, valor) values
      (f, 'casa_folha', '{"pessoas":[{"id":"p1","nome":"Maria","funcao":"Cozinheira","salario":1800,"diaPagamento":5}]}'),
      (f, 'casa_prestadores', '[{"id":"j1","dia":6,"nome":"Seu Zé","servico":"Jardineiro","valor":150}]'),
      (f, 'casa_gas', '{"custo":120,"trocas":["2026-09-01","2026-10-02","2026-11-01"]}');
    insert into produto.pat_aplicacoes (id, familia_id, titular_membro, nome, banco, tipo, pct_cdi, isento_ir, liquidez, vence_em, criado_por) values
      (ax, f, mb, 'Caixinha', 'Banco A', 'caixinha', 100, false, 'diaria', null, u), (ab, f, mb, 'CDB', 'Banco B', 'cdb', 110, false, 'vencimento', '2026-11-25', u);
    insert into produto.pat_movimentos (familia_id, aplicacao_id, data, tipo, valor, chave, autor) values
      (f, ax, '2026-10-01', 'aporte', 10000, gen_random_uuid(), u), (f, ab, '2026-05-11', 'aporte', 20000, gen_random_uuid(), u);
    insert into produto.esc_lembretes (id, familia_id, criado_por, titulo, quando, para) values (lb, f, u, 'Ligar pro contador', produto._t('2026-11-12 09:00'), 'casal');
    insert into produto.estoque_itens (id, familia_id, nome, categoria) values (i1, f, 'Café', 'Comida'), (i2, f, 'Arroz', 'Comida');
    perform set_config('request.jwt.claims', cu, true);

    -- FOLHA DA CASA
    e := produto._escritorio(f, produto._t('2026-11-01 10:00')); q := produto._esc_achar(e, 'dae:2026-11'); todas := todas || e::text;
    res := res || array['Folha: dia 1 pergunta da guia do governo, com o nome da pessoa e a sigla explicada', 'sim', produto._tem(q->>'pergunta', 'Romero, a guia do governo de quem trabalha na casa (a guia DAE) vence dia 07/11.', 'Já pagou?')];
    res := res || array['Folha: a fala tem as 4 partes (vi, por que importa, sugestão e botões com verbo)', 'sim/3', produto._tem(q->'partes'->>'importa', 'Faltam 6 dias', 'multa') || '/' || jsonb_array_length(q->'opcoes')];
    j := produto._esc_responder(f, q->>'id', 'paguei_hoje', '{}', produto._t('2026-11-03 10:00'));
    res := res || array['Folha: Paguei hoje grava a guia paga no cadastro', '2026-11-03', (select x.valor->'daePaga'->>'2026-11' from produto.config_familia x where x.familia_id = f and x.chave = 'casa_folha')];
    res := res || array['Folha: a resposta devolve "anotado às HH:MM"', 'anotado às 10:00', j->'anotado'->>'texto'];
    e := produto._escritorio(f, produto._t('2026-11-03 11:00'));
    res := res || array['Folha: pergunta da guia some depois de respondida', '(nada)', produto._tem(produto._esc_achar(e, 'dae:')->>'id', 'x')];
    e := produto._escritorio(f, produto._t('2026-11-04 10:00'));
    res := res || array['Folha: antes do dia do salário não pergunta', '(nada)', produto._tem(produto._esc_achar(e, 'salario:')->>'id', 'x')];
    e := produto._escritorio(f, produto._t('2026-11-05 10:00')); q := produto._esc_achar(e, 'salario:p1'); todas := todas || e::text;
    res := res || array['Folha: no dia do salário pergunta, com o valor', 'sim', produto._tem(q->>'pergunta', 'hoje é dia do salário de Maria (R$ 1.800,00)', 'Já pagou?')];
    perform produto._esc_responder(f, q->>'id', 'paguei', '{"valor": 1800}', produto._t('2026-11-05 10:05'));
    res := res || array['Folha: Paguei grava o salário pago com o valor', '1800', (select x.valor->'salarioPago'->'p1:2026-11'->>'valor' from produto.config_familia x where x.familia_id = f and x.chave = 'casa_folha')];
    begin perform produto._esc_responder(f, 'salario:p1:2026-11', 'paguei', '{}', produto._t('2026-11-05 10:06')); obt := 'aceitou'; exception when others then obt := 'recusou'; end;
    res := res || array['Botão que pede valor recusa resposta sem valor', 'recusou', obt];

    -- FISCAL DA FEIRA
    e := produto._escritorio(f, produto._t('2026-11-09 17:00'));
    res := res || array['Fiscal: segunda antes das 18h não pergunta nada', '0', (select count(*)::text from jsonb_array_elements(e->'precisa_de_voce') x where x->>'funcionario' = 'fiscal_feira')];
    e := produto._escritorio(f, produto._t('2026-11-09 19:00')); q := produto._esc_achar(e, 'feira_feita:'); todas := todas || e::text;
    res := res || array['Fiscal: segunda 18h pergunta se a feira foi feita (1ª frase)', 'sim', produto._tem(q->>'pergunta', 'Romero, a feira desta semana ainda não apareceu aqui.', 'Foi feita?')];
    res := res || array['Fiscal: cobra 1 coisa por vez', '1', (select count(*)::text from jsonb_array_elements(e->'precisa_de_voce') x where x->>'funcionario' = 'fiscal_feira')];
    e := produto._escritorio(f, produto._t('2026-11-10 10:00')); q := produto._esc_achar(e, 'feira_feita:');
    res := res || array['Fiscal: 2ª cobrança muda a frase e diz há quanto tempo espera', 'sim/2', produto._tem(q->>'pergunta', 'continua sem registro desde ontem') || '/' || (q->>'variacao')];
    res := res || array['Fiscal: 3ª cobrança (3 dias depois) é outra frase', 'sim/3', (select produto._tem(x->>'pergunta', 'já é quinta e a feira da semana ainda não apareceu') || '/' || (x->>'variacao') from produto._esc_achar(produto._escritorio(f, produto._t('2026-11-12 10:00')), 'feira_feita:') x)];
    perform set_config('request.jwt.claims', ceq, true);
    e := produto._escritorio(f, produto._t('2026-11-10 10:00')); q := produto._esc_achar(e, 'feira_feita:'); todas := todas || e::text;
    res := res || array['Equipe: recebe a pergunta da feira com o 1º nome dela', 'sim', produto._tem(q->>'pergunta', 'Givaldo, a feira desta semana', 'Foi feita?')];
    res := res || array['Equipe: nenhum R$, valor, limite ou salário em nada do que o escritório devolve', 'limpo', case when e::text ~* 'R\$|"valor"|"limite"|salario|"saldo"|"total"' then 'vazou' else 'limpo' end];
    res := res || array['Equipe: só vê os funcionários da Casa', 'comprador,fiscal_feira', (select string_agg(x->>'id', ',' order by x->>'id') from jsonb_array_elements(e->'funcionarios') x)];
    perform produto._esc_responder(f, q->>'id', 'foi_feita', '{"valor": 999}', produto._t('2026-11-10 10:05'));
    select x.id into fid from produto.feiras x where x.familia_id = f;
    res := res || array['Equipe: "Já foi feita" registra a feira sem valor e sem lançamento', '1/0', (select count(*)::text from produto.feiras x where x.familia_id = f and x.lancamento_id is null) || '/' || (select count(*)::text from produto.lancamentos l where l.familia_id = f and l.envelope_id = ef)];
    res := res || array['Equipe: a resposta dela fica no diário sem valor', 'limpo', (select case when d.dados ? 'valor' or d.resposta ~ 'R\$' then 'vazou' else 'limpo' end from produto.esc_diario d where d.familia_id = f and d.ref like 'feira_feita:%' order by d.quando desc limit 1)];
    perform set_config('request.jwt.claims', cu, true);
    e := produto._escritorio(f, produto._t('2026-11-10 11:00')); q := produto._esc_achar(e, 'feira_valor:'); todas := todas || e::text;
    res := res || array['Fiscal: feira registrada pela equipe sem valor vira "Quanto custou?" pro casal', 'sim', produto._tem(q->>'pergunta', 'a feira de 10/11 foi registrada sem o valor', 'Quanto custou?')];
    perform produto._esc_responder(f, q->>'id', 'dizer', '{"valor": 1080}', produto._t('2026-11-10 11:05'));
    res := res || array['Fiscal: dizer o valor cria o lançamento no envelope da Feira', '1080.00/2026-11-10', (select l.valor || '/' || l.data from produto.lancamentos l join produto.feiras x on x.lancamento_id = l.id where x.id = fid and l.envelope_id = ef)];
    e := produto._escritorio(f, produto._t('2026-11-10 12:00')); q := produto._esc_achar(e, 'feira_nota:');
    res := res || array['Fiscal: feira sem nota vira a pergunta da nota, com data e valor', 'sim', produto._tem(q->>'fala', 'a feira de 10/11 (R$ 1.080,00) está sem a nota', 'Sem nota eu não consigo conferir preço nem item', 'Consegue anexar agora?')];
    perform set_config('request.jwt.claims', ceq, true);
    e := produto._escritorio(f, produto._t('2026-11-10 12:00')); q := produto._esc_achar(e, 'feira_nota:'); todas := todas || e::text;
    res := res || array['Equipe: recebe "anexar a nota" sem o total', 'sim/limpo', produto._tem(q->>'pergunta', 'Givaldo, a feira de 10/11 está sem a nota') || '/' || case when e::text ~* 'R\$|"valor"' then 'vazou' else 'limpo' end];
    j := produto._esc_responder(f, q->>'id', 'anexar', '{}', produto._t('2026-11-10 12:10'));
    res := res || array['Anexar sem a foto ainda: devolve o caminho pra subir e volta em 1 hora', f::text || '/' || fid::text || '.jpg', j->'efeito'->>'caminho'];
    j := produto._esc_responder(f, q->>'id', 'anexar', jsonb_build_object('caminho', f::text || '/' || fid::text || '.jpg'), produto._t('2026-11-10 12:20'));
    res := res || array['Equipe: anexar com o caminho grava a nota na feira', 'true', (select (x.nota_caminho is not null)::text from produto.feiras x where x.id = fid)];
    begin perform produto.feira_anexar_nota(fid, silva || '/x.jpg'); obt := 'aceitou'; exception when others then obt := 'recusou'; end;
    res := res || array['Nota com caminho na pasta de outra família', 'recusou', obt];
    perform set_config('request.jwt.claims', cu, true);
    e := produto._escritorio(f, produto._t('2026-11-10 14:00')); q := produto._esc_achar(e, 'estoque:'); todas := todas || e::text;
    res := res || array['Fiscal: com feira e nota em dia, pergunta da contagem do estoque', 'sim', produto._tem(q->>'fala', 'a contagem do estoque desta semana ainda não foi feita', 'Sem ela eu não sei o que faltou nem o que sobrou')];
    res := res || array['Fiscal: não pergunta de novo o que já sabe (feira e nota)', '0', (select count(*)::text from jsonb_array_elements(e->'precisa_de_voce') x where x->>'id' like 'feira_%')];
    perform produto._esc_responder(f, q->>'id', 'pedir_equipe', '{}', produto._t('2026-11-10 14:05'));
    res := res || array['Fiscal: "Pedir pra equipe" tira a pergunta do casal', '(nada)', produto._tem(produto._esc_achar(produto._escritorio(f, produto._t('2026-11-10 15:00')), 'estoque:')->>'id', 'x')];
    perform set_config('request.jwt.claims', ceq, true);
    e := produto._escritorio(f, produto._t('2026-11-10 15:00')); q := produto._esc_achar(e, 'estoque:');
    res := res || array['Equipe: recebe "Contar o estoque"', 'Contar o estoque', q->'opcoes'->0->>'rotulo'];
    perform produto._esc_responder(f, q->>'id', 'contar', jsonb_build_object('itens', jsonb_build_array(jsonb_build_object('item_id', i1, 'estado', 'acabou'), jsonb_build_object('item_id', i2, 'estado', 'tem'))), produto._t('2026-11-10 15:10'));
    res := res || array['Equipe: contar grava a contagem da semana', '1', (select count(*)::text from produto.estoque_contagens x where x.familia_id = f and x.semana = '2026-11-09')];
    perform set_config('request.jwt.claims', cu, true);
    e := produto._escritorio(f, produto._t('2026-11-10 16:00')); todas := todas || e::text;
    res := res || array['Fiscal: com tudo em dia entrega 1 linha e não inventa pergunta', 'Feira de 10/11 feita, R$ 1.080,00 de R$ 1.153,85 da semana. Nota anexada. Estoque contado: falta 1 item.',
      (select x->>'resumo' from jsonb_array_elements(e->'entregue') x where x->>'funcionario' = 'fiscal_feira')];
    res := res || array['Fiscal: estado "entregue" e nenhuma pergunta', 'entregue/0', (select (x->>'estado') || '/' || (x->>'pendentes') from jsonb_array_elements(e->'funcionarios') x where x->>'id' = 'fiscal_feira')];

    -- ANALISTA DE CARTAO
    e := produto._escritorio(f, produto._t('2026-11-11 10:00'));
    res := res || array['Cartão: 4 dias antes do vencimento ainda não pergunta', '(nada)', produto._tem(produto._esc_achar(e, 'fatura:')->>'id', 'x')];
    e := produto._escritorio(f, produto._t('2026-11-12 10:00')); q := produto._esc_achar(e, 'fatura:'); todas := todas || e::text;
    res := res || array['Cartão: 3 dias antes pergunta com valor, dia da semana e data', 'sim/1', produto._tem(q->>'fala', 'Romero, a fatura do Nubank fecha em R$ 2.340,00 e vence domingo, 15/11.', 'Faltam 3 dias.', 'Já pagou?') || '/' || (q->>'variacao')];
    res := res || array['Cartão: avisa da anuidade 1 mês antes', 'sim', produto._tem(produto._esc_achar(e, 'anuidade:')->>'fala', 'mês que vem o Nubank cobra a anuidade de R$ 480,00', 'Quer que eu te lembre de pedir isenção dia 01?')];
    res := res || array['Cartão: cobra o cartão sem dia de fechamento', 'sim', produto._tem(produto._esc_achar(e, 'cartao_dias:')->>'fala', 'o cartão Sem dia está sem o dia que fecha e o dia que vence')];
    res := res || array['Cartão: avisa quando falta pouco pra livrar da mensalidade', 'sim', produto._tem(produto._esc_achar(e, 'mensalidade:')->>'fala', 'Pra não pagar a mensalidade de R$ 30,00 ele precisa chegar a R$ 1.000,00', 'Faltam R$ 1.000,00')];
    perform produto._esc_responder(f, q->>'id', 'ainda_nao', '{}', produto._t('2026-11-12 10:05'));
    res := res || array['Cartão: "Ainda não paguei" some até o dia seguinte', '(nada)', produto._tem(produto._esc_achar(produto._escritorio(f, produto._t('2026-11-12 18:00')), 'fatura:')->>'id', 'x')];
    e := produto._escritorio(f, produto._t('2026-11-13 09:00')); q := produto._esc_achar(e, 'fatura:');
    res := res || array['Cartão: 2ª cobrança muda a frase, lembra a resposta anterior e diz por que importa', 'sim/2', produto._tem(q->>'fala', 'vence em 2 dias e você ainda não me disse se pagou', 'Dia 12/11 você me respondeu: Ainda não paguei.') || '/' || (q->>'variacao')];
    e := produto._escritorio(f, produto._t('2026-11-16 09:00')); q := produto._esc_achar(e, 'fatura:');
    res := res || array['Cartão: 3ª cobrança diz há quantos dias espera e fala dos juros', 'sim/3', produto._tem(q->>'fala', 'pergunto há 4 dias da fatura do Nubank', 'Venceu ontem. Atrasando, o banco cobra juros e multa.') || '/' || (q->>'variacao')];
    perform produto._esc_responder(f, q->>'id', 'paguei_outro_dia', '{"data": "2026-11-14"}', produto._t('2026-11-16 09:05'));
    res := res || array['Cartão: "Paguei outro dia" grava a data e quem pagou', '2026-11-14/true', (select x.paga_em || '/' || (x.paga_por = u) from produto.cartao_faturas x where x.familia_id = f and x.cartao_id = cn and x.mes = '2026-11')];
    e := produto._escritorio(f, produto._t('2026-11-16 10:00'));
    res := res || array['Cartão: fatura paga não é perguntada de novo e vira entrega', '(nada)/sim', produto._tem(produto._esc_achar(e, 'fatura:')->>'id', 'x') || '/' || (select produto._tem(x->>'resumo', 'foi paga dia 14/11') from jsonb_array_elements(e->'entregue') x where x->>'funcionario' = 'analista_cartao' limit 1)];
    res := res || array['Cartão: a resposta aparece no topo de "O que você já me respondeu"', 'Paguei outro dia: 14/11', (select x->'ultimas_respostas'->0->>'resposta' from jsonb_array_elements(e->'funcionarios') x where x->>'id' = 'analista_cartao')];
    j := produto._esc_responder(f, q->>'id', 'paguei_outro_dia', '{"data": "2026-11-15"}', produto._t('2026-11-16 10:10'));
    res := res || array['Corrigir uma resposta grava linha nova e não apaga a antiga', 'true/3/2026-11-15', (j->>'corrigiu') || '/' || (select count(*)::text from produto.esc_diario d where d.familia_id = f and d.ref like 'fatura:%') || '/' || (select x.paga_em::text from produto.cartao_faturas x where x.familia_id = f and x.cartao_id = cn)];
    perform produto.fatura_informar(f, cn, '2026-11', 2512);
    e := produto._escritorio(f, produto._t('2026-11-16 11:00')); q := produto._esc_achar(e, 'fatura_dif:'); todas := todas || e::text;
    res := res || array['Cartão: valor do banco diferente da soma do app vira pergunta', 'sim', produto._tem(q->>'fala', 'o banco cobrou R$ 2.512,00 na fatura do Nubank e eu somei R$ 2.340,00', 'Tem R$ 172,00 que não foi anotado', 'Quer lançar agora?')];
    perform produto._esc_responder(f, q->>'id', 'explicar', '{"texto": "juros do mês passado"}', produto._t('2026-11-16 11:05'));
    res := res || array['Cartão: diferença explicada fica guardada e a pergunta some', 'juros do mês passado/(nada)', (select x.diferenca_motivo from produto.cartao_faturas x where x.familia_id = f and x.cartao_id = cn) || '/' || produto._tem(produto._esc_achar(produto._escritorio(f, produto._t('2026-11-16 12:00')), 'fatura_dif:')->>'id', 'x')];
    perform produto._esc_responder(f, (select x->>'id' from produto._esc_achar(e, 'anuidade:') x), 'lembrar', '{}', produto._t('2026-11-16 11:10'));
    res := res || array['Cartão: "Me lembra dia 01" cria o lembrete de 01/12', '2026-12-01 09:00', (select to_char(l.quando at time zone 'America/Recife', 'YYYY-MM-DD HH24:MI') from produto.esc_lembretes l where l.familia_id = f and l.funcionario = 'analista_cartao')];
    j := produto.cartao_salvar(f, 'Visa da casa', null, 'Itaú', mb, 3, 10, 5000, 39.9, 'mes', null, 800, '1234')::jsonb;
    res := res || array['cartao_salvar cadastra cartão com banco, dono, dias, limite e mensalidade', 'Visa da casa/5000.00/mes', (j->'cartao'->>'apelido') || '/' || (j->'cartao'->>'limite') || '/' || (j->'cartao'->>'taxa_periodo')];
    begin perform produto.cartao_salvar(f, 'Cartão 5502123412341234'); obt := 'aceitou'; exception when others then obt := 'recusou'; end;
    res := res || array['cartao_salvar recusa número de cartão no apelido', 'recusou', obt];
    res := res || array['Ficha do Analista traz os cartões e as faturas no cadastro', 'true', (select (jsonb_array_length(x->'cadastro_resumo'->'itens') = 4 and jsonb_array_length(x->'cadastro_resumo'->'faturas') >= 1)::text from jsonb_array_elements(produto._escritorio(f, produto._t('2026-11-16 12:00'))->'funcionarios') x where x->>'id' = 'analista_cartao')];

    -- CONTADOR
    e := produto._escritorio(f, produto._t('2026-11-12 19:00'));
    res := res || array['Contador: antes das 20h não pergunta', '(nada)', produto._tem(produto._esc_achar(e, 'lancou_hoje:')->>'id', 'x')];
    e := produto._escritorio(f, produto._t('2026-11-12 20:30')); q := produto._esc_achar(e, 'lancou_hoje:'); todas := todas || e::text;
    res := res || array['Contador: depois das 20h sem lançamento no dia, pergunta', 'sim', produto._tem(q->>'fala', 'e não tem nenhum gasto anotado hoje', 'Gastou alguma coisa e ficou sem anotar?')];
    perform produto._esc_responder(f, q->>'id', 'lembrar_22', '{}', produto._t('2026-11-12 20:35'));
    res := res || array['Contador: "Me lembra às 22h" some e volta na hora certa', '(nada)/volta', produto._tem(produto._esc_achar(produto._escritorio(f, produto._t('2026-11-12 21:59')), 'lancou_hoje:')->>'id', 'x') || '/' || case when produto._esc_achar(produto._escritorio(f, produto._t('2026-11-12 22:01')), 'lancou_hoje:') is not null then 'volta' else 'não voltou' end];
    perform produto._esc_responder(f, q->>'id', 'nao_gastei', '{}', produto._t('2026-11-12 22:05'));
    res := res || array['Contador: "Hoje não gastei" encerra a pergunta do dia', '(nada)', produto._tem(produto._esc_achar(produto._escritorio(f, produto._t('2026-11-12 23:00')), 'lancou_hoje:')->>'id', 'x')];
    e := produto._escritorio(f, produto._t('2026-12-02 10:00')); q := produto._esc_achar(e, 'fechou_mes:2026-11'); todas := todas || e::text;
    res := res || array['Contador: dia 1 a 5 fecha o mês e pergunta se guarda a sobra', 'sim', produto._tem(q->>'fala', 'fechei o mês 11/2026: sobraram R$', 'Guardado, rende mais ou menos R$', 'Quer mandar pro Guardado?')];
    perform produto._esc_responder(f, q->>'id', 'guardar', '{"valor": 500}', produto._t('2026-12-02 10:05'));
    res := res || array['Contador: "Guardar agora" faz o depósito no Guardado', '500.00/2026-12-02', (select mv.valor || '/' || mv.data from produto.pat_movimentos mv where mv.familia_id = f and mv.aplicacao_id = ax and mv.tipo = 'aporte' and mv.data > '2026-11-30')];

    -- GUARDIAO DA RESERVA
    e := produto._escritorio(f, produto._t('2026-11-12 10:00')); q := produto._esc_achar(e, 'colchao:');
    res := res || array['Reserva: abaixo do combinado, pergunta de onde volta e quando, explicando o que é reserva', 'sim', produto._tem(q->>'fala', 'a reserva de Contas (o dinheiro que vocês combinaram nunca gastar) está em R$ 500,00. O combinado é R$ 1.000,00, então faltam R$ 500,00.', 'De onde esse dinheiro volta, e em que dia?')];
    perform produto._esc_responder(f, q->>'id', 'repor', '{"texto": "o aluguel", "data": "2026-11-15"}', produto._t('2026-11-12 10:20'));
    res := res || array['Reserva: resposta com texto e data fica quieta até o dia combinado', '(nada)', produto._tem(produto._esc_achar(produto._escritorio(f, produto._t('2026-11-15 20:00')), 'colchao:')->>'id', 'x')];
    q := produto._esc_achar(produto._escritorio(f, produto._t('2026-11-16 09:00')), 'colchao:');
    res := res || array['Reserva: no dia seguinte ao combinado volta usando o que ouviu', 'sim', produto._tem(q->>'fala', 'Dia 12/11 você me disse que ia repor até dia 15/11 com: o aluguel. Hoje é dia 16/11.', 'Esse dinheiro entrou?')];

    -- GESTOR DO GUARDADO
    res := res || array['Gestor: todo dia útil entrega quanto rendeu', 'sim', (select produto._tem(x->>'resumo', 'Seu dinheiro guardado rendeu R$', 'hoje, já sem o imposto') from jsonb_array_elements(e->'entregue') x where x->>'funcionario' = 'gestor_guardado')];
    res := res || array['Gestor: sábado diz que não rende e por quê', 'sim', (select produto._tem(x->>'resumo', 'não rende hoje: hoje é sábado: rende de novo na segunda') from jsonb_array_elements(produto._escritorio(f, produto._t('2026-11-14 10:00'))->'entregue') x where x->>'funcionario' = 'gestor_guardado')];
    q := produto._esc_achar(e, 'cdb_vence:');
    res := res || array['Gestor: 15 dias antes do vencimento pergunta renovar ou tirar', 'sim', produto._tem(q->>'fala', 'aplicação CDB', 'vence', '25/11', 'O que prefere?')];
    perform produto._esc_responder(f, q->>'id', 'renovar', '{"data": "2027-11-25"}', produto._t('2026-11-12 11:00'));
    res := res || array['Gestor: "Renovar" grava o novo vencimento', '2027-11-25', (select x.vence_em::text from produto.pat_aplicacoes x where x.id = ab)];
    q := produto._esc_achar(e, 'reserva_parada:');
    res := res || array['Gestor: reserva parada na conta que não rende vira sugestão com conta feita', 'sim', produto._tem(q->>'fala', 'está na conta comum, que não rende', 'daria mais ou menos R$', 'Quer que eu mostre como guardar?')];
    perform produto._esc_responder(f, q->>'id', 'ja_guardada', '{}', produto._t('2026-11-12 11:05'));
    res := res || array['Gestor: "Ela já está guardada" fica no cadastro e ele não pergunta mais', 'guardada/(nada)', (select x.valor #>> '{}' from produto.config_familia x where x.familia_id = f and x.chave = 'reserva_onde') || '/' || produto._tem(produto._esc_achar(produto._escritorio(f, produto._t('2026-12-20 10:00')), 'reserva_parada:')->>'id', 'x')];
    e := produto._escritorio(f, produto._t('2026-12-02 11:00')); q := produto._esc_achar(e, 'saldo_conferir:' || ax::text);
    res := res || array['Gestor: virou o mês, pede pra conferir o saldo no banco', 'sim', produto._tem(q->>'fala', 'Romero, virou o mês. Pela minha conta você tem R$', 'guardados em Caixinha (Banco A)', 'me diz quanto aparece lá')];
    j := produto._esc_responder(f, q->>'id', 'conferi', jsonb_build_object('valor', (q->>'valor')::numeric + 10), produto._t('2026-12-02 11:05'));
    res := res || array['Gestor: saldo digitado vira movimento e mostra a diferença', '1/sim', (select count(*)::text from produto.pat_movimentos mv where mv.aplicacao_id = ax and mv.tipo = 'saldo_conferido') || '/' || produto._tem(j->'efeito'->>'frase', 'O banco mostra R$', 'a mais que a minha conta')];

    -- SECRETARIA
    res := res || array['Secretária: antes da hora do lembrete não cobra', '(nada)', produto._tem(produto._esc_achar(produto._escritorio(f, produto._t('2026-11-12 08:00')), 'lembrete:')->>'id', 'x')];
    e := produto._escritorio(f, produto._t('2026-11-12 10:00')); q := produto._esc_achar(e, 'lembrete:');
    res := res || array['Secretária: na hora, fala como gente', 'sim', produto._tem(q->>'pergunta', 'Romero, você me pediu pra lembrar hoje: Ligar pro contador.', 'Já fez?')];
    perform produto._esc_responder(f, q->>'id', 'adiar_1_dia', '{}', produto._t('2026-11-12 10:30'));
    res := res || array['Secretária: "Me lembra amanhã" some hoje e volta amanhã', '(nada)/volta', produto._tem(produto._esc_achar(produto._escritorio(f, produto._t('2026-11-12 23:00')), 'lembrete:' || lb::text)->>'id', 'x') || '/' || case when produto._esc_achar(produto._escritorio(f, produto._t('2026-11-13 10:31')), 'lembrete:' || lb::text) is not null then 'volta' else 'não voltou' end];
    q := produto._esc_achar(produto._escritorio(f, produto._t('2026-11-15 10:31')), 'lembrete:' || lb::text);
    res := res || array['Secretária: cobra de novo todo dia até responder, dizendo há quanto tempo', 'sim', produto._tem(q->>'pergunta', 'Continua aberto há 2 dias: Ligar pro contador.')];
    perform produto._esc_responder(f, q->>'id', 'feito', '{}', produto._t('2026-11-15 10:40'));
    res := res || array['Secretária: "Já fiz" conclui o lembrete', 'true', (select (l.feito_em is not null)::text from produto.esc_lembretes l where l.id = lb)];
    j := produto.lembrete_criar(f, 'Pagar o IPVA', now() + interval '2 hours', 'ano')::jsonb;
    res := res || array['lembrete_criar, lembrete_adiar, lembrete_concluir (repete todo ano) e lembrete_apagar', 'true/true/true',
      ((j->'lembrete'->>'titulo') = 'Pagar o IPVA')::text || '/' ||
      (select ((produto.lembrete_adiar((j->'lembrete'->>'id')::uuid, now() + interval '3 days')::jsonb->>'acao') = 'adiar' and (produto.lembrete_concluir((j->'lembrete'->>'id')::uuid)::jsonb->>'acao') = 'concluir')::text) || '/' ||
      (select (produto.lembrete_apagar((j->'lembrete'->>'id')::uuid) is not null and not l.ativo and l.feito_em is null and l.quando > now() + interval '300 days')::text from produto.esc_lembretes l where l.id = (j->'lembrete'->>'id')::uuid)];
    res := res || array['Apagar lembrete só marca inativo (a linha continua lá)', '1', (select count(*)::text from produto.esc_lembretes l where l.id = (j->'lembrete'->>'id')::uuid and not l.ativo)];

    -- COMPRADOR
    e := produto._escritorio(f, produto._t('2026-11-13 10:00')); q := produto._esc_achar(e, 'prestador_vespera:'); todas := todas || e::text;
    res := res || array['Comprador: na véspera lembra da mensagem, com o texto pronto', 'sim/sim', produto._tem(q->>'fala', 'amanhã, sábado, é dia do jardineiro (Seu Zé)', 'Já mandou a mensagem pra ele?') || '/' || produto._tem(q->>'mensagem', 'Oi, Seu Zé', '14/11')];
    res := res || array['Comprador: no dia, antes das 17h, não pergunta se veio', '(nada)', produto._tem(produto._esc_achar(produto._escritorio(f, produto._t('2026-11-14 16:00')), 'prestador_veio:')->>'id', 'x')];
    q := produto._esc_achar(produto._escritorio(f, produto._t('2026-11-14 17:30')), 'prestador_veio:');
    res := res || array['Comprador: no dia às 17h pergunta se ele veio', 'sim', produto._tem(q->>'pergunta', 'hoje era dia do jardineiro (Seu Zé).', 'Ele veio?')];
    perform produto._esc_responder(f, q->>'id', 'veio', '{}', produto._t('2026-11-14 17:35'));
    res := res || array['Comprador: "Ele veio" anota a última visita', 'true', (select (x.valor->0->>'ultimaVez' is not null)::text from produto.config_familia x where x.familia_id = f and x.chave = 'casa_prestadores')];
    q := produto._esc_achar(produto._escritorio(f, produto._t('2026-11-28 10:00')), 'gas:');
    res := res || array['Comprador: 5 dias antes da troca do gás, avisa', 'sim', produto._tem(q->>'fala', 'pela média da casa, o gás acaba dia', 'Já pediu?')];
    perform set_config('request.jwt.claims', ceq, true);
    e := produto._escritorio(f, produto._t('2026-11-28 10:00')); q := produto._esc_achar(e, 'gas:'); todas := todas || e::text;
    res := res || array['Equipe: recebe a pergunta do gás sem valor ("Já trocou?")', 'sim/limpo', produto._tem(q->>'pergunta', 'Givaldo', 'Já trocou?') || '/' || case when e::text ~* 'R\$|"valor"|custo' then 'vazou' else 'limpo' end];
    begin perform produto._esc_responder(f, 'fatura:' || cn::text || ':2026-12', 'paguei_hoje', '{}', produto._t('2026-11-28 10:05')); obt := 'aceitou'; exception when others then obt := 'recusou'; end;
    res := res || array['Equipe: não consegue responder pergunta de dinheiro', 'recusou', obt];
    perform set_config('request.jwt.claims', cu, true);

    -- FISCAL: semana seguinte, avisos
    insert into produto.lancamentos (id, familia_id, envelope_id, valor, data, descricao, autor) values (l2, f, ef, 900, '2026-11-17', 'Mercado', u);
    e := produto._escritorio(f, produto._t('2026-11-17 20:00')); q := produto._esc_achar(e, 'feira_feita:2026-11-16'); todas := todas || e::text;
    res := res || array['Fiscal: se já existe gasto na Feira na semana, pergunta se foi essa (não pede o que já sabe)', 'sim', produto._tem(q->>'pergunta', 'vi um gasto de R$ 900,00 na Feira dia 17/11', 'Foi essa?')];
    perform produto._esc_responder(f, q->>'id', 'foi_essa', '{}', produto._t('2026-11-17 20:05'));
    res := res || array['Fiscal: "Foi essa a feira" liga a feira ao gasto que já existia, sem lançar de novo', '1/2', (select count(*)::text from produto.feiras x where x.familia_id = f and x.lancamento_id = l2) || '/' || (select count(*)::text from produto.lancamentos l where l.familia_id = f and l.envelope_id = ef)];
    q := produto._esc_achar(produto._escritorio(f, produto._t('2026-11-17 20:10')), 'feira_nota:');
    perform produto._esc_responder(f, q->>'id', 'sem_nota', '{"texto": "feira livre"}', produto._t('2026-11-17 20:12'));
    res := res || array['Fiscal: "Não teve nota" guarda o motivo e para de pedir', 'feira livre/(nada)', (select x.sem_nota_motivo from produto.feiras x where x.lancamento_id = l2) || '/' || produto._tem(produto._esc_achar(produto._escritorio(f, produto._t('2026-11-17 20:20')), 'feira_nota:')->>'id', 'x')];
    insert into produto.lancamentos (familia_id, envelope_id, valor, data, descricao, autor) values (f, ef, 400, '2026-11-18', 'Açougue', u);
    perform produto._estoque_contar(f, jsonb_build_array(jsonb_build_object('item_id', i1, 'estado', 'acabou')), '2026-11-18', '2026-11-18');
    e := produto._escritorio(f, produto._t('2026-11-18 21:00')); todas := todas || e::text;
    res := res || array['Fiscal avisa sozinho: semana passou do teto, quanto e qual semana do mês', 'sim', (select produto._tem(x->>'texto', 'A semana de 16/11 passou do teto em R$ 146,15', '3ª semana do mês') from jsonb_array_elements(e->'avisos') x where x->>'tipo' = 'passou_do_teto')];
    res := res || array['Fiscal avisa sozinho: item que acabou 2 semanas seguidas', 'sim', (select produto._tem(x->>'texto', 'Acabou 2 semanas seguidas: Café') from jsonb_array_elements(e->'avisos') x where x->>'tipo' = 'acabou_2_semanas')];
    j := produto.feira_registrar(f, null, 55.5, 'Padaria')::jsonb;
    res := res || array['feira_registrar (casal) cria a feira e o lançamento; estoque_item_salvar cria item', '55.50/Sabão', (j->'feira'->>'valor') || '/' || (produto.estoque_item_salvar(f, 'Sabão', 'Limpeza')::jsonb->'item'->>'nome')];

    -- TEXTO, DIARIO E RELATORIO
    res := res || array['Nenhuma fala devolvida tem a palavra "colchão" nem travessão', 'limpo', case when todas ~* 'colch[ãa]o [a-z]|[Cc]olchão|—' then 'achou' else 'limpo' end];
    res := res || array['A explicação da conta do dia também fala "reserva"', 'limpo', case when produto._resumo(f, '2026-11-12')::text ~ 'olchão' then 'achou' else 'limpo' end];
    res := res || array['Toda pergunta chama a pessoa pelo 1º nome na 1ª vez', 'true', (select bool_and(x->>'pergunta' like 'Romero, %')::text from jsonb_array_elements(produto._escritorio(f, produto._t('2026-11-01 10:00'))->'precisa_de_voce') x where (x->>'variacao')::int = 1)];
    res := res || array['Nenhum botão é só "Sim" ou "Não"', '0', (select count(*)::text from jsonb_array_elements(produto._escritorio(f, produto._t('2026-11-12 20:30'))->'precisa_de_voce') x, jsonb_array_elements(x->'opcoes') o where lower(o->>'rotulo') in ('sim', 'não', 'nao'))];
    res := res || array['Cada funcionário traz ficha: cadastro, últimas respostas e o que faz', '8/true', (select count(*)::text || '/' || bool_and(x ? 'cadastro_resumo' and x ? 'ultimas_respostas' and jsonb_array_length(x->'faz') = 3)::text from jsonb_array_elements(e->'funcionarios') x)];
    res := res || array['Últimas respostas vêm no máximo 10 por funcionário', 'true', (select bool_and(jsonb_array_length(x->'ultimas_respostas') <= 10)::text from jsonb_array_elements(e->'funcionarios') x)];
    j := produto.escritorio_diario(f, 'analista_cartao', 2)::jsonb;
    res := res || array['escritorio_diario: "ver tudo" por funcionário, em páginas', '2/true', jsonb_array_length(j->'itens')::text || '/' || (j->>'tem_mais')];
    j := produto._esc_relatorio(f, '2026-11-01', '2026-12-31', produto._t('2026-12-02 12:00'));
    res := res || array['Relatório: por funcionário, perguntas, resolvidas e tempo médio', 'true', (select (count(*) = 8 and bool_or((x->>'perguntas')::int > 0 and x->>'tempo_medio_min' is not null))::text from jsonb_array_elements(j->'funcionarios') x)];
    res := res || array['Relatório: a linha do tempo tem todas as respostas do diário', (select count(*)::text from produto.esc_diario d where d.familia_id = f), jsonb_array_length(j->'linha_do_tempo')::text];
    res := res || array['Toda resposta guarda quem respondeu e a hora', 'true', (select bool_and(d.respondido_por in (u, ue) and d.quando is not null)::text from produto.esc_diario d where d.familia_id = f)];
    j := produto.escritorio_hoje(f)::jsonb;
    res := res || array['escritorio_hoje (data de hoje) responde com os 4 blocos do contrato', 'true', (j ?& array['precisa_de_voce', 'trabalhando', 'entregue', 'funcionarios'])::text];

    -- VAZAMENTO (com a tranca de verdade ligada)
    for c in select * from (values
      ('Outra família chama escritorio_hoje desta', paulo, format('select 1 from produto.escritorio_hoje(%L)', f), 'contar', 'bloqueado'),
      ('Outra família responde pergunta desta', paulo, format('select 1 from produto.escritorio_responder(%L, ''dae:2026-11'', ''paguei_hoje'')', f), 'contar', 'bloqueado'),
      ('Outra família pede o relatório desta', paulo, format('select 1 from produto.escritorio_relatorio(%L)', f), 'contar', 'bloqueado'),
      ('Outra família pede o diário desta', paulo, format('select 1 from produto.escritorio_diario(%L)', f), 'contar', 'bloqueado'),
      ('Outra família lê o diário, lembretes, feiras, estoque, custos e faturas desta', paulo, 'select (select count(*) from produto.esc_diario) + (select count(*) from produto.esc_lembretes) + (select count(*) from produto.feiras) + (select count(*) from produto.estoque_itens) + (select count(*) from produto.estoque_contagens) + (select count(*) from produto.cartao_custos) + (select count(*) from produto.cartao_faturas)', 'contar', '0'),
      ('Outra família cria lembrete nesta', paulo, format('select 1 from produto.lembrete_criar(%L, ''x'', now())', f), 'contar', 'bloqueado'),
      ('Outra família registra feira nesta', paulo, format('select 1 from produto.feira_registrar(%L)', f), 'contar', 'bloqueado'),
      ('Outra família salva cartão nesta', paulo, format('select 1 from produto.cartao_salvar(%L, ''x'')', f), 'contar', 'bloqueado'),
      ('Pessoa (filho) chama escritorio_hoje: vem vazio', davi, format('select (produto.escritorio_hoje(%L)::jsonb->>''total_precisa'')::int + jsonb_array_length(produto.escritorio_hoje(%L)::jsonb->''funcionarios'')', silva, silva), 'contar', '0'),
      ('Pessoa lê diário, lembretes, custos e faturas de cartão', davi, 'select (select count(*) from produto.esc_diario) + (select count(*) from produto.esc_lembretes) + (select count(*) from produto.cartao_custos) + (select count(*) from produto.cartao_faturas)', 'contar', '0'),
      ('Pessoa lê feiras e estoque', davi, 'select (select count(*) from produto.feiras) + (select count(*) from produto.estoque_itens) + (select count(*) from produto.estoque_contagens)', 'contar', '0'),
      ('Equipe lê lembretes, custos e faturas de cartão', ue::text, 'select (select count(*) from produto.esc_lembretes) + (select count(*) from produto.cartao_custos) + (select count(*) from produto.cartao_faturas)', 'contar', '0'),
      ('Equipe lê linha do diário que não é da Casa (dinheiro)', ue::text, 'select count(*) from produto.esc_diario where not casa', 'contar', '0'),
      ('Equipe lê linha do diário com R$', ue::text, $q$select count(*) from produto.esc_diario where pergunta ~ 'R\$' or resposta ~ 'R\$' or dados ? 'valor'$q$, 'contar', '0'),
      ('Equipe grava no diário resposta de dinheiro direto na tabela', ue::text, format('insert into produto.esc_diario (familia_id, funcionario, assunto, ref, pergunta, resposta, respondido_por, casa) values (%L, ''analista_cartao'', ''fatura'', ''x'', ''x'', ''x'', %L, true)', f, ue), 'linhas', 'bloqueado'),
      ('Equipe grava no diário com valor escondido', ue::text, format('insert into produto.esc_diario (familia_id, funcionario, assunto, ref, pergunta, resposta, dados, respondido_por, casa) values (%L, ''comprador'', ''gas'', ''x'', ''x'', ''x'', ''{"valor": 1}'', %L, true)', f, ue), 'linhas', 'bloqueado'),
      ('Equipe chama escritorio_hoje de verdade: nenhum R$ nem valor', ue::text, format($q$select (produto.escritorio_hoje(%L)::text ~* 'R\$|"valor"|"limite"|salario|"saldo"')::int$q$, f), 'contar', '0'),
      ('Equipe pede o relatório: nenhum R$', ue::text, format($q$select (produto.escritorio_relatorio(%L)::text ~* 'R\$|"valor"')::int$q$, f), 'contar', '0'),
      ('Equipe cria lembrete', ue::text, format('select 1 from produto.lembrete_criar(%L, ''x'', now())', f), 'contar', 'bloqueado'),
      ('Equipe salva cartão', ue::text, format('select 1 from produto.cartao_salvar(%L, ''x'')', f), 'contar', 'bloqueado'),
      ('Equipe informa fatura', ue::text, format('select 1 from produto.fatura_informar(%L, %L, ''2026-11'', 10)', f, cn), 'contar', 'bloqueado'),
      ('Equipe registra feira com valor: o valor é ignorado (nenhum lançamento novo)', ue::text, format('select (select count(*) from produto.lancamentos) + (produto.feira_registrar(%L, null, 77)::jsonb->''feira'' ? ''valor'')::int', f), 'contar', '0'),
      ('CONTROLE equipe vê as feiras (sem valor) e os itens da casa', ue::text, 'select (select count(*) from produto.feiras) + (select count(*) from produto.estoque_itens)', 'contar', '6'),
      ('CONTROLE casal vê o diário inteiro da família', u::text, 'select (count(*) > 20)::int from produto.esc_diario', 'contar', '1')
    ) as t(caso, uid, q, modo, esperado) loop
      res := res || array[c.caso, c.esperado, produto._tentativa(c.uid, 'authenticated', c.q, c.modo)];
    end loop;
    res := res || array['anon chama escritorio_hoje', 'bloqueado', produto._tentativa(null, 'anon', format('select 1 from produto.escritorio_hoje(%L)', silva), 'contar')];
    res := res || array['anon lê feiras', 'bloqueado', produto._tentativa(null, 'anon', 'select count(*) from produto.feiras', 'contar')];

    raise exception using errcode = 'P9999', message = 'desfazer';
  exception
    when sqlstate 'P9999' then null;
    when others then res := res || array['o teste do Escritório quebrou no meio', 'sem erro', sqlerrm];
  end;
  for i in 1..coalesce(array_length(res, 1), 0) / 3 loop
    caso := res[i * 3 - 2]; esperado := res[i * 3 - 1]; obtido := res[i * 3]; ok := esperado is not distinct from obtido;
    return next;
  end loop;
end $$;
revoke execute on function produto.teste_escritorio() from public, anon, authenticated;
revoke execute on function produto._t(text), produto._tem(text, text[]), produto._esc_achar(jsonb, text) from public, anon;
grant execute on function produto._tem(text, text[]), produto._esc_achar(jsonb, text) to authenticated;
;