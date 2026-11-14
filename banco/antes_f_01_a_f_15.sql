-- CÓPIA DE COMO O BANCO ESTÁ ANTES DA FASE FINAL (f_01 a f_15): funções e políticas dos schemas produto e public.
-- Gerada no banco de teste local com as 59 migrações antigas, que é igual ao banco real (conferido com select em 13/11:
-- políticas, colunas, permissões e o corpo de 131 das 132 funções; a 132ª, public.antes_de_criar_conta, foi copiada do real).
-- Serve de registro e de volta de emergência. A volta normal é rodar banco/migracoes/desfazer/f_15.sql até f_01, nessa ordem.
-- Não tem nenhum dado de família, só código.

-- produto._aliq_ir(dias integer)
CREATE OR REPLACE FUNCTION produto._aliq_ir(dias integer)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case when dias <= 180 then 0.225 when dias <= 360 then 0.20 when dias <= 720 then 0.175 else 0.15 end
$function$
;

-- produto._brl(v numeric)
CREATE OR REPLACE FUNCTION produto._brl(v numeric)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$ select case when v < 0 then '-' else '' end || 'R$ ' || translate(to_char(abs(round(v,2)), 'FM999G999G990D00'), ',.', '.,') $function$
;

-- produto._cartoes_json(p_familia uuid, p_hoje date)
CREATE OR REPLACE FUNCTION produto._cartoes_json(p_familia uuid, p_hoje date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
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
end $function$
;

-- produto._casa_previsao(p_trocas jsonb)
CREATE OR REPLACE FUNCTION produto._casa_previsao(p_trocas jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  with t as (select (x)::date d from jsonb_array_elements_text(coalesce(p_trocas, '[]'::jsonb)) x group by 1),
       o as (select d, d - lag(d) over (order by d) gap from t),
       m as (select round(avg(gap))::int media, max(d) ultima, count(*) n from o)
  select jsonb_build_object(
    'trocas', coalesce((select jsonb_agg(to_char(d, 'YYYY-MM-DD') order by d) from t), '[]'::jsonb),
    'media_dias', case when n >= 2 then media end,
    'proxima_troca', case when n >= 2 then to_char(ultima + media, 'YYYY-MM-DD') end,
    'avisar_em', case when n >= 2 then to_char(ultima + media - 5, 'YYYY-MM-DD') end)
  from m
$function$
;

-- produto._congelar_limite_passado(p_familia uuid, p_env uuid, p_valor numeric)
CREATE OR REPLACE FUNCTION produto._congelar_limite_passado(p_familia uuid, p_env uuid, p_valor numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_mes text := to_char(produto._hoje(), 'YYYY-MM'); v_prim text;
begin
  select to_char(least(coalesce((select min(l.data) from produto.lancamentos l where l.envelope_id = p_env and l.apagado_em is null), (e.criado_em at time zone 'America/Recife')::date),
                       (e.criado_em at time zone 'America/Recife')::date), 'YYYY-MM')
    into v_prim from produto.envelopes e where e.id = p_env and e.familia_id = p_familia;
  if v_prim is not null and v_prim < v_mes and p_valor is not null
     and not exists (select 1 from produto.limites_mes x where x.envelope_id = p_env and x.mes < v_mes) then
    insert into produto.limites_mes (familia_id, envelope_id, mes, valor) values (p_familia, p_env, v_prim, p_valor)
    on conflict (envelope_id, mes) do nothing;
  end if;
end $function$
;

-- produto._d(d date)
CREATE OR REPLACE FUNCTION produto._d(d date)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$ select to_char(d, 'DD/MM') $function$
;

-- produto._dia_nome(d date)
CREATE OR REPLACE FUNCTION produto._dia_nome(d date)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select (array['segunda','terça','quarta','quinta','sexta','sábado','domingo'])[extract(isodow from d)::int]
$function$
;

-- produto._dia_util(d date)
CREATE OR REPLACE FUNCTION produto._dia_util(d date)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select extract(isodow from d) < 6 and not produto._feriado_banco(d)
$function$
;

-- produto._diario(p_env uuid, p_hoje date)
CREATE OR REPLACE FUNCTION produto._diario(p_env uuid, p_hoje date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare ini date; m0 date := date_trunc('month', p_hoje)::date; k date; liq numeric; falta numeric := 0; tot numeric; tem boolean; p record; fora_ini numeric := 0;
begin
  select min(l.data) into ini from produto.lancamentos l where l.envelope_id = p_env and l.apagado_em is null;
  ini := least(coalesce(ini, p_hoje), p_hoje);
  k := least(date_trunc('month', ini)::date, m0);
  liq := produto._lim(p_env, k);
  while k < m0 loop
    if k = date_trunc('month', ini)::date then
      select * into p from produto._plano(p_env, k, liq, ini, (k + interval '1 month' - interval '1 day')::date);
      fora_ini := p.fora;
    else fora_ini := 0; end if;
    select coalesce(sum(l.valor),0), count(*) > 0 into tot, tem from produto.lancamentos l
      where l.envelope_id = p_env and l.apagado_em is null and l.data >= ini and date_trunc('month', l.data) = k;
    falta := case when tem then greatest(0, tot + fora_ini - liq) else 0 end;
    k := (k + interval '1 month')::date;
    liq := produto._lim(p_env, k) - falta;
  end loop;
  select * into p from produto._plano(p_env, m0, liq, ini, p_hoje);
  return jsonb_build_object('inicio', ini, 'liquido', round(liq,2), 'falta_mes_anterior', round(falta,2), 'fora', p.fora,
    'pote_dias', round(p.pote_dias,2), 'valor_dia', p.valor_dia, 'valor_dia_plano', p.valor_dia_plano, 'gasto_hoje', p.gasto_hoje,
    'pode_hoje', round(p.valor_dia - p.gasto_hoje, 2), 'ate_fim_mes', round(coalesce(p.saldo_hoje,0) - p.gasto_hoje, 2),
    'mes_valor', round(liq - p.fora, 2), 'gasto_mes', round(p.gasto_mes, 2));
end $function$
;

-- produto._envelope_congela_limite()
CREATE OR REPLACE FUNCTION produto._envelope_congela_limite()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.limite_mes is distinct from old.limite_mes then
    perform produto._congelar_limite_passado(old.familia_id, old.id, old.limite_mes);
  end if;
  return new;
end $function$
;

-- produto._envelopes_da_casa(p_familia uuid)
CREATE OR REPLACE FUNCTION produto._envelopes_da_casa(p_familia uuid)
 RETURNS TABLE(id uuid, nome text, regra text, criado_em timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select e.id, e.nome, e.regra, e.criado_em from produto.envelopes e
   where e.familia_id = p_familia and e.casa and produto.meu_papel(p_familia) in ('casal', 'equipe')
$function$
;

-- produto._equipe_entrar(p_codigo text, p_convite uuid)
CREATE OR REPLACE FUNCTION produto._equipe_entrar(p_codigo text, p_convite uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); v_falhas int; v_geral int; a produto.acesso_equipe; c produto.acesso_equipe; v_achou boolean := false; n int; v_busca text;
begin
  if uid is null then raise exception 'abra a sessao antes (login anonimo)' using errcode = '42501'; end if;
  -- 1 pessoa nao tenta em paralelo pra furar o limite de 5
  perform pg_advisory_xact_lock(hashtextextended('equipe:' || uid::text, 0));
  select count(*) into v_falhas from produto.tentativas_equipe t where t.user_id = uid and not t.ok and t.criado_em > now() - interval '24 hours';
  if v_falhas >= 5 then return json_build_object('ok', false, 'motivo', 'Muitas tentativas. Peca um codigo novo a quem te convidou.', 'restam', 0); end if;
  if p_convite is null then
    -- entrada antiga (so os 4 numeros): continua com o freio geral
    select count(*) into v_geral from produto.tentativas_equipe t where not t.ok and t.criado_em > now() - interval '1 hour';
    if v_geral >= 30 then return json_build_object('ok', false, 'motivo', 'Entrada da equipe pausada por 1 hora. Tente mais tarde.', 'restam', 5 - v_falhas); end if;
  end if;
  if coalesce(p_codigo, '') ~ '^[0-9]{4}$' then
    if p_convite is not null then
      -- entrada nova: o codigo so vale pro convite dele, e o convite morre com 5 erros
      select ae.* into c from produto.acesso_equipe ae where ae.id = p_convite for update;
      if found and c.expira_em > now() and c.tentativas < 5 then
        if c.codigo_hash = extensions.crypt(p_codigo, c.codigo_hash) then a := c; v_achou := true;
        else update produto.acesso_equipe ae set tentativas = ae.tentativas + 1 where ae.id = c.id;
        end if;
      end if;
    else
      v_busca := encode(sha256(convert_to(p_codigo, 'UTF8')), 'hex');
      for c in select ae.* from produto.acesso_equipe ae
                where ae.expira_em > now() and ae.tentativas < 5 and (ae.codigo_busca = v_busca or ae.codigo_busca is null)
                order by ae.criado_em for update loop
        if c.codigo_hash = extensions.crypt(p_codigo, c.codigo_hash) then a := c; v_achou := true; exit; end if;
      end loop;
    end if;
  end if;
  if v_achou then
    if exists (select 1 from produto.membros m where m.familia_id = a.familia_id and m.user_id = uid) then
      return json_build_object('ok', false, 'motivo', 'Voce ja esta nessa familia.', 'restam', 5 - v_falhas);
    end if;
    update produto.membros m set user_id = uid where m.id = a.membro_id and m.user_id is null;
    get diagnostics n = row_count;
    -- codigo vale 1 vez: vence na hora
    update produto.acesso_equipe ae set expira_em = now(), usado_em = now() where ae.id = a.id;
    insert into produto.tentativas_equipe (user_id, ok) values (uid, n = 1);
    if n = 0 then return json_build_object('ok', false, 'motivo', 'Esse convite ja foi usado.', 'restam', 5 - v_falhas); end if;
    return json_build_object('ok', true, 'familia_id', a.familia_id, 'membro_id', a.membro_id,
      'nome', (select m.nome from produto.membros m where m.id = a.membro_id));
  end if;
  insert into produto.tentativas_equipe (user_id, ok) values (uid, false);
  return json_build_object('ok', false, 'motivo', 'Codigo errado ou vencido.', 'restam', greatest(0, 4 - v_falhas));
end $function$
;

-- produto._esc_achar(p_esc jsonb, p_prefixo text)
CREATE OR REPLACE FUNCTION produto._esc_achar(p_esc jsonb, p_prefixo text)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select x from jsonb_array_elements(p_esc->'precisa_de_voce') x where x->>'id' like p_prefixo || '%' limit 1
$function$
;

-- produto._esc_brutas(p_familia uuid, p_agora timestamp with time zone, p_papel text, p_nome text)
CREATE OR REPLACE FUNCTION produto._esc_brutas(p_familia uuid, p_agora timestamp with time zone, p_papel text, p_nome text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
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
  achou := dow <> 1 or hora >= 18; select null::uuid as id, null::numeric as valor, null::date as data into cand;
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
end $function$
;

-- produto._esc_cadastro(p_familia uuid, p_hoje date, p_papel text)
CREATE OR REPLACE FUNCTION produto._esc_cadastro(p_familia uuid, p_hoje date, p_papel text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare f uuid := p_familia; cfg jsonb := '{}'::jsonb; cj jsonb; ej jsonb := produto._estoque_json(f); out jsonb := '{}'::jsonb; rs jsonb; g jsonb; c jsonb; mes text := to_char(p_hoje, 'YYYY-MM');
  dias constant text[] := array['o domingo','a segunda','a terça','a quarta','a quinta','a sexta','o sábado'];
begin
  out := out || jsonb_build_object('fiscal_feira', jsonb_build_object('titulo', 'Feiras e estoque', 'novo', 'Registrar feira', 'rpc', 'feira_registrar',
    'vazio', 'Nenhuma feira registrada ainda.', 'itens', produto._feiras_json(f, p_papel, 8), 'contagens', ej->'contagens', 'itens_da_casa', ej->'itens'));
  if p_papel = 'equipe' then
    c := produto.casa_da_equipe(f)::jsonb;
    return out || jsonb_build_object('comprador', jsonb_build_object('titulo', 'Prestadores e gás', 'novo', null, 'rpc', null, 'vazio', 'Nenhum prestador cadastrado.',
      'itens', (select coalesce(jsonb_agg(jsonb_build_object('id', p->>'id', 'servico', p->>'servico', 'nome', p->>'nome', 'dia', (p->>'dia')::int, 'ultima_vez', p->>'ultima_vez',
                  'linha', coalesce(p->>'servico', 'Prestador') || ': ' || coalesce(p->>'nome', '') || ', tod' || dias[(p->>'dia')::int + 1])), '[]'::jsonb) from jsonb_array_elements(c->'prestadores') p),
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
                  'linha', coalesce(p->>'servico', 'Prestador') || ': ' || coalesce(p->>'nome', '') || case when (p->>'dia') ~ '^[0-6]$' then ', tod' || dias[(p->>'dia')::int + 1] else '' end
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
end $function$
;

-- produto._esc_diario_json(p_familia uuid, p_funcionario text, p_limite integer, p_antes timestamp with time zone)
CREATE OR REPLACE FUNCTION produto._esc_diario_json(p_familia uuid, p_funcionario text, p_limite integer, p_antes timestamp with time zone)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_agg(x.j order by x.quando desc), '[]'::jsonb) from (
    select d.quando, jsonb_build_object('id', d.id, 'funcionario', d.funcionario, 'assunto', d.assunto, 'ref', d.ref, 'quando', d.quando,
             'data', to_char(d.quando at time zone 'America/Recife', 'DD/MM'), 'hora', to_char(d.quando at time zone 'America/Recife', 'HH24:MI'),
             'pergunta_curta', coalesce(d.dados->>'curta', left(d.pergunta, 60)), 'pergunta', d.pergunta, 'resposta', d.resposta, 'opcao', d.dados->>'opcao',
             'por', m.nome, 'adiado_ate', d.adiado_ate, 'corrige', d.dados->>'corrige',
             'anotado', 'anotado às ' || to_char(d.quando at time zone 'America/Recife', 'HH24:MI')) as j
      from produto.esc_diario d left join produto.membros m on m.familia_id = d.familia_id and m.user_id = d.respondido_por
     where d.familia_id = p_familia and (d.casa or produto.meu_papel(p_familia) = 'casal') and (p_funcionario is null or d.funcionario = p_funcionario) and (p_antes is null or d.quando < p_antes)
     order by d.quando desc limit least(greatest(coalesce(p_limite, 10), 1), 200)) x
$function$
;

-- produto._esc_espera(n integer)
CREATE OR REPLACE FUNCTION produto._esc_espera(n integer)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case when n <= 0 then 'desde hoje' when n = 1 then 'desde ontem' else 'há ' || n || ' dias' end
$function$
;

-- produto._esc_func()
CREATE OR REPLACE FUNCTION produto._esc_func()
 RETURNS TABLE(ord integer, id text, nome text, sala text, casa boolean, parado text, faz jsonb)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$ values
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
$function$
;

-- produto._esc_funcionarios()
CREATE OR REPLACE FUNCTION produto._esc_funcionarios()
 RETURNS TABLE(ord integer, id text, nome text, sala text, casa boolean, parado text)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$ values
  (1, 'contador', 'Contador', 'Caixa', false, 'Às 20h eu confiro se os gastos de hoje foram lançados.'),
  (2, 'guardiao_colchao', 'Guardião do Colchão', 'Caixa', false, 'Separe um colchão em algum envelope e eu aviso se ele baixar.'),
  (3, 'analista_cartao', 'Analista de Cartão', 'Cartões', false, 'Nenhuma fatura vencendo nos próximos dias.'),
  (4, 'folha_casa', 'Folha da Casa', 'Casa', false, 'Cadastre quem trabalha na casa e eu cobro a guia DAE e o salário.'),
  (5, 'comprador', 'Comprador', 'Casa', true, 'Sem visita de prestador nem troca de gás por agora.'),
  (6, 'gestor_guardado', 'Gestor do Guardado', 'Patrimônio', false, 'Cadastre a 1ª aplicação e eu digo quanto ela rende por dia.'),
  (7, 'secretaria', 'Secretária', 'Recepção', false, 'Nenhum lembrete pra agora. Crie um em Lembretes.')
$function$
;

-- produto._esc_p(p_id text, p_func text, p_assunto text, p_curta text, p_v1 text, p_v2 text, p_v3 text, p_importa text, p_sugiro text, p_valor numeric, p_opcoes jsonb, p_vence date, p_desde timestamp with time zone, p_casa boolean, p_extra jsonb, p_ordem integer)
CREATE OR REPLACE FUNCTION produto._esc_p(p_id text, p_func text, p_assunto text, p_curta text, p_v1 text, p_v2 text, p_v3 text, p_importa text, p_sugiro text, p_valor numeric, p_opcoes jsonb, p_vence date, p_desde timestamp with time zone, p_casa boolean DEFAULT false, p_extra jsonb DEFAULT '{}'::jsonb, p_ordem integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select jsonb_build_array(jsonb_build_object('id', p_id, 'funcionario', p_func, 'assunto', p_assunto, 'curta', p_curta,
    'vi', jsonb_build_array(p_v1, coalesce(p_v2, p_v1), coalesce(p_v3, p_v2, p_v1)), 'importa', coalesce(p_importa, ''), 'sugiro', coalesce(p_sugiro, ''),
    'opcoes', p_opcoes, 'vence_em', p_vence, 'desde', p_desde, 'casa', p_casa, 'ordem', p_ordem)
    || case when p_valor is null then '{}'::jsonb else jsonb_build_object('valor', round(p_valor, 2)) end || coalesce(p_extra, '{}'::jsonb))
$function$
;

-- produto._esc_q(p_id text, p_func text, p_assunto text, p_pergunta text, p_contexto text, p_valor numeric, p_opcoes jsonb, p_vence date, p_desde timestamp with time zone, p_casa boolean, p_extra jsonb)
CREATE OR REPLACE FUNCTION produto._esc_q(p_id text, p_func text, p_assunto text, p_pergunta text, p_contexto text, p_valor numeric, p_opcoes jsonb, p_vence date, p_desde timestamp with time zone, p_casa boolean DEFAULT false, p_extra jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select jsonb_build_array(jsonb_build_object('id', p_id, 'funcionario', p_func, 'assunto', p_assunto, 'pergunta', p_pergunta, 'contexto', coalesce(p_contexto, ''),
    'opcoes', p_opcoes, 'vence_em', p_vence, 'desde', p_desde, 'casa', p_casa)
    || case when p_valor is null then '{}'::jsonb else jsonb_build_object('valor', round(p_valor, 2)) end || coalesce(p_extra, '{}'::jsonb))
$function$
;

-- produto._esc_relatorio(p_familia uuid, p_de date, p_ate date, p_agora timestamp with time zone)
CREATE OR REPLACE FUNCTION produto._esc_relatorio(p_familia uuid, p_de date, p_ate date, p_agora timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
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
end $function$
;

-- produto._esc_responder(p_familia uuid, p_pergunta text, p_opcao text, p_dados jsonb, p_agora timestamp with time zone)
CREATE OR REPLACE FUNCTION produto._esc_responder(p_familia uuid, p_pergunta text, p_opcao text, p_dados jsonb, p_agora timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  f uuid := p_familia; papel text := produto.meu_papel(f); uid uuid := (select auth.uid()); tz constant text := 'America/Recife';
  hoje date := (p_agora at time zone 'America/Recife')::date; am8 timestamptz; d jsonb := coalesce(p_dados, '{}'::jsonb);
  esc jsonb; qj jsonb; op jsonb; old record; corrige uuid; ass text; adiado timestamptz; efeito jsonb := '{}'::jsonb; resp text; did uuid; casa_ok boolean;
  v numeric; dt date; txt text; cfg jsonb; aid uuid; j jsonb; pid text; perg text;
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
end $function$
;

-- produto._escritorio(p_familia uuid, p_agora timestamp with time zone)
CREATE OR REPLACE FUNCTION produto._escritorio(p_familia uuid, p_agora timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
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
    select d.quando, d.resposta, d.dados, d.adiado_ate into ul from produto.esc_diario d where d.familia_id = f and d.ref = t->>'id' and (papel = 'casal' or (d.casa and d.dados->>'opcao' is distinct from 'pedir_equipe')) order by d.quando desc limit 1;
    tem := found;
    continue when tem and (ul.adiado_ate is null or ul.adiado_ate > p_agora);
    select count(*) into nresp from produto.esc_diario d where d.familia_id = f and d.ref = t->>'id' and (papel = 'casal' or d.casa);
    dias := coalesce((t->>'dias_esperando')::int, greatest(hoje - ((t->>'desde')::timestamptz at time zone tz)::date, 0));
    var := case when dias <= 0 then 1 when dias <= 2 then 2 else 3 end;
    if nresp > 0 and var = 1 then var := 2; end if;
    vi := replace(t->'vi'->>(var - 1), '{dias}', produto._esc_espera(dias));
    if coalesce(nome, '') <> '' and vi not like nome || ', %' then vi := nome || ', ' || lower(left(vi, 1)) || substr(vi, 2); end if;
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
end $function$
;

-- produto._estoque_contar(p_familia uuid, p_itens jsonb, p_data date, p_hoje date)
CREATE OR REPLACE FUNCTION produto._estoque_contar(p_familia uuid, p_itens jsonb, p_data date, p_hoje date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
end $function$
;

-- produto._estoque_json(p_familia uuid)
CREATE OR REPLACE FUNCTION produto._estoque_json(p_familia uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
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
$function$
;

-- produto._faturas(p_familia uuid, p_de date, p_meses integer)
CREATE OR REPLACE FUNCTION produto._faturas(p_familia uuid, p_de date, p_meses integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is not null and produto.meu_papel(p_familia) is null then
    raise exception 'sem acesso a esta familia' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('cartao_id', c.id, 'cartao', c.nome, 'ativo', c.ativo, 'mes', to_char(m.mes,'YYYY-MM'),
      'fecha_em', make_date(extract(year from f.fm)::int, extract(month from f.fm)::int, least(c.dia_fechamento::int, extract(day from (f.fm + interval '1 month' - interval '1 day'))::int)),
      'vence_em', make_date(extract(year from m.mes)::int, extract(month from m.mes)::int, least(c.dia_vencimento::int, extract(day from (m.mes + interval '1 month' - interval '1 day'))::int)),
      'total', coalesce(x.total,0), 'compras', coalesce(x.n,0)) order by c.nome, m.mes)
    from produto.cartoes c
    cross join lateral (select gs::date as mes from generate_series(date_trunc('month',p_de), date_trunc('month',p_de) + (greatest(p_meses,1)-1) * interval '1 month', interval '1 month') gs) m
    cross join lateral (select case when c.dia_vencimento > c.dia_fechamento then m.mes else (m.mes - interval '1 month')::date end as fm) f
    left join lateral (select sum(l.valor) total, count(*) n from produto.lancamentos l
       where l.cartao_id = c.id and l.familia_id = c.familia_id and l.apagado_em is null
         and produto._mes_fatura(c.dia_fechamento, c.dia_vencimento, l.data) = m.mes) x on true
    where c.familia_id = p_familia and (c.ativo or coalesce(x.n,0) > 0)), '[]'::jsonb);
end $function$
;

-- produto._feira_registrar(p_familia uuid, p_data date, p_valor numeric, p_loja text, p_lancamento uuid, p_chave uuid, p_feira uuid, p_hoje date)
CREATE OR REPLACE FUNCTION produto._feira_registrar(p_familia uuid, p_data date, p_valor numeric, p_loja text, p_lancamento uuid, p_chave uuid, p_feira uuid, p_hoje date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
end $function$
;

-- produto._feiras_json(p_familia uuid, p_papel text, p_limite integer)
CREATE OR REPLACE FUNCTION produto._feiras_json(p_familia uuid, p_papel text, p_limite integer DEFAULT 8)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
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
$function$
;

-- produto._feriado_banco(d date)
CREATE OR REPLACE FUNCTION produto._feriado_banco(d date)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select d = any (array['2026-01-01','2026-02-16','2026-02-17','2026-04-03','2026-04-21','2026-05-01','2026-06-04','2026-09-07','2026-10-12',
    '2026-11-02','2026-11-15','2026-11-20','2026-12-25','2027-01-01','2027-02-08','2027-02-09','2027-03-26','2027-04-21','2027-05-01',
    '2027-05-27','2027-09-07','2027-10-12','2027-11-02','2027-11-15','2027-11-20','2027-12-25']::date[])
    or (extract(year from d) not in (2026, 2027) and to_char(d, 'MM-DD') in ('01-01','04-21','05-01','09-07','10-12','11-02','11-15','11-20','12-25'))
$function$
;

-- produto._gasto(p_env uuid, p_de date, p_ate date)
CREATE OR REPLACE FUNCTION produto._gasto(p_env uuid, p_de date, p_ate date)
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select coalesce(sum(l.valor),0) from produto.lancamentos l
   where l.envelope_id = p_env and l.apagado_em is null and l.data between p_de and p_ate $function$
;

-- produto._guarda_ultimo_casal()
CREATE OR REPLACE FUNCTION produto._guarda_ultimo_casal()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if old.papel = 'casal' and old.ativo and old.user_id is not null
     and (tg_op <> 'UPDATE' or new.papel <> 'casal' or not new.ativo)
     and exists (select 1 from produto.familias f where f.id = old.familia_id)
     and not exists (select 1 from produto.membros m where m.familia_id = old.familia_id and m.id <> old.id
                      and m.papel = 'casal' and m.ativo and m.user_id is not null) then
    raise exception 'a familia nao pode ficar sem casal' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' then return new; end if;
  return old;
end $function$
;

-- produto._guardado(p_familia uuid, p_hoje date, p_cdi_fixo numeric)
CREATE OR REPLACE FUNCTION produto._guardado(p_familia uuid, p_hoje date, p_cdi_fixo numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  apps jsonb; ix record; cdi numeric; cdi_data date; cdi_fonte text; selic numeric;
  util boolean := produto._dia_util(p_hoje); prox date; aviso text; motivo text;
  total numeric; hb numeric; hl numeric; ml numeric; tl numeric; tb numeric; iof numeric; fora numeric := 0;
  por_dia jsonb; expl jsonb := '[]'::jsonb; a jsonb; ult jsonb; n_apps int;
begin
  select coalesce(jsonb_agg(produto._guardado_app(x.id, p_hoje, p_cdi_fixo) order by x.criado_em, x.id), '[]'::jsonb) into apps
    from produto.pat_aplicacoes x where x.familia_id = p_familia and x.encerrada_em is null;
  n_apps := jsonb_array_length(apps);

  select x.data, x.cdi_dia, x.fonte into cdi_data, cdi, cdi_fonte from produto.pat_indices x
   where x.cdi_dia is not null and x.data <= p_hoje order by x.data desc limit 1;
  if cdi is null then
    select x.data, x.cdi_dia, x.fonte into cdi_data, cdi, cdi_fonte from produto.pat_indices x where x.cdi_dia is not null order by x.data limit 1;
  end if;
  select x.selic_meta into selic from produto.pat_indices x where x.selic_meta is not null and x.data <= p_hoje order by x.data desc limit 1;
  if p_cdi_fixo is not null then cdi := p_cdi_fixo; cdi_data := p_hoje; cdi_fonte := 'teste'; end if;
  if cdi is null then cdi := 0.050788; cdi_data := '2026-11-10'; cdi_fonte := 'manual'; end if;

  prox := p_hoje + 1;
  while not produto._dia_util(prox) loop prox := prox + 1; end loop;
  if not util then
    motivo := case when extract(isodow from p_hoje) = 6 then 'sábado' when extract(isodow from p_hoje) = 7 then 'domingo' else 'feriado dos bancos' end;
    aviso := 'hoje é ' || motivo || ': rende de novo ' || case when prox = p_hoje + 1 then 'amanhã' when extract(isodow from prox) >= 6 then 'no ' || produto._dia_nome(prox) else 'na ' || produto._dia_nome(prox) end;
  end if;

  -- garantia do FGC: soma por titular e por banco, ate R$ 250.000
  select coalesce(jsonb_agg(x.app || jsonb_build_object(
           'fgc_ok', x.app->>'tipo' = 'tesouro_selic' or x.soma <= 250000,
           'garantia', case when x.app->>'tipo' = 'tesouro_selic' then 'Tesouro Nacional' else 'FGC' end) order by x.ord), '[]'::jsonb),
         coalesce(sum(distinct case when x.app->>'tipo' <> 'tesouro_selic' and x.soma > 250000 then x.soma - 250000 else 0 end), 0)
    into apps, fora
    from (select t.app, t.ord,
                 sum(case when t.app->>'tipo' <> 'tesouro_selic' then (t.app->>'saldo')::numeric else 0 end)
                   over (partition by t.app->>'titular_membro', lower(btrim(t.app->>'banco'))) as soma
            from jsonb_array_elements(apps) with ordinality t(app, ord)) x;

  select coalesce(sum((x->>'saldo')::numeric), 0), coalesce(sum((x->>'rendeu_hoje_bruto')::numeric), 0), coalesce(sum((x->>'rendeu_hoje_liquido')::numeric), 0),
         coalesce(sum((x->>'rendeu_mes_liquido')::numeric), 0), coalesce(sum((x->>'rendeu_desde_inicio_liquido')::numeric), 0),
         coalesce(sum((x->>'rendeu_desde_inicio_bruto')::numeric), 0), coalesce(sum((x->>'iof_se_sacar_hoje')::numeric), 0)
    into total, hb, hl, ml, tl, tb, iof from jsonb_array_elements(apps) x;

  select jsonb_agg(jsonb_build_object('data', g::date, 'liquido', coalesce(s.liq, 0), 'bruto', coalesce(s.bru, 0), 'util', produto._dia_util(g::date),
           'motivo', case when produto._dia_util(g::date) then null when extract(isodow from g) = 6 then 'sábado'
                          when extract(isodow from g) = 7 then 'domingo' else 'feriado dos bancos' end) order by g)
    into por_dia
    from generate_series(p_hoje - 29, p_hoje, interval '1 day') g
    left join lateral (select sum((dd->>'liquido')::numeric) liq, sum((dd->>'bruto')::numeric) bru
                         from jsonb_array_elements(apps) ap, jsonb_array_elements(ap->'dias') dd where (dd->>'data')::date = g::date) s on true;

  select jsonb_build_object('data', x->>'data', 'liquido', (x->>'liquido')::numeric) into ult
    from jsonb_array_elements(por_dia) x where (x->>'data')::date < p_hoje and (x->>'liquido')::numeric > 0 order by x->>'data' desc limit 1;

  expl := expl || jsonb_build_object('linha', 'Você tem guardado (soma das aplicações, com o que já rendeu)', 'valor', round(total, 2));
  expl := expl || jsonb_build_object('linha', 'Taxa do dia: CDI de ' || to_char(cdi_data, 'DD/MM') || ' = ' || translate(trim(to_char(cdi, 'FM0D000000')), '.', ',') || '% ao dia ('
            || translate(trim(to_char(round((power(1 + cdi / 100, 252) - 1) * 100, 2), 'FM990D00')), '.', ',') || '% ao ano), fonte ' || cdi_fonte, 'valor', cdi);
  for a in select x from jsonb_array_elements(apps) x loop
    if a->>'tipo' = 'poupanca' then
      expl := expl || jsonb_build_object('linha', (a->>'nome') || ': poupança só rende no dia do aniversário de cada depósito (0,5% ao mês, estimativa sem a TR)', 'valor', (a->>'rendeu_hoje_liquido')::numeric);
    elsif not util then
      expl := expl || jsonb_build_object('linha', (a->>'nome') || ': ' || aviso, 'valor', 0);
    else
      expl := expl || jsonb_build_object('linha', (a->>'nome') || ': ' || produto._brl((a->>'saldo')::numeric - (a->>'rendeu_hoje_bruto')::numeric) || ' × taxa do dia'
            || case when a->>'tipo' = 'tesouro_selic' then ' (Selic)' else ' × ' || translate(trim(to_char((a->>'pct_cdi')::numeric, 'FM990D##')), '.', ',') || '% do CDI' end, 'valor', (a->>'rendeu_hoje_bruto')::numeric);
      if (a->>'isento_ir')::boolean then
        expl := expl || jsonb_build_object('linha', (a->>'nome') || ': sem imposto de renda (isenta)', 'valor', 0);
      else
        expl := expl || jsonb_build_object('linha', (a->>'nome') || ': imposto de renda de ' || translate(trim(to_char((a->>'ir_faixa')::numeric, 'FM990D0')), '.', ',') || '% sobre o rendimento (cai com o tempo, até 15%)',
                 'valor', (a->>'rendeu_hoje_liquido')::numeric - (a->>'rendeu_hoje_bruto')::numeric);
      end if;
    end if;
  end loop;
  expl := expl || jsonb_build_object('linha', 'Rendeu hoje, já sem o imposto', 'valor', round(hl, 2));
  if iof > 0 then
    expl := expl || jsonb_build_object('linha', 'Se tirar hoje o dinheiro guardado há menos de 30 dias, o banco cobra IOF sobre o rendimento dele', 'valor', -round(iof, 2));
  end if;
  expl := expl || jsonb_build_object('linha', 'Estimativa: quem manda é o extrato do banco. Confira o saldo no dia 1 e digite aqui', 'valor', round(total, 2));

  return jsonb_build_object(
    'familia_id', p_familia, 'data', p_hoje, 'vazio', n_apps = 0,
    'total', round(total, 2), 'rendeu_hoje_bruto', round(hb, 2), 'rendeu_hoje_liquido', round(hl, 2),
    'rendeu_mes_liquido', round(ml, 2), 'rendeu_desde_inicio_liquido', round(tl, 2), 'rendeu_desde_inicio_bruto', round(tb, 2),
    'hoje_rende', util, 'aviso', aviso, 'proximo_dia_util', prox, 'ultimo_dia_que_rendeu', ult,
    'iof_se_sacar_hoje', round(iof, 2), 'fora_do_fgc', round(fora, 2),
    'cdi_usado', jsonb_build_object('data', cdi_data, 'pct_dia', cdi, 'pct_ano', round((power(1 + cdi / 100, 252) - 1) * 100, 2), 'fonte', cdi_fonte,
                   'selic_meta', selic, 'estimativa', cdi_data is distinct from p_hoje),
    'por_dia_30', por_dia,
    'aplicacoes', (select coalesce(jsonb_agg(x - 'dias' order by o), '[]'::jsonb) from jsonb_array_elements(apps) with ordinality t(x, o)),
    'explicacao', expl,
    'exemplo', jsonb_build_object('valor', 10000, 'pct_cdi', 100, 'rende_por_dia_util_bruto', round(10000 * cdi / 100, 2),
                 'rende_por_dia_util_liquido', round(10000 * cdi / 100 * 0.775, 2), 'rende_em_21_dias_uteis_liquido', round(10000 * (power(1 + cdi / 100, 21) - 1) * 0.775, 2)),
    'atualizado_em', now());
end $function$
;

-- produto._guardado_app(p_app uuid, p_hoje date, p_cdi_fixo numeric)
CREATE OR REPLACE FUNCTION produto._guardado_app(p_app uuid, p_hoje date, p_cdi_fixo numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  a produto.pat_aplicacoes%rowtype;
  m_data date[]; m_tipo text[]; m_valor numeric[]; nm int; k int := 1;
  l_data date[] := '{}'; l_saldo numeric[] := '{}'; l_rend numeric[] := '{}'; n int := 0; i int;
  ini date; idx record; d date; util boolean;
  selic numeric; taxa1 numeric; taxa numeric; fator numeric; taxa_m numeric;
  y numeric; al numeric; v numeric; tot numeric; tira numeric;
  dia_b numeric; dia_l numeric;
  hoje_b numeric := 0; hoje_l numeric := 0; mes_b numeric := 0; mes_l numeric := 0; tot_b numeric := 0; tot_l numeric := 0;
  ult_data date; ult_l numeric := 0; aplicado numeric := 0; ajuste numeric := 0; iof numeric := 0; estim boolean := false;
  dias jsonb := '[]'::jsonb; faixa numeric := 0; saldo numeric := 0;
begin
  select * into a from produto.pat_aplicacoes x where x.id = p_app;
  if not found then return null; end if;
  select array_agg(mv.data order by mv.data, mv.criado_em, mv.id), array_agg(mv.tipo order by mv.data, mv.criado_em, mv.id),
         array_agg(mv.valor order by mv.data, mv.criado_em, mv.id), count(*), min(mv.data)
    into m_data, m_tipo, m_valor, nm, ini
    from produto.pat_movimentos mv
   where mv.familia_id = a.familia_id and mv.aplicacao_id = p_app and mv.anulado_em is null and mv.data <= p_hoje;
  select x.selic_meta into selic from produto.pat_indices x where x.selic_meta is not null and x.data <= p_hoje order by x.data desc limit 1;
  select x.cdi_dia into taxa1 from produto.pat_indices x where x.cdi_dia is not null order by x.data limit 1;
  if a.tipo = 'poupanca' then estim := true; end if;

  if ini is not null then
  for idx in
    select g::date as d, t.cdi_dia, t.data as tdata
      from generate_series(ini, p_hoje, interval '1 day') g
      left join lateral (select x.cdi_dia, x.data from produto.pat_indices x
                          where x.data <= g::date and x.cdi_dia is not null order by x.data desc limit 1) t on true
     order by 1
  loop
    d := idx.d;
    while k <= nm and m_data[k] = d loop
      if m_tipo[k] = 'aporte' then
        n := n + 1; l_data[n] := d; l_saldo[n] := m_valor[k]; l_rend[n] := 0; aplicado := aplicado + m_valor[k];
      elsif m_tipo[k] = 'resgate' then
        v := m_valor[k];
        for i in 1..n loop
          exit when v <= 0;
          tira := least(l_saldo[i], v); l_saldo[i] := l_saldo[i] - tira; v := v - tira; aplicado := aplicado - tira;
        end loop;
      else
        tot := 0; for i in 1..n loop tot := tot + l_saldo[i]; end loop;
        if tot > 0 then
          for i in 1..n loop l_saldo[i] := round(l_saldo[i] * m_valor[k] / tot, 10); end loop;
        elsif m_valor[k] > 0 then
          n := n + 1; l_data[n] := d; l_saldo[n] := m_valor[k]; l_rend[n] := 0;
        end if;
        ajuste := ajuste + m_valor[k] - tot;
      end if;
      k := k + 1;
    end loop;

    dia_b := 0; dia_l := 0; util := produto._dia_util(d);
    if a.tipo = 'poupanca' then
      taxa_m := case when coalesce(selic, 13.75) > 8.5 then 0.005 else round(coalesce(selic, 13.75) * 0.7 / 1200, 10) end;
      for i in 1..n loop
        if l_saldo[i] > 0 and d > l_data[i] and extract(day from d) = least(extract(day from l_data[i]), 28) then
          y := round(l_saldo[i] * taxa_m, 10); l_saldo[i] := l_saldo[i] + y; l_rend[i] := l_rend[i] + y; dia_b := dia_b + y; dia_l := dia_l + y;
        end if;
      end loop;
    elsif util then
      taxa := coalesce(p_cdi_fixo, idx.cdi_dia, taxa1, 0.050788);
      if p_cdi_fixo is null and idx.tdata is distinct from d then estim := true; end if;
      if a.tipo = 'tesouro_selic' and p_cdi_fixo is null and selic is not null then
        fator := round(power(1 + selic / 100, 1.0 / 252) - 1, 16);
      else
        fator := round(taxa / 100 * (case when a.tipo = 'tesouro_selic' then 100 else a.pct_cdi end) / 100, 16);
      end if;
      for i in 1..n loop
        if l_saldo[i] > 0 then
          y := round(l_saldo[i] * fator, 10);
          al := case when a.isento_ir then 0 else produto._aliq_ir(d - l_data[i]) end;
          l_saldo[i] := l_saldo[i] + y; l_rend[i] := l_rend[i] + y; dia_b := dia_b + y; dia_l := dia_l + y * (1 - al);
        end if;
      end loop;
    end if;

    tot_b := tot_b + dia_b; tot_l := tot_l + dia_l;
    if date_trunc('month', d) = date_trunc('month', p_hoje) then mes_b := mes_b + dia_b; mes_l := mes_l + dia_l; end if;
    if d = p_hoje then hoje_b := dia_b; hoje_l := dia_l;
    elsif dia_b > 0 then ult_data := d; ult_l := dia_l; end if;
    if d > p_hoje - 30 then
      dias := dias || jsonb_build_object('data', d, 'bruto', round(dia_b, 2), 'liquido', round(dia_l, 2));
    end if;
  end loop;
  end if;

  for i in 1..n loop
    saldo := saldo + l_saldo[i];
    if l_saldo[i] > 0 then
      if faixa = 0 and not a.isento_ir then faixa := produto._aliq_ir(p_hoje - l_data[i]) * 100; end if;
      if a.tipo <> 'poupanca' and p_hoje - l_data[i] < 30 then iof := iof + l_rend[i] * produto._iof_pct(p_hoje - l_data[i]) / 100; end if;
    end if;
  end loop;

  return jsonb_build_object(
    'id', a.id, 'nome', a.nome, 'banco', a.banco, 'tipo', a.tipo, 'pct_cdi', a.pct_cdi, 'isento_ir', a.isento_ir,
    'liquidez', a.liquidez, 'vence_em', a.vence_em, 'titular_membro', a.titular_membro, 'inicio', ini,
    'saldo', round(saldo, 2), 'aplicado', round(aplicado, 2), 'ajuste_conferido', round(ajuste, 2),
    'rendeu_hoje_bruto', round(hoje_b, 2), 'rendeu_hoje_liquido', round(hoje_l, 2),
    'rendeu_mes_bruto', round(mes_b, 2), 'rendeu_mes_liquido', round(mes_l, 2),
    'rendeu_desde_inicio_bruto', round(tot_b, 2), 'rendeu_desde_inicio_liquido', round(tot_l, 2),
    'ir_faixa', faixa, 'iof_se_sacar_hoje', round(iof, 2), 'estimativa', estim,
    'ultimo_dia_que_rendeu', case when ult_data is not null then jsonb_build_object('data', ult_data, 'liquido', round(ult_l, 2)) end,
    'dias', dias);
end $function$
;

-- produto._guardado_custo(p_familia uuid, p_valor numeric, p_hoje date, p_cdi_fixo numeric, p_pct_fixo numeric)
CREATE OR REPLACE FUNCTION produto._guardado_custo(p_familia uuid, p_valor numeric, p_hoje date, p_cdi_fixo numeric DEFAULT NULL::numeric, p_pct_fixo numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  g jsonb; a jsonb; pct numeric; cdi numeric; isento boolean := false; f numeric; n_mes int; n_ano int;
  fim date := (date_trunc('month', p_hoje) + interval '1 month - 1 day')::date;
  b_mes numeric; b_ano numeric; l_mes numeric; l_ano numeric; nome text;
begin
  if p_valor is null or p_valor <= 0 or p_valor > 100000000 then raise exception 'valor invalido' using errcode = '22023'; end if;
  if p_pct_fixo is null then
    g := produto._guardado(p_familia, p_hoje, p_cdi_fixo);
    select x into a from jsonb_array_elements(g->'aplicacoes') x where (x->>'saldo')::numeric > 0
     order by (x->>'liquidez' = 'diaria' and x->>'tipo' not in ('poupanca')) desc, (x->>'saldo')::numeric desc limit 1;
    if a is null then return jsonb_build_object('tem_guardado', false); end if;
    pct := case when a->>'tipo' in ('tesouro_selic', 'poupanca') then 100 else (a->>'pct_cdi')::numeric end;
    isento := (a->>'isento_ir')::boolean; nome := a->>'nome'; cdi := (g->'cdi_usado'->>'pct_dia')::numeric;
  else
    pct := p_pct_fixo; cdi := coalesce(p_cdi_fixo, 0.050788); nome := 'teste';
  end if;
  if p_cdi_fixo is not null then cdi := p_cdi_fixo; end if;
  f := round(cdi / 100 * pct / 100, 16);
  select count(*) filter (where g2::date < fim), count(*) into n_mes, n_ano
    from generate_series(p_hoje, (p_hoje + interval '1 year - 1 day')::date, interval '1 day') g2 where produto._dia_util(g2::date);
  b_mes := round(p_valor * (power(1 + f, n_mes) - 1), 2); b_ano := round(p_valor * (power(1 + f, n_ano) - 1), 2);
  l_mes := case when isento then b_mes else round(b_mes * 0.775, 2) end;
  l_ano := case when isento then b_ano else round(b_ano * 0.825, 2) end;
  return jsonb_build_object('tem_guardado', true, 'valor', p_valor, 'aplicacao', nome, 'pct_cdi', pct,
    'ate_fim_do_mes', jsonb_build_object('dias_uteis', n_mes, 'bruto', b_mes, 'liquido', l_mes),
    'em_12_meses', jsonb_build_object('dias_uteis', n_ano, 'bruto', b_ano, 'liquido', l_ano),
    'frase', case when l_mes >= 0.01 then 'Esse gasto também custou ' || produto._brl(l_mes) || ' de rendimento até o fim do mês (' || produto._brl(l_ano) || ' em 12 meses).'
                  else 'Esse gasto também custou ' || produto._brl(l_ano) || ' de rendimento em 12 meses.' end,
    'estimativa', true);
end $function$
;

-- produto._guardado_movimentar(p_app uuid, p_tipo text, p_valor numeric, p_data date, p_chave uuid, p_hoje date)
CREATE OR REPLACE FUNCTION produto._guardado_movimentar(p_app uuid, p_tipo text, p_valor numeric, p_data date, p_chave uuid, p_hoje date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare a produto.pat_aplicacoes%rowtype; dt date := coalesce(p_data, p_hoje); mid uuid; saldo numeric; dif numeric; ja boolean := false; g jsonb;
begin
  select * into a from produto.pat_aplicacoes x where x.id = p_app;
  if not found or produto.meu_papel(a.familia_id) is distinct from 'casal' then
    raise exception 'aplicacao nao encontrada ou sem permissao' using errcode = '42501';
  end if;
  if p_chave is null then raise exception 'falta a chave do toque' using errcode = '22023'; end if;
  if p_tipo is null or p_tipo not in ('aporte', 'resgate', 'saldo_conferido') then raise exception 'tipo invalido: use aporte, resgate ou saldo_conferido' using errcode = '22023'; end if;
  if p_valor is null or p_valor < 0 or p_valor > 100000000 or (p_tipo <> 'saldo_conferido' and p_valor < 0.01) then raise exception 'valor invalido' using errcode = '22023'; end if;
  if dt > p_hoje then raise exception 'a data nao pode ser no futuro' using errcode = '22023'; end if;
  if dt < p_hoje - 3660 then raise exception 'data muito antiga' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('guardado:' || a.familia_id::text, 0));
  select mv.id into mid from produto.pat_movimentos mv where mv.familia_id = a.familia_id and mv.chave = p_chave;
  if mid is not null then
    ja := true;
  else
    if a.encerrada_em is not null then raise exception 'essa aplicacao ja foi encerrada' using errcode = '22023'; end if;
    if p_tipo = 'saldo_conferido' then
      -- compara com o saldo calculado antes do rendimento do proprio dia (e o que o app do banco mostra durante o dia)
      g := produto._guardado_app(p_app, dt);
      saldo := (g->>'saldo')::numeric - (g->>'rendeu_hoje_bruto')::numeric;
      dif := round(p_valor, 2) - saldo;
    else
      saldo := (produto._guardado_app(p_app, p_hoje)->>'saldo')::numeric;
      if p_tipo = 'resgate' and round(p_valor, 2) > saldo then
        raise exception 'so tem % nessa aplicacao', produto._brl(saldo) using errcode = '22023';
      end if;
    end if;
    insert into produto.pat_movimentos (familia_id, aplicacao_id, data, tipo, valor, chave, autor)
    values (a.familia_id, p_app, dt, p_tipo, round(p_valor, 2), p_chave, (select auth.uid())) returning id into mid;
  end if;
  return produto._guardado(a.familia_id, p_hoje) || jsonb_strip_nulls(jsonb_build_object('aplicacao_id', p_app, 'movimento_id', mid, 'repetido', ja, 'diferenca', dif));
end $function$
;

-- produto._hoje()
CREATE OR REPLACE FUNCTION produto._hoje()
 RETURNS date
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select (now() at time zone 'America/Recife')::date $function$
;

-- produto._iof_pct(dias integer)
CREATE OR REPLACE FUNCTION produto._iof_pct(dias integer)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case when dias >= 30 then 0 else (array[96,93,90,86,83,80,76,73,70,66,63,60,56,53,50,46,43,40,36,33,30,26,23,20,16,13,10,6,3,0])[greatest(dias, 1)]::numeric end
$function$
;

-- produto._lancar(familia uuid, envelope uuid, valor numeric, data date, descricao text, cartao uuid, segundos numeric, chave uuid)
CREATE OR REPLACE FUNCTION produto._lancar(familia uuid, envelope uuid, valor numeric, data date, descricao text, cartao uuid, segundos numeric, chave uuid)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare v_id uuid; v_dup uuid; v_data date := coalesce(_lancar.data, produto._hoje()); v_valor numeric := round(_lancar.valor, 2);
        v_desc text := nullif(left(trim(_lancar.descricao), 300), ''); v_papel text;
begin
  if (select auth.uid()) is null then raise exception 'precisa entrar no app antes de lancar' using errcode = '42501'; end if;
  if v_valor is null or v_valor <= 0 then raise exception 'o valor tem que ser maior que zero' using errcode = '22023'; end if;
  if v_valor > 1000000 then raise exception 'o valor passou de 1 milhao; confira os numeros' using errcode = '22023'; end if;
  if v_data < date '2000-01-01' or v_data > date '2100-12-31' then raise exception 'a data esta fora do calendario do app' using errcode = '22023'; end if;
  v_papel := produto.meu_papel(_lancar.familia);
  if _lancar.chave is not null then
    -- chave do toque: a mesma chave nunca grava 2 vezes, nem depois de 10 s, nem com a internet caindo no meio
    perform pg_advisory_xact_lock(hashtextextended('lancar:' || _lancar.familia::text || ':' || _lancar.chave::text, 0));
    select l.id into v_dup from produto.lancamentos l where l.familia_id = _lancar.familia and l.chave_cliente = _lancar.chave limit 1;
  else
    perform pg_advisory_xact_lock(hashtextextended('lancar:' || (select auth.uid())::text || ':' || coalesce(_lancar.envelope::text, ''), 0));
    select l.id into v_dup from produto.lancamentos l
     where l.familia_id = _lancar.familia and l.envelope_id = _lancar.envelope and l.valor = v_valor and l.data = v_data
       and l.descricao is not distinct from v_desc and l.cartao_id is not distinct from _lancar.cartao
       and l.autor = (select auth.uid()) and l.apagado_em is null and l.criado_em > now() - interval '10 seconds'
     limit 1;
  end if;
  if v_dup is null then
    v_id := gen_random_uuid();
    begin
      insert into produto.lancamentos (id, familia_id, envelope_id, cartao_id, valor, data, descricao, chave_cliente)
      values (v_id, _lancar.familia, _lancar.envelope, _lancar.cartao, v_valor, v_data, v_desc, _lancar.chave);
    exception when unique_violation then
      raise exception 'esse lancamento ja foi gravado (mesma chave)' using errcode = '23505';
    end;
    insert into produto.eventos (familia_id, tipo, segundos)
    values (_lancar.familia, 'lancamento', case when _lancar.segundos between 0 and 600 then round(_lancar.segundos, 1) end);
  else
    v_id := v_dup;
  end if;
  return json_build_object(
    'lancamento', case when v_papel = 'equipe'
       then (select json_build_object('id', l.id, 'envelope_id', l.envelope_id, 'data', l.data, 'descricao', l.descricao, 'criado_em', l.criado_em) from produto.lancamentos l where l.id = v_id)
       else (select to_json(l) from produto.lancamentos l where l.id = v_id) end,
    'repetido', v_dup is not null,
    'resumo', produto._resumo(_lancar.familia, produto._hoje()));
end $function$
;

-- produto._lembrete_mexer(p_id uuid, p_acao text, p_ate timestamp with time zone, p_agora timestamp with time zone)
CREATE OR REPLACE FUNCTION produto._lembrete_mexer(p_id uuid, p_acao text, p_ate timestamp with time zone, p_agora timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
end $function$
;

-- produto._lembretes_json(p_familia uuid)
CREATE OR REPLACE FUNCTION produto._lembretes_json(p_familia uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'titulo', l.titulo, 'detalhe', l.detalhe, 'quando', l.quando, 'repetir', l.repetir, 'para', l.para, 'feito_em', l.feito_em,
           'linha', l.titulo || ' · ' || to_char(l.quando at time zone 'America/Recife', 'DD/MM "às" HH24:MI')
                    || case l.repetir when 'dia' then ' · todo dia' when 'semana' then ' · toda semana' when 'mes' then ' · todo mês' when 'ano' then ' · todo ano' else '' end)
           order by l.quando), '[]'::jsonb)
    from produto.esc_lembretes l where l.familia_id = p_familia and l.ativo and l.feito_em is null
$function$
;

-- produto._lim(p_env uuid, p_mes date)
CREATE OR REPLACE FUNCTION produto._lim(p_env uuid, p_mes date)
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select coalesce(
     (select l.valor from produto.limites_mes l where l.envelope_id = p_env and l.mes <= to_char(p_mes,'YYYY-MM') order by l.mes desc limit 1),
     (select l.valor from produto.limites_mes l where l.envelope_id = p_env order by l.mes asc limit 1),
     (select e.limite_mes from produto.envelopes e where e.id = p_env), 0) $function$
;

-- produto._mes_fatura(p_fecha integer, p_vence integer, d date)
CREATE OR REPLACE FUNCTION produto._mes_fatura(p_fecha integer, p_vence integer, d date)
 RETURNS date
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$ select (date_trunc('month', d)
          + (case when extract(day from d) < least(p_fecha, extract(day from date_trunc('month',d) + interval '1 month' - interval '1 day')) then 0 else 1 end) * interval '1 month'
          + (case when p_vence > p_fecha then 0 else 1 end) * interval '1 month')::date $function$
;

-- produto._numeros(p_agora timestamp with time zone)
CREATE OR REPLACE FUNCTION produto._numeros(p_agora timestamp with time zone)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with fam as (
  select f.id, f.criado_em from produto.familias f where not f.exemplo),
ev as (
  select e.familia_id, e.criado_em, e.segundos from produto.eventos e join fam on fam.id = e.familia_id where e.tipo = 'lancamento'),
at as (
  select count(*) filter (where (select count(*) from ev where ev.familia_id = fam.id and ev.criado_em < fam.criado_em + interval '7 days') >= 10) num,
         count(*) den
  from fam where fam.criado_em <= p_agora - interval '7 days'),
rt as (
  select count(*) filter (where exists (select 1 from produto.eventos e where e.familia_id = fam.id
           and e.criado_em >= fam.criado_em + interval '30 days' and e.criado_em < fam.criado_em + interval '37 days')) num,
         count(*) den
  from fam where fam.criado_em <= p_agora - interval '37 days'),
tm as (
  select round(avg(ev.segundos), 1) media, count(ev.segundos) n from ev where ev.criado_em > p_agora - interval '7 days'),
er as (
  select count(*) filter (where not r.ok and r.teste in ('teste_conta','teste_contas_casos')) conta,
         count(*) filter (where not r.ok and r.teste = 'teste_vazamento') vazamento,
         max(r.rodado_em) filter (where r.teste = 'turno') ultimo
  from produto.teste_resultados r where r.rodado_em > p_agora - interval '7 days')
select jsonb_build_object(
  'semana_ate', p_agora,
  'ativacao', jsonb_build_object('valor', case when at.den > 0 then round(100.0 * at.num / at.den) end, 'unidade', '%', 'meta', 80,
      'familias_ativadas', at.num, 'familias_com_7_dias', at.den,
      'explicacao', 'Família que lançou 10 gastos na 1ª semana ÷ famílias com pelo menos 7 dias'),
  'retencao_30', jsonb_build_object('valor', case when rt.den > 0 then round(100.0 * rt.num / rt.den) end, 'unidade', '%', 'meta', 60,
      'familias_usando', rt.num, 'familias_com_37_dias', rt.den,
      'explicacao', 'Família com algum uso entre o dia 30 e o dia 36 ÷ famílias com pelo menos 37 dias'),
  'tempo_medio', jsonb_build_object('valor', tm.media, 'unidade', 'segundos', 'meta', 10, 'lancamentos_medidos', tm.n,
      'explicacao', 'Média do tempo do toque no + até salvar, nos lançamentos dos últimos 7 dias'),
  'erros_conta', jsonb_build_object('valor', er.conta, 'meta', 0, 'vazamento', er.vazamento,
      'ultimo_teste_noturno', er.ultimo,
      'turno_atrasado', er.ultimo is null or er.ultimo < p_agora - interval '26 hours',
      'explicacao', 'Casos do teste noturno de conta que falharam nos últimos 7 dias'))
from at, rt, tm, er
$function$
;

-- produto._peso(p_peso_fds numeric, d date)
CREATE OR REPLACE FUNCTION produto._peso(p_peso_fds numeric, d date)
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select case when extract(isodow from d) in (6,7) or to_char(d,'MM-DD') in ('12-24','12-31')
            or exists (select 1 from produto.feriados f where f.data = d)
       then greatest(coalesce(p_peso_fds,1.5),1) else 1 end $function$
;

-- produto._plano(p_env uuid, p_mes date, p_liq numeric, p_ini date, p_hoje date, OUT pote_dias numeric, OUT w_total numeric, OUT fora numeric, OUT valor_dia numeric, OUT valor_dia_plano numeric, OUT gasto_hoje numeric, OUT saldo_hoje numeric, OUT gasto_mes numeric)
CREATE OR REPLACE FUNCTION produto._plano(p_env uuid, p_mes date, p_liq numeric, p_ini date, p_hoje date, OUT pote_dias numeric, OUT w_total numeric, OUT fora numeric, OUT valor_dia numeric, OUT valor_dia_plano numeric, OUT gasto_hoje numeric, OUT saldo_hoje numeric, OUT gasto_mes numeric)
 RETURNS record
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare e record; fim date; n int; i int; d date; pesos numeric[]; gastos numeric[]; antes numeric := 0; saldo numeric; pode numeric; wrem numeric; g numeric;
begin
  select en.peso_fds, en.colchao into e from produto.envelopes en where en.id = p_env;
  fim := (date_trunc('month', p_mes) + interval '1 month' - interval '1 day')::date;
  n := extract(day from fim)::int;
  pote_dias := greatest(0, p_liq - coalesce(e.colchao,0));
  select array_agg(produto._peso(e.peso_fds, dd::date) order by dd),
         array_agg(coalesce((select sum(l.valor) from produto.lancamentos l where l.envelope_id = p_env and l.apagado_em is null and l.data = dd::date),0) order by dd)
    into pesos, gastos from generate_series(date_trunc('month', p_mes), fim, interval '1 day') dd;
  select sum(x) into w_total from unnest(pesos) x;
  fora := 0; gasto_mes := 0; valor_dia := 0; valor_dia_plano := 0; gasto_hoje := 0;
  for i in 1..n loop
    d := (date_trunc('month', p_mes) + (i-1) * interval '1 day')::date;
    select sum(x) into wrem from unnest(pesos[i:n]) x;
    saldo := pote_dias - antes;
    pode := case when saldo <= 0 then 0 else saldo * pesos[i] / wrem end;
    g := case when d < p_ini then 0 else gastos[i] end;
    gasto_mes := gasto_mes + g;
    if d = p_hoje then valor_dia := round(pode,2); valor_dia_plano := round(pote_dias * pesos[i] / w_total, 2); gasto_hoje := g; saldo_hoje := round(saldo,2); end if;
    if d < p_ini then antes := antes + pode; fora := fora + pode;
    elsif d < p_hoje then antes := antes + g;
    elsif d = p_hoje then antes := antes + greatest(g, pode);
    else antes := antes + pode; end if;
  end loop;
  fora := round(fora, 2);
end $function$
;

-- produto._pote_inicio(p_env uuid, p_mes date)
CREATE OR REPLACE FUNCTION produto._pote_inicio(p_env uuid, p_mes date)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare ini date; s0 date; x date; lx numeric; tx numeric; t numeric := 0; s date;
begin
  select min(l.data) into ini from produto.lancamentos l where l.envelope_id = p_env and l.apagado_em is null;
  if ini is null then return 0; end if;
  s0 := ini - (extract(isodow from ini)::int - 1);
  x := date_trunc('month', s0)::date;
  while x < date_trunc('month', p_mes)::date loop
    if x = date_trunc('month', s0)::date or exists (select 1 from produto.lancamentos l where l.envelope_id = p_env and l.apagado_em is null and date_trunc('month', l.data) = x) then
      lx := produto._lim(p_env, x); tx := round(lx * 12 / 52, 2); t := t + lx;
      for s in select * from produto._segundas(x) loop
        t := t - case when s < s0 then tx else produto._gasto(p_env, s, s + 6) end;
      end loop;
    end if;
    x := (x + interval '1 month')::date;
  end loop;
  return round(t, 2);
end $function$
;

-- produto._resumo(p_familia uuid, p_hoje date)
CREATE OR REPLACE FUNCTION produto._resumo(p_familia uuid, p_hoje date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
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
    if papel = 'equipe' then
      return jsonb_build_object('familia_id', p_familia, 'data', p_hoje, 'papel', 'equipe', 'so_nomes', true, 'dias_restantes', dias,
        'envelopes', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'nome', x.nome, 'regra', x.regra, 'casa', true) order by x.criado_em, x.nome)
                                 from produto._envelopes_da_casa(p_familia) x), '[]'::jsonb),
        'explicacao', '[]'::jsonb);
    end if;
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
        expl := expl || jsonb_build_object('linha', e.nome || ': ' || produto._brl((dj->>'pote_dias')::numeric) || ' pros dias (limite − ' || produto._brl(e.colchao) || ' de reserva' ||
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
                     || jsonb_build_object('linha', e.nome || ': ' || produto._brl(greatest(0, livre - e.colchao)) || ' (livre menos a reserva) ÷ ' || dias || ' dias que faltam', 'valor', hoje_v);
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
            jsonb_build_object('linha', 'Reserva = o dinheiro que vocês combinaram nunca gastar. Não entra no valor do dia; se o mês apertar, ela cobre até zerar e nunca fica negativa', 'valor', round(tot_col,2)))
       || expl;
  return jsonb_build_object('familia_id', p_familia, 'data', p_hoje, 'papel', coalesce(papel,'sistema'),
    'pode_gastar_hoje', round(tot_hoje,2), 'livre_mes', round(tot_livre,2), 'colchao', round(tot_col,2),
    'dias_restantes', dias, 'envelopes', envs, 'explicacao', expl,
    'regra_cartao', 'Compra no cartão conta no dia da compra; o banco cobra na fatura (veja faturas)');
end $function$
;

-- produto._segunda(d date)
CREATE OR REPLACE FUNCTION produto._segunda(d date)
 RETURNS date
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$ select d - (extract(isodow from d)::int - 1) $function$
;

-- produto._segundas(p_mes date)
CREATE OR REPLACE FUNCTION produto._segundas(p_mes date)
 RETURNS SETOF date
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$ select d::date from generate_series(date_trunc('month',p_mes), date_trunc('month',p_mes) + interval '1 month' - interval '1 day', interval '1 day') d
   where extract(isodow from d) = 1 order by 1 $function$
;

-- produto._t(p text)
CREATE OR REPLACE FUNCTION produto._t(p text)
 RETURNS timestamp with time zone
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$ select p::timestamp at time zone 'America/Recife' $function$
;

-- produto._tem(p_txt text, VARIADIC p_pedacos text[])
CREATE OR REPLACE FUNCTION produto._tem(p_txt text, VARIADIC p_pedacos text[])
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case when p_txt is not null and (select bool_and(position(x in p_txt) > 0) from unnest(p_pedacos) x) then 'sim' else coalesce(p_txt, '(nada)') end
$function$
;

-- produto._tentativa(p_uid text, p_role text, p_sql text, p_modo text)
CREATE OR REPLACE FUNCTION produto._tentativa(p_uid text, p_role text, p_sql text, p_modo text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare n bigint; resultado text;
begin
  begin
    perform set_config('request.jwt.claims',
      case when p_uid is null then json_build_object('role', p_role)::text
           else json_build_object('sub', p_uid, 'role', p_role)::text end, true);
    execute format('set local role %I', p_role);
    if p_modo = 'contar' then
      execute p_sql into n;
    else
      execute p_sql; get diagnostics n = row_count;
    end if;
    resultado := n::text;
    raise exception using errcode = 'P0001', message = 'desfazer';
  exception
    when sqlstate 'P0001' then null;
    when insufficient_privilege then resultado := 'bloqueado';
    when foreign_key_violation then resultado := 'bloqueado';
    when check_violation then resultado := 'bloqueado';
    when others then resultado := 'erro: ' || sqlerrm;
  end;
  return resultado;
end $function$
;

-- produto._tentativa_jwt(p_claims jsonb, p_role text, p_sql text, p_modo text)
CREATE OR REPLACE FUNCTION produto._tentativa_jwt(p_claims jsonb, p_role text, p_sql text, p_modo text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare n bigint; resultado text;
begin
  begin
    perform set_config('request.jwt.claims', p_claims::text, true);
    execute format('set local role %I', p_role);
    if p_modo = 'contar' then execute p_sql into n; else execute p_sql; get diagnostics n = row_count; end if;
    resultado := n::text;
    raise exception using errcode = 'P0001', message = 'desfazer';
  exception
    when sqlstate 'P0001' then null;
    when insufficient_privilege then resultado := 'bloqueado';
    when foreign_key_violation then resultado := 'bloqueado';
    when check_violation then resultado := 'bloqueado';
    when others then resultado := 'erro: ' || sqlerrm;
  end;
  return resultado;
end $function$
;

-- produto._teste_revisao()
CREATE OR REPLACE FUNCTION produto._teste_revisao()
 RETURNS TABLE(caso text, esperado text, obtido text, ok boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  ana constant text := 'a0000000-0000-4e0e-8000-0000000000a1';
  carla constant text := 'a0000000-0000-4e0e-8000-0000000000c1';
  paulo constant text := 'a0000000-0000-4e0e-8000-0000000000f2';
  estranho constant text := 'a0000000-0000-4e0e-8000-0000000000ff';
  e2 constant text := 'a0000000-0000-4e0e-8000-0000000000fe';
  e3 constant text := 'a0000000-0000-4e0e-8000-0000000000fd';
  e4 constant text := 'a0000000-0000-4e0e-8000-0000000000fc';
  silva constant text := 'f0000000-0000-4e0e-8000-000000000001';
  t2 constant text := 'f0000000-0000-4e0e-8000-000000000002';
  env_casal constant text := 'e0000000-0000-4e0e-8000-000000000013';
  env_casa constant text := 'e0000000-0000-4e0e-8000-000000000011';
  c record; j json; v_conv uuid; v_cod text; v_err text; i int;
  r_queimado text := 'nao rodou'; r_novo text := 'nao rodou'; r_antigo text := 'nao rodou'; r_convite_errado text := 'nao rodou'; r_busca text := 'nao rodou';
  r_ia1 text := 'nao rodou'; r_ia2 text := 'nao rodou'; r_ia3 text := 'nao rodou'; r_ia4 text := 'nao rodou';
  r_c1 text := 'nao rodou'; r_c2 text := 'nao rodou'; r_c3 text := 'nao rodou'; r_c4 text := 'nao rodou'; r_c5 text := 'nao rodou';
  u_id uuid; u_email text; g numeric; v_res json;
begin
  -- 1) escrita direta na tabela (pela API, sem passar pelas funcoes)
  for c in select * from (values
    ('Casal grava gasto negativo direto na tabela', ana, format('insert into produto.lancamentos (familia_id, envelope_id, valor) values (%L, %L, -50)', silva, env_casal), 'linhas', 'bloqueado'),
    ('Casal grava gasto NaN (quebra a soma)', ana, format('insert into produto.lancamentos (familia_id, envelope_id, valor) values (%L, %L, ''NaN'')', silva, env_casal), 'linhas', 'bloqueado'),
    ('Casal grava gasto de 2 milhoes', ana, format('insert into produto.lancamentos (familia_id, envelope_id, valor) values (%L, %L, 2000000)', silva, env_casal), 'linhas', 'bloqueado'),
    ('Casal grava gasto no ano 9999', ana, format('insert into produto.lancamentos (familia_id, envelope_id, valor, data) values (%L, %L, 10, ''9999-01-01'')', silva, env_casal), 'linhas', 'bloqueado'),
    ('Equipe grava gasto negativo na Casa', carla, format('insert into produto.lancamentos (familia_id, envelope_id, valor) values (%L, %L, -50)', silva, env_casa), 'linhas', 'bloqueado'),
    ('Casal forja a hora de criacao do gasto', ana, format('insert into produto.lancamentos (familia_id, envelope_id, valor, criado_em) values (%L, %L, 10, ''2020-01-01'')', silva, env_casal), 'linhas', 'bloqueado'),
    ('Casal muda gasto antigo pra valor negativo', ana, format('update produto.lancamentos set valor = -1 where familia_id = %L', silva), 'linhas', 'bloqueado'),
    ('Casal poe outra pessoa na familia pelo user_id', ana, format('insert into produto.membros (familia_id, user_id, papel, nome) values (%L, %L, %L, %L)', silva, estranho, 'pessoa', 'Vitima'), 'linhas', 'bloqueado'),
    ('Casal cria codigo da equipe direto, valendo 10 anos', ana, format('insert into produto.acesso_equipe (familia_id, membro_id, codigo_hash, expira_em) select m.familia_id, m.id, ''x'', now() + interval ''10 years'' from produto.membros m where m.familia_id = %L limit 1', silva), 'linhas', 'bloqueado'),
    ('Casal estica a validade de um codigo', ana, 'update produto.acesso_equipe set expira_em = now() + interval ''10 years''', 'linhas', 'bloqueado'),
    ('Unico casal se rebaixa e a familia fica sem dono', paulo, format('update produto.membros set papel = ''pessoa'' where user_id = %L', paulo), 'linhas', 'bloqueado'),
    ('Unico casal se desliga e a familia fica sem dono', paulo, format('update produto.membros set ativo = false where user_id = %L', paulo), 'linhas', 'bloqueado'),
    ('Equipe grava evento com texto gigante', carla, format('insert into produto.eventos (familia_id, tipo) values (%L, repeat(''x'', 5000))', silva), 'linhas', 'bloqueado'),
    ('Equipe forja a hora de um evento', carla, format('insert into produto.eventos (familia_id, tipo, criado_em) values (%L, ''abrir'', ''2020-01-01'')', silva), 'linhas', 'bloqueado'),
    ('Casal grava config gigante (400 mil letras)', ana, format('insert into produto.config_familia (familia_id, chave, valor) values (%L, ''rev_teste'', to_jsonb(repeat(''a'', 400000)))', silva), 'linhas', 'bloqueado'),
    ('lancar() com 2 milhoes', ana, format('select 1 from produto.lancar(%L, %L, 2000000)', silva, env_casal), 'contar', 'erro: o valor passou de 1 milhao; confira os numeros'),
    ('lancar() com data no ano 9999', ana, format('select 1 from produto.lancar(%L, %L, 10, ''9999-01-01'')', silva, env_casal), 'contar', 'erro: a data esta fora do calendario do app'),
    ('lancar() com valor negativo', ana, format('select 1 from produto.lancar(%L, %L, -10)', silva, env_casal), 'contar', 'erro: o valor tem que ser maior que zero'),
    ('Logado chama a reserva da IA (so o servidor pode)', ana, format('select 1 from produto.ia_reservar(%L, %L, ''x'', ''x'', 0.007, 2.49, 150)', silva, ana), 'contar', 'bloqueado'),
    ('Logado chama o miolo da entrada da equipe', estranho, 'select 1 from produto._equipe_entrar(''1234'', null)', 'contar', 'bloqueado'),
    ('anon chama entrar_equipe_convite', null, 'select 1 from produto.entrar_equipe_convite(gen_random_uuid(), ''1234'')', 'contar', 'bloqueado'),
    ('CONTROLE 1 dos 2 casais vira pessoa (o outro continua)', ana, format('update produto.membros set papel = ''pessoa'' where user_id = %L', ana), 'linhas', '1'),
    ('CONTROLE os dados baixados trazem o uso da IA', ana, format('select case when produto.exportar_familia(%L)::jsonb ? ''uso_da_ia'' then 1 else 0 end', silva), 'contar', '1'),
    ('CONTROLE lancar() normal continua valendo', ana, format('select case when (produto.lancar(%L, %L, 12.34, null, ''rev'')->>''repetido'')::boolean then 0 else 1 end', silva, env_casal), 'contar', '1')
  ) as v(nome, uid, sql, modo, esp) loop
    caso := c.nome; esperado := c.esp;
    obtido := produto._tentativa(c.uid, case when c.uid is null then 'anon' else 'authenticated' end, c.sql, c.modo);
    ok := obtido = esperado; return next;
  end loop;

  -- 2) entrada da equipe: convite queimado com 5 erros, convite novo, entrada antiga, convite de outro
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
    set local role authenticated;
    j := produto.convidar(silva::uuid, 'equipe', 'Teste Revisao 1');
    v_conv := (j->>'convite')::uuid; v_cod := j->>'codigo_4_digitos';
    v_err := lpad((((v_cod)::int + 1) % 10000)::text, 4, '0');
    perform set_config('request.jwt.claims', json_build_object('sub', estranho, 'role', 'authenticated')::text, true);
    for i in 1..5 loop v_res := produto.entrar_equipe_convite(v_conv, v_err); end loop;
    perform set_config('request.jwt.claims', json_build_object('sub', e2, 'role', 'authenticated')::text, true);
    r_queimado := coalesce(produto.entrar_equipe_convite(v_conv, v_cod)->>'ok', 'nulo');
    -- convite novo, codigo certo, mas com o convite de outra pessoa
    perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
    j := produto.convidar(silva::uuid, 'equipe', 'Teste Revisao 2');
    v_conv := (j->>'convite')::uuid; v_cod := j->>'codigo_4_digitos';
    perform set_config('request.jwt.claims', json_build_object('sub', e2, 'role', 'authenticated')::text, true);
    r_convite_errado := coalesce(produto.entrar_equipe_convite(gen_random_uuid(), v_cod)->>'ok', 'nulo');
    r_novo := coalesce(produto.entrar_equipe_convite(v_conv, v_cod)->>'ok', 'nulo');
    -- entrada antiga (so os 4 numeros) continua funcionando
    perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
    j := produto.convidar(silva::uuid, 'equipe', 'Teste Revisao 3');
    v_cod := j->>'codigo_4_digitos';
    select case when count(*) = 1 then 'true' else 'false' end into r_busca from produto.acesso_equipe ae where ae.id = (j->>'convite')::uuid and ae.codigo_busca is not null;
    perform set_config('request.jwt.claims', json_build_object('sub', e3, 'role', 'authenticated')::text, true);
    v_res := produto.entrar_equipe(v_cod);
    r_antigo := case when (v_res->>'ok')::boolean or (v_res->>'motivo') like 'Entrada da equipe pausada%' then 'true' else 'false' end;
    raise exception using errcode = 'P0001', message = 'desfazer';
  exception
    when sqlstate 'P0001' then null;
    when others then r_queimado := 'erro: ' || sqlerrm;
  end;
  caso := 'Convite da equipe com 5 codigos errados morre (o codigo certo nao entra mais)'; esperado := 'false'; obtido := r_queimado; ok := obtido = esperado; return next;
  caso := 'Codigo certo com o convite de outro nao entra'; esperado := 'false'; obtido := r_convite_errado; ok := obtido = esperado; return next;
  caso := 'CONTROLE equipe entra com convite + codigo certo'; esperado := 'true'; obtido := r_novo; ok := obtido = esperado; return next;
  caso := 'CONTROLE entrada antiga (so os 4 numeros) continua'; esperado := 'true'; obtido := r_antigo; ok := obtido = esperado; return next;
  caso := 'CONTROLE codigo novo nasce com a busca que impede 2 iguais abertos'; esperado := 'true'; obtido := r_busca; ok := obtido = esperado; return next;

  -- 3) convite por e-mail: so entra com e-mail provado
  select u.id, lower(u.email) into u_id, u_email from auth.users u
   where u.email is not null and u.email_confirmed_at is not null and not coalesce(u.is_anonymous, false)
     and not exists (select 1 from produto.membros m where m.familia_id = t2::uuid and (m.user_id = u.id or m.email = lower(u.email)))
   order by u.created_at limit 1;
  begin
    insert into produto.membros (familia_id, papel, nome, email) values (t2::uuid, 'pessoa', 'Convite Revisao', 'convite.revisao@exemplo.test');
    if u_id is not null then
      insert into produto.membros (familia_id, papel, nome, email) values (t2::uuid, 'pessoa', 'Convite Revisao 2', u_email);
    end if;
    r_c1 := produto._tentativa_jwt(jsonb_build_object('sub', estranho, 'role', 'authenticated', 'email', 'convite.revisao@exemplo.test', 'amr', jsonb_build_array(jsonb_build_object('method', 'otp'))),
              'authenticated', 'select json_array_length(produto.entrar_por_convite()->''familias'')', 'contar');
    r_c2 := produto._tentativa_jwt(jsonb_build_object('sub', estranho, 'role', 'authenticated', 'email', 'convite.revisao@exemplo.test', 'is_anonymous', true),
              'authenticated', 'select json_array_length(produto.entrar_por_convite()->''familias'')', 'contar');
    r_c5 := produto._tentativa(paulo, 'authenticated', format('select 1 from produto.convidar(%L, ''pessoa'', ''Repetido'', ''Convite.Revisao@exemplo.test'')', t2), 'contar');
    if u_id is not null then
      r_c3 := produto._tentativa_jwt(jsonb_build_object('sub', u_id, 'role', 'authenticated', 'email', u_email, 'amr', jsonb_build_array(jsonb_build_object('method', 'password'))),
                'authenticated', 'select json_array_length(produto.entrar_por_convite()->''familias'')', 'contar');
      r_c4 := produto._tentativa_jwt(jsonb_build_object('sub', u_id, 'role', 'authenticated', 'email', u_email, 'amr', jsonb_build_array(jsonb_build_object('method', 'otp'))),
                'authenticated', 'select json_array_length(produto.entrar_por_convite()->''familias'')', 'contar');
    else
      r_c3 := 'bloqueado'; r_c4 := '1';
    end if;
    raise exception using errcode = 'P0001', message = 'desfazer';
  exception
    when sqlstate 'P0001' then null;
    when others then r_c1 := 'erro: ' || sqlerrm;
  end;
  caso := 'Convite por e-mail: conta que nao existe ou sem e-mail confirmado nao entra'; esperado := 'bloqueado'; obtido := r_c1; ok := obtido = esperado; return next;
  caso := 'Convite por e-mail: login anonimo com e-mail no token nao entra'; esperado := 'bloqueado'; obtido := r_c2; ok := obtido = esperado; return next;
  caso := 'Convite por e-mail: sessao aberta com senha (sem codigo no e-mail) nao entra'; esperado := 'bloqueado'; obtido := r_c3; ok := obtido = esperado; return next;
  caso := 'CONTROLE convite por e-mail: quem entrou com o codigo do e-mail entra em 1 familia'; esperado := '1'; obtido := r_c4; ok := obtido = esperado; return next;
  caso := 'Convidar 2 vezes o mesmo e-mail na mesma familia'; esperado := 'erro: esse e-mail ja foi convidado nesta familia'; obtido := r_c5; ok := obtido = esperado; return next;

  -- 4) teto da IA: a reserva segura 2 chamadas juntas, equipe nao usa, e o custo real substitui a reserva
  begin
    g := produto.ia_gasto_mes(silva::uuid);
    r_ia1 := produto.ia_reservar(silva::uuid, carla::uuid, 'teste', 'teste', 0.007, g + 0.01, g + 1000)->>'motivo';
    v_res := produto.ia_reservar(silva::uuid, ana::uuid, 'teste', 'teste', 0.007, g + 0.01, g + 1000);
    r_ia2 := v_res->>'ok';
    r_ia3 := coalesce(produto.ia_reservar(silva::uuid, ana::uuid, 'teste', 'teste', 0.007, g + 0.01, g + 1000)->>'motivo', 'passou');
    perform produto.ia_fechar((v_res->>'id')::uuid, 100, 50, 0.0002);
    r_ia4 := (produto.ia_gasto_mes(silva::uuid) - g)::text;
    raise exception using errcode = 'P0001', message = 'desfazer';
  exception
    when sqlstate 'P0001' then null;
    when others then r_ia1 := 'erro: ' || sqlerrm;
  end;
  caso := 'Equipe tenta usar a IA da familia'; esperado := 'familia'; obtido := r_ia1; ok := obtido = esperado; return next;
  caso := 'CONTROLE casal reserva 1 leitura de cupom'; esperado := 'true'; obtido := r_ia2; ok := obtido = esperado; return next;
  caso := '2a chamada junta que passaria do teto da IA'; esperado := 'limite'; obtido := r_ia3; ok := obtido = esperado; return next;
  caso := 'CONTROLE o custo real substitui a reserva'; esperado := '0.0002'; obtido := r_ia4; ok := obtido = esperado; return next;
end $function$
;

-- produto._teste_revisao_2()
CREATE OR REPLACE FUNCTION produto._teste_revisao_2()
 RETURNS TABLE(caso text, esperado text, obtido text, ok boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  ana constant text := 'a0000000-0000-4e0e-8000-0000000000a1';
  carla constant text := 'a0000000-0000-4e0e-8000-0000000000c1';
  silva constant text := 'f0000000-0000-4e0e-8000-000000000001';
  t2 constant text := 'f0000000-0000-4e0e-8000-000000000002';
  env_casal constant text := 'e0000000-0000-4e0e-8000-000000000013';
  env_casa constant text := 'e0000000-0000-4e0e-8000-000000000011';
  dinheiro constant text := '"([a-z_]*(valor|preco|custo|salario|total|limite|gasto)[a-z_]*|pode_gastar_hoje|livre_mes|livre|colchao|hoje|no_cartao|teto_semana)"\s*:';
  c record; j json; k uuid; hoje date := produto._hoje(); passado date;
  antes numeric; r_ch1 text := 'nao rodou'; r_ch2 text := 'nao rodou'; r_ch3 text := 'nao rodou';
  r_l1 text := 'nao rodou'; r_l2 text := 'nao rodou'; r_l3 text := 'nao rodou';
begin
  passado := (date_trunc('month', hoje) - interval '1 day')::date;
  for c in select * from (values
    ('Equipe: resumo_hoje traz chave ou numero de dinheiro', carla, format('select case when produto.resumo_hoje(%L)::text ~* %L or produto.resumo_hoje(%L)::text ~ ''[0-9]\.[0-9]{2}'' then 1 else 0 end', silva, dinheiro, silva), 'contar', '0'),
    ('Equipe: o miolo _resumo chamado direto traz dinheiro', carla, format('select case when produto._resumo(%L, current_date)::text ~* %L then 1 else 0 end', silva, dinheiro), 'contar', '0'),
    ('Equipe: resposta do lancar traz valor', carla, format('select case when produto.lancar(%L, %L, 10)::text ~* %L then 1 else 0 end', silva, env_casa, dinheiro), 'contar', '0'),
    ('Equipe le limite da Casa na tabela de limites', carla, 'select count(*) from produto.limites_mes', 'contar', '0'),
    ('Equipe le gasto da Casa lancado por outra pessoa', carla, format('select count(*) from produto.lancamentos where autor <> %L', carla), 'contar', '0'),
    ('Casal grava limite em mes fechado direto na tabela', ana, format('insert into produto.limites_mes (familia_id, envelope_id, mes, valor) values (%L, %L, ''2020-01'', 1)', silva, env_casal), 'linhas', 'bloqueado'),
    ('Equipe chama definir_limite', carla, format('select 1 from produto.definir_limite(%L, %L, 10)', silva, env_casa), 'contar', 'bloqueado'),
    ('Silva define limite num envelope da Teste 2', ana, format('select 1 from produto.definir_limite(%L, %L, 10)', t2, 'e0000000-0000-4e0e-8000-000000000022'), 'contar', 'bloqueado'),
    ('Silva usa definir_limite da Silva com envelope da Teste 2', ana, format('select 1 from produto.definir_limite(%L, %L, 10)', silva, 'e0000000-0000-4e0e-8000-000000000022'), 'contar', 'erro: envelope nao encontrado'),
    ('CONTROLE equipe ainda recebe o nome do envelope da Casa pra lancar', carla, format('select count(*) from json_array_elements(produto.resumo_hoje(%L)->''envelopes'') e where e->>''nome'' is not null', silva), 'contar', '1'),
    ('CONTROLE casal continua recebendo os valores no resumo', ana, format('select case when produto.resumo_hoje(%L)->>''pode_gastar_hoje'' is not null then 1 else 0 end', silva), 'contar', '1')
  ) as v(nome, uid, sql, modo, esp) loop
    caso := c.nome; esperado := c.esp;
    obtido := produto._tentativa(c.uid, 'authenticated', c.sql, c.modo);
    ok := obtido = esperado; return next;
  end loop;

  -- chave do toque
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
    set local role authenticated;
    k := gen_random_uuid();
    j := produto.lancar_com_chave(silva::uuid, env_casal::uuid, 10, k, null, 'chave a');
    r_ch1 := j->>'repetido';
    -- mesma chave de novo, ate com outro valor e outro texto (como se fosse 1 hora depois): nao grava
    j := produto.lancar_com_chave(silva::uuid, env_casal::uuid, 11, k, null, 'chave b');
    select (j->>'repetido') || '/' || count(*) into r_ch2 from produto.lancamentos l where l.chave_cliente = k;
    -- 2 compras iguais de verdade (2 toques, 2 chaves) gravam as 2
    j := produto.lancar_com_chave(silva::uuid, env_casal::uuid, 10, gen_random_uuid(), null, 'chave a');
    r_ch3 := j->>'repetido';
    raise exception using errcode = 'P0001', message = 'desfazer';
  exception
    when sqlstate 'P0001' then null;
    when others then r_ch1 := 'erro: ' || sqlerrm;
  end;
  caso := 'CONTROLE lancar com chave grava a 1a vez'; esperado := 'false'; obtido := r_ch1; ok := obtido = esperado; return next;
  caso := 'Mesma chave de novo (mesmo depois de 10 s) nao grava 2 vezes'; esperado := 'true/1'; obtido := r_ch2; ok := obtido = esperado; return next;
  caso := 'CONTROLE 2 compras iguais com chaves diferentes gravam as 2'; esperado := 'false'; obtido := r_ch3; ok := obtido = esperado; return next;

  -- limite: mes fechado nao muda
  begin
    insert into produto.lancamentos (familia_id, envelope_id, valor, data, autor) values (silva::uuid, env_casal::uuid, 5, (hoje - interval '3 months')::date, ana::uuid);
    antes := produto._lim(env_casal::uuid, passado);
    perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
    set local role authenticated;
    j := produto.definir_limite(silva::uuid, env_casal::uuid, 777.77);
    r_l1 := case when produto._lim(env_casal::uuid, passado) = antes then 'igual' else 'mudou' end;
    r_l2 := produto._lim(env_casal::uuid, hoje)::text || '/' || produto._lim(env_casal::uuid, (hoje + interval '2 months')::date)::text;
    raise exception using errcode = 'P0001', message = 'desfazer';
  exception
    when sqlstate 'P0001' then null;
    when others then r_l1 := 'erro: ' || sqlerrm;
  end;
  begin
    insert into produto.lancamentos (familia_id, envelope_id, valor, data, autor) values (silva::uuid, env_casal::uuid, 5, (hoje - interval '3 months')::date, ana::uuid);
    antes := produto._lim(env_casal::uuid, passado);
    perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
    set local role authenticated;
    -- caminho antigo do app, em 2 passos
    insert into produto.limites_mes (familia_id, envelope_id, mes, valor) values (silva::uuid, env_casal::uuid, to_char(hoje, 'YYYY-MM'), 888)
      on conflict (envelope_id, mes) do update set valor = excluded.valor;
    update produto.envelopes set limite_mes = 888 where id = env_casal::uuid;
    r_l3 := case when produto._lim(env_casal::uuid, passado) = antes then 'igual' else 'mudou' end || '/' || produto._lim(env_casal::uuid, hoje)::text;
    raise exception using errcode = 'P0001', message = 'desfazer';
  exception
    when sqlstate 'P0001' then null;
    when others then r_l3 := 'erro: ' || sqlerrm;
  end;
  caso := 'definir_limite nao muda o limite do mes passado (mes fechado)'; esperado := 'igual'; obtido := r_l1; ok := obtido = esperado; return next;
  caso := 'CONTROLE definir_limite vale deste mes em diante'; esperado := '777.77/777.77'; obtido := r_l2; ok := obtido = esperado; return next;
  caso := 'Caminho antigo em 2 passos tambem nao muda o mes fechado'; esperado := 'igual/888.00'; obtido := r_l3; ok := obtido = esperado; return next;
end $function$
;

-- produto._teste_vazamento_escritorio()
CREATE OR REPLACE FUNCTION produto._teste_vazamento_escritorio()
 RETURNS TABLE(caso text, esperado text, obtido text, ok boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  ana constant text := 'a0000000-0000-4e0e-8000-0000000000a1'; carla constant text := 'a0000000-0000-4e0e-8000-0000000000c1';
  davi constant text := 'a0000000-0000-4e0e-8000-0000000000d1'; paulo constant text := 'a0000000-0000-4e0e-8000-0000000000f2';
  estranho constant text := 'a0000000-0000-4e0e-8000-0000000000ff';
  silva constant text := 'f0000000-0000-4e0e-8000-000000000001'; t2 constant text := 'f0000000-0000-4e0e-8000-000000000002';
  t text; c record;
begin
  foreach t in array array['pat_aplicacoes','pat_movimentos','esc_lembretes','esc_diario','feiras','estoque_itens','estoque_contagens','cartao_custos','cartao_faturas'] loop
    caso := 'Teste 2 lê ' || t || ' da Silva'; esperado := '0'; obtido := produto._tentativa(paulo, 'authenticated', format('select count(*) from produto.%I', t), 'contar'); ok := obtido = esperado; return next;
    caso := 'Pessoa (filho) lê ' || t; esperado := '0'; obtido := produto._tentativa(davi, 'authenticated', format('select count(*) from produto.%I', t), 'contar'); ok := obtido = esperado; return next;
    caso := 'Logado sem família lê ' || t; esperado := '0'; obtido := produto._tentativa(estranho, 'authenticated', format('select count(*) from produto.%I', t), 'contar'); ok := obtido = esperado; return next;
    caso := 'anon lê ' || t; esperado := 'bloqueado'; obtido := produto._tentativa(null, 'anon', format('select count(*) from produto.%I', t), 'contar'); ok := obtido = esperado; return next;
    caso := 'Silva apaga linhas de ' || t || ' (ninguém apaga pelo app)'; esperado := 'bloqueado'; obtido := produto._tentativa(ana, 'authenticated', format('delete from produto.%I', t), 'linhas'); ok := obtido = esperado; return next;
    if t in ('pat_aplicacoes','pat_movimentos','esc_lembretes','cartao_custos','cartao_faturas') then
      caso := 'Equipe lê ' || t || ' (dinheiro)'; esperado := '0'; obtido := produto._tentativa(carla, 'authenticated', format('select count(*) from produto.%I', t), 'contar'); ok := obtido = esperado; return next;
    end if;
  end loop;
  for c in select * from (values
    ('Silva chama guardado_hoje da Teste 2', ana, format('select 1 from produto.guardado_hoje(%L)', t2), 'contar', 'bloqueado'),
    ('Silva cria aplicação na Teste 2', ana, format('select 1 from produto.guardado_criar(%L, ''x'', ''y'', ''cdb'', 100, 10)', t2), 'contar', 'bloqueado'),
    ('Silva pergunta o custo do gasto da Teste 2', ana, format('select 1 from produto.guardado_custo_do_gasto(%L, 100)', t2), 'contar', 'bloqueado'),
    ('Teste 2 movimenta aplicação da Silva', paulo, 'select 1 from produto.guardado_movimentar(''aa000000-0000-4e0e-8000-000000000001'', ''resgate'', 10, null, gen_random_uuid())', 'contar', 'bloqueado'),
    ('Teste 2 encerra aplicação da Silva', paulo, 'select 1 from produto.guardado_encerrar(''aa000000-0000-4e0e-8000-000000000001'')', 'contar', 'bloqueado'),
    ('Silva grava movimento direto na Teste 2', ana, format('insert into produto.pat_movimentos (familia_id, aplicacao_id, tipo, valor, chave, autor) values (%L, ''aa000000-0000-4e0e-8000-000000000001'', ''aporte'', 10, gen_random_uuid(), %L)', t2, ana), 'linhas', 'bloqueado'),
    ('Silva chama escritorio_hoje da Teste 2', ana, format('select 1 from produto.escritorio_hoje(%L)', t2), 'contar', 'bloqueado'),
    ('Silva responde pergunta da Teste 2', ana, format('select 1 from produto.escritorio_responder(%L, ''x'', ''y'')', t2), 'contar', 'bloqueado'),
    ('Silva pede relatório da Teste 2', ana, format('select 1 from produto.escritorio_relatorio(%L)', t2), 'contar', 'bloqueado'),
    ('Silva pede diário da Teste 2', ana, format('select 1 from produto.escritorio_diario(%L)', t2), 'contar', 'bloqueado'),
    ('Silva cria lembrete na Teste 2', ana, format('select 1 from produto.lembrete_criar(%L, ''x'', now())', t2), 'contar', 'bloqueado'),
    ('Teste 2 conclui lembrete da Silva', paulo, 'select 1 from produto.lembrete_concluir(''ac000000-0000-4e0e-8000-000000000001'')', 'contar', 'bloqueado'),
    ('Teste 2 apaga lembrete da Silva', paulo, 'select 1 from produto.lembrete_apagar(''ac000000-0000-4e0e-8000-000000000001'')', 'contar', 'bloqueado'),
    ('Silva salva cartão na Teste 2', ana, format('select 1 from produto.cartao_salvar(%L, ''x'')', t2), 'contar', 'bloqueado'),
    ('Silva informa fatura na Teste 2', ana, format('select 1 from produto.fatura_informar(%L, ''c0000000-0000-4e0e-8000-000000000021'', ''2026-11'', 10)', t2), 'contar', 'bloqueado'),
    ('Silva registra feira na Teste 2', ana, format('select 1 from produto.feira_registrar(%L)', t2), 'contar', 'bloqueado'),
    ('Teste 2 anexa nota em feira da Silva', paulo, format('select 1 from produto.feira_anexar_nota(''ae000000-0000-4e0e-8000-000000000001'', %L)', silva || '/x.jpg'), 'contar', 'bloqueado'),
    ('Teste 2 marca "sem nota" em feira da Silva', paulo, 'select 1 from produto.feira_sem_nota(''ae000000-0000-4e0e-8000-000000000001'', ''x'')', 'contar', 'bloqueado'),
    ('Silva conta estoque da Teste 2', ana, format('select 1 from produto.estoque_contar(%L, ''[{"item_id":"af000000-0000-4e0e-8000-000000000001","estado":"tem"}]'')', t2), 'contar', 'bloqueado'),
    ('Silva salva item de estoque na Teste 2', ana, format('select 1 from produto.estoque_item_salvar(%L, ''x'')', t2), 'contar', 'bloqueado'),
    ('Pessoa chama guardado_hoje', davi, format('select 1 from produto.guardado_hoje(%L)', silva), 'contar', 'bloqueado'),
    ('Pessoa chama escritorio_hoje: vem vazio', davi, format('select (produto.escritorio_hoje(%L)::jsonb->>''total_precisa'')::int + jsonb_array_length(produto.escritorio_hoje(%L)::jsonb->''funcionarios'')', silva, silva), 'contar', '0'),
    ('Pessoa responde ao escritório', davi, format('select 1 from produto.escritorio_responder(%L, ''x'', ''y'')', silva), 'contar', 'bloqueado'),
    ('Pessoa registra feira', davi, format('select 1 from produto.feira_registrar(%L)', silva), 'contar', 'bloqueado'),
    ('Pessoa vê o limite e a anuidade dos cartões', davi, 'select count(*) from produto.cartao_custos', 'contar', '0'),
    ('Equipe chama guardado_hoje', carla, format('select 1 from produto.guardado_hoje(%L)', silva), 'contar', 'bloqueado'),
    ('Equipe chama escritorio_hoje: nenhum R$, valor, limite, salário ou saldo', carla, format($q$select (produto.escritorio_hoje(%L)::text ~* 'R\$|"valor"|"limite"|salario|"saldo"|"total"|custo')::int$q$, silva), 'contar', '0'),
    ('Equipe: escritorio_hoje só traz os funcionários da Casa', carla, format($q$select count(*) from jsonb_array_elements(produto.escritorio_hoje(%L)::jsonb->'funcionarios') x where x->>'id' not in ('comprador', 'fiscal_feira')$q$, silva), 'contar', '0'),
    ('Equipe pede o diário: nenhum R$', carla, format($q$select (produto.escritorio_diario(%L)::text ~* 'R\$|"valor"')::int$q$, silva), 'contar', '0'),
    ('Equipe pede o relatório: nenhum R$', carla, format($q$select (produto.escritorio_relatorio(%L)::text ~* 'R\$|"valor"')::int$q$, silva), 'contar', '0'),
    ('Equipe cria lembrete', carla, format('select 1 from produto.lembrete_criar(%L, ''x'', now())', silva), 'contar', 'bloqueado'),
    ('Equipe salva cartão', carla, format('select 1 from produto.cartao_salvar(%L, ''x'')', silva), 'contar', 'bloqueado'),
    ('Equipe informa fatura', carla, format('select 1 from produto.fatura_informar(%L, ''c0000000-0000-4e0e-8000-000000000011'', ''2026-11'', 10)', silva), 'contar', 'bloqueado'),
    ('Equipe vê a feira sem o valor', carla, format($q$select (produto.feira_registrar(%L, '2026-11-09')::text ~* 'R\$|"valor"|lancamento')::int$q$, silva), 'contar', '0'),
    ('Equipe muda quem fez a feira', carla, 'update produto.feiras set feita_por = gen_random_uuid()', 'linhas', 'bloqueado'),
    ('Casal muda o texto de uma resposta do diário', ana, 'update produto.esc_diario set resposta = ''x''', 'linhas', 'bloqueado'),
    ('CONTROLE casal Silva vê as 2 aplicações e os 5 movimentos', ana, 'select (select count(*) from produto.pat_aplicacoes) * 10 + (select count(*) from produto.pat_movimentos)', 'contar', '25'),
    ('CONTROLE casal Silva vê os custos dos 2 cartões e 1 fatura informada', ana, 'select (select count(*) from produto.cartao_custos) * 10 + (select count(*) from produto.cartao_faturas)', 'contar', '21'),
    ('CONTROLE equipe vê 1 feira e os 7 itens da casa', carla, 'select (select count(*) from produto.feiras) * 10 + (select count(*) from produto.estoque_itens)', 'contar', '17'),
    ('CONTROLE casal Silva recebe perguntas do escritório', ana, format('select (jsonb_array_length(produto.escritorio_hoje(%L)::jsonb->''funcionarios'') = 8)::int', silva), 'contar', '1')
  ) as x(caso, uid, q, modo, esperado) loop
    caso := c.caso; esperado := c.esperado; obtido := produto._tentativa(c.uid, 'authenticated', c.q, c.modo); ok := obtido = esperado; return next;
  end loop;
  for c in select * from (values ('guardado_hoje'), ('escritorio_hoje'), ('escritorio_relatorio'), ('escritorio_diario')) as x(fn) loop
    caso := 'anon chama ' || c.fn; esperado := 'bloqueado'; obtido := produto._tentativa(null, 'anon', format('select 1 from produto.%I(%L)', c.fn, silva), 'contar'); ok := obtido = esperado; return next;
  end loop;
end $function$
;

-- produto._teste_vazamento_rpc()
CREATE OR REPLACE FUNCTION produto._teste_vazamento_rpc()
 RETURNS TABLE(caso text, esperado text, obtido text, ok boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  ana constant text := 'a0000000-0000-4e0e-8000-0000000000a1';
  carla constant text := 'a0000000-0000-4e0e-8000-0000000000c1';
  davi constant text := 'a0000000-0000-4e0e-8000-0000000000d1';
  paulo constant text := 'a0000000-0000-4e0e-8000-0000000000f2';
  estranho constant text := 'a0000000-0000-4e0e-8000-0000000000ff';
  silva constant text := 'f0000000-0000-4e0e-8000-000000000001';
  t2 constant text := 'f0000000-0000-4e0e-8000-000000000002';
  dinheiro constant text := '"[a-z_]*(valor|preco|custo|salario|total|limite|gasto)[a-z_]*"\s*:';
  c record;
begin
  for c in select * from (values
    ('Silva chama resumo_hoje da Teste 2', ana, 'authenticated', format('select 1 from produto.resumo_hoje(%L)', t2), 'contar', 'bloqueado'),
    ('Silva chama faturas da Teste 2', ana, 'authenticated', format('select 1 from produto.faturas(%L, 3)', t2), 'contar', 'bloqueado'),
    ('Silva lanca na Teste 2 pelo lancar()', ana, 'authenticated', format('select 1 from produto.lancar(%L, %L, 10)', t2, 'e0000000-0000-4e0e-8000-000000000022'), 'contar', 'bloqueado'),
    ('Silva lanca na Silva com envelope da Teste 2', ana, 'authenticated', format('select 1 from produto.lancar(%L, %L, 10)', silva, 'e0000000-0000-4e0e-8000-000000000022'), 'contar', 'bloqueado'),
    ('Silva apaga lancamento da Teste 2', ana, 'authenticated', 'select 1 from produto.apagar_lancamento(''b9077088-a3a8-4736-95ce-f29553ad3ef1'')', 'contar', 'erro: lancamento nao encontrado, ja na lixeira ou sem permissao'),
    ('Silva convida gente na Teste 2', ana, 'authenticated', format('select 1 from produto.convidar(%L, %L, %L)', t2, 'equipe', 'X'), 'contar', 'bloqueado'),
    ('Silva baixa os dados da Teste 2', ana, 'authenticated', format('select 1 from produto.exportar_familia(%L)', t2), 'contar', 'bloqueado'),
    ('Equipe chama exportar_familia', carla, 'authenticated', format('select 1 from produto.exportar_familia(%L)', silva), 'contar', 'bloqueado'),
    ('Pessoa chama exportar_familia', davi, 'authenticated', format('select 1 from produto.exportar_familia(%L)', silva), 'contar', 'bloqueado'),
    ('Equipe convida alguem', carla, 'authenticated', format('select 1 from produto.convidar(%L, %L, %L)', silva, 'equipe', 'X'), 'contar', 'bloqueado'),
    ('Equipe lanca com cartao pelo lancar()', carla, 'authenticated', format('select 1 from produto.lancar(%L, %L, 10, null, null, %L)', silva, 'e0000000-0000-4e0e-8000-000000000011', 'c0000000-0000-4e0e-8000-000000000011'), 'contar', 'bloqueado'),
    ('Equipe lanca no envelope do casal pelo lancar()', carla, 'authenticated', format('select 1 from produto.lancar(%L, %L, 10)', silva, 'e0000000-0000-4e0e-8000-000000000012'), 'contar', 'bloqueado'),
    ('Equipe ve no resumo so o envelope Casa', carla, 'authenticated', format('select json_array_length(produto.resumo_hoje(%L)->''envelopes'')', silva), 'contar', '1'),
    ('Pessoa ve no resumo so o envelope dela', davi, 'authenticated', format('select json_array_length(produto.resumo_hoje(%L)->''envelopes'')', silva), 'contar', '1'),
    ('Equipe ve faturas (cartoes)', carla, 'authenticated', format('select json_array_length(produto.faturas(%L, 3)->''faturas'')', silva), 'contar', '0'),
    ('Logado sem familia chama resumo_hoje da Silva', estranho, 'authenticated', format('select 1 from produto.resumo_hoje(%L)', silva), 'contar', 'bloqueado'),
    ('Logado sem familia entra com codigo errado', estranho, 'authenticated', 'select case when (produto.entrar_equipe(''abcd'')->>''ok'')::boolean then 1 else 0 end', 'contar', '0'),
    ('Casal que nao e dono chama numeros_semana', ana, 'authenticated', 'select 1 from produto.numeros_semana()', 'contar', 'bloqueado'),
    ('Casal le resultados dos testes', ana, 'authenticated', 'select count(*) from produto.teste_resultados', 'contar', '0'),
    ('Casal le a lista de donos', ana, 'authenticated', 'select count(*) from produto.donos_produto', 'contar', '0'),
    ('Casal chama o turno noturno', ana, 'authenticated', 'select 1 from produto.rodar_testes_noturnos()', 'contar', 'bloqueado'),
    ('Casal chama o teste de vazamento', ana, 'authenticated', 'select count(*) from produto.teste_vazamento()', 'contar', 'bloqueado'),
    ('anon chama resumo_hoje', null, 'anon', format('select 1 from produto.resumo_hoje(%L)', silva), 'contar', 'bloqueado'),
    ('anon chama criar_familia', null, 'anon', 'select 1 from produto.criar_familia(''x'',''y'')', 'contar', 'bloqueado'),
    ('anon chama entrar_equipe', null, 'anon', 'select 1 from produto.entrar_equipe(''1234'')', 'contar', 'bloqueado'),
    -- casa_da_equipe e casa_marcar (produto_15)
    ('Equipe da Silva chama casa_da_equipe da Teste 2', carla, 'authenticated', format('select 1 from produto.casa_da_equipe(%L)', t2), 'contar', 'bloqueado'),
    ('Equipe da Silva marca chegada na Teste 2', carla, 'authenticated', format('select 1 from produto.casa_marcar(%L, %L, %L)', t2, 'cheguei', '{}'), 'contar', 'bloqueado'),
    ('Equipe da Silva marca item na lista da Teste 2', carla, 'authenticated', format('select 1 from produto.casa_marcar(%L, %L, %L)', t2, 'acabou', '{"nome":"x"}'), 'contar', 'bloqueado'),
    ('Casal Silva chama casa_da_equipe da Teste 2', ana, 'authenticated', format('select 1 from produto.casa_da_equipe(%L)', t2), 'contar', 'bloqueado'),
    ('Casal Teste 2 chama casa_da_equipe da Silva', paulo, 'authenticated', format('select 1 from produto.casa_da_equipe(%L)', silva), 'contar', 'bloqueado'),
    ('Pessoa chama casa_da_equipe', davi, 'authenticated', format('select 1 from produto.casa_da_equipe(%L)', silva), 'contar', 'bloqueado'),
    ('Pessoa chama casa_marcar', davi, 'authenticated', format('select 1 from produto.casa_marcar(%L, %L, %L)', silva, 'troquei_gas', '{}'), 'contar', 'bloqueado'),
    ('Logado sem familia chama casa_da_equipe', estranho, 'authenticated', format('select 1 from produto.casa_da_equipe(%L)', silva), 'contar', 'bloqueado'),
    ('anon chama casa_da_equipe', null, 'anon', format('select 1 from produto.casa_da_equipe(%L)', silva), 'contar', 'bloqueado'),
    ('anon chama casa_marcar', null, 'anon', format('select 1 from produto.casa_marcar(%L, %L, %L)', silva, 'cheguei', '{}'), 'contar', 'bloqueado'),
    ('Resposta da equipe tem chave de dinheiro (valor, preco, custo, salario)', carla, 'authenticated', format('select case when produto.casa_da_equipe(%L)::text ~* %L then 1 else 0 end', silva, dinheiro), 'contar', '0'),
    ('Resposta da equipe tem R$ ou o numero 150 ou 1800', carla, 'authenticated', format('select case when produto.casa_da_equipe(%L)::text ~ %L then 1 else 0 end', silva, '(R\$|\m150\M|\m1800\M|28\.9)'), 'contar', '0'),
    ('Resposta de casa_marcar da equipe tem chave de dinheiro', carla, 'authenticated', format('select case when produto.casa_marcar(%L, %L, %L)::text ~* %L then 1 else 0 end', silva, 'prestador_veio', '{"id":"p1"}', dinheiro), 'contar', '0'),
    ('Equipe continua sem ler config_familia direto', carla, 'authenticated', 'select count(*) from produto.config_familia', 'contar', '0'),
    ('CONTROLE casal Silva ve o resumo com 5 envelopes', ana, 'authenticated', format('select json_array_length(produto.resumo_hoje(%L)->''envelopes'')', silva), 'contar', '5'),
    ('CONTROLE casal Silva lanca pelo lancar()', ana, 'authenticated', format('select case when produto.lancar(%L, %L, 10) is not null then 1 else 0 end', silva, 'e0000000-0000-4e0e-8000-000000000013'), 'contar', '1'),
    ('CONTROLE casal Silva baixa os dados (6 lancamentos)', ana, 'authenticated', format('select json_array_length(produto.exportar_familia(%L)->''lancamentos'')', silva), 'contar', '6'),
    ('CONTROLE equipe lanca na Casa pelo lancar()', carla, 'authenticated', format('select case when produto.lancar(%L, %L, 10) is not null then 1 else 0 end', silva, 'e0000000-0000-4e0e-8000-000000000011'), 'contar', '1'),
    ('CONTROLE logado cria a propria familia', estranho, 'authenticated', 'select case when produto.criar_familia(''Familia Nova'',''Eu'') is not null then 1 else 0 end', 'contar', '1'),
    ('CONTROLE equipe ve a lista da casa (2 itens)', carla, 'authenticated', format('select json_array_length(produto.casa_da_equipe(%L)->''lista'')', silva), 'contar', '2'),
    ('CONTROLE equipe ve 1 prestador com proxima visita', carla, 'authenticated', format('select count(*) from json_array_elements(produto.casa_da_equipe(%L)->''prestadores'') p where p->>''proxima_visita'' is not null', silva), 'contar', '1'),
    ('CONTROLE equipe ve a proxima troca do gas', carla, 'authenticated', format('select case when produto.casa_da_equipe(%L)->''gas''->>''proxima_troca'' is not null then 1 else 0 end', silva), 'contar', '1'),
    ('CONTROLE equipe marca comprei e o item fica ok', carla, 'authenticated', format('select count(*) from json_array_elements(produto.casa_marcar(%L, %L, %L)->''lista'') i where i->>''id'' = ''i1'' and (i->>''ok'')::boolean', silva, 'comprei', '{"id":"i1"}'), 'contar', '1'),
    ('CONTROLE equipe marca acabou e o item entra na lista', carla, 'authenticated', format('select json_array_length(produto.casa_marcar(%L, %L, %L)->''lista'')', silva, 'acabou', '{"nome":"Sabao"}'), 'contar', '3'),
    ('CONTROLE equipe marca cheguei e aparece em quem veio', carla, 'authenticated', format('select json_array_length(produto.casa_marcar(%L, %L, %L)->''presenca''->''hoje'')', silva, 'cheguei', '{}'), 'contar', '1'),
    ('CONTROLE equipe marca troquei o gas', carla, 'authenticated', format('select json_array_length(produto.casa_marcar(%L, %L, %L)->''gas''->''trocas'')', silva, 'troquei_gas', '{}'), 'contar', '4'),
    ('CONTROLE casal Silva chama casa_da_equipe', ana, 'authenticated', format('select json_array_length(produto.casa_da_equipe(%L)->''lista'')', silva), 'contar', '2')
  ) as v(nome, uid, papel_db, sql, modo, esp) loop
    caso := c.nome; esperado := c.esp;
    obtido := produto._tentativa(c.uid, c.papel_db, c.sql, c.modo);
    ok := obtido = esperado; return next;
  end loop;
end $function$
;

-- produto._teste_vazamento_tabelas()
CREATE OR REPLACE FUNCTION produto._teste_vazamento_tabelas()
 RETURNS TABLE(caso text, esperado text, obtido text, ok boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  ana   constant text := 'a0000000-0000-4e0e-8000-0000000000a1';
  carla constant text := 'a0000000-0000-4e0e-8000-0000000000c1';
  davi  constant text := 'a0000000-0000-4e0e-8000-0000000000d1';
  paulo constant text := 'a0000000-0000-4e0e-8000-0000000000f2';
  estranho constant text := 'a0000000-0000-4e0e-8000-0000000000ff';
  silva constant text := 'f0000000-0000-4e0e-8000-000000000001';
  t2    constant text := 'f0000000-0000-4e0e-8000-000000000002';
  c record; t text;
begin
  -- 1. Silva (Ana, casal) tentando LER a Familia Teste 2, tabela por tabela
  foreach t in array array['envelopes','membros','limites_mes','cartoes','lancamentos','config_familia','eventos','acesso_equipe'] loop
    caso := 'Silva le ' || t || ' da Teste 2'; esperado := '0';
    obtido := produto._tentativa(ana, 'authenticated',
      format('select count(*) from produto.%I where familia_id = %L', t, t2), 'contar');
    ok := obtido = esperado; return next;
  end loop;
  caso := 'Silva le a linha da familia Teste 2'; esperado := '0';
  obtido := produto._tentativa(ana,'authenticated', format('select count(*) from produto.familias where id = %L', t2),'contar');
  ok := obtido = esperado; return next;

  for c in select * from (values
    -- 2. Silva tentando INSERIR, ATUALIZAR e APAGAR na Teste 2
    ('Silva insere lancamento na Teste 2', ana, 'authenticated', format('insert into produto.lancamentos (familia_id, envelope_id, valor, autor) values (%L, %L, 10, %L)', t2, 'e0000000-0000-4e0e-8000-000000000022', ana), 'linhas', 'bloqueado'),
    ('Silva insere lancamento da Silva num envelope da Teste 2', ana, 'authenticated', format('insert into produto.lancamentos (familia_id, envelope_id, valor, autor) values (%L, %L, 10, %L)', silva, 'e0000000-0000-4e0e-8000-000000000022', ana), 'linhas', 'bloqueado'),
    ('Silva insere envelope na Teste 2', ana, 'authenticated', format('insert into produto.envelopes (familia_id, nome) values (%L, %L)', t2, 'invasor'), 'linhas', 'bloqueado'),
    ('Silva se coloca como membro da Teste 2', ana, 'authenticated', format('insert into produto.membros (familia_id, user_id, papel, nome) values (%L, %L, %L, %L)', t2, ana, 'casal', 'Ana'), 'linhas', 'bloqueado'),
    ('Silva grava config na Teste 2', ana, 'authenticated', format('insert into produto.config_familia (familia_id, chave, valor) values (%L, %L, %L)', t2, 'renda_mes', '1'), 'linhas', 'bloqueado'),
    ('Silva atualiza lancamentos da Teste 2', ana, 'authenticated', format('update produto.lancamentos set valor = 1 where familia_id = %L', t2), 'linhas', '0'),
    ('Silva atualiza nome da Teste 2', ana, 'authenticated', format('update produto.familias set nome = %L where id = %L', 'x', t2), 'linhas', '0'),
    ('Silva atualiza config da Teste 2', ana, 'authenticated', format('update produto.config_familia set valor = %L where familia_id = %L', '1', t2), 'linhas', '0'),
    ('Silva muda lancamento proprio pra Teste 2', ana, 'authenticated', format('update produto.lancamentos set familia_id = %L where familia_id = %L', t2, silva), 'linhas', 'bloqueado'),
    ('Silva apaga lancamentos da Teste 2', ana, 'authenticated', format('delete from produto.lancamentos where familia_id = %L', t2), 'linhas', '0'),
    ('Silva apaga envelopes da Teste 2', ana, 'authenticated', format('delete from produto.envelopes where familia_id = %L', t2), 'linhas', '0'),
    ('Silva apaga membros da Teste 2', ana, 'authenticated', format('delete from produto.membros where familia_id = %L', t2), 'linhas', '0'),
    -- 3. Equipe (Carla) so ve a Casa
    ('Equipe ve envelope do casal', carla, 'authenticated', 'select count(*) from produto.envelopes where not casa', 'contar', '0'),
    ('Equipe ve lancamento fora da Casa', carla, 'authenticated', 'select count(*) from produto.lancamentos l join produto.envelopes e on e.id = l.envelope_id where not e.casa', 'contar', '0'),
    ('Equipe ve lancamento fora da Casa (sem join)', carla, 'authenticated', format('select count(*) from produto.lancamentos where envelope_id <> %L', 'e0000000-0000-4e0e-8000-000000000011'), 'contar', '0'),
    ('Equipe ve limite de outro envelope', carla, 'authenticated', format('select count(*) from produto.limites_mes where envelope_id <> %L', 'e0000000-0000-4e0e-8000-000000000011'), 'contar', '0'),
    ('Equipe ve cartoes', carla, 'authenticated', 'select count(*) from produto.cartoes', 'contar', '0'),
    ('Equipe ve config da familia (renda)', carla, 'authenticated', 'select count(*) from produto.config_familia', 'contar', '0'),
    ('Equipe ve codigos de acesso', carla, 'authenticated', 'select count(*) from produto.acesso_equipe', 'contar', '0'),
    ('Equipe ve outros membros', carla, 'authenticated', format('select count(*) from produto.membros where user_id <> %L', carla), 'contar', '0'),
    ('Equipe lanca em envelope do casal', carla, 'authenticated', format('insert into produto.lancamentos (familia_id, envelope_id, valor, autor) values (%L, %L, 10, %L)', silva, 'e0000000-0000-4e0e-8000-000000000012', carla), 'linhas', 'bloqueado'),
    ('Equipe lanca na Casa usando cartao', carla, 'authenticated', format('insert into produto.lancamentos (familia_id, envelope_id, cartao_id, valor, autor) values (%L, %L, %L, 10, %L)', silva, 'e0000000-0000-4e0e-8000-000000000011', 'c0000000-0000-4e0e-8000-000000000011', carla), 'linhas', 'bloqueado'),
    ('Equipe muda lancamento da Casa pra envelope do casal', carla, 'authenticated', format('update produto.lancamentos set envelope_id = %L where envelope_id = %L', 'e0000000-0000-4e0e-8000-000000000012', 'e0000000-0000-4e0e-8000-000000000011'), 'linhas', 'bloqueado'),
    ('Equipe se promove a casal', carla, 'authenticated', format('update produto.membros set papel = %L where user_id = %L', 'casal', carla), 'linhas', '0'),
    -- 4. Pessoa (Davi) so ve o proprio
    ('Pessoa ve lancamento de outra pessoa', davi, 'authenticated', format('select count(*) from produto.lancamentos where autor <> %L', davi), 'contar', '0'),
    ('Pessoa ve envelope de outra pessoa', davi, 'authenticated', format('select count(*) from produto.envelopes where id <> %L', 'e0000000-0000-4e0e-8000-000000000014'), 'contar', '0'),
    ('Pessoa altera lancamento da Lia', davi, 'authenticated', format('update produto.lancamentos set valor = 1 where envelope_id = %L', 'e0000000-0000-4e0e-8000-000000000015'), 'linhas', '0'),
    ('Pessoa lanca no envelope da Lia', davi, 'authenticated', format('insert into produto.lancamentos (familia_id, envelope_id, valor, autor) values (%L, %L, 10, %L)', silva, 'e0000000-0000-4e0e-8000-000000000015', davi), 'linhas', 'bloqueado'),
    ('Pessoa lanca em nome de outra pessoa', davi, 'authenticated', format('insert into produto.lancamentos (familia_id, envelope_id, valor, autor) values (%L, %L, 10, %L)', silva, 'e0000000-0000-4e0e-8000-000000000014', ana), 'linhas', 'bloqueado'),
    -- 5. anon e logado sem familia
    ('anon le lancamentos', null, 'anon', 'select count(*) from produto.lancamentos', 'contar', 'bloqueado'),
    ('anon le familias', null, 'anon', 'select count(*) from produto.familias', 'contar', 'bloqueado'),
    ('anon chama minhas_familias()', null, 'anon', 'select count(*) from produto.minhas_familias()', 'contar', 'bloqueado'),
    ('anon insere lancamento', null, 'anon', format('insert into produto.lancamentos (familia_id, envelope_id, valor, autor) values (%L, %L, 10, %L)', silva, 'e0000000-0000-4e0e-8000-000000000011', ana), 'linhas', 'bloqueado'),
    ('Logado sem familia le lancamentos', estranho, 'authenticated', 'select count(*) from produto.lancamentos', 'contar', '0'),
    ('Logado sem familia le familias', estranho, 'authenticated', 'select count(*) from produto.familias', 'contar', '0'),
    ('Logado tenta TRUNCATE', ana, 'authenticated', 'truncate produto.lancamentos', 'linhas', 'bloqueado'),
    -- 6. provas de que a tranca nao bloqueia tudo (controle positivo)
    ('CONTROLE casal Silva ve os 6 lancamentos dela', ana, 'authenticated', 'select count(*) from produto.lancamentos', 'contar', '6'),
    ('CONTROLE casal Silva ve os 5 envelopes dela', ana, 'authenticated', 'select count(*) from produto.envelopes', 'contar', '5'),
    ('CONTROLE casal Silva lanca na propria familia', ana, 'authenticated', format('insert into produto.lancamentos (familia_id, envelope_id, valor) values (%L, %L, 10)', silva, 'e0000000-0000-4e0e-8000-000000000013'), 'linhas', '1'),
    ('Equipe le a tabela de envelopes (tem limite e colchao)', carla, 'authenticated', 'select count(*) from produto.envelopes', 'contar', '0'),
    ('CONTROLE equipe lanca na Casa', carla, 'authenticated', format('insert into produto.lancamentos (familia_id, envelope_id, valor) values (%L, %L, 10)', silva, 'e0000000-0000-4e0e-8000-000000000011'), 'linhas', '1'),
    ('CONTROLE pessoa ve o proprio lancamento', davi, 'authenticated', 'select count(*) from produto.lancamentos', 'contar', '1'),
    ('CONTROLE Teste 2 ve os 2 lancamentos dela', paulo, 'authenticated', 'select count(*) from produto.lancamentos', 'contar', '2')
  ) as v(nome, uid, papel_db, sql, modo, esp) loop
    caso := c.nome; esperado := c.esp;
    obtido := produto._tentativa(c.uid, c.papel_db, c.sql, c.modo);
    ok := obtido = esperado; return next;
  end loop;
end $function$
;

-- produto.apagar_lancamento(id uuid)
CREATE OR REPLACE FUNCTION produto.apagar_lancamento(id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare n int; v_fam uuid;
begin
  update produto.lancamentos l set apagado_em = now() where l.id = apagar_lancamento.id and l.apagado_em is null returning l.familia_id into v_fam;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'lancamento nao encontrado, ja na lixeira ou sem permissao' using errcode = 'P0002'; end if;
  return json_build_object('id', apagar_lancamento.id, 'na_lixeira', true, 'resumo', produto._resumo(v_fam, produto._hoje()));
end $function$
;

-- produto.cartao_salvar(familia uuid, apelido text, cartao uuid, banco text, titular uuid, dia_fecha integer, dia_vence integer, limite numeric, taxa_valor numeric, taxa_periodo text, taxa_mes integer, taxa_isenta_acima numeric, final4 text, ativo boolean)
CREATE OR REPLACE FUNCTION produto.cartao_salvar(familia uuid, apelido text, cartao uuid DEFAULT NULL::uuid, banco text DEFAULT NULL::text, titular uuid DEFAULT NULL::uuid, dia_fecha integer DEFAULT NULL::integer, dia_vence integer DEFAULT NULL::integer, limite numeric DEFAULT NULL::numeric, taxa_valor numeric DEFAULT NULL::numeric, taxa_periodo text DEFAULT NULL::text, taxa_mes integer DEFAULT NULL::integer, taxa_isenta_acima numeric DEFAULT NULL::numeric, final4 text DEFAULT NULL::text, ativo boolean DEFAULT true)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
end $function$
;

-- produto.casa_da_equipe(familia uuid)
CREATE OR REPLACE FUNCTION produto.casa_da_equipe(familia uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$
;

-- produto.casa_marcar(familia uuid, tipo text, dados jsonb)
CREATE OR REPLACE FUNCTION produto.casa_marcar(familia uuid, tipo text, dados jsonb DEFAULT '{}'::jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$
;

-- produto.convidar(familia uuid, papel text, nome text, email text)
CREATE OR REPLACE FUNCTION produto.convidar(familia uuid, papel text, nome text, email text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_mid uuid := gen_random_uuid(); v_aid uuid := gen_random_uuid(); v_cod text; v_busca text;
  v_exp timestamptz := now() + interval '24 hours'; v_email text := lower(nullif(trim(convidar.email), '')); i int := 0;
begin
  if (select auth.uid()) is null or produto.meu_papel(convidar.familia) is distinct from 'casal' then
    raise exception 'so o casal convida' using errcode = '42501';
  end if;
  if convidar.papel is null or convidar.papel not in ('casal','pessoa','equipe') then raise exception 'papel tem que ser casal, pessoa ou equipe' using errcode = '22023'; end if;
  if coalesce(trim(convidar.nome),'') = '' or char_length(trim(convidar.nome)) > 80 then raise exception 'falta o nome (ate 80 letras)' using errcode = '22023'; end if;
  if convidar.papel <> 'equipe' and (v_email is null or char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'falta um e-mail valido' using errcode = '22023';
  end if;
  if (select count(*) from produto.membros m where m.familia_id = convidar.familia) >= 50 then
    raise exception 'a familia ja tem 50 pessoas' using errcode = '54000';
  end if;
  if v_email is not null and exists (select 1 from produto.membros m where m.familia_id = convidar.familia and m.email = v_email) then
    raise exception 'esse e-mail ja foi convidado nesta familia' using errcode = '22023';
  end if;
  insert into produto.membros (id, familia_id, user_id, papel, nome, email)
  values (v_mid, convidar.familia, null, convidar.papel, trim(convidar.nome), v_email);
  if convidar.papel = 'equipe' then
    if (select count(*) from produto.acesso_equipe ae where ae.familia_id = convidar.familia and ae.expira_em > now()) >= 5 then
      raise exception 'ja existem 5 codigos abertos nesta familia; use um deles ou espere vencer' using errcode = '54000';
    end if;
    perform pg_advisory_xact_lock(hashtextextended('produto.codigo_equipe', 0));
    loop
      v_cod := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 10000)::text, 4, '0');
      v_busca := encode(sha256(convert_to(v_cod, 'UTF8')), 'hex');
      exit when not exists (select 1 from produto.acesso_equipe ae where ae.expira_em > now() and ae.codigo_busca = v_busca);
      i := i + 1;
      if i > 60 then raise exception 'muitos convites abertos agora; tente de novo em alguns minutos' using errcode = '54000'; end if;
    end loop;
    insert into produto.acesso_equipe (id, familia_id, membro_id, codigo_hash, codigo_busca, expira_em)
    values (v_aid, convidar.familia, v_mid, extensions.crypt(v_cod, extensions.gen_salt('bf', 8)), v_busca, v_exp);
    return json_build_object('membro_id', v_mid, 'convite', v_aid, 'codigo_4_digitos', v_cod, 'expira_em', v_exp);
  end if;
  return json_build_object('membro_id', v_mid, 'email', v_email, 'convite', 'email',
    'proximo_passo', 'A pessoa entra no app com esse e-mail (codigo de 6 numeros) e o app chama produto.entrar_por_convite()');
end $function$
;

-- produto.criar_familia(nome text, nome_pessoa text)
CREATE OR REPLACE FUNCTION produto.criar_familia(nome text, nome_pessoa text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); v_fam uuid := gen_random_uuid();
begin
  if uid is null then raise exception 'precisa entrar com o e-mail antes' using errcode = '42501'; end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'login da equipe nao cria familia' using errcode = '42501'; end if;
  if coalesce(trim(criar_familia.nome), '') = '' or coalesce(trim(nome_pessoa), '') = '' then raise exception 'falta o nome da familia ou o seu nome' using errcode = '22023'; end if;
  if (select count(*) from produto.membros m where m.user_id = uid and m.papel = 'casal') >= 3 then raise exception 'limite de 3 familias por pessoa' using errcode = '54000'; end if;
  insert into produto.familias (id, nome) values (v_fam, trim(criar_familia.nome));
  insert into produto.membros (familia_id, user_id, papel, nome) values (v_fam, uid, 'casal', trim(nome_pessoa));
  insert into produto.envelopes (familia_id, nome, regra, limite_mes, casa) values
    (v_fam, 'Pessoa 1', 'mensal', 0, false),
    (v_fam, 'Pessoa 2', 'diario', 0, false),
    (v_fam, 'Feira semanal', 'semanal', 0, true),
    (v_fam, 'Casa mensal', 'mensal', 0, true);
  return json_build_object('familia_id', v_fam);
end $function$
;

-- produto.definir_limite(familia uuid, envelope uuid, valor numeric)
CREATE OR REPLACE FUNCTION produto.definir_limite(familia uuid, envelope uuid, valor numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare f uuid := definir_limite.familia; en uuid := definir_limite.envelope; v_val numeric := round(definir_limite.valor, 2);
        v_hoje date := produto._hoje(); v_mes text;
begin
  v_mes := to_char(v_hoje, 'YYYY-MM');
  if (select auth.uid()) is null or produto.meu_papel(f) is distinct from 'casal' then raise exception 'so o casal muda o limite' using errcode = '42501'; end if;
  if v_val is null or v_val < 0 or v_val > 99999999 then raise exception 'o limite tem que ser um valor de zero pra cima' using errcode = '22023'; end if;
  perform 1 from produto.envelopes e where e.id = en and e.familia_id = f for update;
  if not found then raise exception 'envelope nao encontrado' using errcode = 'P0002'; end if;
  -- mes fechado nao muda: grava o que valia ate o mes passado antes de trocar
  perform produto._congelar_limite_passado(f, en, produto._lim(en, (date_trunc('month', v_hoje) - interval '1 day')::date));
  insert into produto.limites_mes (familia_id, envelope_id, mes, valor) values (f, en, v_mes, v_val)
  on conflict (envelope_id, mes) do update set valor = excluded.valor;
  update produto.envelopes e set limite_mes = v_val where e.id = en;
  return json_build_object('envelope_id', en, 'limite', v_val, 'vale_desde', v_mes, 'resumo', produto._resumo(f, v_hoje));
end $function$
;

-- produto.entrar_equipe(codigo text)
CREATE OR REPLACE FUNCTION produto.entrar_equipe(codigo text)
 RETURNS json
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ select produto._equipe_entrar(codigo, null) $function$
;

-- produto.entrar_equipe_convite(convite uuid, codigo text)
CREATE OR REPLACE FUNCTION produto.entrar_equipe_convite(convite uuid, codigo text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if convite is null then return json_build_object('ok', false, 'motivo', 'Codigo errado ou vencido.', 'restam', 0); end if;
  return produto._equipe_entrar(codigo, convite);
end $function$
;

-- produto.entrar_por_convite()
CREATE OR REPLACE FUNCTION produto.entrar_por_convite()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); j jsonb := auth.jwt(); v_email text := lower(j ->> 'email'); r json;
begin
  if uid is null or coalesce(v_email,'') = '' or coalesce((j ->> 'is_anonymous')::boolean, false) then
    raise exception 'entre com o e-mail do convite' using errcode = '42501';
  end if;
  if not exists (select 1 from auth.users u where u.id = uid and lower(u.email) = v_email and u.email_confirmed_at is not null
                   and not coalesce(u.is_anonymous, false)) then
    raise exception 'confirme o seu e-mail com o codigo de 6 numeros antes de entrar na familia' using errcode = '42501';
  end if;
  if not exists (select 1 from jsonb_array_elements(case when jsonb_typeof(j -> 'amr') = 'array' then j -> 'amr' else '[]'::jsonb end) x
                  where coalesce(x ->> 'method', x #>> '{}') not in ('password', 'anonymous')) then
    raise exception 'entre com o codigo de 6 numeros enviado pro e-mail do convite' using errcode = '42501';
  end if;
  with alvo as (
    select distinct on (m.familia_id) m.id from produto.membros m
     where m.user_id is null and m.email = v_email and m.papel in ('casal','pessoa') and m.ativo
       and not exists (select 1 from produto.membros x where x.familia_id = m.familia_id and x.user_id = uid)
     order by m.familia_id, m.criado_em),
  lig as (
    update produto.membros m set user_id = uid from alvo where m.id = alvo.id and m.user_id is null
    returning m.familia_id, m.papel, m.nome)
  select coalesce(json_agg(lig), '[]'::json) into r from lig;
  return json_build_object('familias', r);
end $function$
;

-- produto.escritorio_diario(familia uuid, funcionario text, limite integer, antes timestamp with time zone)
CREATE OR REPLACE FUNCTION produto.escritorio_diario(familia uuid, funcionario text DEFAULT NULL::text, limite integer DEFAULT 30, antes timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare papel text := produto.meu_papel(familia); j jsonb;
begin
  if papel is null or papel not in ('casal', 'equipe') then raise exception 'so o casal e a equipe da casa veem o diario' using errcode = '42501'; end if;
  j := produto._esc_diario_json(familia, funcionario, least(coalesce(limite, 30), 200) + 1, antes);
  return json_build_object('itens', (select coalesce(jsonb_agg(x order by o), '[]'::jsonb) from jsonb_array_elements(j) with ordinality t(x, o) where o <= least(coalesce(limite, 30), 200)),
    'tem_mais', jsonb_array_length(j) > least(coalesce(limite, 30), 200),
    'proximo_antes', (select x->>'quando' from jsonb_array_elements(j) with ordinality t(x, o) where o = least(coalesce(limite, 30), 200)));
end $function$
;

-- produto.escritorio_hoje(familia uuid)
CREATE OR REPLACE FUNCTION produto.escritorio_hoje(familia uuid)
 RETURNS json
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select produto._escritorio(familia, now())::json
$function$
;

-- produto.escritorio_relatorio(familia uuid, de date, ate date)
CREATE OR REPLACE FUNCTION produto.escritorio_relatorio(familia uuid, de date DEFAULT NULL::date, ate date DEFAULT NULL::date)
 RETURNS json
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select produto._esc_relatorio(familia, de, ate, now())::json
$function$
;

-- produto.escritorio_responder(familia uuid, pergunta_id text, opcao text, dados jsonb)
CREATE OR REPLACE FUNCTION produto.escritorio_responder(familia uuid, pergunta_id text, opcao text, dados jsonb DEFAULT '{}'::jsonb)
 RETURNS json
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select produto._esc_responder(familia, pergunta_id, opcao, dados, now())::json
$function$
;

-- produto.estoque_contar(familia uuid, itens jsonb, data date)
CREATE OR REPLACE FUNCTION produto.estoque_contar(familia uuid, itens jsonb, data date DEFAULT NULL::date)
 RETURNS json
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select produto._estoque_contar(familia, itens, data, produto._hoje())::json
$function$
;

-- produto.estoque_item_salvar(familia uuid, nome text, categoria text, item uuid, ativo boolean)
CREATE OR REPLACE FUNCTION produto.estoque_item_salvar(familia uuid, nome text, categoria text DEFAULT NULL::text, item uuid DEFAULT NULL::uuid, ativo boolean DEFAULT true)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
end $function$
;

-- produto.exportar_familia(familia uuid)
CREATE OR REPLACE FUNCTION produto.exportar_familia(familia uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare f uuid := exportar_familia.familia;
begin
  if produto.meu_papel(f) is distinct from 'casal' then raise exception 'so o casal baixa os dados da familia' using errcode = '42501'; end if;
  return json_build_object(
    'exportado_em', now(), 'formato', 'Central da Familia v1',
    'familia', (select to_json(x) from produto.familias x where x.id = f),
    'membros', (select coalesce(json_agg(x order by x.criado_em), '[]') from produto.membros x where x.familia_id = f),
    'envelopes', (select coalesce(json_agg(x order by x.criado_em), '[]') from produto.envelopes x where x.familia_id = f),
    'limites_mes', (select coalesce(json_agg(x order by x.mes), '[]') from produto.limites_mes x where x.familia_id = f),
    'cartoes', (select coalesce(json_agg(x order by x.criado_em), '[]') from produto.cartoes x where x.familia_id = f),
    'lancamentos', (select coalesce(json_agg(x order by x.data, x.criado_em), '[]') from produto.lancamentos x where x.familia_id = f),
    'config', (select coalesce(json_agg(x), '[]') from produto.config_familia x where x.familia_id = f),
    'eventos', (select coalesce(json_agg(json_build_object('tipo', x.tipo, 'segundos', x.segundos, 'criado_em', x.criado_em) order by x.criado_em), '[]') from produto.eventos x where x.familia_id = f),
    'codigos_equipe', (select coalesce(json_agg(json_build_object('membro_id', x.membro_id, 'expira_em', x.expira_em, 'usado_em', x.usado_em)), '[]') from produto.acesso_equipe x where x.familia_id = f),
    'guardado_aplicacoes', (select coalesce(json_agg(x order by x.criado_em), '[]') from produto.pat_aplicacoes x where x.familia_id = f),
    'guardado_movimentos', (select coalesce(json_agg(x order by x.data, x.criado_em), '[]') from produto.pat_movimentos x where x.familia_id = f),
    'lembretes', (select coalesce(json_agg(x order by x.quando), '[]') from produto.esc_lembretes x where x.familia_id = f),
    'diario_do_escritorio', (select coalesce(json_agg(x order by x.quando), '[]') from produto.esc_diario x where x.familia_id = f),
    'cartao_custos', (select coalesce(json_agg(x), '[]') from produto.cartao_custos x where x.familia_id = f),
    'cartao_faturas', (select coalesce(json_agg(x order by x.mes), '[]') from produto.cartao_faturas x where x.familia_id = f),
    'feiras', (select coalesce(json_agg(x order by x.data), '[]') from produto.feiras x where x.familia_id = f),
    'estoque_itens', (select coalesce(json_agg(x order by x.nome), '[]') from produto.estoque_itens x where x.familia_id = f),
    'estoque_contagens', (select coalesce(json_agg(x order by x.data), '[]') from produto.estoque_contagens x where x.familia_id = f),
    'uso_da_ia', (select coalesce(json_agg(json_build_object('funcao', x.funcao, 'custo_brl', x.custo_brl, 'criado_em', x.criado_em) order by x.criado_em), '[]') from produto.ia_chamadas x where x.familia_id = f));
end $function$
;

-- produto.familias_com_papel(VARIADIC p_papeis text[])
CREATE OR REPLACE FUNCTION produto.familias_com_papel(VARIADIC p_papeis text[])
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select m.familia_id from produto.membros m
  where m.user_id = (select auth.uid()) and m.ativo and m.papel = any(p_papeis)
$function$
;

-- produto.fatura_informar(familia uuid, cartao uuid, mes text, valor_banco numeric, paga_em date, diferenca_motivo text, desfazer_pagamento boolean)
CREATE OR REPLACE FUNCTION produto.fatura_informar(familia uuid, cartao uuid, mes text, valor_banco numeric DEFAULT NULL::numeric, paga_em date DEFAULT NULL::date, diferenca_motivo text DEFAULT NULL::text, desfazer_pagamento boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
#variable_conflict use_column
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
end $function$
;

-- produto.faturas(familia uuid, meses integer)
CREATE OR REPLACE FUNCTION produto.faturas(familia uuid, meses integer DEFAULT 3)
 RETURNS json
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select jsonb_build_object('regra', 'A compra conta no saldo pelo dia da compra e na fatura pelo mês de vencimento',
     'faturas', produto._faturas(familia, produto._hoje(), meses))::json $function$
;

-- produto.feira_anexar_nota(feira uuid, caminho text)
CREATE OR REPLACE FUNCTION produto.feira_anexar_nota(feira uuid, caminho text)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
end $function$
;

-- produto.feira_registrar(familia uuid, data date, valor numeric, loja text, lancamento uuid, chave uuid, feira uuid)
CREATE OR REPLACE FUNCTION produto.feira_registrar(familia uuid, data date DEFAULT NULL::date, valor numeric DEFAULT NULL::numeric, loja text DEFAULT NULL::text, lancamento uuid DEFAULT NULL::uuid, chave uuid DEFAULT NULL::uuid, feira uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select produto._feira_registrar(familia, data, valor, loja, lancamento, chave, feira, produto._hoje())::json
$function$
;

-- produto.feira_sem_nota(feira uuid, motivo text)
CREATE OR REPLACE FUNCTION produto.feira_sem_nota(feira uuid, motivo text)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare f uuid; papel text; mt text := left(btrim(coalesce(motivo, '')), 200);
begin
  select x.familia_id into f from produto.feiras x where x.id = feira;
  papel := produto.meu_papel(f);
  if f is null or papel is null or papel not in ('casal', 'equipe') then raise exception 'feira nao encontrada ou sem permissao' using errcode = '42501'; end if;
  if mt = '' then raise exception 'diga em poucas palavras por que nao teve nota (feira livre, acougue)' using errcode = '22023'; end if;
  update produto.feiras x set sem_nota_motivo = mt where x.id = feira and x.nota_caminho is null;
  return json_build_object('feira', (select x from jsonb_array_elements(produto._feiras_json(f, papel, 60)) x where x->>'id' = feira::text));
end $function$
;

-- produto.guardado_criar(familia uuid, nome text, banco text, tipo text, pct_cdi numeric, valor_inicial numeric, data date, vence_em date, chave uuid, titular uuid)
CREATE OR REPLACE FUNCTION produto.guardado_criar(familia uuid, nome text, banco text, tipo text, pct_cdi numeric, valor_inicial numeric, data date DEFAULT NULL::date, vence_em date DEFAULT NULL::date, chave uuid DEFAULT NULL::uuid, titular uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  f uuid := guardado_criar.familia; hoje date := produto._hoje(); dt date := coalesce(guardado_criar.data, produto._hoje());
  t text := guardado_criar.tipo; aid uuid; tit uuid := guardado_criar.titular; ja boolean := false;
  pct numeric := coalesce(guardado_criar.pct_cdi, 100); vi numeric := coalesce(guardado_criar.valor_inicial, 0);
begin
  if produto.meu_papel(f) is distinct from 'casal' then raise exception 'so o casal mexe no Guardado' using errcode = '42501'; end if;
  if t is null or t not in ('caixinha', 'cdb', 'lci_lca', 'poupanca', 'tesouro_selic') then raise exception 'tipo invalido: use caixinha, cdb, lci_lca, poupanca ou tesouro_selic' using errcode = '22023'; end if;
  if btrim(coalesce(guardado_criar.nome, '')) = '' or btrim(coalesce(guardado_criar.banco, '')) = '' then raise exception 'faltou o nome ou o banco' using errcode = '22023'; end if;
  if pct < 0 or pct > 300 then raise exception 'o percentual do CDI vai de 0 a 300' using errcode = '22023'; end if;
  if vi < 0 or vi > 100000000 then raise exception 'valor invalido' using errcode = '22023'; end if;
  if dt > hoje or dt < hoje - 3660 then raise exception 'a data tem que ser de hoje pra tras, ate 10 anos' using errcode = '22023'; end if;
  if guardado_criar.vence_em is not null and guardado_criar.vence_em <= dt then raise exception 'o vencimento tem que ser depois da data da aplicacao' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('guardado:' || f::text, 0));
  if guardado_criar.chave is not null then
    select x.id into aid from produto.pat_aplicacoes x where x.familia_id = f and x.chave = guardado_criar.chave;
  end if;
  if aid is not null then
    ja := true;
  else
    if (select count(*) from produto.pat_aplicacoes x where x.familia_id = f and x.encerrada_em is null) >= 30 then
      raise exception 'a familia ja tem 30 aplicacoes abertas' using errcode = '54000';
    end if;
    if tit is null then
      select m.id into tit from produto.membros m where m.familia_id = f and m.user_id = (select auth.uid()) and m.ativo limit 1;
    elsif not exists (select 1 from produto.membros m where m.familia_id = f and m.id = tit and m.papel = 'casal') then
      raise exception 'o titular tem que ser do casal' using errcode = '22023';
    end if;
    insert into produto.pat_aplicacoes (familia_id, titular_membro, nome, banco, tipo, pct_cdi, isento_ir, liquidez, vence_em, chave, criado_por)
    values (f, tit, left(btrim(guardado_criar.nome), 60), left(btrim(guardado_criar.banco), 60), t,
            case when t in ('poupanca', 'tesouro_selic') then 100 else pct end, t in ('lci_lca', 'poupanca'),
            case when guardado_criar.vence_em is not null and t in ('cdb', 'lci_lca') then 'vencimento' else 'diaria' end,
            guardado_criar.vence_em, guardado_criar.chave, (select auth.uid()))
    returning id into aid;
    if vi >= 0.01 then
      insert into produto.pat_movimentos (familia_id, aplicacao_id, data, tipo, valor, chave, autor)
      values (f, aid, dt, 'aporte', round(vi, 2), coalesce(guardado_criar.chave, gen_random_uuid()), (select auth.uid()));
    end if;
  end if;
  return (produto._guardado(f, hoje) || jsonb_build_object('aplicacao_id', aid, 'repetido', ja))::json;
end $function$
;

-- produto.guardado_custo_do_gasto(familia uuid, valor numeric)
CREATE OR REPLACE FUNCTION produto.guardado_custo_do_gasto(familia uuid, valor numeric)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare papel text := produto.meu_papel(familia);
begin
  if papel is null then raise exception 'voce nao faz parte desta familia' using errcode = '42501'; end if;
  if papel <> 'casal' then return json_build_object('tem_guardado', false); end if;
  return produto._guardado_custo(familia, valor, produto._hoje())::json;
end $function$
;

-- produto.guardado_desfazer(movimento uuid)
CREATE OR REPLACE FUNCTION produto.guardado_desfazer(movimento uuid)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare f uuid;
begin
  select x.familia_id into f from produto.pat_movimentos x where x.id = movimento;
  if f is null or produto.meu_papel(f) is distinct from 'casal' then raise exception 'movimento nao encontrado ou sem permissao' using errcode = '42501'; end if;
  update produto.pat_movimentos x set anulado_em = now() where x.id = movimento and x.anulado_em is null;
  return (produto._guardado(f, produto._hoje()) || jsonb_build_object('desfeito', movimento))::json;
end $function$
;

-- produto.guardado_encerrar(aplicacao uuid)
CREATE OR REPLACE FUNCTION produto.guardado_encerrar(aplicacao uuid)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare f uuid;
begin
  select x.familia_id into f from produto.pat_aplicacoes x where x.id = aplicacao;
  if f is null or produto.meu_papel(f) is distinct from 'casal' then raise exception 'aplicacao nao encontrada ou sem permissao' using errcode = '42501'; end if;
  update produto.pat_aplicacoes x set encerrada_em = now() where x.id = aplicacao and x.encerrada_em is null;
  return (produto._guardado(f, produto._hoje()) || jsonb_build_object('encerrada', aplicacao))::json;
end $function$
;

-- produto.guardado_hoje(familia uuid)
CREATE OR REPLACE FUNCTION produto.guardado_hoje(familia uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
begin
  if produto.meu_papel(familia) is distinct from 'casal' then raise exception 'so o casal ve o Guardado' using errcode = '42501'; end if;
  return produto._guardado(familia, produto._hoje())::json;
end $function$
;

-- produto.guardado_movimentar(aplicacao uuid, tipo text, valor numeric, data date, chave uuid)
CREATE OR REPLACE FUNCTION produto.guardado_movimentar(aplicacao uuid, tipo text, valor numeric, data date DEFAULT NULL::date, chave uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select produto._guardado_movimentar(aplicacao, tipo, valor, data, chave, produto._hoje())::json
$function$
;

-- produto.ia_fechar(p_id uuid, p_tokens_entrada integer, p_tokens_saida integer, p_custo numeric)
CREATE OR REPLACE FUNCTION produto.ia_fechar(p_id uuid, p_tokens_entrada integer, p_tokens_saida integer, p_custo numeric)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n int;
begin
  update produto.ia_chamadas c set tokens_entrada = greatest(0, coalesce(p_tokens_entrada, 0)), tokens_saida = greatest(0, coalesce(p_tokens_saida, 0)),
         custo_brl = greatest(0, coalesce(p_custo, 0))
   where c.id = p_id and c.criado_em > now() - interval '15 minutes';
  get diagnostics n = row_count;
  return n = 1;
end $function$
;

-- produto.ia_gasto_mes(p_familia uuid)
CREATE OR REPLACE FUNCTION produto.ia_gasto_mes(p_familia uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce(sum(c.custo_brl), 0)::numeric(10,4)
  from produto.ia_chamadas c
  where c.familia_id = p_familia
    and c.criado_em >= (date_trunc('month', now() at time zone 'America/Recife') at time zone 'America/Recife');
$function$
;

-- produto.ia_reservar(p_familia uuid, p_user uuid, p_funcao text, p_modelo text, p_custo_max numeric, p_teto numeric, p_teto_geral numeric)
CREATE OR REPLACE FUNCTION produto.ia_reservar(p_familia uuid, p_user uuid, p_funcao text, p_modelo text, p_custo_max numeric, p_teto numeric, p_teto_geral numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_gasto numeric; v_geral numeric; v_min int; v_id uuid := gen_random_uuid();
        v_ini timestamptz := (date_trunc('month', now() at time zone 'America/Recife') at time zone 'America/Recife');
begin
  if p_custo_max is null or p_custo_max <= 0 or p_teto is null or p_teto_geral is null then raise exception 'reserva invalida' using errcode = '22023'; end if;
  if not exists (select 1 from produto.membros m where m.familia_id = p_familia and m.user_id = p_user and m.ativo and m.papel in ('casal','pessoa')) then
    return json_build_object('ok', false, 'motivo', 'familia');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('ia:' || p_familia::text, 0));
  select coalesce(sum(c.custo_brl), 0) into v_gasto from produto.ia_chamadas c where c.familia_id = p_familia and c.criado_em >= v_ini;
  if v_gasto + p_custo_max > p_teto then return json_build_object('ok', false, 'motivo', 'limite', 'gasto', v_gasto); end if;
  select count(*) into v_min from produto.ia_chamadas c where c.familia_id = p_familia and c.criado_em > now() - interval '1 minute';
  if v_min >= 6 then return json_build_object('ok', false, 'motivo', 'ritmo', 'gasto', v_gasto); end if;
  select coalesce(sum(c.custo_brl), 0) into v_geral from produto.ia_chamadas c where c.criado_em >= v_ini;
  if v_geral + p_custo_max > p_teto_geral then return json_build_object('ok', false, 'motivo', 'limite_geral', 'gasto', v_gasto); end if;
  insert into produto.ia_chamadas (id, familia_id, user_id, funcao, modelo, tokens_entrada, tokens_saida, custo_brl)
  values (v_id, p_familia, p_user, left(p_funcao, 60), left(p_modelo, 60), 0, 0, p_custo_max);
  return json_build_object('ok', true, 'id', v_id, 'gasto', v_gasto);
end $function$
;

-- produto.importar_familia_json(dados jsonb, p_dono uuid, p_nome text, p_nome_pessoa text)
CREATE OR REPLACE FUNCTION produto.importar_familia_json(dados jsonb, p_dono uuid, p_nome text DEFAULT NULL::text, p_nome_pessoa text DEFAULT 'Romero'::text)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  c jsonb := coalesce(dados->'c', dados); d jsonb := coalesce(dados->'d', dados->'config', '{}'::jsonb);
  envs_in jsonb := coalesce(c->'envelopes', '{}'::jsonb);
  def jsonb := '{
    "romero":  {"nome":"Romero","regra":"mensal","limite_mes":10000,"casa":false,"ordem":1},
    "andreza": {"nome":"Andreza","regra":"diario","limite_mes":6000,"casa":false,"peso_fds":1.5,"colchao":300,"ordem":2},
    "feira":   {"nome":"Feira da casa","regra":"semanal","limite_mes":5000,"casa":true,"ordem":3},
    "casa":    {"nome":"Casa","regra":"mensal","limite_mes":0,"casa":true,"ordem":4}}'::jsonb;
  v_fam uuid := gen_random_uuid(); k text; e jsonb; eid uuid; mapa_env jsonb := '{}'::jsonb; mapa_cart jsonb := '{}'::jsonb;
  l jsonb; v_data date; n int; v_env uuid; v_cart uuid; v_desc text; lim_k text;
  n_lanc int := 0; n_receita int := 0; n_ex int := 0; n_sem_env int := 0; n_parc int := 0; sem_env uuid;
begin
  if p_dono is null then raise exception 'falta o user_id do dono (login real)'; end if;
  insert into produto.familias (id, nome) values (v_fam, coalesce(p_nome, d->'config/familia'->>'nome', d->'familia'->>'nome', 'Família'));
  insert into produto.membros (familia_id, user_id, papel, nome) values (v_fam, p_dono, 'casal', p_nome_pessoa);

  -- envelopes: padrão do app + o que estiver salvo no banco
  for k in select jsonb_object_keys(def || envs_in) loop
    e := coalesce(def->k, '{}'::jsonb) || coalesce(envs_in->k, '{}'::jsonb);
    continue when coalesce((e->>'apagado')::boolean, false);
    -- Feira com o padrão antigo (15.167 nunca editado ou nunca salvo) vira 5.000 a partir de nov/2026 (D-2A-2b)
    if k = 'feira' and (envs_in->'feira' is null or (abs(coalesce((e->>'limite_mes')::numeric,0) - 15167) < 0.01
         and (e->'limites' is null or not exists (select 1 from jsonb_each_text(e->'limites') x where abs(x.value::numeric - 15167) >= 0.01)))) then
      e := e || jsonb_build_object('limite_mes', 5000, 'limites', jsonb_build_object('0000-01', 15167, '2026-11', 5000));
    end if;
    eid := gen_random_uuid();
    insert into produto.envelopes (id, familia_id, nome, regra, limite_mes, colchao, casa, peso_fds)
    values (eid, v_fam, coalesce(e->>'nome', k), coalesce(e->>'regra','mensal'), coalesce((e->>'limite_mes')::numeric, 0),
            coalesce((e->>'colchao')::numeric, 0), coalesce((e->>'casa')::boolean, (e->>'dono') = 'Casa', false), coalesce((e->>'peso_fds')::numeric, 1.5));
    for lim_k in select jsonb_object_keys(coalesce(e->'limites', '{}'::jsonb)) loop
      insert into produto.limites_mes (familia_id, envelope_id, mes, valor) values (v_fam, eid, lim_k, (e->'limites'->>lim_k)::numeric);
    end loop;
    mapa_env := mapa_env || jsonb_build_object(k, eid);
  end loop;

  -- cartões (o removido fica guardado e inativo, pra fatura antiga continuar certa)
  for k in select jsonb_object_keys(coalesce(c->'cartoes', '{}'::jsonb)) loop
    e := c->'cartoes'->k;
    continue when coalesce((e->>'ex')::boolean, false);
    v_cart := gen_random_uuid();
    insert into produto.cartoes (id, familia_id, nome, dia_fechamento, dia_vencimento, ativo)
    values (v_cart, v_fam, coalesce(e->>'nome', k), (e->>'fecha')::smallint, (e->>'vence')::smallint, not coalesce((e->>'apagado')::boolean, false));
    mapa_cart := mapa_cart || jsonb_build_object(k, v_cart);
  end loop;

  -- lançamentos: só gastos (entradas e transferências não têm tabela no produto ainda; vão contadas no resultado)
  for k in select jsonb_object_keys(coalesce(c->'lancamentos', '{}'::jsonb)) loop
    l := c->'lancamentos'->k;
    if coalesce((l->>'ex')::boolean, false) then n_ex := n_ex + 1; continue; end if;
    if coalesce(l->>'tipo','despesa') <> 'despesa' then n_receita := n_receita + 1; continue; end if;
    v_env := (mapa_env->>(l->>'envelope'))::uuid;
    if v_env is null then
      if sem_env is null then
        sem_env := gen_random_uuid();
        insert into produto.envelopes (id, familia_id, nome, regra, limite_mes, casa) values (sem_env, v_fam, 'Sem envelope', 'mensal', 0, false);
      end if;
      v_env := sem_env; n_sem_env := n_sem_env + 1;
    end if;
    v_cart := (mapa_cart->>(l->>'conta'))::uuid;
    v_data := (l->>'data')::date;
    v_desc := l->>'descricao';
    -- parcela 2 em diante: mesmo dia da compra nos meses seguintes (diaPeso do app)
    n := coalesce((l->'parcela'->>'n')::int, 1);
    if n > 1 then
      v_data := make_date(extract(year from (date_trunc('month', v_data) + (n-1) * interval '1 month'))::int,
                          extract(month from (date_trunc('month', v_data) + (n-1) * interval '1 month'))::int,
                          least(extract(day from v_data)::int, extract(day from (date_trunc('month', v_data) + n * interval '1 month' - interval '1 day'))::int));
    end if;
    if (l->'parcela'->>'de')::int > 1 then v_desc := coalesce(v_desc,'') || ' (' || n || '/' || (l->'parcela'->>'de') || ')'; n_parc := n_parc + 1; end if;
    insert into produto.lancamentos (familia_id, envelope_id, cartao_id, valor, data, descricao, autor, criado_em)
    values (v_fam, v_env, v_cart, round((l->>'valor')::numeric, 2), v_data, v_desc, p_dono, coalesce((l->>'criadoEm')::timestamptz, now()));
    n_lanc := n_lanc + 1;
  end loop;

  -- configuração: rendas, metas e dados da família ficam guardados como estão
  insert into produto.config_familia (familia_id, chave, valor, atualizado_por)
  select v_fam, x.chave, x.valor, p_dono from (values
    ('rendas', c->'rendas'), ('metas', c->'metas'), ('familia', d->'config/familia')) x(chave, valor) where x.valor is not null;

  return json_build_object('familia_id', v_fam, 'envelopes', mapa_env, 'cartoes', mapa_cart,
    'gastos_gravados', n_lanc, 'parcelas', n_parc, 'entradas_e_transferencias_fora', n_receita, 'exemplos_fora', n_ex, 'sem_envelope', n_sem_env);
end $function$
;

-- produto.indice_informar(data date, cdi_dia numeric, selic_meta numeric, fonte text)
CREATE OR REPLACE FUNCTION produto.indice_informar(data date, cdi_dia numeric, selic_meta numeric DEFAULT NULL::numeric, fonte text DEFAULT 'manual'::text)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is null or not exists (select 1 from produto.donos_produto d where d.user_id = (select auth.uid())) then
    raise exception 'so o dono do produto informa a taxa' using errcode = '42501';
  end if;
  if indice_informar.data is null or indice_informar.data > produto._hoje() or indice_informar.data < '2020-01-01' then raise exception 'data invalida' using errcode = '22023'; end if;
  if cdi_dia is null or cdi_dia <= 0 or cdi_dia >= 0.2 then raise exception 'cdi_dia e a taxa em %% ao dia, por exemplo 0.050788' using errcode = '22023'; end if;
  insert into produto.pat_indices as i (data, cdi_dia, selic_meta, fonte)
  values (indice_informar.data, indice_informar.cdi_dia, indice_informar.selic_meta, left(coalesce(nullif(btrim(indice_informar.fonte), ''), 'manual'), 60))
  on conflict (data) do update set cdi_dia = excluded.cdi_dia, selic_meta = coalesce(excluded.selic_meta, i.selic_meta), fonte = excluded.fonte, atualizado_em = now();
  return json_build_object('data', indice_informar.data, 'cdi_dia', indice_informar.cdi_dia,
    'pct_ano', round((power(1 + indice_informar.cdi_dia / 100, 252) - 1) * 100, 2), 'fonte', coalesce(nullif(btrim(indice_informar.fonte), ''), 'manual'));
end $function$
;

-- produto.indices_buscar()
CREATE OR REPLACE FUNCTION produto.indices_buscar()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare r record; e jsonb; n int := 0; falta boolean; d date; v numeric;
begin
  if to_regprocedure('net.http_get(text,jsonb,jsonb,integer)') is null then
    return 'sem pg_net: informe a taxa com produto.indice_informar(data, cdi_dia)';
  end if;
  begin
    for r in execute 'select content from net._http_response where status_code = 200 and created > now() - interval ''6 hours'' and content like ''[{"data":"%''' loop
      for e in select x from jsonb_array_elements(r.content::jsonb) x loop
        d := to_date(e->>'data', 'DD/MM/YYYY'); v := (e->>'valor')::numeric;
        if v < 0.5 then
          insert into produto.pat_indices as i (data, cdi_dia, fonte) values (d, v, 'BCB SGS 12')
          on conflict (data) do update set cdi_dia = excluded.cdi_dia, fonte = excluded.fonte, atualizado_em = now()
          where i.cdi_dia is distinct from excluded.cdi_dia or i.fonte <> excluded.fonte;
        elsif produto._dia_util(d) then
          insert into produto.pat_indices as i (data, selic_meta, fonte) values (d, v, 'BCB SGS 432')
          on conflict (data) do update set selic_meta = excluded.selic_meta, atualizado_em = now() where i.selic_meta is distinct from excluded.selic_meta;
        end if;
        n := n + 1;
      end loop;
    end loop;
    d := produto._hoje() - 1;
    while not produto._dia_util(d) loop d := d - 1; end loop;
    falta := not exists (select 1 from produto.pat_indices x where x.data = d and x.fonte like 'BCB%' and x.cdi_dia is not null);
    if falta then
      execute 'select net.http_get(url := ''https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/20?formato=json'')';
      execute 'select net.http_get(url := ''https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/5?formato=json'')';
    end if;
    return 'pg_net: ' || n || ' linha(s) lidas' || case when falta then ', pedido novo enviado ao Banco Central' else ', taxa em dia' end;
  exception when others then
    return 'pg_net falhou: ' || sqlerrm;
  end;
end $function$
;

-- produto.lancar(familia uuid, envelope uuid, valor numeric, data date, descricao text, cartao uuid, segundos numeric)
CREATE OR REPLACE FUNCTION produto.lancar(familia uuid, envelope uuid, valor numeric, data date DEFAULT NULL::date, descricao text DEFAULT NULL::text, cartao uuid DEFAULT NULL::uuid, segundos numeric DEFAULT NULL::numeric)
 RETURNS json
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select produto._lancar(familia, envelope, valor, data, descricao, cartao, segundos, null) $function$
;

-- produto.lancar_com_chave(familia uuid, envelope uuid, valor numeric, chave uuid, data date, descricao text, cartao uuid, segundos numeric)
CREATE OR REPLACE FUNCTION produto.lancar_com_chave(familia uuid, envelope uuid, valor numeric, chave uuid, data date DEFAULT NULL::date, descricao text DEFAULT NULL::text, cartao uuid DEFAULT NULL::uuid, segundos numeric DEFAULT NULL::numeric)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if chave is null then raise exception 'falta a chave do toque' using errcode = '22023'; end if;
  return produto._lancar(familia, envelope, valor, data, descricao, cartao, segundos, chave);
end $function$
;

-- produto.lembrete_adiar(lembrete uuid, ate timestamp with time zone)
CREATE OR REPLACE FUNCTION produto.lembrete_adiar(lembrete uuid, ate timestamp with time zone)
 RETURNS json
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select produto._lembrete_mexer(lembrete, 'adiar', ate, now())::json $function$
;

-- produto.lembrete_apagar(lembrete uuid)
CREATE OR REPLACE FUNCTION produto.lembrete_apagar(lembrete uuid)
 RETURNS json
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select produto._lembrete_mexer(lembrete, 'apagar', null, now())::json $function$
;

-- produto.lembrete_concluir(lembrete uuid)
CREATE OR REPLACE FUNCTION produto.lembrete_concluir(lembrete uuid)
 RETURNS json
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select produto._lembrete_mexer(lembrete, 'concluir', null, now())::json $function$
;

-- produto.lembrete_criar(familia uuid, titulo text, quando timestamp with time zone, repetir text, detalhe text, para text, chave uuid)
CREATE OR REPLACE FUNCTION produto.lembrete_criar(familia uuid, titulo text, quando timestamp with time zone, repetir text DEFAULT 'nunca'::text, detalhe text DEFAULT NULL::text, para text DEFAULT 'casal'::text, chave uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
end $function$
;

-- produto.meu_papel(p_familia uuid)
CREATE OR REPLACE FUNCTION produto.meu_papel(p_familia uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select m.papel from produto.membros m
  where m.user_id = (select auth.uid()) and m.ativo and m.familia_id = p_familia
$function$
;

-- produto.meus_envelopes()
CREATE OR REPLACE FUNCTION produto.meus_envelopes()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select e.id from produto.envelopes e
  join produto.membros m on m.familia_id = e.familia_id
  where m.user_id = (select auth.uid()) and m.ativo
    and (m.papel = 'casal'
      or (m.papel = 'pessoa' and e.id = m.envelope_id)
      or (m.papel = 'equipe' and e.casa))
$function$
;

-- produto.minhas_familias()
CREATE OR REPLACE FUNCTION produto.minhas_familias()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select m.familia_id from produto.membros m
  where m.user_id = (select auth.uid()) and m.ativo
$function$
;

-- produto.numeros_semana()
CREATE OR REPLACE FUNCTION produto.numeros_semana()
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is null or not exists (select 1 from produto.donos_produto d where d.user_id = (select auth.uid())) then
    raise exception 'so o dono do produto ve os 4 numeros' using errcode = '42501';
  end if;
  return produto._numeros(now())::json;
end $function$
;

-- produto.restaurar_lancamento(id uuid)
CREATE OR REPLACE FUNCTION produto.restaurar_lancamento(id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare n int; v_fam uuid;
begin
  update produto.lancamentos l set apagado_em = null where l.id = restaurar_lancamento.id and l.apagado_em is not null returning l.familia_id into v_fam;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'lancamento nao esta na lixeira ou sem permissao' using errcode = 'P0002'; end if;
  return json_build_object('id', restaurar_lancamento.id, 'na_lixeira', false, 'resumo', produto._resumo(v_fam, produto._hoje()));
end $function$
;

-- produto.resumo_hoje(familia uuid)
CREATE OR REPLACE FUNCTION produto.resumo_hoje(familia uuid)
 RETURNS json
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select produto._resumo(familia, produto._hoje())::json $function$
;

-- produto.rodar_testes_noturnos()
CREATE OR REPLACE FUNCTION produto.rodar_testes_noturnos()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare rid uuid := gen_random_uuid(); n_falha int; quebrou text; n_conta int; n_conta_ruim int; tc record;
begin
  begin
    n_conta := 0; n_conta_ruim := 0;
    for tc in select t.caso, t.ok from produto.teste_conta() t loop
      n_conta := n_conta + 1;
      if not tc.ok then
        n_conta_ruim := n_conta_ruim + 1;
        insert into produto.teste_resultados (rodada, teste, caso, ok) values (rid, 'teste_conta', tc.caso, false);
      end if;
    end loop;
    insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe)
    values (rid, 'teste_conta', 'resumo das contas de todas as famílias', true, n_conta || ' casos conferidos, ' || n_conta_ruim || ' com erro');
    insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe) select rid, 'teste_contas_casos', t.caso, t.ok, 'esperado ' || coalesce(t.esperado,'') || ', obtido ' || coalesce(t.obtido,'') from produto.teste_contas_casos() t;
    insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe) select rid, 'teste_vazamento', t.caso, t.ok, 'esperado ' || coalesce(t.esperado,'') || ', obtido ' || coalesce(t.obtido,'') from produto.teste_vazamento() t;
    insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe) select rid, 'teste_guardado', t.caso, t.ok, 'esperado ' || coalesce(t.esperado,'') || ', obtido ' || coalesce(t.obtido,'') from produto.teste_guardado() t;
    insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe) select rid, 'teste_escritorio', t.caso, t.ok, 'esperado ' || coalesce(t.esperado,'') || ', obtido ' || left(coalesce(t.obtido,''), 300) from produto.teste_escritorio() t;
  exception when others then quebrou := sqlerrm;
  end;
  if quebrou is not null then
    insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe) values (rid, 'turno', 'precisa de você', false, 'o turno de teste quebrou: ' || quebrou);
    return 'precisa de você: ' || quebrou;
  end if;
  select count(*) into n_falha from produto.teste_resultados r where r.rodada = rid and not r.ok;
  insert into produto.teste_resultados (rodada, teste, caso, ok, detalhe)
  values (rid, 'turno', case when n_falha = 0 then 'tudo certo' else 'precisa de você' end, n_falha = 0,
          n_falha || ' caso(s) falharam de ' || (select count(*) from produto.teste_resultados r where r.rodada = rid));
  return case when n_falha = 0 then 'tudo certo' else 'precisa de você: ' || n_falha || ' caso(s) falharam' end;
end $function$
;

-- produto.teste_conta()
CREATE OR REPLACE FUNCTION produto.teste_conta()
 RETURNS TABLE(caso text, ok boolean)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare f record; r jsonb; hoje date := produto._hoje(); okv boolean; m date; ini date; fim date; tot_cart numeric; tot_fat numeric; nmeses int;
begin
  for f in select x.id, x.nome from produto.familias x order by x.nome loop
    r := produto._resumo(f.id, hoje);
    okv := abs((r->>'livre_mes')::numeric - (select coalesce(sum((v->>'livre')::numeric),0) from jsonb_array_elements(r->'envelopes') v where jsonb_typeof(v->'livre') = 'number')) < 0.01
       and not exists (select 1 from jsonb_array_elements(r->'envelopes') v where v->>'regra' = 'mensal'
             and abs((v->>'gasto_mes')::numeric - (select coalesce(sum(l.valor),0) from produto.lancamentos l
                  where l.envelope_id = (v->>'id')::uuid and l.apagado_em is null and date_trunc('month', l.data) = date_trunc('month', hoje))) >= 0.01);
    select coalesce(sum(l.valor),0), min(l.data), max(l.data) into tot_cart, ini, fim
      from produto.lancamentos l where l.familia_id = f.id and l.cartao_id is not null and l.apagado_em is null;
    if ini is not null then
      nmeses := (extract(year from age(date_trunc('month', fim), date_trunc('month', ini))) * 12 + extract(month from age(date_trunc('month', fim), date_trunc('month', ini))))::int + 3;
      select coalesce(sum((v->>'total')::numeric),0) into tot_fat from jsonb_array_elements(produto._faturas(f.id, ini, nmeses)) v;
      okv := okv and abs(tot_fat - tot_cart) < 0.01;
    end if;
    caso := f.nome || ': a soma bate (livre do mês, gastos e faturas)'; ok := okv; return next;

    okv := true;
    select min(l.data) into ini from produto.lancamentos l where l.familia_id = f.id and l.apagado_em is null;
    m := date_trunc('month', coalesce(ini, hoje))::date;
    while m <= date_trunc('month', hoje)::date loop
      r := produto._resumo(f.id, least(hoje, (m + interval '1 month' - interval '1 day')::date));
      okv := okv and (r->>'colchao')::numeric >= 0 and (r->>'pode_gastar_hoje')::numeric >= 0
         and not exists (select 1 from jsonb_array_elements(r->'envelopes') v
               where (v->>'colchao')::numeric < 0 or (v->>'colchao')::numeric > (v->>'colchao_meta')::numeric
                  or (jsonb_typeof(v->'hoje') = 'number' and (v->>'hoje')::numeric < 0));
      m := (m + interval '1 month')::date;
    end loop;
    caso := f.nome || ': nenhum mês abaixo do colchão'; ok := okv; return next;

    caso := f.nome || ': nenhum lançamento repetido';
    ok := not exists (select 1 from produto.lancamentos a join produto.lancamentos b
            on a.familia_id = b.familia_id and a.envelope_id = b.envelope_id and a.valor = b.valor and a.data = b.data
           and a.descricao is not distinct from b.descricao and a.cartao_id is not distinct from b.cartao_id and a.autor = b.autor
           and a.id < b.id and abs(extract(epoch from (a.criado_em - b.criado_em))) < 10
           where a.familia_id = f.id and a.apagado_em is null and b.apagado_em is null);
    return next;
  end loop;
end $function$
;

-- produto.teste_contas_casos()
CREATE OR REPLACE FUNCTION produto.teste_contas_casos()
 RETURNS TABLE(caso text, esperado text, obtido text, ok boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  silva constant uuid := 'f0000000-0000-4e0e-8000-000000000001';
  feira constant uuid := 'e0000000-0000-4e0e-8000-000000000011';
  contas constant uuid := 'e0000000-0000-4e0e-8000-000000000012';
  lazer constant uuid := 'e0000000-0000-4e0e-8000-000000000013';
  cartao_ana constant uuid := 'c0000000-0000-4e0e-8000-000000000011';
  ana constant text := 'a0000000-0000-4e0e-8000-0000000000a1';
  davi constant text := 'a0000000-0000-4e0e-8000-0000000000d1';
  dia constant date := '2026-11-11';
  r jsonb; j json; res text[] := '{}'; i int; lid uuid; a text; b text;
  function_env jsonb;
begin
  begin
    insert into produto.limites_mes (familia_id, envelope_id, mes, valor) values (silva, feira, '2026-11', 5000)
      on conflict (envelope_id, mes) do update set valor = excluded.valor;
    r := produto._resumo(silva, dia);
    select v into function_env from jsonb_array_elements(r->'envelopes') v where v->>'id' = feira::text;
    res := res || array['Feira R$ 5.000 por mês vira quanto por semana', '1153.85', function_env->>'teto_semana'];
    res := res || array['Feira de novembro (5 segundas, a 5ª sai do pote)', '5769.25', function_env->>'limite_mes'];
    raise exception using errcode = 'P0001', message = 'desfazer';
  exception when sqlstate 'P0001' then null; end;

  begin
    insert into produto.limites_mes (familia_id, envelope_id, mes, valor) values (silva, feira, '2026-11', 15167)
      on conflict (envelope_id, mes) do update set valor = excluded.valor;
    r := produto._resumo(silva, dia);
    select v into function_env from jsonb_array_elements(r->'envelopes') v where v->>'id' = feira::text;
    res := res || array['Feira R$ 15.167 por mês vira R$ 3.500,08 por semana (tela mostra R$ 3.500)', '3500.08', function_env->>'teto_semana'];
    raise exception using errcode = 'P0001', message = 'desfazer';
  exception when sqlstate 'P0001' then null; end;

  r := produto._resumo(silva, '2026-12-02');
  select v into function_env from jsonb_array_elements(r->'envelopes') v where v->>'id' = feira::text;
  res := res || array['Pote da Feira no início de dezembro', '1659.75', function_env->>'pote_inicio'];

  begin
    perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
    set local role authenticated;
    j := produto.lancar(silva, contas, 300, '2026-11-10', 'Teste cartão', cartao_ana, 7.5);
    lid := (j->'lancamento'->>'id')::uuid;
    r := produto._resumo(silva, dia);
    select v into function_env from jsonb_array_elements(r->'envelopes') v where v->>'id' = contas::text;
    a := function_env->>'livre';
    select v->>'total' into b from jsonb_array_elements(produto._faturas(silva, '2026-11-01', 2)) v where v->>'mes' = '2026-12';
    res := res || array['R$ 300 no cartão em 10/11: livre de novembro do envelope (4.750 − 300)', '4450.00', a];
    res := res || array['R$ 300 no cartão em 10/11: entra na fatura de dezembro (1.250 + 300)', '1550.00', b];
    select v->>'total' into b from jsonb_array_elements(produto._faturas(silva, '2026-11-01', 2)) v where v->>'mes' = '2026-11';
    res := res || array['R$ 300 no cartão em 10/11: fatura de novembro não muda', '0', b];
    j := produto.lancar(silva, contas, 300, '2026-11-10', 'Teste cartão', cartao_ana, 7.5);
    res := res || array['Toque duplo em 10 segundos não grava 2 vezes', 'true', j->>'repetido'];
    perform produto.apagar_lancamento(lid);
    r := produto._resumo(silva, dia);
    select v into function_env from jsonb_array_elements(r->'envelopes') v where v->>'id' = contas::text;
    a := function_env->>'livre';
    select v->>'total' into b from jsonb_array_elements(produto._faturas(silva, '2026-11-01', 2)) v where v->>'mes' = '2026-12';
    res := res || array['Lixeira: livre volta pra 4.750 e a fatura de dez pra 1.250', '4750.00 | 1250.00', a || ' | ' || b];
    perform produto.restaurar_lancamento(lid);
    r := produto._resumo(silva, dia);
    select v into function_env from jsonb_array_elements(r->'envelopes') v where v->>'id' = contas::text;
    res := res || array['Restaurar da lixeira desconta de novo', '4450.00', function_env->>'livre'];
    perform produto.lancar(silva, contas, 4000, '2026-11-11', 'Teste colchão', null, 5);
    r := produto._resumo(silva, dia);
    select v into function_env from jsonb_array_elements(r->'envelopes') v where v->>'id' = contas::text;
    res := res || array['Colchão cobre quando o mês aperta (livre 450, colchão 450, hoje 0)', '450.00 | 450.00 | 0.00',
                        (function_env->>'livre') || ' | ' || (function_env->>'colchao') || ' | ' || (function_env->>'hoje')];
    perform produto.lancar(silva, contas, 1500, '2026-11-11', 'Teste colchão 2', null, 5);
    r := produto._resumo(silva, dia);
    select v into function_env from jsonb_array_elements(r->'envelopes') v where v->>'id' = contas::text;
    res := res || array['Colchão nunca fica negativo (livre −1.050, colchão 0, hoje 0)', '-1050.00 | 0 | 0.00',
                        (function_env->>'livre') || ' | ' || (function_env->>'colchao') || ' | ' || (function_env->>'hoje')];
    res := res || array['Evento de tempo gravado a cada lançamento (3, com segundos)', '3',
                        (select count(*)::text from produto.eventos e where e.familia_id = silva and e.tipo = 'lancamento' and e.segundos is not null and e.criado_em = now())];
    raise exception using errcode = 'P0001', message = 'desfazer';
  exception when sqlstate 'P0001' then null; end;

  r := produto._resumo(silva, '2026-12-01');
  select v into function_env from jsonb_array_elements(r->'envelopes') v where v->>'id' = lazer::text;
  res := res || array['Valor do dia útil 01/12 (900 ÷ 37)', '24.32', function_env->>'valor_dia'];
  r := produto._resumo(silva, '2026-12-05');
  select v into function_env from jsonb_array_elements(r->'envelopes') v where v->>'id' = lazer::text;
  res := res || array['Sábado 05/12 sem gasto antes (900 × 1,5 ÷ 33)', '40.91', function_env->>'valor_dia'];
  select (produto._diario(lazer, '2026-12-05')->>'valor_dia_plano') into a;
  res := res || array['Plano do sábado = 1,5 × dia útil (900 × 1,5 ÷ 37)', '36.49', a];

  begin
    perform set_config('request.jwt.claims', json_build_object('sub', davi, 'role', 'authenticated')::text, true);
    set local role authenticated;
    r := produto._resumo(silva, dia);
    res := res || array['Davi (pessoa) em 11/11: pode gastar hoje = (400 − 35) ÷ 20 dias, e só vê 1 envelope', '18.25 | 1',
                        (r->>'pode_gastar_hoje') || ' | ' || jsonb_array_length(r->'envelopes')::text];
    raise exception using errcode = 'P0001', message = 'desfazer';
  exception when sqlstate 'P0001' then null; end;

  i := 1;
  while i <= array_length(res, 1) loop
    caso := res[i]; esperado := res[i+1]; obtido := res[i+2]; ok := esperado is not distinct from obtido; return next;
    i := i + 3;
  end loop;
end $function$
;

-- produto.teste_escritorio()
CREATE OR REPLACE FUNCTION produto.teste_escritorio()
 RETURNS TABLE(caso text, esperado text, obtido text, ok boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  res text[] := '{}'; i int; c record; obt text; e jsonb; q jsonb; j jsonb; n int; txt text; todas text := '';
  f uuid := gen_random_uuid(); u uuid := gen_random_uuid(); ue uuid := gen_random_uuid(); mb uuid := gen_random_uuid(); me uuid := gen_random_uuid();
  ef uuid := gen_random_uuid(); ec uuid := gen_random_uuid(); cn uuid := gen_random_uuid(); cm uuid := gen_random_uuid(); cs uuid := gen_random_uuid();
  ax uuid := gen_random_uuid(); ab uuid := gen_random_uuid(); lb uuid := gen_random_uuid(); i1 uuid := gen_random_uuid(); i2 uuid := gen_random_uuid(); fid uuid; l2 uuid := gen_random_uuid();
  cu text; ceq text;
  carla constant text := 'a0000000-0000-4e0e-8000-0000000000c1'; davi constant text := 'a0000000-0000-4e0e-8000-0000000000d1';
  paulo constant text := 'a0000000-0000-4e0e-8000-0000000000f2'; silva constant text := 'f0000000-0000-4e0e-8000-000000000001';
begin
  cu := json_build_object('sub', u, 'role', 'authenticated')::text; ceq := json_build_object('sub', ue, 'role', 'authenticated')::text;
  begin
    insert into produto.familias (id, nome, exemplo) values (f, 'Teste Escritorio', true);
    insert into produto.membros (id, familia_id, user_id, papel, nome) values (mb, f, u, 'casal', 'Romero Teste'), (me, f, ue, 'equipe', 'Givaldo');
    insert into produto.envelopes (id, familia_id, nome, regra, limite_mes, colchao, casa) values (ef, f, 'Feira', 'semanal', 5000, 0, true), (ec, f, 'Contas', 'mensal', 6000, 1000, false);
    insert into produto.cartoes (id, familia_id, nome, dia_fechamento, dia_vencimento) values (cn, f, 'Nubank', 8, 15), (cm, f, 'Mensal', 15, 22), (cs, f, 'Sem dia', null, null);
    insert into produto.cartao_custos (familia_id, cartao_id, limite, taxa_valor, taxa_periodo, taxa_mes, taxa_isenta_acima) values (f, cn, 8000, 480, 'ano', 12, null), (f, cm, 3000, 30, 'mes', null, 1000);
    insert into produto.lancamentos (familia_id, envelope_id, cartao_id, valor, data, descricao, autor) values
      (f, ec, cn, 2340, '2026-10-20', 'Compra no cartão', u), (f, ec, null, 5500, '2026-11-10', 'Conserto', u);
    insert into produto.config_familia (familia_id, chave, valor) values
      (f, 'casa_folha', '{"pessoas":[{"id":"p1","nome":"Maria","funcao":"Cozinheira","salario":1800,"diaPagamento":5}]}'),
      (f, 'casa_prestadores', '[{"id":"j1","dia":6,"nome":"Seu Zé","servico":"Jardineiro","valor":150}]'),
      (f, 'casa_gas', '{"custo":120,"trocas":["2026-09-01","2026-10-02","2026-11-01"]}');
    insert into produto.pat_aplicacoes (id, familia_id, titular_membro, nome, banco, tipo, pct_cdi, isento_ir, liquidez, vence_em, criado_por) values
      (ax, f, mb, 'Caixinha', 'Banco A', 'caixinha', 100, false, 'diaria', null, u), (ab, f, mb, 'CDB', 'Banco B', 'cdb', 110, false, 'vencimento', '2026-11-25', u);
    insert into produto.pat_movimentos (familia_id, aplicacao_id, data, tipo, valor, chave, autor) values
      (f, ax, '2026-10-01', 'aporte', 10000, gen_random_uuid(), u), (f, ab, '2026-05-11', 'aporte', 20000, gen_random_uuid(), u);
    insert into produto.esc_lembretes (id, familia_id, criado_por, titulo, quando, para) values (lb, f, u, 'Ligar pro contador', produto._t('2026-11-12 09:00'), 'casal');
    insert into produto.estoque_itens (id, familia_id, nome, categoria) values (i1, f, 'Café', 'Comida'), (i2, f, 'Arroz', 'Comida');
    perform set_config('request.jwt.claims', cu, true);

    -- FOLHA DA CASA
    e := produto._escritorio(f, produto._t('2026-11-01 10:00')); q := produto._esc_achar(e, 'dae:2026-11'); todas := todas || e::text;
    res := res || array['Folha: dia 1 pergunta da guia do governo, com o nome da pessoa e a sigla explicada', 'sim', produto._tem(q->>'pergunta', 'Romero, a guia do governo de quem trabalha na casa (a guia DAE) vence dia 07/11.', 'Já pagou?')];
    res := res || array['Folha: a fala tem as 4 partes (vi, por que importa, sugestão e botões com verbo)', 'sim/3', produto._tem(q->'partes'->>'importa', 'Faltam 6 dias', 'multa') || '/' || jsonb_array_length(q->'opcoes')];
    j := produto._esc_responder(f, q->>'id', 'paguei_hoje', '{}', produto._t('2026-11-03 10:00'));
    res := res || array['Folha: Paguei hoje grava a guia paga no cadastro', '2026-11-03', (select x.valor->'daePaga'->>'2026-11' from produto.config_familia x where x.familia_id = f and x.chave = 'casa_folha')];
    res := res || array['Folha: a resposta devolve "anotado às HH:MM"', 'anotado às 10:00', j->'anotado'->>'texto'];
    e := produto._escritorio(f, produto._t('2026-11-03 11:00'));
    res := res || array['Folha: pergunta da guia some depois de respondida', '(nada)', produto._tem(produto._esc_achar(e, 'dae:')->>'id', 'x')];
    e := produto._escritorio(f, produto._t('2026-11-04 10:00'));
    res := res || array['Folha: antes do dia do salário não pergunta', '(nada)', produto._tem(produto._esc_achar(e, 'salario:')->>'id', 'x')];
    e := produto._escritorio(f, produto._t('2026-11-05 10:00')); q := produto._esc_achar(e, 'salario:p1'); todas := todas || e::text;
    res := res || array['Folha: no dia do salário pergunta, com o valor', 'sim', produto._tem(q->>'pergunta', 'hoje é dia do salário de Maria (R$ 1.800,00)', 'Já pagou?')];
    perform produto._esc_responder(f, q->>'id', 'paguei', '{"valor": 1800}', produto._t('2026-11-05 10:05'));
    res := res || array['Folha: Paguei grava o salário pago com o valor', '1800', (select x.valor->'salarioPago'->'p1:2026-11'->>'valor' from produto.config_familia x where x.familia_id = f and x.chave = 'casa_folha')];
    begin perform produto._esc_responder(f, 'salario:p1:2026-11', 'paguei', '{}', produto._t('2026-11-05 10:06')); obt := 'aceitou'; exception when others then obt := 'recusou'; end;
    res := res || array['Botão que pede valor recusa resposta sem valor', 'recusou', obt];

    -- FISCAL DA FEIRA
    e := produto._escritorio(f, produto._t('2026-11-09 17:00'));
    res := res || array['Fiscal: segunda antes das 18h não pergunta nada', '0', (select count(*)::text from jsonb_array_elements(e->'precisa_de_voce') x where x->>'funcionario' = 'fiscal_feira')];
    e := produto._escritorio(f, produto._t('2026-11-09 19:00')); q := produto._esc_achar(e, 'feira_feita:'); todas := todas || e::text;
    res := res || array['Fiscal: segunda 18h pergunta se a feira foi feita (1ª frase)', 'sim', produto._tem(q->>'pergunta', 'Romero, a feira desta semana ainda não apareceu aqui.', 'Foi feita?')];
    res := res || array['Fiscal: cobra 1 coisa por vez', '1', (select count(*)::text from jsonb_array_elements(e->'precisa_de_voce') x where x->>'funcionario' = 'fiscal_feira')];
    e := produto._escritorio(f, produto._t('2026-11-10 10:00')); q := produto._esc_achar(e, 'feira_feita:');
    res := res || array['Fiscal: 2ª cobrança muda a frase e diz há quanto tempo espera', 'sim/2', produto._tem(q->>'pergunta', 'continua sem registro desde ontem') || '/' || (q->>'variacao')];
    res := res || array['Fiscal: 3ª cobrança (3 dias depois) é outra frase', 'sim/3', (select produto._tem(x->>'pergunta', 'já é quinta e a feira da semana ainda não apareceu') || '/' || (x->>'variacao') from produto._esc_achar(produto._escritorio(f, produto._t('2026-11-12 10:00')), 'feira_feita:') x)];
    perform set_config('request.jwt.claims', ceq, true);
    e := produto._escritorio(f, produto._t('2026-11-10 10:00')); q := produto._esc_achar(e, 'feira_feita:'); todas := todas || e::text;
    res := res || array['Equipe: recebe a pergunta da feira com o 1º nome dela', 'sim', produto._tem(q->>'pergunta', 'Givaldo, a feira desta semana', 'Foi feita?')];
    res := res || array['Equipe: nenhum R$, valor, limite ou salário em nada do que o escritório devolve', 'limpo', case when e::text ~* 'R\$|"valor"|"limite"|salario|"saldo"|"total"' then 'vazou' else 'limpo' end];
    res := res || array['Equipe: só vê os funcionários da Casa', 'comprador,fiscal_feira', (select string_agg(x->>'id', ',' order by x->>'id') from jsonb_array_elements(e->'funcionarios') x)];
    perform produto._esc_responder(f, q->>'id', 'foi_feita', '{"valor": 999}', produto._t('2026-11-10 10:05'));
    select x.id into fid from produto.feiras x where x.familia_id = f;
    res := res || array['Equipe: "Já foi feita" registra a feira sem valor e sem lançamento', '1/0', (select count(*)::text from produto.feiras x where x.familia_id = f and x.lancamento_id is null) || '/' || (select count(*)::text from produto.lancamentos l where l.familia_id = f and l.envelope_id = ef)];
    res := res || array['Equipe: a resposta dela fica no diário sem valor', 'limpo', (select case when d.dados ? 'valor' or d.resposta ~ 'R\$' then 'vazou' else 'limpo' end from produto.esc_diario d where d.familia_id = f and d.ref like 'feira_feita:%' order by d.quando desc limit 1)];
    perform set_config('request.jwt.claims', cu, true);
    e := produto._escritorio(f, produto._t('2026-11-10 11:00')); q := produto._esc_achar(e, 'feira_valor:'); todas := todas || e::text;
    res := res || array['Fiscal: feira registrada pela equipe sem valor vira "Quanto custou?" pro casal', 'sim', produto._tem(q->>'pergunta', 'a feira de 10/11 foi registrada sem o valor', 'Quanto custou?')];
    perform produto._esc_responder(f, q->>'id', 'dizer', '{"valor": 1080}', produto._t('2026-11-10 11:05'));
    res := res || array['Fiscal: dizer o valor cria o lançamento no envelope da Feira', '1080.00/2026-11-10', (select l.valor || '/' || l.data from produto.lancamentos l join produto.feiras x on x.lancamento_id = l.id where x.id = fid and l.envelope_id = ef)];
    e := produto._escritorio(f, produto._t('2026-11-10 12:00')); q := produto._esc_achar(e, 'feira_nota:');
    res := res || array['Fiscal: feira sem nota vira a pergunta da nota, com data e valor', 'sim', produto._tem(q->>'fala', 'a feira de 10/11 (R$ 1.080,00) está sem a nota', 'Sem nota eu não consigo conferir preço nem item', 'Consegue anexar agora?')];
    perform set_config('request.jwt.claims', ceq, true);
    e := produto._escritorio(f, produto._t('2026-11-10 12:00')); q := produto._esc_achar(e, 'feira_nota:'); todas := todas || e::text;
    res := res || array['Equipe: recebe "anexar a nota" sem o total', 'sim/limpo', produto._tem(q->>'pergunta', 'Givaldo, a feira de 10/11 está sem a nota') || '/' || case when e::text ~* 'R\$|"valor"' then 'vazou' else 'limpo' end];
    j := produto._esc_responder(f, q->>'id', 'anexar', '{}', produto._t('2026-11-10 12:10'));
    res := res || array['Anexar sem a foto ainda: devolve o caminho pra subir e volta em 1 hora', f::text || '/' || fid::text || '.jpg', j->'efeito'->>'caminho'];
    j := produto._esc_responder(f, q->>'id', 'anexar', jsonb_build_object('caminho', f::text || '/' || fid::text || '.jpg'), produto._t('2026-11-10 12:20'));
    res := res || array['Equipe: anexar com o caminho grava a nota na feira', 'true', (select (x.nota_caminho is not null)::text from produto.feiras x where x.id = fid)];
    begin perform produto.feira_anexar_nota(fid, silva || '/x.jpg'); obt := 'aceitou'; exception when others then obt := 'recusou'; end;
    res := res || array['Nota com caminho na pasta de outra família', 'recusou', obt];
    perform set_config('request.jwt.claims', cu, true);
    e := produto._escritorio(f, produto._t('2026-11-10 14:00')); q := produto._esc_achar(e, 'estoque:'); todas := todas || e::text;
    res := res || array['Fiscal: com feira e nota em dia, pergunta da contagem do estoque', 'sim', produto._tem(q->>'fala', 'a contagem do estoque desta semana continua sem ser feita desde ontem', 'Sem ela eu não sei o que faltou nem o que sobrou')];
    res := res || array['Fiscal: não pergunta de novo o que já sabe (feira e nota)', '0', (select count(*)::text from jsonb_array_elements(e->'precisa_de_voce') x where x->>'id' like 'feira_%')];
    perform produto._esc_responder(f, q->>'id', 'pedir_equipe', '{}', produto._t('2026-11-10 14:05'));
    res := res || array['Fiscal: "Pedir pra equipe" tira a pergunta do casal', '(nada)', produto._tem(produto._esc_achar(produto._escritorio(f, produto._t('2026-11-10 15:00')), 'estoque:')->>'id', 'x')];
    perform set_config('request.jwt.claims', ceq, true);
    e := produto._escritorio(f, produto._t('2026-11-10 15:00')); q := produto._esc_achar(e, 'estoque:');
    res := res || array['Equipe: recebe "Contar o estoque"', 'Contar o estoque', q->'opcoes'->0->>'rotulo'];
    perform produto._esc_responder(f, q->>'id', 'contar', jsonb_build_object('itens', jsonb_build_array(jsonb_build_object('item_id', i1, 'estado', 'acabou'), jsonb_build_object('item_id', i2, 'estado', 'tem'))), produto._t('2026-11-10 15:10'));
    res := res || array['Equipe: contar grava a contagem da semana', '1', (select count(*)::text from produto.estoque_contagens x where x.familia_id = f and x.semana = '2026-11-09')];
    perform set_config('request.jwt.claims', cu, true);
    e := produto._escritorio(f, produto._t('2026-11-10 16:00')); todas := todas || e::text;
    res := res || array['Fiscal: com tudo em dia entrega 1 linha e não inventa pergunta', 'Feira de 10/11 feita, R$ 1.080,00 de R$ 1.153,85 da semana. Nota anexada. Estoque contado: falta 1 item.',
      (select x->>'resumo' from jsonb_array_elements(e->'entregue') x where x->>'funcionario' = 'fiscal_feira')];
    res := res || array['Fiscal: estado "entregue" e nenhuma pergunta', 'entregue/0', (select (x->>'estado') || '/' || (x->>'pendentes') from jsonb_array_elements(e->'funcionarios') x where x->>'id' = 'fiscal_feira')];

    -- ANALISTA DE CARTAO
    e := produto._escritorio(f, produto._t('2026-11-11 10:00'));
    res := res || array['Cartão: 4 dias antes do vencimento ainda não pergunta', '(nada)', produto._tem(produto._esc_achar(e, 'fatura:')->>'id', 'x')];
    e := produto._escritorio(f, produto._t('2026-11-12 10:00')); q := produto._esc_achar(e, 'fatura:'); todas := todas || e::text;
    res := res || array['Cartão: 3 dias antes pergunta com valor, dia da semana e data', 'sim/1', produto._tem(q->>'fala', 'Romero, a fatura do Nubank fecha em R$ 2.340,00 e vence domingo, 15/11.', 'Faltam 3 dias.', 'Já pagou?') || '/' || (q->>'variacao')];
    res := res || array['Cartão: avisa da anuidade 1 mês antes', 'sim', produto._tem(produto._esc_achar(e, 'anuidade:')->>'fala', 'anuidade de R$ 480,00 do Nubank', 'São R$ 480,00 que ficam com você', 'Quer que eu te lembre de pedir isenção dia 01?')];
    res := res || array['Cartão: cobra o cartão sem dia de fechamento', 'sim', produto._tem(produto._esc_achar(e, 'cartao_dias:')->>'fala', 'o cartão Sem dia está sem o dia que fecha e o dia que vence')];
    res := res || array['Cartão: avisa quando falta pouco pra livrar da mensalidade', 'sim', produto._tem(produto._esc_achar(e, 'mensalidade:')->>'fala', 'Romero, o Mensal fecha dia 15/11', 'Faltam R$ 1.000,00. Se não chegar, o banco cobra os R$ 30,00')];
    perform produto._esc_responder(f, q->>'id', 'ainda_nao', '{}', produto._t('2026-11-12 10:05'));
    res := res || array['Cartão: "Ainda não paguei" some até o dia seguinte', '(nada)', produto._tem(produto._esc_achar(produto._escritorio(f, produto._t('2026-11-12 18:00')), 'fatura:')->>'id', 'x')];
    e := produto._escritorio(f, produto._t('2026-11-13 09:00')); q := produto._esc_achar(e, 'fatura:');
    res := res || array['Cartão: 2ª cobrança muda a frase, lembra a resposta anterior e diz por que importa', 'sim/2', produto._tem(q->>'fala', 'vence em 2 dias e você ainda não me disse se pagou', 'Dia 12/11 você me respondeu: Ainda não paguei.') || '/' || (q->>'variacao')];
    e := produto._escritorio(f, produto._t('2026-11-16 09:00')); q := produto._esc_achar(e, 'fatura:');
    res := res || array['Cartão: 3ª cobrança diz há quantos dias espera e fala dos juros', 'sim/3', produto._tem(q->>'fala', 'pergunto há 4 dias da fatura do Nubank', 'Venceu ontem. Atrasando, o banco cobra juros e multa.') || '/' || (q->>'variacao')];
    perform produto._esc_responder(f, q->>'id', 'paguei_outro_dia', '{"data": "2026-11-14"}', produto._t('2026-11-16 09:05'));
    res := res || array['Cartão: "Paguei outro dia" grava a data e quem pagou', '2026-11-14/true', (select x.paga_em || '/' || (x.paga_por = u) from produto.cartao_faturas x where x.familia_id = f and x.cartao_id = cn and x.mes = '2026-11')];
    e := produto._escritorio(f, produto._t('2026-11-16 10:00'));
    res := res || array['Cartão: fatura paga não é perguntada de novo e vira entrega', '(nada)/sim', produto._tem(produto._esc_achar(e, 'fatura:')->>'id', 'x') || '/' || (select produto._tem(x->>'resumo', 'foi paga dia 14/11') from jsonb_array_elements(e->'entregue') x where x->>'funcionario' = 'analista_cartao' limit 1)];
    res := res || array['Cartão: a resposta aparece no topo de "O que você já me respondeu"', 'Paguei outro dia: 14/11', (select x->'ultimas_respostas'->0->>'resposta' from jsonb_array_elements(e->'funcionarios') x where x->>'id' = 'analista_cartao')];
    j := produto._esc_responder(f, q->>'id', 'paguei_outro_dia', '{"data": "2026-11-15"}', produto._t('2026-11-16 10:10'));
    res := res || array['Corrigir uma resposta grava linha nova e não apaga a antiga', 'true/3/2026-11-15', (j->>'corrigiu') || '/' || (select count(*)::text from produto.esc_diario d where d.familia_id = f and d.ref like 'fatura:%') || '/' || (select x.paga_em::text from produto.cartao_faturas x where x.familia_id = f and x.cartao_id = cn)];
    perform produto.fatura_informar(f, cn, '2026-11', 2512);
    e := produto._escritorio(f, produto._t('2026-11-16 11:00')); q := produto._esc_achar(e, 'fatura_dif:'); todas := todas || e::text;
    res := res || array['Cartão: valor do banco diferente da soma do app vira pergunta', 'sim', produto._tem(q->>'fala', 'o banco cobrou R$ 2.512,00 na fatura do Nubank e eu somei R$ 2.340,00', 'Tem R$ 172,00 que não foi anotado', 'Quer lançar agora?')];
    perform produto._esc_responder(f, q->>'id', 'explicar', '{"texto": "juros do mês passado"}', produto._t('2026-11-16 11:05'));
    res := res || array['Cartão: diferença explicada fica guardada e a pergunta some', 'juros do mês passado/(nada)', (select x.diferenca_motivo from produto.cartao_faturas x where x.familia_id = f and x.cartao_id = cn) || '/' || produto._tem(produto._esc_achar(produto._escritorio(f, produto._t('2026-11-16 12:00')), 'fatura_dif:')->>'id', 'x')];
    perform produto._esc_responder(f, (select x->>'id' from produto._esc_achar(e, 'anuidade:') x), 'lembrar', '{}', produto._t('2026-11-16 11:10'));
    res := res || array['Cartão: "Me lembra dia 01" cria o lembrete de 01/12', '2026-12-01 09:00', (select to_char(l.quando at time zone 'America/Recife', 'YYYY-MM-DD HH24:MI') from produto.esc_lembretes l where l.familia_id = f and l.funcionario = 'analista_cartao')];
    j := produto.cartao_salvar(f, 'Visa da casa', null, 'Itaú', mb, 3, 10, 5000, 39.9, 'mes', null, 800, '1234')::jsonb;
    res := res || array['cartao_salvar cadastra cartão com banco, dono, dias, limite e mensalidade', 'Visa da casa/5000.00/mes', (j->'cartao'->>'apelido') || '/' || (j->'cartao'->>'limite') || '/' || (j->'cartao'->>'taxa_periodo')];
    begin perform produto.cartao_salvar(f, 'Cartão 5502123412341234'); obt := 'aceitou'; exception when others then obt := 'recusou'; end;
    res := res || array['cartao_salvar recusa número de cartão no apelido', 'recusou', obt];
    res := res || array['Ficha do Analista traz os cartões e as faturas no cadastro', 'true', (select (jsonb_array_length(x->'cadastro_resumo'->'itens') = 4 and jsonb_array_length(x->'cadastro_resumo'->'faturas') >= 1)::text from jsonb_array_elements(produto._escritorio(f, produto._t('2026-11-16 12:00'))->'funcionarios') x where x->>'id' = 'analista_cartao')];

    -- CONTADOR
    e := produto._escritorio(f, produto._t('2026-11-12 19:00'));
    res := res || array['Contador: antes das 20h não pergunta', '(nada)', produto._tem(produto._esc_achar(e, 'lancou_hoje:')->>'id', 'x')];
    e := produto._escritorio(f, produto._t('2026-11-12 20:30')); q := produto._esc_achar(e, 'lancou_hoje:'); todas := todas || e::text;
    res := res || array['Contador: depois das 20h sem lançamento no dia, pergunta', 'sim', produto._tem(q->>'fala', 'Romero, ', 'às 20h', 'Sem anotar, o valor que eu digo que você pode gastar amanhã sai errado', 'Gastou alguma coisa e ficou sem anotar?')];
    perform produto._esc_responder(f, q->>'id', 'lembrar_22', '{}', produto._t('2026-11-12 20:35'));
    res := res || array['Contador: "Me lembra às 22h" some e volta na hora certa', '(nada)/volta', produto._tem(produto._esc_achar(produto._escritorio(f, produto._t('2026-11-12 21:59')), 'lancou_hoje:')->>'id', 'x') || '/' || case when produto._esc_achar(produto._escritorio(f, produto._t('2026-11-12 22:01')), 'lancou_hoje:') is not null then 'volta' else 'não voltou' end];
    perform produto._esc_responder(f, q->>'id', 'nao_gastei', '{}', produto._t('2026-11-12 22:05'));
    res := res || array['Contador: "Hoje não gastei" encerra a pergunta do dia', '(nada)', produto._tem(produto._esc_achar(produto._escritorio(f, produto._t('2026-11-12 23:00')), 'lancou_hoje:')->>'id', 'x')];
    e := produto._escritorio(f, produto._t('2026-12-01 10:00')); q := produto._esc_achar(e, 'fechou_mes:2026-11'); todas := todas || e::text;
    res := res || array['Contador: dia 1 a 5 fecha o mês e pergunta se guarda a sobra', 'sim', produto._tem(q->>'fala', 'fechei o mês 11/2026: sobraram R$', 'Guardado, rende mais ou menos R$', 'Quer mandar pro Guardado?')];
    perform produto._esc_responder(f, q->>'id', 'guardar', '{"valor": 500}', produto._t('2026-12-01 10:05'));
    res := res || array['Contador: "Guardar agora" faz o depósito no Guardado', '500.00/2026-12-01', (select mv.valor || '/' || mv.data from produto.pat_movimentos mv where mv.familia_id = f and mv.aplicacao_id = ax and mv.tipo = 'aporte' and mv.data > '2026-11-30')];

    -- GUARDIAO DA RESERVA
    e := produto._escritorio(f, produto._t('2026-11-12 10:00')); q := produto._esc_achar(e, 'colchao:');
    res := res || array['Reserva: abaixo do combinado, pergunta de onde volta e quando, explicando o que é reserva', 'sim', produto._tem(q->>'fala', 'a reserva de Contas (o dinheiro que vocês combinaram nunca gastar) está em R$ 500,00. O combinado é R$ 1.000,00, então faltam R$ 500,00.', 'De onde esse dinheiro volta, e em que dia?')];
    perform produto._esc_responder(f, q->>'id', 'repor', '{"texto": "o aluguel", "data": "2026-11-15"}', produto._t('2026-11-12 10:20'));
    res := res || array['Reserva: resposta com texto e data fica quieta até o dia combinado', '(nada)', produto._tem(produto._esc_achar(produto._escritorio(f, produto._t('2026-11-15 20:00')), 'colchao:')->>'id', 'x')];
    q := produto._esc_achar(produto._escritorio(f, produto._t('2026-11-16 09:00')), 'colchao:');
    res := res || array['Reserva: no dia seguinte ao combinado volta usando o que ouviu', 'sim', produto._tem(q->>'fala', 'Dia 12/11 você me disse que ia repor até dia 15/11 com: o aluguel. Hoje é dia 16/11.', 'Esse dinheiro entrou?')];

    -- GESTOR DO GUARDADO
    res := res || array['Gestor: todo dia útil entrega quanto rendeu', 'sim', (select produto._tem(x->>'resumo', 'Seu dinheiro guardado rendeu R$', 'hoje, já sem o imposto') from jsonb_array_elements(e->'entregue') x where x->>'funcionario' = 'gestor_guardado')];
    res := res || array['Gestor: sábado diz que não rende e por quê', 'sim', (select produto._tem(x->>'resumo', 'não rende hoje: hoje é sábado: rende de novo na segunda') from jsonb_array_elements(produto._escritorio(f, produto._t('2026-11-14 10:00'))->'entregue') x where x->>'funcionario' = 'gestor_guardado')];
    q := produto._esc_achar(e, 'cdb_vence:');
    res := res || array['Gestor: 15 dias antes do vencimento pergunta renovar ou tirar', 'sim', produto._tem(q->>'fala', 'Romero, a aplicação CDB vence em 13 dias e você ainda não decidiu', 'O que prefere?')];
    perform produto._esc_responder(f, q->>'id', 'renovar', '{"data": "2027-11-25"}', produto._t('2026-11-12 11:00'));
    res := res || array['Gestor: "Renovar" grava o novo vencimento', '2027-11-25', (select x.vence_em::text from produto.pat_aplicacoes x where x.id = ab)];
    q := produto._esc_achar(e, 'reserva_parada:');
    res := res || array['Gestor: reserva parada na conta que não rende vira sugestão com conta feita', 'sim', produto._tem(q->>'fala', 'está na conta comum, que não rende', 'daria mais ou menos R$', 'Quer que eu mostre como guardar?')];
    perform produto._esc_responder(f, q->>'id', 'ja_guardada', '{}', produto._t('2026-11-12 11:05'));
    res := res || array['Gestor: "Ela já está guardada" fica no cadastro e ele não pergunta mais', 'guardada/(nada)', (select x.valor #>> '{}' from produto.config_familia x where x.familia_id = f and x.chave = 'reserva_onde') || '/' || produto._tem(produto._esc_achar(produto._escritorio(f, produto._t('2026-12-20 10:00')), 'reserva_parada:')->>'id', 'x')];
    e := produto._escritorio(f, produto._t('2026-12-01 11:00')); q := produto._esc_achar(e, 'saldo_conferir:' || ax::text);
    res := res || array['Gestor: virou o mês, pede pra conferir o saldo no banco', 'sim', produto._tem(q->>'fala', 'Romero, virou o mês. Pela minha conta você tem R$', 'guardados em Caixinha (Banco A)', 'me diz quanto aparece lá')];
    j := produto._esc_responder(f, q->>'id', 'conferi', jsonb_build_object('valor', (q->>'valor')::numeric + 10), produto._t('2026-12-01 11:05'));
    res := res || array['Gestor: saldo digitado vira movimento e mostra a diferença', '1/sim', (select count(*)::text from produto.pat_movimentos mv where mv.aplicacao_id = ax and mv.tipo = 'saldo_conferido') || '/' || produto._tem(j->'efeito'->>'frase', 'O banco mostra R$', 'a mais que a minha conta')];

    -- SECRETARIA
    res := res || array['Secretária: antes da hora do lembrete não cobra', '(nada)', produto._tem(produto._esc_achar(produto._escritorio(f, produto._t('2026-11-12 08:00')), 'lembrete:')->>'id', 'x')];
    e := produto._escritorio(f, produto._t('2026-11-12 10:00')); q := produto._esc_achar(e, 'lembrete:');
    res := res || array['Secretária: na hora, fala como gente', 'sim', produto._tem(q->>'pergunta', 'Romero, você me pediu pra lembrar hoje: Ligar pro contador.', 'Já fez?')];
    perform produto._esc_responder(f, q->>'id', 'adiar_1_dia', '{}', produto._t('2026-11-12 10:30'));
    res := res || array['Secretária: "Me lembra amanhã" some hoje e volta amanhã', '(nada)/volta', produto._tem(produto._esc_achar(produto._escritorio(f, produto._t('2026-11-12 23:00')), 'lembrete:' || lb::text)->>'id', 'x') || '/' || case when produto._esc_achar(produto._escritorio(f, produto._t('2026-11-13 10:31')), 'lembrete:' || lb::text) is not null then 'volta' else 'não voltou' end];
    q := produto._esc_achar(produto._escritorio(f, produto._t('2026-11-15 10:31')), 'lembrete:' || lb::text);
    res := res || array['Secretária: cobra de novo todo dia até responder, dizendo há quanto tempo', 'sim', produto._tem(q->>'pergunta', 'Romero, continua aberto há 2 dias: Ligar pro contador.')];
    perform produto._esc_responder(f, q->>'id', 'feito', '{}', produto._t('2026-11-15 10:40'));
    res := res || array['Secretária: "Já fiz" conclui o lembrete', 'true', (select (l.feito_em is not null)::text from produto.esc_lembretes l where l.id = lb)];
    j := produto.lembrete_criar(f, 'Pagar o IPVA', now() + interval '2 hours', 'ano')::jsonb;
    res := res || array['lembrete_criar, lembrete_adiar, lembrete_concluir (repete todo ano) e lembrete_apagar', 'true/true/true',
      ((j->'lembrete'->>'titulo') = 'Pagar o IPVA')::text || '/' ||
      (select ((produto.lembrete_adiar((j->'lembrete'->>'id')::uuid, now() + interval '3 days')::jsonb->>'acao') = 'adiar' and (produto.lembrete_concluir((j->'lembrete'->>'id')::uuid)::jsonb->>'acao') = 'concluir')::text) || '/' ||
      (produto.lembrete_apagar((j->'lembrete'->>'id')::uuid)::jsonb->>'acao' = 'apagar')::text];
    res := res || array['Apagar lembrete só marca inativo (a linha continua lá); o que repete todo ano pulou pro ano que vem', '1', (select count(*)::text from produto.esc_lembretes l where l.id = (j->'lembrete'->>'id')::uuid and not l.ativo and l.feito_em is null and l.quando > now() + interval '300 days')];

    -- COMPRADOR
    e := produto._escritorio(f, produto._t('2026-11-13 10:00')); q := produto._esc_achar(e, 'prestador_vespera:'); todas := todas || e::text;
    res := res || array['Comprador: na véspera lembra da mensagem, com o texto pronto', 'sim/sim', produto._tem(q->>'fala', 'amanhã, sábado, é dia do jardineiro (Seu Zé)', 'Já mandou a mensagem pra ele?') || '/' || produto._tem(q->>'mensagem', 'Oi, Seu Zé', '14/11')];
    res := res || array['Comprador: no dia, antes das 17h, não pergunta se veio', '(nada)', produto._tem(produto._esc_achar(produto._escritorio(f, produto._t('2026-11-14 16:00')), 'prestador_veio:')->>'id', 'x')];
    q := produto._esc_achar(produto._escritorio(f, produto._t('2026-11-14 17:30')), 'prestador_veio:');
    res := res || array['Comprador: no dia às 17h pergunta se ele veio', 'sim', produto._tem(q->>'pergunta', 'hoje era dia do jardineiro (Seu Zé).', 'Ele veio?')];
    perform produto._esc_responder(f, q->>'id', 'veio', '{}', produto._t('2026-11-14 17:35'));
    res := res || array['Comprador: "Ele veio" anota a última visita', 'true', (select (x.valor->0->>'ultimaVez' is not null)::text from produto.config_familia x where x.familia_id = f and x.chave = 'casa_prestadores')];
    q := produto._esc_achar(produto._escritorio(f, produto._t('2026-11-28 10:00')), 'gas:');
    res := res || array['Comprador: 5 dias antes da troca do gás, avisa', 'sim', produto._tem(q->>'fala', 'Romero, o gás deve acabar dia 02/12', 'Pedindo antes, ninguém fica sem cozinhar', 'Já pediu?')];
    perform set_config('request.jwt.claims', ceq, true);
    e := produto._escritorio(f, produto._t('2026-11-28 10:00')); q := produto._esc_achar(e, 'gas:'); todas := todas || e::text;
    res := res || array['Equipe: recebe a pergunta do gás sem valor ("Já trocou?")', 'sim/limpo', produto._tem(q->>'pergunta', 'Givaldo', 'Já trocou?') || '/' || case when e::text ~* 'R\$|"valor"|custo' then 'vazou' else 'limpo' end];
    begin perform produto._esc_responder(f, 'fatura:' || cn::text || ':2026-12', 'paguei_hoje', '{}', produto._t('2026-11-28 10:05')); obt := 'aceitou'; exception when others then obt := 'recusou'; end;
    res := res || array['Equipe: não consegue responder pergunta de dinheiro', 'recusou', obt];
    perform set_config('request.jwt.claims', cu, true);

    -- FISCAL: semana seguinte, avisos
    insert into produto.lancamentos (id, familia_id, envelope_id, valor, data, descricao, autor) values (l2, f, ef, 900, '2026-11-17', 'Mercado', u);
    e := produto._escritorio(f, produto._t('2026-11-17 20:00')); q := produto._esc_achar(e, 'feira_feita:2026-11-16'); todas := todas || e::text;
    res := res || array['Fiscal: se já existe gasto na Feira na semana, pergunta se foi essa (não pede o que já sabe)', 'sim', produto._tem(q->>'pergunta', 'gasto de R$ 900,00 na Feira, de 17/11', 'Foi essa?')];
    perform produto._esc_responder(f, q->>'id', 'foi_essa', '{}', produto._t('2026-11-17 20:05'));
    res := res || array['Fiscal: "Foi essa a feira" liga a feira ao gasto que já existia, sem lançar de novo', '1/2', (select count(*)::text from produto.feiras x where x.familia_id = f and x.lancamento_id = l2) || '/' || (select count(*)::text from produto.lancamentos l where l.familia_id = f and l.envelope_id = ef)];
    q := produto._esc_achar(produto._escritorio(f, produto._t('2026-11-17 20:10')), 'feira_nota:');
    perform produto._esc_responder(f, q->>'id', 'sem_nota', '{"texto": "feira livre"}', produto._t('2026-11-17 20:12'));
    res := res || array['Fiscal: "Não teve nota" guarda o motivo e para de pedir', 'feira livre/(nada)', (select x.sem_nota_motivo from produto.feiras x where x.lancamento_id = l2) || '/' || produto._tem(produto._esc_achar(produto._escritorio(f, produto._t('2026-11-17 20:20')), 'feira_nota:')->>'id', 'x')];
    insert into produto.lancamentos (familia_id, envelope_id, valor, data, descricao, autor) values (f, ef, 400, '2026-11-18', 'Açougue', u);
    perform produto._estoque_contar(f, jsonb_build_array(jsonb_build_object('item_id', i1, 'estado', 'acabou')), '2026-11-18', '2026-11-18');
    e := produto._escritorio(f, produto._t('2026-11-18 21:00')); todas := todas || e::text;
    res := res || array['Fiscal avisa sozinho: semana passou do teto, quanto e qual semana do mês', 'sim', (select produto._tem(x->>'texto', 'A semana de 16/11 passou do teto em R$ 146,15', '3ª semana do mês') from jsonb_array_elements(e->'avisos') x where x->>'tipo' = 'passou_do_teto')];
    res := res || array['Fiscal avisa sozinho: item que acabou 2 semanas seguidas', 'sim', (select produto._tem(x->>'texto', 'Acabou 2 semanas seguidas: Café') from jsonb_array_elements(e->'avisos') x where x->>'tipo' = 'acabou_2_semanas')];
    j := produto.feira_registrar(f, null, 55.5, 'Padaria')::jsonb;
    res := res || array['feira_registrar (casal) cria a feira e o lançamento; estoque_item_salvar cria item', '55.50/Sabão', (j->'feira'->>'valor') || '/' || (produto.estoque_item_salvar(f, 'Sabão', 'Limpeza')::jsonb->'item'->>'nome')];

    -- TEXTO, DIARIO E RELATORIO
    res := res || array['Nenhuma fala devolvida tem a palavra "colchão" nem travessão', 'limpo', case when todas ~* 'colch[ãa]o [a-z]|[Cc]olchão|—' then 'achou' else 'limpo' end];
    res := res || array['A explicação da conta do dia também fala "reserva"', 'limpo', case when produto._resumo(f, '2026-11-12')::text ~ 'olchão' then 'achou' else 'limpo' end];
    res := res || array['Toda pergunta, em qualquer cobrança, chama a pessoa pelo 1º nome', 'true', (select bool_and(x[1] like '"Romero, %')::text from regexp_matches(todas, '"pergunta": ("[^"]{0,40})', 'g') x where x[1] not like '"Givaldo, %')];
    res := res || array['Nenhum botão é só "Sim" ou "Não"', '0', (select count(*)::text from jsonb_array_elements(produto._escritorio(f, produto._t('2026-11-12 20:30'))->'precisa_de_voce') x, jsonb_array_elements(x->'opcoes') o where lower(o->>'rotulo') in ('sim', 'não', 'nao'))];
    res := res || array['Cada funcionário traz ficha: cadastro, últimas respostas e o que faz', '8/true', (select count(*)::text || '/' || bool_and(x ? 'cadastro_resumo' and x ? 'ultimas_respostas' and jsonb_array_length(x->'faz') = 3)::text from jsonb_array_elements(e->'funcionarios') x)];
    res := res || array['Últimas respostas vêm no máximo 10 por funcionário', 'true', (select bool_and(jsonb_array_length(x->'ultimas_respostas') <= 10)::text from jsonb_array_elements(e->'funcionarios') x)];
    j := produto.escritorio_diario(f, 'analista_cartao', 2)::jsonb;
    res := res || array['escritorio_diario: "ver tudo" por funcionário, em páginas', '2/true', jsonb_array_length(j->'itens')::text || '/' || (j->>'tem_mais')];
    j := produto._esc_relatorio(f, '2026-11-01', '2026-12-31', produto._t('2026-12-02 12:00'));
    res := res || array['Relatório: por funcionário, perguntas, resolvidas e tempo médio', 'true', (select (count(*) = 8 and bool_or((x->>'perguntas')::int > 0 and x->>'tempo_medio_min' is not null))::text from jsonb_array_elements(j->'funcionarios') x)];
    res := res || array['Relatório: a linha do tempo tem todas as respostas do diário', (select count(*)::text from produto.esc_diario d where d.familia_id = f), jsonb_array_length(j->'linha_do_tempo')::text];
    res := res || array['Toda resposta guarda quem respondeu e a hora', 'true', (select bool_and(d.respondido_por in (u, ue) and d.quando is not null)::text from produto.esc_diario d where d.familia_id = f)];
    j := produto.escritorio_hoje(f)::jsonb;
    res := res || array['escritorio_hoje (data de hoje) responde com os 4 blocos do contrato', 'true', (j ?& array['precisa_de_voce', 'trabalhando', 'entregue', 'funcionarios'])::text];

    -- VAZAMENTO (com a tranca de verdade ligada)
    for c in select * from (values
      ('Outra família chama escritorio_hoje desta', paulo, format('select 1 from produto.escritorio_hoje(%L)', f), 'contar', 'bloqueado'),
      ('Outra família responde pergunta desta', paulo, format('select 1 from produto.escritorio_responder(%L, ''dae:2026-11'', ''paguei_hoje'')', f), 'contar', 'bloqueado'),
      ('Outra família pede o relatório desta', paulo, format('select 1 from produto.escritorio_relatorio(%L)', f), 'contar', 'bloqueado'),
      ('Outra família pede o diário desta', paulo, format('select 1 from produto.escritorio_diario(%L)', f), 'contar', 'bloqueado'),
      ('Outra família lê o diário, lembretes, feiras, estoque, custos e faturas desta', paulo, 'select (select count(*) from produto.esc_diario) + (select count(*) from produto.esc_lembretes) + (select count(*) from produto.feiras) + (select count(*) from produto.estoque_itens) + (select count(*) from produto.estoque_contagens) + (select count(*) from produto.cartao_custos) + (select count(*) from produto.cartao_faturas)', 'contar', '0'),
      ('Outra família cria lembrete nesta', paulo, format('select 1 from produto.lembrete_criar(%L, ''x'', now())', f), 'contar', 'bloqueado'),
      ('Outra família registra feira nesta', paulo, format('select 1 from produto.feira_registrar(%L)', f), 'contar', 'bloqueado'),
      ('Outra família salva cartão nesta', paulo, format('select 1 from produto.cartao_salvar(%L, ''x'')', f), 'contar', 'bloqueado'),
      ('Pessoa (filho) chama escritorio_hoje: vem vazio', davi, format('select (produto.escritorio_hoje(%L)::jsonb->>''total_precisa'')::int + jsonb_array_length(produto.escritorio_hoje(%L)::jsonb->''funcionarios'')', silva, silva), 'contar', '0'),
      ('Pessoa lê diário, lembretes, custos e faturas de cartão', davi, 'select (select count(*) from produto.esc_diario) + (select count(*) from produto.esc_lembretes) + (select count(*) from produto.cartao_custos) + (select count(*) from produto.cartao_faturas)', 'contar', '0'),
      ('Pessoa lê feiras e estoque', davi, 'select (select count(*) from produto.feiras) + (select count(*) from produto.estoque_itens) + (select count(*) from produto.estoque_contagens)', 'contar', '0'),
      ('Equipe lê lembretes, custos e faturas de cartão', ue::text, 'select (select count(*) from produto.esc_lembretes) + (select count(*) from produto.cartao_custos) + (select count(*) from produto.cartao_faturas)', 'contar', '0'),
      ('Equipe lê linha do diário que não é da Casa (dinheiro)', ue::text, 'select count(*) from produto.esc_diario where not casa', 'contar', '0'),
      ('Equipe lê linha do diário com R$', ue::text, $q$select count(*) from produto.esc_diario where pergunta ~ 'R\$' or resposta ~ 'R\$' or dados ? 'valor'$q$, 'contar', '0'),
      ('Equipe grava no diário resposta de dinheiro direto na tabela', ue::text, format('insert into produto.esc_diario (familia_id, funcionario, assunto, ref, pergunta, resposta, respondido_por, casa) values (%L, ''analista_cartao'', ''fatura'', ''x'', ''x'', ''x'', %L, true)', f, ue), 'linhas', 'bloqueado'),
      ('Equipe grava no diário com valor escondido', ue::text, format('insert into produto.esc_diario (familia_id, funcionario, assunto, ref, pergunta, resposta, dados, respondido_por, casa) values (%L, ''comprador'', ''gas'', ''x'', ''x'', ''x'', ''{"valor": 1}'', %L, true)', f, ue), 'linhas', 'bloqueado'),
      ('Equipe chama escritorio_hoje de verdade: nenhum R$ nem valor', ue::text, format($q$select (produto.escritorio_hoje(%L)::text ~* 'R\$|"valor"|"limite"|salario|"saldo"')::int$q$, f), 'contar', '0'),
      ('Equipe pede o relatório: nenhum R$', ue::text, format($q$select (produto.escritorio_relatorio(%L)::text ~* 'R\$|"valor"')::int$q$, f), 'contar', '0'),
      ('Equipe cria lembrete', ue::text, format('select 1 from produto.lembrete_criar(%L, ''x'', now())', f), 'contar', 'bloqueado'),
      ('Equipe salva cartão', ue::text, format('select 1 from produto.cartao_salvar(%L, ''x'')', f), 'contar', 'bloqueado'),
      ('Equipe informa fatura', ue::text, format('select 1 from produto.fatura_informar(%L, %L, ''2026-11'', 10)', f, cn), 'contar', 'bloqueado'),
      ('Equipe registra feira com valor: o valor é ignorado (nenhum lançamento novo)', ue::text, format('select (select count(*) from produto.lancamentos) + (produto.feira_registrar(%L, null, 77)::jsonb->''feira'' ? ''valor'')::int', f), 'contar', '0'),
      ('CONTROLE equipe vê as feiras (sem valor) e os itens da casa', ue::text, 'select (select count(*) from produto.feiras) + (select count(*) from produto.estoque_itens)', 'contar', '6'),
      ('CONTROLE casal vê o diário inteiro da família', u::text, 'select (count(*) > 20)::int from produto.esc_diario', 'contar', '1')
    ) as t(caso, uid, q, modo, esperado) loop
      res := res || array[c.caso, c.esperado, produto._tentativa(c.uid, 'authenticated', c.q, c.modo)];
    end loop;
    res := res || array['anon chama escritorio_hoje', 'bloqueado', produto._tentativa(null, 'anon', format('select 1 from produto.escritorio_hoje(%L)', silva), 'contar')];
    res := res || array['anon lê feiras', 'bloqueado', produto._tentativa(null, 'anon', 'select count(*) from produto.feiras', 'contar')];

    raise exception using errcode = 'P9999', message = 'desfazer';
  exception
    when sqlstate 'P9999' then null;
    when others then res := res || array['o teste do Escritório quebrou no meio', 'sem erro', sqlerrm];
  end;
  for i in 1..coalesce(array_length(res, 1), 0) / 3 loop
    caso := res[i * 3 - 2]; esperado := res[i * 3 - 1]; obtido := res[i * 3]; ok := esperado is not distinct from obtido;
    return next;
  end loop;
end $function$
;

-- produto.teste_guardado()
CREATE OR REPLACE FUNCTION produto.teste_guardado()
 RETURNS TABLE(caso text, esperado text, obtido text, ok boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  res text[] := '{}'; i int; c record; obt text;
  f uuid := gen_random_uuid(); u uuid := gen_random_uuid(); mb uuid := gen_random_uuid();
  a1 uuid := gen_random_uuid(); a2 uuid := gen_random_uuid(); a3 uuid := gen_random_uuid(); a4 uuid := gen_random_uuid();
  a5 uuid := gen_random_uuid(); a6 uuid := gen_random_uuid(); a7 uuid := gen_random_uuid(); aid uuid;
  k uuid := gen_random_uuid(); k2 uuid := gen_random_uuid();
  g jsonb; j jsonb; cdi constant numeric := 0.050788;
  carla constant text := 'a0000000-0000-4e0e-8000-0000000000c1'; davi constant text := 'a0000000-0000-4e0e-8000-0000000000d1';
  paulo constant text := 'a0000000-0000-4e0e-8000-0000000000f2'; silva constant text := 'f0000000-0000-4e0e-8000-000000000001';
begin
  begin
    insert into produto.familias (id, nome, exemplo) values (f, 'Teste Guardado', true);
    insert into produto.membros (id, familia_id, user_id, papel, nome) values (mb, f, u, 'casal', 'Teste');
    perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
    insert into produto.pat_aplicacoes (id, familia_id, titular_membro, nome, banco, tipo, pct_cdi, isento_ir, criado_por) values
      (a1, f, mb, 'Caixinha 105', 'Banco A', 'caixinha', 105, false, u), (a2, f, mb, 'Caixinha com gastos', 'Banco B', 'caixinha', 105, false, u),
      (a3, f, mb, 'CDB 110', 'Banco C', 'cdb', 110, false, u), (a4, f, mb, 'LCA 92', 'Banco D', 'lci_lca', 92, true, u),
      (a5, f, mb, 'Poupança', 'Banco E', 'poupanca', 100, true, u), (a6, f, mb, 'CDB grande', 'Banco X', 'cdb', 100, false, u),
      (a7, f, mb, 'LCA grande', ' banco x', 'lci_lca', 90, true, u);
    insert into produto.pat_movimentos (familia_id, aplicacao_id, data, tipo, valor, chave, autor) values
      (f, a1, '2026-11-09', 'aporte', 10000, gen_random_uuid(), u),
      (f, a2, '2026-11-09', 'aporte', 10000, gen_random_uuid(), u), (f, a2, '2026-11-10', 'resgate', 300, gen_random_uuid(), u), (f, a2, '2026-11-16', 'resgate', 2000, gen_random_uuid(), u),
      (f, a3, '2026-05-11', 'aporte', 40000, gen_random_uuid(), u), (f, a3, '2026-11-11', 'saldo_conferido', 50000, gen_random_uuid(), u),
      (f, a4, '2026-11-11', 'aporte', 50000, gen_random_uuid(), u), (f, a5, '2026-10-11', 'aporte', 10000, gen_random_uuid(), u),
      (f, a6, '2026-11-08', 'aporte', 180000, gen_random_uuid(), u), (f, a7, '2026-11-08', 'aporte', 95000, gen_random_uuid(), u);

    g := produto._guardado_app(a1, '2026-11-09', cdi);
    res := res || array['R$ 10.000 a 105% do CDI de 13,65% a.a.: rende no 1º dia útil (bruto)', '5.33', g->>'rendeu_hoje_bruto'];
    res := res || array['mesmo caso: líquido do 1º dia (IR 22,5%)', '4.13', g->>'rendeu_hoje_liquido'];
    g := produto._guardado_app(a1, '2026-12-08', cdi);
    res := res || array['R$ 10.000 a 105%: 21 dias úteis de 09/11 a 08/12 (bruto)', '112.59', g->>'rendeu_desde_inicio_bruto'];
    res := res || array['mesmo caso: saldo em 08/12', '10112.59', g->>'saldo'];
    res := res || array['mesmo caso: dias que renderam (20/11 é feriado dos bancos)', '21', (select count(*)::text from jsonb_array_elements(g->'dias') x where (x->>'bruto')::numeric > 0)];
    res := res || array['mesmo caso: líquido com IR de 22,5% (conta de referência dá 87,26; aceita 1 centavo)', 'sim', case when abs((g->>'rendeu_desde_inicio_liquido')::numeric - 87.26) <= 0.01 then 'sim' else g->>'rendeu_desde_inicio_liquido' end];
    res := res || array['IOF: não cobra depois de 30 dias (09/12)', '0.00', produto._guardado_app(a1, '2026-12-09', cdi)->>'iof_se_sacar_hoje'];
    res := res || array['IOF: cobra se sacar no 10º dia (19/11), 66% do rendimento', '31.74', produto._guardado_app(a1, '2026-11-19', cdi)->>'iof_se_sacar_hoje'];
    res := res || array['tabela do IOF: dia 1, dia 10 e dia 30', '96/66/0', produto._iof_pct(1) || '/' || produto._iof_pct(10) || '/' || produto._iof_pct(30)];
    res := res || array['faixas do IR: 180, 181, 360, 361, 720 e 721 dias', '22.5/20/20/17.5/17.5/15',
      (produto._aliq_ir(180) * 100)::float8 || '/' || (produto._aliq_ir(181) * 100)::float8 || '/' || (produto._aliq_ir(360) * 100)::float8 || '/' || (produto._aliq_ir(361) * 100)::float8 || '/' || (produto._aliq_ir(720) * 100)::float8 || '/' || (produto._aliq_ir(721) * 100)::float8];

    g := produto._guardado_app(a2, '2026-11-29', cdi);
    res := res || array['R$ 10.000 em 09/11, tirou R$ 300 em 10/11 e R$ 2.000 em 16/11: saldo em 29/11', '7763.21', g->>'saldo'];
    res := res || array['mesmo caso: rendeu (bruto)', '63.21', g->>'rendeu_desde_inicio_bruto'];

    g := produto._guardado_app(a3, '2026-11-11', cdi);
    res := res || array['R$ 50.000 a 110% com CDI diário 0,050788%: rende hoje (bruto)', '27.93', g->>'rendeu_hoje_bruto'];
    res := res || array['mesmo caso: líquido na faixa de 20% (aplicado há 184 dias)', '22.35', g->>'rendeu_hoje_liquido'];
    res := res || array['mesmo caso: faixa do IR', '20', (g->>'ir_faixa')::float8::text];
    res := res || array['mesmo CDB em 06/11 (179 dias): faixa do IR', '22.5', (produto._guardado_app(a3, '2026-11-06', cdi)->>'ir_faixa')::float8::text];

    g := produto._guardado_app(a4, '2026-11-11', cdi);
    res := res || array['LCA 92% de R$ 50.000: rende hoje bruto = líquido (isenta)', '23.36/23.36', (g->>'rendeu_hoje_bruto') || '/' || (g->>'rendeu_hoje_liquido')];
    res := res || array['Poupança R$ 10.000 de 11/10: rende no aniversário 11/11 (0,5%, sem TR)', '50.00', produto._guardado_app(a5, '2026-11-11', cdi)->>'rendeu_hoje_liquido'];
    res := res || array['Poupança: na véspera do aniversário não rende', '0.00', produto._guardado_app(a5, '2026-11-10', cdi)->>'rendeu_hoje_liquido'];
    res := res || array['Poupança marcada como estimativa', 'true', produto._guardado_app(a5, '2026-11-11', cdi)->>'estimativa'];

    g := produto._guardado(f, '2026-11-08', cdi);
    res := res || array['FGC: CDB R$ 180.000 + LCA R$ 95.000 no mesmo banco e titular: fora da garantia', '25000.00', g->>'fora_do_fgc'];
    res := res || array['FGC: a aplicação do banco estourado fica marcada', 'false', (select x->>'fgc_ok' from jsonb_array_elements(g->'aplicacoes') x where x->>'id' = a6::text)];
    res := res || array['FGC: aplicação em outro banco continua ok', 'true', (select x->>'fgc_ok' from jsonb_array_elements(g->'aplicacoes') x where x->>'id' = a1::text)];
    res := res || array['Domingo 08/11: não rende e diz por quê', 'hoje é domingo: rende de novo amanhã', g->>'aviso'];
    g := produto._guardado(f, '2026-11-14', cdi);
    res := res || array['Sábado 14/11: rendeu hoje', '0.00', g->>'rendeu_hoje_liquido'];
    res := res || array['Sábado 14/11: aviso', 'hoje é sábado: rende de novo na segunda', g->>'aviso'];
    res := res || array['Sábado 14/11: mostra o último dia que rendeu (sexta 13/11)', '2026-11-13', g->'ultimo_dia_que_rendeu'->>'data'];
    res := res || array['Feriado 20/11 (sexta): aviso', 'hoje é feriado dos bancos: rende de novo na segunda', produto._guardado(f, '2026-11-20', cdi)->>'aviso'];
    res := res || array['Taxa ao ano mostrada pra 0,050788% ao dia', '13.65', g->'cdi_usado'->>'pct_ano'];
    res := res || array['Barra dos últimos 30 dias tem 30 dias', '30', jsonb_array_length(g->'por_dia_30')::text];
    res := res || array['Soma das aplicações = total', 'true', ((select sum((x->>'saldo')::numeric) from jsonb_array_elements(g->'aplicacoes') x) = (g->>'total')::numeric)::text];
    res := res || array['Dia sem taxa publicada usa a última e marca estimativa', 'true', produto._guardado(f, '2027-03-01')->'cdi_usado'->>'estimativa'];

    j := produto._guardado_custo(f, 300, '2026-11-10', cdi, 105);
    res := res || array['Gasto de R$ 300 em 10/11 a 105%: dias úteis até virar o mês e em 12 meses', '13/250', (j->'ate_fim_do_mes'->>'dias_uteis') || '/' || (j->'em_12_meses'->>'dias_uteis')];
    res := res || array['mesmo gasto: deixa de render até o fim do mês (bruto)', '2.09', j->'ate_fim_do_mes'->>'bruto'];
    res := res || array['mesmo gasto: em 12 meses, bruto e líquido (IR 17,5%)', '42.77/35.29', (j->'em_12_meses'->>'bruto') || '/' || (j->'em_12_meses'->>'liquido')];

    -- funcoes que o app chama, como casal, na data de hoje
    j := produto.guardado_criar(f, 'Caixinha teste', 'Banco G', 'caixinha', 100, 1000, null, null, k)::jsonb;
    aid := (j->>'aplicacao_id')::uuid;
    j := produto.guardado_criar(f, 'Caixinha teste', 'Banco G', 'caixinha', 100, 1000, null, null, k)::jsonb;
    res := res || array['guardado_criar 2 vezes com a mesma chave: 1 aplicação só', '1/true', (select count(*)::text from produto.pat_aplicacoes x where x.chave = k) || '/' || (j->>'repetido')];
    perform produto.guardado_movimentar(aid, 'aporte', 500, null, k2);
    j := produto.guardado_movimentar(aid, 'aporte', 500, null, k2)::jsonb;
    res := res || array['guardado_movimentar 2 vezes com a mesma chave: 1 aporte só', '2/true', (select count(*)::text from produto.pat_movimentos x where x.aplicacao_id = aid) || '/' || (j->>'repetido')];
    begin perform produto.guardado_movimentar(aid, 'resgate', 999999, null, gen_random_uuid()); obt := 'aceitou'; exception when others then obt := 'recusou'; end;
    res := res || array['Tirar mais do que tem', 'recusou', obt];
    begin perform produto.guardado_movimentar(aid, 'aporte', 10, null, null); obt := 'aceitou'; exception when others then obt := 'recusou'; end;
    res := res || array['Movimento sem chave', 'recusou', obt];
    begin perform produto.guardado_movimentar(aid, 'aporte', 10, produto._hoje() + 1, gen_random_uuid()); obt := 'aceitou'; exception when others then obt := 'recusou'; end;
    res := res || array['Movimento com data no futuro', 'recusou', obt];
    begin perform produto.guardado_criar(f, 'X', 'Y', 'acoes', 100, 10); obt := 'aceitou'; exception when others then obt := 'recusou'; end;
    res := res || array['Aplicação de tipo que não existe', 'recusou', obt];
    j := produto.guardado_movimentar(aid, 'saldo_conferido', 1600, null, gen_random_uuid())::jsonb;
    res := res || array['Saldo conferido de R$ 1.600 com R$ 1.500 calculados: mostra a diferença', '100.00', j->>'diferenca'];
    j := produto.guardado_hoje(f)::jsonb;
    res := res || array['guardado_hoje traz as 8 aplicações e os campos do contrato', '8/true',
      jsonb_array_length(j->'aplicacoes')::text || '/' || (j ?& array['total','rendeu_hoje_bruto','rendeu_hoje_liquido','rendeu_mes_liquido','rendeu_desde_inicio_liquido','cdi_usado','por_dia_30','aplicacoes','explicacao','atualizado_em'])::text];
    j := produto.guardado_encerrar(aid)::jsonb;
    res := res || array['Encerrar tira a aplicação da lista', '7', jsonb_array_length(j->'aplicacoes')::text];
    res := res || array['guardado_custo_do_gasto devolve a frase', 'true', (produto.guardado_custo_do_gasto(f, 300)::jsonb->>'frase' like 'Esse gasto também custou R$ %')::text];

    -- vazamento (com a tranca de verdade ligada)
    for c in select * from (values
      ('Outra família chama guardado_hoje da Silva', paulo, format('select 1 from produto.guardado_hoje(%L)', silva), 'contar', 'bloqueado'),
      ('Pessoa (filho) chama guardado_hoje', davi, format('select 1 from produto.guardado_hoje(%L)', silva), 'contar', 'bloqueado'),
      ('Equipe chama guardado_hoje', carla, format('select 1 from produto.guardado_hoje(%L)', silva), 'contar', 'bloqueado'),
      ('Outra família lê as aplicações', paulo, 'select count(*) from produto.pat_aplicacoes', 'contar', '0'),
      ('Pessoa lê as aplicações', davi, 'select count(*) from produto.pat_aplicacoes', 'contar', '0'),
      ('Equipe lê as aplicações', carla, 'select count(*) from produto.pat_aplicacoes', 'contar', '0'),
      ('Outra família lê os movimentos', paulo, 'select count(*) from produto.pat_movimentos', 'contar', '0'),
      ('Pessoa lê os movimentos', davi, 'select count(*) from produto.pat_movimentos', 'contar', '0'),
      ('Equipe lê os movimentos', carla, 'select count(*) from produto.pat_movimentos', 'contar', '0'),
      ('Outra família calcula o Guardado desta (função interna)', paulo, format('select (produto._guardado(%L, current_date)->>''total'')::numeric::int', f), 'contar', '0'),
      ('Outra família movimenta aplicação desta', paulo, format('select 1 from produto.guardado_movimentar(%L, ''resgate'', 10, null, %L)', a1, gen_random_uuid()), 'contar', 'bloqueado'),
      ('Outra família grava movimento direto na tabela', paulo, format('insert into produto.pat_movimentos (familia_id, aplicacao_id, tipo, valor, chave, autor) values (%L, %L, ''aporte'', 10, %L, %L)', f, a1, gen_random_uuid(), paulo), 'linhas', 'bloqueado'),
      ('Equipe cria aplicação na Silva', carla, format('select 1 from produto.guardado_criar(%L, ''X'', ''Y'', ''cdb'', 100, 10)', silva), 'contar', 'bloqueado'),
      ('Casal muda o valor de um movimento já gravado', u::text, 'update produto.pat_movimentos set valor = 1', 'linhas', 'bloqueado'),
      ('Casal grava taxa do CDI direto na tabela', u::text, 'insert into produto.pat_indices (data, cdi_dia) values (''2020-01-02'', 0.4)', 'linhas', 'bloqueado'),
      ('Casal chama indice_informar (só o dono do produto pode)', u::text, 'select 1 from produto.indice_informar(''2026-11-10'', 0.05)', 'contar', 'bloqueado'),
      ('Equipe pergunta o custo do gasto: não recebe valor', carla, format('select (produto.guardado_custo_do_gasto(%L, 300)::text ~ ''bruto|liquido|frase'')::int', silva), 'contar', '0'),
      ('CONTROLE casal desta família vê as 8 aplicações dela', u::text, 'select count(*) from produto.pat_aplicacoes', 'contar', '8'),
      ('CONTROLE casal lê a tabela de taxas', u::text, 'select (count(*) > 0)::int from produto.pat_indices', 'contar', '1')
    ) as t(caso, uid, q, modo, esperado) loop
      res := res || array[c.caso, c.esperado, produto._tentativa(c.uid, 'authenticated', c.q, c.modo)];
    end loop;
    res := res || array['anon chama guardado_hoje', 'bloqueado', produto._tentativa(null, 'anon', format('select 1 from produto.guardado_hoje(%L)', silva), 'contar')];
    res := res || array['anon lê a tabela de taxas', 'bloqueado', produto._tentativa(null, 'anon', 'select count(*) from produto.pat_indices', 'contar')];

    raise exception using errcode = 'P9999', message = 'desfazer';
  exception
    when sqlstate 'P9999' then null;
    when others then res := res || array['o teste do Guardado quebrou no meio', 'sem erro', sqlerrm];
  end;
  for i in 1..coalesce(array_length(res, 1), 0) / 3 loop
    caso := res[i * 3 - 2]; esperado := res[i * 3 - 1]; obtido := res[i * 3]; ok := esperado is not distinct from obtido;
    return next;
  end loop;
end $function$
;

-- produto.teste_vazamento()
CREATE OR REPLACE FUNCTION produto.teste_vazamento()
 RETURNS TABLE(caso text, esperado text, obtido text, ok boolean)
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select * from produto._teste_vazamento_tabelas() union all select * from produto._teste_vazamento_rpc()
  union all select * from produto._teste_revisao() union all select * from produto._teste_revisao_2()
  union all select * from produto._teste_vazamento_escritorio()
$function$
;

-- produto.tocar_atualizado_em()
CREATE OR REPLACE FUNCTION produto.tocar_atualizado_em()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin new.atualizado_em := now(); return new; end $function$
;

-- public.antes_de_criar_conta()
CREATE OR REPLACE FUNCTION public.antes_de_criar_conta()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
begin
  return new;
end $function$;

-- public.carimbo_docs()
CREATE OR REPLACE FUNCTION public.carimbo_docs()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin new.atualizado_em := now(); new.atualizado_por := auth.uid(); return new; end $function$
;

-- public.criar_acesso(p_email text)
CREATE OR REPLACE FUNCTION public.criar_acesso(p_email text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
declare
  v_email text := lower(trim(p_email));
  v_id uuid := gen_random_uuid();
  v_senha text;
  v_chars text := 'abcdefghjkmnpqrstuvwxyz23456789';
  i int;
begin
  if not exists (select 1 from public.convites where email = v_email) then
    raise exception 'email % nao esta nos convites', v_email;
  end if;
  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'email % ja tem conta', v_email;
  end if;
  v_senha := '';
  for i in 1..10 loop
    v_senha := v_senha || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
  end loop;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(v_senha, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{"trocar_senha":true}'::jsonb, now(), now(),
    '', '', '', '', '', '');
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (v_id::text, v_id, jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now());
  return v_senha;
end $function$
;

-- public.depois_de_criar_conta()
CREATE OR REPLACE FUNCTION public.depois_de_criar_conta()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
begin
  insert into public.pessoas (user_id, nome, papel)
  select new.id, c.nome, c.papel from public.convites c where c.email = lower(new.email)
  on conflict (user_id) do nothing;
  return new;
end $function$
;

-- public.escritorio_abrir_turno(p_func text, p_titulo text)
CREATE OR REPLACE FUNCTION public.escritorio_abrir_turno(p_func text, p_titulo text DEFAULT 'Turno em andamento'::text)
 RETURNS bigint
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  insert into public.escritorio_turnos as t (funcionario,chave,status,titulo)
  values (p_func, p_func||':'||to_char(now() at time zone 'America/Recife','YYYY-MM-DD"h"HH24'),'trabalhando',p_titulo)
  on conflict (chave) do update set inicio=now(), fim=null, tentativas=t.tentativas+1
    where t.status='trabalhando' and t.fim is null and t.inicio < now()-interval '30 minutes'
  returning id $function$
;

-- public.escritorio_fechar_turno(p_id bigint, p jsonb)
CREATE OR REPLACE FUNCTION public.escritorio_fechar_turno(p_id bigint, p jsonb)
 RETURNS bigint
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  update public.escritorio_turnos set status=p->>'status', titulo=coalesce(p->>'titulo',''), numero=p->>'numero',
    detalhe=p->>'detalhe', pendencia=p->>'pendencia', fonte=p->>'fonte',
    extras=coalesce(p->'extras','{}'::jsonb), fim=now()
  where id=p_id and status='trabalhando' and fim is null and p->>'status' in ('entregue','precisa_de_voce','aguardando','sem_dados')
  returning id $function$
;

-- public.escritorio_painel()
CREATE OR REPLACE FUNCTION public.escritorio_painel()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',f.id,'nome',f.nome,'setor',f.setor,'turno',f.turno,
    'status',case when t.trav then 'precisa_de_voce' else coalesce(t.status,'aguardando') end,
    'titulo',coalesce(t.titulo,''),'numero',t.numero,'detalhe',t.detalhe,
    'pendencia',case when t.trav then 'O turno parou no meio. Peça pra rodar de novo.' else t.pendencia end,
    'fonte',t.fonte,'exemplo',coalesce(t.exemplo,false),
    'inicio',to_char(t.inicio at time zone 'America/Recife','YYYY-MM-DD"T"HH24:MI'),
    'fim',to_char(t.fim at time zone 'America/Recife','YYYY-MM-DD"T"HH24:MI'))
    || coalesce(t.extras,'{}'::jsonb) order by f.ordem),'[]'::jsonb)
  from public.escritorio_funcionarios f
  left join lateral (select x.*, (x.status='trabalhando' and x.fim is null and x.inicio < now()-interval '30 minutes') trav
     from public.escritorio_turnos x where x.funcionario=f.id order by x.exemplo, x.inicio desc limit 1) t on true
  where f.ativo $function$
;

-- public.guarda_historico()
CREATE OR REPLACE FUNCTION public.guarda_historico()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.docs_historico (painel, colecao, doc_id, dados_antes, acao)
  values (old.painel, old.colecao, old.doc_id, old.dados, lower(tg_op));
  return null;
end $function$
;

-- public.hoje_recife()
CREATE OR REPLACE FUNCTION public.hoje_recife()
 RETURNS date
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$ select (now() at time zone 'America/Recife')::date $function$
;

-- public.papel_atual()
CREATE OR REPLACE FUNCTION public.papel_atual()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select papel from public.pessoas where user_id = auth.uid()
$function$
;

-- public.ping()
CREATE OR REPLACE FUNCTION public.ping()
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$ select 'central-da-familia ok' $function$
;

-- public.pode_mexer(p text)
CREATE OR REPLACE FUNCTION public.pode_mexer(p text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case public.papel_atual()
    when 'romero' then true
    when 'andreza' then p = 'andreza'
    when 'jobson' then p = 'feira'
    else false end
$function$
;

-- public.pode_ver(p text)
CREATE OR REPLACE FUNCTION public.pode_ver(p text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.pode_mexer(p) or (public.papel_atual() = 'andreza' and p = 'feira')
$function$
;

-- public.usina_apagar(p_pasta text, p_item text)
CREATE OR REPLACE FUNCTION public.usina_apagar(p_pasta text, p_item text)
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with d as (delete from usina_dados where pasta=p_pasta and item=p_item and pasta in ('chamados','adesoes','contas','cenarios') returning 1) select count(*)::int from d;
$function$
;

-- public.usina_apagar_exemplos()
CREATE OR REPLACE FUNCTION public.usina_apagar_exemplos()
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with d as (delete from usina_dados where pasta in ('clientes','faturas','diario','pagamentos','atividades','contas','chamados','adesoes') and (dados->>'exemplo')::boolean is true returning 1) select count(*)::int from d;
$function$
;

-- public.usina_gravar(p_pasta text, p_item text, p_dados jsonb)
CREATE OR REPLACE FUNCTION public.usina_gravar(p_pasta text, p_item text, p_dados jsonb)
 RETURNS timestamp with time zone
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  insert into usina_dados(pasta,item,dados,atualizado_em) values (p_pasta,p_item,p_dados,now())
  on conflict (pasta,item) do update set dados=excluded.dados, atualizado_em=now()
  returning atualizado_em;
$function$
;

-- public.usina_painel()
CREATE OR REPLACE FUNCTION public.usina_painel()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'clientes', coalesce((select jsonb_agg(dados || jsonb_build_object('id',item) order by item) from usina_dados where pasta='clientes'),'[]'::jsonb),
    'faturas',  coalesce((select jsonb_object_agg(item, dados) from usina_dados where pasta='faturas'),'{}'::jsonb),
    'geracao',  coalesce((select jsonb_object_agg(item, dados->'kwh') from usina_dados where pasta='geracao'),'{}'::jsonb),
    'config',   (select dados from usina_dados where pasta='config' and item='usina'),
    'equipe',   coalesce((select jsonb_agg(dados || jsonb_build_object('id',item) order by (dados->>'ordem')::int) from usina_dados where pasta='equipe'),'[]'::jsonb),
    'atividades', coalesce((select jsonb_agg(x order by x->>'quando' desc) from (select dados || jsonb_build_object('id',item) x from usina_dados where pasta='atividades' order by atualizado_em desc limit 60) t),'[]'::jsonb),
    'contas',   coalesce((select jsonb_object_agg(item, dados) from usina_dados where pasta='contas'),'{}'::jsonb),
    'chamados', coalesce((select jsonb_object_agg(item, dados) from usina_dados where pasta='chamados'),'{}'::jsonb),
    'adesoes',  coalesce((select jsonb_object_agg(item, dados) from usina_dados where pasta='adesoes'),'{}'::jsonb),
    'diario',   coalesce((select jsonb_object_agg(item, dados) from (select item, dados from usina_dados where pasta='diario' order by item desc limit 400) d),'{}'::jsonb),
    'pagamentos', coalesce((select jsonb_agg(x order by x->>'pagoEm' desc) from (select dados || jsonb_build_object('id',item) x from usina_dados where pasta='pagamentos' order by atualizado_em desc limit 100) t),'[]'::jsonb),
    'cenarios', coalesce((select jsonb_object_agg(item, dados) from usina_dados where pasta='cenarios'),'{}'::jsonb),
    'atualizado_em', (select max(atualizado_em) from usina_dados)
  );
$function$
;

-- public.usina_registrar_atividade(p_agente text, p_titulo text, p_status text, p_numero text, p_detalhe text, p_fonte text)
CREATE OR REPLACE FUNCTION public.usina_registrar_atividade(p_agente text, p_titulo text, p_status text DEFAULT 'feito'::text, p_numero text DEFAULT NULL::text, p_detalhe text DEFAULT NULL::text, p_fonte text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  insert into usina_dados(pasta,item,dados)
  values ('atividades', p_agente||'-'||to_char(now() at time zone 'America/Recife','YYYYMMDD-HH24MISS-MS'),
    jsonb_strip_nulls(jsonb_build_object('agente',p_agente,'titulo',p_titulo,'status',p_status,'numero',p_numero,'detalhe',p_detalhe,'fonte',p_fonte,
      'quando',to_char(now() at time zone 'America/Recife','YYYY-MM-DD"T"HH24:MI'))))
  returning item;
$function$
;

-- public.usina_registrar_pagamento(p_fatura text, p_asaas text, p_valor numeric, p_pago_em date, p_forma text, p_evento text)
CREATE OR REPLACE FUNCTION public.usina_registrar_pagamento(p_fatura text, p_asaas text, p_valor numeric, p_pago_em date, p_forma text, p_evento text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare f jsonb; ja jsonb; v_item text := coalesce(nullif(p_asaas,''), nullif(p_fatura,''));
begin
  if v_item is null then return jsonb_build_object('ok',false,'motivo','sem id'); end if;
  select dados into ja from usina_dados where pasta='pagamentos' and item=v_item;
  select dados into f from usina_dados where pasta='faturas' and item=p_fatura;
  if f is null then
    insert into usina_dados(pasta,item,dados) values ('pagamentos', v_item, jsonb_build_object('faturaId',p_fatura,'asaasId',p_asaas,'valorPago',p_valor,'pagoEm',p_pago_em,'forma',p_forma,'evento',p_evento,'achou_fatura',false))
    on conflict (pasta,item) do update set dados=excluded.dados, atualizado_em=now();
    return jsonb_build_object('ok',false,'motivo','fatura não encontrada');
  end if;
  update usina_dados set dados = dados || jsonb_strip_nulls(jsonb_build_object('pagoEm',p_pago_em,'valorPago',p_valor,'formaPagamento',p_forma,'asaasId',p_asaas,'baixaAutomatica',true)), atualizado_em=now()
   where pasta='faturas' and item=p_fatura;
  insert into usina_dados(pasta,item,dados) values ('pagamentos', v_item, jsonb_build_object('faturaId',p_fatura,'asaasId',p_asaas,'valorPago',p_valor,'pagoEm',p_pago_em,'forma',p_forma,'evento',p_evento,'achou_fatura',true))
  on conflict (pasta,item) do update set dados=excluded.dados, atualizado_em=now();
  -- Idempotente: o Asaas pode mandar o mesmo pagamento mais de uma vez (CONFIRMED e depois RECEIVED, ou reenvio).
  if ja is null or coalesce((ja->>'achou_fatura')::boolean,false) is false then
    perform usina_registrar_atividade('cobrador','Pagamento recebido: '||coalesce(f->>'nome',p_fatura),'feito',
      'R$ '||translate(to_char(coalesce(p_valor,0),'FM999G999G990D00'),',.','.,'),
      'Baixa automática pelo Asaas ('||coalesce(p_forma,'')||').','Asaas');
    return jsonb_build_object('ok',true,'repetido',false);
  end if;
  return jsonb_build_object('ok',true,'repetido',true);
end $function$
;

drop policy if exists acesso_apagar on produto.acesso_equipe; create policy acesso_apagar on produto.acesso_equipe as PERMISSIVE for DELETE to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists acesso_criar on produto.acesso_equipe; create policy acesso_criar on produto.acesso_equipe as PERMISSIVE for INSERT to authenticated with check ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists acesso_mudar on produto.acesso_equipe; create policy acesso_mudar on produto.acesso_equipe as PERMISSIVE for UPDATE to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel))) with check ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists acesso_ver on produto.acesso_equipe; create policy acesso_ver on produto.acesso_equipe as PERMISSIVE for SELECT to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists cartao_custos_criar on produto.cartao_custos; create policy cartao_custos_criar on produto.cartao_custos as PERMISSIVE for INSERT to authenticated with check ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists cartao_custos_mudar on produto.cartao_custos; create policy cartao_custos_mudar on produto.cartao_custos as PERMISSIVE for UPDATE to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel))) with check ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists cartao_custos_ver on produto.cartao_custos; create policy cartao_custos_ver on produto.cartao_custos as PERMISSIVE for SELECT to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists cartao_faturas_criar on produto.cartao_faturas; create policy cartao_faturas_criar on produto.cartao_faturas as PERMISSIVE for INSERT to authenticated with check ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists cartao_faturas_mudar on produto.cartao_faturas; create policy cartao_faturas_mudar on produto.cartao_faturas as PERMISSIVE for UPDATE to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel))) with check ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists cartao_faturas_ver on produto.cartao_faturas; create policy cartao_faturas_ver on produto.cartao_faturas as PERMISSIVE for SELECT to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists cartoes_apagar on produto.cartoes; create policy cartoes_apagar on produto.cartoes as PERMISSIVE for DELETE to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists cartoes_criar on produto.cartoes; create policy cartoes_criar on produto.cartoes as PERMISSIVE for INSERT to authenticated with check ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists cartoes_mudar on produto.cartoes; create policy cartoes_mudar on produto.cartoes as PERMISSIVE for UPDATE to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel))) with check ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists cartoes_ver on produto.cartoes; create policy cartoes_ver on produto.cartoes as PERMISSIVE for SELECT to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text, 'pessoa'::text]) AS familias_com_papel)));
drop policy if exists config_apagar on produto.config_familia; create policy config_apagar on produto.config_familia as PERMISSIVE for DELETE to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists config_criar on produto.config_familia; create policy config_criar on produto.config_familia as PERMISSIVE for INSERT to authenticated with check ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists config_mudar on produto.config_familia; create policy config_mudar on produto.config_familia as PERMISSIVE for UPDATE to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel))) with check ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists config_ver on produto.config_familia; create policy config_ver on produto.config_familia as PERMISSIVE for SELECT to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists donos_ver_proprio on produto.donos_produto; create policy donos_ver_proprio on produto.donos_produto as PERMISSIVE for SELECT to authenticated using ((user_id = ( SELECT auth.uid() AS uid)));
drop policy if exists envelopes_apagar on produto.envelopes; create policy envelopes_apagar on produto.envelopes as PERMISSIVE for DELETE to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists envelopes_criar on produto.envelopes; create policy envelopes_criar on produto.envelopes as PERMISSIVE for INSERT to authenticated with check ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists envelopes_mudar on produto.envelopes; create policy envelopes_mudar on produto.envelopes as PERMISSIVE for UPDATE to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel))) with check ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists envelopes_ver on produto.envelopes; create policy envelopes_ver on produto.envelopes as PERMISSIVE for SELECT to authenticated using (((id IN ( SELECT produto.meus_envelopes() AS meus_envelopes)) AND (familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text, 'pessoa'::text]) AS familias_com_papel))));
drop policy if exists esc_diario_criar on produto.esc_diario; create policy esc_diario_criar on produto.esc_diario as PERMISSIVE for INSERT to authenticated with check (((respondido_por = ( SELECT auth.uid() AS uid)) AND ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)) OR (casa AND (familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['equipe'::text]) AS familias_com_papel)) AND (funcionario = ANY (ARRAY['comprador'::text, 'fiscal_feira'::text])) AND (assunto = ANY (ARRAY['prestador_veio'::text, 'gas'::text, 'feira_feita'::text, 'feira_nota'::text, 'estoque'::text])) AND (NOT (dados ?| ARRAY['valor'::text, 'diferenca'::text, 'valor_pergunta'::text])) AND (pergunta !~ 'R\$'::text) AND (resposta !~ 'R\$'::text)))));
drop policy if exists esc_diario_ver on produto.esc_diario; create policy esc_diario_ver on produto.esc_diario as PERMISSIVE for SELECT to authenticated using (((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)) OR (casa AND (familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['equipe'::text]) AS familias_com_papel)))));
drop policy if exists esc_lembretes_criar on produto.esc_lembretes; create policy esc_lembretes_criar on produto.esc_lembretes as PERMISSIVE for INSERT to authenticated with check (((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)) AND (criado_por = ( SELECT auth.uid() AS uid))));
drop policy if exists esc_lembretes_mudar on produto.esc_lembretes; create policy esc_lembretes_mudar on produto.esc_lembretes as PERMISSIVE for UPDATE to authenticated using (((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)) AND ((para <> 'eu'::text) OR (criado_por = ( SELECT auth.uid() AS uid))))) with check ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists esc_lembretes_ver on produto.esc_lembretes; create policy esc_lembretes_ver on produto.esc_lembretes as PERMISSIVE for SELECT to authenticated using (((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)) AND ((para <> 'eu'::text) OR (criado_por = ( SELECT auth.uid() AS uid)))));
drop policy if exists estoque_contagens_criar on produto.estoque_contagens; create policy estoque_contagens_criar on produto.estoque_contagens as PERMISSIVE for INSERT to authenticated with check (((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text, 'equipe'::text]) AS familias_com_papel)) AND (contado_por = ( SELECT auth.uid() AS uid))));
drop policy if exists estoque_contagens_ver on produto.estoque_contagens; create policy estoque_contagens_ver on produto.estoque_contagens as PERMISSIVE for SELECT to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text, 'equipe'::text]) AS familias_com_papel)));
drop policy if exists estoque_itens_criar on produto.estoque_itens; create policy estoque_itens_criar on produto.estoque_itens as PERMISSIVE for INSERT to authenticated with check ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text, 'equipe'::text]) AS familias_com_papel)));
drop policy if exists estoque_itens_mudar on produto.estoque_itens; create policy estoque_itens_mudar on produto.estoque_itens as PERMISSIVE for UPDATE to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text, 'equipe'::text]) AS familias_com_papel))) with check ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text, 'equipe'::text]) AS familias_com_papel)));
drop policy if exists estoque_itens_ver on produto.estoque_itens; create policy estoque_itens_ver on produto.estoque_itens as PERMISSIVE for SELECT to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text, 'equipe'::text]) AS familias_com_papel)));
drop policy if exists eventos_criar on produto.eventos; create policy eventos_criar on produto.eventos as PERMISSIVE for INSERT to authenticated with check (((familia_id IN ( SELECT produto.minhas_familias() AS minhas_familias)) AND (user_id = ( SELECT auth.uid() AS uid))));
drop policy if exists eventos_ver on produto.eventos; create policy eventos_ver on produto.eventos as PERMISSIVE for SELECT to authenticated using (((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)) OR (( SELECT auth.uid() AS uid) IN ( SELECT d.user_id
   FROM produto.donos_produto d))));
