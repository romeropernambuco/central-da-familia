-- Fotos de rosto da família (pedido do dono, 24/11/2026).
-- Bucket privado `fotos`, caminho {familia}/{envelope}.jpg (uma foto por orçamento de pessoa).
-- Ver: casal e pessoa da família. Trocar: a própria pessoa (membro ligado ao orçamento) ou o casal.
-- A equipe da casa não vê nem troca.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 2097152, array['image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg'];

create or replace function produto.pode_trocar_foto(p_nome text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1
    from produto.membros m
    where m.user_id = (select auth.uid())
      and m.ativo
      and m.familia_id::text = (storage.foldername(p_nome))[1]
      and (
        m.papel = 'casal'
        or (m.papel = 'pessoa' and m.envelope_id::text = split_part(storage.filename(p_nome), '.', 1))
      )
  )
  and exists (
    select 1
    from produto.envelopes e
    where e.familia_id::text = (storage.foldername(p_nome))[1]
      and e.id::text = split_part(storage.filename(p_nome), '.', 1)
      and not e.casa
  )
$$;

revoke all on function produto.pode_trocar_foto(text) from public, anon;
grant execute on function produto.pode_trocar_foto(text) to authenticated;

drop policy if exists produto_fotos_ler on storage.objects;
create policy produto_fotos_ler on storage.objects
  for select to authenticated
  using (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] in (
      select f::text from produto.familias_com_papel('casal', 'pessoa') f
    )
  );

drop policy if exists produto_fotos_gravar on storage.objects;
create policy produto_fotos_gravar on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos' and produto.pode_trocar_foto(name));

drop policy if exists produto_fotos_trocar on storage.objects;
create policy produto_fotos_trocar on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos' and produto.pode_trocar_foto(name))
  with check (bucket_id = 'fotos' and produto.pode_trocar_foto(name));
