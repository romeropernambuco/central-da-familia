
-- Notas da feira: bucket privado "notas", caminho {familia_id}/{feira_id}.jpg. Casal le e grava; equipe so grava.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('notas', 'notas', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy produto_notas_gravar on storage.objects for insert to authenticated
  with check (bucket_id = 'notas' and (storage.foldername(name))[1] in (select f::text from produto.familias_com_papel('casal', 'equipe') f));
create policy produto_notas_ler on storage.objects for select to authenticated
  using (bucket_id = 'notas' and (storage.foldername(name))[1] in (select f::text from produto.familias_com_papel('casal') f));
create policy produto_notas_trocar on storage.objects for update to authenticated
  using (bucket_id = 'notas' and (storage.foldername(name))[1] in (select f::text from produto.familias_com_papel('casal') f))
  with check (bucket_id = 'notas' and (storage.foldername(name))[1] in (select f::text from produto.familias_com_papel('casal') f));

do $$ begin
  execute replace(pg_get_functiondef('produto._esc_cadastro(uuid,date,text)'::regprocedure),
    $a$array['domingo','segunda','terça','quarta','quinta','sexta','sábado']$a$, $b$array['o domingo','a segunda','a terça','a quarta','a quinta','a sexta','o sábado']$b$);
  execute replace(pg_get_functiondef('produto._esc_cadastro(uuid,date,text)'::regprocedure), $a$', toda '$a$, $b$', tod'$b$);
end $$;
;