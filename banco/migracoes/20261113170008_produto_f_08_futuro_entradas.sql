-- f_08 (fase final): produto.futuro_entradas(familia) entrega pro motor de 2029 (codigo/src/lib/futuro) só os DADOS,
-- nenhuma conta de futuro: aplicações com o saldo de hoje (o mesmo do Guardado), recebimentos, limites do mês, rendas e
-- contas fixas, folha da casa (o 13º é conta do motor), compras parceladas que ainda têm parcela, desejos, parâmetros e Focus.
-- Dinheiro em centavos inteiros; taxas em texto decimal. Permissão de quem chama; só o casal: filha, equipe e o vigia
-- noturno (sem login) recebem erro 42501. Dívidas: ainda não existe tabela; vai lista vazia (ver BANCO_E1.md).
-- Também (pedido C2 do Revisor): guardado_criar ganha "do_casal" (padrão não). Antes, titular nulo virava quem chama e
-- não havia como gravar uma aplicação "do casal". Quem já chama sem do_casal continua igual. E, pela regra nova, ninguém
-- cria aplicação no nome do outro adulto (só no próprio nome ou do casal). (C5) cada aplicação vem com a lista "titulares".
-- Desfazer: banco/migracoes/desfazer/f_08.sql

create function produto.futuro_entradas(familia uuid) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  f uuid := futuro_entradas.familia;
  hoje date;
  m0 date;
  g jsonb;
  cfg jsonb;
  focus jsonb := '[]'::jsonb;
begin
  if produto.meu_papel(f) is distinct from 'casal' then
    raise exception 'so o casal ve as contas do futuro' using errcode = '42501';
  end if;
  hoje := produto._hoje();
  m0 := date_trunc('month', hoje)::date;
  g := produto._guardado(f, hoje, null);
  select coalesce(jsonb_object_agg(x.chave, x.valor), '{}'::jsonb) into cfg
    from produto.config_familia x where x.familia_id = f and x.chave in ('renda_mes', 'rendas', 'contas_fixas', 'casa_folha');
  if to_regclass('produto.focus_indices') is not null then
    execute 'select coalesce(jsonb_agg(jsonb_build_object(''ano'', x.ano, ''selic_fim'', x.selic_fim::text, ''ipca'', x.ipca::text,
               ''divulgado_em'', x.divulgado_em, ''fonte'', x.fonte) order by x.ano), ''[]''::jsonb)
               from (select distinct on (ano) * from produto.focus_indices order by ano, divulgado_em desc) x'
      into focus;
  end if;
  return jsonb_build_object(
    'hoje', hoje,
    'mes_base', to_char(m0, 'YYYY-MM'),
    'aplicacoes', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', a->>'id', 'titular_membro', a->>'titular_membro',
        'titular_nome', (select o.nome from produto.membros o where o.familia_id = f and o.id = (a->>'titular_membro')::uuid),
        -- C5: a LISTA de titulares. Aplicação "do casal" (sem titular) = conta conjunta dos adultos do casal ativos;
        -- o motor divide a conta entre os CPFs (FGC por CPF e banco)
        'conta_conjunta', (a->>'titular_membro') is null,
        'titulares', (select coalesce(jsonb_agg(jsonb_build_object('membro_id', o.id, 'nome', o.nome) order by o.criado_em, o.id), '[]'::jsonb)
                        from produto.membros o
                       where o.familia_id = f
                         and (o.id = (a->>'titular_membro')::uuid
                              or ((a->>'titular_membro') is null and o.papel = 'casal' and o.ativo))),
        'banco', a->>'banco', 'tipo', a->>'tipo',
        'saldo_centavos', round((a->>'saldo')::numeric * 100)::bigint,
        'pct_cdi', a->>'pct_cdi', 'isenta', (a->>'isento_ir')::boolean,
        'aplicada_em', a->>'inicio', 'resgate_previsto', a->>'vence_em', 'liquidez', a->>'liquidez')
        -- sem "garantia" (revisão B8): FGC é conta só do motor (F10), com o tipo e os titulares daqui
        order by a->>'inicio', a->>'id'), '[]'::jsonb)
        from jsonb_array_elements(coalesce(g->'aplicacoes', '[]'::jsonb)) a),
    'cdi_hoje', jsonb_build_object('pct_ano', g->'cdi_usado'->>'pct_ano', 'selic_meta', g->'cdi_usado'->>'selic_meta',
                                   'data', g->'cdi_usado'->>'data', 'fonte', g->'cdi_usado'->>'fonte'),
    'recebimentos', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', r.id, 'dono_membro', r.dono_membro, 'dono_nome', o.nome, 'descricao', r.descricao,
        'valor_centavos', r.valor_centavos, 'mes_previsto', to_char(r.mes_previsto, 'YYYY-MM'),
        'mes_novo', to_char(r.mes_novo, 'YYYY-MM'), 'tipo', r.tipo, 'certo', r.certo,
        'recebido_em', r.recebido_em, 'valor_recebido_centavos', r.valor_recebido_centavos) order by r.mes_previsto, r.criado_em), '[]'::jsonb)
        from produto.recebimentos r left join produto.membros o on o.familia_id = r.familia_id and o.id = r.dono_membro
        where r.familia_id = f and r.apagado_em is null),
    'limites_mes', (select coalesce(jsonb_agg(jsonb_build_object(
        'envelope_id', e.id, 'nome', e.nome, 'casa', e.casa, 'dono_nome', produto._dono_nome_envelope(f, e.id),
        'limite_centavos', round(produto._lim(e.id, m0) * 100)::bigint) order by e.criado_em, e.nome), '[]'::jsonb)
        from produto.envelopes e where e.familia_id = f),
    'config', cfg,
    'parcelas_futuras', (select coalesce(jsonb_agg(jsonb_build_object(
        'lancamento_id', l.id, 'envelope_id', l.envelope_id, 'valor_centavos', round(l.valor * 100)::bigint, 'parcelas', l.parcelas,
        'data', l.data, 'cartao_id', l.cartao_id, 'dia_fechamento', c.dia_fechamento, 'dia_vencimento', c.dia_vencimento,
        -- a regra do cartão fica num lugar só (_mes_fatura): o motor recebe o mês da 1ª fatura pronto
        'mes_primeira_fatura', to_char(produto._mes_fatura(c.dia_fechamento, c.dia_vencimento, l.data), 'YYYY-MM'))
        order by l.data, l.id), '[]'::jsonb)
        from produto.lancamentos l join produto.cartoes c on c.id = l.cartao_id and c.familia_id = l.familia_id
        where l.familia_id = f and l.apagado_em is null and l.parcelas > 1
          and (produto._mes_fatura(c.dia_fechamento, c.dia_vencimento, l.data) + make_interval(months => l.parcelas::int - 1))::date >= m0),
    'dividas', '[]'::jsonb,
    'desejos', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', d.id, 'dono_membro', d.dono_membro, 'nome', d.nome, 'valor_centavos', d.valor_centavos,
        'mes', to_char(d.mes, 'YYYY-MM'), 'volta_de', d.volta_de, 'volta_centavos', d.volta_centavos,
        'volta_mes', to_char(d.volta_mes, 'YYYY-MM'), 'antecipado_centavos', d.antecipado_centavos,
        'volta_certa', d.volta_certa, 'situacao', d.situacao) order by d.mes, d.criado_em), '[]'::jsonb)
        from produto.desejos d where d.familia_id = f and d.apagado_em is null and d.situacao <> 'desisti'),
    'parametros', (select o.parametros from produto.objetivo o where o.familia_id = f),
    'focus', focus);
