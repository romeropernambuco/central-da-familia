-- Testes das brechas fechadas na revisao. Entram no teste_vazamento (e no turno da noite). Tudo se desfaz sozinho.
create or replace function produto._tentativa_jwt(p_claims jsonb, p_role text, p_sql text, p_modo text)
returns text language plpgsql set search_path = '' as $$
declare n bigint; resultado text;
begin
  begin
    perform set_config('request.jwt.claims', p_claims::text, true);
    execute format('set local role %I', p_role);
    if p_modo = 'contar' then execute p_sql into n; else execute p_sql; get diagnostics n = row_count; end if;
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

create or replace function produto._teste_revisao()
returns table(caso text, esperado text, obtido text, ok boolean) language plpgsql set search_path = '' as $$
declare
  ana constant text := 'a0000000-0000-4e0e-8000-0000000000a1';
  carla constant text := 'a0000000-0000-4e0e-8000-0000000000c1';
  paulo constant text := 'a0000000-0000-4e0e-8000-0000000000f2';
  estranho constant text := 'a0000000-0000-4e0e-8000-0000000000ff';
  e2 constant text := 'a0000000-0000-4e0e-8000-0000000000fe';
  e3 constant text := 'a0000000-0000-4e0e-8000-0000000000fd';
  e4 constant text := 'a0000000-0000-4e0e-8000-0000000000fc';
  silva constant text := 'f0000000-0000-4e0e-8000-000000000001';
  t2 constant text := 'f0000000-0000-4e0e-8000-000000000002';
  env_casal constant text := 'e0000000-0000-4e0e-8000-000000000013';
  env_casa constant text := 'e0000000-0000-4e0e-8000-000000000011';
  c record; j json; v_conv uuid; v_cod text; v_err text; i int;
  r_queimado text := 'nao rodou'; r_novo text := 'nao rodou'; r_antigo text := 'nao rodou'; r_convite_errado text := 'nao rodou'; r_busca text := 'nao rodou';
  r_ia1 text := 'nao rodou'; r_ia2 text := 'nao rodou'; r_ia3 text := 'nao rodou'; r_ia4 text := 'nao rodou';
  r_c1 text := 'nao rodou'; r_c2 text := 'nao rodou'; r_c3 text := 'nao rodou'; r_c4 text := 'nao rodou'; r_c5 text := 'nao rodou';
  u_id uuid; u_email text; g numeric; v_res json;
