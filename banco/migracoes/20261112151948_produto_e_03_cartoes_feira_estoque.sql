
-- CARTOES: dados sem R$ ficam em cartoes (a pessoa tambem le cartoes); o que e dinheiro fica em cartao_custos (so o casal)
alter table produto.cartoes
  add column banco text check (banco is null or char_length(banco) <= 60),
  add column titular_membro uuid,
  add column final4 text check (final4 is null or final4 ~ '^[0-9]{4}$');
alter table produto.cartoes add constraint cartoes_titular_fk foreign key (familia_id, titular_membro) references produto.membros (familia_id, id);
create index cartoes_titular_idx on produto.cartoes (familia_id, titular_membro);

create table produto.cartao_custos (
  familia_id uuid not null references produto.familias(id) on delete cascade,
  cartao_id uuid not null,
  limite numeric(14,2) check (limite is null or (limite >= 0 and limite <= 100000000)),
  taxa_valor numeric(14,2) check (taxa_valor is null or (taxa_valor >= 0 and taxa_valor <= 1000000)),
  taxa_periodo text check (taxa_periodo is null or taxa_periodo in ('mes','ano')),
  taxa_mes smallint check (taxa_mes is null or taxa_mes between 1 and 12),
  taxa_isenta_acima numeric(14,2) check (taxa_isenta_acima is null or (taxa_isenta_acima >= 0 and taxa_isenta_acima <= 100000000)),
  atualizado_em timestamptz not null default now(),
  primary key (familia_id, cartao_id),
  foreign key (familia_id, cartao_id) references produto.cartoes (familia_id, id) on delete cascade
);

create table produto.cartao_faturas (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references produto.familias(id) on delete cascade,
  cartao_id uuid not null,
  mes text not null check (mes ~ '^[0-9]{4}-[0-9]{2}$'),
  valor_banco numeric(14,2) check (valor_banco is null or (valor_banco >= 0 and valor_banco <= 100000000)),
  diferenca_motivo text check (diferenca_motivo is null or char_length(diferenca_motivo) <= 300),
  paga_em date check (paga_em is null or (paga_em >= '2000-01-01' and paga_em <= '2100-12-31')),
  paga_por uuid,
  atualizado_em timestamptz not null default now(),
  unique (familia_id, cartao_id, mes),
  foreign key (familia_id, cartao_id) references produto.cartoes (familia_id, id) on delete cascade
);

-- FEIRA E ESTOQUE (sem nenhum R$: o valor da feira mora no lancamento)
create table produto.feiras (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references produto.familias(id) on delete cascade,
  semana date not null check (extract(isodow from semana) = 1),
  data date not null check (data >= '2000-01-01' and data <= '2100-12-31'),
  lancamento_id uuid references produto.lancamentos(id) on delete set null,
  loja text check (loja is null or char_length(loja) <= 80),
  nota_caminho text check (nota_caminho is null or char_length(nota_caminho) <= 300),
  sem_nota_motivo text check (sem_nota_motivo is null or char_length(sem_nota_motivo) <= 200),
  feita_por uuid not null default auth.uid(),
  chave uuid,
  criado_em timestamptz not null default now()
);
create index feiras_semana_idx on produto.feiras (familia_id, semana);
create index feiras_lancamento_idx on produto.feiras (lancamento_id);
create unique index feiras_chave_key on produto.feiras (familia_id, chave) where chave is not null;