end $$;
comment on function produto.futuro_entradas(uuid) is 'Dados pro motor de 2029 (f_08). Nenhuma conta de futuro aqui; só o casal.';
revoke all on function produto.futuro_entradas(uuid) from public, anon;
grant execute on function produto.futuro_entradas(uuid) to authenticated;


-- C2: aplicação "do casal" explícita
drop function produto.guardado_criar(uuid, text, text, text, numeric, numeric, date, date, uuid, uuid);
create function produto.guardado_criar(familia uuid, nome text, banco text, tipo text, pct_cdi numeric, valor_inicial numeric,
  data date default null, vence_em date default null, chave uuid default null, titular uuid default null, do_casal boolean default false)
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
    if coalesce(guardado_criar.do_casal, false) then
      if tit is not null then raise exception 'escolha: no nome de alguem ou do casal, nao os 2' using errcode = '22023'; end if;
    elsif tit is null then
      select m.id into tit from produto.membros m where m.familia_id = f and m.user_id = (select auth.uid()) and m.ativo limit 1;
    elsif not exists (select 1 from produto.membros m where m.familia_id = f and m.id = tit and m.papel = 'casal') then
      raise exception 'o titular tem que ser do casal' using errcode = '22023';
    elsif tit is distinct from produto.meu_membro(f) then
      raise exception 'cada um cria aplicacao so no proprio nome ou do casal' using errcode = '42501';
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
revoke all on function produto.guardado_criar(uuid, text, text, text, numeric, numeric, date, date, uuid, uuid, boolean) from public, anon;
grant execute on function produto.guardado_criar(uuid, text, text, text, numeric, numeric, date, date, uuid, uuid, boolean) to authenticated;

-- portão: todos os testes que existirem no banco têm que continuar 100% ok
do $$
declare t text; n int;
begin
  foreach t in array array['teste_vazamento','teste_contas_casos','teste_guardado','teste_escritorio','teste_tranca_f','teste_futuro_ir'] loop
    if to_regprocedure('produto.' || t || '()') is not null then
      execute format('select count(*) from produto.%I() where not ok', t) into n;
      if n > 0 then raise exception 'f_08: % tem % caso(s) falhando; nada foi gravado', t, n; end if;
    end if;
  end loop;
  select count(*) into n from produto.teste_conta() where not ok;
  if n > 0 then raise exception 'f_08: teste_conta tem % caso(s) falhando; nada foi gravado', n; end if;
end $$;
