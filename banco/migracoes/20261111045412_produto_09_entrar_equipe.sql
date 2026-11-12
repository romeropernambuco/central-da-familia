create or replace function produto.entrar_equipe(codigo text) returns json language plpgsql volatile security definer set search_path = '' as
$$
declare uid uuid := auth.uid(); v_falhas int; v_geral int; a record; n int;
begin
  if uid is null then raise exception 'abra a sessao antes (login anonimo)' using errcode = '42501'; end if;
  select count(*) into v_falhas from produto.tentativas_equipe t where t.user_id = uid and not t.ok and t.criado_em > now() - interval '24 hours';
  if v_falhas >= 5 then return json_build_object('ok', false, 'motivo', 'Muitas tentativas. Peca um codigo novo a quem te convidou.', 'restam', 0); end if;
  select count(*) into v_geral from produto.tentativas_equipe t where not t.ok and t.criado_em > now() - interval '1 hour';
  if v_geral >= 30 then return json_build_object('ok', false, 'motivo', 'Entrada da equipe pausada por 1 hora. Tente mais tarde.', 'restam', 5 - v_falhas); end if;
  if coalesce(codigo,'') ~ '^[0-9]{4}$' then
    for a in select ae.* from produto.acesso_equipe ae where ae.expira_em > now() and ae.tentativas < 5 loop
      if a.codigo_hash = extensions.crypt(codigo, a.codigo_hash) then
        if exists (select 1 from produto.membros m where m.familia_id = a.familia_id and m.user_id = uid) then
          return json_build_object('ok', false, 'motivo', 'Voce ja esta nessa familia.', 'restam', 5 - v_falhas);
        end if;
        update produto.membros m set user_id = uid where m.id = a.membro_id and m.user_id is null;
        get diagnostics n = row_count;
        -- código vale 1 vez: vence na hora
        update produto.acesso_equipe ae set expira_em = now() where ae.id = a.id;
        insert into produto.tentativas_equipe (user_id, ok) values (uid, n = 1);
        if n = 0 then return json_build_object('ok', false, 'motivo', 'Esse convite ja foi usado.', 'restam', 5 - v_falhas); end if;
        return json_build_object('ok', true, 'familia_id', a.familia_id, 'membro_id', a.membro_id,
          'nome', (select m.nome from produto.membros m where m.id = a.membro_id));
      end if;
    end loop;
  end if;
  insert into produto.tentativas_equipe (user_id, ok) values (uid, false);
  return json_build_object('ok', false, 'motivo', 'Codigo errado ou vencido.', 'restam', greatest(0, 4 - v_falhas));
end $$;

revoke execute on all functions in schema produto from public, anon;
grant execute on all functions in schema produto to authenticated;
revoke execute on function produto._tentativa(text,text,text,text) from authenticated;
revoke execute on function produto.teste_vazamento() from authenticated;
alter default privileges in schema produto revoke execute on functions from public;
;