create table produto.estoque_itens (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references produto.familias(id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 60),
  categoria text check (categoria is null or char_length(categoria) <= 40),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index estoque_itens_familia_idx on produto.estoque_itens (familia_id);

create table produto.estoque_contagens (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references produto.familias(id) on delete cascade,
  semana date not null check (extract(isodow from semana) = 1),
  data date not null,
  contado_por uuid not null default auth.uid(),
  itens jsonb not null default '[]'::jsonb check (jsonb_typeof(itens) = 'array' and octet_length(itens::text) <= 60000),
  criado_em timestamptz not null default now()
);
create index estoque_contagens_semana_idx on produto.estoque_contagens (familia_id, semana);

alter table produto.cartao_custos enable row level security;  alter table produto.cartao_custos force row level security;
alter table produto.cartao_faturas enable row level security; alter table produto.cartao_faturas force row level security;
alter table produto.feiras enable row level security;         alter table produto.feiras force row level security;
alter table produto.estoque_itens enable row level security;  alter table produto.estoque_itens force row level security;
alter table produto.estoque_contagens enable row level security; alter table produto.estoque_contagens force row level security;

revoke all on produto.cartao_custos, produto.cartao_faturas, produto.feiras, produto.estoque_itens, produto.estoque_contagens from public, anon, authenticated;
grant select, insert, update on produto.cartao_custos, produto.cartao_faturas to authenticated;
grant select, insert on produto.feiras, produto.estoque_itens, produto.estoque_contagens to authenticated;
grant update (data, lancamento_id, loja, nota_caminho, sem_nota_motivo) on produto.feiras to authenticated;
grant update (nome, categoria, ativo) on produto.estoque_itens to authenticated;
grant select, insert, update on produto.cartao_custos, produto.cartao_faturas, produto.feiras, produto.estoque_itens, produto.estoque_contagens to service_role;

create policy cartao_custos_ver on produto.cartao_custos for select to authenticated using (familia_id in (select produto.familias_com_papel('casal')));
create policy cartao_custos_criar on produto.cartao_custos for insert to authenticated with check (familia_id in (select produto.familias_com_papel('casal')));
create policy cartao_custos_mudar on produto.cartao_custos for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal'))) with check (familia_id in (select produto.familias_com_papel('casal')));
create policy cartao_faturas_ver on produto.cartao_faturas for select to authenticated using (familia_id in (select produto.familias_com_papel('casal')));
create policy cartao_faturas_criar on produto.cartao_faturas for insert to authenticated with check (familia_id in (select produto.familias_com_papel('casal')));
create policy cartao_faturas_mudar on produto.cartao_faturas for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal'))) with check (familia_id in (select produto.familias_com_papel('casal')));

create policy feiras_ver on produto.feiras for select to authenticated using (familia_id in (select produto.familias_com_papel('casal', 'equipe')));
create policy feiras_criar on produto.feiras for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal', 'equipe')) and feita_por = (select auth.uid()));
create policy feiras_mudar on produto.feiras for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal', 'equipe'))) with check (familia_id in (select produto.familias_com_papel('casal', 'equipe')));
create policy estoque_itens_ver on produto.estoque_itens for select to authenticated using (familia_id in (select produto.familias_com_papel('casal', 'equipe')));
create policy estoque_itens_criar on produto.estoque_itens for insert to authenticated with check (familia_id in (select produto.familias_com_papel('casal', 'equipe')));
create policy estoque_itens_mudar on produto.estoque_itens for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal', 'equipe'))) with check (familia_id in (select produto.familias_com_papel('casal', 'equipe')));
create policy estoque_contagens_ver on produto.estoque_contagens for select to authenticated using (familia_id in (select produto.familias_com_papel('casal', 'equipe')));
create policy estoque_contagens_criar on produto.estoque_contagens for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal', 'equipe')) and contado_por = (select auth.uid()));

-- equipe pode gravar no diario so as respostas da Casa sem valor (prestador, gas, feira, nota e estoque)
alter policy esc_diario_criar on produto.esc_diario
  with check (respondido_por = (select auth.uid())
         and (familia_id in (select produto.familias_com_papel('casal'))
              or (casa and familia_id in (select produto.familias_com_papel('equipe'))
                  and funcionario in ('comprador', 'fiscal_feira') and assunto in ('prestador_veio', 'gas', 'feira_feita', 'feira_nota', 'estoque')
                  and not (dados ?| array['valor', 'diferenca', 'valor_pergunta'])
                  and pergunta !~ 'R\$' and resposta !~ 'R\$')));

-- "colchao" sai de todo texto que a pessoa le (os nomes internos ficam)
do $$ begin
  execute replace(replace(replace(pg_get_functiondef('produto._resumo(uuid,date)'::regprocedure),
    'Colchão = reserva que não entra no valor do dia; se o mês passar, ele cobre até zerar, nunca fica negativo',
    'Reserva = o dinheiro que vocês combinaram nunca gastar. Não entra no valor do dia; se o mês apertar, ela cobre até zerar e nunca fica negativa'),
    'de colchão', 'de reserva'), 'livre menos o colchão', 'livre menos a reserva');
end $$;
;