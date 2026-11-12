-- Revisao de seguranca (11/11/2026). So o schema produto.
-- 1) Travas de valor: nem pelo app nem direto pela API entra valor negativo, zero, NaN, absurdo ou data fora da faixa.
alter table produto.lancamentos
  add constraint lancamentos_valor_faixa check (valor > 0 and valor <= 1000000) not valid,
  add constraint lancamentos_data_faixa check (data >= date '2000-01-01' and data <= date '2100-12-31') not valid,
  add constraint lancamentos_descricao_tam check (descricao is null or char_length(descricao) <= 300) not valid;
alter table produto.lancamentos validate constraint lancamentos_valor_faixa;
alter table produto.lancamentos validate constraint lancamentos_data_faixa;
alter table produto.lancamentos validate constraint lancamentos_descricao_tam;

alter table produto.envelopes
  add constraint envelopes_limite_teto check (limite_mes <= 99999999 and colchao <= 99999999) not valid,
  add constraint envelopes_nome_tam check (char_length(nome) between 1 and 60) not valid;
alter table produto.envelopes validate constraint envelopes_limite_teto;
alter table produto.envelopes validate constraint envelopes_nome_tam;

alter table produto.limites_mes add constraint limites_mes_valor_teto check (valor <= 99999999) not valid;
alter table produto.limites_mes validate constraint limites_mes_valor_teto;

alter table produto.eventos
  add constraint eventos_tipo_tam check (char_length(tipo) between 1 and 40) not valid,
  add constraint eventos_segundos_faixa check (segundos is null or (segundos >= 0 and segundos <= 86400)) not valid;
alter table produto.eventos validate constraint eventos_tipo_tam;
alter table produto.eventos validate constraint eventos_segundos_faixa;

alter table produto.familias add constraint familias_nome_tam check (char_length(nome) between 1 and 80) not valid;
alter table produto.familias validate constraint familias_nome_tam;
alter table produto.membros
  add constraint membros_nome_tam check (char_length(nome) between 1 and 80) not valid,
  add constraint membros_email_tam check (email is null or char_length(email) <= 254) not valid;
alter table produto.membros validate constraint membros_nome_tam;
alter table produto.membros validate constraint membros_email_tam;
alter table produto.cartoes add constraint cartoes_nome_tam check (char_length(nome) between 1 and 60) not valid;
alter table produto.cartoes validate constraint cartoes_nome_tam;
alter table produto.config_familia
  add constraint config_chave_tam check (char_length(chave) between 1 and 60) not valid,
  add constraint config_valor_tam check (octet_length(valor::text) <= 300000) not valid;
alter table produto.config_familia validate constraint config_chave_tam;
alter table produto.config_familia validate constraint config_valor_tam;

-- 2) Permissoes mais estreitas (o app nao usa nenhuma destas escritas diretas)
-- codigos da equipe: so a funcao convidar() cria; ninguem edita hash, validade ou tentativas pela API
revoke insert, update on produto.acesso_equipe from authenticated;
-- membros: so convidar() e criar_familia() criam (antes o casal podia gravar o user_id de qualquer pessoa)
revoke insert on produto.membros from authenticated;
-- lancamentos e eventos: quem grava nao escolhe a hora de criacao nem nasce na lixeira
revoke insert on produto.lancamentos from authenticated;
grant insert (id, familia_id, envelope_id, cartao_id, valor, data, descricao, autor) on produto.lancamentos to authenticated;
revoke insert on produto.eventos from authenticated;
grant insert (familia_id, tipo, segundos, user_id) on produto.eventos to authenticated;

-- 3) A familia nunca fica sem casal (ninguem rebaixa, desliga ou tira o ultimo casal)
create or replace function produto._guarda_ultimo_casal() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.papel = 'casal' and old.ativo and old.user_id is not null
     and (tg_op <> 'UPDATE' or new.papel <> 'casal' or not new.ativo)
     and exists (select 1 from produto.familias f where f.id = old.familia_id)
     and not exists (select 1 from produto.membros m where m.familia_id = old.familia_id and m.id <> old.id
                      and m.papel = 'casal' and m.ativo and m.user_id is not null) then
    raise exception 'a familia nao pode ficar sem casal' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' then return new; end if;
  return old;
end $$;
revoke all on function produto._guarda_ultimo_casal() from public, anon, authenticated;
create trigger membros_guarda_ultimo_casal before update of papel, ativo or delete on produto.membros
  for each row execute function produto._guarda_ultimo_casal();

-- 4) Indices pros filtros que as contas usam (sem eles, cada resumo varre a tabela inteira)
create index if not exists lancamentos_envelope_data_idx on produto.lancamentos (envelope_id, data) where apagado_em is null;
create index if not exists tentativas_equipe_falhas_idx on produto.tentativas_equipe (criado_em) where not ok;
create index if not exists acesso_equipe_expira_idx on produto.acesso_equipe (expira_em);
create index if not exists membros_convite_email_idx on produto.membros (email) where user_id is null;
create index if not exists teste_resultados_rodada_idx on produto.teste_resultados (rodada);
create index if not exists ia_chamadas_criado_idx on produto.ia_chamadas (criado_em);;