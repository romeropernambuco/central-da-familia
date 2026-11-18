-- ====================================================================================
-- B · Gravar QUEM PAGOU na mesma transacao do gasto
-- RASCUNHO PARA REVISAO. NAO FOI APLICADO EM NENHUM BANCO.
-- ====================================================================================
-- Problema: hoje o app grava o gasto (produto.lancar_com_chave) e DEPOIS faz um UPDATE separado
-- para gravar o pagador (coluna lancamentos.pago_por, da f_04). Se o 2o passo falha, o gasto fica
-- salvo sem pagador e o app mostra "Gasto salvo, mas o pagador nao foi gravado".
-- Solucao: um 10o argumento opcional `pago_por` em produto.lancar_com_chave. O gasto e o pagador
-- entram juntos ou nenhum dos dois entra.
--
-- COMPATIBILIDADE: quem chama com 9 argumentos continua funcionando (pago_por vale nulo). O app
-- atual (que faz o UPDATE depois) continua funcionando sem mudar nada. Depois de aplicar este
-- arquivo, uma mudanca pequena no app passa a enviar `pago_por` junto (peca ao Codex: so o app).
--
-- REGRAS (decisoes do rascunho, confirme):
--   * `autor` continua sendo quem anotou. O pagador NUNCA e preenchido sozinho.
--   * pagador tem que ser membro ATIVO da mesma familia, casal ou pessoa (nunca equipe).
--   * Assessor da Casa (equipe) nao informa pagador.
--   * pessoa da familia so consegue marcar a si mesma (ela so enxerga a propria linha em membros).
--   * repetir a mesma chave (internet caiu) devolve o gasto que ja existe e NAO mexe no pagador.
--
-- DEPENDE DE: f_04 (colunas e funcoes de lancar). Pode ser antes ou depois da f_09 (teste): rode a
-- consulta de teste (bloco 8) e produto.teste_tranca_f() depois.
-- COMO DESFAZER: B_desfazer.sql (mesma pasta).
-- ====================================================================================

-- 1) miolo com o pagador (10 argumentos)
CREATE OR REPLACE FUNCTION produto._lancar(familia uuid, envelope uuid, valor numeric, data date, descricao text, cartao uuid, segundos numeric, chave uuid, parcelas smallint, pago_por uuid)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare v_id uuid; v_dup uuid; v_data date := coalesce(_lancar.data, produto._hoje()); v_valor numeric := round(_lancar.valor, 2);
        v_desc text := nullif(left(trim(_lancar.descricao), 300), ''); v_papel text;
        v_parc smallint := coalesce(_lancar.parcelas, 1::smallint);
