
create function produto._esc_funcionarios() returns table(ord int, id text, nome text, sala text, casa boolean, parado text)
language sql immutable set search_path = '' as $$ values
  (1, 'contador', 'Contador', 'Caixa', false, 'Às 20h eu confiro se os gastos de hoje foram lançados.'),
  (2, 'guardiao_colchao', 'Guardião do Colchão', 'Caixa', false, 'Separe um colchão em algum envelope e eu aviso se ele baixar.'),
  (3, 'analista_cartao', 'Analista de Cartão', 'Cartões', false, 'Nenhuma fatura vencendo nos próximos dias.'),
  (4, 'folha_casa', 'Folha da Casa', 'Casa', false, 'Cadastre quem trabalha na casa e eu cobro a guia DAE e o salário.'),
  (5, 'comprador', 'Comprador', 'Casa', true, 'Sem visita de prestador nem troca de gás por agora.'),
  (6, 'gestor_guardado', 'Gestor do Guardado', 'Patrimônio', false, 'Cadastre a 1ª aplicação e eu digo quanto ela rende por dia.'),
  (7, 'secretaria', 'Secretária', 'Recepção', false, 'Nenhum lembrete pra agora. Crie um em Lembretes.')
$$;

create function produto._esc_q(p_id text, p_func text, p_assunto text, p_pergunta text, p_contexto text, p_valor numeric, p_opcoes jsonb,
  p_vence date, p_desde timestamptz, p_casa boolean default false, p_extra jsonb default '{}'::jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_array(jsonb_build_object('id', p_id, 'funcionario', p_func, 'assunto', p_assunto, 'pergunta', p_pergunta, 'contexto', coalesce(p_contexto, ''),
    'opcoes', p_opcoes, 'vence_em', p_vence, 'desde', p_desde, 'casa', p_casa)
    || case when p_valor is null then '{}'::jsonb else jsonb_build_object('valor', round(p_valor, 2)) end || coalesce(p_extra, '{}'::jsonb))
$$;

create function produto._escritorio(p_familia uuid, p_agora timestamptz) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  f uuid := p_familia; papel text := produto.meu_papel(f); uid uuid := (select auth.uid()); eu uuid;
  tz constant text := 'America/Recife';
  agl timestamp := p_agora at time zone 'America/Recife'; hoje date; hora int; mes text; dia int; dow int; amanha date; ini_mes date;
  q jsonb := '[]'::jsonb; ent jsonb := '[]'::jsonb; trab jsonb := '[]'::jsonb; funcs jsonb;
  cfg jsonb := '{}'::jsonb; prest jsonb := '[]'::jsonb; gas jsonb; folha jsonb := '{}'::jsonb; pagas jsonb := '{}'::jsonb; c jsonb;
  r record; p jsonb; e jsonb; a jsonb; g jsonb; rs jsonb;
  n int; tot numeric; v numeric; dt date; txt text; pid text; ult date; pt date; nd int; nome text; achou boolean;
  op_pag constant jsonb := '[{"id":"paguei_hoje","rotulo":"Paguei hoje"},{"id":"paguei_outro_dia","rotulo":"Paguei outro dia","pede":"data"},{"id":"ainda_nao","rotulo":"Ainda não"}]';
begin
  hoje := agl::date; hora := extract(hour from agl)::int; mes := to_char(hoje, 'YYYY-MM'); dia := extract(day from hoje)::int;
  dow := extract(dow from hoje)::int; amanha := hoje + 1; ini_mes := date_trunc('month', hoje)::date;
  if papel is null then raise exception 'voce nao faz parte desta familia' using errcode = '42501'; end if;
  if papel not in ('casal', 'equipe') then
    return jsonb_build_object('precisa_de_voce', '[]'::jsonb, 'trabalhando', '[]'::jsonb, 'entregue', '[]'::jsonb, 'funcionarios', '[]'::jsonb, 'total_precisa', 0, 'papel', papel, 'agora', p_agora);
  end if;
  select m.id into eu from produto.membros m where m.familia_id = f and m.user_id = uid and m.ativo limit 1;

  if papel = 'casal' then
    select coalesce(jsonb_object_agg(x.chave, x.valor), '{}'::jsonb) into cfg from produto.config_familia x
     where x.familia_id = f and x.chave in ('casa_prestadores', 'casa_gas', 'casa_folha', 'faturas_pagas', 'casa_lista');
    if jsonb_typeof(cfg->'casa_prestadores') = 'array' then prest := cfg->'casa_prestadores'; end if;
    gas := produto._casa_previsao(cfg->'casa_gas'->'trocas');
    if jsonb_typeof(cfg->'casa_folha') = 'object' then folha := cfg->'casa_folha'; end if;
    if jsonb_typeof(cfg->'faturas_pagas') = 'object' then pagas := cfg->'faturas_pagas'; end if;

    -- CONTADOR
    select count(*), coalesce(sum(l.valor), 0) into n, tot from produto.lancamentos l where l.familia_id = f and l.data = hoje and l.apagado_em is null;
    if n = 0 and hora >= 20 then
      q := q || produto._esc_q('lancou_hoje:' || hoje, 'contador', 'lancou_hoje', 'Você lançou os gastos de hoje?',
        'Não achei nenhum gasto lançado hoje (' || to_char(hoje, 'DD/MM') || ').', null,
        '[{"id":"lancar","rotulo":"Lançar agora"},{"id":"nao_gastei","rotulo":"Hoje não gastei"},{"id":"lembrar_22","rotulo":"Lembrar às 22h"}]',
        hoje, (hoje + time '20:00') at time zone tz);
    elsif n > 0 then
      ent := ent || jsonb_build_object('funcionario', 'contador', 'resumo', 'Você lançou ' || n || case when n = 1 then ' gasto hoje: ' else ' gastos hoje: ' end || produto._brl(tot), 'numero', tot);
    else
      trab := trab || jsonb_build_object('funcionario', 'contador', 'frase', 'Esperando os gastos de hoje. Às 20h eu pergunto se faltou algum.');
    end if;
    if dia <= 5 then
      dt := ini_mes - 1;
      v := (produto._resumo(f, dt)->>'livre_mes')::numeric;
      if coalesce(v, 0) >= 1 then
        q := q || produto._esc_q('fechou_mes:' || to_char(dt, 'YYYY-MM'), 'contador', 'fechou_mes', 'Fechei o mês: sobrou ' || produto._brl(v) || '. Quer mandar pro Guardado?',
          'É a sobra de ' || to_char(dt, 'MM/YYYY') || ', somando todos os envelopes.', v,
          '[{"id":"guardar","rotulo":"Guardar","pede":"valor"},{"id":"agora_nao","rotulo":"Agora não"}]', ini_mes + 4, ini_mes::timestamp at time zone tz);
      end if;
    end if;

    -- ANALISTA DE CARTAO
    for r in select * from jsonb_to_recordset(produto._faturas(f, (ini_mes - interval '1 month')::date, 3))
               as x(mes text, total numeric, cartao text, vence_em date, cartao_id uuid) order by x.vence_em loop
      continue when coalesce(r.total, 0) <= 0;
      pid := r.cartao_id || ':' || r.mes;
      if pagas ? pid then
        if r.vence_em >= hoje - 10 then
          ent := ent || jsonb_build_object('funcionario', 'analista_cartao', 'resumo', 'Fatura do ' || r.cartao || ' de ' || produto._brl(r.total) || ' paga', 'numero', r.total);
        end if;
      elsif hoje between r.vence_em - 3 and r.vence_em + 30 then
        q := q || produto._esc_q('fatura:' || pid, 'analista_cartao', 'fatura',
          'A fatura do ' || r.cartao || ' de ' || produto._brl(r.total) || case when hoje > r.vence_em then ' venceu dia ' else ' vence dia ' end || to_char(r.vence_em, 'DD/MM') || '. Já pagou?',
          case when hoje > r.vence_em then 'Venceu há ' || (hoje - r.vence_em) || case when hoje - r.vence_em = 1 then ' dia.' else ' dias.' end
               when hoje = r.vence_em then 'Vence hoje.' else 'Faltam ' || (r.vence_em - hoje) || case when r.vence_em - hoje = 1 then ' dia.' else ' dias.' end end,
          r.total, op_pag, r.vence_em, (r.vence_em - 3)::timestamp at time zone tz);
      elsif r.vence_em > hoje then
        trab := trab || jsonb_build_object('funcionario', 'analista_cartao', 'frase', 'De olho na fatura do ' || r.cartao || ': ' || produto._brl(r.total) || ', vence dia ' || to_char(r.vence_em, 'DD/MM') || '.');
      end if;
    end loop;

    -- FOLHA DA CASA
    if jsonb_typeof(folha->'pessoas') = 'array' and jsonb_array_length(folha->'pessoas') > 0 then
      if coalesce(folha->'daePaga', '{}'::jsonb) ? mes then
        ent := ent || jsonb_build_object('funcionario', 'folha_casa', 'resumo', 'Guia DAE de ' || to_char(hoje, 'MM/YYYY') || ' paga', 'numero', 0);
      elsif dia <= 15 then
        q := q || produto._esc_q('dae:' || mes, 'folha_casa', 'dae', case when dia <= 7 then 'A guia DAE vence dia 7. Pagou?' else 'A guia DAE venceu dia 7. Pagou?' end,
          'É a guia do eSocial de quem trabalha na casa.', null, op_pag, ini_mes + 6, ini_mes::timestamp at time zone tz);
      else
        trab := trab || jsonb_build_object('funcionario', 'folha_casa', 'frase', 'A próxima guia DAE vence dia 7 do mês que vem.');
      end if;
      for p in select x from jsonb_array_elements(folha->'pessoas') x loop
        nd := least(greatest(case when p->>'diaPagamento' ~ '^[0-9]{1,2}$' then (p->>'diaPagamento')::int else 5 end, 1), 28);
        pid := coalesce(p->>'id', '') || ':' || mes;
        if not (coalesce(folha->'salarioPago', '{}'::jsonb) ? pid) and dia between nd and nd + 10 then
          q := q || produto._esc_q('salario:' || pid, 'folha_casa', 'salario', 'Pagou o salário de ' || coalesce(p->>'nome', 'quem trabalha na casa') || '?',
            'O dia de pagamento é ' || nd || '.', case when p->>'salario' ~ '^[0-9]+(\.[0-9]+)?$' then (p->>'salario')::numeric end,
            '[{"id":"paguei","rotulo":"Paguei","pede":"valor"},{"id":"ainda_nao","rotulo":"Ainda não"}]', ini_mes + nd - 1, (ini_mes + nd - 1)::timestamp at time zone tz);
        end if;
      end loop;
    end if;

    -- GUARDIAO DO COLCHAO
    rs := produto._resumo(f, hoje); n := 0; achou := false;
    for e in select x from jsonb_array_elements(coalesce(rs->'envelopes', '[]'::jsonb)) x where coalesce((x->>'colchao_meta')::numeric, 0) > 0 loop
      n := n + 1;
      v := (e->>'colchao_meta')::numeric - coalesce((e->>'colchao')::numeric, 0);
      if v >= 0.01 then
        achou := true;
        q := q || produto._esc_q('colchao:' || (e->>'id') || ':' || mes, 'guardiao_colchao', 'colchao',
          'O colchão de ' || (e->>'nome') || ' está ' || produto._brl(v) || ' abaixo. De onde vai repor e quando?',
          'O colchão combinado é de ' || produto._brl((e->>'colchao_meta')::numeric) || ' e hoje tem ' || produto._brl(coalesce((e->>'colchao')::numeric, 0)) || '.', v,
          '[{"id":"repor","rotulo":"Dizer de onde e quando","pede":"texto","pede2":"data"},{"id":"depois","rotulo":"Vejo amanhã"}]', hoje, hoje::timestamp at time zone tz);
      end if;
    end loop;
    if n > 0 and not achou then
      ent := ent || jsonb_build_object('funcionario', 'guardiao_colchao', 'resumo', 'Colchão inteiro: ' || produto._brl((rs->>'colchao')::numeric), 'numero', (rs->>'colchao')::numeric);
    end if;

    -- GESTOR DO GUARDADO
    g := produto._guardado(f, hoje);
    if not (g->>'vazio')::boolean then
      if (g->>'hoje_rende')::boolean then
        ent := ent || jsonb_build_object('funcionario', 'gestor_guardado', 'resumo', 'Rendeu ' || produto._brl((g->>'rendeu_hoje_liquido')::numeric) || ' hoje, já sem o imposto', 'numero', (g->>'rendeu_hoje_liquido')::numeric);
      else
        ent := ent || jsonb_build_object('funcionario', 'gestor_guardado', 'resumo', upper(left(g->>'aviso', 1)) || substr(g->>'aviso', 2), 'numero', 0);
      end if;
      for a in select x from jsonb_array_elements(g->'aplicacoes') x loop
        if dia <= 5 and not exists (select 1 from produto.pat_movimentos mv where mv.familia_id = f and mv.aplicacao_id = (a->>'id')::uuid
                                     and mv.tipo = 'saldo_conferido' and mv.anulado_em is null and mv.data >= ini_mes) then
          q := q || produto._esc_q('saldo_conferir:' || (a->>'id') || ':' || mes, 'gestor_guardado', 'saldo_conferir',
            'Confira o saldo de ' || (a->>'nome') || ' no app do banco e digite aqui.', 'Pela minha conta tem ' || produto._brl((a->>'saldo')::numeric) || '.', (a->>'saldo')::numeric,
            '[{"id":"conferi","rotulo":"Digitar o saldo","pede":"valor"},{"id":"depois","rotulo":"Depois"}]', ini_mes + 4, ini_mes::timestamp at time zone tz);
        end if;
        if a->>'vence_em' is not null and hoje between (a->>'vence_em')::date - 15 and (a->>'vence_em')::date + 10 then
          dt := (a->>'vence_em')::date;
          q := q || produto._esc_q('cdb_vence:' || (a->>'id') || ':' || dt, 'gestor_guardado', 'cdb_vence',
            'A aplicação ' || (a->>'nome') || case when hoje > dt then ' venceu dia ' else ' vence dia ' end || to_char(dt, 'DD/MM') || '. Renovar ou resgatar?',
            'Tem ' || produto._brl((a->>'saldo')::numeric) || ' nela.', (a->>'saldo')::numeric,
            '[{"id":"renovar","rotulo":"Renovar","pede":"data"},{"id":"resgatar","rotulo":"Resgatar"},{"id":"depois","rotulo":"Decidir depois"}]', dt, (dt - 15)::timestamp at time zone tz);
        end if;
      end loop;
    end if;

    -- SECRETARIA
    for r in select l.id, l.titulo, l.detalhe, l.quando, l.funcionario from produto.esc_lembretes l
              where l.familia_id = f and l.ativo and l.feito_em is null and l.quando <= p_agora
                and (l.para = 'casal' or (l.para = 'eu' and l.criado_por = uid) or l.para = eu::text)
              order by l.quando limit 50 loop
      q := q || produto._esc_q('lembrete:' || r.id || ':' || to_char(r.quando at time zone tz, 'YYYY-MM-DD'),
        case when exists (select 1 from produto._esc_funcionarios() fu where fu.id = r.funcionario) then r.funcionario else 'secretaria' end,
        'lembrete', 'Lembrete: ' || r.titulo, r.detalhe, null,
        '[{"id":"feito","rotulo":"Feito"},{"id":"adiar_1_dia","rotulo":"Adiar 1 dia"},{"id":"adiar_para","rotulo":"Adiar pra","pede":"data"}]',
        (r.quando at time zone tz)::date, r.quando);
    end loop;
    select count(*), (array_agg(l.titulo || ' em ' || to_char(l.quando at time zone tz, 'DD/MM') order by l.quando))[1] into n, txt
      from produto.esc_lembretes l where l.familia_id = f and l.ativo and l.feito_em is null and l.quando > p_agora
       and (l.para = 'casal' or (l.para = 'eu' and l.criado_por = uid) or l.para = eu::text);
    if n > 0 then
      trab := trab || jsonb_build_object('funcionario', 'secretaria', 'frase', n || case when n = 1 then ' lembrete marcado. Próximo: ' else ' lembretes marcados. Próximo: ' end || txt || '.');
    end if;

    -- COMPRADOR (parte so do casal)
    if jsonb_typeof(cfg->'casa_lista') = 'array' then
      select count(*) into n from jsonb_array_elements(cfg->'casa_lista') x where not coalesce((x->>'ok')::boolean, false);
      ent := ent || jsonb_build_object('funcionario', 'comprador', 'resumo', case when n = 0 then 'Lista da casa em dia' when n = 1 then 'Lista da casa: 1 item faltando' else 'Lista da casa: ' || n || ' itens faltando' end, 'numero', n);
    end if;
  else
    c := produto.casa_da_equipe(f)::jsonb;
    prest := coalesce(c->'prestadores', '[]'::jsonb); gas := c->'gas';
  end if;

  -- COMPRADOR (casal e equipe, sem valor em R$)
  for p in select x from jsonb_array_elements(prest) x where (x->>'dia') ~ '^[0-6]$' and x->>'id' is not null loop
    nd := (p->>'dia')::int; txt := lower(coalesce(nullif(btrim(p->>'servico'), ''), 'prestador')); nome := coalesce(p->>'nome', '');
    ult := case when coalesce(p->>'ultimaVez', p->>'ultima_vez') ~ '^\d{4}-\d{2}-\d{2}$' then coalesce(p->>'ultimaVez', p->>'ultima_vez')::date end;
    if papel = 'casal' and nd = (dow + 1) % 7 then
      q := q || produto._esc_q('prestador_vespera:' || (p->>'id') || ':' || amanha, 'comprador', 'prestador_vespera',
        'Amanhã é dia do ' || txt || ' (' || nome || '). Mandou a mensagem?', 'Toque em Copiar mensagem e cole no WhatsApp dele.', null,
        '[{"id":"copiar_mensagem","rotulo":"Copiar mensagem"},{"id":"ja_mandei","rotulo":"Já mandei"},{"id":"nao_vem","rotulo":"Ele não vem"}]',
        amanha, hoje::timestamp at time zone tz, true,
        jsonb_build_object('mensagem', 'Oi, ' || nome || '! Tudo certo pra amanhã (' || to_char(amanha, 'DD/MM') || ')? Pode confirmar o horário?'));
    end if;
    if nd = dow and hora >= 17 and ult is distinct from hoje
       and not exists (select 1 from produto.esc_diario d where d.familia_id = f and d.ref = 'prestador_vespera:' || (p->>'id') || ':' || hoje and d.dados->>'opcao' = 'nao_vem') then
      q := q || produto._esc_q('prestador_veio:' || (p->>'id') || ':' || hoje, 'comprador', 'prestador_veio', 'O ' || txt || ' (' || nome || ') veio hoje?', '', null,
        '[{"id":"veio","rotulo":"Veio"},{"id":"nao_veio","rotulo":"Não veio"}]', hoje, (hoje + time '17:00') at time zone tz, true);
    elsif nd = (dow + 6) % 7 and (ult is null or ult < hoje - 1)
       and not exists (select 1 from produto.esc_diario d where d.familia_id = f and d.ref = 'prestador_vespera:' || (p->>'id') || ':' || (hoje - 1) and d.dados->>'opcao' = 'nao_vem') then
      q := q || produto._esc_q('prestador_veio:' || (p->>'id') || ':' || (hoje - 1), 'comprador', 'prestador_veio', 'O ' || txt || ' (' || nome || ') veio ontem?', '', null,
        '[{"id":"veio","rotulo":"Veio"},{"id":"nao_veio","rotulo":"Não veio"}]', hoje - 1, ((hoje - 1) + time '17:00') at time zone tz, true);
    end if;
  end loop;
  if gas->>'proxima_troca' is not null then
    pt := (gas->>'proxima_troca')::date; nd := pt - hoje;
    if hoje between pt - 5 and pt + 20 then
      q := q || produto._esc_q('gas:' || pt, 'comprador', 'gas',
        case when papel = 'equipe' then case when nd > 1 then 'O gás deve acabar em ' || nd || ' dias. Já trocou?' when nd = 1 then 'O gás deve acabar amanhã. Já trocou?'
                                              when nd = 0 then 'O gás deve acabar hoje. Já trocou?' else 'O gás já devia ter acabado. Trocou?' end
             else case when nd > 1 then 'Faltam ' || nd || ' dias pra troca do gás. Já pediu?' when nd = 1 then 'Falta 1 dia pra troca do gás. Já pediu?'
                       when nd = 0 then 'A troca do gás é hoje. Já pediu?' else 'A troca do gás era pra ser dia ' || to_char(pt, 'DD/MM') || '. Já trocou?' end end,
        'A casa troca o gás a cada ' || (gas->>'media_dias') || ' dias, em média.', null,
        case when papel = 'equipe' then '[{"id":"troquei","rotulo":"Troquei"},{"id":"ainda_nao","rotulo":"Ainda não"}]'::jsonb
             else '[{"id":"ja_pedi","rotulo":"Já pedi"},{"id":"troquei","rotulo":"Já troquei"},{"id":"ainda_nao","rotulo":"Ainda não"}]'::jsonb end,
        pt, (pt - 5)::timestamp at time zone tz, true);
    elsif papel = 'casal' and pt > hoje then
      trab := trab || jsonb_build_object('funcionario', 'comprador', 'frase', 'Próxima troca do gás por volta de ' || to_char(pt, 'DD/MM') || '.');
    end if;
  end if;

  -- tira o que ja foi respondido ou esta adiado; a equipe so recebe a Casa, sem valor
  select coalesce(jsonb_agg(x.j order by x.atraso desc, x.j->>'desde', x.j->>'id'), '[]'::jsonb) into q
    from (select (case when papel = 'equipe' then t.j - 'valor' else t.j end)
                 || jsonb_build_object('atrasado_dias', greatest(hoje - (t.j->>'vence_em')::date, 0)) as j,
                 greatest(hoje - (t.j->>'vence_em')::date, 0) as atraso
            from jsonb_array_elements(q) t(j)
           where (papel = 'casal' or ((t.j->>'casa')::boolean and t.j->>'assunto' in ('prestador_veio', 'gas')))
             and not exists (select 1 from produto.esc_diario d where d.familia_id = f and d.ref = t.j->>'id'
                              and (d.adiado_ate is null or d.adiado_ate > p_agora))) x;

  select coalesce(jsonb_agg(jsonb_build_object('id', fu.id, 'nome', fu.nome, 'sala', fu.sala,
           'estado', case when pq.n > 0 then 'precisa_de_voce' when en.resumo is not null then 'entregue' when tr.frase is not null then 'trabalhando' else 'vai_comecar' end,
           'frase', coalesce(pq.pergunta, en.resumo, tr.frase, fu.parado), 'pendentes', pq.n) order by fu.ord), '[]'::jsonb) into funcs
    from produto._esc_funcionarios() fu
    left join lateral (select count(*) n, min(x.j->>'pergunta') filter (where x.o = (select min(y.o) from jsonb_array_elements(q) with ordinality y(j, o) where y.j->>'funcionario' = fu.id)) pergunta
                         from jsonb_array_elements(q) with ordinality x(j, o) where x.j->>'funcionario' = fu.id) pq on true
    left join lateral (select x->>'resumo' resumo from jsonb_array_elements(ent) x where x->>'funcionario' = fu.id limit 1) en on true
    left join lateral (select x->>'frase' frase from jsonb_array_elements(trab) x where x->>'funcionario' = fu.id limit 1) tr on true
   where papel = 'casal' or fu.casa;

  return jsonb_build_object('precisa_de_voce', q, 'trabalhando', trab, 'entregue', ent, 'funcionarios', funcs,
    'total_precisa', jsonb_array_length(q), 'papel', papel, 'agora', p_agora);
end $$;

create function produto.escritorio_hoje(familia uuid) returns json language sql stable set search_path = '' as $$
  select produto._escritorio(familia, now())::json
$$;

revoke execute on function produto._esc_funcionarios(), produto._esc_q(text, text, text, text, text, numeric, jsonb, date, timestamptz, boolean, jsonb),
  produto._escritorio(uuid, timestamptz), produto.escritorio_hoje(uuid) from public, anon;
grant execute on function produto._esc_funcionarios(), produto._esc_q(text, text, text, text, text, numeric, jsonb, date, timestamptz, boolean, jsonb),
  produto._escritorio(uuid, timestamptz), produto.escritorio_hoje(uuid) to authenticated;
;