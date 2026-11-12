
do $$ declare s text; begin
  -- variavel com o mesmo nome da coluna
  execute replace(pg_get_functiondef('produto._esc_responder(uuid,text,text,jsonb,timestamptz)'::regprocedure), $a$ mes text := to_char(hoje, 'YYYY-MM');$a$, '');
  execute replace(pg_get_functiondef('produto.fatura_informar(uuid,uuid,text,numeric,date,text,boolean)'::regprocedure), $a$declare f uuid := fatura_informar.familia; j jsonb;$a$, E'#variable_conflict use_column\ndeclare f uuid := fatura_informar.familia; j jsonb;');
  -- toda fala chama a pessoa pelo 1o nome; a equipe so enxerga linha do diario da Casa
  s := pg_get_functiondef('produto._escritorio(uuid,timestamptz)'::regprocedure);
  s := replace(s, $a$vi := replace(t->'vi'->>(var - 1), '{dias}', produto._esc_espera(dias));$a$,
    $b$vi := replace(t->'vi'->>(var - 1), '{dias}', produto._esc_espera(dias));
    if coalesce(nome, '') <> '' and vi not like nome || ', %' then vi := nome || ', ' || lower(left(vi, 1)) || substr(vi, 2); end if;$b$);
  s := replace(s, $a$and not (papel = 'equipe' and d.dados->>'opcao' = 'pedir_equipe') order by d.quando desc limit 1;$a$,
    $b$and (papel = 'casal' or (d.casa and d.dados->>'opcao' is distinct from 'pedir_equipe')) order by d.quando desc limit 1;$b$);
  s := replace(s, $a$select count(*) into nresp from produto.esc_diario d where d.familia_id = f and d.ref = t->>'id';$a$,
    $b$select count(*) into nresp from produto.esc_diario d where d.familia_id = f and d.ref = t->>'id' and (papel = 'casal' or d.casa);$b$);
  execute s;
  execute replace(pg_get_functiondef('produto._esc_diario_json(uuid,text,integer,timestamptz)'::regprocedure),
    $a$where d.familia_id = p_familia and (p_funcionario is null$a$, $b$where d.familia_id = p_familia and (d.casa or produto.meu_papel(p_familia) = 'casal') and (p_funcionario is null$b$);
  -- o teste acompanha
  s := pg_get_functiondef('produto.teste_escritorio()'::regprocedure);
  s := replace(s, $a$'a contagem do estoque desta semana ainda não foi feita', 'Sem ela eu não sei$a$, $b$'a contagem do estoque desta semana continua sem ser feita desde ontem', 'Sem ela eu não sei$b$);
  s := replace(s, $a$'mês que vem o Nubank cobra a anuidade de R$ 480,00', $a$, $b$'anuidade de R$ 480,00 do Nubank', 'São R$ 480,00 que ficam com você', $b$);
  s := replace(s, $a$'Pra não pagar a mensalidade de R$ 30,00 ele precisa chegar a R$ 1.000,00', 'Faltam R$ 1.000,00'$a$, $b$'Romero, o Mensal fecha dia 15/11', 'Faltam R$ 1.000,00. Se não chegar, o banco cobra os R$ 30,00'$b$);
  s := replace(s, $a$'Continua aberto há 2 dias: Ligar pro contador.'$a$, $b$'Romero, continua aberto há 2 dias: Ligar pro contador.'$b$);
  s := replace(s, $a$'Toda pergunta chama a pessoa pelo 1º nome na 1ª vez', 'true', (select bool_and(x->>'pergunta' like 'Romero, %')::text from jsonb_array_elements(produto._escritorio(f, produto._t('2026-11-01 10:00'))->'precisa_de_voce') x where (x->>'variacao')::int = 1)]$a$,
                 $b$'Toda pergunta, em qualquer cobrança, chama a pessoa pelo 1º nome', 'true', (select bool_and(x[1] like '"Romero, %')::text from regexp_matches(todas, '"pergunta": ("[^"]{0,40})', 'g') x where x[1] not like '"Givaldo, %')]$b$);
  execute s;
end $$;
;