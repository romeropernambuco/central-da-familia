-- Dinheiro na rua e caderno do aluguel em tabelas próprias (22/11/2026, com o "pode" do dono).
-- Antes: cada um era um JSON único em config_familia (chaves dinheiro_na_rua e aluguel_caderno), regravado inteiro a
-- cada mudança. Dois celulares salvando quase juntos perdiam a mudança de um deles (o Codex reproduziu).
-- Agora cada gravação muda só o que mudou: os movimentos e despesas que a tela tirou saem; o que outro celular pôs fica.
-- O aluguel tem 1 linha por mês e imóvel (não conta em dobro). "Guardar em" grava a volta e o aporte no Guardado juntos.
-- No banco real as 2 chaves de config estavam vazias em 22/11/2026: não há dado para mudar de lugar.
-- Quem vê e grava: só o casal, como antes. Leitura e escrita pelas funções abaixo (com checagem de papel).
-- Dinheiro em centavos. Desfazer: desfazer/20261122081437_produto_rua_e_aluguel_em_tabelas.sql

create table produto.negocios (
  id uuid primary key,
  familia_id uuid not null references produto.familias(id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 60),
  tipo text not null check (tipo in ('veiculo', 'criacao', 'imovel', 'empresa', 'emprestimo', 'outro')),
  com_quem text check (com_quem is null or char_length(com_quem) <= 60),
  minha_parte numeric(5,2) not null check (minha_parte > 0 and minha_parte <= 100),
  combinado text check (combinado is null or char_length(combinado) <= 300),
  prazo date not null,
  volta_prevista_centavos bigint check (volta_prevista_centavos is null or volta_prevista_centavos between 0 and 100000000000),
  dono_membro uuid references produto.membros(id) on delete set null,
  encerrado_em date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid default auth.uid()
);
create index negocios_familia on produto.negocios (familia_id);
create index negocios_prazo on produto.negocios (familia_id, prazo) where encerrado_em is null;

create table produto.negocio_movimentos (
  id uuid primary key,
  negocio_id uuid not null references produto.negocios(id) on delete cascade,
  familia_id uuid not null references produto.familias(id) on delete cascade,
  data date not null,
  tipo text not null check (tipo in ('pus', 'voltou')),
  valor_centavos bigint not null check (valor_centavos > 0 and valor_centavos <= 100000000000),
  nota text check (nota is null or char_length(nota) <= 120),
  aplicacao_id uuid,
  criado_em timestamptz not null default now()
);
create index negocio_mov_negocio on produto.negocio_movimentos (negocio_id);
create index negocio_mov_familia on produto.negocio_movimentos (familia_id);

