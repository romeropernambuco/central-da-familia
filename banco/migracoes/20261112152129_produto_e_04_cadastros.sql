
create function produto._d(d date) returns text language sql immutable set search_path = '' as $$ select to_char(d, 'DD/MM') $$;
create function produto._segunda(d date) returns date language sql immutable set search_path = '' as $$ select d - (extract(isodow from d)::int - 1) $$;

-- ===== CARTOES =====
create function produto._cartoes_json(p_familia uuid, p_hoje date) returns jsonb language plpgsql stable set search_path = '' as $$
declare cs jsonb; fs jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'apelido', c.nome, 'banco', c.banco, 'titular_membro', c.titular_membro, 'titular_nome', m.nome,
           'dia_fecha', c.dia_fechamento, 'dia_vence', c.dia_vencimento, 'final4', c.final4, 'ativo', c.ativo,
           'limite', k.limite, 'taxa_valor', k.taxa_valor, 'taxa_periodo', k.taxa_periodo, 'taxa_mes', k.taxa_mes, 'taxa_isenta_acima', k.taxa_isenta_acima,
           'linha', case when c.dia_fechamento is null or c.dia_vencimento is null then 'Falta dizer o dia que fecha e o dia que vence'
                         else 'Fecha dia ' || c.dia_fechamento || ' e vence dia ' || c.dia_vencimento end
                    || case when k.limite is not null then ' · limite ' || produto._brl(k.limite) else '' end
                    || case when coalesce(k.taxa_valor, 0) > 0 then ' · ' || case when k.taxa_periodo = 'ano' then 'anuidade ' else 'mensalidade ' end || produto._brl(k.taxa_valor) else '' end)
           order by c.ativo desc, c.criado_em), '[]'::jsonb) into cs
    from produto.cartoes c
    left join produto.cartao_custos k on k.familia_id = c.familia_id and k.cartao_id = c.id
    left join produto.membros m on m.familia_id = c.familia_id and m.id = c.titular_membro
   where c.familia_id = p_familia;
  select coalesce(jsonb_agg(jsonb_build_object('cartao_id', x.cartao_id, 'cartao', x.cartao, 'mes', x.mes, 'fecha_em', x.fecha_em, 'vence_em', x.vence_em,
           'valor_app', x.total, 'valor_banco', cf.valor_banco, 'diferenca', case when cf.valor_banco is not null then cf.valor_banco - x.total end,
           'diferenca_motivo', cf.diferenca_motivo, 'paga_em', cf.paga_em, 'paga_por_nome', mp.nome,
           'linha', produto._brl(coalesce(cf.valor_banco, x.total)) || ', vence ' || produto._d(x.vence_em)
                    || case when cf.paga_em is not null then ' · paga em ' || produto._d(cf.paga_em) else ' · em aberto' end)
           order by x.vence_em desc, x.cartao), '[]'::jsonb) into fs
    from jsonb_to_recordset(produto._faturas(p_familia, (date_trunc('month', p_hoje) - interval '1 month')::date, 3))
           as x(mes text, total numeric, cartao text, fecha_em date, vence_em date, cartao_id uuid)
    left join produto.cartao_faturas cf on cf.familia_id = p_familia and cf.cartao_id = x.cartao_id and cf.mes = x.mes
    left join produto.membros mp on mp.familia_id = p_familia and mp.user_id = cf.paga_por
   where coalesce(x.total, 0) > 0 or cf.id is not null;
  return jsonb_build_object('cartoes', cs, 'faturas', fs);
end $$;

create function produto.cartao_salvar(familia uuid, apelido text, cartao uuid default null, banco text default null, titular uuid default null,
  dia_fecha integer default null, dia_vence integer default null, limite numeric default null, taxa_valor numeric default null,
  taxa_periodo text default null, taxa_mes integer default null, taxa_isenta_acima numeric default null, final4 text default null, ativo boolean default true)
returns json language plpgsql set search_path = '' as $$
declare f uuid := cartao_salvar.familia; cid uuid := cartao_salvar.cartao; ap text := left(btrim(coalesce(cartao_salvar.apelido, '')), 60);
  f4 text := nullif(btrim(coalesce(cartao_salvar.final4, '')), ''); per text := nullif(cartao_salvar.taxa_periodo, '');
