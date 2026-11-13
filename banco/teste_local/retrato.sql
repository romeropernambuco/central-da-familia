-- Retrato da estrutura dos schemas produto e public (pra provar que o desfazer volta tudo como era).
-- Uma linha por objeto; listas de permissão em ordem fixa.
with acl(oid, txt) as (
  select c.oid, coalesce((select string_agg(x, ',' order by x) from unnest(c.relacl::text[]) x), '') from pg_class c
)
select 'tabela ' || n.nspname || '.' || c.relname || ' ' || c.relkind::text || ' rls=' || c.relrowsecurity || ' acl=' || a.txt
  from pg_class c join pg_namespace n on n.oid = c.relnamespace join acl a on a.oid = c.oid
 where n.nspname in ('produto', 'public') and c.relkind in ('r', 'v', 'S', 'i')
union all
select 'coluna ' || table_schema || '.' || table_name || '.' || column_name || ' ' || data_type || ' ' || coalesce(column_default, '') || ' ' || is_nullable
  from information_schema.columns where table_schema in ('produto', 'public')
union all
select 'priv_coluna ' || table_schema || '.' || table_name || '.' || column_name || ' ' || grantee || ' ' || privilege_type
  from information_schema.column_privileges where table_schema in ('produto', 'public')
union all
select 'restricao ' || n.nspname || '.' || r.relname || '.' || co.conname || ' ' || pg_get_constraintdef(co.oid)
  from pg_constraint co join pg_class r on r.oid = co.conrelid join pg_namespace n on n.oid = r.relnamespace
 where n.nspname in ('produto', 'public')
union all
select 'politica ' || schemaname || '.' || tablename || '.' || policyname || ' ' || cmd || ' ' || roles::text || ' ' || coalesce(qual, '') || ' | ' || coalesce(with_check, '')
  from pg_policies where schemaname in ('produto', 'public')
union all
select 'funcao ' || n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') ' || pg_get_function_result(p.oid)
       || ' def=' || p.prosecdef || ' cfg=' || coalesce(p.proconfig::text, '') || ' vol=' || p.provolatile::text || ' lang=' || l.lanname
       || ' acl=' || coalesce((select string_agg(x, ',' order by x) from unnest(p.proacl::text[]) x), '')
       || ' args=' || pg_get_function_arguments(p.oid) || ' md5=' || md5(p.prosrc)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_language l on l.oid = p.prolang
 where n.nspname in ('produto', 'public')
union all
select 'gatilho ' || c.relname || '.' || t.tgname || ' ' || pg_get_triggerdef(t.oid)
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
 where not t.tgisinternal and n.nspname in ('produto', 'public', 'auth')
order by 1;
