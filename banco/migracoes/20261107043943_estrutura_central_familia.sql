
-- ===== PESSOAS E PAPEIS =====
create table public.pessoas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  papel text not null check (papel in ('romero','andreza','jobson')),
  criado_em timestamptz not null default now()
);
comment on table public.pessoas is 'Quem acessa e qual papel tem (romero ve tudo; andreza: andreza + central; jobson: feira)';

create or replace function public.papel_atual() returns text
language sql stable security definer set search_path = public as $$
  select papel from public.pessoas where user_id = auth.uid()
$$;

create or replace function public.hoje_recife() returns date
language sql stable as $$ select (now() at time zone 'America/Recife')::date $$;

-- ===== PASTA PARCELAS (Romero) =====
create table public.parcelas_config (
  id int primary key default 1 check (id = 1),
  renda_livre numeric(12,2) not null default 10000,
  reserva_dia_a_dia numeric(12,2) not null default 4000,
  cota_sem_lancar numeric(12,2) not null default 800,
  atualizado_em timestamptz not null default now()
);
insert into public.parcelas_config default values;

create table public.parcelas_cartoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  dia_vencimento int not null check (dia_vencimento between 1 and 31),
  dias_antes_fechamento int not null default 7 check (dias_antes_fechamento between 0 and 30),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.parcelas_compras (
  id uuid primary key default gen_random_uuid(),
  nome text,
  tipo text not null check (tipo in ('parcelada','pix_dinheiro','assinatura')),
  de_quem text not null default 'romero' check (de_quem in ('romero','andreza','filhos')),
  valor_parcela numeric(12,2) not null check (valor_parcela <> 0),
  n_parcelas int check (n_parcelas between 1 and 24),
  cartao_id uuid references public.parcelas_cartoes(id) on delete set null,
  data_compra date not null default public.hoje_recife(),
  primeira_fatura date not null, -- 1o dia do mes da 1a fatura que cobra
  encerrada_em date,
  exemplo boolean not null default false,
  criado_em timestamptz not null default now()
);

create table public.parcelas_faturas (
  id uuid primary key default gen_random_uuid(),
  cartao_id uuid not null references public.parcelas_cartoes(id) on delete cascade,
  mes date not null, -- 1o dia do mes de vencimento
  total numeric(12,2) not null,
  criado_em timestamptz not null default now(),
  unique (cartao_id, mes)
);

create table public.parcelas_espera (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  valor_parcela numeric(12,2) not null,
  n_parcelas int not null default 1,
  cartao_id uuid references public.parcelas_cartoes(id) on delete set null,
  criado_em timestamptz not null default now(),
  expira_em date not null default (public.hoje_recife() + 7)
);

-- ===== PASTA ANDREZA =====
create table public.andreza_config (
  id int primary key default 1 check (id = 1),
  base_mes numeric(12,2) not null default 6000,
  reserva_imprevisto numeric(12,2) not null default 300,
  peso_normal numeric(4,2) not null default 1,
  peso_fim_de_semana numeric(4,2) not null default 1.5,
  peso_evento numeric(4,2) not null default 2,
  atualizado_em timestamptz not null default now()
);
insert into public.andreza_config default values;

create table public.andreza_gastos (
  id uuid primary key default gen_random_uuid(),
  valor numeric(12,2) not null check (valor > 0),
  tipo text not null check (tipo in ('eu','criancas','imprevisto')),
  dia date not null default public.hoje_recife() check (dia <= public.hoje_recife()),
  nome text,
  exemplo boolean not null default false,
  criado_em timestamptz not null default now()
);

create table public.andreza_potes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  valor numeric(12,2) not null check (valor > 0),
  dia date not null,
  criado_em date not null default public.hoje_recife()
);

create table public.andreza_eventos (
  dia date primary key,
  nome text not null
);

-- ===== PASTA FEIRA (Jobson) =====
create table public.feira_tetos (
  categoria text primary key,
  teto_semana numeric(12,2) not null
);
insert into public.feira_tetos values
 ('carne',1300),('fruta e verdura',450),('lanche',450),
 ('limpeza',300),('mercearia',800),('copa dos funcionarios',200);

create table public.feira_itens (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  categoria text not null references public.feira_tetos(categoria) on update cascade,
  unidade text not null default 'un',
  ativo boolean not null default true
);

create table public.feira_contagens (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.feira_itens(id) on delete cascade,
  semana date not null, -- segunda-feira da semana
  quantidade numeric(10,2) not null check (quantidade >= 0),
  criado_em timestamptz not null default now(),
  unique (item_id, semana)
);

