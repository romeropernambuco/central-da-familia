-- =====================================================================================
-- CENTRAL DA FAMILIA · RODAR NO SUPABASE (SQL Editor do projeto kcwaxvvivdckebjmjbkb)
-- Juntado em 11/11/2026: PENDENTE_confirmacao_manual.sql (antigo) + pendentes da revisao.
-- Como usar: copie 1 bloco por vez, cole no SQL Editor e clique em Run. Siga a ordem.
-- Blocos 1 a 4: rodar antes de abrir pro publico. Blocos 5 a 7: so depois do que cada um avisa.
-- Depois de cada bloco, rode o BLOCO 8 (teste). Tem que dar 0 linha.
-- Nenhum bloco abaixo foi rodado pelo Claude. Os blocos 1, 4 e 7 nao puderam ser testados.
-- =====================================================================================


-- ===== BLOCO 1 (OBRIGATORIO, SEM ELE NINGUEM NOVO ENTRA) =============================
-- O que faz: hoje o banco recusa qualquer cadastro de e-mail que nao esteja na lista
-- "convites" do sistema antigo da sua familia (e recusa o login anonimo da equipe).
-- Este bloco deixa gente nova criar conta no produto. O sistema antigo continua fechado:
-- quem nao esta na lista "convites" nao ganha papel la e nao ve nada de la.
-- Tambem tira a linha que marcava o e-mail como "confirmado" sem a pessoa provar que e dela.
-- ATENCAO: mexe no schema public (sistema antigo). E a unica mudanca fora do produto.
create or replace function public.antes_de_criar_conta()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  -- nao bloqueia mais ninguem e nao confirma e-mail sozinho.
  -- quem esta em "convites" continua ganhando o papel pelo gatilho depois_de_criar_conta.
  return new;
end $$;


-- ===== BLOCO 2 (OBRIGATORIO, LGPD) · veio do PENDENTE_confirmacao_manual.sql ==========
-- O que faz: cria o botao "apagar minha familia". So o casal apaga, e precisa escrever
-- o nome da familia igualzinho. Apaga tudo dela de uma vez: pessoas, envelopes, limites,
-- cartoes, lancamentos, ajustes, eventos, codigos da equipe e uso da IA.
create or replace function produto.apagar_familia(familia uuid, confirmacao text) returns json language plpgsql volatile security invoker set search_path = '' as
$$
declare f uuid := apagar_familia.familia; v_nome text; n int;
begin
  if produto.meu_papel(f) is distinct from 'casal' then raise exception 'so o casal apaga a familia' using errcode = '42501'; end if;
  select x.nome into v_nome from produto.familias x where x.id = f;
  if trim(coalesce(confirmacao,'')) is distinct from v_nome then raise exception 'para apagar, escreva o nome da familia exatamente: %', v_nome using errcode = '22023'; end if;
  delete from produto.familias x where x.id = f;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'nao foi possivel apagar' using errcode = '42501'; end if;
  return json_build_object('apagada', true, 'familia_id', f, 'nome', v_nome);
end $$;
revoke execute on function produto.apagar_familia(uuid, text) from public, anon;
grant execute on function produto.apagar_familia(uuid, text) to authenticated;
-- Faxina: 2 regras que nao fazem mais nada (ficaram no lugar das que ja foram unidas)
drop policy if exists eventos_ver_dono on produto.eventos;
drop policy if exists familias_ver_dono on produto.familias;


