-- Revisao de seguranca: entrada da equipe, convite por e-mail, lancar, exportar, turno da noite e teto da IA.

alter table produto.acesso_equipe add column if not exists codigo_busca text, add column if not exists usado_em timestamptz;
create index if not exists acesso_equipe_busca_idx on produto.acesso_equipe (codigo_busca) where codigo_busca is not null;

-- convidar: agora e a unica porta que cria membro e codigo. Confere o casal, nao repete convite,
-- nao deixa 2 codigos iguais abertos ao mesmo tempo (ninguem cai na familia errada) e devolve tambem o "convite".
create or replace function produto.convidar(familia uuid, papel text, nome text, email text default null)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare
  v_mid uuid := gen_random_uuid(); v_aid uuid := gen_random_uuid(); v_cod text; v_busca text;
  v_exp timestamptz := now() + interval '24 hours'; v_email text := lower(nullif(trim(convidar.email), '')); i int := 0;
begin
  if (select auth.uid()) is null or produto.meu_papel(convidar.familia) is distinct from 'casal' then
    raise exception 'so o casal convida' using errcode = '42501';
  end if;
  if convidar.papel is null or convidar.papel not in ('casal','pessoa','equipe') then raise exception 'papel tem que ser casal, pessoa ou equipe' using errcode = '22023'; end if;
  if coalesce(trim(convidar.nome),'') = '' or char_length(trim(convidar.nome)) > 80 then raise exception 'falta o nome (ate 80 letras)' using errcode = '22023'; end if;
  if convidar.papel <> 'equipe' and (v_email is null or char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'falta um e-mail valido' using errcode = '22023';
  end if;
  if (select count(*) from produto.membros m where m.familia_id = convidar.familia) >= 50 then
    raise exception 'a familia ja tem 50 pessoas' using errcode = '54000';
  end if;
  if v_email is not null and exists (select 1 from produto.membros m where m.familia_id = convidar.familia and m.email = v_email) then
    raise exception 'esse e-mail ja foi convidado nesta familia' using errcode = '22023';
  end if;
  insert into produto.membros (id, familia_id, user_id, papel, nome, email)
  values (v_mid, convidar.familia, null, convidar.papel, trim(convidar.nome), v_email);
  if convidar.papel = 'equipe' then
    if (select count(*) from produto.acesso_equipe ae where ae.familia_id = convidar.familia and ae.expira_em > now()) >= 5 then
      raise exception 'ja existem 5 codigos abertos nesta familia; use um deles ou espere vencer' using errcode = '54000';
    end if;
    perform pg_advisory_xact_lock(hashtextextended('produto.codigo_equipe', 0));
    loop
      v_cod := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 10000)::text, 4, '0');
      v_busca := encode(sha256(convert_to(v_cod, 'UTF8')), 'hex');
      exit when not exists (select 1 from produto.acesso_equipe ae where ae.expira_em > now() and ae.codigo_busca = v_busca);
      i := i + 1;
      if i > 60 then raise exception 'muitos convites abertos agora; tente de novo em alguns minutos' using errcode = '54000'; end if;
    end loop;
    insert into produto.acesso_equipe (id, familia_id, membro_id, codigo_hash, codigo_busca, expira_em)
    values (v_aid, convidar.familia, v_mid, extensions.crypt(v_cod, extensions.gen_salt('bf', 8)), v_busca, v_exp);
    return json_build_object('membro_id', v_mid, 'convite', v_aid, 'codigo_4_digitos', v_cod, 'expira_em', v_exp);
  end if;
  return json_build_object('membro_id', v_mid, 'email', v_email, 'convite', 'email',
    'proximo_passo', 'A pessoa entra no app com esse e-mail (codigo de 6 numeros) e o app chama produto.entrar_por_convite()');
end $$;

