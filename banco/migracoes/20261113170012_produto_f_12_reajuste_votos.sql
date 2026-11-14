-- f_12 (fase final, revisão M4 e B5 do E4 a E10): o "aprovo" do reajuste do teto sai do JSON da config e vira voto no banco.
--  * produto.reajuste_votos: 1 voto por adulto por mês de vigência (chave única); cada um só grava e muda o PRÓPRIO voto.
--    2 aprovações quase juntas viram 2 linhas: nenhuma apaga a outra.
--  * produto.reajuste_votar(familia, mes_vigencia, teto_centavos, ipca): grava o meu voto (teto e IPCA, em texto decimal)
--    e devolve a situação. Vigência no mês de hoje ou antes é recusada.
--  * produto.reajuste_situacao(familia, mes_vigencia): só lê (quem votou, quem falta, se está aprovado e vale_a_partir).
--  * produto.reajuste_aplicar(familia, envelope, mes_vigencia): o BANCO calcula o limite novo sozinho,
--    limite que valia no mês anterior a vale_a_partir x (1 + IPCA votado), arredondado no centavo, e aplica pelo
--    definir_limite (tranca de sempre: só o que a pessoa ajusta). Nunca usa valor vindo da tela; aplicar de novo dá o
--    mesmo valor (não acumula). Só vale quando todos os adultos ativos do casal votaram no mesmo teto e IPCA (1 basta na
--    família de 1; a filha não vota) e o mês de hoje já chegou em vale_a_partir.
--  * vale_a_partir = o mais tarde entre o mês de vigência votado e o mês SEGUINTE ao último voto (fuso de Recife):
--    "vale no mês seguinte à aprovação", mesmo com voto atrasado (revisão R1).
--  * produto.objetivo_salvar(familia, parametros): o 1º salvar dos 2 ao mesmo tempo não dá erro nem perde nenhum dos 2.
-- Desfazer: banco/migracoes/desfazer/f_12.sql

create table produto.reajuste_votos (
  familia_id uuid not null references produto.familias(id) on delete cascade,
  mes_vigencia date not null check (mes_vigencia = date_trunc('month', mes_vigencia)::date and mes_vigencia between date '2000-01-01' and date '2100-12-01'),
  membro_id uuid not null,
  teto_centavos bigint not null check (teto_centavos > 0 and teto_centavos <= 10000000000),
  ipca text not null check (ipca ~ '^-?0\.[0-9]{1,8}$'),
  votou_em timestamptz not null default now(),
  primary key (familia_id, mes_vigencia, membro_id),
  foreign key (familia_id, membro_id) references produto.membros(familia_id, id)
);
comment on table produto.reajuste_votos is 'Voto de cada adulto no reajuste do teto (f_12): teto e IPCA (texto decimal). 1 por adulto por mês de vigência.';
alter table produto.reajuste_votos enable row level security;
create policy reajuste_votos_ver on produto.reajuste_votos for select to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')));
create policy reajuste_votos_criar on produto.reajuste_votos for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal')) and membro_id = produto.meu_membro(familia_id)
              and mes_vigencia > date_trunc('month', produto._hoje())::date);
create policy reajuste_votos_mudar on produto.reajuste_votos for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')) and membro_id = produto.meu_membro(familia_id))
  with check (familia_id in (select produto.familias_com_papel('casal')) and membro_id = produto.meu_membro(familia_id)
              and mes_vigencia > date_trunc('month', produto._hoje())::date);
revoke all on produto.reajuste_votos from public, anon, authenticated;
grant select on produto.reajuste_votos to authenticated;
grant insert (familia_id, mes_vigencia, membro_id, teto_centavos, ipca) on produto.reajuste_votos to authenticated;
grant update (teto_centavos, ipca) on produto.reajuste_votos to authenticated;
grant select on produto.reajuste_votos to service_role;

-- a hora do voto é sempre a do banco: no insert ninguém escreve votou_em (fica o padrão now()); mudar o voto renova a hora
create function produto._reajuste_voto_carimbo() returns trigger
language plpgsql set search_path = '' as $$
begin new.votou_em := now(); return new; end $$;
revoke all on function produto._reajuste_voto_carimbo() from public, anon, authenticated;
create trigger reajuste_votos_carimbo before update on produto.reajuste_votos
  for each row execute function produto._reajuste_voto_carimbo();