begin
  if produto.meu_papel(f) is distinct from 'casal' then raise exception 'so o casal cadastra cartao' using errcode = '42501'; end if;
  if ap = '' then raise exception 'faltou o apelido do cartao' using errcode = '22023'; end if;
  if ap ~ '[0-9]{5,}' or (f4 is not null and f4 !~ '^[0-9]{4}$') then raise exception 'nunca digite o numero do cartao: so o apelido e, se quiser, os 4 ultimos numeros' using errcode = '22023'; end if;
  if dia_fecha not between 1 and 31 or dia_vence not between 1 and 31 then raise exception 'o dia vai de 1 a 31' using errcode = '22023'; end if;
  if per is not null and per not in ('mes', 'ano') then raise exception 'a taxa e por mes ou por ano' using errcode = '22023'; end if;
  if taxa_mes not between 1 and 12 then raise exception 'o mes da cobranca vai de 1 a 12' using errcode = '22023'; end if;
  if coalesce(limite, 0) < 0 or coalesce(taxa_valor, 0) < 0 or coalesce(taxa_isenta_acima, 0) < 0 then raise exception 'valor invalido' using errcode = '22023'; end if;
  if titular is not null and not exists (select 1 from produto.membros m where m.familia_id = f and m.id = titular) then raise exception 'essa pessoa nao e da familia' using errcode = '22023'; end if;
  if cid is null then
    if (select count(*) from produto.cartoes c where c.familia_id = f) >= 30 then raise exception 'a familia ja tem 30 cartoes' using errcode = '54000'; end if;
    insert into produto.cartoes (familia_id, nome, banco, titular_membro, dia_fechamento, dia_vencimento, final4, ativo)
    values (f, ap, nullif(left(btrim(coalesce(cartao_salvar.banco, '')), 60), ''), titular, dia_fecha, dia_vence, f4, coalesce(cartao_salvar.ativo, true)) returning id into cid;
  else
    update produto.cartoes c set nome = ap, banco = nullif(left(btrim(coalesce(cartao_salvar.banco, '')), 60), ''), titular_membro = titular,
           dia_fechamento = dia_fecha, dia_vencimento = dia_vence, final4 = f4, ativo = coalesce(cartao_salvar.ativo, true)
     where c.familia_id = f and c.id = cid;
    if not found then raise exception 'cartao nao encontrado' using errcode = 'P0002'; end if;
  end if;
  insert into produto.cartao_custos as k (familia_id, cartao_id, limite, taxa_valor, taxa_periodo, taxa_mes, taxa_isenta_acima)
  values (f, cid, limite, taxa_valor, case when coalesce(taxa_valor, 0) > 0 then coalesce(per, 'ano') end, taxa_mes, taxa_isenta_acima)
  on conflict (familia_id, cartao_id) do update set limite = excluded.limite, taxa_valor = excluded.taxa_valor, taxa_periodo = excluded.taxa_periodo,
     taxa_mes = excluded.taxa_mes, taxa_isenta_acima = excluded.taxa_isenta_acima, atualizado_em = now();
  return (select json_build_object('cartao', (select x from jsonb_array_elements(j->'cartoes') x where x->>'id' = cid::text), 'cartoes', j->'cartoes', 'faturas', j->'faturas')
            from (select produto._cartoes_json(f, produto._hoje()) j) t);
end $$;

create function produto.fatura_informar(familia uuid, cartao uuid, mes text, valor_banco numeric default null, paga_em date default null,
  diferenca_motivo text default null, desfazer_pagamento boolean default false)
