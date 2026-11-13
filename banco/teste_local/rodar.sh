#!/usr/bin/env bash
# Banco de teste LOCAL da Central da Família (Postgres 16 desta máquina). Nunca toca no Supabase real.
# Faz tudo do zero e termina com o placar:
#   1. apaga e cria o cluster em banco/teste_local/dados (fora do git) e aplica o esqueleto do Supabase
#   2. aplica TODAS as migrações antigas de banco/migracoes/ em ordem e roda os testes antigos
#   3. tira um retrato da estrutura, aplica as f_NN (fase final) em ordem e roda todos os testes
#   4. confere os 10 casos IR do banco com o casos_teste.json
#   5. prova que o teste da tranca pega furo (desfaz a f_02 dentro de uma transação e conta as falhas)
#   6. desfaz da f_10 até a f_01, confere que a estrutura voltou IGUAL ao retrato e que os testes antigos passam
#   7. aplica as f_NN de novo e roda tudo de novo
# Uso: bash banco/teste_local/rodar.sh
#   PORTA=54329 (padrão)   MANTER=1 deixa o banco ligado no fim
#   CASOS_TESTE=caminho/casos_teste.json (padrão: codigo/src/lib/futuro/casos_teste.json, se existir)
set -euo pipefail

AQUI=$(cd "$(dirname "$0")" && pwd)
BANCO=$(dirname "$AQUI")
RAIZ=$(dirname "$BANCO")
MIG=$BANCO/migracoes
DESF=$MIG/desfazer
PGBIN=/usr/lib/postgresql/16/bin
PORTA=${PORTA:-54329}
DADOS=$AQUI/dados
SOCK=$AQUI/sock
LOG=$AQUI/log
DB=central_teste
CASOS_TESTE=${CASOS_TESTE:-$RAIZ/codigo/src/lib/futuro/casos_teste.json}

