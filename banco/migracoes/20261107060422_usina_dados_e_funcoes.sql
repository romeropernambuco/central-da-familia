create table if not exists public.usina_dados (
  pasta text not null check (pasta in ('clientes','faturas','geracao','config','turnos')),
  item text not null,
  dados jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now(),
  primary key (pasta, item)
);
comment on table public.usina_dados is 'Usina solar (EMPRESA). Separada da família: não somar em caixa_dados. Família só vê distribuição confirmada por Romero.';
alter table public.usina_dados enable row level security;
revoke all on public.usina_dados from anon, authenticated;

create or replace function public.usina_painel() returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'clientes', coalesce((select jsonb_agg(dados || jsonb_build_object('id',item) order by item) from usina_dados where pasta='clientes'),'[]'::jsonb),
    'faturas',  coalesce((select jsonb_object_agg(item, dados) from usina_dados where pasta='faturas'),'{}'::jsonb),
    'geracao',  coalesce((select jsonb_object_agg(item, dados->'kwh') from usina_dados where pasta='geracao'),'{}'::jsonb),
    'config',   (select dados from usina_dados where pasta='config' and item='usina'),
    'atualizado_em', (select max(atualizado_em) from usina_dados)
  );
$$;

create or replace function public.usina_gravar(p_pasta text, p_item text, p_dados jsonb) returns timestamptz language sql security definer set search_path=public as $$
  insert into usina_dados(pasta,item,dados,atualizado_em) values (p_pasta,p_item,p_dados,now())
  on conflict (pasta,item) do update set dados=excluded.dados, atualizado_em=now()
  returning atualizado_em;
$$;

create or replace function public.usina_apagar_exemplos() returns int language sql security definer set search_path=public as $$
  with d as (delete from usina_dados where pasta in ('clientes','faturas') and (dados->>'exemplo')::boolean is true returning 1) select count(*)::int from d;
$$;
revoke execute on function public.usina_painel(), public.usina_gravar(text,text,jsonb), public.usina_apagar_exemplos() from public, anon, authenticated;;