-- ===== BLOCO 3 (OBRIGATORIO) · faxina automatica toda noite ==========================
-- O que faz: sem isto, 4 listas crescem pra sempre. Toda noite, as 03:47 de Recife, apaga:
--   resultados dos testes com mais de 90 dias; tentativas de codigo da equipe com mais de 30 dias;
--   codigos da equipe vencidos ha mais de 30 dias; historico do agendador com mais de 30 dias.
-- NAO apaga lancamento, evento de uso nem custo da IA (isso e decisao sua, veja o BANCO.md).
create or replace function produto.faxina() returns text language plpgsql security definer set search_path = '' as $$
declare a int; b int; c int; d int;
begin
  delete from produto.teste_resultados r where r.rodado_em < now() - interval '90 days';   get diagnostics a = row_count;
  delete from produto.tentativas_equipe t where t.criado_em < now() - interval '30 days';  get diagnostics b = row_count;
  delete from produto.acesso_equipe ae where ae.expira_em < now() - interval '30 days';    get diagnostics c = row_count;
  delete from cron.job_run_details j where j.end_time < now() - interval '30 days';        get diagnostics d = row_count;
  return format('testes %s, tentativas %s, codigos %s, agendador %s', a, b, c, d);
end $$;
revoke all on function produto.faxina() from public, anon, authenticated;
select cron.schedule('produto_faxina', '47 6 * * *', 'select produto.faxina()');


-- ===== BLOCO 4 (OBRIGATORIO, LGPD) · apagar a propria conta ==========================
-- O que faz: apagar a familia nao apaga o login (o e-mail) de quem usava. Este bloco cria
-- "apagar minha conta": tira a pessoa das familias e apaga o login dela.
-- Se ela for o unico casal de uma familia, o banco recusa: tem que apagar a familia antes (bloco 2).
-- O front precisa de 1 botao que chame produto.apagar_minha_conta('APAGAR').
create or replace function produto.apagar_minha_conta(confirmacao text) returns json language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'entre no app antes' using errcode = '42501'; end if;
  if confirmacao is distinct from 'APAGAR' then raise exception 'para apagar a conta, escreva APAGAR' using errcode = '22023'; end if;
  delete from produto.membros m where m.user_id = uid;   -- o gatilho recusa se for o unico casal de alguma familia
  delete from produto.tentativas_equipe t where t.user_id = uid;
  delete from auth.users u where u.id = uid;
  return json_build_object('apagada', true);
end $$;
revoke all on function produto.apagar_minha_conta(text) from public, anon;
grant execute on function produto.apagar_minha_conta(text) to authenticated;


-- ===== BLOCO 5 (OPCIONAL) · "lancar" com o parametro chave ===========================
-- O que faz: hoje a chave do toque ja funciona pela funcao produto.lancar_com_chave.
-- Este bloco poe o mesmo parametro (chave) direto no produto.lancar, sem quebrar o app antigo.
-- Precisa apagar a versao antiga do lancar, por isso o Claude nao pode rodar.
drop function if exists produto.lancar(uuid, uuid, numeric, date, text, uuid, numeric);
create function produto.lancar(familia uuid, envelope uuid, valor numeric, data date default null, descricao text default null, cartao uuid default null, segundos numeric default null, chave uuid default null)
returns json language sql volatile set search_path = '' as
$$ select produto._lancar(familia, envelope, valor, data, descricao, cartao, segundos, chave) $$;
revoke all on function produto.lancar(uuid, uuid, numeric, date, text, uuid, numeric, uuid) from public, anon;
grant execute on function produto.lancar(uuid, uuid, numeric, date, text, uuid, numeric, uuid) to authenticated;


-- ===== BLOCO 6 (SO DEPOIS QUE O APP NOVO DA EQUIPE ESTIVER NO AR) ====================
-- O que faz: desliga a entrada antiga da equipe, que aceita so os 4 numeros (10.000 combinacoes
-- valendo pra todas as familias ao mesmo tempo). A entrada nova pede o convite (link ou QR) + os 4 numeros.
-- Se rodar antes de o app usar produto.entrar_equipe_convite, a equipe nao consegue entrar.
create or replace function produto.entrar_equipe(codigo text)
returns json language sql volatile security definer set search_path = '' as
$$ select json_build_object('ok', false, 'motivo', 'Abra o link do convite que te mandaram e digite os 4 numeros.', 'restam', 0) $$;


