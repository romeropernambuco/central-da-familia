-- Reconstruído em 22/11/2026 a partir do banco real (pg_get_functiondef e permissões de cada função).
-- A migração original (versão 20261121161542, aplicada em 21/11/2026) não estava no repositório.
-- O texto das funções é o que está no ar; as permissões são as que o banco mostra: só "authenticated" executa.

CREATE OR REPLACE FUNCTION produto.etiqueta_salvar(familia uuid, nome text, inicio date DEFAULT NULL::date, fim date DEFAULT NULL::date, moeda text DEFAULT 'BRL'::text, pessoas integer DEFAULT NULL::integer, etiqueta uuid DEFAULT NULL::uuid, arquivada boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_variable
declare
  f uuid := etiqueta_salvar.familia;
  v_id uuid := coalesce(etiqueta_salvar.etiqueta, gen_random_uuid());
  v_nome text := btrim(etiqueta_salvar.nome);
  v_moeda text := upper(coalesce(nullif(btrim(etiqueta_salvar.moeda), ''), 'BRL'));
  v_ini date := etiqueta_salvar.inicio;
  v_fim date := etiqueta_salvar.fim;
  v_arq boolean := coalesce(etiqueta_salvar.arquivada, false);
  n int := 0;
begin
  if (select auth.uid()) is null or produto.meu_papel(f) is distinct from 'casal' then
    raise exception 'so o casal cria e muda etiqueta' using errcode = '42501';
  end if;
  if v_nome is null or char_length(v_nome) not between 1 and 60 then
    raise exception 'o nome da etiqueta tem que ter de 1 a 60 letras' using errcode = '22023';
  end if;
  if (v_ini is null) <> (v_fim is null) then
    raise exception 'informe o inicio e o fim juntos, ou nenhum dos dois' using errcode = '22023';
  end if;
  if v_fim < v_ini then
    raise exception 'o fim nao pode ser antes do inicio' using errcode = '22023';
  end if;
  if v_fim - v_ini > 366 then
    raise exception 'o periodo passou de 1 ano; confira as datas' using errcode = '22023';
  end if;
  if v_moeda !~ '^[A-Z]{3}$' then
    raise exception 'moeda tem que ter 3 letras, como EUR, USD ou BRL' using errcode = '22023';
  end if;
  if etiqueta_salvar.pessoas is not null and etiqueta_salvar.pessoas not between 1 and 50 then
    raise exception 'pessoas tem que ser de 1 a 50' using errcode = '22023';
  end if;

  begin
    if etiqueta_salvar.etiqueta is not null then
      update produto.etiquetas e
         set nome = v_nome, inicio = v_ini, fim = v_fim, moeda = v_moeda,
             pessoas = etiqueta_salvar.pessoas, arquivada = v_arq, atualizado_em = now()
       where e.id = etiqueta_salvar.etiqueta and e.familia_id = f;
      if not found then
        raise exception 'etiqueta nao encontrada' using errcode = 'P0002';
      end if;
    else
      if (select count(*) from produto.etiquetas e where e.familia_id = f) >= 200 then
        raise exception 'a familia ja tem 200 etiquetas; arquive alguma' using errcode = '54000';
      end if;
      insert into produto.etiquetas (id, familia_id, nome, inicio, fim, moeda, pessoas, arquivada)
      values (v_id, f, v_nome, v_ini, v_fim, v_moeda, etiqueta_salvar.pessoas, v_arq);
    end if;
  exception when unique_violation then
    raise exception 'ja existe uma etiqueta com esse nome' using errcode = '23505';
  end;

  -- aplica no que ja foi lancado no periodo; respeita etiqueta tirada a mao e o teto de 3
  if v_ini is not null and not v_arq then
    insert into produto.lancamento_etiquetas (lancamento_id, etiqueta_id, familia_id, automatica)
    select l.id, v_id, f, true
      from produto.lancamentos l
     where l.familia_id = f and l.apagado_em is null
       and l.data between v_ini and v_fim
       and (select count(*) from produto.lancamento_etiquetas x
             where x.lancamento_id = l.id and x.ativa) < 3
    on conflict do nothing;
    get diagnostics n = row_count;
  end if;

  return json_build_object(
    'etiqueta', (select to_json(e) from produto.etiquetas e where e.id = v_id),
    'aplicada_em', n);
end $function$
;

CREATE OR REPLACE FUNCTION produto.etiquetar(lancamento uuid, etiqueta uuid, ligar boolean DEFAULT true)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_variable
declare
  v_lanc uuid := etiquetar.lancamento;
  v_etq uuid := etiquetar.etiqueta;
  v_fam uuid;
begin
  select l.familia_id into v_fam from produto.lancamentos l
   where l.id = v_lanc and l.apagado_em is null;
  if v_fam is null or (select auth.uid()) is null
     or produto.meu_papel(v_fam) is distinct from 'casal' then
    raise exception 'lancamento nao encontrado ou sem permissao' using errcode = '42501';
  end if;
  if not exists (select 1 from produto.etiquetas e where e.id = v_etq and e.familia_id = v_fam) then
    raise exception 'etiqueta nao encontrada' using errcode = 'P0002';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('etq:' || v_lanc::text, 0));
  if coalesce(etiquetar.ligar, true) then
    if not exists (select 1 from produto.lancamento_etiquetas x
                    where x.lancamento_id = v_lanc and x.etiqueta_id = v_etq and x.ativa)
       and (select count(*) from produto.lancamento_etiquetas x
             where x.lancamento_id = v_lanc and x.ativa) >= 3 then
      raise exception 'cada lancamento aceita ate 3 etiquetas' using errcode = '54000';
    end if;
    insert into produto.lancamento_etiquetas (lancamento_id, etiqueta_id, familia_id, ativa, automatica)
    values (v_lanc, v_etq, v_fam, true, false)
    on conflict (lancamento_id, etiqueta_id) do update set ativa = true, automatica = false;
  else
    insert into produto.lancamento_etiquetas (lancamento_id, etiqueta_id, familia_id, ativa, automatica)
    values (v_lanc, v_etq, v_fam, false, false)
    on conflict (lancamento_id, etiqueta_id) do update set ativa = false, automatica = false;
  end if;
  return json_build_object(
    'lancamento', v_lanc,
    'etiquetas', (select coalesce(json_agg(json_build_object(
                     'id', e.id, 'nome', e.nome, 'automatica', x.automatica) order by e.nome), '[]')
                    from produto.lancamento_etiquetas x
                    join produto.etiquetas e on e.id = x.etiqueta_id
                   where x.lancamento_id = v_lanc and x.ativa));
