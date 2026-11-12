CREATE OR REPLACE FUNCTION public.usina_apagar_exemplos()
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with d as (delete from usina_dados where pasta in ('clientes','faturas','diario','pagamentos') and (dados->>'exemplo')::boolean is true returning 1) select count(*)::int from d;
$function$;
revoke execute on function public.usina_apagar_exemplos() from public, anon, authenticated;
grant execute on function public.usina_apagar_exemplos() to service_role;;