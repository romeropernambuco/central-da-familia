
create function produto._esc_func() returns table(ord int, id text, nome text, sala text, casa boolean, parado text, faz jsonb)
language sql immutable set search_path = '' as $$ values
  (1, 'contador', 'Contador', 'Caixa', false, 'Hoje não preciso de nada seu. Às 20h eu olho se os gastos do dia foram anotados.',
    '["Confiro todo dia se os gastos foram anotados.", "Às 20h, se o dia estiver vazio, eu pergunto.", "No dia 1 eu fecho o mês e digo quanto sobrou."]'::jsonb),
  (2, 'guardiao_colchao', 'Guardião da Reserva', 'Caixa', false, 'Hoje não preciso de nada seu. Quando vocês combinarem uma reserva (o dinheiro que nunca se gasta), eu vigio.',
    '["Vigio a reserva, o dinheiro que vocês combinaram nunca gastar.", "Se ela baixar, eu pergunto de onde volta e em que dia.", "No dia combinado eu volto a perguntar se o dinheiro entrou."]'::jsonb),
  (3, 'analista_cartao', 'Analista de Cartão', 'Cartões', false, 'Hoje não preciso de nada seu. Nenhuma fatura vence nos próximos dias.',
    '["Guardo os cartões da família: dia que fecha, dia que vence, limite e mensalidade.", "3 dias antes de cada fatura vencer eu pergunto se foi paga, até você responder.", "Comparo o que o banco cobrou com o que foi anotado aqui e aviso da anuidade 1 mês antes."]'::jsonb),
  (4, 'folha_casa', 'Folha da Casa', 'Casa', false, 'Hoje não preciso de nada seu. Cadastre quem trabalha na casa e eu cuido das datas.',
    '["Guardo quem trabalha na casa, o salário e o dia do pagamento.", "Do dia 1 ao dia 7 eu pergunto da guia do governo de quem trabalha na casa.", "No dia do salário eu pergunto se foi pago."]'::jsonb),
  (5, 'comprador', 'Comprador', 'Casa', true, 'Hoje não preciso de nada seu. Sem visita de prestador nem troca de gás por agora.',
    '["Guardo os prestadores da casa e as trocas de gás.", "Na véspera do prestador eu lembro de mandar mensagem e, no dia, às 17h, pergunto se ele veio.", "5 dias antes do gás acabar eu aviso."]'::jsonb),
  (6, 'fiscal_feira', 'Fiscal da Feira', 'Casa', true, 'Hoje não preciso de nada seu. Na segunda às 18h eu começo a perguntar da feira da semana.',
    '["Confiro se a feira da semana foi feita (a semana começa na segunda).", "Peço a nota de cada feira, pra conferir preço e item.", "Peço a contagem do estoque da semana e aviso o que acabou."]'::jsonb),
  (7, 'gestor_guardado', 'Gestor do Guardado', 'Patrimônio', false, 'Hoje não preciso de nada seu. Cadastre onde seu dinheiro está guardado e eu digo quanto rende por dia.',
    '["Calculo todo dia quanto o dinheiro guardado rendeu, já sem o imposto.", "No dia 1 eu peço pra você conferir o saldo no app do banco.", "15 dias antes de uma aplicação vencer eu pergunto o que fazer."]'::jsonb),
  (8, 'secretaria', 'Secretária', 'Recepção', false, 'Hoje não preciso de nada seu. Nenhum lembrete pra agora.',
    '["Guardo os lembretes que vocês me pedem.", "No dia e hora marcados eu aviso.", "Pergunto de novo todo dia até você dizer que fez ou marcar outra data."]'::jsonb)
$$;

create function produto._esc_espera(n integer) returns text language sql immutable set search_path = '' as $$
  select case when n <= 0 then 'desde hoje' when n = 1 then 'desde ontem' else 'há ' || n || ' dias' end
$$;

create function produto._esc_p(p_id text, p_func text, p_assunto text, p_curta text, p_v1 text, p_v2 text, p_v3 text, p_importa text, p_sugiro text,
  p_valor numeric, p_opcoes jsonb, p_vence date, p_desde timestamptz, p_casa boolean default false, p_extra jsonb default '{}'::jsonb, p_ordem integer default 0)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_array(jsonb_build_object('id', p_id, 'funcionario', p_func, 'assunto', p_assunto, 'curta', p_curta,
    'vi', jsonb_build_array(p_v1, coalesce(p_v2, p_v1), coalesce(p_v3, p_v2, p_v1)), 'importa', coalesce(p_importa, ''), 'sugiro', coalesce(p_sugiro, ''),
    'opcoes', p_opcoes, 'vence_em', p_vence, 'desde', p_desde, 'casa', p_casa, 'ordem', p_ordem)
    || case when p_valor is null then '{}'::jsonb else jsonb_build_object('valor', round(p_valor, 2)) end || coalesce(p_extra, '{}'::jsonb))
$$;

-- perguntas, entregas e avisos que nascem do dado real (ainda sem olhar o diario)
create function produto._esc_brutas(p_familia uuid, p_agora timestamptz, p_papel text, p_nome text) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  f uuid := p_familia; uid uuid := (select auth.uid()); eu uuid; nm text := coalesce(nullif(p_nome, '') || ', ', '');
  tz constant text := 'America/Recife';
  agl timestamp := p_agora at time zone 'America/Recife'; hoje date; hora int; mes text; dia int; dow int; amanha date; ini_mes date; seg date;
  q jsonb := '[]'::jsonb; ent jsonb := '[]'::jsonb; trab jsonb := '[]'::jsonb; avs jsonb := '[]'::jsonb;
  cfg jsonb := '{}'::jsonb; prest jsonb := '[]'::jsonb; gas jsonb; folha jsonb := '{}'::jsonb; c jsonb;
  r record; p jsonb; e jsonb; a jsonb; g jsonb; rs jsonb; fw record; fn record; cand record;
  n int; tot numeric; v numeric; v2 numeric; dt date; txt text; pid text; ult date; pt date; nd int; nome text; achou boolean; cdi numeric; teto numeric; gsem numeric;
  ha_cont boolean; n_acab int; rep text; prazo text;
  op_pag constant jsonb := '[{"id":"paguei_hoje","rotulo":"Paguei hoje"},{"id":"paguei_outro_dia","rotulo":"Paguei outro dia","pede":"data"},{"id":"ainda_nao","rotulo":"Ainda não paguei"}]';