-- ===== BLOCO 7 (OPCIONAL, POR ULTIMO) · zera os avisos de SECURITY DEFINER ===========
-- O que faz: o painel do Supabase avisa de 13 funcoes do produto "com poder de dono" que o app pode chamar.
-- Elas conferem quem chama e nao vazam nada (os testes provam). O jeito certo de zerar o aviso e
-- guardar a funcao de verdade numa area que a internet nao alcanca (produto_privado) e deixar no
-- produto so uma "porta" sem poder. As regras de tranca continuam apontando pra funcao de verdade.
-- NAO acrescente produto_privado em "Exposed schemas". Nao foi testado: rode o bloco 8 logo depois.
create schema if not exists produto_privado;
grant usage on schema produto_privado to authenticated, service_role;
alter function produto.minhas_familias() set schema produto_privado;
alter function produto.meu_papel(uuid) set schema produto_privado;
alter function produto.familias_com_papel(text[]) set schema produto_privado;
alter function produto.meus_envelopes() set schema produto_privado;
alter function produto._envelopes_da_casa(uuid) set schema produto_privado;
alter function produto.criar_familia(text, text) set schema produto_privado;
alter function produto.convidar(uuid, text, text, text) set schema produto_privado;
alter function produto.entrar_equipe(text) set schema produto_privado;
alter function produto.entrar_equipe_convite(uuid, text) set schema produto_privado;
alter function produto.entrar_por_convite() set schema produto_privado;
alter function produto.casa_da_equipe(uuid) set schema produto_privado;
alter function produto.casa_marcar(uuid, text, jsonb) set schema produto_privado;
alter function produto.definir_limite(uuid, uuid, numeric) set schema produto_privado;
-- as portas (sem poder de dono) com os mesmos nomes de antes
create function produto.minhas_familias() returns setof uuid language sql stable set search_path = '' as $$ select * from produto_privado.minhas_familias() $$;
create function produto.meu_papel(p_familia uuid) returns text language sql stable set search_path = '' as $$ select produto_privado.meu_papel(p_familia) $$;
create function produto.familias_com_papel(variadic p_papeis text[]) returns setof uuid language sql stable set search_path = '' as $$ select * from produto_privado.familias_com_papel(variadic p_papeis) $$;
create function produto.meus_envelopes() returns setof uuid language sql stable set search_path = '' as $$ select * from produto_privado.meus_envelopes() $$;
create function produto._envelopes_da_casa(p_familia uuid) returns table(id uuid, nome text, regra text, criado_em timestamptz) language sql stable set search_path = '' as $$ select * from produto_privado._envelopes_da_casa(p_familia) $$;
create function produto.criar_familia(nome text, nome_pessoa text) returns json language sql volatile set search_path = '' as $$ select produto_privado.criar_familia(nome, nome_pessoa) $$;
create function produto.convidar(familia uuid, papel text, nome text, email text default null) returns json language sql volatile set search_path = '' as $$ select produto_privado.convidar(familia, papel, nome, email) $$;
create function produto.entrar_equipe(codigo text) returns json language sql volatile set search_path = '' as $$ select produto_privado.entrar_equipe(codigo) $$;
create function produto.entrar_equipe_convite(convite uuid, codigo text) returns json language sql volatile set search_path = '' as $$ select produto_privado.entrar_equipe_convite(convite, codigo) $$;
create function produto.entrar_por_convite() returns json language sql volatile set search_path = '' as $$ select produto_privado.entrar_por_convite() $$;
create function produto.casa_da_equipe(familia uuid) returns json language sql stable set search_path = '' as $$ select produto_privado.casa_da_equipe(familia) $$;
create function produto.casa_marcar(familia uuid, tipo text, dados jsonb default '{}'::jsonb) returns json language sql volatile set search_path = '' as $$ select produto_privado.casa_marcar(familia, tipo, dados) $$;
create function produto.definir_limite(familia uuid, envelope uuid, valor numeric) returns json language sql volatile set search_path = '' as $$ select produto_privado.definir_limite(familia, envelope, valor) $$;
revoke execute on all functions in schema produto from public, anon;
grant execute on function produto.minhas_familias(), produto.meu_papel(uuid), produto.familias_com_papel(text[]), produto.meus_envelopes(),
  produto._envelopes_da_casa(uuid), produto.criar_familia(text, text), produto.convidar(uuid, text, text, text), produto.entrar_equipe(text),
  produto.entrar_equipe_convite(uuid, text), produto.entrar_por_convite(), produto.casa_da_equipe(uuid), produto.casa_marcar(uuid, text, jsonb),
  produto.definir_limite(uuid, uuid, numeric) to authenticated;