begin
  if (select auth.uid()) is null then raise exception 'precisa entrar no app antes de lancar' using errcode = '42501'; end if;
  if v_valor is null or v_valor <= 0 then raise exception 'o valor tem que ser maior que zero' using errcode = '22023'; end if;
  if v_valor > 1000000 then raise exception 'o valor passou de 1 milhao; confira os numeros' using errcode = '22023'; end if;
  if v_parc < 1 or v_parc > 12 then raise exception 'parcelas de 1 a 12' using errcode = '22023'; end if;
  -- parcelado só no cartão com dia de fechamento e de vencimento (decisão do dono: a parcela cai no mês da fatura)
  if v_parc > 1 and not exists (select 1 from produto.cartoes c where c.id = _lancar.cartao and c.familia_id = _lancar.familia
                                   and c.dia_fechamento is not null and c.dia_vencimento is not null) then
    raise exception 'parcelado so no cartao com dia de fechamento e de vencimento' using errcode = '22023';
  end if;
  if v_data < date '2000-01-01' or v_data > date '2100-12-31' then raise exception 'a data esta fora do calendario do app' using errcode = '22023'; end if;
  v_papel := produto.meu_papel(_lancar.familia);
  -- NOVO: pagador opcional, validado ANTES de gravar (se estiver errado, nada e gravado: o gasto inteiro recusa)
  if _lancar.pago_por is not null then
    if v_papel = 'equipe' then raise exception 'a equipe da casa nao informa quem pagou' using errcode = '42501'; end if;
    -- a leitura de membros segue a tranca de sempre: o casal enxerga todos; a pessoa so enxerga a si mesma
    -- (entao a pessoa so consegue marcar a si como pagadora)
    if not exists (select 1 from produto.membros m where m.id = _lancar.pago_por and m.familia_id = _lancar.familia
                      and m.ativo and m.papel in ('casal', 'pessoa')) then
      raise exception 'o pagador precisa ser um membro ativo da familia' using errcode = '22023';
    end if;
  end if;
  if _lancar.chave is not null then
    -- chave do toque: a mesma chave nunca grava 2 vezes, nem depois de 10 s, nem com a internet caindo no meio
    perform pg_advisory_xact_lock(hashtextextended('lancar:' || _lancar.familia::text || ':' || _lancar.chave::text, 0));
    v_dup := produto._lanc_repetido(_lancar.familia, _lancar.chave, null, null, null, null, null, null);
  else
    perform pg_advisory_xact_lock(hashtextextended('lancar:' || (select auth.uid())::text || ':' || coalesce(_lancar.envelope::text, ''), 0));
    v_dup := produto._lanc_repetido(_lancar.familia, null, _lancar.envelope, v_valor, v_data, v_desc, _lancar.cartao, v_parc);
  end if;
  if v_dup is null then
    v_id := gen_random_uuid();
    begin
      insert into produto.lancamentos (id, familia_id, envelope_id, cartao_id, valor, data, descricao, chave_cliente, parcelas, pago_por)
      values (v_id, _lancar.familia, _lancar.envelope, _lancar.cartao, v_valor, v_data, v_desc, _lancar.chave, v_parc, _lancar.pago_por);
    exception when unique_violation then
      raise exception 'esse lancamento ja foi gravado (mesma chave)' using errcode = '23505';
    end;
    insert into produto.eventos (familia_id, tipo, segundos)
    values (_lancar.familia, 'lancamento', case when _lancar.segundos between 0 and 600 then round(_lancar.segundos, 1) end);
  else
    v_id := v_dup;
  end if;
  return json_build_object(
    'lancamento', case when v_papel = 'equipe'
       then json_build_object('id', v_id, 'envelope_id', _lancar.envelope, 'data', v_data, 'descricao', v_desc)
       else (select to_json(l) from produto.lancamentos l where l.id = v_id) end,
    'repetido', v_dup is not null,
    'resumo', produto._resumo(_lancar.familia, produto._hoje()));
end $function$;
revoke all on function produto._lancar(uuid,uuid,numeric,date,text,uuid,numeric,uuid,smallint,uuid) from public, anon;
grant execute on function produto._lancar(uuid,uuid,numeric,date,text,uuid,numeric,uuid,smallint,uuid) to authenticated;

-- 2) o miolo de 9 argumentos vira so um atalho (pagador nulo): quem usava continua igual
create or replace function produto._lancar(familia uuid, envelope uuid, valor numeric, data date, descricao text, cartao uuid, segundos numeric, chave uuid, parcelas smallint)
returns json language sql set search_path = '' as $$
  select produto._lancar(familia, envelope, valor, data, descricao, cartao, segundos, chave, parcelas, null::uuid)
$$;

-- 3) a porta publica ganha o argumento opcional (troca a assinatura de 9 para 10 argumentos)
drop function produto.lancar_com_chave(uuid,uuid,numeric,uuid,date,text,uuid,numeric,smallint);
create function produto.lancar_com_chave(familia uuid, envelope uuid, valor numeric, chave uuid, data date default null,
                                         descricao text default null, cartao uuid default null, segundos numeric default null,
                                         parcelas smallint default 1, pago_por uuid default null)
returns json language plpgsql set search_path = '' as $$
begin
  if chave is null then raise exception 'falta a chave do toque' using errcode = '22023'; end if;
  return produto._lancar(familia, envelope, valor, data, descricao, cartao, segundos, chave, parcelas, pago_por);
end $$;
revoke all on function produto.lancar_com_chave(uuid,uuid,numeric,uuid,date,text,uuid,numeric,smallint,uuid) from public, anon;
grant execute on function produto.lancar_com_chave(uuid,uuid,numeric,uuid,date,text,uuid,numeric,smallint,uuid) to authenticated;

-- 4) conferencia (so le): deve listar as 2 versoes de _lancar e UMA lancar_com_chave com 10 argumentos
-- select p.proname, pg_get_function_identity_arguments(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'produto' and p.proname in ('_lancar', 'lancar_com_chave') order by 1, 2;