-- o reajuste aprovado: todos os adultos ativos do casal votaram, no mesmo teto e no mesmo IPCA. Devolve teto, IPCA e
-- vale_a_partir; nada (linha vazia) se não estiver aprovado. Roda como dono do banco pra contar, mas só responde a quem
-- é do casal daquela família (equipe, filha e estranho recebem nada)
create function produto._reajuste_aprovado(p_familia uuid, p_mes date)
returns table (teto_centavos bigint, ipca text, vale_a_partir date)
language sql stable security definer set search_path = '' as $$
  select min(v.teto_centavos), min(v.ipca),
         greatest(date_trunc('month', p_mes)::date,
                  (date_trunc('month', max(v.votou_em) at time zone 'America/Recife') + interval '1 month')::date)
    from produto.membros m
    left join produto.reajuste_votos v on v.familia_id = m.familia_id and v.membro_id = m.id
                                      and v.mes_vigencia = date_trunc('month', p_mes)::date
   where m.familia_id = p_familia and m.papel = 'casal' and m.ativo
     and p_familia in (select produto.familias_com_papel('casal'))
  having count(*) > 0 and count(*) filter (where v.membro_id is null) = 0
     and count(distinct v.teto_centavos) = 1 and count(distinct v.ipca) = 1
$$;
revoke all on function produto._reajuste_aprovado(uuid, date) from public, anon;
grant execute on function produto._reajuste_aprovado(uuid, date) to authenticated;

create function produto.reajuste_situacao(familia uuid, mes_vigencia date) returns jsonb
language plpgsql stable set search_path = '' as $$
declare f uuid := reajuste_situacao.familia; m date := date_trunc('month', reajuste_situacao.mes_vigencia)::date; a record;
begin
  if produto.meu_papel(f) is distinct from 'casal' then raise exception 'so o casal ve o reajuste' using errcode = '42501'; end if;
  select * into a from produto._reajuste_aprovado(f, m);
  return jsonb_build_object(
    'mes_vigencia', to_char(m, 'YYYY-MM'),
    'aprovado', a.teto_centavos is not null,
    'teto_aprovado_centavos', a.teto_centavos,
    'ipca_aprovado', a.ipca,
    'vale_a_partir', to_char(a.vale_a_partir, 'YYYY-MM'),
    'ja_vale', a.vale_a_partir is not null and date_trunc('month', produto._hoje())::date >= a.vale_a_partir,
    'votos', (select coalesce(jsonb_agg(jsonb_build_object('membro_id', v.membro_id, 'nome', o.nome, 'teto_centavos', v.teto_centavos,
                                                          'ipca', v.ipca, 'votou_em', v.votou_em) order by v.votou_em), '[]'::jsonb)
                from produto.reajuste_votos v join produto.membros o on o.familia_id = v.familia_id and o.id = v.membro_id
               where v.familia_id = f and v.mes_vigencia = m),
    'faltam', (select coalesce(jsonb_agg(jsonb_build_object('membro_id', o.id, 'nome', o.nome) order by o.criado_em), '[]'::jsonb)
                 from produto.membros o
                where o.familia_id = f and o.papel = 'casal' and o.ativo
                  and not exists (select 1 from produto.reajuste_votos v where v.familia_id = f and v.mes_vigencia = m and v.membro_id = o.id)));
end $$;
revoke all on function produto.reajuste_situacao(uuid, date) from public, anon;
grant execute on function produto.reajuste_situacao(uuid, date) to authenticated;

