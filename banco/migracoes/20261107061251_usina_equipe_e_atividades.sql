alter table public.usina_dados drop constraint if exists usina_dados_pasta_check;
alter table public.usina_dados add constraint usina_dados_pasta_check check (pasta in ('clientes','faturas','geracao','config','turnos','equipe','atividades'));

create or replace function public.usina_registrar_atividade(p_agente text, p_titulo text, p_status text default 'feito', p_numero text default null, p_detalhe text default null, p_fonte text default null)
returns text language sql security definer set search_path=public as $$
  insert into usina_dados(pasta,item,dados)
  values ('atividades', p_agente||'-'||to_char(now() at time zone 'America/Recife','YYYYMMDD-HH24MISS-MS'),
    jsonb_strip_nulls(jsonb_build_object('agente',p_agente,'titulo',p_titulo,'status',p_status,'numero',p_numero,'detalhe',p_detalhe,'fonte',p_fonte,
      'quando',to_char(now() at time zone 'America/Recife','YYYY-MM-DD"T"HH24:MI'))))
  returning item;
$$;

create or replace function public.usina_painel() returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'clientes', coalesce((select jsonb_agg(dados || jsonb_build_object('id',item) order by item) from usina_dados where pasta='clientes'),'[]'::jsonb),
    'faturas',  coalesce((select jsonb_object_agg(item, dados) from usina_dados where pasta='faturas'),'{}'::jsonb),
    'geracao',  coalesce((select jsonb_object_agg(item, dados->'kwh') from usina_dados where pasta='geracao'),'{}'::jsonb),
    'config',   (select dados from usina_dados where pasta='config' and item='usina'),
    'equipe',   coalesce((select jsonb_agg(dados || jsonb_build_object('id',item) order by (dados->>'ordem')::int) from usina_dados where pasta='equipe'),'[]'::jsonb),
    'atividades', coalesce((select jsonb_agg(x order by x->>'quando' desc) from (select dados || jsonb_build_object('id',item) x from usina_dados where pasta='atividades' order by atualizado_em desc limit 60) t),'[]'::jsonb),
    'atualizado_em', (select max(atualizado_em) from usina_dados)
  );
$$;
revoke execute on function public.usina_registrar_atividade(text,text,text,text,text,text), public.usina_painel() from public, anon, authenticated;;