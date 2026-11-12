
do $$ begin
  execute replace(pg_get_functiondef('produto.teste_guardado()'::regprocedure),
    $a$'sim', case when (produto._guardado_app(a1, '2026-11-19', cdi)->>'iof_se_sacar_hoje')::numeric between 20 and 30 then 'sim' else produto._guardado_app(a1, '2026-11-19', cdi)->>'iof_se_sacar_hoje' end]$a$,
    $b$'31.74', produto._guardado_app(a1, '2026-11-19', cdi)->>'iof_se_sacar_hoje']$b$);
end $$;

-- Escritorio que cobra: lembretes e diario
create table produto.esc_lembretes (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references produto.familias(id) on delete cascade,
  criado_por uuid not null default auth.uid(),
  titulo text not null check (char_length(btrim(titulo)) between 1 and 120),
  detalhe text check (detalhe is null or char_length(detalhe) <= 500),
  quando timestamptz not null,
  repetir text not null default 'nunca' check (repetir in ('nunca','dia','semana','mes','ano')),
  para text not null default 'casal' check (char_length(para) between 2 and 36),
  funcionario text not null default 'secretaria' check (char_length(funcionario) <= 30),
  ativo boolean not null default true,
  feito_em timestamptz,
  chave uuid,
  criado_em timestamptz not null default now()
);
create index esc_lembretes_abertos_idx on produto.esc_lembretes (familia_id, quando) where ativo and feito_em is null;
create unique index esc_lembretes_chave_key on produto.esc_lembretes (familia_id, chave) where chave is not null;

create table produto.esc_diario (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references produto.familias(id) on delete cascade,
  funcionario text not null check (char_length(funcionario) <= 30),
  assunto text not null check (char_length(assunto) <= 40),
  ref text not null check (char_length(ref) <= 120),
  pergunta text not null check (char_length(pergunta) <= 400),
  resposta text not null check (char_length(resposta) <= 400),
  dados jsonb not null default '{}'::jsonb check (octet_length(dados::text) <= 4000),
  respondido_por uuid not null default auth.uid(),
  quando timestamptz not null default now(),
  adiado_ate timestamptz,
  casa boolean not null default false
);
create index esc_diario_ref_idx on produto.esc_diario (familia_id, ref);
create index esc_diario_quando_idx on produto.esc_diario (familia_id, quando desc);
comment on column produto.esc_diario.casa is 'true = pergunta da Casa sem valor em R$ (a unica parte do diario que a equipe enxerga)';

alter table produto.esc_lembretes enable row level security;
alter table produto.esc_lembretes force row level security;
alter table produto.esc_diario enable row level security;
alter table produto.esc_diario force row level security;
revoke all on produto.esc_lembretes, produto.esc_diario from public, anon, authenticated;
grant select, insert on produto.esc_lembretes to authenticated;
grant update (titulo, detalhe, quando, repetir, para, ativo, feito_em) on produto.esc_lembretes to authenticated;
grant select, insert on produto.esc_diario to authenticated;
grant select, insert, update on produto.esc_lembretes, produto.esc_diario to service_role;

create policy esc_lembretes_ver on produto.esc_lembretes for select to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')) and (para <> 'eu' or criado_por = (select auth.uid())));
create policy esc_lembretes_criar on produto.esc_lembretes for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal')) and criado_por = (select auth.uid()));
create policy esc_lembretes_mudar on produto.esc_lembretes for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')) and (para <> 'eu' or criado_por = (select auth.uid())))
  with check (familia_id in (select produto.familias_com_papel('casal')));

create policy esc_diario_ver on produto.esc_diario for select to authenticated
  using (familia_id in (select produto.familias_com_papel('casal'))
         or (casa and familia_id in (select produto.familias_com_papel('equipe'))));
create policy esc_diario_criar on produto.esc_diario for insert to authenticated
  with check (respondido_por = (select auth.uid())
         and (familia_id in (select produto.familias_com_papel('casal'))
              or (casa and familia_id in (select produto.familias_com_papel('equipe'))
                  and funcionario = 'comprador' and assunto in ('prestador_veio', 'gas')
                  and not (dados ?| array['valor', 'diferenca', 'texto', 'valor_pergunta']))));
;