drop policy if exists eventos_ver_dono on produto.eventos; create policy eventos_ver_dono on produto.eventos as PERMISSIVE for SELECT to service_role using (false);
drop policy if exists familias_apagar on produto.familias; create policy familias_apagar on produto.familias as PERMISSIVE for DELETE to authenticated using ((id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists familias_mudar on produto.familias; create policy familias_mudar on produto.familias as PERMISSIVE for UPDATE to authenticated using ((id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel))) with check ((id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists familias_ver on produto.familias; create policy familias_ver on produto.familias as PERMISSIVE for SELECT to authenticated using (((id IN ( SELECT produto.minhas_familias() AS minhas_familias)) OR (( SELECT auth.uid() AS uid) IN ( SELECT d.user_id
   FROM produto.donos_produto d))));
drop policy if exists familias_ver_dono on produto.familias; create policy familias_ver_dono on produto.familias as PERMISSIVE for SELECT to service_role using (false);
drop policy if exists feiras_criar on produto.feiras; create policy feiras_criar on produto.feiras as PERMISSIVE for INSERT to authenticated with check (((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text, 'equipe'::text]) AS familias_com_papel)) AND (feita_por = ( SELECT auth.uid() AS uid))));
drop policy if exists feiras_mudar on produto.feiras; create policy feiras_mudar on produto.feiras as PERMISSIVE for UPDATE to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text, 'equipe'::text]) AS familias_com_papel))) with check ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text, 'equipe'::text]) AS familias_com_papel)));
drop policy if exists feiras_ver on produto.feiras; create policy feiras_ver on produto.feiras as PERMISSIVE for SELECT to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text, 'equipe'::text]) AS familias_com_papel)));
drop policy if exists feriados_ver on produto.feriados; create policy feriados_ver on produto.feriados as PERMISSIVE for SELECT to authenticated using (true);
drop policy if exists ia_chamadas_casal_le on produto.ia_chamadas; create policy ia_chamadas_casal_le on produto.ia_chamadas as PERMISSIVE for SELECT to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists lanc_apagar on produto.lancamentos; create policy lanc_apagar on produto.lancamentos as PERMISSIVE for DELETE to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists lanc_criar on produto.lancamentos; create policy lanc_criar on produto.lancamentos as PERMISSIVE for INSERT to authenticated with check (((envelope_id IN ( SELECT produto.meus_envelopes() AS meus_envelopes)) AND (autor = ( SELECT auth.uid() AS uid)) AND ((cartao_id IS NULL) OR (familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text, 'pessoa'::text]) AS familias_com_papel)))));
drop policy if exists lanc_mudar on produto.lancamentos; create policy lanc_mudar on produto.lancamentos as PERMISSIVE for UPDATE to authenticated using (((envelope_id IN ( SELECT produto.meus_envelopes() AS meus_envelopes)) AND ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)) OR (autor = ( SELECT auth.uid() AS uid))))) with check (((envelope_id IN ( SELECT produto.meus_envelopes() AS meus_envelopes)) AND ((cartao_id IS NULL) OR (familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text, 'pessoa'::text]) AS familias_com_papel)))));
drop policy if exists lanc_ver on produto.lancamentos; create policy lanc_ver on produto.lancamentos as PERMISSIVE for SELECT to authenticated using (((envelope_id IN ( SELECT produto.meus_envelopes() AS meus_envelopes)) AND ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text, 'pessoa'::text]) AS familias_com_papel)) OR (autor = ( SELECT auth.uid() AS uid)))));
drop policy if exists limites_apagar on produto.limites_mes; create policy limites_apagar on produto.limites_mes as PERMISSIVE for DELETE to authenticated using (((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)) AND (mes >= to_char((((now() AT TIME ZONE 'America/Recife'::text))::date)::timestamp with time zone, 'YYYY-MM'::text))));
drop policy if exists limites_criar on produto.limites_mes; create policy limites_criar on produto.limites_mes as PERMISSIVE for INSERT to authenticated with check (((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)) AND (mes >= to_char((((now() AT TIME ZONE 'America/Recife'::text))::date)::timestamp with time zone, 'YYYY-MM'::text))));
drop policy if exists limites_mudar on produto.limites_mes; create policy limites_mudar on produto.limites_mes as PERMISSIVE for UPDATE to authenticated using (((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)) AND (mes >= to_char((((now() AT TIME ZONE 'America/Recife'::text))::date)::timestamp with time zone, 'YYYY-MM'::text)))) with check (((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)) AND (mes >= to_char((((now() AT TIME ZONE 'America/Recife'::text))::date)::timestamp with time zone, 'YYYY-MM'::text))));
drop policy if exists limites_ver on produto.limites_mes; create policy limites_ver on produto.limites_mes as PERMISSIVE for SELECT to authenticated using (((envelope_id IN ( SELECT produto.meus_envelopes() AS meus_envelopes)) AND (familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text, 'pessoa'::text]) AS familias_com_papel))));
drop policy if exists membros_apagar on produto.membros; create policy membros_apagar on produto.membros as PERMISSIVE for DELETE to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists membros_criar on produto.membros; create policy membros_criar on produto.membros as PERMISSIVE for INSERT to authenticated with check ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists membros_mudar on produto.membros; create policy membros_mudar on produto.membros as PERMISSIVE for UPDATE to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel))) with check ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists membros_ver on produto.membros; create policy membros_ver on produto.membros as PERMISSIVE for SELECT to authenticated using (((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)) OR (user_id = ( SELECT auth.uid() AS uid))));
drop policy if exists pat_aplicacoes_criar on produto.pat_aplicacoes; create policy pat_aplicacoes_criar on produto.pat_aplicacoes as PERMISSIVE for INSERT to authenticated with check (((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)) AND (criado_por = ( SELECT auth.uid() AS uid))));
drop policy if exists pat_aplicacoes_mudar on produto.pat_aplicacoes; create policy pat_aplicacoes_mudar on produto.pat_aplicacoes as PERMISSIVE for UPDATE to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel))) with check ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists pat_aplicacoes_ver on produto.pat_aplicacoes; create policy pat_aplicacoes_ver on produto.pat_aplicacoes as PERMISSIVE for SELECT to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists pat_indices_corrigir on produto.pat_indices; create policy pat_indices_corrigir on produto.pat_indices as PERMISSIVE for UPDATE to authenticated using ((( SELECT auth.uid() AS uid) IN ( SELECT d.user_id
   FROM produto.donos_produto d))) with check ((( SELECT auth.uid() AS uid) IN ( SELECT d.user_id
   FROM produto.donos_produto d)));
