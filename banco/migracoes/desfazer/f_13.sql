-- Desfaz f_13. Recusa se algum objetivo já usa aliq_renda; senão volta a conferência de chaves da f_07.
do $$ begin
  if exists (select 1 from produto.objetivo where parametros ? 'aliq_renda') then
    raise exception 'desfazer f_13: ha objetivo com aliq_renda; confira antes';
  end if;
end $$;
create or replace function produto._objetivo_ok(p jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(p) = 'object'
    and (select array_agg(k order by k) from jsonb_object_keys(p) k)
        = array['aliq_proj','gasto_2029_hoje','ipca_ano','margem','mes_reajuste','piso_meses','renda_certa_2029','taxa_bruta_ano','taxa_real_trabalho','travado_focus']
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