begin
  hoje := agl::date; hora := extract(hour from agl)::int; mes := to_char(hoje, 'YYYY-MM'); dia := extract(day from hoje)::int;
  dow := extract(dow from hoje)::int; amanha := hoje + 1; ini_mes := date_trunc('month', hoje)::date; seg := produto._segunda(hoje);
  select m.id into eu from produto.membros m where m.familia_id = f and m.user_id = uid and m.ativo limit 1;

  if p_papel = 'casal' then
    select coalesce(jsonb_object_agg(x.chave, x.valor), '{}'::jsonb) into cfg from produto.config_familia x
     where x.familia_id = f and x.chave in ('casa_prestadores', 'casa_gas', 'casa_folha', 'reserva_onde');
    if jsonb_typeof(cfg->'casa_prestadores') = 'array' then prest := cfg->'casa_prestadores'; end if;
    gas := produto._casa_previsao(cfg->'casa_gas'->'trocas');
    if jsonb_typeof(cfg->'casa_folha') = 'object' then folha := cfg->'casa_folha'; end if;
    rs := produto._resumo(f, hoje);
    g := produto._guardado(f, hoje);
    cdi := (g->'cdi_usado'->>'pct_dia')::numeric;

    -- CONTADOR
    select count(*), coalesce(sum(l.valor), 0) into n, tot from produto.lancamentos l where l.familia_id = f and l.data = hoje and l.apagado_em is null;
    if n = 0 and hora >= 20 then
      select max(l.data) into ult from produto.lancamentos l where l.familia_id = f and l.data < hoje and l.apagado_em is null;
      nd := coalesce(hoje - ult, 1);
      q := q || produto._esc_p('lancou_hoje:' || hoje, 'contador', 'lancou_hoje', 'Gastos de ' || produto._d(hoje),
        nm || 'são ' || hora || 'h e não tem nenhum gasto anotado hoje.',
        nm || 'ontem ficou sem anotação e hoje, às ' || hora || 'h, o dia continua vazio.',
        nm || 'faz ' || nd || ' dias que nenhum gasto é anotado. O último foi dia ' || coalesce(produto._d(ult), '') || '.',
        'Sem anotar, o valor que eu digo que você pode gastar amanhã sai errado.', 'Gastou alguma coisa e ficou sem anotar?', null,
        '[{"id":"lancar","rotulo":"Anotar agora","abre":"lancar"},{"id":"nao_gastei","rotulo":"Hoje não gastei"},{"id":"lembrar_22","rotulo":"Me lembra às 22h"}]',
        hoje, (hoje + time '20:00') at time zone tz, false, jsonb_build_object('dias_esperando', greatest(nd - 1, 0)));
    elsif n > 0 then
      ent := ent || jsonb_build_object('funcionario', 'contador', 'resumo', 'Anotei ' || n || case when n = 1 then ' gasto hoje, ' else ' gastos hoje, ' end || produto._brl(tot)
        || '. Ainda dá pra gastar ' || produto._brl(greatest((rs->>'pode_gastar_hoje')::numeric, 0)) || ' hoje sem sair do combinado.', 'numero', tot);
    else
      trab := trab || jsonb_build_object('funcionario', 'contador', 'frase', 'Ainda não tem gasto anotado hoje. Se continuar assim, às 20h eu pergunto.');
    end if;
    if dia <= 5 then
      dt := ini_mes - 1;
      v := (produto._resumo(f, dt)->>'livre_mes')::numeric;
      if coalesce(v, 0) >= 1 then
        v2 := round(v * cdi / 100 * 21 * 0.775, 2);
        q := q || produto._esc_p('fechou_mes:' || to_char(dt, 'YYYY-MM'), 'contador', 'fechou_mes', 'Sobra de ' || to_char(dt, 'MM/YYYY'),
          nm || 'fechei o mês ' || to_char(dt, 'MM/YYYY') || ': sobraram ' || produto._brl(v) || ', somando tudo.',
          'Os ' || produto._brl(v) || ' que sobraram de ' || to_char(dt, 'MM/YYYY') || ' continuam parados na conta {dias}.',
          nm || 'a sobra de ' || produto._brl(v) || ' do mês passado está parada {dias}.',
          'Parado na conta, esse dinheiro não rende nada. Guardado, rende mais ou menos ' || produto._brl(v2) || ' por mês.',
          'Eu guardaria hoje. Quer mandar pro Guardado?', v,
          '[{"id":"guardar","rotulo":"Guardar agora","pede":"valor"},{"id":"agora_nao","rotulo":"Deixar na conta"},{"id":"depois","rotulo":"Me lembra amanhã"}]',
          ini_mes + 4, ini_mes::timestamp at time zone tz);
      end if;
    end if;

    -- ANALISTA DE CARTAO
    for r in select x.*, cf.valor_banco, cf.paga_em, cf.diferenca_motivo, k.taxa_valor, k.taxa_periodo, k.taxa_isenta_acima
               from jsonb_to_recordset(produto._faturas(f, (ini_mes - interval '1 month')::date, 3))
                      as x(mes text, total numeric, cartao text, fecha_em date, vence_em date, cartao_id uuid, ativo boolean)
               left join produto.cartao_faturas cf on cf.familia_id = f and cf.cartao_id = x.cartao_id and cf.mes = x.mes
               left join produto.cartao_custos k on k.familia_id = f and k.cartao_id = x.cartao_id
              order by x.vence_em loop
      pid := r.cartao_id || ':' || r.mes;
      v := coalesce(r.valor_banco, r.total, 0);
      if r.fecha_em is not null and r.taxa_periodo = 'mes' and coalesce(r.taxa_valor, 0) > 0 and coalesce(r.taxa_isenta_acima, 0) > 0
         and r.fecha_em - hoje between 0 and 5 and coalesce(r.total, 0) < r.taxa_isenta_acima then
        q := q || produto._esc_p('mensalidade:' || pid, 'analista_cartao', 'mensalidade', 'Mensalidade do ' || r.cartao,
          nm || 'o ' || r.cartao || ' fecha dia ' || produto._d(r.fecha_em) || ' com ' || produto._brl(coalesce(r.total, 0)) || '. Pra não pagar a mensalidade de ' || produto._brl(r.taxa_valor) || ' ele precisa chegar a ' || produto._brl(r.taxa_isenta_acima) || '.',
          'O ' || r.cartao || ' fecha ' || case when r.fecha_em = hoje then 'hoje' when r.fecha_em = amanha then 'amanhã' else 'dia ' || produto._d(r.fecha_em) end || ' e ainda está abaixo do valor que livra da mensalidade.', null,
          'Faltam ' || produto._brl(r.taxa_isenta_acima - coalesce(r.total, 0)) || '. Se não chegar, o banco cobra os ' || produto._brl(r.taxa_valor) || '.',
          'Eu só passaria no cartão o que já ia ser comprado de qualquer jeito. O que prefere?', r.taxa_isenta_acima - coalesce(r.total, 0),
          '[{"id":"vou_passar","rotulo":"Passar o que falta no cartão"},{"id":"vou_pagar","rotulo":"Pagar a mensalidade"},{"id":"depois","rotulo":"Vejo amanhã"}]',
          r.fecha_em, (r.fecha_em - 5)::timestamp at time zone tz);
      end if;
      continue when v <= 0 or r.vence_em is null;
      if r.valor_banco is not null and abs(r.valor_banco - coalesce(r.total, 0)) >= 0.01 and r.diferenca_motivo is null and r.vence_em >= hoje - 30 then
        v2 := r.valor_banco - coalesce(r.total, 0);
        q := q || produto._esc_p('fatura_dif:' || pid, 'analista_cartao', 'fatura_diferenca', 'Diferença na fatura do ' || r.cartao,
          nm || 'o banco cobrou ' || produto._brl(r.valor_banco) || ' na fatura do ' || r.cartao || ' e eu somei ' || produto._brl(coalesce(r.total, 0)) || '.',
          'A diferença de ' || produto._brl(abs(v2)) || ' na fatura do ' || r.cartao || ' continua sem explicação {dias}.',
          nm || 'ainda não sei de onde vem a diferença de ' || produto._brl(abs(v2)) || ' na fatura do ' || r.cartao || '. Pergunto {dias}.',
          case when v2 > 0 then 'Tem ' || produto._brl(v2) || ' que não foi anotado. Enquanto faltar, o mês parece ' || produto._brl(v2) || ' mais folgado do que está.'
               else 'Eu somei ' || produto._brl(-v2) || ' a mais que o banco. Pode ter compra anotada 2 vezes ou no cartão errado.' end,
          case when v2 > 0 then 'Quer lançar agora?' else 'Quer conferir os lançamentos agora?' end, abs(v2),
          jsonb_build_array(jsonb_build_object('id', 'lancar', 'rotulo', case when v2 > 0 then 'Lançar agora' else 'Conferir agora' end, 'abre', 'lancar'),
            jsonb_build_object('id', 'explicar', 'rotulo', 'Foi juros ou taxa do banco', 'pede', 'texto'), jsonb_build_object('id', 'depois', 'rotulo', 'Vejo amanhã')),
          r.vence_em, hoje::timestamp at time zone tz, false, jsonb_build_object('cartao_id', r.cartao_id, 'mes', r.mes));
      end if;
      if r.paga_em is not null then
        if r.vence_em >= hoje - 10 then
          ent := ent || jsonb_build_object('funcionario', 'analista_cartao', 'resumo', 'A fatura do ' || r.cartao || ', de ' || produto._brl(v) || ', foi paga dia ' || produto._d(r.paga_em) || '. Não precisa fazer nada.', 'numero', v);
        end if;
      elsif hoje between r.vence_em - 3 and r.vence_em + 30 then
        nd := r.vence_em - hoje;
        prazo := case when nd > 1 then 'Faltam ' || nd || ' dias.' when nd = 1 then 'Vence amanhã.' when nd = 0 then 'Vence hoje.' when nd = -1 then 'Venceu ontem.' else 'Venceu há ' || (-nd) || ' dias.' end;
        q := q || produto._esc_p('fatura:' || pid, 'analista_cartao', 'fatura', 'Fatura do ' || r.cartao || ' de ' || produto._d(r.vence_em),
          nm || 'a fatura do ' || r.cartao || ' fecha em ' || produto._brl(v) || case when nd >= 0 then ' e vence ' else ' e venceu ' end || produto._dia_nome(r.vence_em) || ', ' || produto._d(r.vence_em) || '.',
          'A fatura do ' || r.cartao || ', de ' || produto._brl(v) || ', ' || case when nd > 1 then 'vence em ' || nd || ' dias' when nd = 1 then 'vence amanhã' when nd = 0 then 'vence hoje' else 'venceu dia ' || produto._d(r.vence_em) end || ' e você ainda não me disse se pagou.',
          nm || 'pergunto {dias} da fatura do ' || r.cartao || ' (' || produto._brl(v) || '), que ' || case when nd >= 0 then 'vence dia ' else 'venceu dia ' end || produto._d(r.vence_em) || '.',
          prazo || case when nd <= 1 then ' Atrasando, o banco cobra juros e multa.' else '' end, 'Já pagou?', v, op_pag, r.vence_em, (r.vence_em - 3)::timestamp at time zone tz,
          false, jsonb_build_object('cartao_id', r.cartao_id, 'mes', r.mes));
      elsif r.vence_em > hoje then
        trab := trab || jsonb_build_object('funcionario', 'analista_cartao', 'frase', 'Estou de olho na fatura do ' || r.cartao || ': ' || produto._brl(v) || ', vence dia ' || produto._d(r.vence_em) || '. Aviso 3 dias antes.');
      end if;
    end loop;
    for r in select c.id, c.nome, c.dia_fechamento, c.dia_vencimento, k.taxa_valor, k.taxa_periodo, k.taxa_mes
               from produto.cartoes c left join produto.cartao_custos k on k.familia_id = c.familia_id and k.cartao_id = c.id
              where c.familia_id = f and c.ativo order by c.criado_em loop
      if r.dia_fechamento is null or r.dia_vencimento is null then
        q := q || produto._esc_p('cartao_dias:' || r.id, 'analista_cartao', 'cartao_dias', 'Dias do cartão ' || r.nome,
          nm || 'o cartão ' || r.nome || ' está sem o dia que fecha e o dia que vence.',
          'O cartão ' || r.nome || ' continua sem o dia que fecha e o dia que vence {dias}.', null,
          'Sem esses 2 dias eu não sei em que fatura cada compra cai nem quando te avisar.', 'Olha no app do banco e me diz os 2 dias?', null,
          '[{"id":"informar","rotulo":"Dizer os 2 dias","abre":"cartao"},{"id":"depois","rotulo":"Vejo amanhã"}]', hoje, hoje::timestamp at time zone tz, false, jsonb_build_object('cartao_id', r.id));
      end if;
      dt := (ini_mes + interval '1 month')::date;
      if r.taxa_periodo = 'ano' and coalesce(r.taxa_valor, 0) > 0 and r.taxa_mes = extract(month from dt)::int then
        q := q || produto._esc_p('anuidade:' || r.id || ':' || to_char(dt, 'YYYY-MM'), 'analista_cartao', 'anuidade', 'Anuidade do ' || r.nome,
          nm || 'mês que vem o ' || r.nome || ' cobra a anuidade de ' || produto._brl(r.taxa_valor) || '.',
          'A anuidade de ' || produto._brl(r.taxa_valor) || ' do ' || r.nome || ' entra mês que vem e você ainda não decidiu o que fazer.',
          nm || 'faltam ' || (dt - hoje) || ' dias pra anuidade de ' || produto._brl(r.taxa_valor) || ' do ' || r.nome || '. Pergunto {dias}.',
          'Muita gente consegue não pagar só de ligar pro banco e pedir. São ' || produto._brl(r.taxa_valor) || ' que ficam com você.',
          'Quer que eu te lembre de pedir isenção dia 01?', r.taxa_valor,
          '[{"id":"lembrar","rotulo":"Me lembra dia 01"},{"id":"ja_pedi","rotulo":"Já pedi isenção"},{"id":"vou_pagar","rotulo":"Vou pagar mesmo"}]',
          dt, ini_mes::timestamp at time zone tz, false, jsonb_build_object('cartao_id', r.id, 'cartao', r.nome));
      end if;
    end loop;

    -- FOLHA DA CASA
    if jsonb_typeof(folha->'pessoas') = 'array' and jsonb_array_length(folha->'pessoas') > 0 then
      if coalesce(folha->'daePaga', '{}'::jsonb) ? mes then
        ent := ent || jsonb_build_object('funcionario', 'folha_casa', 'resumo', 'A guia do governo de quem trabalha na casa, de ' || to_char(hoje, 'MM/YYYY') || ', está paga. Sem multa neste mês.', 'numero', 0);
      elsif dia <= 15 then
        nd := 7 - dia;
        q := q || produto._esc_p('dae:' || mes, 'folha_casa', 'dae', 'Guia do governo de ' || to_char(hoje, 'MM/YYYY'),
          nm || 'a guia do governo de quem trabalha na casa (a guia DAE) vence dia ' || produto._d(ini_mes + 6) || '.',
          'A guia do governo de quem trabalha na casa ' || case when nd > 1 then 'vence em ' || nd || ' dias' when nd = 1 then 'vence amanhã' when nd = 0 then 'vence hoje' else 'venceu dia ' || produto._d(ini_mes + 6) end || ' e você ainda não me disse se pagou.',
          nm || 'pergunto {dias} da guia do governo de quem trabalha na casa, que ' || case when nd >= 0 then 'vence' else 'venceu' end || ' dia ' || produto._d(ini_mes + 6) || '.',
          case when nd > 1 then 'Faltam ' || nd || ' dias.' when nd = 1 then 'Vence amanhã.' when nd = 0 then 'Vence hoje.' else 'Está ' || (-nd) || case when nd = -1 then ' dia atrasada.' else ' dias atrasada.' end end || ' Atrasando, o governo cobra multa e juros por dia.',
          'Já pagou?', null, op_pag, ini_mes + 6, ini_mes::timestamp at time zone tz);
      else
        trab := trab || jsonb_build_object('funcionario', 'folha_casa', 'frase', 'A próxima guia do governo de quem trabalha na casa vence dia 07 do mês que vem. Aviso no dia 1.');
      end if;
      for p in select x from jsonb_array_elements(folha->'pessoas') x loop
        nd := least(greatest(case when p->>'diaPagamento' ~ '^[0-9]{1,2}$' then (p->>'diaPagamento')::int else 5 end, 1), 28);
        pid := coalesce(p->>'id', '') || ':' || mes; nome := coalesce(p->>'nome', 'quem trabalha na casa');
        v := case when p->>'salario' ~ '^[0-9]+(\.[0-9]+)?$' then (p->>'salario')::numeric end;
        if not (coalesce(folha->'salarioPago', '{}'::jsonb) ? pid) and dia between nd and nd + 10 then
          q := q || produto._esc_p('salario:' || pid, 'folha_casa', 'salario', 'Salário de ' || nome,
            nm || case when dia = nd then 'hoje é dia ' else 'dia ' || nd || ' foi dia ' end || 'do salário de ' || nome || coalesce(' (' || produto._brl(v) || ')', '') || '.',
            'O salário de ' || nome || ' era pra dia ' || nd || ' e você ainda não me disse se pagou.',
            nm || 'pela minha anotação o salário de ' || nome || ' está ' || (dia - nd) || ' dias atrasado.',
            'Quem trabalha na casa conta com esse dinheiro no dia certo.', 'Já pagou?', v,
            '[{"id":"paguei","rotulo":"Paguei","pede":"valor"},{"id":"ainda_nao","rotulo":"Ainda não paguei"}]', ini_mes + nd - 1, (ini_mes + nd - 1)::timestamp at time zone tz,
            false, jsonb_build_object('pessoa_id', p->>'id'));
        end if;
      end loop;
    end if;

    -- GUARDIAO DA RESERVA
    n := 0; achou := false;
    for e in select x from jsonb_array_elements(coalesce(rs->'envelopes', '[]'::jsonb)) x where coalesce((x->>'colchao_meta')::numeric, 0) > 0 loop
      n := n + 1;
      v2 := coalesce((e->>'colchao')::numeric, 0);
      v := (e->>'colchao_meta')::numeric - v2;
      if v >= 0.01 then
        achou := true;
        q := q || produto._esc_p('colchao:' || (e->>'id') || ':' || mes, 'guardiao_colchao', 'colchao', 'Reserva de ' || (e->>'nome'),
          nm || 'a reserva de ' || (e->>'nome') || ' (o dinheiro que vocês combinaram nunca gastar) está em ' || produto._brl(v2) || '. O combinado é ' || produto._brl((e->>'colchao_meta')::numeric) || ', então faltam ' || produto._brl(v) || '.',
          'A reserva de ' || (e->>'nome') || ' continua ' || produto._brl(v) || ' abaixo do combinado {dias}.',
          nm || 'a reserva de ' || (e->>'nome') || ' está ' || produto._brl(v) || ' abaixo do combinado {dias}.',
          'Sem a reserva inteira, um imprevisto vira dívida.', 'De onde esse dinheiro volta, e em que dia?', v,
          '[{"id":"repor","rotulo":"Dizer de onde e quando","pede":"texto","pede2":"data"},{"id":"depois","rotulo":"Vejo amanhã"}]', hoje, hoje::timestamp at time zone tz);
      end if;
    end loop;
    if n > 0 and not achou then
      ent := ent || jsonb_build_object('funcionario', 'guardiao_colchao', 'resumo', 'A reserva (o dinheiro que vocês combinaram nunca gastar) está inteira: ' || produto._brl((rs->>'colchao')::numeric) || '. Ninguém mexeu nela.', 'numero', (rs->>'colchao')::numeric);
    end if;

    -- GESTOR DO GUARDADO
    if not (g->>'vazio')::boolean then
      if (g->>'hoje_rende')::boolean then
        ent := ent || jsonb_build_object('funcionario', 'gestor_guardado', 'resumo', 'Seu dinheiro guardado rendeu ' || produto._brl((g->>'rendeu_hoje_liquido')::numeric) || ' hoje, já sem o imposto. No mês já são ' || produto._brl((g->>'rendeu_mes_liquido')::numeric) || '.', 'numero', (g->>'rendeu_hoje_liquido')::numeric);
      else
        ent := ent || jsonb_build_object('funcionario', 'gestor_guardado', 'resumo', 'O dinheiro guardado não rende hoje: ' || (g->>'aviso') || '.'
          || coalesce(' No último dia de banco aberto, ' || produto._d((g->'ultimo_dia_que_rendeu'->>'data')::date) || ', rendeu ' || produto._brl((g->'ultimo_dia_que_rendeu'->>'liquido')::numeric) || '.', ''), 'numero', 0);
      end if;
      for a in select x from jsonb_array_elements(g->'aplicacoes') x loop
        if dia <= 5 and not exists (select 1 from produto.pat_movimentos mv where mv.familia_id = f and mv.aplicacao_id = (a->>'id')::uuid
                                     and mv.tipo = 'saldo_conferido' and mv.anulado_em is null and mv.data >= ini_mes) then
          q := q || produto._esc_p('saldo_conferir:' || (a->>'id') || ':' || mes, 'gestor_guardado', 'saldo_conferir', 'Saldo de ' || (a->>'nome'),
            nm || 'virou o mês. Pela minha conta você tem ' || produto._brl((a->>'saldo')::numeric) || ' guardados em ' || (a->>'nome') || ' (' || (a->>'banco') || ').',
            'Ainda falta conferir no banco o saldo de ' || (a->>'nome') || '. Pela minha conta são ' || produto._brl((a->>'saldo')::numeric) || '. Espero {dias}.',
            nm || 'pergunto {dias} do saldo de ' || (a->>'nome') || '. Pela minha conta são ' || produto._brl((a->>'saldo')::numeric) || '.',
            'Minha conta é uma estimativa. Quem manda é o que aparece no banco.', 'Abre o app do banco e me diz quanto aparece lá, pra eu ver se minha conta bate?', (a->>'saldo')::numeric,
            '[{"id":"conferi","rotulo":"Dizer o saldo do banco","pede":"valor"},{"id":"depois","rotulo":"Vejo amanhã"}]', ini_mes + 4, ini_mes::timestamp at time zone tz,
            false, jsonb_build_object('aplicacao_id', a->>'id'));
        end if;
        if a->>'vence_em' is not null and hoje between (a->>'vence_em')::date - 15 and (a->>'vence_em')::date + 10 then
          dt := (a->>'vence_em')::date; nd := dt - hoje;
          q := q || produto._esc_p('cdb_vence:' || (a->>'id') || ':' || dt, 'gestor_guardado', 'cdb_vence', 'Vencimento de ' || (a->>'nome'),
            nm || 'a aplicação ' || (a->>'nome') || case when nd >= 0 then ' vence ' else ' venceu ' end || produto._dia_nome(dt) || ', ' || produto._d(dt) || '. Tem ' || produto._brl((a->>'saldo')::numeric) || ' nela.',
            'A aplicação ' || (a->>'nome') || case when nd > 1 then ' vence em ' || nd || ' dias' when nd = 1 then ' vence amanhã' when nd = 0 then ' vence hoje' else ' venceu dia ' || produto._d(dt) end || ' e você ainda não decidiu o que fazer com os ' || produto._brl((a->>'saldo')::numeric) || '.',
            nm || 'pergunto {dias} o que fazer com a aplicação ' || (a->>'nome') || ', que ' || case when nd >= 0 then 'vence' else 'venceu' end || ' dia ' || produto._d(dt) || '.',
            'No dia do vencimento o dinheiro volta pra conta e para de render.', 'Eu renovaria ou colocaria em outra aplicação no mesmo dia. O que prefere?', (a->>'saldo')::numeric,
            '[{"id":"renovar","rotulo":"Renovar","pede":"data"},{"id":"resgatar","rotulo":"Tirar o dinheiro","abre":"guardado"},{"id":"depois","rotulo":"Decidir depois"}]', dt, (dt - 15)::timestamp at time zone tz,
            false, jsonb_build_object('aplicacao_id', a->>'id'));
        end if;
      end loop;
    end if;
    v := coalesce((rs->>'colchao')::numeric, 0);
    if v >= 1 and coalesce(cfg->>'reserva_onde', 'conta') = 'conta' then
      q := q || produto._esc_p('reserva_parada:' || mes, 'gestor_guardado', 'reserva_parada', 'Reserva parada na conta',
        nm || 'a reserva de ' || produto._brl(v) || ' (o dinheiro que vocês combinaram nunca gastar) está na conta comum, que não rende.',
        'A reserva de ' || produto._brl(v) || ' continua na conta comum, sem render, {dias}.', null,
        'Guardada onde rende todo dia e dá pra tirar na hora, daria mais ou menos ' || produto._brl(round(v * cdi / 100 * 21 * 0.775, 2)) || ' por mês.',
        'Quer que eu mostre como guardar?', v,
        '[{"id":"mostrar","rotulo":"Mostrar como guardar","abre":"guardado"},{"id":"ja_guardada","rotulo":"Ela já está guardada"},{"id":"deixar","rotulo":"Deixar na conta"}]',
        hoje, ini_mes::timestamp at time zone tz, false, jsonb_build_object('dias_esperando', 0));
    end if;

    -- SECRETARIA
    for r in select l.id, l.titulo, l.detalhe, l.quando, l.funcionario from produto.esc_lembretes l
              where l.familia_id = f and l.ativo and l.feito_em is null and l.quando <= p_agora
                and (l.para = 'casal' or (l.para = 'eu' and l.criado_por = uid) or l.para = eu::text)
              order by l.quando limit 50 loop
      dt := (r.quando at time zone tz)::date;
      q := q || produto._esc_p('lembrete:' || r.id || ':' || dt,
        case when exists (select 1 from produto._esc_func() fu where fu.id = r.funcionario) then r.funcionario else 'secretaria' end, 'lembrete', r.titulo,
        nm || 'você me pediu pra lembrar ' || case when dt = hoje then 'hoje' else 'dia ' || produto._d(dt) end || ': ' || r.titulo || '.',
        'Continua aberto {dias}: ' || r.titulo || '.',
        nm || 'te lembro disso {dias}: ' || r.titulo || '.',
        coalesce(nullif(r.detalhe, ''), 'Fica na minha lista até você me dizer que resolveu.'), 'Já fez?', null,
        '[{"id":"feito","rotulo":"Já fiz"},{"id":"adiar_1_dia","rotulo":"Me lembra amanhã"},{"id":"adiar_para","rotulo":"Me lembra em outro dia","pede":"data"}]',
        dt, r.quando, false, jsonb_build_object('lembrete_id', r.id));
    end loop;
    select count(*), (array_agg(l.titulo || ', dia ' || to_char(l.quando at time zone tz, 'DD/MM') order by l.quando))[1] into n, txt
      from produto.esc_lembretes l where l.familia_id = f and l.ativo and l.feito_em is null and l.quando > p_agora
       and (l.para = 'casal' or (l.para = 'eu' and l.criado_por = uid) or l.para = eu::text);
    if n > 0 then
      trab := trab || jsonb_build_object('funcionario', 'secretaria', 'frase', 'Estou guardando ' || n || case when n = 1 then ' lembrete. O próximo: ' else ' lembretes. O próximo: ' end || txt || '.');
    end if;
  else
    c := produto.casa_da_equipe(f)::jsonb;
    prest := coalesce(c->'prestadores', '[]'::jsonb); gas := c->'gas';
  end if;

  -- COMPRADOR (casal e equipe, sem valor em R$)
  for p in select x from jsonb_array_elements(prest) x where (x->>'dia') ~ '^[0-6]$' and x->>'id' is not null loop
    nd := (p->>'dia')::int; txt := lower(coalesce(nullif(btrim(p->>'servico'), ''), 'prestador')); nome := coalesce(p->>'nome', '');
    ult := case when coalesce(p->>'ultimaVez', p->>'ultima_vez') ~ '^\d{4}-\d{2}-\d{2}$' then coalesce(p->>'ultimaVez', p->>'ultima_vez')::date end;
    if p_papel = 'casal' and nd = (dow + 1) % 7 then
      q := q || produto._esc_p('prestador_vespera:' || (p->>'id') || ':' || amanha, 'comprador', 'prestador_vespera', 'Aviso pro ' || txt,
        nm || 'amanhã, ' || produto._dia_nome(amanha) || ', é dia do ' || txt || ' (' || nome || ').', null, null,
        'Confirmando hoje, ninguém perde a viagem.', 'Já mandou a mensagem pra ele?', null,
        '[{"id":"copiar_mensagem","rotulo":"Copiar a mensagem"},{"id":"ja_mandei","rotulo":"Já mandei"},{"id":"nao_vem","rotulo":"Ele não vem"}]',
        amanha, hoje::timestamp at time zone tz, false,
        jsonb_build_object('prestador_id', p->>'id', 'mensagem', 'Oi, ' || nome || '. Tudo certo pra amanhã (' || produto._d(amanha) || ')? Pode confirmar o horário?'));
    end if;
    if nd = dow and hora >= 17 and ult is distinct from hoje
       and not exists (select 1 from produto.esc_diario d where d.familia_id = f and d.ref = 'prestador_vespera:' || (p->>'id') || ':' || hoje and d.dados->>'opcao' = 'nao_vem') then
      q := q || produto._esc_p('prestador_veio:' || (p->>'id') || ':' || hoje, 'comprador', 'prestador_veio', 'Visita do ' || txt,
        nm || 'hoje era dia do ' || txt || ' (' || nome || ').', null, null, 'Eu anoto pra saber quando foi a última vez que ele veio.', 'Ele veio?', null,
        '[{"id":"veio","rotulo":"Ele veio"},{"id":"nao_veio","rotulo":"Não veio"}]', hoje, (hoje + time '17:00') at time zone tz, true, jsonb_build_object('prestador_id', p->>'id'));
    elsif nd = (dow + 6) % 7 and (ult is null or ult < hoje - 1)
       and not exists (select 1 from produto.esc_diario d where d.familia_id = f and d.ref = 'prestador_vespera:' || (p->>'id') || ':' || (hoje - 1) and d.dados->>'opcao' = 'nao_vem') then
      q := q || produto._esc_p('prestador_veio:' || (p->>'id') || ':' || (hoje - 1), 'comprador', 'prestador_veio', 'Visita do ' || txt,
        nm || 'ontem era dia do ' || txt || ' (' || nome || ') e ninguém me disse se ele veio.', null, null, 'Eu anoto pra saber quando foi a última vez que ele veio.', 'Ele veio?', null,
        '[{"id":"veio","rotulo":"Ele veio"},{"id":"nao_veio","rotulo":"Não veio"}]', hoje - 1, ((hoje - 1) + time '17:00') at time zone tz, true, jsonb_build_object('prestador_id', p->>'id'));
    end if;
  end loop;
  if gas->>'proxima_troca' is not null then
    pt := (gas->>'proxima_troca')::date; nd := pt - hoje;
    if hoje between pt - 5 and pt + 20 then
      q := q || produto._esc_p('gas:' || pt, 'comprador', 'gas', 'Troca do gás',
        nm || 'pela média da casa, o gás ' || case when nd > 1 then 'acaba dia ' || produto._d(pt) || '. Faltam ' || nd || ' dias.' when nd = 1 then 'acaba amanhã.' when nd = 0 then 'acaba hoje.' else 'já devia ter acabado dia ' || produto._d(pt) || '.' end,
        'O gás ' || case when nd >= 0 then 'deve acabar dia ' else 'devia ter acabado dia ' end || produto._d(pt) || ' e ninguém me disse se já foi resolvido.',
        nm || 'pergunto do gás {dias}. Pela média ele ' || case when nd >= 0 then 'acaba dia ' else 'acabou dia ' end || produto._d(pt) || '.',
        'A casa troca o gás a cada ' || (gas->>'media_dias') || ' dias, mais ou menos. Pedindo antes, ninguém fica sem cozinhar.',
        case when p_papel = 'equipe' then 'Já trocou?' else 'Já pediu?' end, null,
        case when p_papel = 'equipe' then '[{"id":"troquei","rotulo":"Já troquei"},{"id":"ainda_nao","rotulo":"Ainda não troquei"}]'::jsonb
             else '[{"id":"ja_pedi","rotulo":"Já pedi"},{"id":"troquei","rotulo":"Já foi trocado"},{"id":"ainda_nao","rotulo":"Ainda não pedi"}]'::jsonb end,
        pt, (pt - 5)::timestamp at time zone tz, true);
    elsif p_papel = 'casal' and pt > hoje then
      trab := trab || jsonb_build_object('funcionario', 'comprador', 'frase', 'Pela média da casa, o gás acaba por volta de ' || produto._d(pt) || '. Aviso 5 dias antes.');
    end if;
  end if;

  -- FISCAL DA FEIRA (casal e equipe; a equipe nunca recebe valor)
  if p_papel = 'casal' then
    select (x->>'teto_semana')::numeric, (x->>'gasto_semana')::numeric into teto, gsem
      from jsonb_array_elements(coalesce(rs->'envelopes', '[]'::jsonb)) x where x->>'regra' = 'semanal' order by (x->>'casa')::boolean desc limit 1;
  end if;
  select fe.id, fe.data, fe.loja, fe.lancamento_id, fe.nota_caminho, fe.sem_nota_motivo, fe.criado_em, l.valor into fw
    from produto.feiras fe left join produto.lancamentos l on l.id = fe.lancamento_id and l.apagado_em is null and p_papel = 'casal'
   where fe.familia_id = f and fe.semana = seg order by fe.data desc, fe.criado_em desc limit 1;
  select fe.id, fe.data, fe.lancamento_id, fe.criado_em, l.valor into fn
    from produto.feiras fe left join produto.lancamentos l on l.id = fe.lancamento_id and l.apagado_em is null and p_papel = 'casal'
   where fe.familia_id = f and fe.data >= hoje - 14 and fe.nota_caminho is null and fe.sem_nota_motivo is null order by fe.data desc, fe.criado_em desc limit 1;
  select count(*) > 0, coalesce(max((select count(*) from jsonb_array_elements(ct.itens) x where x->>'estado' = 'acabou')), 0) into ha_cont, n_acab
    from (select ec.itens from produto.estoque_contagens ec where ec.familia_id = f and ec.semana = seg order by ec.data desc, ec.criado_em desc limit 1) ct;
  achou := dow <> 1 or hora >= 18;
  if fw.id is null and achou then
    if p_papel = 'casal' then
      select l.id, l.valor, l.data into cand from produto.lancamentos l join produto.envelopes en on en.id = l.envelope_id and en.familia_id = l.familia_id
       where l.familia_id = f and en.regra = 'semanal' and l.data >= seg and l.data <= hoje and l.apagado_em is null
         and not exists (select 1 from produto.feiras fe where fe.lancamento_id = l.id) order by l.valor desc limit 1;
    end if;
    if p_papel = 'casal' and cand.id is not null then
      q := q || produto._esc_p('feira_feita:' || seg, 'fiscal_feira', 'feira_feita', 'Feira da semana de ' || produto._d(seg),
        nm || 'vi um gasto de ' || produto._brl(cand.valor) || ' na Feira dia ' || produto._d(cand.data) || ', mas ninguém me disse se essa foi a feira da semana.',
        'O gasto de ' || produto._brl(cand.valor) || ' na Feira, de ' || produto._d(cand.data) || ', continua sem eu saber se foi a feira da semana. Espero {dias}.', null,
        'Sabendo qual foi a feira, eu peço a nota certa e comparo com o teto da semana' || coalesce(', de ' || produto._brl(teto), '') || '.', 'Foi essa?', cand.valor,
        '[{"id":"foi_essa","rotulo":"Foi essa a feira"},{"id":"foi_feita","rotulo":"Foi outra compra","pede":"valor","pede2":"data"},{"id":"ainda_nao","rotulo":"A feira ainda não foi feita"}]',
        seg, (seg + time '18:00') at time zone tz, false, jsonb_build_object('lancamento_id', cand.id, 'data', cand.data), 1);
    elsif p_papel = 'casal' then
      q := q || produto._esc_p('feira_feita:' || seg, 'fiscal_feira', 'feira_feita', 'Feira da semana de ' || produto._d(seg),
        nm || 'a feira desta semana ainda não apareceu aqui.',
        'A feira desta semana continua sem registro {dias}.',
        nm || 'já é ' || produto._dia_nome(hoje) || ' e a feira da semana ainda não apareceu aqui.',
        'Sem a feira anotada eu não sei quanto da semana já foi' || coalesce(' (o teto é ' || produto._brl(teto) || ')', '') || '.', 'Foi feita?', null,
        '[{"id":"foi_feita","rotulo":"Foi feita","pede":"valor","pede2":"data"},{"id":"ainda_nao","rotulo":"Ainda não foi feita"},{"id":"nao_vai_ter","rotulo":"Esta semana não vai ter"}]',
        seg, (seg + time '18:00') at time zone tz, true, '{}'::jsonb, 1);
    else
      q := q || produto._esc_p('feira_feita:' || seg, 'fiscal_feira', 'feira_feita', 'Feira da semana de ' || produto._d(seg),
        nm || 'a feira desta semana ainda não apareceu aqui.', 'A feira desta semana continua sem registro {dias}.', null,
        'Assim que você me disser, eu aviso a família e peço a nota.', 'Foi feita?', null,
        '[{"id":"foi_feita","rotulo":"Já foi feita"},{"id":"ainda_nao","rotulo":"Ainda não foi feita"}]', seg, (seg + time '18:00') at time zone tz, true, '{}'::jsonb, 1);
    end if;
  end if;
  if p_papel = 'casal' and fw.id is not null and fw.lancamento_id is null then
    q := q || produto._esc_p('feira_valor:' || fw.id, 'fiscal_feira', 'feira_valor', 'Valor da feira de ' || produto._d(fw.data),
      nm || 'a feira de ' || produto._d(fw.data) || ' foi registrada sem o valor.', 'A feira de ' || produto._d(fw.data) || ' continua sem o valor {dias}.', null,
      'Sem o valor eu não consigo dizer se a semana passou do teto' || coalesce(' de ' || produto._brl(teto), '') || '.', 'Quanto custou?', null,
      '[{"id":"dizer","rotulo":"Dizer o valor","pede":"valor"},{"id":"depois","rotulo":"Vejo amanhã"}]', fw.data, fw.criado_em, false, jsonb_build_object('feira_id', fw.id), 2);
  end if;
  if fn.id is not null then
    q := q || produto._esc_p('feira_nota:' || fn.id, 'fiscal_feira', 'feira_nota', 'Nota da feira de ' || produto._d(fn.data),
      nm || 'a feira de ' || produto._d(fn.data) || coalesce(' (' || produto._brl(fn.valor) || ')', '') || ' está sem a nota.',
      'A nota da feira de ' || produto._d(fn.data) || ' continua faltando {dias}.',
      nm || 'peço a nota da feira de ' || produto._d(fn.data) || ' {dias}.',
      'Sem nota eu não consigo conferir preço nem item.', 'Consegue anexar agora?', case when p_papel = 'casal' then fn.valor end,
      case when p_papel = 'casal' then '[{"id":"anexar","rotulo":"Anexar a nota agora","abre":"nota"},{"id":"sem_nota","rotulo":"Não teve nota","pede":"texto"},{"id":"depois","rotulo":"Vejo amanhã"}]'::jsonb
           else '[{"id":"anexar","rotulo":"Anexar a nota","abre":"nota"},{"id":"depois","rotulo":"Anexo depois"}]'::jsonb end,
      fn.data, fn.criado_em, p_papel = 'equipe' or fn.valor is null, jsonb_build_object('feira_id', fn.id), 3);
  end if;
  if not ha_cont and achou then
    q := q || produto._esc_p('estoque:' || seg, 'fiscal_feira', 'estoque', 'Contagem do estoque da semana de ' || produto._d(seg),
      nm || 'a contagem do estoque desta semana ainda não foi feita.', 'A contagem do estoque desta semana continua sem ser feita {dias}.',
      nm || 'já é ' || produto._dia_nome(hoje) || ' e o estoque da semana ainda não foi contado.',
      'Sem ela eu não sei o que faltou nem o que sobrou.', case when p_papel = 'casal' then 'Quem conta?' else 'Consegue contar agora?' end, null,
      case when p_papel = 'casal' then '[{"id":"contar","rotulo":"Contar agora","abre":"contagem"},{"id":"pedir_equipe","rotulo":"Pedir pra equipe"},{"id":"depois","rotulo":"Vejo amanhã"}]'::jsonb
           else '[{"id":"contar","rotulo":"Contar o estoque","abre":"contagem"},{"id":"depois","rotulo":"Conto depois"}]'::jsonb end,
      seg, (seg + time '18:00') at time zone tz, true, '{}'::jsonb, 4);
  end if;
  if fw.id is not null then
    ent := ent || jsonb_build_object('funcionario', 'fiscal_feira', 'resumo',
      'Feira de ' || produto._d(fw.data) || ' feita' || case when p_papel = 'casal' and fw.valor is not null then ', ' || produto._brl(fw.valor) || coalesce(' de ' || produto._brl(teto) || ' da semana', '') else '' end || '. '
      || case when fw.nota_caminho is not null then 'Nota anexada.' when fw.sem_nota_motivo is not null then 'Sem nota (' || fw.sem_nota_motivo || ').' else 'Falta a nota.' end || ' '
      || case when ha_cont then 'Estoque contado: ' || case n_acab when 0 then 'não falta nada.' when 1 then 'falta 1 item.' else 'faltam ' || n_acab || ' itens.' end else 'Estoque ainda não contado.' end,
      'numero', case when p_papel = 'casal' then coalesce(fw.valor, 0) else n_acab end);
  elsif not achou then
    trab := trab || jsonb_build_object('funcionario', 'fiscal_feira', 'frase', 'A semana começou hoje. Às 18h eu pergunto da feira e do estoque.');
  end if;
  -- avisos que ele da sozinho
  if p_papel = 'casal' and teto is not null and gsem > teto then
    avs := avs || jsonb_build_object('funcionario', 'fiscal_feira', 'tipo', 'passou_do_teto',
      'texto', 'A semana de ' || produto._d(seg) || ' passou do teto em ' || produto._brl(gsem - teto) || ' (gastou ' || produto._brl(gsem) || ' de ' || produto._brl(teto)
               || '). É a ' || (select count(*) from produto._segundas(ini_mes) s where s <= seg) || 'ª semana do mês.');
  end if;
  if (select count(*) from (select distinct fe.semana from produto.feiras fe where fe.familia_id = f and fe.semana in (seg, seg - 7) and fe.nota_caminho is null) s) = 2
     and not exists (select 1 from produto.feiras fe where fe.familia_id = f and fe.semana in (seg, seg - 7) and fe.nota_caminho is not null) then
    avs := avs || jsonb_build_object('funcionario', 'fiscal_feira', 'tipo', 'sem_nota_2_semanas', 'texto', 'São 2 semanas seguidas de feira sem nota anexada. Sem nota eu não consigo comparar preço de uma semana pra outra.');
  end if;
  select string_agg(i.nome, ', ' order by i.nome) into rep
    from produto.estoque_itens i
   where i.familia_id = f and i.ativo
     and exists (select 1 from (select ec.itens from produto.estoque_contagens ec where ec.familia_id = f and ec.semana = seg order by ec.data desc, ec.criado_em desc limit 1) c1, jsonb_array_elements(c1.itens) x where x->>'item_id' = i.id::text and x->>'estado' = 'acabou')
     and exists (select 1 from (select ec.itens from produto.estoque_contagens ec where ec.familia_id = f and ec.semana = seg - 7 order by ec.data desc, ec.criado_em desc limit 1) c2, jsonb_array_elements(c2.itens) x where x->>'item_id' = i.id::text and x->>'estado' = 'acabou');
  if rep is not null then
    avs := avs || jsonb_build_object('funcionario', 'fiscal_feira', 'tipo', 'acabou_2_semanas', 'texto', 'Acabou 2 semanas seguidas: ' || rep || '. Vale comprar mais na próxima feira.');
  end if;

  return jsonb_build_object('q', q, 'ent', ent, 'trab', trab, 'avisos', avs);
end $$;
;