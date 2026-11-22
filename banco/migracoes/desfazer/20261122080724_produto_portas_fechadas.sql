-- Desfaz 20261122130000_produto_portas_fechadas.sql. Só use se algo quebrou: reabre as 2 portas.
create policy familias_apagar on produto.familias for delete to authenticated
  using (id in (select produto.familias_com_papel('casal')));
grant delete on produto.familias to authenticated;
-- A entrada antiga da equipe e o ajuste do teste: use banco/rascunhos-para-revisao/A_desfazer.sql.
-- A função apagar_familia pode ficar: ela só funciona para o casal e com o nome escrito igualzinho.
