-- Avisos no celular (22/11/2026, com o "pode" do dono: "liga a notificação").
-- Quem liga os avisos no app guarda aqui a inscrição do aparelho (Web Push). Todo dia às 19h de Recife a função do
-- servidor avisos-celular manda, se houver: prazo de dinheiro na rua (15 dias antes, no dia, e às segundas se passou),
-- aluguel que passou do dia combinado sem chegar e fatura de cartão que vence amanhã.
-- O TEXTO DO AVISO NUNCA LEVA VALOR NEM NOME (aparece na tela bloqueada). Só o casal recebe.
-- As chaves de envio (VAPID) nascem no servidor; a privada nunca sai de lá. O segredo que autoriza o agendador a chamar
-- a função nasce aqui dentro do banco. Desfazer: desfazer/20261122082534_produto_avisos_no_celular.sql

create extension if not exists pg_net;

-- Segredos do servidor: ninguém do app lê (sem permissão para anon e authenticated).
create table produto.servidor_segredos (
  nome text primary key,
  valor text not null,
  criado_em timestamptz not null default now()
);
alter table produto.servidor_segredos enable row level security;
revoke all on produto.servidor_segredos from public, anon, authenticated;
grant select, insert on produto.servidor_segredos to service_role;
insert into produto.servidor_segredos (nome, valor)
values ('cron_avisos', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (nome) do nothing;

create table produto.celulares (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references produto.familias(id) on delete cascade,
  membro_id uuid not null references produto.membros(id) on delete cascade,
  user_id uuid not null,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) between 80 and 100),
  auth text not null check (char_length(auth) between 16 and 30),
  criado_em timestamptz not null default now(),
  ultimo_envio timestamptz
);
create index celulares_familia on produto.celulares (familia_id);
alter table produto.celulares enable row level security;
revoke all on produto.celulares from public, anon, authenticated;
grant select on produto.celulares to authenticated;
grant select, insert, update, delete on produto.celulares to service_role;
create policy celulares_ver on produto.celulares for select to authenticated using (user_id = (select auth.uid()));

-- O app: a chave pública (para inscrever o aparelho), ligar e desligar.
create function produto.celular_chave_publica()
returns text language sql stable security definer set search_path = '' as $$
  select s.valor from produto.servidor_segredos s where s.nome = 'vapid_publica'
$$;

create function produto.celular_ligar(familia uuid, inscricao json)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare f uuid := celular_ligar.familia; v_membro uuid;
begin
  if (select auth.uid()) is null or produto.meu_papel(f) is distinct from 'casal' then
    raise exception 'so o casal recebe os avisos no celular' using errcode = '42501';
  end if;
  v_membro := produto.meu_membro(f);
  if (select count(*) from produto.celulares c where c.user_id = (select auth.uid())) >= 5
     and not exists (select 1 from produto.celulares c where c.endpoint = inscricao->>'endpoint') then
    raise exception 'ja ha 5 aparelhos com avisos; desligue em algum' using errcode = '54000';
  end if;
  insert into produto.celulares as c (familia_id, membro_id, user_id, endpoint, p256dh, auth)
  values (f, v_membro, (select auth.uid()), inscricao->>'endpoint', inscricao->>'p256dh', inscricao->>'auth')
  on conflict (endpoint) do update set familia_id = excluded.familia_id, membro_id = excluded.membro_id,
    user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth;
  return json_build_object('ok', true);
end $$;

create function produto.celular_desligar(endpoint text)
returns json language plpgsql volatile security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'entre no app antes' using errcode = '42501'; end if;
  delete from produto.celulares c where c.endpoint = celular_desligar.endpoint and c.user_id = (select auth.uid());
  return json_build_object('ok', true);
end $$;

revoke all on function produto.celular_chave_publica() from public, anon;
revoke all on function produto.celular_ligar(uuid, json) from public, anon;
revoke all on function produto.celular_desligar(text) from public, anon;
grant execute on function produto.celular_chave_publica() to authenticated;
grant execute on function produto.celular_ligar(uuid, json) to authenticated;
grant execute on function produto.celular_desligar(text) to authenticated;