drop policy if exists pat_indices_informar on produto.pat_indices; create policy pat_indices_informar on produto.pat_indices as PERMISSIVE for INSERT to authenticated with check ((( SELECT auth.uid() AS uid) IN ( SELECT d.user_id
   FROM produto.donos_produto d)));
drop policy if exists pat_indices_ver on produto.pat_indices; create policy pat_indices_ver on produto.pat_indices as PERMISSIVE for SELECT to authenticated using (true);
drop policy if exists pat_movimentos_anular on produto.pat_movimentos; create policy pat_movimentos_anular on produto.pat_movimentos as PERMISSIVE for UPDATE to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel))) with check ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists pat_movimentos_criar on produto.pat_movimentos; create policy pat_movimentos_criar on produto.pat_movimentos as PERMISSIVE for INSERT to authenticated with check (((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)) AND (autor = ( SELECT auth.uid() AS uid))));
drop policy if exists pat_movimentos_ver on produto.pat_movimentos; create policy pat_movimentos_ver on produto.pat_movimentos as PERMISSIVE for SELECT to authenticated using ((familia_id IN ( SELECT produto.familias_com_papel(VARIADIC ARRAY['casal'::text]) AS familias_com_papel)));
drop policy if exists tentativas_ver_proprias on produto.tentativas_equipe; create policy tentativas_ver_proprias on produto.tentativas_equipe as PERMISSIVE for SELECT to authenticated using ((user_id = ( SELECT auth.uid() AS uid)));
drop policy if exists teste_resultados_dono on produto.teste_resultados; create policy teste_resultados_dono on produto.teste_resultados as PERMISSIVE for SELECT to authenticated using ((( SELECT auth.uid() AS uid) IN ( SELECT d.user_id
   FROM produto.donos_produto d)));
