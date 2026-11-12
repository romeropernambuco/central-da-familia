
alter table produto.membros alter column user_id drop not null;
alter table produto.membros add column if not exists email text;

alter table produto.envelopes add column if not exists peso_fds numeric(4,2) not null default 1.5;
alter table produto.envelopes add constraint envelopes_peso_fds_check check (peso_fds >= 1 and peso_fds <= 3);
grant update (peso_fds) on produto.envelopes to authenticated;

create table if not exists produto.feriados (data date primary key, nome text not null);
alter table produto.feriados enable row level security;
alter table produto.feriados force row level security;
create policy feriados_ver on produto.feriados for select to authenticated using (true);
grant select on produto.feriados to authenticated;
insert into produto.feriados(data,nome) values
('2026-01-01','Ano-novo'),('2026-02-16','Carnaval'),('2026-02-17','Carnaval'),('2026-03-06','Data Magna de PE'),('2026-04-03','Sexta-feira Santa'),('2026-04-21','Tiradentes'),('2026-05-01','Dia do Trabalho'),('2026-06-04','Corpus Christi'),('2026-06-24','São João'),('2026-07-16','N. Sra. do Carmo'),('2026-09-07','Independência'),('2026-10-12','N. Sra. Aparecida'),('2026-11-02','Finados'),('2026-11-15','Proclamação da República'),('2026-11-20','Consciência Negra'),('2026-12-08','N. Sra. da Conceição'),('2026-12-25','Natal'),
('2027-01-01','Ano-novo'),('2027-02-08','Carnaval'),('2027-02-09','Carnaval'),('2027-03-06','Data Magna de PE'),('2027-03-26','Sexta-feira Santa'),('2027-04-21','Tiradentes'),('2027-05-01','Dia do Trabalho'),('2027-05-27','Corpus Christi'),('2027-06-24','São João'),('2027-07-16','N. Sra. do Carmo'),('2027-09-07','Independência'),('2027-10-12','N. Sra. Aparecida'),('2027-11-02','Finados'),('2027-11-15','Proclamação da República'),('2027-11-20','Consciência Negra'),('2027-12-08','N. Sra. da Conceição'),('2027-12-25','Natal')
on conflict do nothing;

create table if not exists produto.donos_produto (user_id uuid primary key, criado_em timestamptz not null default now());
alter table produto.donos_produto enable row level security;
alter table produto.donos_produto force row level security;
create policy donos_ver_proprio on produto.donos_produto for select to authenticated using (user_id = (select auth.uid()));
grant select on produto.donos_produto to authenticated;

create table if not exists produto.tentativas_equipe (id bigint generated always as identity primary key, user_id uuid not null, ok boolean not null, criado_em timestamptz not null default now());
create index if not exists tentativas_equipe_user_idx on produto.tentativas_equipe(user_id, criado_em);
alter table produto.tentativas_equipe enable row level security;
alter table produto.tentativas_equipe force row level security;
create policy tentativas_ver_proprias on produto.tentativas_equipe for select to authenticated using (user_id = (select auth.uid()));
grant select on produto.tentativas_equipe to authenticated;

create table if not exists produto.teste_resultados (id bigint generated always as identity primary key, rodada uuid not null, rodado_em timestamptz not null default now(), teste text not null, caso text not null, ok boolean not null, detalhe text);
create index if not exists teste_resultados_rodado_idx on produto.teste_resultados(rodado_em);
alter table produto.teste_resultados enable row level security;
alter table produto.teste_resultados force row level security;
create policy teste_resultados_dono on produto.teste_resultados for select to authenticated using ((select auth.uid()) in (select d.user_id from produto.donos_produto d));
grant select on produto.teste_resultados to authenticated;

-- dono do produto lê os eventos (só tipo, segundos e data; nenhum valor) pra calcular os 4 números
create policy eventos_ver_dono on produto.eventos for select to authenticated using ((select auth.uid()) in (select d.user_id from produto.donos_produto d));
-- casal pode apagar a própria família (LGPD)
create policy familias_apagar on produto.familias for delete to authenticated using (id in (select produto.familias_com_papel('casal')));
grant delete on produto.familias to authenticated;
;