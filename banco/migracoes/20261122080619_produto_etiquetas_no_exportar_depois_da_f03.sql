-- Etiquetas de volta na cópia de segurança (22/11/2026). Aplicada em 22/11/2026 com o "pode" do dono.
-- As etiquetas (21/11) puseram 'etiquetas' e 'lancamento_etiquetas' no exportar_familia. A f_03, escrita antes delas e
-- aplicada depois (22/11), trocou a função inteira e as 2 chaves saíram. As f_05 a f_15 acrescentaram outras chaves
-- depois disso. Aqui só se INSERE as 2 chaves das etiquetas antes de 'config', sem reescrever a função inteira
-- (reescrever apagaria recebimentos, desejos, objetivo, saldos_conta e imoveis).
-- Desfazer: tirar as 2 linhas com o mesmo replace ao contrário.

do $$ begin
  if (select prosrc from pg_proc where oid = 'produto.exportar_familia(uuid)'::regprocedure) like '%lancamento_etiquetas%' then
    raise notice 'exportar_familia ja tem as etiquetas; nada a fazer';
    return;
  end if;
  if position($a$    'config', (select coalesce(json_agg(x), '[]') from produto.config_familia x where x.familia_id = f),$a$
              in (select prosrc from pg_proc where oid = 'produto.exportar_familia(uuid)'::regprocedure)) = 0 then
    raise exception 'trecho de config nao achado em produto.exportar_familia(uuid)';
  end if;
  execute replace(pg_get_functiondef('produto.exportar_familia(uuid)'::regprocedure),
    $a$    'config', (select coalesce(json_agg(x), '[]') from produto.config_familia x where x.familia_id = f),$a$,
    $b$    'etiquetas', (select coalesce(json_agg(x order by x.criado_em), '[]') from produto.etiquetas x where x.familia_id = f),
    'lancamento_etiquetas', (select coalesce(json_agg(x order by x.criado_em), '[]') from produto.lancamento_etiquetas x where x.familia_id = f),
    'config', (select coalesce(json_agg(x), '[]') from produto.config_familia x where x.familia_id = f),$b$);
end $$;

-- confere: as etiquetas entraram e nada das f_05 a f_15 saiu
do $$
declare s text := (select prosrc from pg_proc where oid = 'produto.exportar_familia(uuid)'::regprocedure);
begin
  if s not like '%lancamento_etiquetas%' or s not like '%''recebimentos''%' or s not like '%''desejos''%'
     or s not like '%''objetivo''%' or s not like '%''saldos_conta''%' or s not like '%''imoveis''%' then
    raise exception 'exportar_familia ficou sem alguma parte; nada foi gravado';
  end if;
end $$;

-- portão: todos os testes do banco continuam 100% ok
do $$
declare t text; n int;
begin
  foreach t in array array['teste_vazamento','teste_contas_casos','teste_guardado','teste_escritorio','teste_tranca_f','teste_futuro_ir'] loop
    if to_regprocedure('produto.' || t || '()') is not null then
      execute format('select count(*) from produto.%I() where not ok', t) into n;
      if n > 0 then raise exception 'etiquetas_no_exportar: % tem % caso(s) falhando; nada foi gravado', t, n; end if;
    end if;
  end loop;
end $$;
