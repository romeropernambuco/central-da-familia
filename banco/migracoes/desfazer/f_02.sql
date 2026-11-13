-- Desfaz f_02: recria as políticas como estavam antes (texto copiado do banco em 13/11/26, igual ao real).
drop policy if exists lanc_criar on produto.lancamentos;
drop policy if exists lanc_mudar on produto.lancamentos;
drop policy if exists lanc_ver on produto.lancamentos;
drop policy if exists lanc_apagar on produto.lancamentos;
create policy lanc_apagar on produto.lancamentos for delete to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')));
create policy lanc_criar on produto.lancamentos for insert to authenticated
  with check (envelope_id in (select produto.meus_envelopes()) and autor = (select auth.uid())
              and (cartao_id is null or familia_id in (select produto.familias_com_papel('casal', 'pessoa'))));
create policy lanc_mudar on produto.lancamentos for update to authenticated
  using (envelope_id in (select produto.meus_envelopes())
         and (familia_id in (select produto.familias_com_papel('casal')) or autor = (select auth.uid())))
  with check (envelope_id in (select produto.meus_envelopes())
              and (cartao_id is null or familia_id in (select produto.familias_com_papel('casal', 'pessoa'))));
create policy lanc_ver on produto.lancamentos for select to authenticated
  using (envelope_id in (select produto.meus_envelopes())
         and (familia_id in (select produto.familias_com_papel('casal', 'pessoa')) or autor = (select auth.uid())));

drop policy if exists cartoes_ver on produto.cartoes;
drop policy if exists cartoes_mudar on produto.cartoes;
drop policy if exists cartoes_apagar on produto.cartoes;
create policy cartoes_ver on produto.cartoes for select to authenticated
  using (familia_id in (select produto.familias_com_papel('casal', 'pessoa')));
create policy cartoes_mudar on produto.cartoes for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')))
  with check (familia_id in (select produto.familias_com_papel('casal')));
create policy cartoes_apagar on produto.cartoes for delete to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')));

drop policy if exists pat_aplicacoes_mudar on produto.pat_aplicacoes;
create policy pat_aplicacoes_mudar on produto.pat_aplicacoes for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')))
  with check (familia_id in (select produto.familias_com_papel('casal')));
drop policy if exists pat_movimentos_criar on produto.pat_movimentos;
create policy pat_movimentos_criar on produto.pat_movimentos for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal')) and autor = (select auth.uid()));
drop policy if exists pat_movimentos_anular on produto.pat_movimentos;
create policy pat_movimentos_anular on produto.pat_movimentos for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')))
  with check (familia_id in (select produto.familias_com_papel('casal')));

-- volta o caso antigo do teste de vazamento ao esperado de antes
do $$ begin
  execute replace(pg_get_functiondef('produto._teste_vazamento_tabelas()'::regprocedure),
    $b$'e0000000-0000-4e0e-8000-000000000011'), 'linhas', '0' /* f_02: equipe nao enxerga lancamento, 0 linhas */),$b$,
    $a$'e0000000-0000-4e0e-8000-000000000011'), 'linhas', 'bloqueado'),$a$);
end $$;

-- B1, B2, B3 e B7: volta como era
alter table produto.esc_diario drop constraint if exists esc_diario_casa_sem_dinheiro;
drop policy if exists cartao_custos_mudar on produto.cartao_custos;
create policy cartao_custos_mudar on produto.cartao_custos for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')))
  with check (familia_id in (select produto.familias_com_papel('casal')));
drop policy if exists cartao_custos_criar on produto.cartao_custos;
create policy cartao_custos_criar on produto.cartao_custos for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal')));
drop policy if exists cartao_faturas_mudar on produto.cartao_faturas;
create policy cartao_faturas_mudar on produto.cartao_faturas for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')))
  with check (familia_id in (select produto.familias_com_papel('casal')));
drop policy if exists cartao_faturas_criar on produto.cartao_faturas;
create policy cartao_faturas_criar on produto.cartao_faturas for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal')));
drop policy if exists cartoes_criar on produto.cartoes;
create policy cartoes_criar on produto.cartoes for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal')));

do $$ begin
  execute replace(pg_get_functiondef('produto.definir_limite(uuid,uuid,numeric)'::regprocedure),
    $b$  if not found then raise exception 'envelope nao encontrado' using errcode = 'P0002'; end if;
  if en not in (select produto.envelopes_que_ajusto()) then raise exception 'cada um muda so o proprio limite, o da Casa e o da filha' using errcode = '42501'; end if;$b$,
    $a$  if not found then raise exception 'envelope nao encontrado' using errcode = 'P0002'; end if;$a$);
end $$;
drop policy if exists limites_apagar on produto.limites_mes;
create policy limites_apagar on produto.limites_mes for delete to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')) and mes >= to_char((now() at time zone 'America/Recife')::date, 'YYYY-MM'));
drop policy if exists limites_mudar on produto.limites_mes;
create policy limites_mudar on produto.limites_mes for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')) and mes >= to_char((now() at time zone 'America/Recife')::date, 'YYYY-MM'))
  with check (familia_id in (select produto.familias_com_papel('casal')) and mes >= to_char((now() at time zone 'America/Recife')::date, 'YYYY-MM'));
drop policy if exists limites_criar on produto.limites_mes;
create policy limites_criar on produto.limites_mes for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal')) and mes >= to_char((now() at time zone 'America/Recife')::date, 'YYYY-MM'));
drop policy if exists envelopes_apagar on produto.envelopes;
create policy envelopes_apagar on produto.envelopes for delete to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')));
drop policy if exists envelopes_mudar on produto.envelopes;
create policy envelopes_mudar on produto.envelopes for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')))
  with check (familia_id in (select produto.familias_com_papel('casal')));
revoke update (nome, regra, limite_mes, colchao, peso_fds) on produto.envelopes from authenticated;
grant update on produto.envelopes to authenticated;

drop policy if exists membros_apagar on produto.membros;
create policy membros_apagar on produto.membros for delete to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')));
drop policy if exists membros_mudar on produto.membros;
create policy membros_mudar on produto.membros for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')))
  with check (familia_id in (select produto.familias_com_papel('casal')));
grant update (envelope_id, papel) on produto.membros to authenticated;

-- volta os 2 casos antigos de papel
do $$ begin
  execute replace(pg_get_functiondef('produto._teste_vazamento_tabelas()'::regprocedure),
    $b$'linhas', 'bloqueado' /* f_02 B1: papel so muda pelas funcoes */),$b$, $a$'linhas', '0'),$a$);
  execute replace(pg_get_functiondef('produto._teste_revisao()'::regprocedure),
    $b$'linhas', 'bloqueado' /* f_02 B1: papel so muda pelas funcoes */),$b$, $a$'linhas', '1'),$a$);
end $$;

-- N4: volta como era
grant execute on function produto._numeros(timestamptz) to authenticated;
alter function produto.numeros_semana() security invoker;
