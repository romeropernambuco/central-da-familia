-- f_02 (fase final): tranca de escrita. O casal continua LENDO tudo da família (com o dono escrito na tela);
-- escrever, só no que é seu. Fecha os furos achados no plano técnico (item 3):
--  (a) lanc_criar e lanc_mudar deixavam o casal escrever no envelope do outro  -> meus_envelopes_escrita() e autor = eu
--  (b) lanc_ver tinha "OR autor = eu": a equipe lia o valor do que ela mesma lançou -> sai o OR; equipe não lê lançamento
--  (c) cartoes_ver incluía pessoa (a filha lia nome e final do cartão dos pais)      -> só casal
--  (d) lanc_apagar permitia DELETE direto                                           -> sai; apagar só pela lixeira (apagar_lancamento)
--  cartão: só mexe quem é o titular (ou cartão sem titular, que é da família)
--  guardado (pat_*): só mexe o titular da aplicação (ou aplicação "do casal", sem titular)
-- Revisão do E1 (13/11):
--  B1 cadastro: ninguém troca envelope nem papel de membro direto na tabela (só pelas funções do banco); o casal muda
--     o próprio nome e nome/ativo de filha e equipe, nunca do outro adulto; e só remove filha ou equipe
--  B2 limite: envelope, limites_mes e definir_limite só no que é seu, da Casa, sem dono ou da filha; "casa" não muda depois de criado
--  B3 cartão: ninguém cria cartão no nome do outro, nem marca fatura ou custo do cartão do outro
--  B4 lançamento com cartão: só no próprio cartão ou no sem titular; a filha não usa cartão
--  B7 diário da Casa: a tabela recusa R$ e valor em linha que a equipe lê (antes só a função cuidava)
-- Desfazer: banco/migracoes/desfazer/f_02.sql (recria as políticas antigas com o texto exato)

-- lançamentos
drop policy if exists lanc_apagar on produto.lancamentos;

drop policy if exists lanc_criar on produto.lancamentos;
create policy lanc_criar on produto.lancamentos for insert to authenticated
  with check (envelope_id in (select produto.meus_envelopes_escrita())
              and autor = (select auth.uid())
              and (cartao_id is null or cartao_id in (select produto.meus_cartoes_escrita())));

drop policy if exists lanc_mudar on produto.lancamentos;
create policy lanc_mudar on produto.lancamentos for update to authenticated
  using (envelope_id in (select produto.meus_envelopes_escrita()) and autor = (select auth.uid()))
  with check (envelope_id in (select produto.meus_envelopes_escrita())
              and autor = (select auth.uid())
              and (cartao_id is null or cartao_id in (select produto.meus_cartoes_escrita())));

drop policy if exists lanc_ver on produto.lancamentos;
create policy lanc_ver on produto.lancamentos for select to authenticated
  using (envelope_id in (select produto.meus_envelopes())
         and familia_id in (select produto.familias_com_papel('casal', 'pessoa')));

-- cartões
drop policy if exists cartoes_ver on produto.cartoes;
create policy cartoes_ver on produto.cartoes for select to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')));

drop policy if exists cartoes_mudar on produto.cartoes;
create policy cartoes_mudar on produto.cartoes for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal'))
         and (titular_membro is null or titular_membro = produto.meu_membro(familia_id)))
  with check (familia_id in (select produto.familias_com_papel('casal'))
              and (titular_membro is null or titular_membro = produto.meu_membro(familia_id)));

drop policy if exists cartoes_apagar on produto.cartoes;
create policy cartoes_apagar on produto.cartoes for delete to authenticated
  using (familia_id in (select produto.familias_com_papel('casal'))
         and (titular_membro is null or titular_membro = produto.meu_membro(familia_id)));

-- guardado
drop policy if exists pat_aplicacoes_mudar on produto.pat_aplicacoes;
create policy pat_aplicacoes_mudar on produto.pat_aplicacoes for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal'))
         and (titular_membro is null or titular_membro = produto.meu_membro(familia_id)))
  with check (familia_id in (select produto.familias_com_papel('casal'))
              and (titular_membro is null or titular_membro = produto.meu_membro(familia_id)));

drop policy if exists pat_movimentos_criar on produto.pat_movimentos;
create policy pat_movimentos_criar on produto.pat_movimentos for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal'))
              and autor = (select auth.uid())
              and exists (select 1 from produto.pat_aplicacoes a
                           where a.id = aplicacao_id and a.familia_id = pat_movimentos.familia_id
                             and (a.titular_membro is null or a.titular_membro = produto.meu_membro(a.familia_id))));

