-- Copiado em 22/11/2026 do registro de migrações do banco real (supabase_migrations.schema_migrations,
-- versão 20261121161424). Foi aplicada em 21/11/2026 e não estava no repositório.

-- Etiquetas: o "por que" de um gasto (ex.: Europa nov/26). O envelope continua sendo o "o que".
create table produto.etiquetas (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references produto.familias(id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 60),
  inicio date,
  fim date,
  moeda text not null default 'BRL' check (moeda ~ '^[A-Z]{3}$'),
  pessoas integer check (pessoas between 1 and 50),
  arquivada boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint etiquetas_periodo_ok check (
    (inicio is null and fim is null)
    or (inicio is not null and fim is not null and fim >= inicio and fim - inicio <= 366))
);
create unique index etiquetas_nome_unico on produto.etiquetas (familia_id, lower(btrim(nome)));
create index etiquetas_periodo on produto.etiquetas (familia_id, inicio, fim) where not arquivada;

-- Liga lancamento e etiqueta. ativa=false guarda que alguem TIROU a etiqueta a mao,
-- pra ela nao voltar sozinha quando as datas da viagem forem ajustadas.
create table produto.lancamento_etiquetas (
  lancamento_id uuid not null references produto.lancamentos(id) on delete cascade,
  etiqueta_id uuid not null references produto.etiquetas(id) on delete cascade,
  familia_id uuid not null references produto.familias(id) on delete cascade,
  ativa boolean not null default true,
  automatica boolean not null default false,
  criado_em timestamptz not null default now(),
  primary key (lancamento_id, etiqueta_id)
);
create index lanc_etq_por_etiqueta on produto.lancamento_etiquetas (etiqueta_id) where ativa;
create index lanc_etq_por_familia on produto.lancamento_etiquetas (familia_id);

-- Gasto em moeda de fora: o valor em R$ continua em "valor"; aqui fica o original.
alter table produto.lancamentos
  add column moeda_original text check (moeda_original ~ '^[A-Z]{3}$' and moeda_original <> 'BRL'),
  add column valor_original numeric(14,2) check (valor_original > 0),
  add column cambio numeric(12,6) check (cambio > 0),
  add constraint lanc_moeda_completa check ((moeda_original is null) = (valor_original is null));

-- Acesso: so leitura direta; toda escrita passa pelas funcoes com checagem de papel.
alter table produto.etiquetas enable row level security;
alter table produto.lancamento_etiquetas enable row level security;
revoke all on produto.etiquetas, produto.lancamento_etiquetas from anon, authenticated, public;
grant select on produto.etiquetas, produto.lancamento_etiquetas to authenticated;
create policy etiquetas_ver on produto.etiquetas for select to authenticated
  using (familia_id in (select produto.familias_com_papel('casal', 'pessoa')));
create policy lanc_etq_ver on produto.lancamento_etiquetas for select to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')));

-- Etiqueta automatica: lancamento novo dentro das datas de uma etiqueta ja nasce com ela (ate 3).
create function produto._etiquetar_auto() returns trigger
language plpgsql security definer set search_path to '' as $$
begin
  insert into produto.lancamento_etiquetas (lancamento_id, etiqueta_id, familia_id, automatica)
  select new.id, e.id, new.familia_id, true
    from produto.etiquetas e
   where e.familia_id = new.familia_id
     and not e.arquivada
     and new.data between e.inicio and e.fim
   order by e.inicio desc, e.criado_em
   limit 3
  on conflict do nothing;
  return null;
end $$;
revoke all on function produto._etiquetar_auto() from public, anon, authenticated;
create trigger lancamentos_etiqueta_auto after insert on produto.lancamentos
  for each row execute function produto._etiquetar_auto();
