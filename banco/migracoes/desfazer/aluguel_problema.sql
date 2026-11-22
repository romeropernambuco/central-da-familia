-- Desfaz 20261122111629_produto_aluguel_problema: as funções voltam à versão anterior e a coluna sai.
-- Atenção: apaga os problemas de aluguel registrados (etapa, volta, advogado, dívida, andamento).

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
create or replace function produto.aluguel_gravar(familia uuid, imovel uuid, caderno json, tirar_meses text[] default '{}',
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

revoke all on function produto._avisos_do_dia(date) from public, anon, authenticated;
alter table produto.aluguel_imovel drop column if exists problema;
