-- Desfaz 20261122082534_produto_avisos_no_celular.sql: para os avisos no celular. Apaga as inscrições dos aparelhos
-- e as chaves de envio (quem ligar de novo depois precisa ligar outra vez no app).
select cron.unschedule('produto_avisos_celular');
drop function if exists produto._avisos_do_dia(date);
drop function if exists produto._celular_saiu(text);
drop function if exists produto._celular_enviado(text);
drop function if exists produto._servidor_segredo(text);
drop function if exists produto._servidor_guardar(text, text);
drop function if exists produto.celular_chave_publica();
drop function if exists produto.celular_ligar(uuid, json);
drop function if exists produto.celular_desligar(text);
drop table if exists produto.celulares;
drop table if exists produto.servidor_segredos;
-- A função do servidor avisos-celular pode ser apagada no painel do Supabase (Edge Functions).