drop policy if exists convites_romero on public.convites; create policy convites_romero on public.convites as PERMISSIVE for ALL to authenticated using ((papel_atual() = 'romero'::text)) with check ((papel_atual() = 'romero'::text));
drop policy if exists docs_apagar on public.docs; create policy docs_apagar on public.docs as PERMISSIVE for DELETE to authenticated using (pode_mexer(painel));
drop policy if exists docs_criar on public.docs; create policy docs_criar on public.docs as PERMISSIVE for INSERT to authenticated with check (pode_mexer(painel));
drop policy if exists docs_mudar on public.docs; create policy docs_mudar on public.docs as PERMISSIVE for UPDATE to authenticated using (pode_mexer(painel)) with check (pode_mexer(painel));
drop policy if exists docs_ver on public.docs; create policy docs_ver on public.docs as PERMISSIVE for SELECT to authenticated using (pode_ver(painel));
drop policy if exists hist_romero on public.docs_historico; create policy hist_romero on public.docs_historico as PERMISSIVE for SELECT to authenticated using ((papel_atual() = 'romero'::text));
drop policy if exists escritorio_func_ler on public.escritorio_funcionarios; create policy escritorio_func_ler on public.escritorio_funcionarios as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM pessoas p
  WHERE ((p.user_id = auth.uid()) AND (p.papel = ANY (ARRAY['romero'::text, 'andreza'::text]))))));
drop policy if exists escritorio_turnos_ler on public.escritorio_turnos; create policy escritorio_turnos_ler on public.escritorio_turnos as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM pessoas p
  WHERE ((p.user_id = auth.uid()) AND (p.papel = ANY (ARRAY['romero'::text, 'andreza'::text]))))));
drop policy if exists pessoas_romero on public.pessoas; create policy pessoas_romero on public.pessoas as PERMISSIVE for ALL to authenticated using ((papel_atual() = 'romero'::text)) with check ((papel_atual() = 'romero'::text));
drop policy if exists pessoas_ver on public.pessoas; create policy pessoas_ver on public.pessoas as PERMISSIVE for SELECT to authenticated using (((user_id = auth.uid()) OR (papel_atual() = 'romero'::text)));
drop policy if exists usina_dados_sem_acesso_publico on public.usina_dados; create policy usina_dados_sem_acesso_publico on public.usina_dados as RESTRICTIVE for ALL to anon, authenticated using (false) with check (false);