-- miolo da entrada da equipe (ninguem chama direto)
create or replace function produto._equipe_entrar(p_codigo text, p_convite uuid)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_falhas int; v_geral int; a produto.acesso_equipe; c produto.acesso_equipe; v_achou boolean := false; n int; v_busca text;
begin
  if uid is null then raise exception 'abra a sessao antes (login anonimo)' using errcode = '42501'; end if;
  -- 1 pessoa nao tenta em paralelo pra furar o limite de 5
  perform pg_advisory_xact_lock(hashtextextended('equipe:' || uid::text, 0));
  select count(*) into v_falhas from produto.tentativas_equipe t where t.user_id = uid and not t.ok and t.criado_em > now() - interval '24 hours';
  if v_falhas >= 5 then return json_build_object('ok', false, 'motivo', 'Muitas tentativas. Peca um codigo novo a quem te convidou.', 'restam', 0); end if;
  if p_convite is null then
    -- entrada antiga (so os 4 numeros): continua com o freio geral
    select count(*) into v_geral from produto.tentativas_equipe t where not t.ok and t.criado_em > now() - interval '1 hour';
    if v_geral >= 30 then return json_build_object('ok', false, 'motivo', 'Entrada da equipe pausada por 1 hora. Tente mais tarde.', 'restam', 5 - v_falhas); end if;
  end if;
  if coalesce(p_codigo, '') ~ '^[0-9]{4}$' then
    if p_convite is not null then
      -- entrada nova: o codigo so vale pro convite dele, e o convite morre com 5 erros
      select ae.* into c from produto.acesso_equipe ae where ae.id = p_convite for update;
      if found and c.expira_em > now() and c.tentativas < 5 then
        if c.codigo_hash = extensions.crypt(p_codigo, c.codigo_hash) then a := c; v_achou := true;
        else update produto.acesso_equipe ae set tentativas = ae.tentativas + 1 where ae.id = c.id;
        end if;
      end if;
    else
      v_busca := encode(sha256(convert_to(p_codigo, 'UTF8')), 'hex');
      for c in select ae.* from produto.acesso_equipe ae
                where ae.expira_em > now() and ae.tentativas < 5 and (ae.codigo_busca = v_busca or ae.codigo_busca is null)
                order by ae.criado_em for update loop
        if c.codigo_hash = extensions.crypt(p_codigo, c.codigo_hash) then a := c; v_achou := true; exit; end if;
      end loop;
    end if;
  end if;
  if v_achou then
    if exists (select 1 from produto.membros m where m.familia_id = a.familia_id and m.user_id = uid) then
      return json_build_object('ok', false, 'motivo', 'Voce ja esta nessa familia.', 'restam', 5 - v_falhas);
    end if;
    update produto.membros m set user_id = uid where m.id = a.membro_id and m.user_id is null;
    get diagnostics n = row_count;
    -- codigo vale 1 vez: vence na hora
    update produto.acesso_equipe ae set expira_em = now(), usado_em = now() where ae.id = a.id;
    insert into produto.tentativas_equipe (user_id, ok) values (uid, n = 1);
    if n = 0 then return json_build_object('ok', false, 'motivo', 'Esse convite ja foi usado.', 'restam', 5 - v_falhas); end if;
    return json_build_object('ok', true, 'familia_id', a.familia_id, 'membro_id', a.membro_id,
      'nome', (select m.nome from produto.membros m where m.id = a.membro_id));
  end if;
  insert into produto.tentativas_equipe (user_id, ok) values (uid, false);
  return json_build_object('ok', false, 'motivo', 'Codigo errado ou vencido.', 'restam', greatest(0, 4 - v_falhas));
end $$;

create or replace function produto.entrar_equipe(codigo text)
returns json language sql volatile security definer set search_path = '' as $$ select produto._equipe_entrar(codigo, null) $$;

-- entrada nova: o app manda o convite (vem no link ou no QR) junto com os 4 numeros
create or replace function produto.entrar_equipe_convite(convite uuid, codigo text)
returns json language plpgsql volatile security definer set search_path = '' as $$
begin
  if convite is null then return json_build_object('ok', false, 'motivo', 'Codigo errado ou vencido.', 'restam', 0); end if;
  return produto._equipe_entrar(codigo, convite);
end $$;

-- convite por e-mail: so entra quem provou que o e-mail e dele (codigo por e-mail), nunca sessao de senha ou anonima
create or replace function produto.entrar_por_convite()
returns json language plpgsql volatile security definer set search_path = '' as $$
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
end $$;

