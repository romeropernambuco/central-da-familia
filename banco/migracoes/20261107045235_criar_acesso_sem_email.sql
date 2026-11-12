
-- Cria a conta de um convidado com senha provisória, sem depender de e-mail.
-- Só roda pelo painel do Supabase/Claude (fora do alcance do app).
create or replace function public.criar_acesso(p_email text) returns text
language plpgsql security definer set search_path = public, auth, extensions as $$
declare
  v_email text := lower(trim(p_email));
  v_id uuid := gen_random_uuid();
  v_senha text;
  v_chars text := 'abcdefghjkmnpqrstuvwxyz23456789';
  i int;
begin
  if not exists (select 1 from public.convites where email = v_email) then
    raise exception 'email % nao esta nos convites', v_email;
  end if;
  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'email % ja tem conta', v_email;
  end if;
  v_senha := '';
  for i in 1..10 loop
    v_senha := v_senha || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
  end loop;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(v_senha, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{"trocar_senha":true}'::jsonb, now(), now(),
    '', '', '', '', '', '');
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (v_id::text, v_id, jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now());
  return v_senha;
end $$;
revoke all on function public.criar_acesso(text) from public, anon, authenticated;
;