-- Escritório da Família: os 6 funcionários de IA e o registro de cada turno de trabalho.
-- Tabelas novas; não mexe em pessoas, convites, docs nem docs_historico.
create table if not exists public.escritorio_funcionarios (
  id text primary key check (id ~ '^[a-z_]{2,30}$'),
  nome text not null,
  setor text not null,
  turno text not null,           -- quando trabalha, em português
  cor text not null,             -- cor da camisa no escritório
  ordem int not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create table if not exists public.escritorio_turnos (
  id bigint generated always as identity primary key,
  funcionario text not null references public.escritorio_funcionarios(id),
  inicio timestamptz not null default now(),
  fim timestamptz,
  status text not null check (status in ('trabalhando','entregue','precisa_de_voce','aguardando')),
  titulo text not null,
  numero text,                   -- número principal, já formatado (ex.: R$ 31.167)
  detalhe text,                  -- relatório curto
  pendencia text,                -- o que trava, se travar
  fonte text,                    -- de onde veio o dado
  exemplo boolean not null default false
);
create index if not exists escritorio_turnos_func_inicio on public.escritorio_turnos (funcionario, inicio desc);
alter table public.escritorio_funcionarios enable row level security;
alter table public.escritorio_turnos enable row level security;
-- leitura só pra quem está em pessoas (Romero e Andreza); escrita só pelo servidor
create policy escritorio_func_ler on public.escritorio_funcionarios for select to authenticated
  using (exists (select 1 from public.pessoas p where p.user_id = auth.uid() and p.papel in ('romero','andreza')));
create policy escritorio_turnos_ler on public.escritorio_turnos for select to authenticated
  using (exists (select 1 from public.pessoas p where p.user_id = auth.uid() and p.papel in ('romero','andreza')));
comment on table public.escritorio_turnos is 'Cada linha = 1 turno de um funcionário de IA do Escritório da Família';;