create table produto.aluguel_imovel (
  imovel_id uuid primary key references produto.imovel(id) on delete cascade,
  familia_id uuid not null references produto.familias(id) on delete cascade,
  dia_vencimento int not null default 10 check (dia_vencimento between 1 and 31),
  desde text check (desde is null or desde ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  atualizado_em timestamptz not null default now()
);
create index aluguel_imovel_familia on produto.aluguel_imovel (familia_id);

create table produto.aluguel_recebimentos (
  imovel_id uuid not null references produto.imovel(id) on delete cascade,
  familia_id uuid not null references produto.familias(id) on delete cascade,
  mes text not null check (mes ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  data date not null,
  valor_centavos bigint not null check (valor_centavos between 0 and 10000000000),
  criado_em timestamptz not null default now(),
  primary key (imovel_id, mes)
);
create index aluguel_receb_familia on produto.aluguel_recebimentos (familia_id);

create table produto.aluguel_despesas (
  id uuid primary key,
  imovel_id uuid not null references produto.imovel(id) on delete cascade,
  familia_id uuid not null references produto.familias(id) on delete cascade,
  data date not null,
  valor_centavos bigint not null check (valor_centavos > 0 and valor_centavos <= 10000000000),
  descricao text not null check (char_length(btrim(descricao)) between 1 and 60),
  criado_em timestamptz not null default now()
);
create index aluguel_desp_familia on produto.aluguel_despesas (familia_id, imovel_id);

-- Tranca: só o casal lê direto; ninguém grava direto (só pelas funções).
do $$
declare t text;
begin
  foreach t in array array['negocios', 'negocio_movimentos', 'aluguel_imovel', 'aluguel_recebimentos', 'aluguel_despesas'] loop
    execute format('alter table produto.%I enable row level security', t);
    execute format('revoke all on produto.%I from public, anon, authenticated', t);
    execute format('grant select on produto.%I to authenticated', t);
    execute format('grant select, insert, update, delete on produto.%I to service_role', t);
    execute format($p$create policy %I on produto.%I for select to authenticated
      using (familia_id in (select produto.familias_com_papel('casal')))$p$, t || '_ver', t);
  end loop;
end $$;

-- ---------- Dinheiro na rua ----------
create function produto.negocios_da_familia(familia uuid)
returns json language plpgsql stable security definer set search_path = '' as $$
declare f uuid := negocios_da_familia.familia;
begin
  if (select auth.uid()) is null or produto.meu_papel(f) is distinct from 'casal' then
    raise exception 'so o casal ve o dinheiro na rua' using errcode = '42501';
  end if;
  return (select coalesce(json_agg(json_build_object(
      'id', n.id, 'nome', n.nome, 'tipo', n.tipo, 'com_quem', n.com_quem, 'minha_parte', n.minha_parte,
      'combinado', n.combinado, 'prazo', n.prazo,
      'volta_prevista', round(n.volta_prevista_centavos / 100.0, 2),
      'dono', n.dono_membro, 'encerrado_em', n.encerrado_em, 'criado_em', n.criado_em,
      'movimentos', coalesce((select json_agg(json_build_object(
            'id', m.id, 'data', m.data, 'tipo', m.tipo, 'valor', round(m.valor_centavos / 100.0, 2), 'nota', m.nota)
            order by m.data, m.criado_em)
          from produto.negocio_movimentos m where m.negocio_id = n.id), '[]'::json))
    order by n.prazo, n.criado_em), '[]'::json)
    from produto.negocios n where n.familia_id = f);
end $$;

-- Grava os dados do negócio e os movimentos que vierem nele (por id: repetir não duplica).
-- Só apaga os movimentos listados em `tirar` (os que a tela tirou). O que outro celular pôs continua.
create function produto.negocio_gravar(familia uuid, negocio json, tirar uuid[] default '{}')
returns json language plpgsql volatile security definer set search_path = '' as $$
declare
  f uuid := negocio_gravar.familia;
  n json := negocio_gravar.negocio;
  v_id uuid := (n->>'id')::uuid;
  v_dono uuid;
  m json;
begin
  if (select auth.uid()) is null or produto.meu_papel(f) is distinct from 'casal' then
    raise exception 'so o casal muda o dinheiro na rua' using errcode = '42501';
  end if;
  if v_id is null then raise exception 'negocio sem id' using errcode = '22023'; end if;
  if exists (select 1 from produto.negocios x where x.id = v_id and x.familia_id <> f) then
    raise exception 'negocio de outra familia' using errcode = '42501';
  end if;
  v_dono := case when (n->>'dono') ~ '^[0-9a-f-]{36}$' then (n->>'dono')::uuid end;
  if v_dono is not null and not exists (select 1 from produto.membros x where x.id = v_dono and x.familia_id = f) then
    v_dono := produto.meu_membro(f);
  end if;
  insert into produto.negocios as x (id, familia_id, nome, tipo, com_quem, minha_parte, combinado, prazo,
                                     volta_prevista_centavos, dono_membro, encerrado_em, criado_em)
  values (v_id, f, btrim(n->>'nome'), n->>'tipo', nullif(btrim(n->>'com_quem'), ''), (n->>'minha_parte')::numeric,
          nullif(btrim(n->>'combinado'), ''), (n->>'prazo')::date,
          case when n->>'volta_prevista' is null then null else round((n->>'volta_prevista')::numeric * 100) end,
          coalesce(v_dono, produto.meu_membro(f)), (n->>'encerrado_em')::date,
          coalesce((n->>'criado_em')::timestamptz, now()))
  on conflict (id) do update set
    nome = excluded.nome, tipo = excluded.tipo, com_quem = excluded.com_quem, minha_parte = excluded.minha_parte,
    combinado = excluded.combinado, prazo = excluded.prazo, volta_prevista_centavos = excluded.volta_prevista_centavos,
    encerrado_em = excluded.encerrado_em, atualizado_em = now(), atualizado_por = (select auth.uid())
  where x.familia_id = f;
  for m in select * from json_array_elements(coalesce(n->'movimentos', '[]'::json)) loop
    insert into produto.negocio_movimentos as y (id, negocio_id, familia_id, data, tipo, valor_centavos, nota)
    values ((m->>'id')::uuid, v_id, f, (m->>'data')::date, m->>'tipo', round((m->>'valor')::numeric * 100),
            nullif(btrim(m->>'nota'), ''))
    on conflict (id) do update set data = excluded.data, tipo = excluded.tipo, valor_centavos = excluded.valor_centavos,
      nota = excluded.nota
    where y.familia_id = f and y.negocio_id = v_id;
  end loop;
  delete from produto.negocio_movimentos y
   where y.negocio_id = v_id and y.familia_id = f and y.id = any(coalesce(negocio_gravar.tirar, '{}'));
  return json_build_object('ok', true, 'id', v_id);
end $$;

create function produto.negocio_apagar(familia uuid, negocio uuid)
returns json language plpgsql volatile security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or produto.meu_papel(negocio_apagar.familia) is distinct from 'casal' then
    raise exception 'so o casal apaga negocio' using errcode = '42501';
  end if;
  delete from produto.negocios x where x.id = negocio_apagar.negocio and x.familia_id = negocio_apagar.familia;
  return json_build_object('ok', true);
end $$;

-- O dinheiro que voltou e o aporte na aplicação do Guardado: os 2 juntos ou nenhum. A chave do Guardado é o id do
-- movimento, então repetir (internet caiu no meio) não soma 2 vezes.
create function produto.negocio_volta_guardar(familia uuid, negocio uuid, movimento json, aplicacao uuid)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare
  f uuid := negocio_volta_guardar.familia;
  v_mov uuid := (movimento->>'id')::uuid;
  v_valor numeric := (movimento->>'valor')::numeric;
  v_data date := (movimento->>'data')::date;
  n int;
begin
  if (select auth.uid()) is null or produto.meu_papel(f) is distinct from 'casal' then
    raise exception 'so o casal muda o dinheiro na rua' using errcode = '42501';
  end if;
  if not exists (select 1 from produto.negocios x where x.id = negocio_volta_guardar.negocio and x.familia_id = f) then
    raise exception 'negocio nao encontrado' using errcode = 'P0002';
  end if;
  insert into produto.negocio_movimentos (id, negocio_id, familia_id, data, tipo, valor_centavos, nota, aplicacao_id)
  values (v_mov, negocio_volta_guardar.negocio, f, v_data, 'voltou', round(v_valor * 100),
          nullif(btrim(movimento->>'nota'), ''), aplicacao)
  on conflict (id) do nothing;
  get diagnostics n = row_count;
  if n = 1 then
    perform produto.guardado_movimentar(aplicacao, 'aporte', v_valor, v_data, v_mov);
  end if;
  return json_build_object('ok', true, 'repetido', n = 0);
end $$;

-- ---------- Caderno do aluguel ----------
create function produto.aluguel_da_familia(familia uuid)
returns json language plpgsql stable security definer set search_path = '' as $$
declare f uuid := aluguel_da_familia.familia;
begin
  if (select auth.uid()) is null or produto.meu_papel(f) is distinct from 'casal' then
    raise exception 'so o casal ve o caderno do aluguel' using errcode = '42501';
  end if;
  return (select coalesce(json_object_agg(i.id, json_build_object(
      'dia_vencimento', coalesce(a.dia_vencimento, 10),
      'desde', a.desde,
      'recebimentos', coalesce((select json_agg(json_build_object(
            'mes', r.mes, 'data', r.data, 'valor', round(r.valor_centavos / 100.0, 2)) order by r.mes)
          from produto.aluguel_recebimentos r where r.imovel_id = i.id), '[]'::json),
      'despesas', coalesce((select json_agg(json_build_object(
            'id', d.id, 'data', d.data, 'valor', round(d.valor_centavos / 100.0, 2), 'descricao', d.descricao)
            order by d.data, d.criado_em)
          from produto.aluguel_despesas d where d.imovel_id = i.id), '[]'::json))), '{}'::json)
    from produto.imovel i
    left join produto.aluguel_imovel a on a.imovel_id = i.id
   where i.familia_id = f and i.apagado_em is null
     and (a.imovel_id is not null
          or exists (select 1 from produto.aluguel_recebimentos r where r.imovel_id = i.id)
          or exists (select 1 from produto.aluguel_despesas d where d.imovel_id = i.id)));
end $$;

-- Grava o caderno de 1 imóvel: dia do vencimento, recebimentos (1 por mês) e despesas que vierem.
-- Só apaga os meses e as despesas listados em tirar_meses e tirar_despesas.
create function produto.aluguel_gravar(familia uuid, imovel uuid, caderno json, tirar_meses text[] default '{}',
                                       tirar_despesas uuid[] default '{}')
returns json language plpgsql volatile security definer set search_path = '' as $$
declare
  f uuid := aluguel_gravar.familia;
  im uuid := aluguel_gravar.imovel;
  c json := aluguel_gravar.caderno;
  r json;
begin
  if (select auth.uid()) is null or produto.meu_papel(f) is distinct from 'casal' then
    raise exception 'so o casal muda o caderno do aluguel' using errcode = '42501';
  end if;
  if not exists (select 1 from produto.imovel x where x.id = im and x.familia_id = f and x.apagado_em is null) then
    raise exception 'imovel nao encontrado' using errcode = 'P0002';
  end if;
  insert into produto.aluguel_imovel as x (imovel_id, familia_id, dia_vencimento, desde)
  values (im, f, coalesce((c->>'dia_vencimento')::int, 10), nullif(c->>'desde', ''))
  on conflict (imovel_id) do update set dia_vencimento = excluded.dia_vencimento,
    desde = coalesce(excluded.desde, x.desde), atualizado_em = now();
  for r in select * from json_array_elements(coalesce(c->'recebimentos', '[]'::json)) loop
    insert into produto.aluguel_recebimentos as y (imovel_id, familia_id, mes, data, valor_centavos)
    values (im, f, r->>'mes', (r->>'data')::date, round((r->>'valor')::numeric * 100))
    on conflict (imovel_id, mes) do update set data = excluded.data, valor_centavos = excluded.valor_centavos;
  end loop;
  delete from produto.aluguel_recebimentos y
   where y.imovel_id = im and y.mes = any(coalesce(aluguel_gravar.tirar_meses, '{}'));
  for r in select * from json_array_elements(coalesce(c->'despesas', '[]'::json)) loop
    insert into produto.aluguel_despesas as y (id, imovel_id, familia_id, data, valor_centavos, descricao)
    values ((r->>'id')::uuid, im, f, (r->>'data')::date, round((r->>'valor')::numeric * 100), btrim(r->>'descricao'))
    on conflict (id) do update set data = excluded.data, valor_centavos = excluded.valor_centavos,
      descricao = excluded.descricao
    where y.familia_id = f and y.imovel_id = im;
  end loop;
  delete from produto.aluguel_despesas y
   where y.imovel_id = im and y.familia_id = f and y.id = any(coalesce(aluguel_gravar.tirar_despesas, '{}'));
  return json_build_object('ok', true);
end $$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'produto.negocios_da_familia(uuid)', 'produto.negocio_gravar(uuid, json, uuid[])', 'produto.negocio_apagar(uuid, uuid)',
    'produto.negocio_volta_guardar(uuid, uuid, json, uuid)', 'produto.aluguel_da_familia(uuid)',
    'produto.aluguel_gravar(uuid, uuid, json, text[], uuid[])'] loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;

-- ---------- A cópia de segurança leva as tabelas novas ----------
do $$ begin
  if (select prosrc from pg_proc where oid = 'produto.exportar_familia(uuid)'::regprocedure) like '%negocio_movimentos%' then
    raise notice 'exportar_familia ja tem o dinheiro na rua; nada a fazer';
    return;
  end if;
  if position($a$    'config', (select coalesce(json_agg(x), '[]') from produto.config_familia x where x.familia_id = f),$a$
              in (select prosrc from pg_proc where oid = 'produto.exportar_familia(uuid)'::regprocedure)) = 0 then
    raise exception 'trecho de config nao achado em produto.exportar_familia(uuid)';
  end if;
  execute replace(pg_get_functiondef('produto.exportar_familia(uuid)'::regprocedure),
    $a$    'config', (select coalesce(json_agg(x), '[]') from produto.config_familia x where x.familia_id = f),$a$,
    $b$    'negocios', (select coalesce(json_agg(x order by x.criado_em), '[]') from produto.negocios x where x.familia_id = f),
    'negocio_movimentos', (select coalesce(json_agg(x order by x.data, x.criado_em), '[]') from produto.negocio_movimentos x where x.familia_id = f),
    'aluguel_imovel', (select coalesce(json_agg(x), '[]') from produto.aluguel_imovel x where x.familia_id = f),
    'aluguel_recebimentos', (select coalesce(json_agg(x order by x.mes), '[]') from produto.aluguel_recebimentos x where x.familia_id = f),
    'aluguel_despesas', (select coalesce(json_agg(x order by x.data), '[]') from produto.aluguel_despesas x where x.familia_id = f),
    'config', (select coalesce(json_agg(x), '[]') from produto.config_familia x where x.familia_id = f),$b$);
  if (select prosrc from pg_proc where oid = 'produto.exportar_familia(uuid)'::regprocedure) not like '%lancamento_etiquetas%' then
    raise exception 'exportar_familia perdeu as etiquetas; nada foi gravado';
  end if;
end $$;

-- ---------- Autoteste numa família de mentira, desfeito no fim (nada fica gravado) ----------
do $$
declare
  u uuid; f uuid; outra uuid := gen_random_uuid(); im uuid := gen_random_uuid(); neg uuid := gen_random_uuid();
  m1 uuid := gen_random_uuid(); m2 uuid := gen_random_uuid(); m3 uuid := gen_random_uuid(); d1 uuid := gen_random_uuid();
  j json; n int;
begin
  select m.user_id into u from produto.membros m where m.papel = 'casal' and m.ativo and m.user_id is not null limit 1;
  if u is null then raise notice 'sem casal no banco: autoteste pulado'; return; end if;
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
    insert into produto.familias (id, nome) values (gen_random_uuid(), 'Familia de teste rua') returning id into f;
    insert into produto.membros (familia_id, user_id, papel, nome, ativo) values (f, u, 'casal', 'Teste', true);
    -- 1 negócio com 1 movimento; depois 2 celulares: A põe m2, B (sem saber de m2) põe m3: ficam os 3
    perform produto.negocio_gravar(f, json_build_object('id', neg, 'nome', 'Carro teste', 'tipo', 'veiculo',
      'minha_parte', 50, 'prazo', current_date + 30, 'volta_prevista', 34000,
      'movimentos', json_build_array(json_build_object('id', m1, 'data', current_date, 'tipo', 'pus', 'valor', 30000))));
    perform produto.negocio_gravar(f, json_build_object('id', neg, 'nome', 'Carro teste', 'tipo', 'veiculo',
      'minha_parte', 50, 'prazo', current_date + 30, 'movimentos', json_build_array(
        json_build_object('id', m1, 'data', current_date, 'tipo', 'pus', 'valor', 30000),
        json_build_object('id', m2, 'data', current_date, 'tipo', 'voltou', 'valor', 100))));
    perform produto.negocio_gravar(f, json_build_object('id', neg, 'nome', 'Carro teste', 'tipo', 'veiculo',
      'minha_parte', 50, 'prazo', current_date + 30, 'movimentos', json_build_array(
        json_build_object('id', m1, 'data', current_date, 'tipo', 'pus', 'valor', 30000),
        json_build_object('id', m3, 'data', current_date, 'tipo', 'voltou', 'valor', 200))));
    select count(*) into n from produto.negocio_movimentos where negocio_id = neg;
    if n <> 3 then raise exception 'autoteste: 2 celulares deviam somar 3 movimentos, ficaram %', n; end if;
    perform produto.negocio_gravar(f, json_build_object('id', neg, 'nome', 'Carro teste', 'tipo', 'veiculo',
      'minha_parte', 50, 'prazo', current_date + 30, 'movimentos', '[]'::json), array[m2]);
    j := produto.negocios_da_familia(f);
    if json_array_length(j->0->'movimentos') <> 2 or (j->0->>'volta_prevista')::numeric is not null then
      raise exception 'autoteste: tirar m2 devia deixar 2 movimentos (e a volta prevista sumiu): %', j;
    end if;
    -- aluguel: o mesmo mês marcado 2 vezes é 1 linha só
    insert into produto.imovel (id, familia_id, dono_membro, apelido, valor_estimado_centavos, uso, aluguel_centavos)
    values (im, f, produto.meu_membro(f), 'Sala teste', 60000000, 'aluga', 300000);
    perform produto.aluguel_gravar(f, im, json_build_object('dia_vencimento', 5, 'recebimentos', json_build_array(
      json_build_object('mes', '2026-10', 'data', '2026-10-04', 'valor', 3000)), 'despesas', json_build_array(
      json_build_object('id', d1, 'data', '2026-10-10', 'valor', 1200, 'descricao', 'IPTU'))));
    perform produto.aluguel_gravar(f, im, json_build_object('dia_vencimento', 5, 'recebimentos', json_build_array(
      json_build_object('mes', '2026-10', 'data', '2026-10-05', 'valor', 3000))));
    j := produto.aluguel_da_familia(f);
    if json_array_length(j->(im::text)->'recebimentos') <> 1 or json_array_length(j->(im::text)->'despesas') <> 1 then
      raise exception 'autoteste: o mes devia ser 1 so e a despesa ficar: %', j;
    end if;
    -- quem não é do casal não vê
    perform set_config('request.jwt.claims', json_build_object('sub', outra, 'role', 'authenticated')::text, true);
    begin
      perform produto.negocios_da_familia(f);
      raise exception 'autoteste: outra pessoa viu o dinheiro na rua';
    exception when insufficient_privilege then null;
    end;
    begin
      perform produto.aluguel_gravar(f, im, '{}'::json);
      raise exception 'autoteste: outra pessoa gravou no caderno';
    exception when insufficient_privilege then null;
    end;
    raise exception 'autoteste_ok';
  exception when raise_exception then
    if sqlerrm <> 'autoteste_ok' then raise; end if;
  end;
  perform set_config('request.jwt.claims', '', true);
end $$;

-- portão: todos os testes do banco continuam 100% ok
do $$
declare t text; n int;
begin
  foreach t in array array['teste_vazamento','teste_contas_casos','teste_guardado','teste_escritorio','teste_tranca_f','teste_futuro_ir'] loop
    if to_regprocedure('produto.' || t || '()') is not null then
      execute format('select count(*) from produto.%I() where not ok', t) into n;
      if n > 0 then raise exception 'rua_e_aluguel: % tem % caso(s) falhando; nada foi gravado', t, n; end if;
    end if;
  end loop;
end $$;
