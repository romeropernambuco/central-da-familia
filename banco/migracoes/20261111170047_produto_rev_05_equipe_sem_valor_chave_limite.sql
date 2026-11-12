-- Pedidos do revisor do front: (1) equipe nunca recebe valor em dinheiro, nem pela rede;
-- (2) lancar com chave unica do toque; (3) limite do mes numa funcao so, sem mexer em mes fechado.

-- ===== (1) EQUIPE SEM DINHEIRO =====
create or replace function produto._envelopes_da_casa(p_familia uuid)
returns table(id uuid, nome text, regra text, criado_em timestamptz) language sql stable security definer set search_path = '' as $$
  select e.id, e.nome, e.regra, e.criado_em from produto.envelopes e
   where e.familia_id = p_familia and e.casa and produto.meu_papel(p_familia) in ('casal', 'equipe')
$$;
revoke all on function produto._envelopes_da_casa(uuid) from public, anon;
grant execute on function produto._envelopes_da_casa(uuid) to authenticated;

-- a equipe deixa de ler limite, colchao e gasto dos outros direto nas tabelas (so ve o que ela mesma lancou)
alter policy envelopes_ver on produto.envelopes
  using (id in (select produto.meus_envelopes()) and familia_id in (select produto.familias_com_papel('casal', 'pessoa')));
alter policy limites_ver on produto.limites_mes
  using (envelope_id in (select produto.meus_envelopes()) and familia_id in (select produto.familias_com_papel('casal', 'pessoa')));
alter policy lanc_ver on produto.lancamentos
  using (envelope_id in (select produto.meus_envelopes())
         and (familia_id in (select produto.familias_com_papel('casal', 'pessoa')) or autor = (select auth.uid())));

-- resumo_hoje pra equipe: so o nome dos envelopes da Casa, nenhum numero
do $do$
declare d text := pg_get_functiondef('produto._resumo(uuid, date)'::regprocedure);
  ancora text := $a$    if papel is null then raise exception 'sem acesso a esta familia' using errcode = '42501'; end if;$a$;
  novo text := $n$
    if papel = 'equipe' then
      return jsonb_build_object('familia_id', p_familia, 'data', p_hoje, 'papel', 'equipe', 'sem_valores', true, 'dias_restantes', dias,
        'envelopes', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'nome', x.nome, 'regra', x.regra, 'casa', true) order by x.criado_em, x.nome)
                                 from produto._envelopes_da_casa(p_familia) x), '[]'::jsonb),
        'explicacao', '[]'::jsonb);
    end if;$n$;
begin
  if position(ancora in d) = 0 then raise exception 'ancora do _resumo nao encontrada'; end if;
  if position('sem_valores' in d) = 0 then execute replace(d, ancora, ancora || novo); end if;
end $do$;

-- o teste antigo esperava que a equipe lesse a linha do envelope (com limite); agora o certo e nao ler
do $do$
declare d text := pg_get_functiondef('produto._teste_vazamento_tabelas()'::regprocedure);
  velho text := $a$('CONTROLE equipe ve so o envelope Casa', carla, 'authenticated', 'select count(*) from produto.envelopes', 'contar', '1')$a$;
  novo text := $n$('Equipe le a tabela de envelopes (tem limite e colchao)', carla, 'authenticated', 'select count(*) from produto.envelopes', 'contar', '0')$n$;
begin
  if position(velho in d) > 0 then execute replace(d, velho, novo);
  elsif position(novo in d) = 0 then raise exception 'linha do teste nao encontrada'; end if;
end $do$;

-- ===== (2) LANCAR COM CHAVE DO TOQUE =====
alter table produto.lancamentos add column if not exists chave_cliente uuid;
create unique index if not exists lancamentos_chave_cliente_key on produto.lancamentos (familia_id, chave_cliente) where chave_cliente is not null;
grant insert (chave_cliente) on produto.lancamentos to authenticated;

-- miolo unico do lancamento (com ou sem chave)
create or replace function produto._lancar(familia uuid, envelope uuid, valor numeric, data date, descricao text, cartao uuid, segundos numeric, chave uuid)
returns json language plpgsql volatile set search_path = '' as $$
#variable_conflict use_column
declare v_id uuid; v_dup uuid; v_data date := coalesce(_lancar.data, produto._hoje()); v_valor numeric := round(_lancar.valor, 2);
        v_desc text := nullif(left(trim(_lancar.descricao), 300), ''); v_papel text;
