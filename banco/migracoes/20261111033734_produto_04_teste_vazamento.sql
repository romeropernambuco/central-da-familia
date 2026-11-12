-- roda 1 tentativa como um usuario simulado e desfaz tudo no fim (nada fica gravado)
create function produto._tentativa(p_uid text, p_role text, p_sql text, p_modo text)
returns text language plpgsql security invoker set search_path = '' as $$
declare n bigint; resultado text;
begin
  begin
    perform set_config('request.jwt.claims',
      case when p_uid is null then json_build_object('role', p_role)::text
           else json_build_object('sub', p_uid, 'role', p_role)::text end, true);
    execute format('set local role %I', p_role);
    if p_modo = 'contar' then
      execute p_sql into n;
    else
      execute p_sql; get diagnostics n = row_count;
    end if;
    resultado := n::text;
    raise exception using errcode = 'P0001', message = 'desfazer';
  exception
    when sqlstate 'P0001' then null;
    when insufficient_privilege then resultado := 'bloqueado';
    when foreign_key_violation then resultado := 'bloqueado';
    when check_violation then resultado := 'bloqueado';
    when others then resultado := 'erro: ' || sqlerrm;
  end;
  return resultado;
end $$;

create function produto.teste_vazamento()
returns table (caso text, esperado text, obtido text, ok boolean)
language plpgsql security invoker set search_path = '' as $$
declare
  ana   constant text := 'a0000000-0000-4e0e-8000-0000000000a1';
  carla constant text := 'a0000000-0000-4e0e-8000-0000000000c1';
  davi  constant text := 'a0000000-0000-4e0e-8000-0000000000d1';
  paulo constant text := 'a0000000-0000-4e0e-8000-0000000000f2';
  estranho constant text := 'a0000000-0000-4e0e-8000-0000000000ff';
  silva constant text := 'f0000000-0000-4e0e-8000-000000000001';
  t2    constant text := 'f0000000-0000-4e0e-8000-000000000002';
  c record; t text;
