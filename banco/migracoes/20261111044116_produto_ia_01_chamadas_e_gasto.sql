
create table produto.ia_chamadas (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references produto.familias(id) on delete cascade,
  user_id uuid not null,
  funcao text not null,
  modelo text not null,
  tokens_entrada integer not null default 0 check (tokens_entrada >= 0),
  tokens_saida integer not null default 0 check (tokens_saida >= 0),
  custo_brl numeric(10,4) not null default 0 check (custo_brl >= 0),
  criado_em timestamptz not null default now()
);
comment on table produto.ia_chamadas is 'Cada chamada de IA (ex.: ia-ler-cupom). custo_brl e estimativa: preco oficial em US$ x dolar a R$ 5,45. So a funcao de servidor grava.';
create index ia_chamadas_familia_mes on produto.ia_chamadas (familia_id, criado_em);

alter table produto.ia_chamadas enable row level security;
alter table produto.ia_chamadas force row level security;

revoke all on produto.ia_chamadas from public, anon, authenticated;
grant select on produto.ia_chamadas to authenticated;
grant select, insert on produto.ia_chamadas to service_role;

create policy ia_chamadas_casal_le on produto.ia_chamadas
  for select to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')));

create or replace function produto.ia_gasto_mes(p_familia uuid)
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(c.custo_brl), 0)::numeric(10,4)
  from produto.ia_chamadas c
  where c.familia_id = p_familia
    and c.criado_em >= (date_trunc('month', now() at time zone 'America/Recife') at time zone 'America/Recife');
$$;
revoke all on function produto.ia_gasto_mes(uuid) from public, anon;
grant execute on function produto.ia_gasto_mes(uuid) to authenticated, service_role;
;