begin
  if (select auth.uid()) is null then raise exception 'precisa entrar no app antes de lancar' using errcode = '42501'; end if;
  if v_valor is null or v_valor <= 0 then raise exception 'o valor tem que ser maior que zero' using errcode = '22023'; end if;
  if v_valor > 1000000 then raise exception 'o valor passou de 1 milhao; confira os numeros' using errcode = '22023'; end if;
  if v_data < date '2000-01-01' or v_data > date '2100-12-31' then raise exception 'a data esta fora do calendario do app' using errcode = '22023'; end if;
  v_papel := produto.meu_papel(_lancar.familia);
  if _lancar.chave is not null then
    -- chave do toque: a mesma chave nunca grava 2 vezes, nem depois de 10 s, nem com a internet caindo no meio
    perform pg_advisory_xact_lock(hashtextextended('lancar:' || _lancar.familia::text || ':' || _lancar.chave::text, 0));
    select l.id into v_dup from produto.lancamentos l where l.familia_id = _lancar.familia and l.chave_cliente = _lancar.chave limit 1;
  else
    perform pg_advisory_xact_lock(hashtextextended('lancar:' || (select auth.uid())::text || ':' || coalesce(_lancar.envelope::text, ''), 0));
    select l.id into v_dup from produto.lancamentos l
     where l.familia_id = _lancar.familia and l.envelope_id = _lancar.envelope and l.valor = v_valor and l.data = v_data
       and l.descricao is not distinct from v_desc and l.cartao_id is not distinct from _lancar.cartao
       and l.autor = (select auth.uid()) and l.apagado_em is null and l.criado_em > now() - interval '10 seconds'
     limit 1;
  end if;
  if v_dup is null then
    v_id := gen_random_uuid();
    begin
      insert into produto.lancamentos (id, familia_id, envelope_id, cartao_id, valor, data, descricao, chave_cliente)
      values (v_id, _lancar.familia, _lancar.envelope, _lancar.cartao, v_valor, v_data, v_desc, _lancar.chave);
    exception when unique_violation then
      raise exception 'esse lancamento ja foi gravado (mesma chave)' using errcode = '23505';
    end;
    insert into produto.eventos (familia_id, tipo, segundos)
    values (_lancar.familia, 'lancamento', case when _lancar.segundos between 0 and 600 then round(_lancar.segundos, 1) end);
  else
    v_id := v_dup;
  end if;
  return json_build_object(
    'lancamento', case when v_papel = 'equipe'
       then (select json_build_object('id', l.id, 'envelope_id', l.envelope_id, 'data', l.data, 'descricao', l.descricao, 'criado_em', l.criado_em) from produto.lancamentos l where l.id = v_id)
       else (select to_json(l) from produto.lancamentos l where l.id = v_id) end,
    'repetido', v_dup is not null,
    'resumo', produto._resumo(_lancar.familia, produto._hoje()));
end $$;

-- o lancar que o app ja chama continua igual por fora (mesmos parametros)
create or replace function produto.lancar(familia uuid, envelope uuid, valor numeric, data date default null, descricao text default null, cartao uuid default null, segundos numeric default null)
returns json language sql volatile set search_path = '' as
$$ select produto._lancar(familia, envelope, valor, data, descricao, cartao, segundos, null) $$;

-- o mesmo lancar, com a chave do toque (o app gera 1 uuid por toque e repete a mesma chave se tentar de novo)
create or replace function produto.lancar_com_chave(familia uuid, envelope uuid, valor numeric, chave uuid, data date default null, descricao text default null, cartao uuid default null, segundos numeric default null)
returns json language plpgsql volatile set search_path = '' as $$
begin
  if chave is null then raise exception 'falta a chave do toque' using errcode = '22023'; end if;
  return produto._lancar(familia, envelope, valor, data, descricao, cartao, segundos, chave);
end $$;
revoke all on function produto._lancar(uuid, uuid, numeric, date, text, uuid, numeric, uuid) from public, anon;
grant execute on function produto._lancar(uuid, uuid, numeric, date, text, uuid, numeric, uuid) to authenticated;
revoke all on function produto.lancar_com_chave(uuid, uuid, numeric, uuid, date, text, uuid, numeric) from public, anon;
grant execute on function produto.lancar_com_chave(uuid, uuid, numeric, uuid, date, text, uuid, numeric) to authenticated;

