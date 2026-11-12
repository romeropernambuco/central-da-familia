-- a marca do resumo da equipe passa a se chamar so_nomes (a palavra "valores" na chave confundia o proprio teste)
do $do$
declare d text := pg_get_functiondef('produto._resumo(uuid, date)'::regprocedure);
begin
  if position($a$'sem_valores', true$a$ in d) = 0 then raise exception 'trecho nao encontrado'; end if;
  execute replace(d, $a$'sem_valores', true$a$, $a$'so_nomes', true$a$);
end $do$;;