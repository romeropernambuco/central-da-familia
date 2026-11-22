-- Portas fechadas antes de qualquer cliente (22/11/2026, com o "pode" do dono). Ver docs/ANALISE-DO-TIME.md, item 1.
-- 1) Apagar a família só pela função produto.apagar_familia (confere o papel e o nome escrito igualzinho).
--    Antes, qualquer adulto do casal apagava a família inteira com um DELETE direto na tabela, sem a confirmação.
--    A função não existia no banco: o botão "apagar família" do app falhava. Agora ela existe e é o único caminho.
-- 2) A entrada antiga da equipe (só os 4 números, valendo para todas as famílias) passa a recusar sempre.
--    O app só usa produto.entrar_equipe_convite (link do convite + 4 números). É o rascunho A + bloco 6.
-- Desfazer: desfazer/20261122080724_produto_portas_fechadas.sql

-- 1) apagar a família
create or replace function produto.apagar_familia(familia uuid, confirmacao text)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare f uuid := apagar_familia.familia; v_nome text; n int;
begin
  if (select auth.uid()) is null or produto.meu_papel(f) is distinct from 'casal' then
    raise exception 'so o casal apaga a familia' using errcode = '42501';
  end if;
  select x.nome into v_nome from produto.familias x where x.id = f;
  if v_nome is null then raise exception 'familia nao encontrada' using errcode = '42501'; end if;
  if btrim(coalesce(confirmacao, '')) is distinct from btrim(v_nome) then
    raise exception 'para apagar, escreva o nome da familia exatamente: %', v_nome using errcode = '22023';
  end if;
  delete from produto.familias x where x.id = f;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'nao foi possivel apagar' using errcode = '42501'; end if;
  return json_build_object('apagada', true, 'familia_id', f, 'nome', v_nome);
end $$;
revoke all on function produto.apagar_familia(uuid, text) from public, anon;
grant execute on function produto.apagar_familia(uuid, text) to authenticated;

drop policy if exists familias_apagar on produto.familias;
revoke delete on produto.familias from authenticated;

-- 2) entrada antiga da equipe desligada
create or replace function produto.entrar_equipe(codigo text)
returns json language sql volatile security definer set search_path = '' as
$$ select json_build_object('ok', false, 'motivo', 'Abra o link do convite que te mandaram e digite os 4 numeros.', 'restam', 0) $$;

-- o teste de controle passa a exigir o contrário: a entrada antiga está DESLIGADA
do $ajuste$
declare
  v_velho constant text := $q$caso := 'CONTROLE entrada antiga (so os 4 numeros) continua'; esperado := 'true'; obtido := r_antigo;$q$;
  v_certo constant text := $q$caso := 'Entrada antiga (so os 4 numeros) esta DESLIGADA e recusa sempre'; esperado := 'false'; obtido := r_antigo;$q$;
  v_def text;
begin
  if to_regprocedure('produto._teste_revisao()') is null then
    raise notice 'produto._teste_revisao() nao existe: nada a ajustar';
    return;
  end if;
  v_def := pg_get_functiondef('produto._teste_revisao()'::regprocedure);
  if position(v_velho in v_def) = 0 then
    if position(v_certo in v_def) > 0 then
      raise notice 'o teste ja estava ajustado: nada a fazer';
      return;
    end if;
    raise exception 'trecho do teste nao encontrado em produto._teste_revisao(): nada foi alterado';
  end if;
  execute replace(v_def, v_velho, v_certo);
end
$ajuste$;

-- confere as 2 portas
do $$ begin
  if has_table_privilege('authenticated', 'produto.familias', 'DELETE') then
    raise exception 'authenticated ainda apaga familias direto; nada foi gravado';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'produto' and tablename = 'familias' and cmd = 'DELETE') then
    raise exception 'ainda ha regra de DELETE em familias; nada foi gravado';
  end if;
  if not (select prosecdef from pg_proc where oid = 'produto.apagar_familia(uuid, text)'::regprocedure) then
    raise exception 'apagar_familia sem poder de apagar; nada foi gravado';
  end if;
  if has_function_privilege('anon', 'produto.apagar_familia(uuid, text)', 'execute') then
    raise exception 'anon executa apagar_familia; nada foi gravado';
  end if;
  if (select prosrc from pg_proc where oid = 'produto.entrar_equipe(text)'::regprocedure) not like '%''ok'', false%' then
    raise exception 'entrada antiga da equipe continua aberta; nada foi gravado';
  end if;
end $$;

-- portão: todos os testes do banco continuam 100% ok
do $$
declare t text; n int;
begin
  foreach t in array array['teste_vazamento','teste_contas_casos','teste_guardado','teste_escritorio','teste_tranca_f','teste_futuro_ir'] loop
    if to_regprocedure('produto.' || t || '()') is not null then
      execute format('select count(*) from produto.%I() where not ok', t) into n;
      if n > 0 then raise exception 'portas_fechadas: % tem % caso(s) falhando; nada foi gravado', t, n; end if;
    end if;
  end loop;
end $$;