returns json language plpgsql set search_path = '' as $$
declare f uuid := fatura_informar.familia; j jsonb;
begin
  if produto.meu_papel(f) is distinct from 'casal' then raise exception 'so o casal mexe em fatura' using errcode = '42501'; end if;
  if mes is null or mes !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'mes no formato AAAA-MM' using errcode = '22023'; end if;
  if not exists (select 1 from produto.cartoes c where c.familia_id = f and c.id = cartao) then raise exception 'cartao nao encontrado' using errcode = 'P0002'; end if;
  if valor_banco < 0 or valor_banco > 100000000 then raise exception 'valor invalido' using errcode = '22023'; end if;
  if paga_em > produto._hoje() then raise exception 'a data do pagamento nao pode ser no futuro' using errcode = '22023'; end if;
  insert into produto.cartao_faturas as cf (familia_id, cartao_id, mes, valor_banco, diferenca_motivo, paga_em, paga_por)
  values (f, cartao, fatura_informar.mes, round(valor_banco, 2), nullif(left(btrim(coalesce(fatura_informar.diferenca_motivo, '')), 300), ''), fatura_informar.paga_em,
          case when fatura_informar.paga_em is not null then (select auth.uid()) end)
  on conflict (familia_id, cartao_id, mes) do update set
     valor_banco = coalesce(excluded.valor_banco, cf.valor_banco),
     diferenca_motivo = case when excluded.valor_banco is distinct from cf.valor_banco and excluded.valor_banco is not null and excluded.diferenca_motivo is null then null
                             else coalesce(excluded.diferenca_motivo, cf.diferenca_motivo) end,
     paga_em = case when desfazer_pagamento then null else coalesce(excluded.paga_em, cf.paga_em) end,
     paga_por = case when desfazer_pagamento then null when excluded.paga_em is not null then excluded.paga_por else cf.paga_por end,
     atualizado_em = now();
  j := produto._cartoes_json(f, produto._hoje());
  return json_build_object('fatura', coalesce((select x from jsonb_array_elements(j->'faturas') x where x->>'cartao_id' = cartao::text and x->>'mes' = fatura_informar.mes),
      (select jsonb_build_object('cartao_id', cf.cartao_id, 'mes', cf.mes, 'valor_banco', cf.valor_banco, 'paga_em', cf.paga_em, 'diferenca_motivo', cf.diferenca_motivo)
         from produto.cartao_faturas cf where cf.familia_id = f and cf.cartao_id = cartao and cf.mes = fatura_informar.mes)), 'faturas', j->'faturas');
end $$;

-- ===== FEIRA E ESTOQUE =====
create function produto._feiras_json(p_familia uuid, p_papel text, p_limite integer default 8) returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(x.j order by x.data desc, x.criado_em desc), '[]'::jsonb) from (
    select fe.data, fe.criado_em, jsonb_build_object('id', fe.id, 'semana', fe.semana, 'data', fe.data, 'loja', fe.loja, 'tem_nota', fe.nota_caminho is not null,
             'sem_nota_motivo', fe.sem_nota_motivo, 'feita_por_nome', m.nome,
             'linha', 'Feira de ' || produto._d(fe.data) || coalesce(' em ' || fe.loja, '')
                      || case when p_papel = 'casal' and l.valor is not null then ', ' || produto._brl(l.valor) else '' end
                      || case when fe.nota_caminho is not null then ' · nota anexada' when fe.sem_nota_motivo is not null then ' · sem nota (' || fe.sem_nota_motivo || ')' else ' · falta a nota' end)
           || case when p_papel = 'casal' then jsonb_build_object('valor', l.valor, 'lancamento_id', fe.lancamento_id, 'nota_caminho', fe.nota_caminho) else '{}'::jsonb end as j
      from produto.feiras fe
      left join produto.lancamentos l on l.id = fe.lancamento_id and l.apagado_em is null and p_papel = 'casal'
      left join produto.membros m on m.familia_id = fe.familia_id and m.user_id = fe.feita_por
     where fe.familia_id = p_familia order by fe.data desc, fe.criado_em desc limit p_limite) x
$$;

create function produto._feira_registrar(p_familia uuid, p_data date, p_valor numeric, p_loja text, p_lancamento uuid, p_chave uuid, p_feira uuid, p_hoje date)
returns jsonb language plpgsql set search_path = '' as $$
declare papel text := produto.meu_papel(p_familia); dt date := coalesce(p_data, p_hoje); fid uuid := p_feira; lid uuid := p_lancamento; env uuid; ja boolean := false;
  lj text := nullif(left(btrim(coalesce(p_loja, '')), 80), '');
