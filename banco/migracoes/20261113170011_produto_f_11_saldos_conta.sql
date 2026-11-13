-- f_11 (fase final): dinheiro em conta corrente, fora das aplicações (pedido do TELAS: o motor recebia saldo_caixa 0).
-- Uma linha por conta: de quem é (dono_membro; nulo = do casal), banco e o saldo em centavos, com quem atualizou e quando.
-- Tranca igual à das aplicações: o casal lê tudo, com o dono; cada um mexe só na sua e nas do casal; filha e equipe nada;
-- ninguém apaga linha (tirar = preencher apagado_em). futuro_entradas passa a mandar saldo_caixa (soma) e a lista.
-- Desfazer: banco/migracoes/desfazer/f_11.sql

create table produto.saldos_conta (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references produto.familias(id) on delete cascade,
  dono_membro uuid,
  banco text not null check (char_length(btrim(banco)) between 1 and 60),
  valor_centavos bigint not null check (valor_centavos >= 0 and valor_centavos <= 100000000000),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid default auth.uid(),
  criado_em timestamptz not null default now(),
  apagado_em timestamptz,
  unique (familia_id, id),
  foreign key (familia_id, dono_membro) references produto.membros(familia_id, id)
);
comment on table produto.saldos_conta is 'Saldo em conta corrente por conta (f_11). Centavos. dono_membro nulo = do casal.';
create index saldos_conta_familia on produto.saldos_conta (familia_id);

create function produto._saldo_conta_carimbo() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  new.atualizado_por := (select auth.uid());
  return new;
end $$;
revoke all on function produto._saldo_conta_carimbo() from public, anon, authenticated;
create trigger saldos_conta_carimbo before insert or update on produto.saldos_conta
  for each row execute function produto._saldo_conta_carimbo();

alter table produto.saldos_conta enable row level security;
create policy saldos_conta_ver on produto.saldos_conta for select to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')));
create policy saldos_conta_criar on produto.saldos_conta for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal'))
              and (dono_membro is null or dono_membro = produto.meu_membro(familia_id)));
create policy saldos_conta_mudar on produto.saldos_conta for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal'))
         and (dono_membro is null or dono_membro = produto.meu_membro(familia_id)))
  with check (familia_id in (select produto.familias_com_papel('casal'))
              and (dono_membro is null or dono_membro = produto.meu_membro(familia_id)));

revoke all on produto.saldos_conta from public, anon, authenticated;
grant select, insert on produto.saldos_conta to authenticated;
grant update (banco, valor_centavos, apagado_em) on produto.saldos_conta to authenticated;
grant select, insert, update on produto.saldos_conta to service_role;

do $$ begin
  if position($a$    'dividas', '[]'::jsonb,$a$ in (select prosrc from pg_proc where oid = 'produto.futuro_entradas(uuid)'::regprocedure)) = 0 then
    raise exception 'f_11: trecho nao achado em produto.futuro_entradas(uuid)';
  end if;
  execute replace(pg_get_functiondef('produto.futuro_entradas(uuid)'::regprocedure), $a$    'dividas', '[]'::jsonb,$a$, $b$    'dividas', '[]'::jsonb,
    -- f_11: dinheiro parado em conta corrente (fora das aplicações), por conta e somado
    'saldo_caixa', (select coalesce(sum(s.valor_centavos), 0) from produto.saldos_conta s where s.familia_id = f and s.apagado_em is null),
    'saldos_conta', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'dono_membro', s.dono_membro, 'banco', s.banco,
        'valor_centavos', s.valor_centavos, 'atualizado_em', s.atualizado_em) order by s.banco, s.id), '[]'::jsonb)
        from produto.saldos_conta s where s.familia_id = f and s.apagado_em is null),$b$);
end $$;
do $$ begin
  if position($a$    'uso_da_ia', $a$ in (select prosrc from pg_proc where oid = 'produto.exportar_familia(uuid)'::regprocedure)) = 0 then
    raise exception 'f_11: trecho nao achado em produto.exportar_familia(uuid)';
  end if;
  execute replace(pg_get_functiondef('produto.exportar_familia(uuid)'::regprocedure), $a$    'uso_da_ia', $a$, $b$    'saldos_conta', (select coalesce(json_agg(to_jsonb(x) || jsonb_build_object('dono_nome', coalesce((select o.nome from produto.membros o where o.familia_id = x.familia_id and o.id = x.dono_membro), 'Da família')) order by x.banco), '[]') from produto.saldos_conta x where x.familia_id = f),
    'uso_da_ia', $b$);
end $$;

-- portão: todos os testes que existirem no banco têm que continuar 100% ok
do $$
declare t text; n int;
begin
  foreach t in array array['teste_vazamento','teste_contas_casos','teste_guardado','teste_escritorio','teste_tranca_f','teste_futuro_ir'] loop
    if to_regprocedure('produto.' || t || '()') is not null then
      execute format('select count(*) from produto.%I() where not ok', t) into n;
      if n > 0 then raise exception 'f_11: % tem % caso(s) falhando; nada foi gravado', t, n; end if;
    end if;
  end loop;
  select count(*) into n from produto.teste_conta() where not ok;
  if n > 0 then raise exception 'f_11: teste_conta tem % caso(s) falhando; nada foi gravado', n; end if;
end $$;
