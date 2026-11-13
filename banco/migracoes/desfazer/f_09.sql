-- Desfaz f_09: volta o turno da noite como era (copiado do banco em 13/11/26) e apaga os 2 testes da fase final.
CREATE OR REPLACE FUNCTION produto.rodar_testes_noturnos()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare rid uuid := gen_random_uuid(); n_falha int; quebrou text; n_conta int; n_conta_ruim int; tc record;
begin
  begin
    n_conta := 0; n_conta_ruim := 0;
    for tc in select t.caso, t.ok from produto.teste_conta() t loop
      n_conta := n_conta + 1;
      if not tc.ok then
        n_conta_ruim := n_conta_ruim + 1;
        insert into produto.teste_resultados (rodada, teste, caso, ok) values (rid, 'teste_conta', tc.caso, false);
      end if;
    end loop;
    insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe)
    values (rid, 'teste_conta', 'resumo das contas de todas as famílias', true, n_conta || ' casos conferidos, ' || n_conta_ruim || ' com erro');
    insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe) select rid, 'teste_contas_casos', t.caso, t.ok, 'esperado ' || coalesce(t.esperado,'') || ', obtido ' || coalesce(t.obtido,'') from produto.teste_contas_casos() t;
    insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe) select rid, 'teste_vazamento', t.caso, t.ok, 'esperado ' || coalesce(t.esperado,'') || ', obtido ' || coalesce(t.obtido,'') from produto.teste_vazamento() t;
    insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe) select rid, 'teste_guardado', t.caso, t.ok, 'esperado ' || coalesce(t.esperado,'') || ', obtido ' || coalesce(t.obtido,'') from produto.teste_guardado() t;
    insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe) select rid, 'teste_escritorio', t.caso, t.ok, 'esperado ' || coalesce(t.esperado,'') || ', obtido ' || left(coalesce(t.obtido,''), 300) from produto.teste_escritorio() t;
  exception when others then quebrou := sqlerrm;
  end;
  if quebrou is not null then
    insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe) values (rid, 'turno', 'precisa de você', false, 'o turno de teste quebrou: ' || quebrou);
    return 'precisa de você: ' || quebrou;
  end if;
  select count(*) into n_falha from produto.teste_resultados r where r.rodada = rid and not r.ok;
  insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe)
  values (rid, 'turno', case when n_falha = 0 then 'tudo certo' else 'precisa de você' end, n_falha = 0,
          n_falha || ' caso(s) falharam de ' || (select count(*) from produto.teste_resultados r where r.rodada = rid));
  return case when n_falha = 0 then 'tudo certo' else 'precisa de você: ' || n_falha || ' caso(s) falharam' end;
end $function$;
drop function if exists produto.teste_futuro_ir();
drop function if exists produto.teste_tranca_f();