begin
  if papel is null or papel not in ('casal', 'equipe') then raise exception 'so o casal e a equipe da casa registram a feira' using errcode = '42501'; end if;
  if dt > p_hoje or dt < p_hoje - 60 then raise exception 'a data da feira tem que ser de hoje pra tras, ate 60 dias' using errcode = '22023'; end if;
  if papel = 'equipe' then lid := null; end if;
  if p_valor is not null and (p_valor <= 0 or p_valor > 1000000) then raise exception 'valor invalido' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('feira:' || p_familia::text, 0));
  if fid is null and p_chave is not null then select x.id into fid from produto.feiras x where x.familia_id = p_familia and x.chave = p_chave; ja := fid is not null; end if;
  if fid is null then
    select x.id into fid from produto.feiras x where x.familia_id = p_familia and x.data = dt order by x.criado_em limit 1;
  elsif not exists (select 1 from produto.feiras x where x.familia_id = p_familia and x.id = fid) then
    raise exception 'feira nao encontrada' using errcode = 'P0002';
  end if;
  if lid is not null and not exists (select 1 from produto.lancamentos l where l.familia_id = p_familia and l.id = lid and l.apagado_em is null) then
    raise exception 'lancamento nao encontrado' using errcode = 'P0002';
  end if;
  if fid is null then
    insert into produto.feiras (familia_id, semana, data, loja, chave, feita_por) values (p_familia, produto._segunda(dt), dt, lj, p_chave, (select auth.uid())) returning id into fid;
  elsif not ja then
    update produto.feiras x set loja = coalesce(lj, x.loja), data = case when p_data is not null then dt else x.data end where x.id = fid;
  end if;
  if papel = 'casal' and not ja then
    if lid is null and p_valor is not null and (select x.lancamento_id from produto.feiras x where x.id = fid) is null then
      select e.id into env from produto.envelopes e where e.familia_id = p_familia and e.regra = 'semanal' order by e.casa desc, e.criado_em limit 1;
      if env is null then select e.id into env from produto.envelopes e where e.familia_id = p_familia and e.casa order by e.criado_em limit 1; end if;
      if env is null then raise exception 'a familia nao tem envelope da Feira pra receber esse gasto' using errcode = 'P0002'; end if;
      lid := (produto._lancar(p_familia, env, p_valor, (select x.data from produto.feiras x where x.id = fid), 'Feira' || coalesce(' em ' || lj, ''), null, null, coalesce(p_chave, fid))->'lancamento'->>'id')::uuid;
    end if;
    if lid is not null then update produto.feiras x set lancamento_id = lid where x.id = fid; end if;
  end if;
  return jsonb_build_object('feira', (select x from jsonb_array_elements(produto._feiras_json(p_familia, papel, 60)) x where x->>'id' = fid::text), 'repetido', ja);
end $$;

create function produto.feira_registrar(familia uuid, data date default null, valor numeric default null, loja text default null,
  lancamento uuid default null, chave uuid default null, feira uuid default null)
returns json language sql set search_path = '' as $$
  select produto._feira_registrar(familia, data, valor, loja, lancamento, chave, feira, produto._hoje())::json
$$;

create function produto.feira_anexar_nota(feira uuid, caminho text) returns json language plpgsql set search_path = '' as $$
declare f uuid; papel text;
begin
  select x.familia_id into f from produto.feiras x where x.id = feira;
  papel := produto.meu_papel(f);
  if f is null or papel is null or papel not in ('casal', 'equipe') then raise exception 'feira nao encontrada ou sem permissao' using errcode = '42501'; end if;
  if caminho is null or caminho !~ ('^' || f::text || '/[A-Za-z0-9._-]{1,120}$') then
    raise exception 'o caminho da nota tem que ser {familia_id}/{feira_id}.jpg' using errcode = '22023';
  end if;
  update produto.feiras x set nota_caminho = caminho, sem_nota_motivo = null where x.id = feira;
  return json_build_object('feira', (select x from jsonb_array_elements(produto._feiras_json(f, papel, 60)) x where x->>'id' = feira::text));
end $$;

