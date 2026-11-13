-- f_05 (fase final): recebimentos com data até dez/2028 (contratos, retornos, salário). O plano conta só os marcados certos.
-- Não existe tipo 13º: 13º é só pagamento (folha), nunca receita (regra do dono, 13/11).
-- Ver: o casal (os 2 veem tudo, com o dono). Criar e mudar: só o dono (dono_membro = o meu membro). Ninguém apaga linha:
-- tirar da conta = preencher apagado_em. Filha e equipe: nada.
-- Desfazer: banco/migracoes/desfazer/f_05.sql

create table produto.recebimentos (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references produto.familias(id) on delete cascade,
  dono_membro uuid not null,
  descricao text not null check (char_length(btrim(descricao)) between 1 and 120),
  valor_centavos bigint not null check (valor_centavos > 0 and valor_centavos <= 100000000000),
  mes_previsto date not null check (mes_previsto = date_trunc('month', mes_previsto)::date and mes_previsto between date '2000-01-01' and date '2100-12-01'),
  mes_novo date check (mes_novo is null or (mes_novo = date_trunc('month', mes_novo)::date and mes_novo > mes_previsto)),
  tipo text not null check (tipo in ('salario', 'contrato', 'retorno', 'outro')),
  certo boolean not null default false,
  recebido_em date check (recebido_em is null or recebido_em between date '2000-01-01' and date '2100-12-31'),
  valor_recebido_centavos bigint check (valor_recebido_centavos is null or (valor_recebido_centavos > 0 and valor_recebido_centavos <= 100000000000)),
  criado_por uuid not null default auth.uid(),
  criado_em timestamptz not null default now(),
  apagado_em timestamptz,
  unique (familia_id, id),
  foreign key (familia_id, dono_membro) references produto.membros(familia_id, id)
);
comment on table produto.recebimentos is 'Dinheiro com data pra entrar (f_05). Centavos inteiros. mes_novo = mês pra onde foi o atrasado.';
create index recebimentos_familia_mes on produto.recebimentos (familia_id, mes_previsto);
alter table produto.recebimentos enable row level security;

create policy recebimentos_ver on produto.recebimentos for select to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')));
create policy recebimentos_criar on produto.recebimentos for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal'))
              and dono_membro = produto.meu_membro(familia_id) and criado_por = (select auth.uid()));
create policy recebimentos_mudar on produto.recebimentos for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal')) and dono_membro = produto.meu_membro(familia_id))
  with check (familia_id in (select produto.familias_com_papel('casal')) and dono_membro = produto.meu_membro(familia_id));

revoke all on produto.recebimentos from public, anon, authenticated;
grant select, insert on produto.recebimentos to authenticated;
grant update (descricao, valor_centavos, mes_previsto, mes_novo, tipo, certo, recebido_em, valor_recebido_centavos, apagado_em)
  on produto.recebimentos to authenticated;
grant select, insert, update on produto.recebimentos to service_role;

-- o casal baixa os recebimentos junto com o resto da família
do $$ begin
  execute replace(pg_get_functiondef('produto.exportar_familia(uuid)'::regprocedure),
    $a$    'uso_da_ia', $a$,
    $b$    'recebimentos', (select coalesce(json_agg(to_jsonb(x) || jsonb_build_object('dono_nome', coalesce((select o.nome from produto.membros o where o.familia_id = x.familia_id and o.id = x.dono_membro), 'Da família')) order by x.mes_previsto, x.criado_em), '[]') from produto.recebimentos x where x.familia_id = f),
    'uso_da_ia', $b$);
end $$;

-- portão: todos os testes que existirem no banco têm que continuar 100% ok
do $$
declare t text; n int;
begin
  foreach t in array array['teste_vazamento','teste_contas_casos','teste_guardado','teste_escritorio','teste_tranca_f','teste_futuro_ir'] loop
    if to_regprocedure('produto.' || t || '()') is not null then
      execute format('select count(*) from produto.%I() where not ok', t) into n;
      if n > 0 then raise exception 'f_05: % tem % caso(s) falhando; nada foi gravado', t, n; end if;
    end if;
  end loop;
  select count(*) into n from produto.teste_conta() where not ok;
  if n > 0 then raise exception 'f_05: teste_conta tem % caso(s) falhando; nada foi gravado', n; end if;
end $$;
