
do $$ begin
  execute replace(pg_get_functiondef('produto._esc_brutas(uuid,timestamptz,text,text)'::regprocedure),
    'achou := dow <> 1 or hora >= 18;', 'achou := dow <> 1 or hora >= 18; select null::uuid as id, null::numeric as valor, null::date as data into cand;');
end $$;

create function produto._esc_diario_json(p_familia uuid, p_funcionario text, p_limite integer, p_antes timestamptz) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(x.j order by x.quando desc), '[]'::jsonb) from (
    select d.quando, jsonb_build_object('id', d.id, 'funcionario', d.funcionario, 'assunto', d.assunto, 'ref', d.ref, 'quando', d.quando,
             'data', to_char(d.quando at time zone 'America/Recife', 'DD/MM'), 'hora', to_char(d.quando at time zone 'America/Recife', 'HH24:MI'),
             'pergunta_curta', coalesce(d.dados->>'curta', left(d.pergunta, 60)), 'pergunta', d.pergunta, 'resposta', d.resposta, 'opcao', d.dados->>'opcao',
             'por', m.nome, 'adiado_ate', d.adiado_ate, 'corrige', d.dados->>'corrige',
             'anotado', 'anotado às ' || to_char(d.quando at time zone 'America/Recife', 'HH24:MI')) as j
      from produto.esc_diario d left join produto.membros m on m.familia_id = d.familia_id and m.user_id = d.respondido_por
     where d.familia_id = p_familia and (p_funcionario is null or d.funcionario = p_funcionario) and (p_antes is null or d.quando < p_antes)
     order by d.quando desc limit least(greatest(coalesce(p_limite, 10), 1), 200)) x
$$;