create function produto.feira_sem_nota(feira uuid, motivo text) returns json language plpgsql set search_path = '' as $$
declare f uuid; papel text; mt text := left(btrim(coalesce(motivo, '')), 200);
begin
  select x.familia_id into f from produto.feiras x where x.id = feira;
  papel := produto.meu_papel(f);
  if f is null or papel is null or papel not in ('casal', 'equipe') then raise exception 'feira nao encontrada ou sem permissao' using errcode = '42501'; end if;
  if mt = '' then raise exception 'diga em poucas palavras por que nao teve nota (feira livre, acougue)' using errcode = '22023'; end if;
  update produto.feiras x set sem_nota_motivo = mt where x.id = feira and x.nota_caminho is null;
  return json_build_object('feira', (select x from jsonb_array_elements(produto._feiras_json(f, papel, 60)) x where x->>'id' = feira::text));
end $$;

create function produto._estoque_json(p_familia uuid) returns jsonb language sql stable set search_path = '' as $$
  with ult as (select c.itens from produto.estoque_contagens c where c.familia_id = p_familia order by c.data desc, c.criado_em desc limit 1)
  select jsonb_build_object(
    'itens', (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'nome', i.nome, 'categoria', i.categoria, 'ativo', i.ativo,
                'estado', (select e->>'estado' from ult, jsonb_array_elements(ult.itens) e where e->>'item_id' = i.id::text limit 1)) order by i.ativo desc, i.categoria nulls last, i.nome), '[]'::jsonb)
                from produto.estoque_itens i where i.familia_id = p_familia),
    'contagens', (select coalesce(jsonb_agg(x.j order by x.data desc, x.criado_em desc), '[]'::jsonb) from (
        select c.data, c.criado_em, jsonb_build_object('id', c.id, 'semana', c.semana, 'data', c.data, 'contado_por_nome', m.nome,
                 'acabaram', (select count(*) from jsonb_array_elements(c.itens) e where e->>'estado' = 'acabou'),
                 'pouco', (select count(*) from jsonb_array_elements(c.itens) e where e->>'estado' = 'pouco'),
                 'linha', 'Contagem de ' || produto._d(c.data) || coalesce(' por ' || m.nome, '') || ': '
                          || (select count(*) from jsonb_array_elements(c.itens) e where e->>'estado' = 'acabou') || ' acabaram, '
                          || (select count(*) from jsonb_array_elements(c.itens) e where e->>'estado' = 'pouco') || ' com pouco') j
          from produto.estoque_contagens c left join produto.membros m on m.familia_id = c.familia_id and m.user_id = c.contado_por
         where c.familia_id = p_familia order by c.data desc, c.criado_em desc limit 6) x))
$$;

create function produto._estoque_contar(p_familia uuid, p_itens jsonb, p_data date, p_hoje date) returns jsonb language plpgsql set search_path = '' as $$
declare papel text := produto.meu_papel(p_familia); dt date := coalesce(p_data, p_hoje); cid uuid; lim jsonb;
begin
  if papel is null or papel not in ('casal', 'equipe') then raise exception 'so o casal e a equipe da casa contam o estoque' using errcode = '42501'; end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then raise exception 'marque pelo menos 1 item' using errcode = '22023'; end if;
  if dt > p_hoje or dt < p_hoje - 14 then raise exception 'a data da contagem tem que ser de hoje pra tras, ate 14 dias' using errcode = '22023'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('item_id', i.id, 'estado', e->>'estado')), '[]'::jsonb) into lim
    from jsonb_array_elements(p_itens) e join produto.estoque_itens i on i.familia_id = p_familia and i.id::text = e->>'item_id'
   where e->>'estado' in ('tem', 'pouco', 'acabou');
  if jsonb_array_length(lim) = 0 then raise exception 'nenhum item valido: use item_id da lista e estado tem, pouco ou acabou' using errcode = '22023'; end if;
  insert into produto.estoque_contagens (familia_id, semana, data, itens, contado_por) values (p_familia, produto._segunda(dt), dt, lim, (select auth.uid())) returning id into cid;
  return jsonb_build_object('contagem', jsonb_build_object('id', cid, 'semana', produto._segunda(dt), 'data', dt, 'itens_contados', jsonb_array_length(lim),
      'acabaram', (select count(*) from jsonb_array_elements(lim) e where e->>'estado' = 'acabou'),
      'pouco', (select count(*) from jsonb_array_elements(lim) e where e->>'estado' = 'pouco')),
    'faltam', (select coalesce(jsonb_agg(i.nome order by i.nome), '[]'::jsonb) from jsonb_array_elements(lim) e join produto.estoque_itens i on i.id::text = e->>'item_id' where e->>'estado' = 'acabou'));
