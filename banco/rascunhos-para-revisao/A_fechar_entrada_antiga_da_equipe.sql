-- ====================================================================================
-- A · Fechar a entrada antiga da equipe (os 4 numeros sem o link do convite)
-- RASCUNHO PARA REVISAO. NAO FOI APLICADO EM NENHUM BANCO.
-- ====================================================================================
-- Problema: produto.entrar_equipe(codigo) ainda aceita SO os 4 numeros, sem o link do convite.
-- Qualquer pessoa logada pode tentar os 10.000 codigos (limite de 5 erros por pessoa por dia,
-- 30 por hora no geral) e entrar numa familia como Assessor da Casa. O app novo ja usa
-- produto.entrar_equipe_convite(convite, codigo) (link + 4 numeros), entao a antiga pode morrer.
--
-- Este arquivo faz o mesmo que o BLOCO 6 de banco/sql/RODAR_NO_SUPABASE.sql, e MAIS UMA COISA que o
-- bloco 6 nao faz: ajusta o teste do banco que exige que a entrada antiga continue funcionando
-- ("CONTROLE entrada antiga (so os 4 numeros) continua", dentro de produto._teste_revisao()).
-- Sem esse ajuste, produto.teste_vazamento() passaria a devolver 1 linha falhando e voce acharia
-- que vazou algo. NAO rode o bloco 6 E este arquivo: rode so este (ele ja inclui o bloco 6).
--
-- QUANDO RODAR: so DEPOIS de o app novo estar publicado (o app antigo da equipe usava a entrada antiga).
-- Pode ser antes ou depois da serie f_01..f_15 (o ajuste do teste e feito no texto vivo da funcao,
-- como a f_02 ja faz, entao nao desfaz o ajuste da f_02).
--
-- COMO CONFERIR: rode a consulta de teste (bloco 8). Tem que voltar 0 linhas.
-- COMO DESFAZER: A_desfazer.sql (mesma pasta).
-- ====================================================================================

-- 1) A funcao antiga passa a recusar sempre (mesma permissao de antes: anon continua bloqueado).
create or replace function produto.entrar_equipe(codigo text)
returns json language sql volatile security definer set search_path = '' as
$$ select json_build_object('ok', false, 'motivo', 'Abra o link do convite que te mandaram e digite os 4 numeros.', 'restam', 0) $$;

-- 2) O teste de controle agora exige o contrario: a entrada antiga esta DESLIGADA.
do $ajuste$
declare
  v_velho constant text := $q$caso := 'CONTROLE entrada antiga (so os 4 numeros) continua'; esperado := 'true'; obtido := r_antigo;$q$;
  v_certo constant text := $q$caso := 'Entrada antiga (so os 4 numeros) esta DESLIGADA e recusa sempre'; esperado := 'false'; obtido := r_antigo;$q$;
  v_def text;
begin
  v_def := pg_get_functiondef('produto._teste_revisao()'::regprocedure);
  if position(v_velho in v_def) = 0 then
    if position(v_certo in v_def) > 0 then
      raise notice 'o teste ja estava ajustado: nada a fazer';
      return;
    end if;
    raise exception 'trecho do teste nao encontrado em produto._teste_revisao(): nada foi alterado. Mande esta mensagem.';
  end if;
  execute replace(v_def, v_velho, v_certo);
  if position(v_certo in pg_get_functiondef('produto._teste_revisao()'::regprocedure)) = 0 then
    raise exception 'o ajuste do teste nao pegou: desfaca e mande esta mensagem.';
  end if;
end
$ajuste$;

-- 3) Conferencia rapida (so le): a funcao antiga deve devolver ok = false.
--    Rode logado como um usuario qualquer no app, ou apenas confie na consulta de teste (bloco 8).
-- select produto.entrar_equipe('1234');   -- deve devolver {"ok": false, "motivo": "Abra o link ...", "restam": 0}
