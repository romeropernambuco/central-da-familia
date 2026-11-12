
alter function public.hoje_recife() set search_path = public;
alter function public.ping() set search_path = public;
revoke all on function public.papel_atual() from public, anon;
grant execute on function public.papel_atual() to authenticated;
;