
-- Dados de exemplo da Familia Silva (familia de exemplo): Guardado, lembrete, cartao com fatura perto de vencer, feira e estoque
insert into produto.pat_aplicacoes (id, familia_id, titular_membro, nome, banco, tipo, pct_cdi, isento_ir, liquidez, vence_em, criado_por, criado_em) values
  ('aa000000-0000-4e0e-8000-000000000001', 'f0000000-0000-4e0e-8000-000000000001', 'd0000000-0000-4e0e-8000-000000000011', 'Caixinha da Ana', 'Nubank', 'caixinha', 100, false, 'diaria', null, 'a0000000-0000-4e0e-8000-0000000000a1', '2026-10-01 12:00+00'),
  ('aa000000-0000-4e0e-8000-000000000002', 'f0000000-0000-4e0e-8000-000000000001', 'd0000000-0000-4e0e-8000-000000000012', 'CDB do Bruno', 'Banco Inter', 'cdb', 110, false, 'vencimento', '2026-11-25', 'a0000000-0000-4e0e-8000-0000000000b1', '2026-10-01 12:01+00');
insert into produto.pat_movimentos (familia_id, aplicacao_id, data, tipo, valor, chave, autor) values
  ('f0000000-0000-4e0e-8000-000000000001', 'aa000000-0000-4e0e-8000-000000000001', '2026-10-01', 'aporte', 8000, 'ab000000-0000-4e0e-8000-000000000001', 'a0000000-0000-4e0e-8000-0000000000a1'),
  ('f0000000-0000-4e0e-8000-000000000001', 'aa000000-0000-4e0e-8000-000000000001', '2026-10-20', 'aporte', 1000, 'ab000000-0000-4e0e-8000-000000000002', 'a0000000-0000-4e0e-8000-0000000000a1'),
  ('f0000000-0000-4e0e-8000-000000000001', 'aa000000-0000-4e0e-8000-000000000001', '2026-11-05', 'aporte', 1500, 'ab000000-0000-4e0e-8000-000000000003', 'a0000000-0000-4e0e-8000-0000000000a1'),
  ('f0000000-0000-4e0e-8000-000000000001', 'aa000000-0000-4e0e-8000-000000000001', '2026-11-09', 'resgate', 300, 'ab000000-0000-4e0e-8000-000000000004', 'a0000000-0000-4e0e-8000-0000000000a1'),
  ('f0000000-0000-4e0e-8000-000000000001', 'aa000000-0000-4e0e-8000-000000000002', '2026-05-11', 'aporte', 20000, 'ab000000-0000-4e0e-8000-000000000005', 'a0000000-0000-4e0e-8000-0000000000b1');

insert into produto.esc_lembretes (id, familia_id, criado_por, titulo, detalhe, quando, repetir, para) values
  ('ac000000-0000-4e0e-8000-000000000001', 'f0000000-0000-4e0e-8000-000000000001', 'a0000000-0000-4e0e-8000-0000000000a1', 'Ligar pro contador', 'Perguntar do imposto de renda do ano que vem.', '2026-11-12 09:00-03', 'nunca', 'casal'),
  ('ac000000-0000-4e0e-8000-000000000002', 'f0000000-0000-4e0e-8000-000000000001', 'a0000000-0000-4e0e-8000-0000000000a1', 'Renovar o seguro do carro', null, '2026-11-28 09:00-03', 'ano', 'casal');

update produto.cartoes set banco = 'Itaú', titular_membro = 'd0000000-0000-4e0e-8000-000000000011' where id = 'c0000000-0000-4e0e-8000-000000000011';
insert into produto.cartoes (id, familia_id, nome, banco, titular_membro, dia_fechamento, dia_vencimento, final4, ativo, criado_em) values
  ('c0000000-0000-4e0e-8000-000000000012', 'f0000000-0000-4e0e-8000-000000000001', 'Nubank do Bruno', 'Nubank', 'd0000000-0000-4e0e-8000-000000000012', 8, 15, '4321', true, now());
