create or replace function produto.criar_familia(nome text, nome_pessoa text) returns json language plpgsql volatile security definer set search_path = '' as
$$
declare uid uuid := auth.uid(); v_fam uuid := gen_random_uuid();
begin
  if uid is null then raise exception 'precisa entrar com o e-mail antes' using errcode = '42501'; end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'login da equipe nao cria familia' using errcode = '42501'; end if;
  if coalesce(trim(criar_familia.nome), '') = '' or coalesce(trim(nome_pessoa), '') = '' then raise exception 'falta o nome da familia ou o seu nome' using errcode = '22023'; end if;
  if (select count(*) from produto.membros m where m.user_id = uid and m.papel = 'casal') >= 3 then raise exception 'limite de 3 familias por pessoa' using errcode = '54000'; end if;
  insert into produto.familias (id, nome) values (v_fam, trim(criar_familia.nome));
  insert into produto.membros (familia_id, user_id, papel, nome) values (v_fam, uid, 'casal', trim(nome_pessoa));
  insert into produto.envelopes (familia_id, nome, regra, limite_mes, casa) values
    (v_fam, 'Pessoa 1', 'mensal', 0, false),
    (v_fam, 'Pessoa 2', 'diario', 0, false),
    (v_fam, 'Feira semanal', 'semanal', 0, true),
    (v_fam, 'Casa mensal', 'mensal', 0, true);
  return json_build_object('familia_id', v_fam);
end $$;

create or replace function produto.convidar(familia uuid, papel text, nome text, email text default null) returns json language plpgsql volatile security invoker set search_path = '' as
$$
declare v_mid uuid := gen_random_uuid(); v_cod text; v_exp timestamptz := now() + interval '24 hours';
begin
  if produto.meu_papel(convidar.familia) is distinct from 'casal' then raise exception 'so o casal convida' using errcode = '42501'; end if;
  if convidar.papel not in ('casal','pessoa','equipe') then raise exception 'papel tem que ser casal, pessoa ou equipe' using errcode = '22023'; end if;
  if coalesce(trim(convidar.nome),'') = '' then raise exception 'falta o nome' using errcode = '22023'; end if;
  if convidar.papel <> 'equipe' and coalesce(trim(convidar.email),'') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'falta um e-mail valido' using errcode = '22023'; end if;
  insert into produto.membros (id, familia_id, user_id, papel, nome, email)
  values (v_mid, convidar.familia, null, convidar.papel, trim(convidar.nome), lower(nullif(trim(convidar.email),'')));
  if convidar.papel = 'equipe' then
    v_cod := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 10000)::text, 4, '0');
    insert into produto.acesso_equipe (familia_id, membro_id, codigo_hash, expira_em)
    values (convidar.familia, v_mid, extensions.crypt(v_cod, extensions.gen_salt('bf', 8)), v_exp);
    return json_build_object('membro_id', v_mid, 'codigo_4_digitos', v_cod, 'expira_em', v_exp);
  end if;
  return json_build_object('membro_id', v_mid, 'email', lower(trim(convidar.email)), 'convite', 'email',
    'proximo_passo', 'A pessoa entra no app com esse e-mail (codigo de 6 numeros) e o app chama produto.entrar_por_convite()');
end $$;

create or replace function produto.entrar_por_convite() returns json language plpgsql volatile security definer set search_path = '' as
$$
declare uid uuid := auth.uid(); v_email text := lower(auth.jwt() ->> 'email'); r json;
begin
  if uid is null or coalesce(v_email,'') = '' then raise exception 'entre com o e-mail do convite' using errcode = '42501'; end if;
  with lig as (
    update produto.membros m set user_id = uid
     where m.user_id is null and m.email = v_email and m.papel in ('casal','pessoa')
       and not exists (select 1 from produto.membros x where x.familia_id = m.familia_id and x.user_id = uid)
    returning m.familia_id, m.papel, m.nome)
  select coalesce(json_agg(lig), '[]'::json) into r from lig;
  return json_build_object('familias', r);
end $$;

