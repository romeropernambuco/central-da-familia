create or replace function produto._teste_revisao_2()
returns table(caso text, esperado text, obtido text, ok boolean) language plpgsql set search_path = '' as $$
declare
  ana constant text := 'a0000000-0000-4e0e-8000-0000000000a1';
  carla constant text := 'a0000000-0000-4e0e-8000-0000000000c1';
  silva constant text := 'f0000000-0000-4e0e-8000-000000000001';
  t2 constant text := 'f0000000-0000-4e0e-8000-000000000002';
  env_casal constant text := 'e0000000-0000-4e0e-8000-000000000013';
  env_casa constant text := 'e0000000-0000-4e0e-8000-000000000011';
  dinheiro constant text := '"([a-z_]*(valor|preco|custo|salario|total|limite|gasto)[a-z_]*|pode_gastar_hoje|livre_mes|livre|colchao|hoje|no_cartao|teto_semana)"\s*:';
  c record; j json; k uuid; hoje date := produto._hoje(); passado date;
  antes numeric; r_ch1 text := 'nao rodou'; r_ch2 text := 'nao rodou'; r_ch3 text := 'nao rodou';
  r_l1 text := 'nao rodou'; r_l2 text := 'nao rodou'; r_l3 text := 'nao rodou';
begin
  passado := (date_trunc('month', hoje) - interval '1 day')::date;
  for c in select * from (values
    ('Equipe: resumo_hoje traz chave ou numero de dinheiro', carla, format('select case when produto.resumo_hoje(%L)::text ~* %L or produto.resumo_hoje(%L)::text ~ ''[0-9]\.[0-9]{2}'' then 1 else 0 end', silva, dinheiro, silva), 'contar', '0'),
    ('Equipe: o miolo _resumo chamado direto traz dinheiro', carla, format('select case when produto._resumo(%L, current_date)::text ~* %L then 1 else 0 end', silva, dinheiro), 'contar', '0'),
    ('Equipe: resposta do lancar traz valor', carla, format('select case when produto.lancar(%L, %L, 10)::text ~* %L then 1 else 0 end', silva, env_casa, dinheiro), 'contar', '0'),
    ('Equipe le limite da Casa na tabela de limites', carla, 'select count(*) from produto.limites_mes', 'contar', '0'),
    ('Equipe le gasto da Casa lancado por outra pessoa', carla, format('select count(*) from produto.lancamentos where autor <> %L', carla), 'contar', '0'),
    ('Casal grava limite em mes fechado direto na tabela', ana, format('insert into produto.limites_mes (familia_id, envelope_id, mes, valor) values (%L, %L, ''2020-01'', 1)', silva, env_casal), 'linhas', 'bloqueado'),
    ('Equipe chama definir_limite', carla, format('select 1 from produto.definir_limite(%L, %L, 10)', silva, env_casa), 'contar', 'bloqueado'),
    ('Silva define limite num envelope da Teste 2', ana, format('select 1 from produto.definir_limite(%L, %L, 10)', t2, 'e0000000-0000-4e0e-8000-000000000022'), 'contar', 'bloqueado'),
    ('Silva usa definir_limite da Silva com envelope da Teste 2', ana, format('select 1 from produto.definir_limite(%L, %L, 10)', silva, 'e0000000-0000-4e0e-8000-000000000022'), 'contar', 'erro: envelope nao encontrado'),
    ('CONTROLE equipe ainda recebe o nome do envelope da Casa pra lancar', carla, format('select count(*) from json_array_elements(produto.resumo_hoje(%L)->''envelopes'') e where e->>''nome'' is not null', silva), 'contar', '1'),
    ('CONTROLE casal continua recebendo os valores no resumo', ana, format('select case when produto.resumo_hoje(%L)->>''pode_gastar_hoje'' is not null then 1 else 0 end', silva), 'contar', '1')
  ) as v(nome, uid, sql, modo, esp) loop
    caso := c.nome; esperado := c.esp;
    obtido := produto._tentativa(c.uid, 'authenticated', c.sql, c.modo);
    ok := obtido = esperado; return next;
  end loop;

  -- chave do toque
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
    set local role authenticated;
    k := gen_random_uuid();
    j := produto.lancar_com_chave(silva::uuid, env_casal::uuid, 10, k, null, 'chave a');
    r_ch1 := j->>'repetido';
    -- mesma chave de novo, ate com outro valor e outro texto (como se fosse 1 hora depois): nao grava
    j := produto.lancar_com_chave(silva::uuid, env_casal::uuid, 11, k, null, 'chave b');
    select (j->>'repetido') || '/' || count(*) into r_ch2 from produto.lancamentos l where l.chave_cliente = k;
    -- 2 compras iguais de verdade (2 toques, 2 chaves) gravam as 2
    j := produto.lancar_com_chave(silva::uuid, env_casal::uuid, 10, gen_random_uuid(), null, 'chave a');
    r_ch3 := j->>'repetido';
    raise exception using errcode = 'P0001', message = 'desfazer';
  exception
    when sqlstate 'P0001' then null;
    when others then r_ch1 := 'erro: ' || sqlerrm;
  end;
  caso := 'CONTROLE lancar com chave grava a 1a vez'; esperado := 'false'; obtido := r_ch1; ok := obtido = esperado; return next;
  caso := 'Mesma chave de novo (mesmo depois de 10 s) nao grava 2 vezes'; esperado := 'true/1'; obtido := r_ch2; ok := obtido = esperado; return next;
  caso := 'CONTROLE 2 compras iguais com chaves diferentes gravam as 2'; esperado := 'false'; obtido := r_ch3; ok := obtido = esperado; return next;

  -- limite: mes fechado nao muda
  begin
    insert into produto.lancamentos (familia_id, envelope_id, valor, data, autor) values (silva::uuid, env_casal::uuid, 5, (hoje - interval '3 months')::date, ana::uuid);
    antes := produto._lim(env_casal::uuid, passado);
    perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
    set local role authenticated;
    j := produto.definir_limite(silva::uuid, env_casal::uuid, 777.77);
    r_l1 := case when produto._lim(env_casal::uuid, passado) = antes then 'igual' else 'mudou' end;
    r_l2 := produto._lim(env_casal::uuid, hoje)::text || '/' || produto._lim(env_casal::uuid, (hoje + interval '2 months')::date)::text;
    raise exception using errcode = 'P0001', message = 'desfazer';
  exception
    when sqlstate 'P0001' then null;
    when others then r_l1 := 'erro: ' || sqlerrm;
  end;
  begin
    insert into produto.lancamentos (familia_id, envelope_id, valor, data, autor) values (silva::uuid, env_casal::uuid, 5, (hoje - interval '3 months')::date, ana::uuid);
    antes := produto._lim(env_casal::uuid, passado);
    perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
    set local role authenticated;
    -- caminho antigo do app, em 2 passos
    insert into produto.limites_mes (familia_id, envelope_id, mes, valor) values (silva::uuid, env_casal::uuid, to_char(hoje, 'YYYY-MM'), 888)
      on conflict (envelope_id, mes) do update set valor = excluded.valor;
    update produto.envelopes set limite_mes = 888 where id = env_casal::uuid;
    r_l3 := case when produto._lim(env_casal::uuid, passado) = antes then 'igual' else 'mudou' end || '/' || produto._lim(env_casal::uuid, hoje)::text;
    raise exception using errcode = 'P0001', message = 'desfazer';
  exception
    when sqlstate 'P0001' then null;
    when others then r_l3 := 'erro: ' || sqlerrm;
  end;
  caso := 'definir_limite nao muda o limite do mes passado (mes fechado)'; esperado := 'igual'; obtido := r_l1; ok := obtido = esperado; return next;
  caso := 'CONTROLE definir_limite vale deste mes em diante'; esperado := '777.77/777.77'; obtido := r_l2; ok := obtido = esperado; return next;
  caso := 'Caminho antigo em 2 passos tambem nao muda o mes fechado'; esperado := 'igual/888.00'; obtido := r_l3; ok := obtido = esperado; return next;
end $$;
revoke all on function produto._teste_revisao_2() from public, anon, authenticated;

create or replace function produto.teste_vazamento()
returns table(caso text, esperado text, obtido text, ok boolean) language sql set search_path = '' as
$$ select * from produto._teste_vazamento_tabelas() union all select * from produto._teste_vazamento_rpc()
   union all select * from produto._teste_revisao() union all select * from produto._teste_revisao_2() $$;;