-- lancar: 2 toques ao mesmo tempo entram em fila (o 2o enxerga o 1o), mensagens certas e descricao limitada
create or replace function produto.lancar(familia uuid, envelope uuid, valor numeric, data date default null, descricao text default null, cartao uuid default null, segundos numeric default null)
returns json language plpgsql volatile set search_path = '' as $$
#variable_conflict use_column
declare v_id uuid; v_dup uuid; v_data date := coalesce(lancar.data, produto._hoje()); v_valor numeric := round(lancar.valor, 2);
        v_desc text := nullif(left(trim(lancar.descricao), 300), '');
begin
  if (select auth.uid()) is null then raise exception 'precisa entrar no app antes de lancar' using errcode = '42501'; end if;
  if v_valor is null or v_valor <= 0 then raise exception 'o valor tem que ser maior que zero' using errcode = '22023'; end if;
  if v_valor > 1000000 then raise exception 'o valor passou de 1 milhao; confira os numeros' using errcode = '22023'; end if;
  if v_data < date '2000-01-01' or v_data > date '2100-12-31' then raise exception 'a data esta fora do calendario do app' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('lancar:' || (select auth.uid())::text || ':' || coalesce(lancar.envelope::text, ''), 0));
  select l.id into v_dup from produto.lancamentos l
   where l.familia_id = lancar.familia and l.envelope_id = lancar.envelope and l.valor = v_valor and l.data = v_data
     and l.descricao is not distinct from v_desc and l.cartao_id is not distinct from lancar.cartao
     and l.autor = (select auth.uid()) and l.apagado_em is null and l.criado_em > now() - interval '10 seconds'
   limit 1;
  if v_dup is null then
    v_id := gen_random_uuid();
    insert into produto.lancamentos (id, familia_id, envelope_id, cartao_id, valor, data, descricao)
    values (v_id, lancar.familia, lancar.envelope, lancar.cartao, v_valor, v_data, v_desc);
    insert into produto.eventos (familia_id, tipo, segundos)
    values (lancar.familia, 'lancamento', case when lancar.segundos between 0 and 600 then round(lancar.segundos, 1) end);
  else
    v_id := v_dup;
  end if;
  return json_build_object(
    'lancamento', (select to_json(l) from produto.lancamentos l where l.id = v_id),
    'repetido', v_dup is not null,
    'resumo', produto._resumo(lancar.familia, produto._hoje()));
end $$;

-- exportar (LGPD): agora leva tambem o uso da IA
create or replace function produto.exportar_familia(familia uuid)
returns json language plpgsql stable set search_path = '' as $$
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
    'uso_da_ia', (select coalesce(json_agg(json_build_object('funcao', x.funcao, 'custo_brl', x.custo_brl, 'criado_em', x.criado_em) order by x.criado_em), '[]') from produto.ia_chamadas x where x.familia_id = f));
end $$;

-- turno da noite: o teste de conta guarda 1 linha de resumo + so os casos com erro (antes eram 3 linhas por familia por noite)
create or replace function produto.rodar_testes_noturnos()
returns text language plpgsql set search_path = '' as $$
declare rid uuid := gen_random_uuid(); n_falha int; quebrou text; n_conta int; n_conta_ruim int; tc record;
begin
  begin
    n_conta := 0; n_conta_ruim := 0;
    for tc in select t.caso, t.ok from produto.teste_conta() t loop
      n_conta := n_conta + 1;
      if not tc.ok then
        n_conta_ruim := n_conta_ruim + 1;
        insert into produto.teste_resultados (rodada, teste, caso, ok) values (rid, 'teste_conta', tc.caso, false);
      end if;
    end loop;
    insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe)
    values (rid, 'teste_conta', 'resumo das contas de todas as famílias', true, n_conta || ' casos conferidos, ' || n_conta_ruim || ' com erro');
    insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe) select rid, 'teste_contas_casos', t.caso, t.ok, 'esperado ' || coalesce(t.esperado,'') || ', obtido ' || coalesce(t.obtido,'') from produto.teste_contas_casos() t;
    insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe) select rid, 'teste_vazamento', t.caso, t.ok, 'esperado ' || coalesce(t.esperado,'') || ', obtido ' || coalesce(t.obtido,'') from produto.teste_vazamento() t;
  exception when others then quebrou := sqlerrm;
  end;
  if quebrou is not null then
    insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe) values (rid, 'turno', 'precisa de você', false, 'o turno de teste quebrou: ' || quebrou);
    return 'precisa de você: ' || quebrou;
  end if;
  select count(*) into n_falha from produto.teste_resultados r where r.rodada = rid and not r.ok;
  insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe)
  values (rid, 'turno', case when n_falha = 0 then 'tudo certo' else 'precisa de você' end, n_falha = 0,
          n_falha || ' caso(s) falharam de ' || (select count(*) from produto.teste_resultados r where r.rodada = rid));
  return case when n_falha = 0 then 'tudo certo' else 'precisa de você: ' || n_falha || ' caso(s) falharam' end;
