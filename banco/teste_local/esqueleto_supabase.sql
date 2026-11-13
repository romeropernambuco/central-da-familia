-- Esqueleto mínimo do Supabase para o banco de teste LOCAL (Postgres 16).
-- Roda como supabase_admin (superusuário do cluster local), antes de todas as migrações.
-- Copia do projeto real (conferido com select em 13/11/26): papéis, quem é membro de quem,
-- bypassrls, colunas de auth.users e auth.identities, privilégios padrão do schema public.
-- Nada aqui é dado de família. Stubs anotados com "STUB".

-- papéis (iguais ao real: postgres NÃO é superusuário, mas ignora RLS e é membro de anon/authenticated/service_role)
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator login noinherit;
create role supabase_auth_admin nologin;
create role postgres login createrole bypassrls;
grant anon, authenticated, service_role to authenticator;
grant anon, authenticated, service_role, authenticator to postgres;

alter database central_teste owner to postgres;
grant all on schema public to postgres;
grant usage on schema public to anon, authenticated, service_role;

-- extensões (no real: pgcrypto e uuid-ossp no schema extensions)
create schema extensions;
grant usage on schema extensions to postgres, anon, authenticated, service_role;
create extension pgcrypto with schema extensions;
create extension "uuid-ossp" with schema extensions;
grant execute on all functions in schema extensions to postgres, anon, authenticated, service_role;

-- schema auth (dono supabase_auth_admin, postgres com tudo, como no real)
create schema auth authorization supabase_auth_admin;
grant usage on schema auth to postgres, anon, authenticated, service_role;
set role supabase_auth_admin;
create table auth.users (
  instance_id uuid, id uuid not null primary key, aud varchar, role varchar, email varchar,
  encrypted_password varchar, email_confirmed_at timestamptz, invited_at timestamptz,
  confirmation_token varchar, confirmation_sent_at timestamptz, recovery_token varchar,
  recovery_sent_at timestamptz, email_change_token_new varchar, email_change varchar,
  email_change_sent_at timestamptz, last_sign_in_at timestamptz, raw_app_meta_data jsonb,
  raw_user_meta_data jsonb, is_super_admin boolean, created_at timestamptz, updated_at timestamptz,
  phone text unique default null, phone_confirmed_at timestamptz, phone_change text default '',
  phone_change_token varchar default '', phone_change_sent_at timestamptz, confirmed_at timestamptz,
  email_change_token_current varchar default '', email_change_confirm_status smallint default 0,
  banned_until timestamptz, reauthentication_token varchar default '', reauthentication_sent_at timestamptz,
  is_sso_user boolean not null default false, deleted_at timestamptz, is_anonymous boolean not null default false
);
create table auth.identities (
  provider_id text not null, user_id uuid not null references auth.users(id) on delete cascade,
  identity_data jsonb not null, provider text not null, last_sign_in_at timestamptz,
  created_at timestamptz, updated_at timestamptz, email text,
  id uuid not null default gen_random_uuid() primary key, unique (provider_id, provider)
);
-- funções de sessão do Supabase (mesmo corpo do GoTrue/Supabase)
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
create function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'))::text $$;
create function auth.email() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.email', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email'))::text $$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim', true), ''),
                  nullif(current_setting('request.jwt.claims', true), ''))::jsonb $$;
reset role;
grant all on all tables in schema auth to postgres;
grant execute on all functions in schema auth to postgres, anon, authenticated, service_role;

-- STUB pg_cron: a extensão não existe nesta máquina. Schema cron com cron.job e cron.schedule/unschedule
-- que só anotam (nada roda sozinho). A linha "create extension ... pg_cron" da migração produto_12
-- é tirada na hora de aplicar (ver rodar.sh); o resto da migração roda igual.
create schema cron;
create table cron.job (jobid bigserial primary key, schedule text, command text, jobname text unique, active boolean default true);
create function cron.schedule(job_name text, schedule text, command text) returns bigint language sql as $$
  insert into cron.job (jobname, schedule, command) values (job_name, schedule, command)
  on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command returning jobid $$;
create function cron.unschedule(job_name text) returns boolean language sql as $$
  with d as (delete from cron.job where jobname = job_name returning 1) select exists (select 1 from d) $$;
grant usage on schema cron to postgres with grant option;
grant all on all tables in schema cron to postgres with grant option;
grant all on all sequences in schema cron to postgres with grant option;
grant execute on all functions in schema cron to postgres with grant option;

-- privilégios padrão do schema public para objetos criados por postgres: o padrão clássico do Supabase
-- (tudo para anon, authenticated e service_role). As migrações tiram o que precisam tirar
-- (ex.: fechar_brecha_chave_publica). Resultado conferido tabela a tabela com o real (sem o "m", que é do PG17).
alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on functions to anon, authenticated, service_role;

-- STUB storage: só o necessário para a migração produto_e_08 (bucket "notas" e políticas em storage.objects).
-- No real o dono é supabase_storage_admin; aqui o dono é postgres para ele poder criar as políticas.
create schema storage authorization postgres;
grant usage on schema storage to anon, authenticated, service_role;
set role postgres;
create table storage.buckets (
  id text primary key, name text not null unique, owner uuid, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[], created_at timestamptz default now(), updated_at timestamptz default now()
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text,
  owner uuid, created_at timestamptz default now(), updated_at timestamptz default now(), metadata jsonb
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language plpgsql immutable as $$
declare _parts text[]; begin select string_to_array(name, '/') into _parts; return _parts[1:array_length(_parts, 1) - 1]; end $$;
grant all on storage.buckets, storage.objects to anon, authenticated, service_role;
reset role;
