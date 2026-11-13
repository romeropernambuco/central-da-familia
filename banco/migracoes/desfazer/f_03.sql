-- Desfaz f_03: volta criar_familia, entrar_por_convite e exportar_familia ao corpo de antes (copiado do banco em 13/11/26)
-- e apaga as funções novas. Os membros já ligados a um envelope continuam ligados (é dado, não estrutura).
drop function if exists produto.exportar_meu(uuid);
do $$ begin
  if position($a$'envelopes', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'nome', x.nome, 'regra', x.regra, 'casa', true, 'dono', null, 'escreve', x.id in (select produto.meus_envelopes_escrita())) order by x.criado_em, x.nome)$a$ in (select prosrc from pg_proc where oid = 'produto._resumo(uuid,date)'::regprocedure)) = 0 then
    raise exception 'desfazer f_03: trecho nao achado em produto._resumo';
  end if;
  execute replace(pg_get_functiondef('produto._resumo(uuid,date)'::regprocedure), $a$'envelopes', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'nome', x.nome, 'regra', x.regra, 'casa', true, 'dono', null, 'escreve', x.id in (select produto.meus_envelopes_escrita())) order by x.criado_em, x.nome)$a$, $b$'envelopes', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'nome', x.nome, 'regra', x.regra, 'casa', true) order by x.criado_em, x.nome)$b$);
end $$;
do $$ begin
  if position($a$    -- f_03 (pedido do TELAS): de quem é o envelope, se quem pede pode lançar nele (mesma regra da tranca) e o gasto de hoje
    o := o || jsonb_build_object(
      'dono', (select jsonb_build_object('membro_id', mm.id, 'nome', mm.nome) from produto.membros mm
                where mm.familia_id = p_familia and mm.envelope_id = e.id order by mm.criado_em limit 1),
      'escreve', coalesce(e.id in (select produto.meus_envelopes_escrita()), false),
      'gasto_hoje', coalesce((o->>'gasto_hoje')::numeric, produto._gasto(e.id, p_hoje, p_hoje)));
    envs := envs || o;$a$ in (select prosrc from pg_proc where oid = 'produto._resumo(uuid,date)'::regprocedure)) = 0 then
    raise exception 'desfazer f_03: trecho nao achado em produto._resumo';
  end if;
  execute replace(pg_get_functiondef('produto._resumo(uuid,date)'::regprocedure), $a$    -- f_03 (pedido do TELAS): de quem é o envelope, se quem pede pode lançar nele (mesma regra da tranca) e o gasto de hoje
    o := o || jsonb_build_object(
      'dono', (select jsonb_build_object('membro_id', mm.id, 'nome', mm.nome) from produto.membros mm
                where mm.familia_id = p_familia and mm.envelope_id = e.id order by mm.criado_em limit 1),
      'escreve', coalesce(e.id in (select produto.meus_envelopes_escrita()), false),
      'gasto_hoje', coalesce((o->>'gasto_hoje')::numeric, produto._gasto(e.id, p_hoje, p_hoje)));
    envs := envs || o;$a$, $b$    envs := envs || o;$b$);
end $$;

CREATE OR REPLACE FUNCTION produto.criar_familia(nome text, nome_pessoa text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    'envelopes', (select coalesce(json_agg(x order by x.criado_em), '[]') from produto.envelopes x where x.familia_id = f),
    'limites_mes', (select coalesce(json_agg(x order by x.mes), '[]') from produto.limites_mes x where x.familia_id = f),
    'cartoes', (select coalesce(json_agg(x order by x.criado_em), '[]') from produto.cartoes x where x.familia_id = f),
    'lancamentos', (select coalesce(json_agg(x order by x.data, x.criado_em), '[]') from produto.lancamentos x where x.familia_id = f),
    'config', (select coalesce(json_agg(x), '[]') from produto.config_familia x where x.familia_id = f),
    'eventos', (select coalesce(json_agg(json_build_object('tipo', x.tipo, 'segundos', x.segundos, 'criado_em', x.criado_em) order by x.criado_em), '[]') from produto.eventos x where x.familia_id = f),
    'codigos_equipe', (select coalesce(json_agg(json_build_object('membro_id', x.membro_id, 'expira_em', x.expira_em, 'usado_em', x.usado_em)), '[]') from produto.acesso_equipe x where x.familia_id = f),
    'guardado_aplicacoes', (select coalesce(json_agg(x order by x.criado_em), '[]') from produto.pat_aplicacoes x where x.familia_id = f),
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

drop function if exists produto._dono_nome_envelope(uuid, uuid);
drop function if exists produto._ligar_envelope(uuid, uuid);
drop function if exists produto._ligar_envelope_pessoa(uuid, uuid);
