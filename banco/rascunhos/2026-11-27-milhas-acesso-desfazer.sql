-- DESFAZER do rascunho 2026-11-27-milhas-acesso.sql.
-- Devolve a regra exatamente como estava no banco em 27/11/2026.
-- O que Andreza tiver gravado em painel = 'milhas' continua guardado, só deixa de aparecer para ela.

create or replace function public.pode_mexer(p text)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select case public.papel_atual()
    when 'romero' then true
    when 'andreza' then p = 'andreza'
    when 'jobson' then p = 'feira'
    else false end
$function$;
