-- Desfaz f_15. Recusa se já houver imóvel gravado ou objetivo com aliq_aluguel.
do $$ begin
  if exists (select 1 from produto.imovel) then raise exception 'desfazer f_15: ha imoveis gravados; confira antes'; end if;
  if exists (select 1 from produto.objetivo where parametros ? 'aliq_aluguel') then
    raise exception 'desfazer f_15: ha objetivo com aliq_aluguel; confira antes';
  end if;
end $$;
do $$ begin
  if position($a$    'imoveis', (select coalesce(json_agg(to_jsonb(x) || jsonb_build_object('dono_nome', (select o.nome from produto.membros o where o.familia_id = x.familia_id and o.id = x.dono_membro)) order by x.criado_em), '[]') from produto.imovel x where x.familia_id = f),
    'uso_da_ia', $a$ in (select prosrc from pg_proc where oid = 'produto.exportar_familia(uuid)'::regprocedure)) = 0 then
    raise exception 'desfazer f_15: trecho nao achado em produto.exportar_familia(uuid)';
  end if;
  execute replace(pg_get_functiondef('produto.exportar_familia(uuid)'::regprocedure), $a$    'imoveis', (select coalesce(json_agg(to_jsonb(x) || jsonb_build_object('dono_nome', (select o.nome from produto.membros o where o.familia_id = x.familia_id and o.id = x.dono_membro)) order by x.criado_em), '[]') from produto.imovel x where x.familia_id = f),
    'uso_da_ia', $a$, $b$    'uso_da_ia', $b$);
end $$;
do $$ begin
  if position($a$    -- f_15: imóveis, só o dado; a conta (aluguel líquido, vacância, IR, contrato, venda) é do motor
    'imoveis', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', i.id, 'dono_membro', i.dono_membro, 'dono_nome', o.nome, 'apelido', i.apelido,
        'valor_estimado_centavos', i.valor_estimado_centavos, 'uso', i.uso,
        'aluguel_centavos', i.aluguel_centavos, 'custos_centavos', i.custos_centavos, 'vacancia', i.vacancia,
        'tem_contrato', i.tem_contrato, 'contrato_ate', to_char(i.contrato_ate, 'YYYY-MM-DD'),
        'venda_valor_centavos', i.venda_valor_centavos, 'venda_mes', to_char(i.venda_mes, 'YYYY-MM'),
        'venda_contrato', i.venda_contrato) order by i.criado_em, i.id), '[]'::jsonb)
        from produto.imovel i left join produto.membros o on o.familia_id = i.familia_id and o.id = i.dono_membro
        where i.familia_id = f and i.apagado_em is null),
    'parametros', (select o.parametros from produto.objetivo o where o.familia_id = f),$a$ in (select prosrc from pg_proc where oid = 'produto.futuro_entradas(uuid)'::regprocedure)) = 0 then
    raise exception 'desfazer f_15: trecho nao achado em produto.futuro_entradas(uuid)';
  end if;
  execute replace(pg_get_functiondef('produto.futuro_entradas(uuid)'::regprocedure), $a$    -- f_15: imóveis, só o dado; a conta (aluguel líquido, vacância, IR, contrato, venda) é do motor
    'imoveis', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', i.id, 'dono_membro', i.dono_membro, 'dono_nome', o.nome, 'apelido', i.apelido,
        'valor_estimado_centavos', i.valor_estimado_centavos, 'uso', i.uso,
        'aluguel_centavos', i.aluguel_centavos, 'custos_centavos', i.custos_centavos, 'vacancia', i.vacancia,
        'tem_contrato', i.tem_contrato, 'contrato_ate', to_char(i.contrato_ate, 'YYYY-MM-DD'),
        'venda_valor_centavos', i.venda_valor_centavos, 'venda_mes', to_char(i.venda_mes, 'YYYY-MM'),
        'venda_contrato', i.venda_contrato) order by i.criado_em, i.id), '[]'::jsonb)
        from produto.imovel i left join produto.membros o on o.familia_id = i.familia_id and o.id = i.dono_membro
        where i.familia_id = f and i.apagado_em is null),
    'parametros', (select o.parametros from produto.objetivo o where o.familia_id = f),$a$, $b$    'parametros', (select o.parametros from produto.objetivo o where o.familia_id = f),$b$);
end $$;
create or replace function produto._objetivo_ok(p jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(p) = 'object'
    and (select array_agg(k order by k) from jsonb_object_keys(p) k where k <> 'aliq_renda')
        = array['aliq_proj','gasto_2029_hoje','ipca_ano','margem','mes_reajuste','piso_meses','renda_certa_2029','taxa_bruta_ano','taxa_real_trabalho','travado_focus']
    -- f_13: aliq_renda (IR sobre o rendimento de 2029 em diante; o motor usa 15% se faltar), texto decimal de 0 a 1
    and (not p ? 'aliq_renda' or (jsonb_typeof(p->'aliq_renda') = 'string' and (p->>'aliq_renda') ~ '^[0-9]+(\.[0-9]+)?$'
                                  and (p->>'aliq_renda')::numeric <= 1))
    and (jsonb_typeof(p->'gasto_2029_hoje') = 'null'
         or (jsonb_typeof(p->'gasto_2029_hoje') = 'number' and (p->>'gasto_2029_hoje') ~ '^[0-9]{1,14}$'))
    and jsonb_typeof(p->'renda_certa_2029') = 'number' and (p->>'renda_certa_2029') ~ '^[0-9]{1,14}$'
    and jsonb_typeof(p->'margem') = 'string' and (p->>'margem') ~ '^[0-9]+(\.[0-9]+)?$' and (p->>'margem')::numeric <= 1
    and jsonb_typeof(p->'taxa_real_trabalho') = 'string' and (p->>'taxa_real_trabalho') ~ '^-?[0-9]+(\.[0-9]+)?$'
        and abs((p->>'taxa_real_trabalho')::numeric) <= 1
    and jsonb_typeof(p->'aliq_proj') = 'string' and (p->>'aliq_proj') ~ '^[0-9]+(\.[0-9]+)?$' and (p->>'aliq_proj')::numeric <= 1
    and jsonb_typeof(p->'taxa_bruta_ano') = 'object'
    and not exists (select 1 from jsonb_each(p->'taxa_bruta_ano') e
                     where e.key !~ '^[0-9]{4}$' or jsonb_typeof(e.value) <> 'string' or (e.value #>> '{}') !~ '^-?[0-9]+(\.[0-9]+)?$'
                        or abs((e.value #>> '{}')::numeric) > 1)
    and jsonb_typeof(p->'ipca_ano') = 'object'
    and not exists (select 1 from jsonb_each(p->'ipca_ano') e
                     where e.key !~ '^[0-9]{4}$' or jsonb_typeof(e.value) <> 'string' or (e.value #>> '{}') !~ '^-?[0-9]+(\.[0-9]+)?$'
                        or abs((e.value #>> '{}')::numeric) > 1)
    and (jsonb_typeof(p->'piso_meses') = 'null'
         or (jsonb_typeof(p->'piso_meses') = 'number' and (p->>'piso_meses') ~ '^[0-9]{1,2}$'))
    and jsonb_typeof(p->'mes_reajuste') = 'number' and (p->>'mes_reajuste') ~ '^([1-9]|1[0-2])$'
    and jsonb_typeof(p->'travado_focus') = 'boolean'
$$;
drop table produto.imovel;
drop function produto._imovel_carimbo();
