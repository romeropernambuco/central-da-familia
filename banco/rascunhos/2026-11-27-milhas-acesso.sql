-- RASCUNHO. Ainda não rodou no banco real. Só roda com o "pode" do Romero.
-- O que muda: Andreza passa a ver e mexer no painel "milhas" (o preço do milheiro da família).
-- O que não muda: Romero continua com tudo; Jobson continua só na feira; sem login, nada.
-- Nenhuma tabela nova: os dados ficam em docs, com painel = 'milhas'.
-- Para voltar atrás: 2026-11-27-milhas-acesso-desfazer.sql

create or replace function public.pode_mexer(p text)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select case public.papel_atual()
    when 'romero' then true
    when 'andreza' then p in ('andreza', 'milhas')
    when 'jobson' then p = 'feira'
    else false end
$function$;