end $function$
;

CREATE OR REPLACE FUNCTION produto.etiqueta_resumo(etiqueta uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_variable
declare
  e produto.etiquetas;
  v_dias int;
  v_pessoas int;
  r record;
begin
  select * into e from produto.etiquetas x where x.id = etiqueta_resumo.etiqueta;
  if e.id is null or (select auth.uid()) is null
     or produto.meu_papel(e.familia_id) is distinct from 'casal' then
    raise exception 'etiqueta nao encontrada ou sem permissao' using errcode = '42501';
  end if;
  v_dias := case when e.inicio is not null then e.fim - e.inicio + 1 end;
  v_pessoas := coalesce(e.pessoas, nullif((select count(*) from produto.membros m
     where m.familia_id = e.familia_id and m.ativo and m.papel in ('casal', 'pessoa')), 0)::int);

  select count(*) as qtd,
         coalesce(sum(l.valor), 0) as total,
         coalesce(sum(l.valor) filter (where e.inicio is not null and l.data < e.inicio), 0) as antes,
         coalesce(sum(l.valor) filter (where e.inicio is null or l.data between e.inicio and e.fim), 0) as durante,
         coalesce(sum(l.valor) filter (where e.inicio is not null and l.data > e.fim), 0) as depois
    into r
    from produto.lancamentos l
    join produto.lancamento_etiquetas x on x.lancamento_id = l.id and x.ativa
   where x.etiqueta_id = e.id and l.apagado_em is null;

  return json_build_object(
    'etiqueta', to_json(e),
    'dias', v_dias,
    'pessoas', v_pessoas,
    'lancamentos', r.qtd,
    'total', r.total,
    'antes', r.antes,
    'durante', r.durante,
    'depois', r.depois,
    'por_dia', case when v_dias > 0 then round(r.durante / v_dias, 2) end,
    'por_pessoa_dia', case when v_dias > 0 and v_pessoas > 0 then round(r.durante / v_dias / v_pessoas, 2) end,
    'por_envelope', (select coalesce(json_agg(t order by t.total desc), '[]') from (
        select en.nome as envelope, sum(l.valor) as total,
               round(100 * sum(l.valor) / nullif(r.total, 0), 1) as pct
          from produto.lancamentos l
          join produto.lancamento_etiquetas x on x.lancamento_id = l.id and x.ativa
          left join produto.envelopes en on en.id = l.envelope_id
         where x.etiqueta_id = e.id and l.apagado_em is null
         group by en.nome) t),
    'por_moeda', (select coalesce(json_agg(t order by t.valor_brl desc), '[]') from (
        select coalesce(l.moeda_original, 'BRL') as moeda,
               sum(coalesce(l.valor_original, l.valor)) as valor_original,
               sum(l.valor) as valor_brl,
               round(sum(l.valor) / nullif(sum(coalesce(l.valor_original, l.valor)), 0), 4) as cambio_medio
          from produto.lancamentos l
          join produto.lancamento_etiquetas x on x.lancamento_id = l.id and x.ativa
         where x.etiqueta_id = e.id and l.apagado_em is null
         group by 1) t),
    'por_data', (select coalesce(json_agg(t order by t.data), '[]') from (
        select l.data, sum(l.valor) as total, count(*) as lancamentos
          from produto.lancamentos l
          join produto.lancamento_etiquetas x on x.lancamento_id = l.id and x.ativa
         where x.etiqueta_id = e.id and l.apagado_em is null
         group by l.data) t));
end $function$
;

CREATE OR REPLACE FUNCTION produto.etiqueta_simular(etiqueta uuid, dias integer, pessoas integer DEFAULT NULL::integer)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_variable
declare
  base json := produto.etiqueta_resumo(etiqueta_simular.etiqueta);
  v_ppd numeric := (base->>'por_pessoa_dia')::numeric;
  v_pes_base int := (base->>'pessoas')::int;
  v_pes int := coalesce(etiqueta_simular.pessoas, v_pes_base);
  v_dia_viagem numeric;
  v_antes_proporcional numeric;
begin
  if etiqueta_simular.dias is null or etiqueta_simular.dias not between 1 and 366 then
    raise exception 'dias tem que ser de 1 a 366' using errcode = '22023';
  end if;
  if v_pes is null or v_pes not between 1 and 50 then
    raise exception 'pessoas tem que ser de 1 a 50' using errcode = '22023';
  end if;
  if v_ppd is null then
    raise exception 'a etiqueta precisa de datas e de gastos durante a viagem pra simular' using errcode = '22023';
  end if;
  v_dia_viagem := round(v_ppd * v_pes * etiqueta_simular.dias, 2);
  v_antes_proporcional := round((base->>'antes')::numeric * v_pes / nullif(v_pes_base, 0), 2);
  return json_build_object(
    'base', json_build_object('etiqueta', base->'etiqueta'->>'nome', 'por_pessoa_dia', v_ppd,
                              'dias', base->'dias', 'pessoas', v_pes_base),
    'dias', etiqueta_simular.dias,
    'pessoas', v_pes,
    'gasto_durante', v_dia_viagem,
    'pago_antes_referencia', v_antes_proporcional,
    'total_estimado', v_dia_viagem + coalesce(v_antes_proporcional, 0),
    'aviso', 'Estimativa com o gasto real da viagem base. Passagem e hotel variam por destino e data: confirme o preco do dia.');
end $function$
;

CREATE OR REPLACE FUNCTION produto.etiquetas_da_familia(familia uuid, incluir_arquivadas boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_variable
declare
  f uuid := etiquetas_da_familia.familia;
  v_papel text := produto.meu_papel(f);
begin
  if (select auth.uid()) is null or v_papel is null or v_papel not in ('casal', 'pessoa') then
    raise exception 'sem permissao' using errcode = '42501';
  end if;
  return (select coalesce(json_agg(t order by t.inicio desc nulls last, t.nome), '[]') from (
    select e.id, e.nome, e.inicio, e.fim, e.moeda, e.pessoas, e.arquivada,
           case when v_papel = 'casal' then
             (select coalesce(sum(l.valor), 0) from produto.lancamentos l
                join produto.lancamento_etiquetas x on x.lancamento_id = l.id and x.ativa
               where x.etiqueta_id = e.id and l.apagado_em is null) end as total,
           (select count(*) from produto.lancamento_etiquetas x
             join produto.lancamentos l on l.id = x.lancamento_id and l.apagado_em is null
            where x.etiqueta_id = e.id and x.ativa) as lancamentos
      from produto.etiquetas e
     where e.familia_id = f and (coalesce(etiquetas_da_familia.incluir_arquivadas, false) or not e.arquivada)) t);
end $function$
;

revoke all on function produto.etiqueta_salvar(uuid, text, date, date, text, integer, uuid, boolean) from public, anon;
revoke all on function produto.etiquetar(uuid, uuid, boolean) from public, anon;
revoke all on function produto.etiqueta_resumo(uuid) from public, anon;
revoke all on function produto.etiqueta_simular(uuid, integer, integer) from public, anon;
revoke all on function produto.etiquetas_da_familia(uuid, boolean) from public, anon;
grant execute on function produto.etiqueta_salvar(uuid, text, date, date, text, integer, uuid, boolean) to authenticated;
grant execute on function produto.etiquetar(uuid, uuid, boolean) to authenticated;
grant execute on function produto.etiqueta_resumo(uuid) to authenticated;
grant execute on function produto.etiqueta_simular(uuid, integer, integer) to authenticated;
grant execute on function produto.etiquetas_da_familia(uuid, boolean) to authenticated;