como_pg() { if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
adm() { "$PGBIN/psql" -X -q -v ON_ERROR_STOP=1 -h "$SOCK" -p "$PORTA" -U supabase_admin -d "$DB" "$@"; }
pg()  { "$PGBIN/psql" -X -q -v ON_ERROR_STOP=1 -h "$SOCK" -p "$PORTA" -U postgres -d "$DB" "$@"; }
pgv() { "$PGBIN/psql" -X -q -At -F '|' -v ON_ERROR_STOP=1 -h "$SOCK" -p "$PORTA" -U postgres -d "$DB" "$@"; }

desligar() { if [ -f "$DADOS/postmaster.pid" ]; then como_pg "$PGBIN/pg_ctl" -D "$DADOS" -m fast -w stop >/dev/null 2>&1 || true; fi; }

# aplica 1 migração como o Supabase faz: 1 transação, usuário postgres, para no 1º erro.
# Única troca: a linha "create extension ... pg_cron" (a extensão não existe aqui; o esqueleto tem o stub cron.*).
aplicar() {
  local f=$1
  if ! sed -E '/create extension if not exists pg_cron/d' "$f" | pg -1 -f - >"$LOG/ultima.log" 2>&1; then
    echo "FALHOU ao aplicar $(basename "$f")"; cat "$LOG/ultima.log"; exit 1
  fi
}

TESTES="teste_vazamento teste_contas_casos teste_guardado teste_escritorio teste_tranca_f teste_futuro_ir"
placar() {  # "teste|casos|ok" de cada teste que existir no banco
  local t
  for t in $TESTES; do
    if [ "$(pgv -c "select to_regprocedure('produto.$t()') is not null")" = t ]; then
      pgv -c "select '$t', count(*), count(*) filter (where ok) from produto.$t()"
    fi
  done
  pgv -c "select 'teste_conta', count(*), count(*) filter (where ok) from produto.teste_conta()"
  pgv -c "select 'rodar_testes_noturnos', 1, (produto.rodar_testes_noturnos() = 'tudo certo')::int"
}
falhas() {
  local t
  for t in $TESTES; do
    if [ "$(pgv -c "select to_regprocedure('produto.$t()') is not null")" = t ]; then
      pgv -c "select '$t', caso, esperado, obtido from produto.$t() where not ok"
    fi
  done
  pgv -c "select 'teste_conta', caso from produto.teste_conta() where not ok"
  pgv -c "select 'noturno', teste, caso, detalhe from produto.teste_resultados where not ok order by id desc limit 20"
}
confere() {  # $1 = rótulo. Sai com erro se qualquer caso falhar.
  local saida ruim
  saida=$(placar)
  ruim=$(echo "$saida" | awk -F'|' '$2 != $3' | wc -l)
  echo "$saida" | awk -F'|' -v r="$1" '{ printf "   [%s] %-22s %4s de %4s ok\n", r, $1, $3, $2 }'
  if [ "$ruim" != 0 ]; then echo "   FALHAS:"; falhas | sed 's/^/     /'; exit 1; fi
}

# ---------- 1. cluster do zero ----------
desligar
rm -rf "$DADOS" "$SOCK"
mkdir -p "$DADOS" "$SOCK" "$LOG"
if [ "$(id -u)" = 0 ]; then chown postgres "$DADOS" "$SOCK" "$LOG"; chmod 700 "$DADOS"; fi
como_pg "$PGBIN/initdb" -D "$DADOS" -U supabase_admin --auth=trust -E UTF8 --locale=C.UTF-8 >"$LOG/initdb.log" 2>&1
como_pg "$PGBIN/pg_ctl" -D "$DADOS" -l "$LOG/postgres.log" -w \
  -o "-p $PORTA -k $SOCK -c listen_addresses='' -c timezone=UTC -c log_timezone=UTC" start >/dev/null
trap '[ "${MANTER:-0}" = 1 ] || desligar' EXIT
"$PGBIN/psql" -X -q -h "$SOCK" -p "$PORTA" -U supabase_admin -d postgres -c "create database $DB"
adm -f "$AQUI/esqueleto_supabase.sql" >/dev/null
echo "1. banco local criado (Postgres $("$PGBIN/postgres" --version | awk '{print $3}'), porta $PORTA) com o esqueleto do Supabase"

# ---------- 2. migrações antigas ----------
ANTIGAS=$(ls "$MIG"/*.sql | grep -v '_produto_f_[0-9]*_' | sort)
FS=$(ls "$MIG"/*_produto_f_*.sql 2>/dev/null | sort || true)
n=0; for f in $ANTIGAS; do aplicar "$f"; n=$((n+1)); done
echo "2. $n migrações antigas aplicadas em ordem; testes antigos:"
confere "antigas"

# ---------- 3. f_NN ----------
pgv -f "$AQUI/retrato.sql" >"$LOG/retrato_antes.txt"
nf=0; for f in $FS; do aplicar "$f"; nf=$((nf+1)); done
echo "3. $nf migrações da fase final aplicadas (cada uma já roda os testes no fim); testes:"
confere "com f_NN"

# ---------- 4. IR do banco = casos_teste.json ----------
if [ -f "$CASOS_TESTE" ]; then
  python3 -I - "$CASOS_TESTE" >"$LOG/ir_json.txt" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
for c in d["casos"]:
    if not c["id"].startswith("IR-"):
        continue
    s = c["saida_esperada"]
    if "dias_corridos" in s:
        print(f'{c["id"]}|dias_corridos={s["dias_corridos"]} aliquota_pct={s["aliquota_pct"]}')
    else:
        print(f'{c["id"]}|aliquota_pct={s["aliquota_pct"]} ir={s["ir"]} rendimento_liquido={s["rendimento_liquido"]}')
PY
  pgv -c "select caso, esperado from produto.teste_futuro_ir() order by caso" >"$LOG/ir_banco.txt"
  if diff <(sort "$LOG/ir_json.txt") <(sort "$LOG/ir_banco.txt") >/dev/null; then
    echo "4. os $(wc -l <"$LOG/ir_json.txt") casos IR do banco são os mesmos do casos_teste.json"
  else
    echo "4. FALHOU: casos IR do banco diferentes do casos_teste.json"; diff <(sort "$LOG/ir_json.txt") <(sort "$LOG/ir_banco.txt"); exit 1
  fi
else
  echo "4. (casos_teste.json não achado em $CASOS_TESTE; conferência IR x json pulada. Use CASOS_TESTE=...)"
fi

# ---------- 5. o teste da tranca pega furo ----------
furo=$( { echo "begin;"; cat "$DESF/f_02.sql"; echo "select 'FUROS=' || count(*) from produto.teste_tranca_f() where not ok;"; echo "rollback;"; } \
        | "$PGBIN/psql" -X -q -At -v ON_ERROR_STOP=1 -h "$SOCK" -p "$PORTA" -U postgres -d "$DB" 2>/dev/null | grep '^FUROS=' | cut -d= -f2)
if [ "${furo:-0}" -gt 0 ]; then echo "5. sem a tranca da f_02, o teste_tranca_f acusa $furo furo(s) (e volta tudo: era só uma transação de prova)"
else echo "5. FALHOU: tirando a f_02 o teste_tranca_f não acusou nada"; exit 1; fi

# ---------- 6. desfazer tudo ----------
for f in $(echo "$FS" | sort -r); do
  nn=$(basename "$f" | sed -E 's/.*_produto_f_([0-9]+)_.*/\1/')
  [ -f "$DESF/f_$nn.sql" ] || { echo "falta o desfazer de f_$nn"; exit 1; }
  if ! pg -1 -f "$DESF/f_$nn.sql" >"$LOG/ultima.log" 2>&1; then echo "FALHOU desfazer f_$nn"; cat "$LOG/ultima.log"; exit 1; fi
done
pgv -f "$AQUI/retrato.sql" >"$LOG/retrato_depois.txt"
if diff "$LOG/retrato_antes.txt" "$LOG/retrato_depois.txt" >"$LOG/retrato_diff.txt"; then
  echo "6. desfeitas as $nf f_NN (da última pra primeira): estrutura IGUAL à de antes ($(wc -l <"$LOG/retrato_antes.txt") itens conferidos); testes:"
else
  echo "6. FALHOU: depois do desfazer a estrutura ficou diferente:"; cat "$LOG/retrato_diff.txt"; exit 1
fi
confere "desfeito"

# ---------- 7. aplicar de novo ----------
for f in $FS; do aplicar "$f"; done
echo "7. f_NN aplicadas de novo; testes:"
confere "de novo"

echo
echo "PLACAR FINAL (banco de teste local, tudo do zero)"
placar | awk -F'|' '{ printf "  %-22s %4s de %4s ok  %s\n", $1, $3, $2, ($2==$3 ? "TUDO OK" : "FALHOU") }'