drop policy if exists pat_movimentos_anular on produto.pat_movimentos;
create policy pat_movimentos_anular on produto.pat_movimentos for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal'))
         and exists (select 1 from produto.pat_aplicacoes a
                      where a.id = aplicacao_id and a.familia_id = pat_movimentos.familia_id
                        and (a.titular_membro is null or a.titular_membro = produto.meu_membro(a.familia_id))))
  with check (familia_id in (select produto.familias_com_papel('casal')));


-- B1: cadastro de membros
revoke update (envelope_id, papel) on produto.membros from authenticated;
drop policy if exists membros_mudar on produto.membros;
create policy membros_mudar on produto.membros for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal'))
         and (id = produto.meu_membro(familia_id) or papel in ('pessoa', 'equipe')))
  with check (familia_id in (select produto.familias_com_papel('casal'))
              and (id = produto.meu_membro(familia_id) or papel in ('pessoa', 'equipe')));
drop policy if exists membros_apagar on produto.membros;
create policy membros_apagar on produto.membros for delete to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')) and papel in ('pessoa', 'equipe'));

-- B2: limite e envelope
revoke update on produto.envelopes from authenticated;
grant update (nome, regra, limite_mes, colchao, peso_fds) on produto.envelopes to authenticated;
drop policy if exists envelopes_mudar on produto.envelopes;
create policy envelopes_mudar on produto.envelopes for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')) and id in (select produto.envelopes_que_ajusto()))
  with check (familia_id in (select produto.familias_com_papel('casal')) and id in (select produto.envelopes_que_ajusto()));
drop policy if exists envelopes_apagar on produto.envelopes;
create policy envelopes_apagar on produto.envelopes for delete to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')) and id in (select produto.envelopes_que_ajusto()));
drop policy if exists limites_criar on produto.limites_mes;
create policy limites_criar on produto.limites_mes for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal'))
              and mes >= to_char((now() at time zone 'America/Recife')::date, 'YYYY-MM')
              and envelope_id in (select produto.envelopes_que_ajusto()));
drop policy if exists limites_mudar on produto.limites_mes;
create policy limites_mudar on produto.limites_mes for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal'))
         and mes >= to_char((now() at time zone 'America/Recife')::date, 'YYYY-MM')
         and envelope_id in (select produto.envelopes_que_ajusto()))
  with check (familia_id in (select produto.familias_com_papel('casal'))
              and mes >= to_char((now() at time zone 'America/Recife')::date, 'YYYY-MM')
              and envelope_id in (select produto.envelopes_que_ajusto()));
drop policy if exists limites_apagar on produto.limites_mes;
create policy limites_apagar on produto.limites_mes for delete to authenticated
  using (familia_id in (select produto.familias_com_papel('casal'))
         and mes >= to_char((now() at time zone 'America/Recife')::date, 'YYYY-MM')
         and envelope_id in (select produto.envelopes_que_ajusto()));
do $$ begin
  execute replace(pg_get_functiondef('produto.definir_limite(uuid,uuid,numeric)'::regprocedure),
    $a$  if not found then raise exception 'envelope nao encontrado' using errcode = 'P0002'; end if;$a$,
    $b$  if not found then raise exception 'envelope nao encontrado' using errcode = 'P0002'; end if;
  if en not in (select produto.envelopes_que_ajusto()) then raise exception 'cada um muda so o proprio limite, o da Casa e o da filha' using errcode = '42501'; end if;$b$);
  if (select prosrc from pg_proc where oid = 'produto.definir_limite(uuid,uuid,numeric)'::regprocedure) not like '%envelopes_que_ajusto%' then
    raise exception 'f_02: nao consegui trancar o definir_limite';
  end if;
end $$;

-- B3: cartão, fatura e custo do cartão do outro
drop policy if exists cartoes_criar on produto.cartoes;
create policy cartoes_criar on produto.cartoes for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal'))
              and (titular_membro is null or titular_membro = produto.meu_membro(familia_id)));
drop policy if exists cartao_faturas_criar on produto.cartao_faturas;
create policy cartao_faturas_criar on produto.cartao_faturas for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal')) and cartao_id in (select produto.meus_cartoes_escrita()));
drop policy if exists cartao_faturas_mudar on produto.cartao_faturas;
create policy cartao_faturas_mudar on produto.cartao_faturas for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')) and cartao_id in (select produto.meus_cartoes_escrita()))
  with check (familia_id in (select produto.familias_com_papel('casal')) and cartao_id in (select produto.meus_cartoes_escrita()));
drop policy if exists cartao_custos_criar on produto.cartao_custos;
create policy cartao_custos_criar on produto.cartao_custos for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal')) and cartao_id in (select produto.meus_cartoes_escrita()));
drop policy if exists cartao_custos_mudar on produto.cartao_custos;
create policy cartao_custos_mudar on produto.cartao_custos for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')) and cartao_id in (select produto.meus_cartoes_escrita()))
  with check (familia_id in (select produto.familias_com_papel('casal')) and cartao_id in (select produto.meus_cartoes_escrita()));