create function produto._esc_cadastro(p_familia uuid, p_hoje date, p_papel text) returns jsonb language plpgsql stable set search_path = '' as $$
declare f uuid := p_familia; cfg jsonb := '{}'::jsonb; cj jsonb; ej jsonb := produto._estoque_json(f); out jsonb := '{}'::jsonb; rs jsonb; g jsonb; c jsonb; mes text := to_char(p_hoje, 'YYYY-MM');
  dias constant text[] := array['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
begin
  out := out || jsonb_build_object('fiscal_feira', jsonb_build_object('titulo', 'Feiras e estoque', 'novo', 'Registrar feira', 'rpc', 'feira_registrar',
    'vazio', 'Nenhuma feira registrada ainda.', 'itens', produto._feiras_json(f, p_papel, 8), 'contagens', ej->'contagens', 'itens_da_casa', ej->'itens'));
  if p_papel = 'equipe' then
    c := produto.casa_da_equipe(f)::jsonb;
    return out || jsonb_build_object('comprador', jsonb_build_object('titulo', 'Prestadores e gás', 'novo', null, 'rpc', null, 'vazio', 'Nenhum prestador cadastrado.',
      'itens', (select coalesce(jsonb_agg(jsonb_build_object('id', p->>'id', 'servico', p->>'servico', 'nome', p->>'nome', 'dia', (p->>'dia')::int, 'ultima_vez', p->>'ultima_vez',
                  'linha', coalesce(p->>'servico', 'Prestador') || ': ' || coalesce(p->>'nome', '') || ', toda ' || dias[(p->>'dia')::int + 1])), '[]'::jsonb) from jsonb_array_elements(c->'prestadores') p),
      'gas', c->'gas'));
  end if;
  select coalesce(jsonb_object_agg(x.chave, x.valor), '{}'::jsonb) into cfg from produto.config_familia x
   where x.familia_id = f and x.chave in ('casa_prestadores', 'casa_gas', 'casa_folha', 'rendas', 'contas_fixas', 'renda_mes', 'reserva_onde');
  cj := produto._cartoes_json(f, p_hoje); rs := produto._resumo(f, p_hoje); g := produto._guardado(f, p_hoje);
  return out || jsonb_build_object(
    'analista_cartao', jsonb_build_object('titulo', 'Cartões e faturas', 'novo', 'Novo cartão', 'rpc', 'cartao_salvar', 'vazio', 'Nenhum cartão cadastrado. Só o apelido, nunca o número.',
      'itens', cj->'cartoes', 'faturas', cj->'faturas'),
    'folha_casa', jsonb_build_object('titulo', 'Quem trabalha na casa', 'novo', 'Nova pessoa', 'rpc', null, 'config', 'casa_folha', 'vazio', 'Ninguém cadastrado.',
      'guia_paga_em', cfg->'casa_folha'->'daePaga'->>mes,
      'itens', (select coalesce(jsonb_agg(jsonb_build_object('id', p->>'id', 'nome', p->>'nome', 'funcao', p->>'funcao', 'salario', p->'salario', 'dia_pagamento', coalesce(p->'diaPagamento', '5'::jsonb),
                  'salario_pago_no_mes', coalesce(cfg->'casa_folha'->'salarioPago', '{}'::jsonb) ? ((p->>'id') || ':' || mes),
                  'linha', coalesce(p->>'nome', '') || coalesce(', ' || (p->>'funcao'), '') || case when p->>'salario' ~ '^[0-9.]+$' then ' · ' || produto._brl((p->>'salario')::numeric) else '' end || ' · paga dia ' || coalesce(p->>'diaPagamento', '5'))), '[]'::jsonb)
                from jsonb_array_elements(case when jsonb_typeof(cfg->'casa_folha'->'pessoas') = 'array' then cfg->'casa_folha'->'pessoas' else '[]'::jsonb end) p)),
    'comprador', jsonb_build_object('titulo', 'Prestadores e gás', 'novo', 'Novo prestador', 'rpc', null, 'config', 'casa_prestadores', 'vazio', 'Nenhum prestador cadastrado.',
      'itens', (select coalesce(jsonb_agg(jsonb_build_object('id', p->>'id', 'servico', p->>'servico', 'nome', p->>'nome', 'dia', p->'dia', 'valor', p->'valor', 'ultima_vez', p->>'ultimaVez',
                  'linha', coalesce(p->>'servico', 'Prestador') || ': ' || coalesce(p->>'nome', '') || case when (p->>'dia') ~ '^[0-6]$' then ', toda ' || dias[(p->>'dia')::int + 1] else '' end
                           || case when p->>'valor' ~ '^[0-9.]+$' then ' · ' || produto._brl((p->>'valor')::numeric) else '' end)), '[]'::jsonb)
                from jsonb_array_elements(case when jsonb_typeof(cfg->'casa_prestadores') = 'array' then cfg->'casa_prestadores' else '[]'::jsonb end) p),
      'gas', produto._casa_previsao(cfg->'casa_gas'->'trocas') || jsonb_build_object('custo', cfg->'casa_gas'->'custo')),
    'gestor_guardado', jsonb_build_object('titulo', 'Onde o dinheiro está guardado', 'novo', 'Nova aplicação', 'rpc', 'guardado_criar', 'vazio', 'Nada guardado ainda.', 'total', g->'total',
      'itens', (select coalesce(jsonb_agg(jsonb_build_object('id', a->>'id', 'nome', a->>'nome', 'banco', a->>'banco', 'tipo', a->>'tipo', 'saldo', a->'saldo', 'rendeu_hoje_liquido', a->'rendeu_hoje_liquido', 'vence_em', a->'vence_em',
                  'linha', (a->>'nome') || ' (' || (a->>'banco') || '): ' || produto._brl((a->>'saldo')::numeric) || ' · rendeu hoje ' || produto._brl((a->>'rendeu_hoje_liquido')::numeric))), '[]'::jsonb) from jsonb_array_elements(g->'aplicacoes') a)),
    'guardiao_colchao', jsonb_build_object('titulo', 'A reserva (o dinheiro que vocês combinaram nunca gastar)', 'novo', null, 'rpc', null, 'config', 'reserva_onde', 'vazio', 'Nenhuma reserva combinada ainda.',
      'combinado', (select coalesce(sum((e->>'colchao_meta')::numeric), 0) from jsonb_array_elements(rs->'envelopes') e), 'atual', rs->'colchao',
      'falta', greatest((select coalesce(sum((e->>'colchao_meta')::numeric), 0) from jsonb_array_elements(rs->'envelopes') e) - coalesce((rs->>'colchao')::numeric, 0), 0),
      'onde', coalesce(cfg->>'reserva_onde', 'conta'),
      'onde_texto', case coalesce(cfg->>'reserva_onde', 'conta') when 'conta' then 'Na conta comum, que não rende' when 'guardada' then 'Guardada onde rende' else 'Guardada em uma aplicação' end,
      'itens', (select coalesce(jsonb_agg(jsonb_build_object('id', e->>'id', 'nome', e->>'nome', 'combinado', e->'colchao_meta', 'atual', e->'colchao',
                  'linha', (e->>'nome') || ': combinado ' || produto._brl((e->>'colchao_meta')::numeric) || ', hoje tem ' || produto._brl(coalesce((e->>'colchao')::numeric, 0)))), '[]'::jsonb)
                from jsonb_array_elements(rs->'envelopes') e where coalesce((e->>'colchao_meta')::numeric, 0) > 0)),
    'contador', jsonb_build_object('titulo', 'Rendas e contas fixas', 'novo', 'Nova renda ou conta fixa', 'rpc', null, 'config', 'rendas', 'vazio', 'Nenhuma renda nem conta fixa cadastrada.',
      'itens', case when jsonb_typeof(cfg->'rendas') = 'array' then
                 (select coalesce(jsonb_agg(p || jsonb_build_object('tipo', 'renda', 'linha', 'Renda: ' || coalesce(p->>'nome', p->>'de', '') || case when p->>'valor' ~ '^[0-9.]+$' then ' · ' || produto._brl((p->>'valor')::numeric) else '' end || coalesce(' · dia ' || (p->>'dia'), ''))), '[]'::jsonb) from jsonb_array_elements(cfg->'rendas') p)
               when cfg->>'renda_mes' ~ '^[0-9.]+$' then jsonb_build_array(jsonb_build_object('id', 'renda_mes', 'tipo', 'renda', 'nome', 'Renda da família', 'valor', cfg->'renda_mes', 'linha', 'Renda da família: ' || produto._brl((cfg->>'renda_mes')::numeric) || ' por mês'))
               else '[]'::jsonb end,
      'contas_fixas', case when jsonb_typeof(cfg->'contas_fixas') = 'array' then
                 (select coalesce(jsonb_agg(p || jsonb_build_object('tipo', 'conta_fixa', 'linha', coalesce(p->>'nome', '') || case when p->>'valor' ~ '^[0-9.]+$' then ' · ' || produto._brl((p->>'valor')::numeric) else '' end || coalesce(' · dia ' || (p->>'dia'), ''))), '[]'::jsonb) from jsonb_array_elements(cfg->'contas_fixas') p)
               else '[]'::jsonb end),
    'secretaria', jsonb_build_object('titulo', 'Lembretes', 'novo', 'Novo lembrete', 'rpc', 'lembrete_criar', 'vazio', 'Nenhum lembrete guardado.', 'itens', produto._lembretes_json(f)));
end $$;

create or replace function produto._escritorio(p_familia uuid, p_agora timestamptz) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  f uuid := p_familia; papel text := produto.meu_papel(f); uid uuid := (select auth.uid()); nome text;
  tz constant text := 'America/Recife'; hoje date := (p_agora at time zone 'America/Recife')::date;
  b jsonb; t jsonb; ul record; tem boolean; nresp int; dias int; var int; vi text; lembra text; sug text; obj jsonb; q jsonb := '[]'::jsonb; ordmin int; cad jsonb; funcs jsonb;
begin
  if papel is null then raise exception 'voce nao faz parte desta familia' using errcode = '42501'; end if;
  if papel not in ('casal', 'equipe') then
    return jsonb_build_object('precisa_de_voce', '[]'::jsonb, 'trabalhando', '[]'::jsonb, 'entregue', '[]'::jsonb, 'avisos', '[]'::jsonb, 'funcionarios', '[]'::jsonb, 'total_precisa', 0, 'papel', papel, 'agora', p_agora);
  end if;
  select split_part(btrim(m.nome), ' ', 1) into nome from produto.membros m where m.familia_id = f and m.user_id = uid and m.ativo limit 1;
  b := produto._esc_brutas(f, p_agora, papel, nome);
  for t in select x from jsonb_array_elements(b->'q') x loop
    continue when papel = 'equipe' and not ((t->>'casa')::boolean and t->>'assunto' in ('prestador_veio', 'gas', 'feira_feita', 'feira_nota', 'estoque'));
    select d.quando, d.resposta, d.dados, d.adiado_ate into ul from produto.esc_diario d where d.familia_id = f and d.ref = t->>'id' order by d.quando desc limit 1;
    tem := found;
    continue when tem and (ul.adiado_ate is null or ul.adiado_ate > p_agora);
    select count(*) into nresp from produto.esc_diario d where d.familia_id = f and d.ref = t->>'id';
    dias := coalesce((t->>'dias_esperando')::int, greatest(hoje - ((t->>'desde')::timestamptz at time zone tz)::date, 0));
    var := case when dias <= 0 then 1 when dias <= 2 then 2 else 3 end;
    if nresp > 0 and var = 1 then var := 2; end if;
    vi := replace(t->'vi'->>(var - 1), '{dias}', produto._esc_espera(dias));
    lembra := null; sug := t->>'sugiro';
    if tem then
      if t->>'assunto' = 'colchao' and coalesce(ul.dados->>'texto', '') <> '' then
        lembra := 'Dia ' || produto._d((ul.quando at time zone tz)::date) || ' você me disse que ia repor'
          || case when ul.dados->>'data' ~ '^\d{4}-\d{2}-\d{2}$' then ' até dia ' || produto._d((ul.dados->>'data')::date) else '' end || ' com: ' || (ul.dados->>'texto') || '. Hoje é dia ' || produto._d(hoje) || '.';
        sug := 'Esse dinheiro entrou?';
      else
        lembra := 'Dia ' || produto._d((ul.quando at time zone tz)::date) || ' você me respondeu: ' || ul.resposta || '.';
      end if;
    end if;
    obj := (t - 'vi' - 'dias_esperando' - 'sugiro' - 'importa') || jsonb_build_object(
      'pergunta', vi || coalesce(' ' || lembra, '') || ' ' || sug, 'contexto', t->>'importa',
      'fala', vi || coalesce(' ' || lembra, '') || ' ' || (t->>'importa') || ' ' || sug,
      'partes', jsonb_build_object('vi', vi, 'lembra', lembra, 'importa', t->>'importa', 'sugiro', sug),
      'dias_esperando', dias, 'variacao', var, 'cobrancas', nresp + 1, 'atrasado_dias', greatest(hoje - (t->>'vence_em')::date, 0));
    if papel = 'equipe' then obj := obj - 'valor' - 'lancamento_id'; end if;
    q := q || obj;
  end loop;
  -- o Fiscal da Feira cobra 1 coisa por vez, na ordem
  select min((x->>'ordem')::int) into ordmin from jsonb_array_elements(q) x where x->>'funcionario' = 'fiscal_feira';
  select coalesce(jsonb_agg(x - 'ordem' order by (x->>'atrasado_dias')::int desc, x->>'desde', x->>'id'), '[]'::jsonb) into q
    from jsonb_array_elements(q) x where x->>'funcionario' <> 'fiscal_feira' or (x->>'ordem')::int = ordmin;

  cad := produto._esc_cadastro(f, hoje, papel);
  select coalesce(jsonb_agg(jsonb_build_object('id', fu.id, 'nome', fu.nome, 'sala', fu.sala,
           'estado', case when pq.n > 0 then 'precisa_de_voce' when en.resumo is not null then 'entregue' when tr.frase is not null then 'trabalhando' else 'vai_comecar' end,
           'frase', coalesce(pq.j->>'pergunta', en.resumo, tr.frase, fu.parado), 'pendentes', pq.n,
           'agora', pq.j, 'sem_pergunta', case when pq.n = 0 then 'Hoje não preciso de nada seu.' end, 'fez_hoje', coalesce(en.resumo, tr.frase),
           'avisos', (select coalesce(jsonb_agg(x->>'texto'), '[]'::jsonb) from jsonb_array_elements(b->'avisos') x where x->>'funcionario' = fu.id),
           'cadastro_resumo', coalesce(cad->fu.id, '{}'::jsonb),
           'ultimas_respostas', produto._esc_diario_json(f, fu.id, 10, null),
           'faz', fu.faz) order by fu.ord), '[]'::jsonb) into funcs
    from produto._esc_func() fu
    left join lateral (select count(*) n, (select y.j from jsonb_array_elements(q) with ordinality y(j, o) where y.j->>'funcionario' = fu.id order by y.o limit 1) j
                         from jsonb_array_elements(q) x where x->>'funcionario' = fu.id) pq on true
    left join lateral (select x->>'resumo' resumo from jsonb_array_elements(b->'ent') x where x->>'funcionario' = fu.id limit 1) en on true
    left join lateral (select x->>'frase' frase from jsonb_array_elements(b->'trab') x where x->>'funcionario' = fu.id limit 1) tr on true
   where papel = 'casal' or fu.casa;

  return jsonb_build_object('precisa_de_voce', q, 'trabalhando', b->'trab', 'entregue', b->'ent', 'avisos', b->'avisos', 'funcionarios', funcs,
    'total_precisa', jsonb_array_length(q), 'papel', papel, 'nome', nome, 'hoje', hoje, 'agora', p_agora);
end $$;

create function produto._esc_responder(p_familia uuid, p_pergunta text, p_opcao text, p_dados jsonb, p_agora timestamptz) returns jsonb
language plpgsql set search_path = '' as $$
declare
  f uuid := p_familia; papel text := produto.meu_papel(f); uid uuid := (select auth.uid()); tz constant text := 'America/Recife';
  hoje date := (p_agora at time zone 'America/Recife')::date; am8 timestamptz; d jsonb := coalesce(p_dados, '{}'::jsonb);
  esc jsonb; qj jsonb; op jsonb; old record; corrige uuid; ass text; adiado timestamptz; efeito jsonb := '{}'::jsonb; resp text; did uuid; casa_ok boolean;
  v numeric; dt date; txt text; cfg jsonb; aid uuid; j jsonb; mes text := to_char(hoje, 'YYYY-MM'); pid text; perg text;
begin
  if papel is null or papel not in ('casal', 'equipe') then raise exception 'so o casal e a equipe da casa respondem ao escritorio' using errcode = '42501'; end if;
  if jsonb_typeof(d) <> 'object' then raise exception 'dados tem que ser um objeto json' using errcode = '22023'; end if;
  am8 := ((hoje + 1) + time '08:00') at time zone tz;
  perform pg_advisory_xact_lock(hashtextextended('escritorio:' || f::text, 0));
  esc := produto._escritorio(f, p_agora);
  select x into qj from jsonb_array_elements(esc->'precisa_de_voce') x where x->>'id' = p_pergunta;
  if qj is null then
    select dd.id, dd.pergunta, dd.dados, dd.funcionario, dd.assunto into old from produto.esc_diario dd where dd.familia_id = f and dd.ref = p_pergunta order by dd.quando desc limit 1;
    if not found or old.dados->'q' is null then raise exception 'essa pergunta nao existe mais ou ja foi resolvida' using errcode = 'P0002'; end if;
    corrige := old.id;
    qj := (old.dados->'q') || jsonb_build_object('id', p_pergunta, 'funcionario', old.funcionario, 'assunto', old.assunto, 'pergunta', old.pergunta);
  end if;
  select x into op from jsonb_array_elements(qj->'opcoes') x where x->>'id' = p_opcao;
  if op is null then raise exception 'essa resposta nao existe pra essa pergunta' using errcode = '22023'; end if;
  ass := qj->>'assunto';
  -- confere o que o botao pede
  if d ? 'data' and d->>'data' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'data no formato AAAA-MM-DD' using errcode = '22023'; end if;
  if d ? 'valor' and (d->>'valor' !~ '^[0-9]+(\.[0-9]+)?$' or (d->>'valor')::numeric > 100000000) then raise exception 'valor invalido' using errcode = '22023'; end if;
  if papel = 'equipe' then d := d - 'valor'; end if;
  if op->>'pede' = 'data' and not d ? 'data' then raise exception 'faltou a data' using errcode = '22023'; end if;
  if op->>'pede' = 'valor' and not d ? 'valor' then raise exception 'faltou o valor' using errcode = '22023'; end if;
  if op->>'pede' = 'texto' and btrim(coalesce(d->>'texto', '')) = '' then raise exception 'faltou escrever a resposta' using errcode = '22023'; end if;
  v := (d->>'valor')::numeric; dt := (d->>'data')::date; txt := left(btrim(coalesce(d->>'texto', '')), 200);
  resp := (op->>'rotulo') || case when op->>'pede' = 'texto' or (op->>'pede2' = 'texto' and txt <> '') then ': ' || txt else '' end
    || case when v is not null and (op->>'pede' = 'valor' or op->>'pede2' = 'valor') then case when op->>'pede' = 'valor' then ': ' else ', ' end || produto._brl(v) else '' end
    || case when dt is not null and (op->>'pede' = 'data' or op->>'pede2' = 'data') then case when op->>'pede' = 'data' then ': ' else ', dia ' end || produto._d(dt) else '' end;

  if ass = 'lancou_hoje' then
    if p_opcao = 'lancar' then adiado := p_agora + interval '30 minutes';
    elsif p_opcao = 'lembrar_22' then adiado := greatest((hoje + time '22:00') at time zone tz, p_agora + interval '30 minutes'); end if;
  elsif ass = 'fechou_mes' then
    if p_opcao = 'guardar' then
      aid := case when d->>'aplicacao' ~ '^[0-9a-f-]{36}$' then (d->>'aplicacao')::uuid end;
      if aid is null then
        select (x->>'id')::uuid into aid from jsonb_array_elements(produto._guardado(f, hoje)->'aplicacoes') x where x->>'liquidez' = 'diaria' and x->>'tipo' <> 'poupanca' order by (x->>'saldo')::numeric desc limit 1;
      end if;
      if aid is null then
        adiado := am8; efeito := jsonb_build_object('abre', 'guardado', 'aviso', 'Ainda não tem onde guardar. Cadastre a 1ª aplicação e eu pergunto de novo amanhã.');
      else
        j := produto._guardado_movimentar(aid, 'aporte', v, hoje, coalesce(case when d->>'chave' ~ '^[0-9a-f-]{36}$' then (d->>'chave')::uuid end, md5(f::text || p_pergunta)::uuid), hoje);
        efeito := jsonb_build_object('guardado_total', j->'total', 'aplicacao_id', aid, 'movimento_id', j->'movimento_id');
      end if;
    elsif p_opcao = 'depois' then adiado := am8; end if;
  elsif ass = 'fatura' then
    if p_opcao in ('paguei_hoje', 'paguei_outro_dia') then
      dt := case when p_opcao = 'paguei_hoje' then hoje else dt end;
      if dt > hoje then raise exception 'a data do pagamento nao pode ser no futuro' using errcode = '22023'; end if;
      insert into produto.cartao_faturas as cf (familia_id, cartao_id, mes, paga_em, paga_por) values (f, (qj->>'cartao_id')::uuid, qj->>'mes', dt, uid)
      on conflict (familia_id, cartao_id, mes) do update set paga_em = excluded.paga_em, paga_por = excluded.paga_por, atualizado_em = now();
      efeito := jsonb_build_object('fatura_paga_em', dt);
    else
      update produto.cartao_faturas cf set paga_em = null, paga_por = null, atualizado_em = now() where cf.familia_id = f and cf.cartao_id = (qj->>'cartao_id')::uuid and cf.mes = qj->>'mes' and cf.paga_em is not null;
      adiado := am8;
    end if;
  elsif ass = 'fatura_diferenca' then
    if p_opcao = 'explicar' then
      update produto.cartao_faturas cf set diferenca_motivo = txt, atualizado_em = now() where cf.familia_id = f and cf.cartao_id = (qj->>'cartao_id')::uuid and cf.mes = qj->>'mes';
    elsif p_opcao = 'lancar' then adiado := p_agora + interval '1 hour'; efeito := jsonb_build_object('abre', 'lancar');
    else adiado := am8; end if;
  elsif ass = 'mensalidade' then
    if p_opcao = 'depois' then adiado := am8; end if;
  elsif ass = 'cartao_dias' then
    adiado := case when p_opcao = 'informar' then p_agora + interval '1 hour' else am8 end;
  elsif ass = 'anuidade' then
    if p_opcao = 'lembrar' then
      insert into produto.esc_lembretes (familia_id, criado_por, titulo, detalhe, quando, repetir, para, funcionario, chave)
      values (f, uid, 'Ligar pro banco e pedir isenção da anuidade do ' || coalesce(qj->>'cartao', 'cartão'), 'Diga que quer cancelar o cartão se a anuidade não for retirada.',
              ((date_trunc('month', hoje) + interval '1 month')::date + time '09:00') at time zone tz, 'nunca', 'casal', 'analista_cartao', md5(f::text || p_pergunta)::uuid)
      on conflict (familia_id, chave) where chave is not null do nothing;
      efeito := jsonb_build_object('lembrete_criado', true);
    end if;
  elsif ass in ('dae', 'salario') then
    if p_opcao = 'ainda_nao' then adiado := am8;
    else
      select coalesce(x.valor, '{}'::jsonb) into cfg from produto.config_familia x where x.familia_id = f and x.chave = 'casa_folha';
      if cfg is null or jsonb_typeof(cfg) <> 'object' then cfg := '{}'::jsonb; end if;
      if ass = 'dae' then
        dt := case when p_opcao = 'paguei_hoje' then hoje else dt end;
        cfg := jsonb_set(cfg, '{daePaga}', coalesce(cfg->'daePaga', '{}'::jsonb) || jsonb_build_object(split_part(p_pergunta, ':', 2), dt));
      else
        pid := split_part(p_pergunta, ':', 2) || ':' || split_part(p_pergunta, ':', 3);
        cfg := jsonb_set(cfg, '{salarioPago}', coalesce(cfg->'salarioPago', '{}'::jsonb) || jsonb_build_object(pid, jsonb_build_object('data', hoje, 'valor', v)));
      end if;
      insert into produto.config_familia (familia_id, chave, valor) values (f, 'casa_folha', cfg) on conflict (familia_id, chave) do update set valor = excluded.valor;
    end if;
  elsif ass = 'colchao' then
    adiado := case when p_opcao = 'repor' and dt is not null and dt >= hoje then ((dt + 1) + time '08:00') at time zone tz when p_opcao = 'repor' then ((hoje + 7) + time '08:00') at time zone tz else am8 end;
  elsif ass = 'reserva_parada' then
    if p_opcao = 'mostrar' then adiado := p_agora + interval '7 days'; efeito := jsonb_build_object('abre', 'guardado');
    elsif p_opcao = 'ja_guardada' then
      insert into produto.config_familia (familia_id, chave, valor) values (f, 'reserva_onde', '"guardada"'::jsonb) on conflict (familia_id, chave) do update set valor = excluded.valor;
    end if;
  elsif ass = 'saldo_conferir' then
    if p_opcao = 'conferi' then
      j := produto._guardado_movimentar((qj->>'aplicacao_id')::uuid, 'saldo_conferido', v, hoje, coalesce(case when d->>'chave' ~ '^[0-9a-f-]{36}$' then (d->>'chave')::uuid end, gen_random_uuid()), hoje);
      efeito := jsonb_build_object('diferenca', j->'diferenca', 'frase', case when coalesce((j->>'diferenca')::numeric, 0) = 0 then 'Bateu com a minha conta.'
        when (j->>'diferenca')::numeric > 0 then 'O banco mostra ' || produto._brl((j->>'diferenca')::numeric) || ' a mais que a minha conta. Passei a usar o número do banco.'
        else 'O banco mostra ' || produto._brl(-(j->>'diferenca')::numeric) || ' a menos que a minha conta. Passei a usar o número do banco.' end);
    else adiado := am8; end if;
  elsif ass = 'cdb_vence' then
    if p_opcao = 'renovar' then
      if dt <= hoje then raise exception 'o novo vencimento tem que ser depois de hoje' using errcode = '22023'; end if;
      update produto.pat_aplicacoes x set vence_em = dt where x.familia_id = f and x.id = (qj->>'aplicacao_id')::uuid;
    elsif p_opcao = 'resgatar' then adiado := p_agora + interval '3 days'; efeito := jsonb_build_object('abre', 'guardado');
    else adiado := am8; end if;
  elsif ass = 'lembrete' then
    if p_opcao = 'feito' then perform produto._lembrete_mexer((qj->>'lembrete_id')::uuid, 'concluir', null, p_agora);
    elsif p_opcao = 'adiar_1_dia' then perform produto._lembrete_mexer((qj->>'lembrete_id')::uuid, 'adiar', p_agora + interval '1 day', p_agora);
    else perform produto._lembrete_mexer((qj->>'lembrete_id')::uuid, 'adiar', (dt + time '09:00') at time zone tz, p_agora); end if;
  elsif ass = 'prestador_vespera' then
    if p_opcao = 'copiar_mensagem' then adiado := p_agora + interval '2 hours'; efeito := jsonb_build_object('mensagem', qj->>'mensagem'); end if;
  elsif ass = 'prestador_veio' then
    if p_opcao = 'veio' then perform produto.casa_marcar(f, 'prestador_veio', jsonb_build_object('id', qj->>'prestador_id')); end if;
  elsif ass = 'gas' then
    if p_opcao = 'troquei' then perform produto.casa_marcar(f, 'troquei_gas', '{}'::jsonb);
    elsif p_opcao = 'ja_pedi' then adiado := p_agora + interval '2 days';
    else adiado := am8; end if;
  elsif ass = 'feira_feita' then
    if p_opcao = 'foi_feita' then
      j := produto._feira_registrar(f, coalesce(dt, hoje), v, d->>'loja', null, case when d->>'chave' ~ '^[0-9a-f-]{36}$' then (d->>'chave')::uuid end, null, hoje);
      efeito := jsonb_build_object('feira', j->'feira');
    elsif p_opcao = 'foi_essa' then
      j := produto._feira_registrar(f, (qj->>'data')::date, null, d->>'loja', (qj->>'lancamento_id')::uuid, null, null, hoje);
      efeito := jsonb_build_object('feira', j->'feira');
    elsif p_opcao = 'ainda_nao' then adiado := am8; end if;
  elsif ass = 'feira_valor' then
    if p_opcao = 'dizer' then
      j := produto._feira_registrar(f, null, v, null, null, null, (qj->>'feira_id')::uuid, hoje); efeito := jsonb_build_object('feira', j->'feira');
    else adiado := am8; end if;
  elsif ass = 'feira_nota' then
    if p_opcao = 'anexar' then
      if coalesce(d->>'caminho', '') <> '' then
        efeito := produto.feira_anexar_nota((qj->>'feira_id')::uuid, d->>'caminho')::jsonb;
      else adiado := p_agora + interval '1 hour'; efeito := jsonb_build_object('abre', 'nota', 'feira_id', qj->>'feira_id', 'caminho', f::text || '/' || (qj->>'feira_id') || '.jpg'); end if;
    elsif p_opcao = 'sem_nota' then efeito := produto.feira_sem_nota((qj->>'feira_id')::uuid, txt)::jsonb;
    else adiado := am8; end if;
  elsif ass = 'estoque' then
    if p_opcao = 'contar' then
      if jsonb_typeof(d->'itens') = 'array' then efeito := produto._estoque_contar(f, d->'itens', null, hoje); resp := resp || ': ' || (efeito->'contagem'->>'acabaram') || ' acabaram';
      else adiado := p_agora + interval '1 hour'; efeito := jsonb_build_object('abre', 'contagem'); end if;
    elsif p_opcao = 'pedir_equipe' then adiado := p_agora + interval '2 days';
    else adiado := am8; end if;
  end if;

  perg := left(qj->>'pergunta', 400);
  casa_ok := coalesce((qj->>'casa')::boolean, false) and ass in ('prestador_veio', 'gas', 'feira_feita', 'feira_nota', 'estoque') and perg !~ 'R\$' and resp !~ 'R\$' and not d ? 'valor';
  insert into produto.esc_diario (familia_id, funcionario, assunto, ref, pergunta, resposta, dados, respondido_por, quando, adiado_ate, casa)
  values (f, qj->>'funcionario', ass, p_pergunta, perg, left(resp, 400),
          jsonb_strip_nulls((d - 'itens' - 'chave') || jsonb_build_object('opcao', p_opcao, 'curta', qj->>'curta', 'desde', qj->>'desde', 'corrige', corrige,
            'q', (qj - 'pergunta' - 'contexto' - 'fala' - 'partes' - 'valor' - 'id' - 'funcionario' - 'assunto' - 'atrasado_dias' - 'dias_esperando' - 'variacao' - 'cobrancas'))),
          uid, p_agora, adiado, casa_ok)
  returning id into did;
  return jsonb_build_object('ok', true, 'corrigiu', corrige is not null, 'efeito', efeito,
    'anotado', jsonb_build_object('id', did, 'funcionario', qj->>'funcionario', 'pergunta_curta', qj->>'curta', 'resposta', left(resp, 400), 'quando', p_agora,
      'hora', to_char(p_agora at time zone tz, 'HH24:MI'), 'texto', 'anotado às ' || to_char(p_agora at time zone tz, 'HH24:MI'), 'volta_em', adiado),
    'escritorio', produto._escritorio(f, p_agora));
end $$;

create function produto._esc_relatorio(p_familia uuid, p_de date, p_ate date, p_agora timestamptz) returns jsonb language plpgsql stable set search_path = '' as $$
declare f uuid := p_familia; papel text := produto.meu_papel(f); esc jsonb; de date; ate date; tz constant text := 'America/Recife';
begin
  if papel is null or papel not in ('casal', 'equipe') then raise exception 'so o casal e a equipe da casa veem o relatorio' using errcode = '42501'; end if;
  ate := coalesce(p_ate, (p_agora at time zone tz)::date); de := coalesce(p_de, ate - 29);
  if de > ate or ate - de > 400 then raise exception 'periodo invalido (ate 400 dias)' using errcode = '22023'; end if;
  esc := produto._escritorio(f, p_agora);
  return jsonb_build_object('de', de, 'ate', ate,
    'funcionarios', (select coalesce(jsonb_agg(jsonb_build_object('id', fu.id, 'nome', fu.nome, 'sala', fu.sala,
        'perguntas', coalesce(s.perguntas, 0), 'respondidas', coalesce(s.respondidas, 0), 'adiadas', coalesce(s.perguntas, 0) - coalesce(s.respondidas, 0),
        'tempo_medio_min', s.tempo_min, 'pendentes', (select count(*) from jsonb_array_elements(esc->'precisa_de_voce') x where x->>'funcionario' = fu.id),
        'frase', case when coalesce(s.perguntas, 0) = 0 then 'Não precisei perguntar nada nesse período.'
                      else 'Fiz ' || s.perguntas || case when s.perguntas = 1 then ' pergunta e ' else ' perguntas e ' end || s.respondidas || case when s.respondidas = 1 then ' foi resolvida' else ' foram resolvidas' end
                           || coalesce(', em média em ' || case when s.tempo_min >= 2880 then round(s.tempo_min / 1440) || ' dias' when s.tempo_min >= 120 then round(s.tempo_min / 60) || ' horas' else greatest(round(s.tempo_min), 1) || ' min' end, '') || '.' end)
        order by fu.ord), '[]'::jsonb)
      from produto._esc_func() fu
      left join lateral (
        select count(*) perguntas, count(*) filter (where r.ult_adiado is null) respondidas, round(avg(r.espera_min) filter (where r.espera_min is not null)) tempo_min
          from (select dd.ref, (array_agg(dd.adiado_ate order by dd.quando desc))[1] ult_adiado,
                       greatest(extract(epoch from min(dd.quando) - min((dd.dados->>'desde')::timestamptz)) / 60, 0) espera_min
                  from produto.esc_diario dd where dd.familia_id = f and dd.funcionario = fu.id and (dd.quando at time zone tz)::date between de and ate group by dd.ref) r) s on true
     where papel = 'casal' or fu.casa),
    'linha_do_tempo', (select coalesce(jsonb_agg(x order by x->>'quando' desc), '[]'::jsonb) from jsonb_array_elements(produto._esc_diario_json(f, null, 200, ((ate + 1)::timestamp at time zone tz))) x
                        where ((x->>'quando')::timestamptz at time zone tz)::date >= de));
end $$;

create function produto.escritorio_responder(familia uuid, pergunta_id text, opcao text, dados jsonb default '{}'::jsonb) returns json language sql set search_path = '' as $$
  select produto._esc_responder(familia, pergunta_id, opcao, dados, now())::json
$$;
create function produto.escritorio_relatorio(familia uuid, de date default null, ate date default null) returns json language sql stable set search_path = '' as $$
  select produto._esc_relatorio(familia, de, ate, now())::json
$$;
create function produto.escritorio_diario(familia uuid, funcionario text default null, limite integer default 30, antes timestamptz default null) returns json
language plpgsql stable set search_path = '' as $$
declare papel text := produto.meu_papel(familia); j jsonb;
begin
  if papel is null or papel not in ('casal', 'equipe') then raise exception 'so o casal e a equipe da casa veem o diario' using errcode = '42501'; end if;
  j := produto._esc_diario_json(familia, funcionario, least(coalesce(limite, 30), 200) + 1, antes);
  return json_build_object('itens', (select coalesce(jsonb_agg(x order by o), '[]'::jsonb) from jsonb_array_elements(j) with ordinality t(x, o) where o <= least(coalesce(limite, 30), 200)),
    'tem_mais', jsonb_array_length(j) > least(coalesce(limite, 30), 200),
    'proximo_antes', (select x->>'quando' from jsonb_array_elements(j) with ordinality t(x, o) where o = least(coalesce(limite, 30), 200)));
end $$;

do $$ declare r record; begin
  for r in select p.oid::regprocedure sig from pg_proc p where p.pronamespace = 'produto'::regnamespace
            and p.proname in ('_esc_func','_esc_espera','_esc_p','_esc_brutas','_esc_diario_json','_esc_cadastro','_escritorio','_esc_responder','_esc_relatorio',
              'escritorio_responder','escritorio_relatorio','escritorio_diario','escritorio_hoje') loop
    execute format('revoke execute on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end $$;
;