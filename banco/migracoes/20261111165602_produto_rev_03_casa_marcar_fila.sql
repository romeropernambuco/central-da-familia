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
  -- revisao: 2 pessoas marcando ao mesmo tempo nao perdem a marca uma da outra
  perform pg_advisory_xact_lock(hashtextextended('casa:' || f::text, 0));
  select m.nome into eu from produto.membros m where m.familia_id = f and m.user_id = (select auth.uid()) and m.ativo limit 1;

  if t in ('comprei', 'acabou') then
    select c.valor into v from produto.config_familia c where c.familia_id = f and c.chave = 'casa_lista';
    if v is null or jsonb_typeof(v) <> 'array' then v := '[]'::jsonb; end if;
    select bool_or((i->>'id') = (d->>'id') or (d->>'id' is null and lower(i->>'nome') = lower(nome_item))) into achou from jsonb_array_elements(v) i;
    if coalesce(achou, false) then
      select jsonb_agg(case when (i->>'id') = (d->>'id') or (d->>'id' is null and lower(i->>'nome') = lower(nome_item))
                            then i || jsonb_build_object('ok', t = 'comprei') else i end) into v from jsonb_array_elements(v) i;
    elsif t = 'acabou' and nome_item <> '' then
      if jsonb_array_length(v) >= 300 then raise exception 'a lista ja tem 300 itens' using errcode = '54000'; end if;
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
    -- casa_presenca {dia: [nomes]} (o casal ja le assim) e casa_ponto {dia: {nome: {chegou, saiu}}}
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
end $$;;