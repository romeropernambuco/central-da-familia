-- Família nº 1: recebe o banco do app de hoje (coleções lancamentos, cartoes, envelopes, config) e grava numa família nova.
-- Só o dono do banco roda (não é RPC do app), depois que o Romero tiver o login real: passe o user_id dele em p_dono.
create or replace function produto.importar_familia_json(dados jsonb, p_dono uuid, p_nome text default null, p_nome_pessoa text default 'Romero')
returns json language plpgsql volatile set search_path = '' as
$$
declare
  c jsonb := coalesce(dados->'c', dados); d jsonb := coalesce(dados->'d', dados->'config', '{}'::jsonb);
  envs_in jsonb := coalesce(c->'envelopes', '{}'::jsonb);
  def jsonb := '{
    "romero":  {"nome":"Romero","regra":"mensal","limite_mes":10000,"casa":false,"ordem":1},
    "andreza": {"nome":"Andreza","regra":"diario","limite_mes":6000,"casa":false,"peso_fds":1.5,"colchao":300,"ordem":2},
    "feira":   {"nome":"Feira da casa","regra":"semanal","limite_mes":5000,"casa":true,"ordem":3},
    "casa":    {"nome":"Casa","regra":"mensal","limite_mes":0,"casa":true,"ordem":4}}'::jsonb;
  v_fam uuid := gen_random_uuid(); k text; e jsonb; eid uuid; mapa_env jsonb := '{}'::jsonb; mapa_cart jsonb := '{}'::jsonb;
  l jsonb; v_data date; n int; v_env uuid; v_cart uuid; v_desc text; lim_k text;
  n_lanc int := 0; n_receita int := 0; n_ex int := 0; n_sem_env int := 0; n_parc int := 0; sem_env uuid;
begin
  if p_dono is null then raise exception 'falta o user_id do dono (login real)'; end if;
  insert into produto.familias (id, nome) values (v_fam, coalesce(p_nome, d->'config/familia'->>'nome', d->'familia'->>'nome', 'Família'));
  insert into produto.membros (familia_id, user_id, papel, nome) values (v_fam, p_dono, 'casal', p_nome_pessoa);

  -- envelopes: padrão do app + o que estiver salvo no banco
  for k in select jsonb_object_keys(def || envs_in) loop
    e := coalesce(def->k, '{}'::jsonb) || coalesce(envs_in->k, '{}'::jsonb);
    continue when coalesce((e->>'apagado')::boolean, false);
    -- Feira com o padrão antigo (15.167 nunca editado ou nunca salvo) vira 5.000 a partir de nov/2026 (D-2A-2b)
    if k = 'feira' and (envs_in->'feira' is null or (abs(coalesce((e->>'limite_mes')::numeric,0) - 15167) < 0.01
         and (e->'limites' is null or not exists (select 1 from jsonb_each_text(e->'limites') x where abs(x.value::numeric - 15167) >= 0.01)))) then
      e := e || jsonb_build_object('limite_mes', 5000, 'limites', jsonb_build_object('0000-01', 15167, '2026-11', 5000));
    end if;
    eid := gen_random_uuid();
    insert into produto.envelopes (id, familia_id, nome, regra, limite_mes, colchao, casa, peso_fds)
    values (eid, v_fam, coalesce(e->>'nome', k), coalesce(e->>'regra','mensal'), coalesce((e->>'limite_mes')::numeric, 0),
            coalesce((e->>'colchao')::numeric, 0), coalesce((e->>'casa')::boolean, (e->>'dono') = 'Casa', false), coalesce((e->>'peso_fds')::numeric, 1.5));
    for lim_k in select jsonb_object_keys(coalesce(e->'limites', '{}'::jsonb)) loop
      insert into produto.limites_mes (familia_id, envelope_id, mes, valor) values (v_fam, eid, lim_k, (e->'limites'->>lim_k)::numeric);
    end loop;
    mapa_env := mapa_env || jsonb_build_object(k, eid);
  end loop;

  -- cartões (o removido fica guardado e inativo, pra fatura antiga continuar certa)
  for k in select jsonb_object_keys(coalesce(c->'cartoes', '{}'::jsonb)) loop
    e := c->'cartoes'->k;
    continue when coalesce((e->>'ex')::boolean, false);
    v_cart := gen_random_uuid();
    insert into produto.cartoes (id, familia_id, nome, dia_fechamento, dia_vencimento, ativo)
    values (v_cart, v_fam, coalesce(e->>'nome', k), (e->>'fecha')::smallint, (e->>'vence')::smallint, not coalesce((e->>'apagado')::boolean, false));
    mapa_cart := mapa_cart || jsonb_build_object(k, v_cart);
  end loop;

  -- lançamentos: só gastos (entradas e transferências não têm tabela no produto ainda; vão contadas no resultado)
  for k in select jsonb_object_keys(coalesce(c->'lancamentos', '{}'::jsonb)) loop
    l := c->'lancamentos'->k;
    if coalesce((l->>'ex')::boolean, false) then n_ex := n_ex + 1; continue; end if;
    if coalesce(l->>'tipo','despesa') <> 'despesa' then n_receita := n_receita + 1; continue; end if;
    v_env := (mapa_env->>(l->>'envelope'))::uuid;
    if v_env is null then
      if sem_env is null then
        sem_env := gen_random_uuid();
        insert into produto.envelopes (id, familia_id, nome, regra, limite_mes, casa) values (sem_env, v_fam, 'Sem envelope', 'mensal', 0, false);
      end if;
      v_env := sem_env; n_sem_env := n_sem_env + 1;
    end if;
    v_cart := (mapa_cart->>(l->>'conta'))::uuid;
    v_data := (l->>'data')::date;
    v_desc := l->>'descricao';
    -- parcela 2 em diante: mesmo dia da compra nos meses seguintes (diaPeso do app)
    n := coalesce((l->'parcela'->>'n')::int, 1);
    if n > 1 then
      v_data := make_date(extract(year from (date_trunc('month', v_data) + (n-1) * interval '1 month'))::int,
                          extract(month from (date_trunc('month', v_data) + (n-1) * interval '1 month'))::int,
                          least(extract(day from v_data)::int, extract(day from (date_trunc('month', v_data) + n * interval '1 month' - interval '1 day'))::int));
    end if;
    if (l->'parcela'->>'de')::int > 1 then v_desc := coalesce(v_desc,'') || ' (' || n || '/' || (l->'parcela'->>'de') || ')'; n_parc := n_parc + 1; end if;
    insert into produto.lancamentos (familia_id, envelope_id, cartao_id, valor, data, descricao, autor, criado_em)
    values (v_fam, v_env, v_cart, round((l->>'valor')::numeric, 2), v_data, v_desc, p_dono, coalesce((l->>'criadoEm')::timestamptz, now()));
    n_lanc := n_lanc + 1;
  end loop;

  -- configuração: rendas, metas e dados da família ficam guardados como estão
  insert into produto.config_familia (familia_id, chave, valor, atualizado_por)
  select v_fam, x.chave, x.valor, p_dono from (values
    ('rendas', c->'rendas'), ('metas', c->'metas'), ('familia', d->'config/familia')) x(chave, valor) where x.valor is not null;

  return json_build_object('familia_id', v_fam, 'envelopes', mapa_env, 'cartoes', mapa_cart,
    'gastos_gravados', n_lanc, 'parcelas', n_parc, 'entradas_e_transferencias_fora', n_receita, 'exemplos_fora', n_ex, 'sem_envelope', n_sem_env);
end $$;
revoke execute on function produto.importar_familia_json(jsonb, uuid, text, text) from public, anon, authenticated;
;