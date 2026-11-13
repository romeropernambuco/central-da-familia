-- f_06 (fase final): aba Desejos (calculadora pra todos). "Quero R$ 50.000 pra viajar": de onde volta, quando, se é certo.
-- A conta (cabe? quanto tira de 2029?) é do motor em codigo/src/lib/futuro (F7); aqui só o dado.
-- Ver: o casal vê todos; a pessoa (filha) vê só os dela. Criar e mudar: só o dono. Equipe: nada. Ninguém apaga linha.
-- Desfazer: banco/migracoes/desfazer/f_06.sql

create table produto.desejos (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references produto.familias(id) on delete cascade,
  dono_membro uuid not null,
  nome text not null check (char_length(btrim(nome)) between 1 and 80),
  valor_centavos bigint not null check (valor_centavos > 0 and valor_centavos <= 100000000000),
  mes date not null check (mes = date_trunc('month', mes)::date and mes between date '2000-01-01' and date '2100-12-01'),
  volta_de text not null default 'nada' check (volta_de in ('nada', 'contrato', 'investimento', 'venda')),
  volta_centavos bigint not null default 0 check (volta_centavos >= 0 and volta_centavos <= 100000000000),
  volta_mes date check (volta_mes is null or (volta_mes = date_trunc('month', volta_mes)::date and volta_mes between date '2000-01-01' and date '2100-12-01')),
  antecipado_centavos bigint check (antecipado_centavos is null or (antecipado_centavos >= 0 and antecipado_centavos <= 100000000000)),
  volta_certa boolean not null default false,
  situacao text not null default 'pensando' check (situacao in ('pensando', 'combinado', 'feito', 'desisti')),
  criado_em timestamptz not null default now(),
  apagado_em timestamptz,
  unique (familia_id, id),
  foreign key (familia_id, dono_membro) references produto.membros(familia_id, id),
  constraint desejos_volta_coerente check ((volta_de = 'nada' and volta_centavos = 0 and volta_mes is null)
                                        or (volta_de <> 'nada' and volta_centavos > 0 and volta_mes is not null))
);
comment on table produto.desejos is 'Desejos da família (f_06). Centavos inteiros. A conta de 2029 é do motor (F7), nunca do banco.';
create index desejos_familia on produto.desejos (familia_id, mes);
alter table produto.desejos enable row level security;

create policy desejos_ver on produto.desejos for select to authenticated
  using (familia_id in (select produto.familias_com_papel('casal'))
         or (familia_id in (select produto.familias_com_papel('pessoa')) and dono_membro = produto.meu_membro(familia_id)));
create policy desejos_criar on produto.desejos for insert to authenticated
  with check (familia_id in (select produto.familias_com_papel('casal', 'pessoa')) and dono_membro = produto.meu_membro(familia_id));
create policy desejos_mudar on produto.desejos for update to authenticated
  using (familia_id in (select produto.familias_com_papel('casal', 'pessoa')) and dono_membro = produto.meu_membro(familia_id))
  with check (familia_id in (select produto.familias_com_papel('casal', 'pessoa')) and dono_membro = produto.meu_membro(familia_id));

revoke all on produto.desejos from public, anon, authenticated;
grant select, insert on produto.desejos to authenticated;
grant update (nome, valor_centavos, mes, volta_de, volta_centavos, volta_mes, antecipado_centavos, volta_certa, situacao, apagado_em)
  on produto.desejos to authenticated;
grant select, insert, update on produto.desejos to service_role;

do $$ begin
  execute replace(pg_get_functiondef('produto.exportar_familia(uuid)'::regprocedure),
    $a$    'uso_da_ia', $a$,
    $b$    'desejos', (select coalesce(json_agg(to_jsonb(x) || jsonb_build_object('dono_nome', coalesce((select o.nome from produto.membros o where o.familia_id = x.familia_id and o.id = x.dono_membro), 'Da família')) order by x.criado_em), '[]') from produto.desejos x where x.familia_id = f),
    'uso_da_ia', $b$);
end $$;

-- a filha baixa os desejos dela junto com o resto do que é dela
do $$ begin
  execute replace(pg_get_functiondef('produto.exportar_meu(uuid)'::regprocedure),
    $a$                     where x.familia_id = f and (x.envelope_id = v_env or x.autor = (select auth.uid()))));$a$,
    $b$                     where x.familia_id = f and (x.envelope_id = v_env or x.autor = (select auth.uid()))),
    'desejos', (select coalesce(json_agg(x order by x.criado_em), '[]') from produto.desejos x where x.familia_id = f and x.dono_membro = v_mid));$b$);
end $$;

-- portão: todos os testes que existirem no banco têm que continuar 100% ok
do $$
declare t text; n int;
begin
  foreach t in array array['teste_vazamento','teste_contas_casos','teste_guardado','teste_escritorio','teste_tranca_f','teste_futuro_ir'] loop
    if to_regprocedure('produto.' || t || '()') is not null then
      execute format('select count(*) from produto.%I() where not ok', t) into n;
      if n > 0 then raise exception 'f_06: % tem % caso(s) falhando; nada foi gravado', t, n; end if;
    end if;
  end loop;
  select count(*) into n from produto.teste_conta() where not ok;
  if n > 0 then raise exception 'f_06: teste_conta tem % caso(s) falhando; nada foi gravado', n; end if;
end $$;
