#!/usr/bin/env bash
# E4: prova que a regra da parcela da tela (lib/plano.ts) é a mesma do banco. Pega as 2 funções do banco direto das
# migrações (_mes_fatura e _parcela_valor), roda os casos num Postgres 16 só de teste (nada de Supabase, nada real)
# e compara com src/lib/parcela_banco.json, que o Vitest (src/fase_final_e4.test.ts) usa contra o TypeScript.
# Uso: bash testes/compara_parcela_banco.sh   (sai com 1 se o banco der diferente do arquivo)
set -euo pipefail
AQUI=$(cd "$(dirname "$0")/.." && pwd); MIG=$AQUI/../banco/migracoes; PG=/usr/lib/postgresql/16/bin
T=$(mktemp -d /var/tmp/parcela.XXXX); mkdir -p "$T/sock"; chown -R postgres "$T" 2>/dev/null || true
como_pg() { if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
como_pg "$PG/initdb" -D "$T/d" -U postgres >/dev/null
como_pg "$PG/pg_ctl" -D "$T/d" -o "-p 54378 -k $T/sock -c listen_addresses=" -l "$T/log" -w start >/dev/null
trap 'como_pg "$PG/pg_ctl" -D "$T/d" -m fast -w stop >/dev/null; rm -rf "$T"' EXIT
python3 - "$MIG" > "$T/f.sql" <<'PY'
import sys
m=sys.argv[1]
a=open(m+'/20261111044957_produto_06_funcoes_de_conta.sql').read(); i=a.index('create or replace function produto._mes_fatura'); j=a.index('$$;',i)+3
b=open(m+'/20261113170004_produto_f_04_parcelas_no_cartao.sql').read(); k=b.index('create or replace function produto._parcela_valor'); l=b.index('$$;',k)+3
print('create schema produto;'); print(a[i:j]); print(b[k:l])
PY
python3 - "$AQUI/src/lib/parcela_banco.json" > "$T/c.sql" <<'PY'
import json,sys
c=json.load(open(sys.argv[1]))['casos']
v=',\n'.join(f"('{x['id']}', date '{x['data']}', {x['fecha']}, {x['vence']}, {x['valor']:.2f}, {x['parcelas']})" for x in c)
print(f"with c(id,data,fecha,vence,valor,n) as (values {v}) select c.id, g.i+1, to_char(produto._mes_fatura(c.fecha,c.vence,c.data)+make_interval(months=>g.i),'YYYY-MM'), produto._parcela_valor(c.valor,c.n::smallint,g.i) from c cross join lateral generate_series(0,c.n-1) g(i) order by c.id,g.i;")
PY
"$PG/psql" -X -q -h "$T/sock" -p 54378 -U postgres -d postgres -f "$T/f.sql"
"$PG/psql" -X -At -F '|' -h "$T/sock" -p 54378 -U postgres -d postgres -f "$T/c.sql" > "$T/banco.txt"
python3 - "$AQUI/src/lib/parcela_banco.json" "$T/banco.txt" <<'PY'
import json,sys
c={x['id']:x for x in json.load(open(sys.argv[1]))['casos']}
dif=0; n=0
for l in open(sys.argv[2]):
    i,k,mes,v=l.strip().split('|'); e=c[i]['banco'][int(k)-1]; n+=1
    if e['mes']!=mes or abs(e['valor']-float(v))>0.001: dif+=1; print('DIFERENTE',i,k,mes,v,e)
print(f'{n} parcelas do banco conferidas com o arquivo, {dif} diferença(s)'); sys.exit(1 if dif else 0)
PY