begin
  -- 1. Silva (Ana, casal) tentando LER a Familia Teste 2, tabela por tabela
  foreach t in array array['envelopes','membros','limites_mes','cartoes','lancamentos','config_familia','eventos','acesso_equipe'] loop
    caso := 'Silva le ' || t || ' da Teste 2'; esperado := '0';
    obtido := produto._tentativa(ana, 'authenticated',
      format('select count(*) from produto.%I where familia_id = %L', t, t2), 'contar');
    ok := obtido = esperado; return next;
  end loop;
  caso := 'Silva le a linha da familia Teste 2'; esperado := '0';
  obtido := produto._tentativa(ana,'authenticated', format('select count(*) from produto.familias where id = %L', t2),'contar');
  ok := obtido = esperado; return next;

  for c in select * from (values
    -- 2. Silva tentando INSERIR, ATUALIZAR e APAGAR na Teste 2
    ('Silva insere lancamento na Teste 2', ana, 'authenticated', format('insert into produto.lancamentos (familia_id, envelope_id, valor, autor) values (%L, %L, 10, %L)', t2, 'e0000000-0000-4e0e-8000-000000000022', ana), 'linhas', 'bloqueado'),
    ('Silva insere lancamento da Silva num envelope da Teste 2', ana, 'authenticated', format('insert into produto.lancamentos (familia_id, envelope_id, valor, autor) values (%L, %L, 10, %L)', silva, 'e0000000-0000-4e0e-8000-000000000022', ana), 'linhas', 'bloqueado'),
    ('Silva insere envelope na Teste 2', ana, 'authenticated', format('insert into produto.envelopes (familia_id, nome) values (%L, %L)', t2, 'invasor'), 'linhas', 'bloqueado'),
    ('Silva se coloca como membro da Teste 2', ana, 'authenticated', format('insert into produto.membros (familia_id, user_id, papel, nome) values (%L, %L, %L, %L)', t2, ana, 'casal', 'Ana'), 'linhas', 'bloqueado'),
    ('Silva grava config na Teste 2', ana, 'authenticated', format('insert into produto.config_familia (familia_id, chave, valor) values (%L, %L, %L)', t2, 'renda_mes', '1'), 'linhas', 'bloqueado'),
    ('Silva atualiza lancamentos da Teste 2', ana, 'authenticated', format('update produto.lancamentos set valor = 1 where familia_id = %L', t2), 'linhas', '0'),
    ('Silva atualiza nome da Teste 2', ana, 'authenticated', format('update produto.familias set nome = %L where id = %L', 'x', t2), 'linhas', '0'),
    ('Silva atualiza config da Teste 2', ana, 'authenticated', format('update produto.config_familia set valor = %L where familia_id = %L', '1', t2), 'linhas', '0'),
    ('Silva muda lancamento proprio pra Teste 2', ana, 'authenticated', format('update produto.lancamentos set familia_id = %L where familia_id = %L', t2, silva), 'linhas', 'bloqueado'),
    ('Silva apaga lancamentos da Teste 2', ana, 'authenticated', format('delete from produto.lancamentos where familia_id = %L', t2), 'linhas', '0'),
    ('Silva apaga envelopes da Teste 2', ana, 'authenticated', format('delete from produto.envelopes where familia_id = %L', t2), 'linhas', '0'),
    ('Silva apaga membros da Teste 2', ana, 'authenticated', format('delete from produto.membros where familia_id = %L', t2), 'linhas', '0'),
    -- 3. Equipe (Carla) so ve a Casa
    ('Equipe ve envelope do casal', carla, 'authenticated', 'select count(*) from produto.envelopes where not casa', 'contar', '0'),
    ('Equipe ve lancamento fora da Casa', carla, 'authenticated', 'select count(*) from produto.lancamentos l join produto.envelopes e on e.id = l.envelope_id where not e.casa', 'contar', '0'),
    ('Equipe ve lancamento fora da Casa (sem join)', carla, 'authenticated', format('select count(*) from produto.lancamentos where envelope_id <> %L', 'e0000000-0000-4e0e-8000-000000000011'), 'contar', '0'),
    ('Equipe ve limite de outro envelope', carla, 'authenticated', format('select count(*) from produto.limites_mes where envelope_id <> %L', 'e0000000-0000-4e0e-8000-000000000011'), 'contar', '0'),
    ('Equipe ve cartoes', carla, 'authenticated', 'select count(*) from produto.cartoes', 'contar', '0'),
    ('Equipe ve config da familia (renda)', carla, 'authenticated', 'select count(*) from produto.config_familia', 'contar', '0'),
    ('Equipe ve codigos de acesso', carla, 'authenticated', 'select count(*) from produto.acesso_equipe', 'contar', '0'),
    ('Equipe ve outros membros', carla, 'authenticated', format('select count(*) from produto.membros where user_id <> %L', carla), 'contar', '0'),
    ('Equipe lanca em envelope do casal', carla, 'authenticated', format('insert into produto.lancamentos (familia_id, envelope_id, valor, autor) values (%L, %L, 10, %L)', silva, 'e0000000-0000-4e0e-8000-000000000012', carla), 'linhas', 'bloqueado'),
    ('Equipe lanca na Casa usando cartao', carla, 'authenticated', format('insert into produto.lancamentos (familia_id, envelope_id, cartao_id, valor, autor) values (%L, %L, %L, 10, %L)', silva, 'e0000000-0000-4e0e-8000-000000000011', 'c0000000-0000-4e0e-8000-000000000011', carla), 'linhas', 'bloqueado'),
    ('Equipe muda lancamento da Casa pra envelope do casal', carla, 'authenticated', format('update produto.lancamentos set envelope_id = %L where envelope_id = %L', 'e0000000-0000-4e0e-8000-000000000012', 'e0000000-0000-4e0e-8000-000000000011'), 'linhas', 'bloqueado'),
    ('Equipe se promove a casal', carla, 'authenticated', format('update produto.membros set papel = %L where user_id = %L', 'casal', carla), 'linhas', '0'),
    -- 4. Pessoa (Davi) so ve o proprio
    ('Pessoa ve lancamento de outra pessoa', davi, 'authenticated', format('select count(*) from produto.lancamentos where autor <> %L', davi), 'contar', '0'),
    ('Pessoa ve envelope de outra pessoa', davi, 'authenticated', format('select count(*) from produto.envelopes where id <> %L', 'e0000000-0000-4e0e-8000-000000000014'), 'contar', '0'),
    ('Pessoa altera lancamento da Lia', davi, 'authenticated', format('update produto.lancamentos set valor = 1 where envelope_id = %L', 'e0000000-0000-4e0e-8000-000000000015'), 'linhas', '0'),
    ('Pessoa lanca no envelope da Lia', davi, 'authenticated', format('insert into produto.lancamentos (familia_id, envelope_id, valor, autor) values (%L, %L, 10, %L)', silva, 'e0000000-0000-4e0e-8000-000000000015', davi), 'linhas', 'bloqueado'),
    ('Pessoa lanca em nome de outra pessoa', davi, 'authenticated', format('insert into produto.lancamentos (familia_id, envelope_id, valor, autor) values (%L, %L, 10, %L)', silva, 'e0000000-0000-4e0e-8000-000000000014', ana), 'linhas', 'bloqueado'),
    -- 5. anon e logado sem familia
    ('anon le lancamentos', null, 'anon', 'select count(*) from produto.lancamentos', 'contar', 'bloqueado'),
    ('anon le familias', null, 'anon', 'select count(*) from produto.familias', 'contar', 'bloqueado'),
    ('anon chama minhas_familias()', null, 'anon', 'select count(*) from produto.minhas_familias()', 'contar', 'bloqueado'),
    ('anon insere lancamento', null, 'anon', format('insert into produto.lancamentos (familia_id, envelope_id, valor, autor) values (%L, %L, 10, %L)', silva, 'e0000000-0000-4e0e-8000-000000000011', ana), 'linhas', 'bloqueado'),
    ('Logado sem familia le lancamentos', estranho, 'authenticated', 'select count(*) from produto.lancamentos', 'contar', '0'),
    ('Logado sem familia le familias', estranho, 'authenticated', 'select count(*) from produto.familias', 'contar', '0'),
    ('Logado tenta TRUNCATE', ana, 'authenticated', 'truncate produto.lancamentos', 'linhas', 'bloqueado'),
    -- 6. provas de que a tranca nao bloqueia tudo (controle positivo)
    ('CONTROLE casal Silva ve os 5 lancamentos dela', ana, 'authenticated', 'select count(*) from produto.lancamentos', 'contar', '5'),
    ('CONTROLE casal Silva ve os 5 envelopes dela', ana, 'authenticated', 'select count(*) from produto.envelopes', 'contar', '5'),
    ('CONTROLE casal Silva lanca na propria familia', ana, 'authenticated', format('insert into produto.lancamentos (familia_id, envelope_id, valor) values (%L, %L, 10)', silva, 'e0000000-0000-4e0e-8000-000000000013'), 'linhas', '1'),
    ('CONTROLE equipe ve so o envelope Casa', carla, 'authenticated', 'select count(*) from produto.envelopes', 'contar', '1'),
    ('CONTROLE equipe lanca na Casa', carla, 'authenticated', format('insert into produto.lancamentos (familia_id, envelope_id, valor) values (%L, %L, 10)', silva, 'e0000000-0000-4e0e-8000-000000000011'), 'linhas', '1'),
    ('CONTROLE pessoa ve o proprio lancamento', davi, 'authenticated', 'select count(*) from produto.lancamentos', 'contar', '1'),
    ('CONTROLE Teste 2 ve os 2 lancamentos dela', paulo, 'authenticated', 'select count(*) from produto.lancamentos', 'contar', '2')
  ) as v(nome, uid, papel_db, sql, modo, esp) loop
    caso := c.nome; esperado := c.esp;
    obtido := produto._tentativa(c.uid, c.papel_db, c.sql, c.modo);
    ok := obtido = esperado; return next;
  end loop;
end $$;

revoke execute on function produto._tentativa(text,text,text,text), produto.teste_vazamento() from public, anon, authenticated, service_role;;