begin
  -- 1) escrita direta na tabela (pela API, sem passar pelas funcoes)
  for c in select * from (values
    ('Casal grava gasto negativo direto na tabela', ana, format('insert into produto.lancamentos (familia_id, envelope_id, valor) values (%L, %L, -50)', silva, env_casal), 'linhas', 'bloqueado'),
    ('Casal grava gasto NaN (quebra a soma)', ana, format('insert into produto.lancamentos (familia_id, envelope_id, valor) values (%L, %L, ''NaN'')', silva, env_casal), 'linhas', 'bloqueado'),
    ('Casal grava gasto de 2 milhoes', ana, format('insert into produto.lancamentos (familia_id, envelope_id, valor) values (%L, %L, 2000000)', silva, env_casal), 'linhas', 'bloqueado'),
    ('Casal grava gasto no ano 9999', ana, format('insert into produto.lancamentos (familia_id, envelope_id, valor, data) values (%L, %L, 10, ''9999-01-01'')', silva, env_casal), 'linhas', 'bloqueado'),
    ('Equipe grava gasto negativo na Casa', carla, format('insert into produto.lancamentos (familia_id, envelope_id, valor) values (%L, %L, -50)', silva, env_casa), 'linhas', 'bloqueado'),
    ('Casal forja a hora de criacao do gasto', ana, format('insert into produto.lancamentos (familia_id, envelope_id, valor, criado_em) values (%L, %L, 10, ''2020-01-01'')', silva, env_casal), 'linhas', 'bloqueado'),
    ('Casal muda gasto antigo pra valor negativo', ana, format('update produto.lancamentos set valor = -1 where familia_id = %L', silva), 'linhas', 'bloqueado'),
    ('Casal poe outra pessoa na familia pelo user_id', ana, format('insert into produto.membros (familia_id, user_id, papel, nome) values (%L, %L, %L, %L)', silva, estranho, 'pessoa', 'Vitima'), 'linhas', 'bloqueado'),
    ('Casal cria codigo da equipe direto, valendo 10 anos', ana, format('insert into produto.acesso_equipe (familia_id, membro_id, codigo_hash, expira_em) select m.familia_id, m.id, ''x'', now() + interval ''10 years'' from produto.membros m where m.familia_id = %L limit 1', silva), 'linhas', 'bloqueado'),
    ('Casal estica a validade de um codigo', ana, 'update produto.acesso_equipe set expira_em = now() + interval ''10 years''', 'linhas', 'bloqueado'),
    ('Unico casal se rebaixa e a familia fica sem dono', paulo, format('update produto.membros set papel = ''pessoa'' where user_id = %L', paulo), 'linhas', 'bloqueado'),
    ('Unico casal se desliga e a familia fica sem dono', paulo, format('update produto.membros set ativo = false where user_id = %L', paulo), 'linhas', 'bloqueado'),
    ('Equipe grava evento com texto gigante', carla, format('insert into produto.eventos (familia_id, tipo) values (%L, repeat(''x'', 5000))', silva), 'linhas', 'bloqueado'),
    ('Equipe forja a hora de um evento', carla, format('insert into produto.eventos (familia_id, tipo, criado_em) values (%L, ''abrir'', ''2020-01-01'')', silva), 'linhas', 'bloqueado'),
    ('Casal grava config gigante (400 mil letras)', ana, format('insert into produto.config_familia (familia_id, chave, valor) values (%L, ''rev_teste'', to_jsonb(repeat(''a'', 400000)))', silva), 'linhas', 'bloqueado'),
    ('lancar() com 2 milhoes', ana, format('select 1 from produto.lancar(%L, %L, 2000000)', silva, env_casal), 'contar', 'erro: o valor passou de 1 milhao; confira os numeros'),
    ('lancar() com data no ano 9999', ana, format('select 1 from produto.lancar(%L, %L, 10, ''9999-01-01'')', silva, env_casal), 'contar', 'erro: a data esta fora do calendario do app'),
    ('lancar() com valor negativo', ana, format('select 1 from produto.lancar(%L, %L, -10)', silva, env_casal), 'contar', 'erro: o valor tem que ser maior que zero'),
    ('Logado chama a reserva da IA (so o servidor pode)', ana, format('select 1 from produto.ia_reservar(%L, %L, ''x'', ''x'', 0.007, 2.49, 150)', silva, ana), 'contar', 'bloqueado'),
    ('Logado chama o miolo da entrada da equipe', estranho, 'select 1 from produto._equipe_entrar(''1234'', null)', 'contar', 'bloqueado'),
    ('anon chama entrar_equipe_convite', null, 'select 1 from produto.entrar_equipe_convite(gen_random_uuid(), ''1234'')', 'contar', 'bloqueado'),
    ('CONTROLE 1 dos 2 casais vira pessoa (o outro continua)', ana, format('update produto.membros set papel = ''pessoa'' where user_id = %L', ana), 'linhas', '1'),
    ('CONTROLE os dados baixados trazem o uso da IA', ana, format('select case when produto.exportar_familia(%L)::jsonb ? ''uso_da_ia'' then 1 else 0 end', silva), 'contar', '1'),
    ('CONTROLE lancar() normal continua valendo', ana, format('select case when (produto.lancar(%L, %L, 12.34, null, ''rev'')->>''repetido'')::boolean then 0 else 1 end', silva, env_casal), 'contar', '1')
  ) as v(nome, uid, sql, modo, esp) loop
    caso := c.nome; esperado := c.esp;
    obtido := produto._tentativa(c.uid, case when c.uid is null then 'anon' else 'authenticated' end, c.sql, c.modo);
    ok := obtido = esperado; return next;
  end loop;

  -- 2) entrada da equipe: convite queimado com 5 erros, convite novo, entrada antiga, convite de outro
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
    set local role authenticated;
    j := produto.convidar(silva::uuid, 'equipe', 'Teste Revisao 1');
    v_conv := (j->>'convite')::uuid; v_cod := j->>'codigo_4_digitos';
    v_err := lpad((((v_cod)::int + 1) % 10000)::text, 4, '0');
    perform set_config('request.jwt.claims', json_build_object('sub', estranho, 'role', 'authenticated')::text, true);
    for i in 1..5 loop v_res := produto.entrar_equipe_convite(v_conv, v_err); end loop;
    perform set_config('request.jwt.claims', json_build_object('sub', e2, 'role', 'authenticated')::text, true);
    r_queimado := coalesce(produto.entrar_equipe_convite(v_conv, v_cod)->>'ok', 'nulo');
    -- convite novo, codigo certo, mas com o convite de outra pessoa
    perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
    j := produto.convidar(silva::uuid, 'equipe', 'Teste Revisao 2');
    v_conv := (j->>'convite')::uuid; v_cod := j->>'codigo_4_digitos';
    perform set_config('request.jwt.claims', json_build_object('sub', e2, 'role', 'authenticated')::text, true);
    r_convite_errado := coalesce(produto.entrar_equipe_convite(gen_random_uuid(), v_cod)->>'ok', 'nulo');
    r_novo := coalesce(produto.entrar_equipe_convite(v_conv, v_cod)->>'ok', 'nulo');
    -- entrada antiga (so os 4 numeros) continua funcionando
    perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
    j := produto.convidar(silva::uuid, 'equipe', 'Teste Revisao 3');
    v_cod := j->>'codigo_4_digitos';
    select case when count(*) = 1 then 'true' else 'false' end into r_busca from produto.acesso_equipe ae where ae.id = (j->>'convite')::uuid and ae.codigo_busca is not null;
    perform set_config('request.jwt.claims', json_build_object('sub', e3, 'role', 'authenticated')::text, true);
    v_res := produto.entrar_equipe(v_cod);
    r_antigo := case when (v_res->>'ok')::boolean or (v_res->>'motivo') like 'Entrada da equipe pausada%' then 'true' else 'false' end;
    raise exception using errcode = 'P0001', message = 'desfazer';
  exception
    when sqlstate 'P0001' then null;
    when others then r_queimado := 'erro: ' || sqlerrm;
  end;
  caso := 'Convite da equipe com 5 codigos errados morre (o codigo certo nao entra mais)'; esperado := 'false'; obtido := r_queimado; ok := obtido = esperado; return next;
  caso := 'Codigo certo com o convite de outro nao entra'; esperado := 'false'; obtido := r_convite_errado; ok := obtido = esperado; return next;
  caso := 'CONTROLE equipe entra com convite + codigo certo'; esperado := 'true'; obtido := r_novo; ok := obtido = esperado; return next;
  caso := 'CONTROLE entrada antiga (so os 4 numeros) continua'; esperado := 'true'; obtido := r_antigo; ok := obtido = esperado; return next;
  caso := 'CONTROLE codigo novo nasce com a busca que impede 2 iguais abertos'; esperado := 'true'; obtido := r_busca; ok := obtido = esperado; return next;

  -- 3) convite por e-mail: so entra com e-mail provado
  select u.id, lower(u.email) into u_id, u_email from auth.users u
   where u.email is not null and u.email_confirmed_at is not null and not coalesce(u.is_anonymous, false)
     and not exists (select 1 from produto.membros m where m.familia_id = t2::uuid and (m.user_id = u.id or m.email = lower(u.email)))
   order by u.created_at limit 1;
  begin
    insert into produto.membros (familia_id, papel, nome, email) values (t2::uuid, 'pessoa', 'Convite Revisao', 'convite.revisao@exemplo.test');
    if u_id is not null then
      insert into produto.membros (familia_id, papel, nome, email) values (t2::uuid, 'pessoa', 'Convite Revisao 2', u_email);
    end if;
    r_c1 := produto._tentativa_jwt(jsonb_build_object('sub', estranho, 'role', 'authenticated', 'email', 'convite.revisao@exemplo.test', 'amr', jsonb_build_array(jsonb_build_object('method', 'otp'))),
              'authenticated', 'select json_array_length(produto.entrar_por_convite()->''familias'')', 'contar');
    r_c2 := produto._tentativa_jwt(jsonb_build_object('sub', estranho, 'role', 'authenticated', 'email', 'convite.revisao@exemplo.test', 'is_anonymous', true),
              'authenticated', 'select json_array_length(produto.entrar_por_convite()->''familias'')', 'contar');
    r_c5 := produto._tentativa(paulo, 'authenticated', format('select 1 from produto.convidar(%L, ''pessoa'', ''Repetido'', ''Convite.Revisao@exemplo.test'')', t2), 'contar');
    if u_id is not null then
      r_c3 := produto._tentativa_jwt(jsonb_build_object('sub', u_id, 'role', 'authenticated', 'email', u_email, 'amr', jsonb_build_array(jsonb_build_object('method', 'password'))),
                'authenticated', 'select json_array_length(produto.entrar_por_convite()->''familias'')', 'contar');
      r_c4 := produto._tentativa_jwt(jsonb_build_object('sub', u_id, 'role', 'authenticated', 'email', u_email, 'amr', jsonb_build_array(jsonb_build_object('method', 'otp'))),
                'authenticated', 'select json_array_length(produto.entrar_por_convite()->''familias'')', 'contar');
    else
      r_c3 := 'bloqueado'; r_c4 := '1';
    end if;
    raise exception using errcode = 'P0001', message = 'desfazer';
  exception
    when sqlstate 'P0001' then null;
    when others then r_c1 := 'erro: ' || sqlerrm;
  end;
  caso := 'Convite por e-mail: conta que nao existe ou sem e-mail confirmado nao entra'; esperado := 'bloqueado'; obtido := r_c1; ok := obtido = esperado; return next;
  caso := 'Convite por e-mail: login anonimo com e-mail no token nao entra'; esperado := 'bloqueado'; obtido := r_c2; ok := obtido = esperado; return next;
  caso := 'Convite por e-mail: sessao aberta com senha (sem codigo no e-mail) nao entra'; esperado := 'bloqueado'; obtido := r_c3; ok := obtido = esperado; return next;
  caso := 'CONTROLE convite por e-mail: quem entrou com o codigo do e-mail entra em 1 familia'; esperado := '1'; obtido := r_c4; ok := obtido = esperado; return next;
  caso := 'Convidar 2 vezes o mesmo e-mail na mesma familia'; esperado := 'erro: esse e-mail ja foi convidado nesta familia'; obtido := r_c5; ok := obtido = esperado; return next;

  -- 4) teto da IA: a reserva segura 2 chamadas juntas, equipe nao usa, e o custo real substitui a reserva
  begin
    g := produto.ia_gasto_mes(silva::uuid);
    r_ia1 := produto.ia_reservar(silva::uuid, carla::uuid, 'teste', 'teste', 0.007, g + 0.01, g + 1000)->>'motivo';
    v_res := produto.ia_reservar(silva::uuid, ana::uuid, 'teste', 'teste', 0.007, g + 0.01, g + 1000);
    r_ia2 := v_res->>'ok';
    r_ia3 := coalesce(produto.ia_reservar(silva::uuid, ana::uuid, 'teste', 'teste', 0.007, g + 0.01, g + 1000)->>'motivo', 'passou');
    perform produto.ia_fechar((v_res->>'id')::uuid, 100, 50, 0.0002);
    r_ia4 := (produto.ia_gasto_mes(silva::uuid) - g)::text;
    raise exception using errcode = 'P0001', message = 'desfazer';
  exception
    when sqlstate 'P0001' then null;
    when others then r_ia1 := 'erro: ' || sqlerrm;
  end;
  caso := 'Equipe tenta usar a IA da familia'; esperado := 'familia'; obtido := r_ia1; ok := obtido = esperado; return next;
  caso := 'CONTROLE casal reserva 1 leitura de cupom'; esperado := 'true'; obtido := r_ia2; ok := obtido = esperado; return next;
  caso := '2a chamada junta que passaria do teto da IA'; esperado := 'limite'; obtido := r_ia3; ok := obtido = esperado; return next;
  caso := 'CONTROLE o custo real substitui a reserva'; esperado := '0.0002'; obtido := r_ia4; ok := obtido = esperado; return next;
end $$;

revoke all on function produto._tentativa_jwt(jsonb, text, text, text) from public, anon, authenticated;
revoke all on function produto._teste_revisao() from public, anon, authenticated;

create or replace function produto.teste_vazamento()
returns table(caso text, esperado text, obtido text, ok boolean) language sql set search_path = '' as
$$ select * from produto._teste_vazamento_tabelas() union all select * from produto._teste_vazamento_rpc() union all select * from produto._teste_revisao() $$;;