create or replace function produto._resumo(p_familia uuid, p_hoje date) returns jsonb language plpgsql stable set search_path = '' as
$$
declare
  papel text; meu_env uuid; m0 date := date_trunc('month', p_hoje)::date;
  fim date := (date_trunc('month', p_hoje) + interval '1 month' - interval '1 day')::date;
  dias int; seg date; dl int; e record; envs jsonb := '[]'::jsonb; expl jsonb := '[]'::jsonb; o jsonb; dj jsonb;
  lim numeric; g numeric; livre numeric; hoje_v numeric; col numeric; t numeric; gs numeric; nseg int; cart numeric;
  tot_hoje numeric := 0; tot_livre numeric := 0; tot_col numeric := 0; conta_hoje boolean;
begin
  dias := fim - p_hoje + 1;
  seg := p_hoje - (extract(isodow from p_hoje)::int - 1);
  dl := 8 - extract(isodow from p_hoje)::int;
  if (select auth.uid()) is not null then
    papel := produto.meu_papel(p_familia);
    if papel is null then raise exception 'sem acesso a esta familia' using errcode = '42501'; end if;
    if papel = 'pessoa' then select m.envelope_id into meu_env from produto.membros m where m.familia_id = p_familia and m.user_id = (select auth.uid()); end if;
  end if;
  for e in select en.* from produto.envelopes en where en.familia_id = p_familia order by en.criado_em, en.nome loop
    hoje_v := null; livre := null; col := 0;
    select coalesce(sum(l.valor),0) into cart from produto.lancamentos l join produto.cartoes c on c.id = l.cartao_id
      where l.envelope_id = e.id and l.apagado_em is null and date_trunc('month', l.data) = m0
        and produto._mes_fatura(c.dia_fechamento, c.dia_vencimento, l.data) > m0;
    if e.regra = 'semanal' then
      lim := produto._lim(e.id, m0); t := round(lim * 12 / 52, 2);
      select count(*) into nseg from produto._segundas(m0);
      gs := produto._gasto(e.id, seg, seg + 6);
      select coalesce(sum(produto._gasto(e.id, s, s + 6)),0) into g from produto._segundas(m0) s;
      o := jsonb_build_object('id', e.id, 'nome', e.nome, 'regra', e.regra, 'casa', e.casa, 'limite_base', lim,
             'limite_mes', round(t * nseg, 2), 'gasto_mes', g, 'teto_semana', t, 'gasto_semana', gs, 'restam_semana', round(t - gs, 2),
             'segundas', nseg, 'pote_inicio', produto._pote_inicio(e.id, m0),
             'texto', produto._brl(t) || ' por semana · ' || produto._brl(t * nseg) || ' neste mês (' || nseg || ' segundas' || case when nseg = 5 then ', a 5ª sai do pote' else '' end || ')');
      if lim > 0 then
        livre := round(t * nseg - g, 2); hoje_v := round(greatest(0, t - gs) / dl, 2);
        expl := expl || jsonb_build_object('linha', e.nome || ': ' || produto._brl(lim) || ' por mês × 12 ÷ 52 = ' || produto._brl(t) || ' por semana', 'valor', t)
                     || jsonb_build_object('linha', e.nome || ': ' || produto._brl(t) || ' − ' || produto._brl(gs) || ' gastos desde segunda = ' || produto._brl(t - gs) || ' até domingo, ÷ ' || dl || ' dias', 'valor', hoje_v);
      end if;
    elsif e.regra = 'diario' then
      dj := produto._diario(e.id, p_hoje);
      lim := (dj->>'mes_valor')::numeric; g := (dj->>'gasto_mes')::numeric;
      o := jsonb_build_object('id', e.id, 'nome', e.nome, 'regra', e.regra, 'casa', e.casa, 'limite_base', produto._lim(e.id, m0),
             'limite_mes', lim, 'gasto_mes', g, 'valor_dia', (dj->>'valor_dia')::numeric, 'gasto_hoje', (dj->>'gasto_hoje')::numeric,
             'ate_fim_mes', (dj->>'ate_fim_mes')::numeric, 'inicio', dj->'inicio', 'falta_mes_anterior', (dj->>'falta_mes_anterior')::numeric,
             'peso_fds', e.peso_fds);
      if produto._lim(e.id, m0) > 0 then
        livre := round(lim - g, 2); hoje_v := greatest(0, (dj->>'pode_hoje')::numeric);
        expl := expl || jsonb_build_object('linha', e.nome || ': ' || produto._brl((dj->>'pote_dias')::numeric) || ' pros dias (limite − ' || produto._brl(e.colchao) || ' de colchão' ||
                  case when (dj->>'falta_mes_anterior')::numeric > 0 then ' − ' || produto._brl((dj->>'falta_mes_anterior')::numeric) || ' que o mês passado passou' else '' end ||
                  '), dividido pelos dias; fim de semana e feriado valem ' || replace(e.peso_fds::text, '.', ',') || ' dia', 'valor', (dj->>'pote_dias')::numeric)
                     || jsonb_build_object('linha', e.nome || ': o dia de hoje tem ' || produto._brl((dj->>'valor_dia')::numeric) || ' − ' || produto._brl((dj->>'gasto_hoje')::numeric) || ' gastos hoje', 'valor', hoje_v);
      end if;
    else
      lim := produto._lim(e.id, m0);
      g := produto._gasto(e.id, m0, fim);
      o := jsonb_build_object('id', e.id, 'nome', e.nome, 'regra', e.regra, 'casa', e.casa, 'limite_base', lim, 'limite_mes', lim, 'gasto_mes', g);
      if lim > 0 then
        livre := round(lim - g, 2); hoje_v := round(greatest(0, livre - e.colchao) / dias, 2);
        expl := expl || jsonb_build_object('linha', e.nome || ': ' || produto._brl(lim) || ' − ' || produto._brl(g) || ' gastos no mês = ' || produto._brl(livre) || ' livres', 'valor', livre)
                     || jsonb_build_object('linha', e.nome || ': ' || produto._brl(greatest(0, livre - e.colchao)) || ' (livre menos o colchão) ÷ ' || dias || ' dias que faltam', 'valor', hoje_v);
      end if;
    end if;
    if livre is not null then col := greatest(0, least(e.colchao, livre)); end if;
    if cart > 0 then
      expl := expl || jsonb_build_object('linha', e.nome || ': ' || produto._brl(cart) || ' no cartão, já descontado; o banco cobra na fatura', 'valor', cart);
    end if;
    o := o || jsonb_build_object('livre', livre, 'hoje', hoje_v, 'colchao', col, 'colchao_meta', e.colchao, 'no_cartao', cart, 'sem_limite', livre is null);
    envs := envs || o;
    conta_hoje := case when papel = 'pessoa' then e.id = meu_env when papel = 'equipe' then e.casa else true end;
    if conta_hoje and hoje_v is not null then tot_hoje := tot_hoje + hoje_v; end if;
    if livre is not null then tot_livre := tot_livre + livre; tot_col := tot_col + col; end if;
  end loop;
  expl := jsonb_build_array(
            jsonb_build_object('linha', 'Livre do mês = soma do que cada envelope ainda tem', 'valor', round(tot_livre,2)),
            jsonb_build_object('linha', 'Hoje você pode gastar = soma do valor de hoje dos envelopes ' || case when papel = 'pessoa' then 'seu' when papel = 'equipe' then 'da casa' else 'da família' end, 'valor', round(tot_hoje,2)),
            jsonb_build_object('linha', 'Colchão = reserva que não entra no valor do dia; se o mês passar, ele cobre até zerar, nunca fica negativo', 'valor', round(tot_col,2)))
       || expl;
  return jsonb_build_object('familia_id', p_familia, 'data', p_hoje, 'papel', coalesce(papel,'sistema'),
    'pode_gastar_hoje', round(tot_hoje,2), 'livre_mes', round(tot_livre,2), 'colchao', round(tot_col,2),
    'dias_restantes', dias, 'envelopes', envs, 'explicacao', expl,
    'regra_cartao', 'Compra no cartão conta no dia da compra; o banco cobra na fatura (veja faturas)');