-- ===== (3) LIMITE DO MES NUMA FUNCAO SO =====
-- guarda o limite que valia nos meses fechados antes de qualquer troca
create or replace function produto._congelar_limite_passado(p_familia uuid, p_env uuid, p_valor numeric)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare v_mes text := to_char(produto._hoje(), 'YYYY-MM'); v_prim text;
begin
  select to_char(least(coalesce((select min(l.data) from produto.lancamentos l where l.envelope_id = p_env and l.apagado_em is null), (e.criado_em at time zone 'America/Recife')::date),
                       (e.criado_em at time zone 'America/Recife')::date), 'YYYY-MM')
    into v_prim from produto.envelopes e where e.id = p_env and e.familia_id = p_familia;
  if v_prim is not null and v_prim < v_mes and p_valor is not null
     and not exists (select 1 from produto.limites_mes x where x.envelope_id = p_env and x.mes < v_mes) then
    insert into produto.limites_mes (familia_id, envelope_id, mes, valor) values (p_familia, p_env, v_prim, p_valor)
    on conflict (envelope_id, mes) do nothing;
  end if;
end $$;
revoke all on function produto._congelar_limite_passado(uuid, uuid, numeric) from public, anon, authenticated;

create or replace function produto._envelope_congela_limite() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.limite_mes is distinct from old.limite_mes then
    perform produto._congelar_limite_passado(old.familia_id, old.id, old.limite_mes);
  end if;
  return new;
end $$;
revoke all on function produto._envelope_congela_limite() from public, anon, authenticated;
create trigger envelopes_congela_limite before update of limite_mes on produto.envelopes
  for each row execute function produto._envelope_congela_limite();

create or replace function produto.definir_limite(familia uuid, envelope uuid, valor numeric)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare f uuid := definir_limite.familia; en uuid := definir_limite.envelope; v_val numeric := round(definir_limite.valor, 2);
        v_hoje date := produto._hoje(); v_mes text;
begin
  v_mes := to_char(v_hoje, 'YYYY-MM');
  if (select auth.uid()) is null or produto.meu_papel(f) is distinct from 'casal' then raise exception 'so o casal muda o limite' using errcode = '42501'; end if;
  if v_val is null or v_val < 0 or v_val > 99999999 then raise exception 'o limite tem que ser um valor de zero pra cima' using errcode = '22023'; end if;
  perform 1 from produto.envelopes e where e.id = en and e.familia_id = f for update;
  if not found then raise exception 'envelope nao encontrado' using errcode = 'P0002'; end if;
  -- mes fechado nao muda: grava o que valia ate o mes passado antes de trocar
  perform produto._congelar_limite_passado(f, en, produto._lim(en, (date_trunc('month', v_hoje) - interval '1 day')::date));
  insert into produto.limites_mes (familia_id, envelope_id, mes, valor) values (f, en, v_mes, v_val)
  on conflict (envelope_id, mes) do update set valor = excluded.valor;
  update produto.envelopes e set limite_mes = v_val where e.id = en;
  return json_build_object('envelope_id', en, 'limite', v_val, 'vale_desde', v_mes, 'resumo', produto._resumo(f, v_hoje));
end $$;
revoke all on function produto.definir_limite(uuid, uuid, numeric) from public, anon;
grant execute on function produto.definir_limite(uuid, uuid, numeric) to authenticated;

-- pela API ninguem grava, muda ou tira limite de mes fechado
alter policy limites_criar on produto.limites_mes
  with check (familia_id in (select produto.familias_com_papel('casal')) and mes >= to_char((now() at time zone 'America/Recife')::date, 'YYYY-MM'));
alter policy limites_mudar on produto.limites_mes
  using (familia_id in (select produto.familias_com_papel('casal')) and mes >= to_char((now() at time zone 'America/Recife')::date, 'YYYY-MM'))
  with check (familia_id in (select produto.familias_com_papel('casal')) and mes >= to_char((now() at time zone 'America/Recife')::date, 'YYYY-MM'));
alter policy limites_apagar on produto.limites_mes
  using (familia_id in (select produto.familias_com_papel('casal')) and mes >= to_char((now() at time zone 'America/Recife')::date, 'YYYY-MM'));;