-- f_03 (fase final): cada adulto ligado ao próprio limite, e o que se baixa diz de quem é cada coisa.
--  * produto._ligar_envelope(familia, membro): liga o membro ao 1º envelope pessoal livre (sem Casa, sem dono)
--  * criar_familia: quem cria fica com "Pessoa 1"; entrar_por_convite: o adulto do casal que entra fica com o próximo livre
--    e a filha (pessoa) ganha um envelope novo, só dela (_ligar_envelope_pessoa); o limite dela quem define são os pais
--  * exportar_familia (casal baixa a família inteira): cada envelope, limite, cartão, lançamento e aplicação vem com dono_nome
--  * exportar_meu(familia) (nova, pra filha e pra quem quiser só o seu): só o próprio membro, envelope, limites e lançamentos
-- Não liga membros que já existem sem envelope (as 2 famílias do banco são de exemplo; ligar mudaria o exemplo e os testes).
-- Desfazer: banco/migracoes/desfazer/f_03.sql (volta o corpo anterior das 3 funções e apaga as 3 novas)

create or replace function produto._ligar_envelope(p_familia uuid, p_membro uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
  select e.id into v from produto.envelopes e
   where e.familia_id = p_familia and not e.casa
     and not exists (select 1 from produto.membros m where m.familia_id = e.familia_id and m.envelope_id = e.id)
   order by e.criado_em, e.nome limit 1
   for update;
  if v is not null then
    update produto.membros set envelope_id = v where id = p_membro and familia_id = p_familia and envelope_id is null;
  end if;
  return v;
end $$;
revoke all on function produto._ligar_envelope(uuid, uuid) from public, anon, authenticated;

-- a filha (papel pessoa) ganha o PRÓPRIO limite ao entrar pelo convite: um envelope novo, só dela, com limite 0 que os
-- pais (os 2 adultos do casal) definem. Nunca pega envelope de ninguém e nunca ganha um 2º (se já tem, devolve o dela).
create or replace function produto._ligar_envelope_pessoa(p_familia uuid, p_membro uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v uuid; v_nome text;
begin
  select m.envelope_id, m.nome into v, v_nome from produto.membros m
   where m.id = p_membro and m.familia_id = p_familia and m.papel = 'pessoa'
   for update;
  if not found then return null; end if;
  if v is not null then return v; end if;
  insert into produto.envelopes (familia_id, nome, regra, limite_mes, casa)
  values (p_familia, left('Limite de ' || v_nome, 60), 'mensal', 0, false)
  returning id into v;
  update produto.membros set envelope_id = v where id = p_membro and familia_id = p_familia;
  return v;
end $$;
revoke all on function produto._ligar_envelope_pessoa(uuid, uuid) from public, anon, authenticated;

create or replace function produto._dono_nome_envelope(p_familia uuid, p_env uuid) returns text
language sql stable set search_path = '' as $$
  select coalesce(
    (select o.nome from produto.membros o where o.familia_id = p_familia and o.envelope_id = p_env order by o.criado_em limit 1),
    (select case when e.casa then 'Casa' else 'Da família' end from produto.envelopes e where e.id = p_env and e.familia_id = p_familia))
$$;
revoke all on function produto._dono_nome_envelope(uuid, uuid) from public, anon;
grant execute on function produto._dono_nome_envelope(uuid, uuid) to authenticated, service_role;

CREATE OR REPLACE FUNCTION produto.criar_familia(nome text, nome_pessoa text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); v_fam uuid := gen_random_uuid(); v_mid uuid := gen_random_uuid();
begin
  if uid is null then raise exception 'precisa entrar com o e-mail antes' using errcode = '42501'; end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'login da equipe nao cria familia' using errcode = '42501'; end if;
  if coalesce(trim(criar_familia.nome), '') = '' or coalesce(trim(nome_pessoa), '') = '' then raise exception 'falta o nome da familia ou o seu nome' using errcode = '22023'; end if;
  if (select count(*) from produto.membros m where m.user_id = uid and m.papel = 'casal') >= 3 then raise exception 'limite de 3 familias por pessoa' using errcode = '54000'; end if;
  insert into produto.familias (id, nome) values (v_fam, trim(criar_familia.nome));
  insert into produto.membros (id, familia_id, user_id, papel, nome) values (v_mid, v_fam, uid, 'casal', trim(nome_pessoa));
  insert into produto.envelopes (familia_id, nome, regra, limite_mes, casa) values
    (v_fam, 'Pessoa 1', 'mensal', 0, false),
    (v_fam, 'Pessoa 2', 'diario', 0, false),
    (v_fam, 'Feira semanal', 'semanal', 0, true),
    (v_fam, 'Casa mensal', 'mensal', 0, true);
  -- f_03: quem cria já nasce com o próprio limite ("Pessoa 1"); o 2º adulto pega o "Pessoa 2" ao entrar pelo convite
  perform produto._ligar_envelope(v_fam, v_mid);
  return json_build_object('familia_id', v_fam);
end $function$;

CREATE OR REPLACE FUNCTION produto.entrar_por_convite()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); j jsonb := auth.jwt(); v_email text := lower(j ->> 'email'); r json;
begin
  if uid is null or coalesce(v_email,'') = '' or coalesce((j ->> 'is_anonymous')::boolean, false) then
    raise exception 'entre com o e-mail do convite' using errcode = '42501';
  end if;
  if not exists (select 1 from auth.users u where u.id = uid and lower(u.email) = v_email and u.email_confirmed_at is not null
                   and not coalesce(u.is_anonymous, false)) then
    raise exception 'confirme o seu e-mail com o codigo de 6 numeros antes de entrar na familia' using errcode = '42501';
  end if;
  if not exists (select 1 from jsonb_array_elements(case when jsonb_typeof(j -> 'amr') = 'array' then j -> 'amr' else '[]'::jsonb end) x
                  where coalesce(x ->> 'method', x #>> '{}') not in ('password', 'anonymous')) then
    raise exception 'entre com o codigo de 6 numeros enviado pro e-mail do convite' using errcode = '42501';
  end if;
  with alvo as (
    select distinct on (m.familia_id) m.id from produto.membros m
     where m.user_id is null and m.email = v_email and m.papel in ('casal','pessoa') and m.ativo
       and not exists (select 1 from produto.membros x where x.familia_id = m.familia_id and x.user_id = uid)
     order by m.familia_id, m.criado_em),
  lig as (
    update produto.membros m set user_id = uid from alvo where m.id = alvo.id and m.user_id is null
    returning m.familia_id, m.papel, m.nome)
  select coalesce(json_agg(lig), '[]'::json) into r from lig;
  -- f_03: cada adulto do casal que acabou de entrar fica com o próprio limite (o próximo envelope livre)
  perform produto._ligar_envelope(m.familia_id, m.id)
     from produto.membros m
    where m.user_id = uid and m.papel = 'casal' and m.ativo and m.envelope_id is null
      and m.familia_id in (select (x ->> 'familia_id')::uuid from json_array_elements(r) x);
  -- f_03: a filha que acabou de entrar ganha o limite dela
  perform produto._ligar_envelope_pessoa(m.familia_id, m.id)
     from produto.membros m
    where m.user_id = uid and m.papel = 'pessoa' and m.ativo and m.envelope_id is null
      and m.familia_id in (select (x ->> 'familia_id')::uuid from json_array_elements(r) x);
  return json_build_object('familias', r);
end $function$;

CREATE OR REPLACE FUNCTION produto.exportar_familia(familia uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare f uuid := exportar_familia.familia;
begin
  if produto.meu_papel(f) is distinct from 'casal' then raise exception 'so o casal baixa os dados da familia' using errcode = '42501'; end if;
  return json_build_object(
    'exportado_em', now(), 'formato', 'Central da Familia v1',
    'familia', (select to_json(x) from produto.familias x where x.id = f),
    'membros', (select coalesce(json_agg(x order by x.criado_em), '[]') from produto.membros x where x.familia_id = f),
    'envelopes', (select coalesce(json_agg(to_jsonb(x) || jsonb_build_object('dono_nome', produto._dono_nome_envelope(x.familia_id, x.id)) order by x.criado_em), '[]') from produto.envelopes x where x.familia_id = f),
    'limites_mes', (select coalesce(json_agg(to_jsonb(x) || jsonb_build_object('dono_nome', produto._dono_nome_envelope(x.familia_id, x.envelope_id)) order by x.mes), '[]') from produto.limites_mes x where x.familia_id = f),
    'cartoes', (select coalesce(json_agg(to_jsonb(x) || jsonb_build_object('dono_nome', coalesce((select o.nome from produto.membros o where o.familia_id = x.familia_id and o.id = x.titular_membro), 'Da família')) order by x.criado_em), '[]') from produto.cartoes x where x.familia_id = f),
    'lancamentos', (select coalesce(json_agg(to_jsonb(x) || jsonb_build_object('dono_nome', produto._dono_nome_envelope(x.familia_id, x.envelope_id)) order by x.data, x.criado_em), '[]') from produto.lancamentos x where x.familia_id = f),
    'config', (select coalesce(json_agg(x), '[]') from produto.config_familia x where x.familia_id = f),
    'eventos', (select coalesce(json_agg(json_build_object('tipo', x.tipo, 'segundos', x.segundos, 'criado_em', x.criado_em) order by x.criado_em), '[]') from produto.eventos x where x.familia_id = f),
    'codigos_equipe', (select coalesce(json_agg(json_build_object('membro_id', x.membro_id, 'expira_em', x.expira_em, 'usado_em', x.usado_em)), '[]') from produto.acesso_equipe x where x.familia_id = f),
    'guardado_aplicacoes', (select coalesce(json_agg(to_jsonb(x) || jsonb_build_object('dono_nome', coalesce((select o.nome from produto.membros o where o.familia_id = x.familia_id and o.id = x.titular_membro), 'Da família')) order by x.criado_em), '[]') from produto.pat_aplicacoes x where x.familia_id = f),
    'guardado_movimentos', (select coalesce(json_agg(x order by x.data, x.criado_em), '[]') from produto.pat_movimentos x where x.familia_id = f),
    'lembretes', (select coalesce(json_agg(x order by x.quando), '[]') from produto.esc_lembretes x where x.familia_id = f),
    'diario_do_escritorio', (select coalesce(json_agg(x order by x.quando), '[]') from produto.esc_diario x where x.familia_id = f),
    'cartao_custos', (select coalesce(json_agg(x), '[]') from produto.cartao_custos x where x.familia_id = f),
    'cartao_faturas', (select coalesce(json_agg(x order by x.mes), '[]') from produto.cartao_faturas x where x.familia_id = f),
    'feiras', (select coalesce(json_agg(x order by x.data), '[]') from produto.feiras x where x.familia_id = f),
    'estoque_itens', (select coalesce(json_agg(x order by x.nome), '[]') from produto.estoque_itens x where x.familia_id = f),
    'estoque_contagens', (select coalesce(json_agg(x order by x.data), '[]') from produto.estoque_contagens x where x.familia_id = f),
    'uso_da_ia', (select coalesce(json_agg(json_build_object('funcao', x.funcao, 'custo_brl', x.custo_brl, 'criado_em', x.criado_em) order by x.criado_em), '[]') from produto.ia_chamadas x where x.familia_id = f));
end $function$;

-- exportar_meu: só o que é de quem pede (pessoa ou casal). Permissão de quem chama: o RLS já corta o resto.
create or replace function produto.exportar_meu(familia uuid) returns json
language plpgsql stable set search_path = '' as $$
declare f uuid := exportar_meu.familia; v_papel text := produto.meu_papel(exportar_meu.familia); v_mid uuid; v_env uuid;
begin
  if v_papel is null or v_papel not in ('casal', 'pessoa') then
    raise exception 'so quem tem limite proprio baixa os proprios dados' using errcode = '42501';
  end if;
  select m.id, m.envelope_id into v_mid, v_env from produto.membros m
   where m.familia_id = f and m.user_id = (select auth.uid()) and m.ativo;
  return json_build_object(
    'exportado_em', now(), 'formato', 'Central da Familia v1 (so o meu)',
    'familia', (select json_build_object('id', x.id, 'nome', x.nome) from produto.familias x where x.id = f),
    'eu', (select json_build_object('id', x.id, 'nome', x.nome, 'papel', x.papel, 'email', x.email, 'criado_em', x.criado_em)
             from produto.membros x where x.id = v_mid),
    'envelopes', (select coalesce(json_agg(x order by x.criado_em), '[]') from produto.envelopes x where x.familia_id = f and x.id = v_env),
    'limites_mes', (select coalesce(json_agg(x order by x.mes), '[]') from produto.limites_mes x where x.familia_id = f and x.envelope_id = v_env),
    'lancamentos', (select coalesce(json_agg(x order by x.data, x.criado_em), '[]') from produto.lancamentos x
                     where x.familia_id = f and (x.envelope_id = v_env or x.autor = (select auth.uid()))));
end $$;
revoke all on function produto.exportar_meu(uuid) from public, anon;
grant execute on function produto.exportar_meu(uuid) to authenticated;

-- portão: todos os testes que existirem no banco têm que continuar 100% ok
do $$
declare t text; n int;
begin
  foreach t in array array['teste_vazamento','teste_contas_casos','teste_guardado','teste_escritorio','teste_tranca_f','teste_futuro_ir'] loop
    if to_regprocedure('produto.' || t || '()') is not null then
      execute format('select count(*) from produto.%I() where not ok', t) into n;
      if n > 0 then raise exception 'f_03: % tem % caso(s) falhando; nada foi gravado', t, n; end if;
    end if;
  end loop;
  select count(*) into n from produto.teste_conta() where not ok;
  if n > 0 then raise exception 'f_03: teste_conta tem % caso(s) falhando; nada foi gravado', n; end if;
end $$;
