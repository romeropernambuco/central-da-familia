alter table public.usina_dados drop constraint if exists usina_dados_pasta_check;
alter table public.usina_dados add constraint usina_dados_pasta_check check (pasta in ('clientes','faturas','geracao','config','turnos','equipe','atividades','contas','pagamentos','chamados','diario','adesoes','cenarios'));
create or replace function public.usina_painel() returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'clientes', coalesce((select jsonb_agg(dados || jsonb_build_object('id',item) order by item) from usina_dados where pasta='clientes'),'[]'::jsonb),
    'faturas',  coalesce((select jsonb_object_agg(item, dados) from usina_dados where pasta='faturas'),'{}'::jsonb),
    'geracao',  coalesce((select jsonb_object_agg(item, dados->'kwh') from usina_dados where pasta='geracao'),'{}'::jsonb),
    'config',   (select dados from usina_dados where pasta='config' and item='usina'),
    'equipe',   coalesce((select jsonb_agg(dados || jsonb_build_object('id',item) order by (dados->>'ordem')::int) from usina_dados where pasta='equipe'),'[]'::jsonb),
    'atividades', coalesce((select jsonb_agg(x order by x->>'quando' desc) from (select dados || jsonb_build_object('id',item) x from usina_dados where pasta='atividades' order by atualizado_em desc limit 60) t),'[]'::jsonb),
    'contas',   coalesce((select jsonb_object_agg(item, dados) from usina_dados where pasta='contas'),'{}'::jsonb),
    'chamados', coalesce((select jsonb_object_agg(item, dados) from usina_dados where pasta='chamados'),'{}'::jsonb),
    'adesoes',  coalesce((select jsonb_object_agg(item, dados) from usina_dados where pasta='adesoes'),'{}'::jsonb),
    'diario',   coalesce((select jsonb_object_agg(item, dados) from (select item, dados from usina_dados where pasta='diario' order by item desc limit 400) d),'{}'::jsonb),
    'pagamentos', coalesce((select jsonb_agg(x order by x->>'pagoEm' desc) from (select dados || jsonb_build_object('id',item) x from usina_dados where pasta='pagamentos' order by atualizado_em desc limit 100) t),'[]'::jsonb),
    'cenarios', coalesce((select jsonb_object_agg(item, dados) from usina_dados where pasta='cenarios'),'{}'::jsonb),
    'atualizado_em', (select max(atualizado_em) from usina_dados)
  );
$$;
revoke execute on function public.usina_painel() from public, anon, authenticated;
create or replace function public.usina_apagar(p_pasta text, p_item text) returns int language sql security definer set search_path=public as $$
  with d as (delete from usina_dados where pasta=p_pasta and item=p_item and pasta in ('chamados','adesoes','contas','cenarios') returning 1) select count(*)::int from d;
$$;
revoke execute on function public.usina_apagar(text,text) from public, anon, authenticated;;