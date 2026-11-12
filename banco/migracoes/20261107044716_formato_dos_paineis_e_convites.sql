
-- As tabelas criadas 1h antes estavam vazias e não batem com o formato dos painéis. Troca por um formato só, igual ao que os painéis já usam.
drop function if exists public.central_numeros();
drop table if exists public.parcelas_espera, public.parcelas_faturas, public.parcelas_compras, public.parcelas_cartoes, public.parcelas_config,
  public.andreza_eventos, public.andreza_potes, public.andreza_gastos, public.andreza_config,
  public.feira_avarias, public.feira_compras, public.feira_contagens, public.feira_itens, public.feira_tetos cascade;

-- Quem pode criar conta: só e-mail convidado
create table public.convites (
  email text primary key check (email = lower(email)),
  nome text not null,
  papel text not null check (papel in ('romero','andreza','jobson'))
);
alter table public.convites enable row level security;
create policy convites_romero on public.convites for all to authenticated
  using (public.papel_atual() = 'romero') with check (public.papel_atual() = 'romero');
insert into public.convites values ('romeroalbuquerque2@gmail.com','Romero','romero');

-- Antes de criar a conta: barra quem não foi convidado e já confirma quem foi
create or replace function public.antes_de_criar_conta() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  if not exists (select 1 from public.convites where email = lower(new.email)) then
    raise exception 'email nao convidado';
  end if;
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end $$;
create trigger t_antes_de_criar_conta before insert on auth.users
  for each row execute function public.antes_de_criar_conta();

-- Depois de criar: registra o papel da pessoa
create or replace function public.depois_de_criar_conta() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  insert into public.pessoas (user_id, nome, papel)
  select new.id, c.nome, c.papel from public.convites c where c.email = lower(new.email)
  on conflict (user_id) do nothing;
  return new;
end $$;
create trigger t_depois_de_criar_conta after insert on auth.users
  for each row execute function public.depois_de_criar_conta();

revoke all on function public.antes_de_criar_conta() from public, anon, authenticated;
revoke all on function public.depois_de_criar_conta() from public, anon, authenticated;

-- Pode mexer em qual painel
create or replace function public.pode_mexer(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select case public.papel_atual()
    when 'romero' then true
    when 'andreza' then p = 'andreza'
    when 'jobson' then p = 'feira'
    else false end
$$;
create or replace function public.pode_ver(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.pode_mexer(p) or (public.papel_atual() = 'andreza' and p = 'feira')
$$;
revoke all on function public.pode_mexer(text) from public, anon;
revoke all on function public.pode_ver(text) from public, anon;
grant execute on function public.pode_mexer(text), public.pode_ver(text) to authenticated;

-- Um formato só pra todos os painéis: painel / coleção / documento
create table public.docs (
  painel text not null check (painel in ('parcelas','andreza','feira','caixa')),
  colecao text not null check (colecao ~ '^[a-z_]{1,40}$'),
  doc_id text not null check (length(doc_id) between 1 and 80),
  dados jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid default auth.uid(),
  primary key (painel, colecao, doc_id)
);
create index docs_painel_colecao on public.docs (painel, colecao);
alter table public.docs enable row level security;
create policy docs_ver on public.docs for select to authenticated using (public.pode_ver(painel));
create policy docs_criar on public.docs for insert to authenticated with check (public.pode_mexer(painel));
create policy docs_mudar on public.docs for update to authenticated using (public.pode_mexer(painel)) with check (public.pode_mexer(painel));
create policy docs_apagar on public.docs for delete to authenticated using (public.pode_mexer(painel));

create or replace function public.carimbo_docs() returns trigger language plpgsql set search_path = public as $$
begin new.atualizado_em := now(); new.atualizado_por := auth.uid(); return new; end $$;
create trigger t_carimbo_docs before insert or update on public.docs for each row execute function public.carimbo_docs();

-- Histórico: nada se perde sem rastro (apagar ou mudar guarda a versão anterior)
create table public.docs_historico (
  id bigint generated always as identity primary key,
  painel text, colecao text, doc_id text, dados_antes jsonb, acao text,
  feito_em timestamptz not null default now(), feito_por uuid default auth.uid()
);
alter table public.docs_historico enable row level security;
create policy hist_romero on public.docs_historico for select to authenticated using (public.papel_atual() = 'romero');
create or replace function public.guarda_historico() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.docs_historico (painel, colecao, doc_id, dados_antes, acao)
  values (old.painel, old.colecao, old.doc_id, old.dados, lower(tg_op));
  return null;
end $$;
revoke all on function public.guarda_historico() from public, anon, authenticated;
create trigger t_historico after update or delete on public.docs for each row execute function public.guarda_historico();
;