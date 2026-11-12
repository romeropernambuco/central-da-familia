alter table public.usina_dados drop constraint if exists usina_dados_pasta_check;
alter table public.usina_dados add constraint usina_dados_pasta_check check (pasta in ('clientes','faturas','geracao','config','turnos','equipe','atividades','contas','pagamentos','chamados','diario','adesoes'));
create index if not exists usina_dados_pasta_idx on public.usina_dados(pasta, atualizado_em desc);

-- pagamento confirmado (usado pelo webhook do Asaas e pelo painel): dá baixa na fatura e registra
create or replace function public.usina_registrar_pagamento(p_fatura text, p_asaas text, p_valor numeric, p_pago_em date, p_forma text, p_evento text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare f jsonb; begin
  select dados into f from usina_dados where pasta='faturas' and item=p_fatura;
  if f is null then
    insert into usina_dados(pasta,item,dados) values ('pagamentos', coalesce(p_asaas,p_fatura), jsonb_build_object('faturaId',p_fatura,'asaasId',p_asaas,'valorPago',p_valor,'pagoEm',p_pago_em,'forma',p_forma,'evento',p_evento,'achou_fatura',false))
    on conflict (pasta,item) do update set dados=excluded.dados, atualizado_em=now();
    return jsonb_build_object('ok',false,'motivo','fatura não encontrada');
  end if;
  update usina_dados set dados = dados || jsonb_strip_nulls(jsonb_build_object('pagoEm',p_pago_em,'valorPago',p_valor,'formaPagamento',p_forma,'asaasId',p_asaas,'baixaAutomatica',true)), atualizado_em=now()
   where pasta='faturas' and item=p_fatura;
  insert into usina_dados(pasta,item,dados) values ('pagamentos', coalesce(p_asaas,p_fatura), jsonb_build_object('faturaId',p_fatura,'asaasId',p_asaas,'valorPago',p_valor,'pagoEm',p_pago_em,'forma',p_forma,'evento',p_evento,'achou_fatura',true))
  on conflict (pasta,item) do update set dados=excluded.dados, atualizado_em=now();
  perform usina_registrar_atividade('cobrador','Pagamento recebido: '||coalesce(f->>'nome',p_fatura),'feito','R$ '||replace(to_char(p_valor,'FM999G990D00'),',','.'),'Baixa automática pelo Asaas ('||coalesce(p_forma,'')||').','Asaas');
  return jsonb_build_object('ok',true);
end $$;

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
    'atualizado_em', (select max(atualizado_em) from usina_dados)
  );
$$;

create or replace function public.usina_apagar(p_pasta text, p_item text) returns int language sql security definer set search_path=public as $$
  with d as (delete from usina_dados where pasta=p_pasta and item=p_item and pasta in ('chamados','adesoes','contas') returning 1) select count(*)::int from d;
$$;
revoke execute on function public.usina_registrar_pagamento(text,text,numeric,date,text,text), public.usina_painel(), public.usina_apagar(text,text) from public, anon, authenticated;;