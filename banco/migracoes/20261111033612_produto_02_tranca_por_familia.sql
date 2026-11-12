-- ===== privilegios =====
revoke all on schema produto from public, anon;
grant usage on schema produto to authenticated, service_role;
revoke all on all tables in schema produto from public, anon, authenticated;
revoke all on all sequences in schema produto from public, anon, authenticated;
alter default privileges for role postgres in schema produto revoke all on tables from public, anon;
alter default privileges for role postgres in schema produto revoke all on sequences from public, anon;
alter default privileges for role postgres in schema produto revoke all on functions from public, anon;

grant select, insert, update, delete on all tables in schema produto to service_role;
grant usage on all sequences in schema produto to service_role;

grant select, update (nome) on produto.familias to authenticated;
grant select, insert, update, delete on produto.envelopes to authenticated;
grant select, insert, delete on produto.membros to authenticated;
grant update (papel, nome, envelope_id, ativo) on produto.membros to authenticated;
grant select, insert, update, delete on produto.limites_mes to authenticated;
grant select, insert, update, delete on produto.cartoes to authenticated;
grant select, insert, delete on produto.lancamentos to authenticated;
grant update (envelope_id, cartao_id, valor, data, descricao, apagado_em) on produto.lancamentos to authenticated;
grant select, insert, update, delete on produto.config_familia to authenticated;
grant select, insert on produto.eventos to authenticated;
grant usage on sequence produto.eventos_id_seq to authenticated;
grant select, insert, delete on produto.acesso_equipe to authenticated;
grant update (codigo_hash, expira_em, tentativas) on produto.acesso_equipe to authenticated;

-- ===== funcoes auxiliares (leem membros sem cair na propria tranca) =====
create function produto.minhas_familias() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select m.familia_id from produto.membros m
  where m.user_id = (select auth.uid()) and m.ativo
$$;

create function produto.meu_papel(p_familia uuid) returns text
language sql stable security definer set search_path = '' as $$
  select m.papel from produto.membros m
  where m.user_id = (select auth.uid()) and m.ativo and m.familia_id = p_familia
$$;

create function produto.familias_com_papel(variadic p_papeis text[]) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select m.familia_id from produto.membros m
  where m.user_id = (select auth.uid()) and m.ativo and m.papel = any(p_papeis)
$$;

create function produto.meus_envelopes() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select e.id from produto.envelopes e
  join produto.membros m on m.familia_id = e.familia_id
  where m.user_id = (select auth.uid()) and m.ativo
    and (m.papel = 'casal'
      or (m.papel = 'pessoa' and e.id = m.envelope_id)
      or (m.papel = 'equipe' and e.casa))
$$;

revoke execute on function produto.minhas_familias(), produto.meu_papel(uuid),
  produto.familias_com_papel(text[]), produto.meus_envelopes() from public, anon;
grant execute on function produto.minhas_familias(), produto.meu_papel(uuid),
  produto.familias_com_papel(text[]), produto.meus_envelopes() to authenticated, service_role;

-- ===== RLS ligado e forcado =====
do $$ declare t text; begin
  foreach t in array array['familias','membros','envelopes','limites_mes','cartoes','lancamentos','config_familia','eventos','acesso_equipe'] loop
    execute format('alter table produto.%I enable row level security', t);
    execute format('alter table produto.%I force row level security', t);
  end loop;
end $$;

-- familias
create policy familias_ver on produto.familias for select to authenticated
  using (id in (select produto.minhas_familias()));
create policy familias_mudar on produto.familias for update to authenticated
  using (id in (select produto.familias_com_papel('casal')))
  with check (id in (select produto.familias_com_papel('casal')));

-- membros: casal ve todos; cada um ve a propria linha
create policy membros_ver on produto.membros for select to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')) or user_id = (select auth.uid()));
create policy membros_criar on produto.membros for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal')));
create policy membros_mudar on produto.membros for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')))
  with check (familia_id in (select produto.familias_com_papel('casal')));
create policy membros_apagar on produto.membros for delete to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')));

-- envelopes
create policy envelopes_ver on produto.envelopes for select to authenticated
  using (id in (select produto.meus_envelopes()));
create policy envelopes_criar on produto.envelopes for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal')));
create policy envelopes_mudar on produto.envelopes for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')))
  with check (familia_id in (select produto.familias_com_papel('casal')));
create policy envelopes_apagar on produto.envelopes for delete to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')));

-- limites_mes
create policy limites_ver on produto.limites_mes for select to authenticated
  using (envelope_id in (select produto.meus_envelopes()));
create policy limites_criar on produto.limites_mes for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal')));
create policy limites_mudar on produto.limites_mes for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')))
  with check (familia_id in (select produto.familias_com_papel('casal')));
create policy limites_apagar on produto.limites_mes for delete to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')));

-- cartoes: casal mexe; pessoa so ve (pra escolher no lancamento); equipe nada
create policy cartoes_ver on produto.cartoes for select to authenticated
  using (familia_id in (select produto.familias_com_papel('casal','pessoa')));
create policy cartoes_criar on produto.cartoes for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal')));
create policy cartoes_mudar on produto.cartoes for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')))
  with check (familia_id in (select produto.familias_com_papel('casal')));
create policy cartoes_apagar on produto.cartoes for delete to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')));

-- lancamentos
create policy lanc_ver on produto.lancamentos for select to authenticated
  using (envelope_id in (select produto.meus_envelopes()));
create policy lanc_criar on produto.lancamentos for insert to authenticated
  with check (
    envelope_id in (select produto.meus_envelopes())
    and autor = (select auth.uid())
    and (cartao_id is null or familia_id in (select produto.familias_com_papel('casal','pessoa'))));
create policy lanc_mudar on produto.lancamentos for update to authenticated
  using (envelope_id in (select produto.meus_envelopes())
    and (familia_id in (select produto.familias_com_papel('casal')) or autor = (select auth.uid())))
  with check (envelope_id in (select produto.meus_envelopes())
    and (cartao_id is null or familia_id in (select produto.familias_com_papel('casal','pessoa'))));
create policy lanc_apagar on produto.lancamentos for delete to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')));

-- config_familia: so o casal
create policy config_ver on produto.config_familia for select to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')));
create policy config_criar on produto.config_familia for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal')));
create policy config_mudar on produto.config_familia for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')))
  with check (familia_id in (select produto.familias_com_papel('casal')));
create policy config_apagar on produto.config_familia for delete to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')));

-- eventos: todo membro grava o proprio; so o casal le
create policy eventos_ver on produto.eventos for select to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')));
create policy eventos_criar on produto.eventos for insert to authenticated
  with check (familia_id in (select produto.minhas_familias()) and user_id = (select auth.uid()));

-- acesso_equipe: so o casal
create policy acesso_ver on produto.acesso_equipe for select to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')));
create policy acesso_criar on produto.acesso_equipe for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal')));
create policy acesso_mudar on produto.acesso_equipe for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')))
  with check (familia_id in (select produto.familias_com_papel('casal')));
create policy acesso_apagar on produto.acesso_equipe for delete to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')));;