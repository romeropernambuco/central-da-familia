alter table public.escritorio_turnos add column if not exists chave text, add column if not exists tentativas int not null default 1;
create unique index if not exists escritorio_turnos_chave on public.escritorio_turnos(chave);
revoke truncate, references, trigger on public.escritorio_turnos, public.escritorio_funcionarios from anon, authenticated;

create or replace function public.escritorio_painel() returns jsonb language sql stable security invoker set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',f.id,'nome',f.nome,'setor',f.setor,'turno',f.turno,
    'status',case when t.trav then 'precisa_de_voce' else coalesce(t.status,'aguardando') end,
    'titulo',coalesce(t.titulo,''),'numero',t.numero,'detalhe',t.detalhe,
    'pendencia',case when t.trav then 'O turno parou no meio. Peça pra rodar de novo.' else t.pendencia end,
    'fonte',t.fonte,'exemplo',coalesce(t.exemplo,false),
    'inicio',to_char(t.inicio at time zone 'America/Recife','YYYY-MM-DD"T"HH24:MI'),
    'fim',to_char(t.fim at time zone 'America/Recife','YYYY-MM-DD"T"HH24:MI')) order by f.ordem),'[]'::jsonb)
  from public.escritorio_funcionarios f
  left join lateral (select x.*, (x.status='trabalhando' and x.fim is null and x.inicio < now()-interval '30 minutes') trav
     from public.escritorio_turnos x where x.funcionario=f.id order by x.exemplo, x.inicio desc limit 1) t on true
  where f.ativo $$;

create or replace function public.escritorio_abrir_turno(p_func text, p_titulo text default 'Turno em andamento')
returns bigint language sql volatile security invoker set search_path='' as $$
  insert into public.escritorio_turnos as t (funcionario,chave,status,titulo)
  values (p_func, p_func||':'||to_char(now() at time zone 'America/Recife','YYYY-MM-DD"h"HH24'),'trabalhando',p_titulo)
  on conflict (chave) do update set inicio=now(), fim=null, tentativas=t.tentativas+1
    where t.status='trabalhando' and t.fim is null and t.inicio < now()-interval '30 minutes'
  returning id $$;

create or replace function public.escritorio_fechar_turno(p_id bigint, p jsonb)
returns bigint language sql volatile security invoker set search_path='' as $$
  update public.escritorio_turnos set status=p->>'status', titulo=coalesce(p->>'titulo',''), numero=p->>'numero',
    detalhe=p->>'detalhe', pendencia=p->>'pendencia', fonte=p->>'fonte', fim=now()
  where id=p_id and status='trabalhando' and fim is null and p->>'status' in ('entregue','precisa_de_voce','aguardando')
  returning id $$;

revoke all on function public.escritorio_painel(), public.escritorio_abrir_turno(text,text), public.escritorio_fechar_turno(bigint,jsonb) from public, anon, authenticated;
grant execute on function public.escritorio_painel() to authenticated;;