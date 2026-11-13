-- f_01 (fase final): quem ESCREVE em qual envelope, e qual é o meu membro na família.
-- Regra nova do dono (13/11): o orçamento é da família. O casal LÊ tudo (produto.meus_envelopes() continua igual),
-- mas cada um LANÇA e MEXE só no que é seu e na Casa.
--   casal : o próprio envelope (membros.envelope_id), os da Casa e os envelopes "sem dono" (nenhum membro ligado,
--           ex.: "Lazer do casal"), que são da família e os 2 usam
--   pessoa: só o próprio envelope
--   equipe: só os da Casa (a equipe já lança na Casa pela folha "Anotar compra"; nunca vê R$)
-- Desfazer: banco/migracoes/desfazer/f_01.sql

create or replace function produto.meus_envelopes_escrita() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select e.id from produto.envelopes e
  join produto.membros m on m.familia_id = e.familia_id
  where m.user_id = (select auth.uid()) and m.ativo
    and ( (m.papel = 'casal' and (e.casa or e.id = m.envelope_id
             or not exists (select 1 from produto.membros o where o.familia_id = e.familia_id and o.envelope_id = e.id)))
       or (m.papel = 'pessoa' and e.id = m.envelope_id)
       or (m.papel = 'equipe' and e.casa) )
$$;
comment on function produto.meus_envelopes_escrita() is
  'Envelopes em que quem chama pode lançar e mexer (f_01). Ler continua com meus_envelopes().';

create or replace function produto.meu_membro(p_familia uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select m.id from produto.membros m
  where m.user_id = (select auth.uid()) and m.ativo and m.familia_id = p_familia
$$;
comment on function produto.meu_membro(uuid) is 'id em produto.membros de quem chama nesta família, ou nulo (f_01).';

-- envelopes cujo LIMITE e cadastro quem chama pode ajustar (revisão B2): os de escrita do casal e o da filha.
-- O limite do outro adulto só muda com os 2 aprovando (reajuste F8, etapa E7). Pessoa e equipe: nenhum.
create or replace function produto.envelopes_que_ajusto() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select e.id from produto.envelopes e
  join produto.membros m on m.familia_id = e.familia_id
  where m.user_id = (select auth.uid()) and m.ativo and m.papel = 'casal'
    and (e.casa or e.id = m.envelope_id
         or not exists (select 1 from produto.membros o where o.familia_id = e.familia_id and o.envelope_id = e.id)
         or exists (select 1 from produto.membros p where p.familia_id = e.familia_id and p.envelope_id = e.id and p.papel = 'pessoa'))
$$;

-- cartões em que quem chama pode lançar e mexer (revisão B3 e B4): só o casal, no próprio cartão ou no cartão sem titular
create or replace function produto.meus_cartoes_escrita() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select c.id from produto.cartoes c
  join produto.membros m on m.familia_id = c.familia_id
  where m.user_id = (select auth.uid()) and m.ativo and m.papel = 'casal'
    and (c.titular_membro is null or c.titular_membro = m.id)
$$;

revoke all on function produto.meus_envelopes_escrita(), produto.meu_membro(uuid), produto.envelopes_que_ajusto(), produto.meus_cartoes_escrita() from public, anon;
grant execute on function produto.meus_envelopes_escrita(), produto.meu_membro(uuid), produto.envelopes_que_ajusto(), produto.meus_cartoes_escrita() to authenticated, service_role;

-- portão: todos os testes que existirem no banco têm que continuar 100% ok
do $$
declare t text; n int;
begin
  foreach t in array array['teste_vazamento','teste_contas_casos','teste_guardado','teste_escritorio','teste_tranca_f','teste_futuro_ir'] loop
    if to_regprocedure('produto.' || t || '()') is not null then
      execute format('select count(*) from produto.%I() where not ok', t) into n;
      if n > 0 then raise exception 'f_01: % tem % caso(s) falhando; nada foi gravado', t, n; end if;
    end if;
  end loop;
  select count(*) into n from produto.teste_conta() where not ok;
  if n > 0 then raise exception 'f_01: teste_conta tem % caso(s) falhando; nada foi gravado', n; end if;
end $$;