-- Os 3 avisos do sistema antigo (public.papel_atual, pode_mexer, pode_ver) se resolvem do mesmo jeito,
-- mas so vale a pena se o sistema antigo continuar no ar. Nao estao neste bloco.


-- ===== BLOCO 8 · TESTE (rodar depois de cada bloco; tem que voltar 0 linha) ==========
select 'vazamento' as teste, caso, esperado, obtido from produto.teste_vazamento() where not ok
union all select 'contas', caso, esperado, obtido from produto.teste_contas_casos() where not ok
union all select 'conta', caso, null, null from produto.teste_conta() where not ok;


-- ===== BLOCO 9 (OPCIONAL) · taxa do dia do Guardado vinda sozinha do Banco Central =====
-- O que faz: o Guardado calcula "quanto rendeu hoje" com a taxa do dia (o CDI). Hoje essa taxa
-- esta parada na de 10/11/2026 (0,050788% ao dia), digitada a mao, e o app mostra "taxa de 10/11".
-- Este bloco liga a peca que deixa o banco buscar a taxa na internet (pg_net). Depois disso, o
-- servico que ja esta agendado (produto_indices_diario, 4 vezes por dia) busca a taxa sozinho.
-- O Claude nao pode ligar essa peca (a permissao foi negada) e por isso NAO testou se o banco
-- alcanca api.bcb.gov.br. Rode a linha 1, depois a linha 2, espere 1 minuto e rode a linha 3.
create extension if not exists pg_net;                                   -- linha 1: liga a peca
select produto.indices_buscar();                                         -- linha 2: pede a taxa ao Banco Central
select produto.indices_buscar(), (select count(*) from produto.pat_indices where fonte like 'BCB%') as dias_vindos_do_banco_central;  -- linha 3
-- Se "dias_vindos_do_banco_central" for maior que 0, funcionou. Se continuar 0, a internet do banco
-- nao alcanca o Banco Central: use o caminho manual abaixo sempre que quiser atualizar a taxa
-- (o numero esta em https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/5?formato=json).
-- Exemplo do caminho manual (troque a data e a taxa):
-- insert into produto.pat_indices (data, cdi_dia, selic_meta, fonte) values ('2026-11-11', 0.050788, 13.75, 'manual')
--   on conflict (data) do update set cdi_dia = excluded.cdi_dia, selic_meta = excluded.selic_meta, fonte = excluded.fonte, atualizado_em = now();


-- ===== BLOCO 10 (OPCIONAL) · faxina do Escritorio ====================================
-- O que faz: apaga 2 funcoes antigas do Escritorio que ficaram sem uso depois que os funcionarios
-- passaram a falar com frases novas. Nao muda nada na tela. O conector do Claude nao deixa apagar.
drop function if exists produto._esc_funcionarios();
drop function if exists produto._esc_q(text, text, text, text, text, numeric, jsonb, date, timestamptz, boolean, jsonb);
-- Depois de rodar, confira com este teste (tem que voltar 0 linha):
select 'guardado' as teste, caso, esperado, obtido from produto.teste_guardado() where not ok
union all select 'escritorio', caso, esperado, obtido from produto.teste_escritorio() where not ok;
