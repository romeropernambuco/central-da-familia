-- f_15 (fase final, rodada Patrimônio): imóveis da família.
-- Cada adulto cadastra os SEUS imóveis: apelido, valor estimado, uso (mora, aluga, parado, vende), aluguel bruto por mês,
-- custos por mês (IPTU, condomínio, manutenção), vacância (fração dos meses vazios, texto decimal "0.08"), se tem contrato
-- assinado e até quando, e venda planejada opcional (valor, mês e se tem contrato).
-- Regras de conta (só no motor, nunca aqui): aluguel líquido entra como renda SÓ com contrato; venda só entra com contrato;
-- valor do imóvel é patrimônio mostrado à parte e nunca é sacado; imóvel onde a família mora não rende nada.
-- Quem vê: o casal lê tudo, com o dono; cada um grava só os seus; filha e equipe nada; ninguém apaga linha (apagado_em).
-- Parâmetro novo no objetivo: aliq_aluguel (IR do aluguel, texto decimal, opcional, como a f_13).
-- Dinheiro em centavos; taxas em texto decimal. Nenhum imóvel real aqui.
-- Desfazer: banco/migracoes/desfazer/f_15.sql

create table produto.imovel (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references produto.familias(id) on delete cascade,
  dono_membro uuid not null,
  apelido text not null check (char_length(btrim(apelido)) between 1 and 60),
  valor_estimado_centavos bigint not null check (valor_estimado_centavos >= 0 and valor_estimado_centavos <= 100000000000),
  uso text not null check (uso in ('mora', 'aluga', 'parado', 'vende')),
  aluguel_centavos bigint not null default 0 check (aluguel_centavos >= 0 and aluguel_centavos <= 10000000000),
  custos_centavos bigint not null default 0 check (custos_centavos >= 0 and custos_centavos <= 10000000000),
  vacancia text not null default '0' check (vacancia ~ '^[0-9]+(\.[0-9]+)?$' and vacancia::numeric <= 1),
  tem_contrato boolean not null default false,
  contrato_ate date check (contrato_ate is null or contrato_ate between date '2000-01-01' and date '2100-12-31'),
  venda_valor_centavos bigint check (venda_valor_centavos is null or (venda_valor_centavos > 0 and venda_valor_centavos <= 100000000000)),
  venda_mes date check (venda_mes is null or (venda_mes = date_trunc('month', venda_mes)::date and venda_mes between date '2000-01-01' and date '2100-12-01')),
  venda_contrato boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid default auth.uid(),
  apagado_em timestamptz,
  unique (familia_id, id),
  foreign key (familia_id, dono_membro) references produto.membros(familia_id, id),
  constraint imovel_venda_completa check ((venda_valor_centavos is null) = (venda_mes is null)),
  constraint imovel_venda_contrato check (venda_contrato = false or venda_valor_centavos is not null)
);
comment on table produto.imovel is 'Imóveis da família (f_15). Centavos; vacância em texto decimal. A conta é do motor.';
create index imovel_familia on produto.imovel (familia_id);

create function produto._imovel_carimbo() returns trigger
language plpgsql set search_path = '' as $$
begin new.atualizado_em := now(); new.atualizado_por := (select auth.uid()); return new; end $$;
revoke all on function produto._imovel_carimbo() from public, anon, authenticated;
create trigger imovel_carimbo before insert or update on produto.imovel
  for each row execute function produto._imovel_carimbo();

alter table produto.imovel enable row level security;
create policy imovel_ver on produto.imovel for select to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')));
create policy imovel_criar on produto.imovel for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal')) and dono_membro = produto.meu_membro(familia_id));
create policy imovel_mudar on produto.imovel for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')) and dono_membro = produto.meu_membro(familia_id))
  with check (familia_id in (select produto.familias_com_papel('casal')) and dono_membro = produto.meu_membro(familia_id));
revoke all on produto.imovel from public, anon, authenticated;
grant select on produto.imovel to authenticated;
grant insert (familia_id, dono_membro, apelido, valor_estimado_centavos, uso, aluguel_centavos, custos_centavos, vacancia,
              tem_contrato, contrato_ate, venda_valor_centavos, venda_mes, venda_contrato) on produto.imovel to authenticated;
grant update (apelido, valor_estimado_centavos, uso, aluguel_centavos, custos_centavos, vacancia, tem_contrato, contrato_ate,
              venda_valor_centavos, venda_mes, venda_contrato, apagado_em) on produto.imovel to authenticated;
grant select, insert, update on produto.imovel to service_role;

