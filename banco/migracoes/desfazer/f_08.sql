-- Desfaz f_08: apaga futuro_entradas e volta guardado_criar como era (texto da migração produto_g_03, igual ao real).
-- As aplicações "do casal" já gravadas continuam (titular nulo é dado válido de antes também).
drop function if exists produto.futuro_entradas(uuid);
drop function produto.guardado_criar(uuid, text, text, text, numeric, numeric, date, date, uuid, uuid, boolean);
create function produto.guardado_criar(familia uuid, nome text, banco text, tipo text, pct_cdi numeric, valor_inicial numeric,
  data date default null, vence_em date default null, chave uuid default null, titular uuid default null)
returns json language plpgsql set search_path = '' as $$
declare
  f uuid := guardado_criar.familia; hoje date := produto._hoje(); dt date := coalesce(guardado_criar.data, produto._hoje());
  t text := guardado_criar.tipo; aid uuid; tit uuid := guardado_criar.titular; ja boolean := false;
  pct numeric := coalesce(guardado_criar.pct_cdi, 100); vi numeric := coalesce(guardado_criar.valor_inicial, 0);
begin
  if produto.meu_papel(f) is distinct from 'casal' then raise exception 'so o casal mexe no Guardado' using errcode = '42501'; end if;
  if t is null or t not in ('caixinha', 'cdb', 'lci_lca', 'poupanca', 'tesouro_selic') then raise exception 'tipo invalido: use caixinha, cdb, lci_lca, poupanca ou tesouro_selic' using errcode = '22023'; end if;
  if btrim(coalesce(guardado_criar.nome, '')) = '' or btrim(coalesce(guardado_criar.banco, '')) = '' then raise exception 'faltou o nome ou o banco' using errcode = '22023'; end if;
  if pct < 0 or pct > 300 then raise exception 'o percentual do CDI vai de 0 a 300' using errcode = '22023'; end if;
  if vi < 0 or vi > 100000000 then raise exception 'valor invalido' using errcode = '22023'; end if;
  if dt > hoje or dt < hoje - 3660 then raise exception 'a data tem que ser de hoje pra tras, ate 10 anos' using errcode = '22023'; end if;
  if guardado_criar.vence_em is not null and guardado_criar.vence_em <= dt then raise exception 'o vencimento tem que ser depois da data da aplicacao' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('guardado:' || f::text, 0));
  if guardado_criar.chave is not null then
    select x.id into aid from produto.pat_aplicacoes x where x.familia_id = f and x.chave = guardado_criar.chave;
  end if;
  if aid is not null then
    ja := true;
  else
    if (select count(*) from produto.pat_aplicacoes x where x.familia_id = f and x.encerrada_em is null) >= 30 then
      raise exception 'a familia ja tem 30 aplicacoes abertas' using errcode = '54000';
    end if;
    if tit is null then
      select m.id into tit from produto.membros m where m.familia_id = f and m.user_id = (select auth.uid()) and m.ativo limit 1;
    elsif not exists (select 1 from produto.membros m where m.familia_id = f and m.id = tit and m.papel = 'casal') then
      raise exception 'o titular tem que ser do casal' using errcode = '22023';
    end if;
    insert into produto.pat_aplicacoes (familia_id, titular_membro, nome, banco, tipo, pct_cdi, isento_ir, liquidez, vence_em, chave, criado_por)
    values (f, tit, left(btrim(guardado_criar.nome), 60), left(btrim(guardado_criar.banco), 60), t,
            case when t in ('poupanca', 'tesouro_selic') then 100 else pct end, t in ('lci_lca', 'poupanca'),
            case when guardado_criar.vence_em is not null and t in ('cdb', 'lci_lca') then 'vencimento' else 'diaria' end,
            guardado_criar.vence_em, guardado_criar.chave, (select auth.uid()))
    returning id into aid;
    if vi >= 0.01 then
      insert into produto.pat_movimentos (familia_id, aplicacao_id, data, tipo, valor, chave, autor)
      values (f, aid, dt, 'aporte', round(vi, 2), coalesce(guardado_criar.chave, gen_random_uuid()), (select auth.uid()));
    end if;
  end if;
  return (produto._guardado(f, hoje) || jsonb_build_object('aplicacao_id', aid, 'repetido', ja))::json;
end $$;
revoke all on function produto.guardado_criar(uuid, text, text, text, numeric, numeric, date, date, uuid, uuid) from public, anon;
grant execute on function produto.guardado_criar(uuid, text, text, text, numeric, numeric, date, date, uuid, uuid) to authenticated;
