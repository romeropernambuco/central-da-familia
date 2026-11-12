create schema if not exists produto;
comment on schema produto is 'Produto Central da Familia (multi-familia). Area separada do schema public. Cada linha tem familia_id.';

create table produto.familias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  exemplo boolean not null default false,
  criado_em timestamptz not null default now()
);

create table produto.envelopes (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references produto.familias(id) on delete cascade,
  nome text not null,
  regra text not null default 'mensal' check (regra in ('mensal','diario','semanal')),
  limite_mes numeric(12,2) not null default 0 check (limite_mes >= 0),
  colchao numeric(12,2) not null default 0 check (colchao >= 0),
  casa boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (familia_id, id)
);
comment on column produto.envelopes.casa is 'true = envelope Casa/Feira, o unico que a equipe da casa ve e lanca';

create table produto.membros (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references produto.familias(id) on delete cascade,
  user_id uuid not null,
  papel text not null check (papel in ('casal','pessoa','equipe')),
  nome text not null,
  envelope_id uuid,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (familia_id, id),
  unique (familia_id, user_id),
  foreign key (familia_id, envelope_id) references produto.envelopes(familia_id, id) on delete set null (envelope_id)
);
comment on column produto.membros.user_id is 'id do login (auth.users). Sem FK de proposito enquanto existem familias de exemplo com uuid ficticio; ver COFRE.md';

create table produto.limites_mes (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references produto.familias(id) on delete cascade,
  envelope_id uuid not null,
  mes text not null check (mes ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  valor numeric(12,2) not null check (valor >= 0),
  atualizado_em timestamptz not null default now(),
  unique (envelope_id, mes),
  foreign key (familia_id, envelope_id) references produto.envelopes(familia_id, id) on delete cascade
);

create table produto.cartoes (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references produto.familias(id) on delete cascade,
  nome text not null,
  dia_fechamento smallint check (dia_fechamento between 1 and 31),
  dia_vencimento smallint check (dia_vencimento between 1 and 31),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (familia_id, id)
);

create table produto.lancamentos (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references produto.familias(id) on delete cascade,
  envelope_id uuid not null,
  cartao_id uuid,
  valor numeric(12,2) not null,
  data date not null default ((now() at time zone 'America/Recife')::date),
  descricao text,
  autor uuid not null default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  apagado_em timestamptz,
  foreign key (familia_id, envelope_id) references produto.envelopes(familia_id, id),
  foreign key (familia_id, cartao_id) references produto.cartoes(familia_id, id)
);
comment on column produto.lancamentos.apagado_em is 'lixeira: preenchido = apagado, pode voltar';

create table produto.config_familia (
  familia_id uuid not null references produto.familias(id) on delete cascade,
  chave text not null,
  valor jsonb not null,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid default auth.uid(),
  primary key (familia_id, chave)
);

create table produto.eventos (
  id bigint generated always as identity primary key,
  familia_id uuid not null references produto.familias(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  tipo text not null,
  segundos numeric(8,2),
  criado_em timestamptz not null default now()
);

create table produto.acesso_equipe (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references produto.familias(id) on delete cascade,
  membro_id uuid not null,
  codigo_hash text not null,
  expira_em timestamptz not null,
  tentativas smallint not null default 0,
  criado_em timestamptz not null default now(),
  foreign key (familia_id, membro_id) references produto.membros(familia_id, id) on delete cascade
);
comment on column produto.acesso_equipe.codigo_hash is 'hash bcrypt (extensions.crypt) do codigo de 4 numeros; o codigo em si nunca fica gravado';

-- indices de chave estrangeira e de filtro por familia
create index on produto.envelopes (familia_id);
create index on produto.membros (user_id);
create index on produto.membros (familia_id, envelope_id);
create index on produto.limites_mes (familia_id, envelope_id);
create index on produto.cartoes (familia_id);
create index on produto.lancamentos (familia_id, envelope_id);
create index on produto.lancamentos (familia_id, cartao_id);
create index on produto.lancamentos (autor);
create index on produto.lancamentos (familia_id, data);
create index on produto.eventos (familia_id, criado_em);
create index on produto.eventos (user_id);
create index on produto.acesso_equipe (familia_id, membro_id);

-- atualizado_em automatico
create function produto.tocar_atualizado_em() returns trigger
language plpgsql set search_path = '' as $$
begin new.atualizado_em := now(); return new; end $$;
revoke execute on function produto.tocar_atualizado_em() from public, anon, authenticated;

create trigger lancamentos_atualizado before update on produto.lancamentos for each row execute function produto.tocar_atualizado_em();
create trigger config_atualizado before update on produto.config_familia for each row execute function produto.tocar_atualizado_em();
create trigger limites_atualizado before update on produto.limites_mes for each row execute function produto.tocar_atualizado_em();;