insert into produto.cartao_custos (familia_id, cartao_id, limite, taxa_valor, taxa_periodo, taxa_mes, taxa_isenta_acima) values
  ('f0000000-0000-4e0e-8000-000000000001', 'c0000000-0000-4e0e-8000-000000000011', 12000, null, null, null, null),
  ('f0000000-0000-4e0e-8000-000000000001', 'c0000000-0000-4e0e-8000-000000000012', 8000, 480, 'ano', 12, null);
insert into produto.lancamentos (id, familia_id, envelope_id, cartao_id, valor, data, descricao, autor) values
  ('ad000000-0000-4e0e-8000-000000000001', 'f0000000-0000-4e0e-8000-000000000001', 'e0000000-0000-4e0e-8000-000000000012', 'c0000000-0000-4e0e-8000-000000000012', 890.00, '2026-10-20', 'Pneus do carro', 'a0000000-0000-4e0e-8000-0000000000b1');
insert into produto.cartao_faturas (familia_id, cartao_id, mes, valor_banco) values
  ('f0000000-0000-4e0e-8000-000000000001', 'c0000000-0000-4e0e-8000-000000000012', '2026-11', 1062.00);

insert into produto.feiras (id, familia_id, semana, data, lancamento_id, loja, feita_por)
select 'ae000000-0000-4e0e-8000-000000000001', l.familia_id, '2026-11-09', l.data, l.id, 'Atacadão', 'a0000000-0000-4e0e-8000-0000000000a1'
  from produto.lancamentos l where l.familia_id = 'f0000000-0000-4e0e-8000-000000000001' and l.envelope_id = 'e0000000-0000-4e0e-8000-000000000011' and l.data = '2026-11-09' and l.apagado_em is null limit 1;
insert into produto.estoque_itens (id, familia_id, nome, categoria) values
  ('af000000-0000-4e0e-8000-000000000001', 'f0000000-0000-4e0e-8000-000000000001', 'Arroz', 'Comida'),
  ('af000000-0000-4e0e-8000-000000000002', 'f0000000-0000-4e0e-8000-000000000001', 'Feijão', 'Comida'),
  ('af000000-0000-4e0e-8000-000000000003', 'f0000000-0000-4e0e-8000-000000000001', 'Café', 'Comida'),
  ('af000000-0000-4e0e-8000-000000000004', 'f0000000-0000-4e0e-8000-000000000001', 'Óleo', 'Comida'),
  ('af000000-0000-4e0e-8000-000000000005', 'f0000000-0000-4e0e-8000-000000000001', 'Detergente', 'Limpeza'),
  ('af000000-0000-4e0e-8000-000000000006', 'f0000000-0000-4e0e-8000-000000000001', 'Sabão em pó', 'Limpeza'),
  ('af000000-0000-4e0e-8000-000000000007', 'f0000000-0000-4e0e-8000-000000000001', 'Papel higiênico', 'Banheiro');
insert into produto.estoque_contagens (familia_id, semana, data, contado_por, itens) values
  ('f0000000-0000-4e0e-8000-000000000001', '2026-11-02', '2026-11-03', 'a0000000-0000-4e0e-8000-0000000000c1',
   '[{"item_id":"af000000-0000-4e0e-8000-000000000001","estado":"tem"},{"item_id":"af000000-0000-4e0e-8000-000000000002","estado":"tem"},{"item_id":"af000000-0000-4e0e-8000-000000000003","estado":"acabou"},{"item_id":"af000000-0000-4e0e-8000-000000000004","estado":"pouco"},{"item_id":"af000000-0000-4e0e-8000-000000000005","estado":"pouco"},{"item_id":"af000000-0000-4e0e-8000-000000000006","estado":"tem"},{"item_id":"af000000-0000-4e0e-8000-000000000007","estado":"tem"}]');
;