-- B7: o diário da Casa (que a equipe lê) nunca guarda R$ nem valor
alter table produto.esc_diario add constraint esc_diario_casa_sem_dinheiro
  check (not casa or (coalesce(pergunta, '') !~ 'R\$' and coalesce(resposta, '') !~ 'R\$'
                      and not coalesce(dados ?| array['valor', 'diferenca', 'valor_pergunta'], false)));

-- N4 (2ª revisão): _numeros (contagens do produto) só pelo numeros_semana, que tem a trava de dono do produto.
-- numeros_semana passa a rodar como dono do banco pra continuar chamando _numeros; o dono vê o mesmo de antes
-- (o RLS já mostrava todas as famílias pra ele).
alter function produto.numeros_semana() security definer;
revoke execute on function produto._numeros(timestamptz) from authenticated;

-- Teste antigo mudado (motivo): "Equipe muda lancamento da Casa pra envelope do casal" esperava 'bloqueado' porque a
-- equipe ENXERGAVA o lançamento que ela mesma fez (furo b) e o check barrava a troca. Com a f_02 a equipe não enxerga
-- lançamento nenhum, então o UPDATE não acha linha: volta 0 linhas e nada muda. Continua sendo a mesma proteção, mais forte.
do $$ begin
  execute replace(pg_get_functiondef('produto._teste_vazamento_tabelas()'::regprocedure),
    $a$'e0000000-0000-4e0e-8000-000000000011'), 'linhas', 'bloqueado'),$a$,
    $b$'e0000000-0000-4e0e-8000-000000000011'), 'linhas', '0' /* f_02: equipe nao enxerga lancamento, 0 linhas */),$b$);
  if (select prosrc from pg_proc where oid = 'produto._teste_vazamento_tabelas()'::regprocedure) not like '%f_02: equipe nao enxerga%' then
    raise exception 'f_02: nao achei o caso antigo da equipe pra ajustar';
  end if;
end $$;


-- Mais 2 casos antigos mudados (motivo, revisão B1): o papel de um membro não muda mais direto na tabela, só pelas funções
-- do banco. (1) "Equipe se promove a casal" esperava 0 linhas; agora a coluna nem pode ser escrita: bloqueado, mais forte.
-- (2) "CONTROLE 1 dos 2 casais vira pessoa" provava que o gatilho deixa trocar 1 dos 2 casais; agora ninguém troca papel
-- pela tabela, então o esperado vira bloqueado. O gatilho _guarda_ultimo_casal continua no banco, intacto.
do $$ begin
  execute replace(pg_get_functiondef('produto._teste_vazamento_tabelas()'::regprocedure),
    $a$('Equipe se promove a casal', carla, 'authenticated', format('update produto.membros set papel = %L where user_id = %L', 'casal', carla), 'linhas', '0'),$a$,
    $b$('Equipe se promove a casal', carla, 'authenticated', format('update produto.membros set papel = %L where user_id = %L', 'casal', carla), 'linhas', 'bloqueado' /* f_02 B1: papel so muda pelas funcoes */),$b$);
  execute replace(pg_get_functiondef('produto._teste_revisao()'::regprocedure),
    $a$('CONTROLE 1 dos 2 casais vira pessoa (o outro continua)', ana, format('update produto.membros set papel = ''pessoa'' where user_id = %L', ana), 'linhas', '1'),$a$,
    $b$('CONTROLE 1 dos 2 casais vira pessoa (o outro continua)', ana, format('update produto.membros set papel = ''pessoa'' where user_id = %L', ana), 'linhas', 'bloqueado' /* f_02 B1: papel so muda pelas funcoes */),$b$);
  if (select prosrc from pg_proc where oid = 'produto._teste_vazamento_tabelas()'::regprocedure) not like '%B1: papel so muda%'
     or (select prosrc from pg_proc where oid = 'produto._teste_revisao()'::regprocedure) not like '%B1: papel so muda%' then
    raise exception 'f_02: nao achei os casos antigos de papel pra ajustar';
  end if;
end $$;

-- portão: todos os testes que existirem no banco têm que continuar 100% ok
do $$
declare t text; n int;
begin
  foreach t in array array['teste_vazamento','teste_contas_casos','teste_guardado','teste_escritorio','teste_tranca_f','teste_futuro_ir'] loop
    if to_regprocedure('produto.' || t || '()') is not null then
      execute format('select count(*) from produto.%I() where not ok', t) into n;
      if n > 0 then raise exception 'f_02: % tem % caso(s) falhando; nada foi gravado', t, n; end if;
    end if;
  end loop;
  select count(*) into n from produto.teste_conta() where not ok;
  if n > 0 then raise exception 'f_02: teste_conta tem % caso(s) falhando; nada foi gravado', n; end if;
end $$;