end $$;

-- IA: reserva o custo ANTES de chamar (com fila por familia). 2 chamadas juntas nao furam o teto. So casal e pessoa usam.
create or replace function produto.ia_reservar(p_familia uuid, p_user uuid, p_funcao text, p_modelo text, p_custo_max numeric, p_teto numeric, p_teto_geral numeric)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare v_gasto numeric; v_geral numeric; v_min int; v_id uuid := gen_random_uuid();
        v_ini timestamptz := (date_trunc('month', now() at time zone 'America/Recife') at time zone 'America/Recife');
begin
  if p_custo_max is null or p_custo_max <= 0 or p_teto is null or p_teto_geral is null then raise exception 'reserva invalida' using errcode = '22023'; end if;
  if not exists (select 1 from produto.membros m where m.familia_id = p_familia and m.user_id = p_user and m.ativo and m.papel in ('casal','pessoa')) then
    return json_build_object('ok', false, 'motivo', 'familia');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('ia:' || p_familia::text, 0));
  select coalesce(sum(c.custo_brl), 0) into v_gasto from produto.ia_chamadas c where c.familia_id = p_familia and c.criado_em >= v_ini;
  if v_gasto + p_custo_max > p_teto then return json_build_object('ok', false, 'motivo', 'limite', 'gasto', v_gasto); end if;
  select count(*) into v_min from produto.ia_chamadas c where c.familia_id = p_familia and c.criado_em > now() - interval '1 minute';
  if v_min >= 6 then return json_build_object('ok', false, 'motivo', 'ritmo', 'gasto', v_gasto); end if;
  select coalesce(sum(c.custo_brl), 0) into v_geral from produto.ia_chamadas c where c.criado_em >= v_ini;
  if v_geral + p_custo_max > p_teto_geral then return json_build_object('ok', false, 'motivo', 'limite_geral', 'gasto', v_gasto); end if;
  insert into produto.ia_chamadas (id, familia_id, user_id, funcao, modelo, tokens_entrada, tokens_saida, custo_brl)
  values (v_id, p_familia, p_user, left(p_funcao, 60), left(p_modelo, 60), 0, 0, p_custo_max);
  return json_build_object('ok', true, 'id', v_id, 'gasto', v_gasto);
end $$;

-- IA: troca a reserva pelo custo de verdade (so a reserva dos ultimos 15 minutos)
create or replace function produto.ia_fechar(p_id uuid, p_tokens_entrada integer, p_tokens_saida integer, p_custo numeric)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare n int;
begin
  update produto.ia_chamadas c set tokens_entrada = greatest(0, coalesce(p_tokens_entrada, 0)), tokens_saida = greatest(0, coalesce(p_tokens_saida, 0)),
         custo_brl = greatest(0, coalesce(p_custo, 0))
   where c.id = p_id and c.criado_em > now() - interval '15 minutes';
  get diagnostics n = row_count;
  return n = 1;
end $$;

revoke all on function produto._equipe_entrar(text, uuid) from public, anon, authenticated;
revoke all on function produto.ia_reservar(uuid, uuid, text, text, numeric, numeric, numeric) from public, anon, authenticated;
revoke all on function produto.ia_fechar(uuid, integer, integer, numeric) from public, anon, authenticated;
grant execute on function produto.ia_reservar(uuid, uuid, text, text, numeric, numeric, numeric) to service_role;
grant execute on function produto.ia_fechar(uuid, integer, integer, numeric) to service_role;
revoke all on function produto.entrar_equipe_convite(uuid, text) from public, anon;
grant execute on function produto.entrar_equipe_convite(uuid, text) to authenticated;
revoke all on function produto.convidar(uuid, text, text, text) from public, anon;
grant execute on function produto.convidar(uuid, text, text, text) to authenticated;;