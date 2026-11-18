-- ====================================================================================
-- A · DESFAZER: reabre a entrada antiga da equipe (os 4 numeros sem o link). Use so se precisar.
-- RASCUNHO PARA REVISAO. NAO FOI APLICADO EM NENHUM BANCO.
-- ====================================================================================
create or replace function produto.entrar_equipe(codigo text)
returns json language sql volatile security definer set search_path = '' as
$$ select produto._equipe_entrar(codigo, null) $$;

do $ajuste$
declare
  v_certo constant text := $q$caso := 'Entrada antiga (so os 4 numeros) esta DESLIGADA e recusa sempre'; esperado := 'false'; obtido := r_antigo;$q$;
  v_velho constant text := $q$caso := 'CONTROLE entrada antiga (so os 4 numeros) continua'; esperado := 'true'; obtido := r_antigo;$q$;
  v_def text;
begin
  v_def := pg_get_functiondef('produto._teste_revisao()'::regprocedure);
  if position(v_certo in v_def) = 0 then
    raise notice 'o teste ja estava no formato original: nada a fazer';
    return;
  end if;
  execute replace(v_def, v_certo, v_velho);
end
$ajuste$;