create or replace function produto.exportar_familia(familia uuid) returns json language plpgsql stable security invoker set search_path = '' as
$$
declare f uuid := exportar_familia.familia;
begin
  if produto.meu_papel(f) is distinct from 'casal' then raise exception 'so o casal baixa os dados da familia' using errcode = '42501'; end if;
  return json_build_object(
    'exportado_em', now(), 'formato', 'Central da Familia v1',
    'familia', (select to_json(x) from produto.familias x where x.id = f),
    'membros', (select coalesce(json_agg(x order by x.criado_em), '[]') from produto.membros x where x.familia_id = f),
    'envelopes', (select coalesce(json_agg(x order by x.criado_em), '[]') from produto.envelopes x where x.familia_id = f),
    'limites_mes', (select coalesce(json_agg(x order by x.mes), '[]') from produto.limites_mes x where x.familia_id = f),
    'cartoes', (select coalesce(json_agg(x order by x.criado_em), '[]') from produto.cartoes x where x.familia_id = f),
    'lancamentos', (select coalesce(json_agg(x order by x.data, x.criado_em), '[]') from produto.lancamentos x where x.familia_id = f),
    'config', (select coalesce(json_agg(x), '[]') from produto.config_familia x where x.familia_id = f),
    'eventos', (select coalesce(json_agg(json_build_object('tipo', x.tipo, 'segundos', x.segundos, 'criado_em', x.criado_em) order by x.criado_em), '[]') from produto.eventos x where x.familia_id = f),
    'codigos_equipe', (select coalesce(json_agg(json_build_object('membro_id', x.membro_id, 'expira_em', x.expira_em)), '[]') from produto.acesso_equipe x where x.familia_id = f));
end $$;

create policy familias_ver_dono on produto.familias for select to authenticated
  using ((select auth.uid()) in (select d.user_id from produto.donos_produto d));

create or replace function produto._numeros(p_agora timestamptz) returns jsonb language sql stable set search_path = '' as
$$
with fam as (
  select f.id, f.criado_em from produto.familias f where not f.exemplo),
ev as (
  select e.familia_id, e.criado_em, e.segundos from produto.eventos e join fam on fam.id = e.familia_id where e.tipo = 'lancamento'),
at as (
  select count(*) filter (where (select count(*) from ev where ev.familia_id = fam.id and ev.criado_em < fam.criado_em + interval '7 days') >= 10) num,
         count(*) den
  from fam where fam.criado_em <= p_agora - interval '7 days'),
rt as (
  select count(*) filter (where exists (select 1 from produto.eventos e where e.familia_id = fam.id
           and e.criado_em >= fam.criado_em + interval '30 days' and e.criado_em < fam.criado_em + interval '37 days')) num,
         count(*) den
  from fam where fam.criado_em <= p_agora - interval '37 days'),
tm as (
  select round(avg(ev.segundos), 1) media, count(ev.segundos) n from ev where ev.criado_em > p_agora - interval '7 days'),
er as (
  select count(*) filter (where not r.ok and r.teste in ('teste_conta','teste_contas_casos')) conta,
         count(*) filter (where not r.ok and r.teste = 'teste_vazamento') vazamento,
         max(r.rodado_em) filter (where r.teste = 'turno') ultimo
  from produto.teste_resultados r where r.rodado_em > p_agora - interval '7 days')
select jsonb_build_object(
  'semana_ate', p_agora,
  'ativacao', jsonb_build_object('valor', case when at.den > 0 then round(100.0 * at.num / at.den) end, 'unidade', '%', 'meta', 80,
      'familias_ativadas', at.num, 'familias_com_7_dias', at.den,
      'explicacao', 'Família que lançou 10 gastos na 1ª semana ÷ famílias com pelo menos 7 dias'),
  'retencao_30', jsonb_build_object('valor', case when rt.den > 0 then round(100.0 * rt.num / rt.den) end, 'unidade', '%', 'meta', 60,
      'familias_usando', rt.num, 'familias_com_37_dias', rt.den,
      'explicacao', 'Família com algum uso entre o dia 30 e o dia 36 ÷ famílias com pelo menos 37 dias'),
  'tempo_medio', jsonb_build_object('valor', tm.media, 'unidade', 'segundos', 'meta', 10, 'lancamentos_medidos', tm.n,
      'explicacao', 'Média do tempo do toque no + até salvar, nos lançamentos dos últimos 7 dias'),
  'erros_conta', jsonb_build_object('valor', er.conta, 'meta', 0, 'vazamento', er.vazamento,
      'ultimo_teste_noturno', er.ultimo,
      'turno_atrasado', er.ultimo is null or er.ultimo < p_agora - interval '26 hours',
      'explicacao', 'Casos do teste noturno de conta que falharam nos últimos 7 dias'))
from at, rt, tm, er
$$;

create or replace function produto.numeros_semana() returns json language plpgsql stable security invoker set search_path = '' as
$$
begin
  if (select auth.uid()) is null or not exists (select 1 from produto.donos_produto d where d.user_id = (select auth.uid())) then
    raise exception 'so o dono do produto ve os 4 numeros' using errcode = '42501';
  end if;
  return produto._numeros(now())::json;
end $$;
;