-- O servidor (só service_role): os avisos do dia, já juntados por aparelho, sem valor e sem nome.
create function produto._avisos_do_dia(hoje date default ((now() at time zone 'America/Recife')::date))
returns table (endpoint text, p256dh text, auth text, texto text)
language sql stable security definer set search_path = '' as $$
  with avisos as (
    -- dinheiro na rua: 15 dias antes, no dia, e toda segunda-feira depois que passou
    select n.familia_id, case
        when n.prazo = hoje then 1 when n.prazo = hoje + 15 then 3 else 2 end as ordem,
      case
        when n.prazo = hoje then 'Hoje é o prazo de um dinheiro na rua. Ele voltou?'
        when n.prazo = hoje + 15 then 'Um dinheiro na rua vence em 15 dias.'
        else 'Um dinheiro na rua passou do prazo.' end as texto
    from produto.negocios n
    where n.encerrado_em is null
      and (select coalesce(sum(case when m.tipo = 'pus' then m.valor_centavos else -m.valor_centavos end), 0)
             from produto.negocio_movimentos m where m.negocio_id = n.id) > 0
      and (n.prazo = hoje or n.prazo = hoje + 15 or (n.prazo < hoje and extract(isodow from hoje) = 1))
    union all
    -- aluguel: no dia seguinte ao combinado, se o do mês não chegou
    select i.familia_id, 2, 'Um aluguel passou do dia combinado e ainda não chegou.'
    from produto.imovel i
    join produto.aluguel_imovel a on a.imovel_id = i.id
    where i.apagado_em is null and i.uso = 'aluga'
      -- ontem foi o vencimento (dia combinado; dia 31 em mês curto vence no último dia) e o aluguel daquele mês não chegou
      and hoje - 1 = date_trunc('month', hoje - 1)::date - 1
                     + least(a.dia_vencimento, extract(day from date_trunc('month', hoje - 1) + interval '1 month - 1 day')::int)
      and not exists (select 1 from produto.aluguel_recebimentos r
                      where r.imovel_id = i.id and r.mes = to_char(hoje - 1, 'YYYY-MM'))
    union all
    -- fatura do cartão que vence amanhã e não foi marcada como paga
    select c.familia_id, 1, 'Uma fatura de cartão vence amanhã.'
    from produto.cartoes c
    where coalesce(c.ativo, true) and c.dia_vencimento = extract(day from hoje + 1)
      and not exists (select 1 from produto.cartao_faturas x
                      where x.cartao_id = c.id and left(x.mes, 7) = to_char(hoje + 1, 'YYYY-MM') and x.paga_em is not null)
  ), por_familia as (
    select a.familia_id, string_agg(distinct a.texto, ' ') as texto from avisos a group by a.familia_id
  )
  select c.endpoint, c.p256dh, c.auth, p.texto
  from produto.celulares c
  join por_familia p on p.familia_id = c.familia_id
  join produto.membros m on m.id = c.membro_id and m.ativo and m.papel = 'casal' and m.user_id = c.user_id
$$;

create function produto._celular_saiu(endpoint text)
returns void language sql volatile security definer set search_path = '' as $$
  delete from produto.celulares c where c.endpoint = _celular_saiu.endpoint
$$;
create function produto._celular_enviado(endpoint text)
returns void language sql volatile security definer set search_path = '' as $$
  update produto.celulares c set ultimo_envio = now() where c.endpoint = _celular_enviado.endpoint
$$;
create function produto._servidor_segredo(nome text)
returns text language sql stable security definer set search_path = '' as $$
  select s.valor from produto.servidor_segredos s where s.nome = _servidor_segredo.nome
$$;
create function produto._servidor_guardar(nome text, valor text)
returns void language sql volatile security definer set search_path = '' as $$
  insert into produto.servidor_segredos (nome, valor) values (_servidor_guardar.nome, _servidor_guardar.valor)
  on conflict (nome) do nothing
