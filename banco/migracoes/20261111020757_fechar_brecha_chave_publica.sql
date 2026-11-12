-- Chave pública (anon): só leitura, e o RLS já devolve 0 linha sem login.
revoke insert, update, delete, truncate, references, trigger
  on public.pessoas, public.convites, public.docs, public.docs_historico,
     public.escritorio_funcionarios, public.escritorio_turnos
  from anon;
-- Ninguém de fora apaga tabela inteira (TRUNCATE passa por cima do RLS).
revoke truncate, references, trigger
  on public.pessoas, public.convites, public.docs, public.docs_historico,
     public.andreza_dados, public.caixa_dados, public.feira_dados, public.parcelas_dados
  from authenticated;
-- Tabelas novas não nascem com essa porta aberta.
alter default privileges in schema public revoke truncate, references, trigger on tables from anon, authenticated;
alter default privileges in schema public revoke insert, update, delete on tables from anon;;