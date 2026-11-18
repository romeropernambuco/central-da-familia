-- ====================================================================================
-- B · DESFAZER: volta ao desenho da f_04 (pagador gravado em um passo separado pelo app)
-- RASCUNHO PARA REVISAO. NAO FOI APLICADO EM NENHUM BANCO.
-- Atencao: depois deste arquivo o app NAO pode mais enviar `pago_por` dentro de lancar_com_chave.
-- ====================================================================================
drop function produto.lancar_com_chave(uuid,uuid,numeric,uuid,date,text,uuid,numeric,smallint,uuid);

-- miolo de 9 argumentos: texto original da f_04 (substitui o atalho)
CREATE OR REPLACE FUNCTION produto._lancar(familia uuid, envelope uuid, valor numeric, data date, descricao text, cartao uuid, segundos numeric, chave uuid, parcelas smallint)
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
      insert into produto.lancamentos (id, familia_id, envelope_id, cartao_id, valor, data, descricao, chave_cliente, parcelas)
      values (v_id, _lancar.familia, _lancar.envelope, _lancar.cartao, v_valor, v_data, v_desc, _lancar.chave, v_parc);
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
revoke all on function produto._lancar(uuid,uuid,numeric,date,text,uuid,numeric,uuid,smallint) from public, anon;
grant execute on function produto._lancar(uuid,uuid,numeric,date,text,uuid,numeric,uuid,smallint) to authenticated;

drop function produto._lancar(uuid,uuid,numeric,date,text,uuid,numeric,uuid,smallint,uuid);

create function produto.lancar_com_chave(familia uuid, envelope uuid, valor numeric, chave uuid, data date default null,
                                         descricao text default null, cartao uuid default null, segundos numeric default null,
                                         parcelas smallint default 1)
returns json language plpgsql set search_path = '' as $$
begin
  if chave is null then raise exception 'falta a chave do toque' using errcode = '22023'; end if;
  return produto._lancar(familia, envelope, valor, data, descricao, cartao, segundos, chave, parcelas);
end $$;
revoke all on function produto.lancar_com_chave(uuid,uuid,numeric,uuid,date,text,uuid,numeric,smallint) from public, anon;
grant execute on function produto.lancar_com_chave(uuid,uuid,numeric,uuid,date,text,uuid,numeric,smallint) to authenticated;
