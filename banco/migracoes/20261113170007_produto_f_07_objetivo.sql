-- f_07 (fase final): os parâmetros do objetivo (viver de rendimento a partir de jan/2029), editáveis pelos 2,
-- com histórico de quem mudou, quando, antes e depois. Chaves EXATAS do item 4 do ECONOMISTA.md:
--   gasto_2029_hoje (centavos, inteiro; nulo = [confirmar]), renda_certa_2029 (centavos), margem, taxa_real_trabalho,
--   aliq_proj (taxas em texto decimal, ex.: "0.1000"), taxa_bruta_ano e ipca_ano ({"2026": "0.1375", ...}),
--   piso_meses (inteiro; nulo = [confirmar]), mes_reajuste (1 a 12), travado_focus (sim/não).
-- Nenhum valor real aqui: a família grava os dela pela tela. Ver e mexer: só o casal. Histórico: só leitura, gravado pelo banco.
-- Desfazer: banco/migracoes/desfazer/f_07.sql

create function produto._objetivo_ok(p jsonb) returns boolean
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
revoke all on function produto._objetivo_ok(jsonb) from public, anon;
grant execute on function produto._objetivo_ok(jsonb) to authenticated, service_role;

create table produto.objetivo (
  familia_id uuid primary key references produto.familias(id) on delete cascade,
  parametros jsonb not null constraint objetivo_parametros_ok check (coalesce(produto._objetivo_ok(parametros), false)),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid default auth.uid()
);
comment on table produto.objetivo is 'Parâmetros do objetivo 2029 (f_07). Taxas em texto decimal, dinheiro em centavos.';

create table produto.objetivo_historico (
  id bigint generated always as identity primary key,
  familia_id uuid not null references produto.familias(id) on delete cascade,
  quem uuid,
  quando timestamptz not null default now(),
  antes jsonb,
  depois jsonb not null
);
create index objetivo_historico_familia on produto.objetivo_historico (familia_id, quando);

create function produto._objetivo_guardar_historico() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.parametros is not distinct from old.parametros then return new; end if;
  new.atualizado_em := now();
  new.atualizado_por := (select auth.uid());
  insert into produto.objetivo_historico (familia_id, quem, antes, depois)
  values (new.familia_id, (select auth.uid()), case when tg_op = 'UPDATE' then old.parametros end, new.parametros);
  return new;
end $$;
revoke all on function produto._objetivo_guardar_historico() from public, anon, authenticated;
create trigger objetivo_historico_t before insert or update on produto.objetivo
  for each row execute function produto._objetivo_guardar_historico();

alter table produto.objetivo enable row level security;
alter table produto.objetivo_historico enable row level security;
create policy objetivo_ver on produto.objetivo for select to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')));
create policy objetivo_criar on produto.objetivo for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal')));
create policy objetivo_mudar on produto.objetivo for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')))
  with check (familia_id in (select produto.familias_com_papel('casal')));
create policy objetivo_historico_ver on produto.objetivo_historico for select to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')));

revoke all on produto.objetivo, produto.objetivo_historico from public, anon, authenticated;
grant select, insert on produto.objetivo to authenticated;
grant update (parametros) on produto.objetivo to authenticated;
grant select on produto.objetivo_historico to authenticated;
grant select, insert, update on produto.objetivo to service_role;
grant select on produto.objetivo_historico to service_role;

do $$ begin
  execute replace(pg_get_functiondef('produto.exportar_familia(uuid)'::regprocedure),
    $a$    'uso_da_ia', $a$,
    $b$    'objetivo', (select to_json(x) from produto.objetivo x where x.familia_id = f),
    'objetivo_historico', (select coalesce(json_agg(x order by x.quando), '[]') from produto.objetivo_historico x where x.familia_id = f),
    'uso_da_ia', $b$);
end $$;

-- portão: todos os testes que existirem no banco têm que continuar 100% ok
do $$
declare t text; n int;
begin
  foreach t in array array['teste_vazamento','teste_contas_casos','teste_guardado','teste_escritorio','teste_tranca_f','teste_futuro_ir'] loop
    if to_regprocedure('produto.' || t || '()') is not null then
      execute format('select count(*) from produto.%I() where not ok', t) into n;
      if n > 0 then raise exception 'f_07: % tem % caso(s) falhando; nada foi gravado', t, n; end if;
    end if;
  end loop;
  select count(*) into n from produto.teste_conta() where not ok;
  if n > 0 then raise exception 'f_07: teste_conta tem % caso(s) falhando; nada foi gravado', n; end if;
end $$;
