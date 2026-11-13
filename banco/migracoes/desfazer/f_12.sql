-- Desfaz f_12. Recusa se já houver voto gravado.
do $$ begin
  if exists (select 1 from produto.reajuste_votos) then raise exception 'desfazer f_12: ha votos gravados; confira antes'; end if;
end $$;
drop function produto.objetivo_salvar(uuid, jsonb);
drop function produto.reajuste_aplicar(uuid, uuid, date, numeric);
drop function produto.reajuste_votar(uuid, date, bigint);
drop function produto.reajuste_situacao(uuid, date);
drop function produto._reajuste_aprovado(uuid, date);
drop table produto.reajuste_votos;
