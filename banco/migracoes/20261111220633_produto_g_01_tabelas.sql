
-- Guardado (caixinha): indices, aplicacoes e movimentos. So o casal ve e mexe.
create table produto.pat_indices (
  data date primary key,
  cdi_dia numeric(12,8) check (cdi_dia is null or (cdi_dia > 0 and cdi_dia < 0.5)),
  selic_meta numeric(6,2) check (selic_meta is null or (selic_meta >= 0 and selic_meta < 100)),
  fonte text not null default 'manual' check (char_length(fonte) between 1 and 60),
  atualizado_em timestamptz not null default now()
);
comment on table produto.pat_indices is 'CDI do dia em % ao dia (ex.: 0.050788) e Selic meta em % ao ano. Global, so leitura pro app.';

create table produto.pat_aplicacoes (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references produto.familias(id) on delete cascade,
  titular_membro uuid,
  nome text not null check (char_length(btrim(nome)) between 1 and 60),
  banco text not null check (char_length(btrim(banco)) between 1 and 60),
  tipo text not null check (tipo in ('caixinha','cdb','lci_lca','poupanca','tesouro_selic')),
  pct_cdi numeric(7,2) not null default 100 check (pct_cdi >= 0 and pct_cdi <= 300),
  isento_ir boolean not null default false,
  liquidez text not null default 'diaria' check (liquidez in ('diaria','vencimento')),
  vence_em date check (vence_em is null or (vence_em >= '2000-01-01' and vence_em <= '2100-12-31')),
  chave uuid,
  criado_por uuid not null default auth.uid(),
  criado_em timestamptz not null default now(),
  encerrada_em timestamptz,
  unique (familia_id, id),
  foreign key (familia_id, titular_membro) references produto.membros (familia_id, id)
);
create index pat_aplicacoes_titular_idx on produto.pat_aplicacoes (familia_id, titular_membro);
create unique index pat_aplicacoes_chave_key on produto.pat_aplicacoes (familia_id, chave) where chave is not null;

create table produto.pat_movimentos (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references produto.familias(id) on delete cascade,
  aplicacao_id uuid not null,
  data date not null default ((now() at time zone 'America/Recife')::date) check (data >= '2000-01-01' and data <= '2100-12-31'),
  tipo text not null check (tipo in ('aporte','resgate','saldo_conferido')),
  valor numeric(14,2) not null check (valor >= 0 and valor <= 100000000 and (tipo = 'saldo_conferido' or valor > 0)),
  chave uuid not null,
  autor uuid not null default auth.uid(),
  criado_em timestamptz not null default now(),
  anulado_em timestamptz,
  foreign key (familia_id, aplicacao_id) references produto.pat_aplicacoes (familia_id, id) on delete cascade,
  unique (familia_id, chave)
);
create index pat_movimentos_aplicacao_data_idx on produto.pat_movimentos (familia_id, aplicacao_id, data);

alter table produto.pat_indices enable row level security;
alter table produto.pat_indices force row level security;
alter table produto.pat_aplicacoes enable row level security;
alter table produto.pat_aplicacoes force row level security;
alter table produto.pat_movimentos enable row level security;
alter table produto.pat_movimentos force row level security;

revoke all on produto.pat_indices, produto.pat_aplicacoes, produto.pat_movimentos from public, anon, authenticated;
grant select, insert on produto.pat_indices to authenticated;
grant update (cdi_dia, selic_meta, fonte, atualizado_em) on produto.pat_indices to authenticated;
grant select, insert on produto.pat_aplicacoes to authenticated;
grant update (nome, banco, pct_cdi, isento_ir, liquidez, vence_em, encerrada_em) on produto.pat_aplicacoes to authenticated;
grant select, insert on produto.pat_movimentos to authenticated;
grant update (anulado_em) on produto.pat_movimentos to authenticated;
grant select, insert, update on produto.pat_indices, produto.pat_aplicacoes, produto.pat_movimentos to service_role;

create policy pat_indices_ver on produto.pat_indices for select to authenticated using (true);
create policy pat_indices_informar on produto.pat_indices for insert to authenticated
  with check ((select auth.uid()) in (select d.user_id from produto.donos_produto d));
create policy pat_indices_corrigir on produto.pat_indices for update to authenticated
  using ((select auth.uid()) in (select d.user_id from produto.donos_produto d))
  with check ((select auth.uid()) in (select d.user_id from produto.donos_produto d));

create policy pat_aplicacoes_ver on produto.pat_aplicacoes for select to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')));
create policy pat_aplicacoes_criar on produto.pat_aplicacoes for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal')) and criado_por = (select auth.uid()));
create policy pat_aplicacoes_mudar on produto.pat_aplicacoes for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')))
  with check (familia_id in (select produto.familias_com_papel('casal')));

create policy pat_movimentos_ver on produto.pat_movimentos for select to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')));
create policy pat_movimentos_criar on produto.pat_movimentos for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal')) and autor = (select auth.uid()));
create policy pat_movimentos_anular on produto.pat_movimentos for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')))
  with check (familia_id in (select produto.familias_com_papel('casal')));

-- CDI de 01/10/2026 a 10/11/2026: a rede daqui nao alcanca o Banco Central, entao vai a taxa de 10/11/26 (0,050788% ao dia, BCB SGS 12) marcada como manual
insert into produto.pat_indices (data, cdi_dia, selic_meta, fonte)
select g::date, 0.050788, 13.75, 'manual'
from generate_series('2026-10-01'::date, '2026-11-10'::date, interval '1 day') g
where extract(isodow from g) < 6 and g::date not in ('2026-10-12', '2026-11-02');
;