
do $$ declare s text; begin
  s := pg_get_functiondef('produto.teste_escritorio()'::regprocedure);
  s := replace(s, $a$'e não tem nenhum gasto anotado hoje', 'Gastou alguma coisa$a$, $b$'Romero, ', 'às 20h', 'Sem anotar, o valor que eu digo que você pode gastar amanhã sai errado', 'Gastou alguma coisa$b$);
  s := replace(s, '2026-12-02 10:0', '2026-12-01 10:0');
  s := replace(s, '2026-12-02 11:0', '2026-12-01 11:0');
  s := replace(s, $a$'500.00/2026-12-02'$a$, $b$'500.00/2026-12-01'$b$);
  s := replace(s, $a$'aplicação CDB', 'vence', '25/11', 'O que prefere?'$a$, $b$'Romero, a aplicação CDB vence em 13 dias e você ainda não decidiu', 'O que prefere?'$b$);
  s := replace(s, $a$'pela média da casa, o gás acaba dia', 'Já pediu?'$a$, $b$'Romero, o gás deve acabar dia 02/12', 'Pedindo antes, ninguém fica sem cozinhar', 'Já pediu?'$b$);
  s := replace(s, $a$'vi um gasto de R$ 900,00 na Feira dia 17/11', 'Foi essa?'$a$, $b$'gasto de R$ 900,00 na Feira, de 17/11', 'Foi essa?'$b$);
  s := replace(s, $a$(select (produto.lembrete_apagar((j->'lembrete'->>'id')::uuid) is not null and not l.ativo and l.feito_em is null and l.quando > now() + interval '300 days')::text from produto.esc_lembretes l where l.id = (j->'lembrete'->>'id')::uuid)];$a$,
                 $b$(produto.lembrete_apagar((j->'lembrete'->>'id')::uuid)::jsonb->>'acao' = 'apagar')::text];$b$);
  s := replace(s, $a$'Apagar lembrete só marca inativo (a linha continua lá)', '1', (select count(*)::text from produto.esc_lembretes l where l.id = (j->'lembrete'->>'id')::uuid and not l.ativo)]$a$,
                 $b$'Apagar lembrete só marca inativo (a linha continua lá); o que repete todo ano pulou pro ano que vem', '1', (select count(*)::text from produto.esc_lembretes l where l.id = (j->'lembrete'->>'id')::uuid and not l.ativo and l.feito_em is null and l.quando > now() + interval '300 days')]$b$);
  execute s;
end $$;
;