end $$;

create function produto.estoque_contar(familia uuid, itens jsonb, data date default null) returns json language sql set search_path = '' as $$
  select produto._estoque_contar(familia, itens, data, produto._hoje())::json
$$;

create function produto.estoque_item_salvar(familia uuid, nome text, categoria text default null, item uuid default null, ativo boolean default true)
returns json language plpgsql set search_path = '' as $$
declare f uuid := estoque_item_salvar.familia; papel text := produto.meu_papel(f); iid uuid := estoque_item_salvar.item; nm text := left(btrim(coalesce(estoque_item_salvar.nome, '')), 60);
  cat text := nullif(left(btrim(coalesce(estoque_item_salvar.categoria, '')), 40), '');
begin
  if papel is null or papel not in ('casal', 'equipe') then raise exception 'so o casal e a equipe da casa mexem na lista de itens' using errcode = '42501'; end if;
  if nm = '' then raise exception 'faltou o nome do item' using errcode = '22023'; end if;
  if iid is null then
    select i.id into iid from produto.estoque_itens i where i.familia_id = f and lower(i.nome) = lower(nm) limit 1;
  end if;
  if iid is null then
    if (select count(*) from produto.estoque_itens i where i.familia_id = f) >= 300 then raise exception 'a lista ja tem 300 itens' using errcode = '54000'; end if;
    insert into produto.estoque_itens (familia_id, nome, categoria, ativo) values (f, nm, cat, coalesce(estoque_item_salvar.ativo, true)) returning id into iid;
  else
    update produto.estoque_itens i set nome = nm, categoria = cat, ativo = coalesce(estoque_item_salvar.ativo, true) where i.familia_id = f and i.id = iid;
    if not found then raise exception 'item nao encontrado' using errcode = 'P0002'; end if;
  end if;
  return json_build_object('item', (select x from jsonb_array_elements(produto._estoque_json(f)->'itens') x where x->>'id' = iid::text), 'itens', produto._estoque_json(f)->'itens');
end $$;

-- ===== LEMBRETES =====
create function produto._lembretes_json(p_familia uuid) returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'titulo', l.titulo, 'detalhe', l.detalhe, 'quando', l.quando, 'repetir', l.repetir, 'para', l.para, 'feito_em', l.feito_em,
           'linha', l.titulo || ' · ' || to_char(l.quando at time zone 'America/Recife', 'DD/MM "às" HH24:MI')
                    || case l.repetir when 'dia' then ' · todo dia' when 'semana' then ' · toda semana' when 'mes' then ' · todo mês' when 'ano' then ' · todo ano' else '' end)
           order by l.quando), '[]'::jsonb)
    from produto.esc_lembretes l where l.familia_id = p_familia and l.ativo and l.feito_em is null
$$;

create function produto.lembrete_criar(familia uuid, titulo text, quando timestamptz, repetir text default 'nunca', detalhe text default null,
  para text default 'casal', chave uuid default null)
returns json language plpgsql set search_path = '' as $$
declare f uuid := lembrete_criar.familia; lid uuid; tt text := left(btrim(coalesce(lembrete_criar.titulo, '')), 120); pr text := coalesce(nullif(lembrete_criar.para, ''), 'casal');
  rp text := coalesce(nullif(lembrete_criar.repetir, ''), 'nunca');