-- aliq_aluguel no objetivo (opcional, como a aliq_renda da f_13)
create or replace function produto._objetivo_ok(p jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(p) = 'object'
    and (select array_agg(k order by k) from jsonb_object_keys(p) k where k not in ('aliq_renda', 'aliq_aluguel'))
        = array['aliq_proj','gasto_2029_hoje','ipca_ano','margem','mes_reajuste','piso_meses','renda_certa_2029','taxa_bruta_ano','taxa_real_trabalho','travado_focus']
    -- f_13: aliq_renda (IR sobre o rendimento de 2029 em diante; o motor usa 15% se faltar), texto decimal de 0 a 1
    and (not p ? 'aliq_renda' or (jsonb_typeof(p->'aliq_renda') = 'string' and (p->>'aliq_renda') ~ '^[0-9]+(\.[0-9]+)?$'
                                  and (p->>'aliq_renda')::numeric <= 1))
    -- f_15: aliq_aluguel (IR sobre o aluguel recebido, que o motor desconta do aluguel líquido), texto decimal de 0 a 1
    and (not p ? 'aliq_aluguel' or (jsonb_typeof(p->'aliq_aluguel') = 'string' and (p->>'aliq_aluguel') ~ '^[0-9]+(\.[0-9]+)?$'
                                    and (p->>'aliq_aluguel')::numeric <= 1))
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
  if position($a$    'parametros', (select o.parametros from produto.objetivo o where o.familia_id = f),$a$ in (select prosrc from pg_proc where oid = 'produto.futuro_entradas(uuid)'::regprocedure)) = 0 then
    raise exception 'f_15: trecho nao achado em produto.futuro_entradas(uuid)';
  end if;
  execute replace(pg_get_functiondef('produto.futuro_entradas(uuid)'::regprocedure), $a$    'parametros', (select o.parametros from produto.objetivo o where o.familia_id = f),$a$, $b$    -- f_15: imóveis, só o dado; a conta (aluguel líquido, vacância, IR, contrato, venda) é do motor
    'imoveis', (select coalesce(jsonb_agg(jsonb_build_object(
        -- chaves EXATAS do tipo Imovel do motor (codigo/src/lib/futuro/tipos.ts); centavos e Mes 'AAAA-MM'
        'id', i.id, 'dono', i.dono_membro, 'apelido', i.apelido, 'valor', i.valor_estimado_centavos, 'uso', i.uso,
        'aluguel_bruto', i.aluguel_centavos, 'custos_mes', i.custos_centavos, 'vacancia', i.vacancia,
        'tem_contrato', i.tem_contrato, 'contrato_ate', to_char(i.contrato_ate, 'YYYY-MM'),
        'venda_valor', i.venda_valor_centavos, 'venda_mes', to_char(i.venda_mes, 'YYYY-MM'),
        'venda_contrato', i.venda_contrato) order by i.criado_em, i.id), '[]'::jsonb)
        from produto.imovel i
        where i.familia_id = f and i.apagado_em is null),
    'parametros', (select o.parametros from produto.objetivo o where o.familia_id = f),$b$);
end $$;
do $$ begin
  if position($a$    'uso_da_ia', $a$ in (select prosrc from pg_proc where oid = 'produto.exportar_familia(uuid)'::regprocedure)) = 0 then
    raise exception 'f_15: trecho nao achado em produto.exportar_familia(uuid)';
  end if;
  execute replace(pg_get_functiondef('produto.exportar_familia(uuid)'::regprocedure), $a$    'uso_da_ia', $a$, $b$    'imoveis', (select coalesce(json_agg(to_jsonb(x) || jsonb_build_object('dono_nome', (select o.nome from produto.membros o where o.familia_id = x.familia_id and o.id = x.dono_membro)) order by x.criado_em), '[]') from produto.imovel x where x.familia_id = f),
    'uso_da_ia', $b$);
end $$;

-- portão: todos os testes que existirem no banco têm que continuar 100% ok
do $$
declare t text; n int;
begin
  foreach t in array array['teste_vazamento','teste_contas_casos','teste_guardado','teste_escritorio','teste_tranca_f','teste_futuro_ir'] loop
    if to_regprocedure('produto.' || t || '()') is not null then
      execute format('select count(*) from produto.%I() where not ok', t) into n;
      if n > 0 then raise exception 'f_15: % tem % caso(s) falhando; nada foi gravado', t, n; end if;
    end if;
  end loop;
  select count(*) into n from produto.teste_conta() where not ok;
  if n > 0 then raise exception 'f_15: teste_conta tem % caso(s) falhando; nada foi gravado', n; end if;
end $$;