create function produto.reajuste_votar(familia uuid, mes_vigencia date, teto_centavos bigint, ipca text) returns jsonb
language plpgsql set search_path = '' as $$
declare f uuid := reajuste_votar.familia; m date := date_trunc('month', reajuste_votar.mes_vigencia)::date;
begin
  if produto.meu_papel(f) is distinct from 'casal' then raise exception 'so os adultos do casal votam o reajuste' using errcode = '42501'; end if;
  if reajuste_votar.teto_centavos is null or reajuste_votar.teto_centavos <= 0 then raise exception 'o teto tem que ser maior que zero' using errcode = '22023'; end if;
  if reajuste_votar.ipca is null or reajuste_votar.ipca !~ '^-?0\.[0-9]{1,8}$' then raise exception 'o IPCA vem em texto decimal, ex.: 0.0450' using errcode = '22023'; end if;
  if m is null or m <= date_trunc('month', produto._hoje())::date then
    raise exception 'o reajuste vale a partir de um mes que ainda nao comecou' using errcode = '22023';
  end if;
  insert into produto.reajuste_votos as rv (familia_id, mes_vigencia, membro_id, teto_centavos, ipca)
  values (f, m, produto.meu_membro(f), reajuste_votar.teto_centavos, reajuste_votar.ipca)
  on conflict on constraint reajuste_votos_pkey do update set teto_centavos = excluded.teto_centavos, ipca = excluded.ipca;
  return produto.reajuste_situacao(f, m);
end $$;
revoke all on function produto.reajuste_votar(uuid, date, bigint, text) from public, anon;
grant execute on function produto.reajuste_votar(uuid, date, bigint, text) to authenticated;

create function produto.reajuste_aplicar(familia uuid, envelope uuid, mes_vigencia date) returns json
language plpgsql set search_path = '' as $$
declare f uuid := reajuste_aplicar.familia; m date := date_trunc('month', reajuste_aplicar.mes_vigencia)::date; a record; base numeric;
begin
  if produto.meu_papel(f) is distinct from 'casal' then raise exception 'so o casal aplica o reajuste' using errcode = '42501'; end if;
  select * into a from produto._reajuste_aprovado(f, m);
  if a.teto_centavos is null then
    raise exception 'o reajuste ainda nao foi aprovado por todos os adultos no mesmo teto e IPCA' using errcode = '42501';
  end if;
  if date_trunc('month', produto._hoje())::date < a.vale_a_partir then
    raise exception 'o reajuste vale a partir de %', to_char(a.vale_a_partir, 'MM/YYYY') using errcode = '22023';
  end if;
  -- o limite que valia antes do reajuste, vezes (1 + IPCA votado); aplicar de novo dá o mesmo número
  base := produto._lim(reajuste_aplicar.envelope, (a.vale_a_partir - 1));
  return produto.definir_limite(f, reajuste_aplicar.envelope, round(base * (1 + a.ipca::numeric), 2));
end $$;
revoke all on function produto.reajuste_aplicar(uuid, uuid, date) from public, anon;
grant execute on function produto.reajuste_aplicar(uuid, uuid, date) to authenticated;

-- B5: o objetivo grava de um jeito só, sem erro quando os 2 salvam pela 1ª vez juntos
create function produto.objetivo_salvar(familia uuid, parametros jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare f uuid := objetivo_salvar.familia;
begin
  if produto.meu_papel(f) is distinct from 'casal' then raise exception 'so o casal muda o objetivo' using errcode = '42501'; end if;
  insert into produto.objetivo (familia_id, parametros) values (f, objetivo_salvar.parametros)
  on conflict (familia_id) do nothing;
  if not found then
    update produto.objetivo o set parametros = objetivo_salvar.parametros where o.familia_id = f;
  end if;
  return (select o.parametros from produto.objetivo o where o.familia_id = f);
end $$;
revoke all on function produto.objetivo_salvar(uuid, jsonb) from public, anon;
grant execute on function produto.objetivo_salvar(uuid, jsonb) to authenticated;

-- portão: todos os testes que existirem no banco têm que continuar 100% ok
do $$
declare t text; n int;
begin
  foreach t in array array['teste_vazamento','teste_contas_casos','teste_guardado','teste_escritorio','teste_tranca_f','teste_futuro_ir'] loop
    if to_regprocedure('produto.' || t || '()') is not null then
      execute format('select count(*) from produto.%I() where not ok', t) into n;
      if n > 0 then raise exception 'f_12: % tem % caso(s) falhando; nada foi gravado', t, n; end if;
    end if;
  end loop;
  select count(*) into n from produto.teste_conta() where not ok;
  if n > 0 then raise exception 'f_12: teste_conta tem % caso(s) falhando; nada foi gravado', n; end if;
end $$;