create table public.feira_compras (
  id uuid primary key default gen_random_uuid(),
  semana date not null,
  data date not null default public.hoje_recife(),
  loja text,
  categoria text not null references public.feira_tetos(categoria) on update cascade,
  valor numeric(12,2) not null check (valor > 0),
  tem_nota boolean not null default true,
  foto_nota_url text,
  criado_em timestamptz not null default now()
);

create table public.feira_avarias (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.feira_itens(id) on delete set null,
  quantidade numeric(10,2) not null,
  motivo text,
  data date not null default public.hoje_recife(),
  criado_em timestamptz not null default now()
);

-- ===== ACESSOS (RLS) =====
alter table public.pessoas enable row level security;
create policy pessoas_ver on public.pessoas for select to authenticated
  using (user_id = auth.uid() or public.papel_atual() = 'romero');
create policy pessoas_romero on public.pessoas for all to authenticated
  using (public.papel_atual() = 'romero') with check (public.papel_atual() = 'romero');

do $$
declare t text;
begin
  foreach t in array array['parcelas_config','parcelas_cartoes','parcelas_compras','parcelas_faturas','parcelas_espera'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy so_romero on public.%I for all to authenticated using (public.papel_atual() = ''romero'') with check (public.papel_atual() = ''romero'')', t);
  end loop;
  foreach t in array array['andreza_config','andreza_gastos','andreza_potes','andreza_eventos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy casal on public.%I for all to authenticated using (public.papel_atual() in (''romero'',''andreza'')) with check (public.papel_atual() in (''romero'',''andreza''))', t);
  end loop;
  foreach t in array array['feira_tetos','feira_itens','feira_contagens','feira_compras','feira_avarias'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy feira_lanca on public.%I for all to authenticated using (public.papel_atual() in (''romero'',''jobson'')) with check (public.papel_atual() in (''romero'',''jobson''))', t);
    execute format('create policy feira_andreza_ve on public.%I for select to authenticated using (public.papel_atual() = ''andreza'')', t);
  end loop;
end $$;

-- ===== PASTA CENTRAL: os numeros do dia, calculados no banco =====
create or replace function public.central_numeros()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  hoje date := public.hoje_recife();
  mes date := date_trunc('month', public.hoje_recife())::date;
  seg date := (public.hoje_recife() - ((extract(isodow from public.hoje_recife())::int) - 1));
  r jsonb;
begin
  if public.papel_atual() not in ('romero','andreza') then
    raise exception 'sem acesso';
  end if;
  select jsonb_build_object(
    'atualizado_em', now(),
    'andreza', jsonb_build_object(
      'base_mes', c.base_mes,
      'gasto_mes', coalesce((select sum(valor) from andreza_gastos where dia >= mes and not exemplo),0),
      'gasto_hoje', coalesce((select sum(valor) from andreza_gastos where dia = hoje and not exemplo),0),
      'sobra_mes', c.base_mes - coalesce((select sum(valor) from andreza_gastos where dia >= mes and not exemplo),0)
    ),
    'parcelas', jsonb_build_object(
      'renda_livre', p.renda_livre,
      'reserva', p.reserva_dia_a_dia,
      'parcelas_mes', coalesce((select sum(valor_parcela) from parcelas_compras pc
          where not exemplo and (encerrada_em is null or encerrada_em >= mes)
            and primeira_fatura <= mes
            and (tipo = 'assinatura' or (primeira_fatura + make_interval(months => coalesce(n_parcelas,1) - 1))::date >= mes)),0)
    ),
    'feira', jsonb_build_object(
      'semana', seg,
      'gasto_semana', coalesce((select sum(valor) from feira_compras where semana = seg),0),
      'teto_semana', (select coalesce(sum(teto_semana),0) from feira_tetos)
    ),
    'caixa', null
  ) into r
  from andreza_config c, parcelas_config p;
  -- livre do mes do Romero
  r := jsonb_set(r, '{parcelas,livre_mes}', to_jsonb(
        (r#>>'{parcelas,renda_livre}')::numeric - (r#>>'{parcelas,reserva}')::numeric - (r#>>'{parcelas,parcelas_mes}')::numeric));
  -- Andreza nao ve as parcelas do Romero
  if public.papel_atual() = 'andreza' then
    r := r - 'parcelas';
  end if;
  return r;
end $$;
revoke all on function public.central_numeros() from public, anon;
grant execute on function public.central_numeros() to authenticated;

-- teste de conexao: nao expoe dado nenhum
create or replace function public.ping() returns text language sql stable as $$ select 'central-da-familia ok' $$;
grant execute on function public.ping() to anon, authenticated;
;