end $$;

create or replace function produto.lancar(familia uuid, envelope uuid, valor numeric, data date default null,
  descricao text default null, cartao uuid default null, segundos numeric default null)
returns json language plpgsql volatile security invoker set search_path = '' as
$$
#variable_conflict use_column
declare v_id uuid; v_dup uuid; v_data date := coalesce(lancar.data, produto._hoje()); v_valor numeric := round(lancar.valor, 2);
begin
  if (select auth.uid()) is null then raise exception 'precisa entrar no app antes de lancar' using errcode = '42501'; end if;
  if v_valor is null or v_valor <= 0 or v_valor > 1000000 then raise exception 'o valor tem que ser maior que zero' using errcode = '22023'; end if;
  select l.id into v_dup from produto.lancamentos l
   where l.familia_id = lancar.familia and l.envelope_id = lancar.envelope and l.valor = v_valor and l.data = v_data
     and l.descricao is not distinct from nullif(trim(lancar.descricao), '') and l.cartao_id is not distinct from lancar.cartao
     and l.autor = (select auth.uid()) and l.apagado_em is null and l.criado_em > now() - interval '10 seconds'
   limit 1;
  if v_dup is null then
    v_id := gen_random_uuid();
    insert into produto.lancamentos (id, familia_id, envelope_id, cartao_id, valor, data, descricao)
    values (v_id, lancar.familia, lancar.envelope, lancar.cartao, v_valor, v_data, nullif(trim(lancar.descricao), ''));
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

create or replace function produto.apagar_lancamento(id uuid) returns json language plpgsql volatile security invoker set search_path = '' as
$$
declare n int; v_fam uuid;
begin
  update produto.lancamentos l set apagado_em = now() where l.id = apagar_lancamento.id and l.apagado_em is null returning l.familia_id into v_fam;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'lancamento nao encontrado, ja na lixeira ou sem permissao' using errcode = 'P0002'; end if;
  return json_build_object('id', apagar_lancamento.id, 'na_lixeira', true, 'resumo', produto._resumo(v_fam, produto._hoje()));
end $$;

create or replace function produto.restaurar_lancamento(id uuid) returns json language plpgsql volatile security invoker set search_path = '' as
$$
declare n int; v_fam uuid;
begin
  update produto.lancamentos l set apagado_em = null where l.id = restaurar_lancamento.id and l.apagado_em is not null returning l.familia_id into v_fam;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'lancamento nao esta na lixeira ou sem permissao' using errcode = 'P0002'; end if;
  return json_build_object('id', restaurar_lancamento.id, 'na_lixeira', false, 'resumo', produto._resumo(v_fam, produto._hoje()));
end $$;
;