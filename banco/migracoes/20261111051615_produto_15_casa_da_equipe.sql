create or replace function produto._casa_previsao(p_trocas jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  with t as (select (x)::date d from jsonb_array_elements_text(coalesce(p_trocas, '[]'::jsonb)) x group by 1),
       o as (select d, d - lag(d) over (order by d) gap from t),
       m as (select round(avg(gap))::int media, max(d) ultima, count(*) n from o)
  select jsonb_build_object(
    'trocas', coalesce((select jsonb_agg(to_char(d, 'YYYY-MM-DD') order by d) from t), '[]'::jsonb),
    'media_dias', case when n >= 2 then media end,
    'proxima_troca', case when n >= 2 then to_char(ultima + media, 'YYYY-MM-DD') end,
    'avisar_em', case when n >= 2 then to_char(ultima + media - 5, 'YYYY-MM-DD') end)
  from m
$$;

create or replace function produto.casa_da_equipe(familia uuid)
returns json language plpgsql stable security definer set search_path = '' as $$
declare
  f uuid := casa_da_equipe.familia;
  papel text := produto.meu_papel(f);
  hoje date := (now() at time zone 'America/Recife')::date;
  cfg jsonb;
  eu text;
begin
  if papel is null or papel not in ('casal', 'equipe') then
    raise exception 'so o casal e a equipe da casa veem esta tela' using errcode = '42501';
  end if;
  select coalesce(jsonb_object_agg(c.chave, c.valor), '{}'::jsonb) into cfg
    from produto.config_familia c where c.familia_id = f and c.chave like 'casa\_%';
  select m.nome into eu from produto.membros m where m.familia_id = f and m.user_id = (select auth.uid()) and m.ativo limit 1;

  return json_build_object(
    'hoje', to_char(hoje, 'YYYY-MM-DD'),
    'eu', eu,
    'lista', coalesce((select jsonb_agg(jsonb_build_object('id', i->>'id', 'nome', i->>'nome', 'ok', coalesce((i->>'ok')::boolean, false)))
                        from jsonb_array_elements(case when jsonb_typeof(cfg->'casa_lista') = 'array' then cfg->'casa_lista' else '[]' end) i), '[]'::jsonb),
    'comprado', coalesce((select jsonb_agg(jsonb_build_object('data', to_char(l.data, 'YYYY-MM-DD'), 'nome', coalesce(nullif(l.descricao, ''), 'Compra sem nome')) order by l.data desc, l.criado_em desc)
                          from produto.lancamentos l join produto.envelopes e on e.id = l.envelope_id and e.familia_id = l.familia_id
                          where l.familia_id = f and e.casa and l.apagado_em is null and l.data between hoje - 6 and hoje), '[]'::jsonb),
    'prestadores', coalesce((select jsonb_agg(jsonb_build_object(
                        'id', p->>'id', 'nome', p->>'nome', 'servico', p->>'servico', 'dia', (p->>'dia')::int,
                        'proxima_visita', to_char(hoje + (((p->>'dia')::int - extract(dow from hoje)::int + 7) % 7), 'YYYY-MM-DD'),
                        'ultima_vez', p->>'ultimaVez'))
                      from jsonb_array_elements(case when jsonb_typeof(cfg->'casa_prestadores') = 'array' then cfg->'casa_prestadores' else '[]' end) p
                      where (p->>'dia') ~ '^[0-6]$'), '[]'::jsonb),
    'gas', produto._casa_previsao(cfg->'casa_gas'->'trocas'),
    'presenca', jsonb_build_object(
        'hoje', coalesce(cfg->'casa_presenca'->to_char(hoje, 'YYYY-MM-DD'), '[]'::jsonb),
        'meu_ponto', coalesce(cfg->'casa_ponto'->to_char(hoje, 'YYYY-MM-DD')->eu, '{}'::jsonb)));
end $$;

create or replace function produto.casa_marcar(familia uuid, tipo text, dados jsonb default '{}'::jsonb)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare
  f uuid := casa_marcar.familia;
  t text := casa_marcar.tipo;
  d jsonb := coalesce(casa_marcar.dados, '{}'::jsonb);
  papel text := produto.meu_papel(f);
  hoje text := to_char((now() at time zone 'America/Recife')::date, 'YYYY-MM-DD');
  hora text := to_char(now() at time zone 'America/Recife', 'HH24:MI');
  eu text;
  v jsonb;
  achou boolean;
  nome_item text := left(btrim(coalesce(d->>'nome', '')), 80);
begin
  if papel is null or papel not in ('casal', 'equipe') then
    raise exception 'so o casal e a equipe da casa marcam a casa' using errcode = '42501';
  end if;
  select m.nome into eu from produto.membros m where m.familia_id = f and m.user_id = (select auth.uid()) and m.ativo limit 1;

  if t in ('comprei', 'acabou') then
    select c.valor into v from produto.config_familia c where c.familia_id = f and c.chave = 'casa_lista';
    if v is null or jsonb_typeof(v) <> 'array' then v := '[]'::jsonb; end if;
    select bool_or((i->>'id') = (d->>'id') or (d->>'id' is null and lower(i->>'nome') = lower(nome_item))) into achou from jsonb_array_elements(v) i;
    if coalesce(achou, false) then
      select jsonb_agg(case when (i->>'id') = (d->>'id') or (d->>'id' is null and lower(i->>'nome') = lower(nome_item))
                            then i || jsonb_build_object('ok', t = 'comprei') else i end) into v from jsonb_array_elements(v) i;
    elsif t = 'acabou' and nome_item <> '' then
      v := v || jsonb_build_array(jsonb_build_object('id', substr(md5(random()::text), 1, 7), 'nome', nome_item, 'ok', false));
    else
      raise exception 'item nao encontrado na lista' using errcode = 'P0002';
    end if;
    insert into produto.config_familia (familia_id, chave, valor) values (f, 'casa_lista', v)
      on conflict (familia_id, chave) do update set valor = excluded.valor;

  elsif t = 'prestador_veio' then
    select c.valor into v from produto.config_familia c where c.familia_id = f and c.chave = 'casa_prestadores';
    if v is null or jsonb_typeof(v) <> 'array' or not exists (select 1 from jsonb_array_elements(v) p where p->>'id' = d->>'id') then
      raise exception 'prestador nao encontrado' using errcode = 'P0002';
    end if;
    select jsonb_agg(case when p->>'id' = d->>'id' then p || jsonb_build_object('ultimaVez', hoje) else p end) into v from jsonb_array_elements(v) p;
    update produto.config_familia c set valor = v where c.familia_id = f and c.chave = 'casa_prestadores';

  elsif t = 'troquei_gas' then
    select c.valor into v from produto.config_familia c where c.familia_id = f and c.chave = 'casa_gas';
    if v is null or jsonb_typeof(v) <> 'object' then v := '{}'::jsonb; end if;
    if not coalesce(v->'trocas', '[]'::jsonb) ? hoje then
      v := jsonb_set(v, '{trocas}', coalesce(v->'trocas', '[]'::jsonb) || to_jsonb(hoje));
    end if;
    insert into produto.config_familia (familia_id, chave, valor) values (f, 'casa_gas', v)
      on conflict (familia_id, chave) do update set valor = excluded.valor;
    insert into produto.eventos (familia_id, tipo) values (f, 'casa_gas');

  elsif t in ('cheguei', 'sai') then
    if eu is null then raise exception 'membro sem nome' using errcode = 'P0002'; end if;
    select c.valor into v from produto.config_familia c where c.familia_id = f and c.chave = 'casa_presenca';
    if v is null or jsonb_typeof(v) <> 'object' then v := '{}'::jsonb; end if;
    if not coalesce(v->hoje, '[]'::jsonb) ? eu then
      v := jsonb_set(v, array[hoje], coalesce(v->hoje, '[]'::jsonb) || to_jsonb(eu));
    end if;
    insert into produto.config_familia (familia_id, chave, valor) values (f, 'casa_presenca', v)
      on conflict (familia_id, chave) do update set valor = excluded.valor;
    select c.valor into v from produto.config_familia c where c.familia_id = f and c.chave = 'casa_ponto';
    if v is null or jsonb_typeof(v) <> 'object' then v := '{}'::jsonb; end if;
    if v->hoje is null then v := jsonb_set(v, array[hoje], '{}'::jsonb); end if;
    v := jsonb_set(v, array[hoje, eu], coalesce(v->hoje->eu, '{}'::jsonb) || jsonb_build_object(case when t = 'cheguei' then 'chegou' else 'saiu' end, hora));
    insert into produto.config_familia (familia_id, chave, valor) values (f, 'casa_ponto', v)
      on conflict (familia_id, chave) do update set valor = excluded.valor;
    insert into produto.eventos (familia_id, tipo) values (f, 'casa_presenca');

  else
    raise exception 'tipo invalido: use comprei, acabou, prestador_veio, troquei_gas, cheguei ou sai' using errcode = '22023';
  end if;

  return produto.casa_da_equipe(f);
end $$;

revoke all on function produto._casa_previsao(jsonb) from public, anon;
revoke all on function produto.casa_da_equipe(uuid) from public, anon;
revoke all on function produto.casa_marcar(uuid, text, jsonb) from public, anon;
grant execute on function produto._casa_previsao(jsonb) to authenticated;
grant execute on function produto.casa_da_equipe(uuid) to authenticated;
grant execute on function produto.casa_marcar(uuid, text, jsonb) to authenticated;

insert into produto.config_familia (familia_id, chave, valor) values
  ('f0000000-0000-4e0e-8000-000000000001', 'casa_lista', '[{"id":"i1","nome":"Arroz 5 kg","ok":false,"preco":28.9},{"id":"i2","nome":"Feijao","ok":true}]'),
  ('f0000000-0000-4e0e-8000-000000000001', 'casa_prestadores', '[{"id":"p1","nome":"Seu Ze","servico":"Jardineiro","dia":6,"valor":150,"ultimaVez":"2026-10-31"}]'),
  ('f0000000-0000-4e0e-8000-000000000001', 'casa_gas', '{"trocas":["2026-09-01","2026-10-02","2026-11-01"],"custo":120}'),
  ('f0000000-0000-4e0e-8000-000000000001', 'casa_folha', '{"pessoas":[{"id":"f1","nome":"Carla","funcao":"Cozinheira","salario":1800}],"daePaga":{}}')
on conflict (familia_id, chave) do nothing;;