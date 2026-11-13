-- Desfaz f_10. Recusa se o dono já carregou algum Focus.
do $$ begin
  if exists (select 1 from produto.focus_indices) then raise exception 'desfazer f_10: ha linhas do Focus; confira antes'; end if;
end $$;
drop table produto.focus_indices;