begin
  if produto.meu_papel(f) is distinct from 'casal' then raise exception 'so o casal cria lembrete' using errcode = '42501'; end if;
  if tt = '' then raise exception 'faltou dizer o que e pra lembrar' using errcode = '22023'; end if;
  if quando is null or quando < now() - interval '1 day' or quando > now() + interval '5 years' then raise exception 'a data do lembrete tem que ser de hoje ate 5 anos' using errcode = '22023'; end if;
  if rp not in ('nunca', 'dia', 'semana', 'mes', 'ano') then raise exception 'repetir: nunca, dia, semana, mes ou ano' using errcode = '22023'; end if;
  if pr not in ('eu', 'casal') and not exists (select 1 from produto.membros m where m.familia_id = f and m.id::text = pr and m.papel = 'casal') then
    raise exception 'para: eu, casal ou o id de alguem do casal' using errcode = '22023';
  end if;
  if chave is not null then select l.id into lid from produto.esc_lembretes l where l.familia_id = f and l.chave = lembrete_criar.chave; end if;
  if lid is null then
    if (select count(*) from produto.esc_lembretes l where l.familia_id = f and l.ativo and l.feito_em is null) >= 200 then raise exception 'ja tem 200 lembretes abertos' using errcode = '54000'; end if;
    insert into produto.esc_lembretes (familia_id, criado_por, titulo, detalhe, quando, repetir, para, chave)
    values (f, (select auth.uid()), tt, nullif(left(btrim(coalesce(lembrete_criar.detalhe, '')), 500), ''), quando, rp, pr, lembrete_criar.chave) returning id into lid;
  end if;
  return json_build_object('lembrete', (select x from jsonb_array_elements(produto._lembretes_json(f)) x where x->>'id' = lid::text), 'lembretes', produto._lembretes_json(f));
end $$;

create function produto._lembrete_mexer(p_id uuid, p_acao text, p_ate timestamptz, p_agora timestamptz) returns jsonb language plpgsql set search_path = '' as $$
declare l produto.esc_lembretes%rowtype; q timestamptz; passo interval;
begin
  select * into l from produto.esc_lembretes x where x.id = p_id;
  if not found or produto.meu_papel(l.familia_id) is distinct from 'casal' then raise exception 'lembrete nao encontrado ou sem permissao' using errcode = '42501'; end if;
  if p_acao = 'concluir' then
    if l.repetir = 'nunca' then
      update produto.esc_lembretes x set feito_em = p_agora where x.id = p_id;
    else
      passo := case l.repetir when 'dia' then interval '1 day' when 'semana' then interval '7 days' when 'mes' then interval '1 month' else interval '1 year' end;
      q := l.quando + passo;
      while q <= p_agora loop q := q + passo; end loop;
      update produto.esc_lembretes x set quando = q where x.id = p_id;
    end if;
  elsif p_acao = 'adiar' then
    if p_ate is null or p_ate <= p_agora or p_ate > p_agora + interval '5 years' then raise exception 'adiar pra uma data daqui pra frente' using errcode = '22023'; end if;
    update produto.esc_lembretes x set quando = p_ate where x.id = p_id;
  elsif p_acao = 'apagar' then
    update produto.esc_lembretes x set ativo = false where x.id = p_id;
  end if;
  return jsonb_build_object('lembrete', p_id, 'acao', p_acao, 'lembretes', produto._lembretes_json(l.familia_id));
end $$;

create function produto.lembrete_concluir(lembrete uuid) returns json language sql set search_path = '' as $$ select produto._lembrete_mexer(lembrete, 'concluir', null, now())::json $$;
create function produto.lembrete_adiar(lembrete uuid, ate timestamptz) returns json language sql set search_path = '' as $$ select produto._lembrete_mexer(lembrete, 'adiar', ate, now())::json $$;
create function produto.lembrete_apagar(lembrete uuid) returns json language sql set search_path = '' as $$ select produto._lembrete_mexer(lembrete, 'apagar', null, now())::json $$;

do $$ declare r record; begin
  for r in select p.oid::regprocedure sig from pg_proc p where p.pronamespace = 'produto'::regnamespace
            and p.proname in ('_d','_segunda','_cartoes_json','cartao_salvar','fatura_informar','_feiras_json','_feira_registrar','feira_registrar','feira_anexar_nota','feira_sem_nota',
              '_estoque_json','_estoque_contar','estoque_contar','estoque_item_salvar','_lembretes_json','lembrete_criar','_lembrete_mexer','lembrete_concluir','lembrete_adiar','lembrete_apagar') loop
    execute format('revoke execute on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end $$;
;