$$;
do $$
declare fn text;
begin
  foreach fn in array array['produto._avisos_do_dia(date)', 'produto._celular_saiu(text)', 'produto._celular_enviado(text)',
                            'produto._servidor_segredo(text)', 'produto._servidor_guardar(text, text)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;

-- Agendador: todo dia às 19h de Recife (22h UTC), antes do silêncio das 22h.
select cron.schedule('produto_avisos_celular', '0 22 * * *', $c$
  select net.http_post(
    url := 'https://kcwaxvvivdckebjmjbkb.supabase.co/functions/v1/avisos-celular',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-segredo', (select valor from produto.servidor_segredos where nome = 'cron_avisos')),
    body := '{"acao":"enviar"}'::jsonb,
    timeout_milliseconds := 30000)
$c$);

-- confere: o app não lê segredo nenhum; anon não liga celular
do $$ begin
  if has_table_privilege('authenticated', 'produto.servidor_segredos', 'SELECT') then
    raise exception 'o app le os segredos do servidor; nada foi gravado';
  end if;
  if has_function_privilege('authenticated', 'produto._avisos_do_dia(date)', 'execute')
     or has_function_privilege('authenticated', 'produto._servidor_segredo(text)', 'execute') then
    raise exception 'o app chama funcao do servidor; nada foi gravado';
  end if;
  if has_function_privilege('anon', 'produto.celular_ligar(uuid, json)', 'execute') then
    raise exception 'anon liga celular; nada foi gravado';
  end if;
end $$;

-- autoteste numa família de mentira, desfeito no fim: o aviso junta o prazo e o aluguel, sem valor e sem nome
do $$
declare
  u uuid; f uuid; mb uuid; im uuid := gen_random_uuid(); neg uuid := gen_random_uuid();
  hoje date := date '2026-12-11'; t text;
begin
  select m.user_id into u from produto.membros m where m.papel = 'casal' and m.ativo and m.user_id is not null limit 1;
  if u is null then raise notice 'sem casal no banco: autoteste pulado'; return; end if;
  begin
    insert into produto.familias (nome) values ('Familia de teste avisos') returning id into f;
    insert into produto.membros (familia_id, user_id, papel, nome, ativo) values (f, u, 'casal', 'Teste', true)
    returning id into mb;
    insert into produto.celulares (familia_id, membro_id, user_id, endpoint, p256dh, auth)
    values (f, mb, u, 'https://exemplo.invalid/teste-' || f, repeat('B', 87), repeat('A', 22));
    insert into produto.negocios (id, familia_id, nome, tipo, minha_parte, prazo)
    values (neg, f, 'NomeSecreto', 'veiculo', 50, hoje);
    insert into produto.negocio_movimentos (id, negocio_id, familia_id, data, tipo, valor_centavos)
    values (gen_random_uuid(), neg, f, hoje - 30, 'pus', 123456);
    insert into produto.imovel (id, familia_id, dono_membro, apelido, valor_estimado_centavos, uso, aluguel_centavos)
    values (im, f, mb, 'ApelidoSecreto', 60000000, 'aluga', 300000);
    insert into produto.aluguel_imovel (imovel_id, familia_id, dia_vencimento) values (im, f, 10);
    select a.texto into t from produto._avisos_do_dia(hoje) a where a.endpoint = 'https://exemplo.invalid/teste-' || f;
    if t is null or t not like '%Hoje é o prazo de um dinheiro na rua%' or t not like '%aluguel passou do dia%' then
      raise exception 'autoteste: aviso esperado com prazo e aluguel, veio: %', t;
    end if;
    if t ~ '[0-9]' or t like '%Secreto%' then raise exception 'autoteste: o aviso mostrou valor ou nome: %', t; end if;
    -- o aluguel que chegou não avisa
    insert into produto.aluguel_recebimentos (imovel_id, familia_id, mes, data, valor_centavos) values (im, f, '2026-12', hoje - 1, 300000);
    select a.texto into t from produto._avisos_do_dia(hoje) a where a.endpoint = 'https://exemplo.invalid/teste-' || f;
    if t like '%aluguel%' then raise exception 'autoteste: avisou aluguel que chegou: %', t; end if;
    raise exception 'autoteste_ok';
  exception when raise_exception then
    if sqlerrm <> 'autoteste_ok' then raise; end if;
  end;
end $$;

-- portão: todos os testes do banco continuam 100% ok
do $$
declare t text; n int;
begin
  foreach t in array array['teste_vazamento','teste_contas_casos','teste_guardado','teste_escritorio','teste_tranca_f','teste_futuro_ir'] loop
    if to_regprocedure('produto.' || t || '()') is not null then
      execute format('select count(*) from produto.%I() where not ok', t) into n;
      if n > 0 then raise exception 'avisos_no_celular: % tem % caso(s) falhando; nada foi gravado', t, n; end if;
    end if;
  end loop;
end $$;
