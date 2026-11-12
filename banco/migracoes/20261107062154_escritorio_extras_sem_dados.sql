alter table public.escritorio_turnos add column if not exists extras jsonb not null default '{}'::jsonb;

create or replace function public.escritorio_fechar_turno(p_id bigint, p jsonb)
 returns bigint language sql set search_path to ''
as $function$
  update public.escritorio_turnos set status=p->>'status', titulo=coalesce(p->>'titulo',''), numero=p->>'numero',
    detalhe=p->>'detalhe', pendencia=p->>'pendencia', fonte=p->>'fonte',
    extras=coalesce(p->'extras','{}'::jsonb), fim=now()
  where id=p_id and status='trabalhando' and fim is null and p->>'status' in ('entregue','precisa_de_voce','aguardando','sem_dados')
  returning id $function$;

create or replace function public.escritorio_painel()
 returns jsonb language sql stable set search_path to ''
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',f.id,'nome',f.nome,'setor',f.setor,'turno',f.turno,
    'status',case when t.trav then 'precisa_de_voce' else coalesce(t.status,'aguardando') end,
    'titulo',coalesce(t.titulo,''),'numero',t.numero,'detalhe',t.detalhe,
    'pendencia',case when t.trav then 'O turno parou no meio. Peça pra rodar de novo.' else t.pendencia end,
    'fonte',t.fonte,'exemplo',coalesce(t.exemplo,false),
    'inicio',to_char(t.inicio at time zone 'America/Recife','YYYY-MM-DD"T"HH24:MI'),
    'fim',to_char(t.fim at time zone 'America/Recife','YYYY-MM-DD"T"HH24:MI'))
    || coalesce(t.extras,'{}'::jsonb) order by f.ordem),'[]'::jsonb)
  from public.escritorio_funcionarios f
  left join lateral (select x.*, (x.status='trabalhando' and x.fim is null and x.inicio < now()-interval '30 minutes') trav
     from public.escritorio_turnos x where x.funcionario=f.id order by x.exemplo, x.inicio desc limit 1) t on true
  where f.ativo $function$;;