
create function produto.guardado_hoje(familia uuid) returns json language plpgsql stable set search_path = '' as $$
begin
  if produto.meu_papel(familia) is distinct from 'casal' then raise exception 'so o casal ve o Guardado' using errcode = '42501'; end if;
  return produto._guardado(familia, produto._hoje())::json;
end $$;

create function produto.guardado_custo_do_gasto(familia uuid, valor numeric) returns json language plpgsql stable set search_path = '' as $$
declare papel text := produto.meu_papel(familia);
begin
  if papel is null then raise exception 'voce nao faz parte desta familia' using errcode = '42501'; end if;
  if papel <> 'casal' then return json_build_object('tem_guardado', false); end if;
  return produto._guardado_custo(familia, valor, produto._hoje())::json;
end $$;

create function produto._guardado_movimentar(p_app uuid, p_tipo text, p_valor numeric, p_data date, p_chave uuid, p_hoje date)
returns jsonb language plpgsql set search_path = '' as $$
declare a produto.pat_aplicacoes%rowtype; dt date := coalesce(p_data, p_hoje); mid uuid; saldo numeric; dif numeric; ja boolean := false;
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
    saldo := (produto._guardado_app(p_app, case when p_tipo = 'saldo_conferido' then dt else p_hoje end)->>'saldo')::numeric;
    if p_tipo = 'resgate' and round(p_valor, 2) > saldo then
      raise exception 'so tem % nessa aplicacao', produto._brl(saldo) using errcode = '22023';
    end if;
    if p_tipo = 'saldo_conferido' then dif := round(p_valor, 2) - saldo; end if;
    insert into produto.pat_movimentos (familia_id, aplicacao_id, data, tipo, valor, chave, autor)
    values (a.familia_id, p_app, dt, p_tipo, round(p_valor, 2), p_chave, (select auth.uid())) returning id into mid;
  end if;
  return produto._guardado(a.familia_id, p_hoje) || jsonb_strip_nulls(jsonb_build_object('aplicacao_id', p_app, 'movimento_id', mid, 'repetido', ja, 'diferenca', dif));
end $$;

create function produto.guardado_movimentar(aplicacao uuid, tipo text, valor numeric, data date default null, chave uuid default null)
returns json language sql set search_path = '' as $$
  select produto._guardado_movimentar(aplicacao, tipo, valor, data, chave, produto._hoje())::json
$$;

create function produto.guardado_criar(familia uuid, nome text, banco text, tipo text, pct_cdi numeric, valor_inicial numeric,
  data date default null, vence_em date default null, chave uuid default null, titular uuid default null)
returns json language plpgsql set search_path = '' as $$
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
end $$;

create function produto.guardado_encerrar(aplicacao uuid) returns json language plpgsql set search_path = '' as $$
declare f uuid;
begin
  select x.familia_id into f from produto.pat_aplicacoes x where x.id = aplicacao;
  if f is null or produto.meu_papel(f) is distinct from 'casal' then raise exception 'aplicacao nao encontrada ou sem permissao' using errcode = '42501'; end if;
  update produto.pat_aplicacoes x set encerrada_em = now() where x.id = aplicacao and x.encerrada_em is null;
  return (produto._guardado(f, produto._hoje()) || jsonb_build_object('encerrada', aplicacao))::json;
end $$;

create function produto.guardado_desfazer(movimento uuid) returns json language plpgsql set search_path = '' as $$
declare f uuid;
begin
  select x.familia_id into f from produto.pat_movimentos x where x.id = movimento;
  if f is null or produto.meu_papel(f) is distinct from 'casal' then raise exception 'movimento nao encontrado ou sem permissao' using errcode = '42501'; end if;
  update produto.pat_movimentos x set anulado_em = now() where x.id = movimento and x.anulado_em is null;
  return (produto._guardado(f, produto._hoje()) || jsonb_build_object('desfeito', movimento))::json;
end $$;

-- caminho manual da taxa: so quem esta em produto.donos_produto
create function produto.indice_informar(data date, cdi_dia numeric, selic_meta numeric default null, fonte text default 'manual')
returns json language plpgsql set search_path = '' as $$
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
end $$;

-- job diario: busca o CDI (SGS 12) e a Selic meta (SGS 432) no Banco Central quando o pg_net estiver instalado.
-- Sem pg_net nao faz nada e avisa. O trecho do pg_net NAO foi testado (a extensao nao esta instalada neste projeto).
create function produto.indices_buscar() returns text language plpgsql set search_path = '' as $$
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
end $$;

revoke execute on function produto.guardado_hoje(uuid), produto.guardado_custo_do_gasto(uuid, numeric), produto._guardado_movimentar(uuid, text, numeric, date, uuid, date),
  produto.guardado_movimentar(uuid, text, numeric, date, uuid), produto.guardado_criar(uuid, text, text, text, numeric, numeric, date, date, uuid, uuid),
  produto.guardado_encerrar(uuid), produto.guardado_desfazer(uuid), produto.indice_informar(date, numeric, numeric, text), produto.indices_buscar() from public, anon;
grant execute on function produto.guardado_hoje(uuid), produto.guardado_custo_do_gasto(uuid, numeric), produto._guardado_movimentar(uuid, text, numeric, date, uuid, date),
  produto.guardado_movimentar(uuid, text, numeric, date, uuid), produto.guardado_criar(uuid, text, text, text, numeric, numeric, date, date, uuid, uuid),
  produto.guardado_encerrar(uuid), produto.guardado_desfazer(uuid), produto.indice_informar(date, numeric, numeric, text) to authenticated;

select cron.schedule('produto_indices_diario', '7,37 0,12 * * *', 'select produto.indices_buscar()');
;