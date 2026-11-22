-- "Não me pagou": o caderno do aluguel guarda o problema (calote, advogado, despejo, vazio, reforma), a data em que a
-- família acha que volta a receber, quem cuida do caso, a dívida do inquilino e o andamento. Ideia do dono (22/11/2026):
-- o sistema tem que saber do problema para não pegar a família desprevenida.
-- * aluguel_imovel.problema (jsonb, com trava de formato)
-- * aluguel_da_familia devolve o problema; aluguel_gravar grava (sem a chave: mantém; null: resolve)
-- * aviso no celular: não avisa "atrasado" do aluguel com problema registrado; avisa quando há lembrete para hoje
--   (ex.: "cobrar o advogado"), sem dizer qual
-- Desfazer: banco/migracoes/desfazer/aluguel_problema.sql

alter table produto.aluguel_imovel add column if not exists problema jsonb
  constraint aluguel_problema_formato check (problema is null or (
    jsonb_typeof(problema) = 'object'
    and problema->>'etapa' in ('cobrando', 'acordo', 'advogado', 'despejo', 'vazio', 'reforma')
    and coalesce(problema->>'desde', '') ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
    and (problema->>'volta' is null or problema->>'volta' ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
    and pg_column_size(problema) < 20000));

create or replace function produto.aluguel_da_familia(familia uuid)
returns json language plpgsql stable security definer set search_path = '' as $$
declare f uuid := aluguel_da_familia.familia;
begin
  if (select auth.uid()) is null or produto.meu_papel(f) is distinct from 'casal' then
    raise exception 'so o casal ve o caderno do aluguel' using errcode = '42501';
  end if;
  return (select coalesce(json_object_agg(i.id, json_build_object(
      'dia_vencimento', coalesce(a.dia_vencimento, 10),
      'desde', a.desde,
      'problema', a.problema,
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

create or replace function produto.aluguel_gravar(familia uuid, imovel uuid, caderno json, tirar_meses text[] default '{}',
                                       tirar_despesas uuid[] default '{}')
returns json language plpgsql volatile security definer set search_path = '' as $$
declare
  f uuid := aluguel_gravar.familia;
  im uuid := aluguel_gravar.imovel;
  c json := aluguel_gravar.caderno;
  -- sem a chave "problema": o que está guardado fica; com null: o problema foi resolvido
  tem_problema boolean := coalesce(aluguel_gravar.caderno::jsonb ? 'problema', false);
  p jsonb := case when json_typeof(aluguel_gravar.caderno->'problema') = 'object'
                  then (aluguel_gravar.caderno->'problema')::jsonb end;
  r json;
begin
  if (select auth.uid()) is null or produto.meu_papel(f) is distinct from 'casal' then
    raise exception 'so o casal muda o caderno do aluguel' using errcode = '42501';
  end if;
  if not exists (select 1 from produto.imovel x where x.id = im and x.familia_id = f and x.apagado_em is null) then
    raise exception 'imovel nao encontrado' using errcode = 'P0002';
  end if;
  insert into produto.aluguel_imovel as x (imovel_id, familia_id, dia_vencimento, desde, problema)
  values (im, f, coalesce((c->>'dia_vencimento')::int, 10), nullif(c->>'desde', ''), p)
  on conflict (imovel_id) do update set dia_vencimento = excluded.dia_vencimento,
    desde = coalesce(excluded.desde, x.desde),
    problema = case when tem_problema then excluded.problema else x.problema end,
    atualizado_em = now();
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

create or replace function produto._avisos_do_dia(hoje date default ((now() at time zone 'America/Recife')::date))
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
    -- aluguel: no dia seguinte ao combinado, se o do mês não chegou e não há problema registrado para aquele mês
    select i.familia_id, 2, 'Um aluguel passou do dia combinado e ainda não chegou.'
    from produto.imovel i
    join produto.aluguel_imovel a on a.imovel_id = i.id
    where i.apagado_em is null and i.uso = 'aluga'
      -- ontem foi o vencimento (dia combinado; dia 31 em mês curto vence no último dia) e o aluguel daquele mês não chegou
      and hoje - 1 = date_trunc('month', hoje - 1)::date - 1
                     + least(a.dia_vencimento, extract(day from date_trunc('month', hoje - 1) + interval '1 month - 1 day')::int)
      and not exists (select 1 from produto.aluguel_recebimentos r
                      where r.imovel_id = i.id and r.mes = to_char(hoje - 1, 'YYYY-MM'))
      and not (a.problema is not null and to_char(hoje - 1, 'YYYY-MM') >= a.problema->>'desde'
               and (a.problema->>'volta' is null or to_char(hoje - 1, 'YYYY-MM') < a.problema->>'volta'))
    union all
    -- fatura do cartão que vence amanhã e não foi marcada como paga
    select c.familia_id, 1, 'Uma fatura de cartão vence amanhã.'
    from produto.cartoes c
    where coalesce(c.ativo, true) and c.dia_vencimento = extract(day from hoje + 1)
      and not exists (select 1 from produto.cartao_faturas x
                      where x.cartao_id = c.id and left(x.mes, 7) = to_char(hoje + 1, 'YYYY-MM') and x.paga_em is not null)
    union all
    -- lembrete para hoje (ex.: cobrar o advogado): diz só que existe, nunca o que é
    select l.familia_id, 2, 'Você tem um lembrete para hoje na Central.'
    from produto.esc_lembretes l
    where l.ativo and l.feito_em is null and (l.quando at time zone 'America/Recife')::date = hoje
  ), por_familia as (
    select a.familia_id, string_agg(distinct a.texto, ' ') as texto from avisos a group by a.familia_id
  )
  select c.endpoint, c.p256dh, c.auth, p.texto
  from produto.celulares c
  join por_familia p on p.familia_id = c.familia_id
  join produto.membros m on m.id = c.membro_id and m.ativo and m.papel = 'casal' and m.user_id = c.user_id
$$;
revoke all on function produto._avisos_do_dia(date) from public, anon, authenticated;

-- ---------- Autoteste numa família de mentira, desfeito no fim (nada fica gravado) ----------
do $$
declare
  u uuid; f uuid; im uuid := gen_random_uuid(); j json; t text; hoje date := date '2027-02-06';
begin
  select m.user_id into u from produto.membros m where m.papel = 'casal' and m.ativo and m.user_id is not null limit 1;
  if u is null then raise notice 'sem casal no banco: autoteste pulado'; return; end if;
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
    insert into produto.familias (id, nome) values (gen_random_uuid(), 'Familia de teste calote') returning id into f;
    insert into produto.membros (familia_id, user_id, papel, nome, ativo) values (f, u, 'casal', 'Teste', true);
    insert into produto.imovel (id, familia_id, dono_membro, apelido, valor_estimado_centavos, uso, aluguel_centavos)
    values (im, f, produto.meu_membro(f), 'Apto teste', 50000000, 'aluga', 250000);
    insert into produto.celulares (familia_id, membro_id, user_id, endpoint, p256dh, auth)
    values (f, produto.meu_membro(f), u, 'https://teste.invalid/' || gen_random_uuid(), repeat('p', 87), repeat('a', 22));
    -- sem problema: no dia 6/2 (vence dia 5) o aviso de aluguel sai
    perform produto.aluguel_gravar(f, im, json_build_object('dia_vencimento', 5, 'desde', '2026-11'));
    select string_agg(x.texto, ' ') into t from produto._avisos_do_dia(hoje) x
      join produto.celulares c on c.endpoint = x.endpoint where c.familia_id = f;
    if coalesce(t, '') not like '%aluguel passou do dia%' then raise exception 'autoteste: devia avisar o aluguel: %', t; end if;
    -- com o problema (advogado, desde jan, volta em set): grava, devolve e o aviso do aluguel some
    perform produto.aluguel_gravar(f, im, json_build_object('dia_vencimento', 5, 'problema', json_build_object(
      'etapa', 'advogado', 'desde', '2027-01', 'volta', '2027-09', 'advogado', 'Dra. Teste', 'divida', 5000,
      'andamento', json_build_array(json_build_object('data', '2027-02-01', 'texto', 'Notificação enviada')))));
    j := produto.aluguel_da_familia(f);
    if j->(im::text)->'problema'->>'etapa' <> 'advogado' or j->(im::text)->'problema'->>'volta' <> '2027-09' then
      raise exception 'autoteste: o problema devia voltar gravado: %', j;
    end if;
    select string_agg(x.texto, ' ') into t from produto._avisos_do_dia(hoje) x
      join produto.celulares c on c.endpoint = x.endpoint where c.familia_id = f;
    if coalesce(t, '') like '%aluguel%' then raise exception 'autoteste: avisou o aluguel com problema registrado: %', t; end if;
    -- gravar sem a chave "problema" (ex.: mudar o dia) mantém o problema
    perform produto.aluguel_gravar(f, im, json_build_object('dia_vencimento', 6));
    if (produto.aluguel_da_familia(f))->(im::text)->'problema' is null
       or json_typeof((produto.aluguel_da_familia(f))->(im::text)->'problema') <> 'object' then
      raise exception 'autoteste: gravar sem a chave apagou o problema';
    end if;
    -- lembrete para hoje: o aviso diz que existe, sem dizer qual
    insert into produto.esc_lembretes (familia_id, criado_por, titulo, quando, repetir)
    values (f, u, 'Cobrar o advogado sobre o Apto teste', (hoje::timestamp + time '09:00') at time zone 'America/Recife', 'semana');
    select string_agg(x.texto, ' ') into t from produto._avisos_do_dia(hoje) x
      join produto.celulares c on c.endpoint = x.endpoint where c.familia_id = f;
    if coalesce(t, '') not like '%lembrete para hoje%' or t like '%advogado%' then
      raise exception 'autoteste: o lembrete devia avisar sem dizer qual: %', t;
    end if;
    -- resolvido (null): o problema some
    perform produto.aluguel_gravar(f, im, json_build_object('dia_vencimento', 6, 'problema', null));
    if json_typeof((produto.aluguel_da_familia(f))->(im::text)->'problema') <> 'null' then
      raise exception 'autoteste: resolver devia tirar o problema';
    end if;
    -- formato errado é recusado
    begin
      perform produto.aluguel_gravar(f, im, json_build_object('problema', json_build_object('etapa', 'inventada', 'desde', '2027-01')));
      raise exception 'autoteste: aceitou etapa inventada';
    exception when check_violation then null;
    end;
    raise exception 'autoteste_ok';
  exception when raise_exception then
    if sqlerrm <> 'autoteste_ok' then raise; end if;
  end;
  perform set_config('request.jwt.claims', '', true);
end $$;
