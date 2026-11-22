-- Desfaz 20261122081437_produto_rua_e_aluguel_em_tabelas.sql. APAGA os negócios e o caderno do aluguel gravados nas
-- tabelas: baixe a cópia de segurança antes. O app volta a precisar da versão que gravava no JSON de config_familia.
drop function if exists produto.negocios_da_familia(uuid);
drop function if exists produto.negocio_gravar(uuid, json, uuid[]);
drop function if exists produto.negocio_apagar(uuid, uuid);
drop function if exists produto.negocio_volta_guardar(uuid, uuid, json, uuid);
drop function if exists produto.aluguel_da_familia(uuid);
drop function if exists produto.aluguel_gravar(uuid, uuid, json, text[], uuid[]);
drop table if exists produto.negocio_movimentos;
drop table if exists produto.negocios;
drop table if exists produto.aluguel_recebimentos;
drop table if exists produto.aluguel_despesas;
drop table if exists produto.aluguel_imovel;
-- exportar_familia: tirar as 5 chaves novas com o mesmo replace ao contrário (ver a migração).
