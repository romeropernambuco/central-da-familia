-- f_10 (fase final): tabela do Focus (Banco Central), a referência de juro e inflação por ano que o motor de 2029 usa
-- quando a família não travou a própria taxa. Leitura: todo mundo logado (é dado público de mercado, sem R$ da família).
-- Escrita: só o dono do produto (produto.donos_produto). Carga semanal feita por ele, conferida; nunca automática.
-- Taxas em TEXTO decimal, igual ao objetivo (revisão B9): "0.1375" = 13,75% ao ano. Nenhum valor é carregado aqui.
-- Desfazer: banco/migracoes/desfazer/f_10.sql

create table produto.focus_indices (
  ano smallint not null check (ano between 2000 and 2100),
  selic_fim text not null check (selic_fim ~ '^-?0\.[0-9]{1,8}$'),
  ipca text not null check (ipca ~ '^-?0\.[0-9]{1,8}$'),
  divulgado_em date not null check (divulgado_em between date '2000-01-01' and date '2100-12-31'),
  fonte text not null check (char_length(btrim(fonte)) between 1 and 200),
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now(),
  primary key (ano, divulgado_em)
);
comment on table produto.focus_indices is 'Focus por ano (f_10): Selic do fim do ano e IPCA, com data e fonte. Só o dono do produto grava.';
alter table produto.focus_indices enable row level security;
create policy focus_ver on produto.focus_indices for select to authenticated using (true);
create policy focus_informar on produto.focus_indices for insert to authenticated
  with check ((select auth.uid()) in (select d.user_id from produto.donos_produto d));
create policy focus_corrigir on produto.focus_indices for update to authenticated
  using ((select auth.uid()) in (select d.user_id from produto.donos_produto d))
  with check ((select auth.uid()) in (select d.user_id from produto.donos_produto d));
revoke all on produto.focus_indices from public, anon, authenticated;
grant select, insert on produto.focus_indices to authenticated;
grant update (selic_fim, ipca, fonte) on produto.focus_indices to authenticated;
grant select, insert, update on produto.focus_indices to service_role;

-- portão: todos os testes que existirem no banco têm que continuar 100% ok
do $$
declare t text; n int;
begin
  foreach t in array array['teste_vazamento','teste_contas_casos','teste_guardado','teste_escritorio','teste_tranca_f','teste_futuro_ir'] loop
    if to_regprocedure('produto.' || t || '()') is not null then
      execute format('select count(*) from produto.%I() where not ok', t) into n;
      if n > 0 then raise exception 'f_10: % tem % caso(s) falhando; nada foi gravado', t, n; end if;
    end if;
  end loop;
  select count(*) into n from produto.teste_conta() where not ok;
  if n > 0 then raise exception 'f_10: teste_conta tem % caso(s) falhando; nada foi gravado', n; end if;
end $$;
