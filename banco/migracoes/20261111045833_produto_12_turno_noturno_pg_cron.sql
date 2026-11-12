create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
-- 03:17 em Recife = 06:17 UTC, todo dia
select cron.schedule('produto_testes_noturnos', '17 6 * * *', $$select produto.rodar_testes_noturnos()$$);
;