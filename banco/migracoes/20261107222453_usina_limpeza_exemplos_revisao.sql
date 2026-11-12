create or replace function public.usina_apagar_exemplos() returns int language sql security definer set search_path=public as $$
  with d as (delete from usina_dados where pasta in ('clientes','faturas','diario','pagamentos','atividades','contas','chamados','adesoes') and (dados->>'exemplo')::boolean is true returning 1) select count(*)::int from d;
$$;
revoke execute on function public.usina_apagar_exemplos() from public, anon, authenticated;
update usina_dados set dados = dados || '{"exemplo":true}'::jsonb where pasta='atividades';
update usina_dados set dados = dados || '{"numero":"R$ 1.900,00"}'::jsonb where pasta='atividades' and item='cobrador-20261107-141718-097';
update usina_dados set dados = dados || '{"exemplo":true}'::jsonb where pasta='config' and item='usina';;