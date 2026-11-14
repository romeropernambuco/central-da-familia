-- f_13 (fase final): o IR do motor separado em 2 parâmetros do objetivo.
--   aliq_proj  = IR do caixa até dez/2028 (já existia; padrão 22,5% = "0.225")
--   aliq_renda = IR sobre o rendimento de jan/2029 em diante (NOVO; padrão do motor 15% = "0.15"), texto decimal
-- Mora no mesmo objetivo.parametros: só os 2 adultos editam (mesmas políticas da f_07, com histórico), filha e equipe
-- nunca leem nem gravam. A chave é opcional: objetivo gravado sem ela continua válido (o motor usa o padrão).
-- futuro_entradas devolve em "parametros" -> "aliq_renda" (o jsonb inteiro do objetivo, como os outros parâmetros).
-- Desfazer: banco/migracoes/desfazer/f_13.sql

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

do $$ begin
  if not produto._objetivo_ok('{"gasto_2029_hoje": null, "renda_certa_2029": 0, "margem": "0.10", "taxa_real_trabalho": "0.04",
       "taxa_bruta_ano": {}, "ipca_ano": {}, "aliq_proj": "0.225", "aliq_renda": "0.15", "piso_meses": null, "mes_reajuste": 1,
       "travado_focus": false}'::jsonb) then
    raise exception 'f_13: o objetivo nao aceitou aliq_renda';
  end if;
end $$;

-- portão: todos os testes que existirem no banco têm que continuar 100% ok
do $$
declare t text; n int;
begin
  foreach t in array array['teste_vazamento','teste_contas_casos','teste_guardado','teste_escritorio','teste_tranca_f','teste_futuro_ir'] loop
    if to_regprocedure('produto.' || t || '()') is not null then
      execute format('select count(*) from produto.%I() where not ok', t) into n;
      if n > 0 then raise exception 'f_13: % tem % caso(s) falhando; nada foi gravado', t, n; end if;
    end if;
  end loop;
  select count(*) into n from produto.teste_conta() where not ok;
  if n > 0 then raise exception 'f_13: teste_conta tem % caso(s) falhando; nada foi gravado', n; end if;
end $$;
