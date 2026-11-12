CREATE OR REPLACE FUNCTION public.usina_registrar_pagamento(p_fatura text, p_asaas text, p_valor numeric, p_pago_em date, p_forma text, p_evento text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare f jsonb; ja jsonb; v_item text := coalesce(nullif(p_asaas,''), nullif(p_fatura,''));
begin
  if v_item is null then return jsonb_build_object('ok',false,'motivo','sem id'); end if;
  select dados into ja from usina_dados where pasta='pagamentos' and item=v_item;
  select dados into f from usina_dados where pasta='faturas' and item=p_fatura;
  if f is null then
    insert into usina_dados(pasta,item,dados) values ('pagamentos', v_item, jsonb_build_object('faturaId',p_fatura,'asaasId',p_asaas,'valorPago',p_valor,'pagoEm',p_pago_em,'forma',p_forma,'evento',p_evento,'achou_fatura',false))
    on conflict (pasta,item) do update set dados=excluded.dados, atualizado_em=now();
    return jsonb_build_object('ok',false,'motivo','fatura não encontrada');
  end if;
  update usina_dados set dados = dados || jsonb_strip_nulls(jsonb_build_object('pagoEm',p_pago_em,'valorPago',p_valor,'formaPagamento',p_forma,'asaasId',p_asaas,'baixaAutomatica',true)), atualizado_em=now()
   where pasta='faturas' and item=p_fatura;
  insert into usina_dados(pasta,item,dados) values ('pagamentos', v_item, jsonb_build_object('faturaId',p_fatura,'asaasId',p_asaas,'valorPago',p_valor,'pagoEm',p_pago_em,'forma',p_forma,'evento',p_evento,'achou_fatura',true))
  on conflict (pasta,item) do update set dados=excluded.dados, atualizado_em=now();
  -- Idempotente: o Asaas pode mandar o mesmo pagamento mais de uma vez (CONFIRMED e depois RECEIVED, ou reenvio).
  if ja is null or coalesce((ja->>'achou_fatura')::boolean,false) is false then
    perform usina_registrar_atividade('cobrador','Pagamento recebido: '||coalesce(f->>'nome',p_fatura),'feito','R$ '||replace(to_char(p_valor,'FM999G990D00'),',','.'),'Baixa automática pelo Asaas ('||coalesce(p_forma,'')||').','Asaas');
    return jsonb_build_object('ok',true,'repetido',false);
  end if;
  return jsonb_build_object('ok',true,'repetido',true);
end $function$;
revoke execute on function public.usina_registrar_pagamento(text,text,numeric,date,text,text) from public, anon, authenticated;
grant execute on function public.usina_registrar_pagamento(text,text,numeric,date,text,text) to service_role;;