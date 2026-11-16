# Parcela única 200 e 13º pago 100 em dezembro

Valores inventados em centavos: S0=100000; renda=0; gasto=0; início=2026-10.

S(n)=S0(1+i)^n+(R−G)((1+i)^n−1)/i. Se i=0: S0+n(R−G)+Σeventos.

Passos: 1. Rendimento na abertura positiva. 2. Arredondar rendimento meio para cima ao centavo. 3. Entradas e saídas no fim. A solução fechada sem arredondamento é conferida separadamente com limite de propagação de meio centavo por mês, capitalizado.

- 2026-10, 31 dias: rendimento 0 + fluxo 0; saldo 100000 centavos. Fórmula fechada: 100000.00000000000000000000000000000000000 centavos.
- 2026-11, 30 dias: rendimento 0 + fluxo -20000; saldo 80000 centavos. Fórmula fechada: 80000.00000000000000000000000000000000000 centavos.
- 2026-12, 31 dias: rendimento 0 + fluxo -10000; saldo 70000 centavos. Fórmula fechada: 70000.00000000000000000000000000000000000 centavos.

Esperado final: **70000 centavos**.
Outubro 1.000; novembro 800; dezembro 700. Testa compromisso explícito fora do envelope. A API trata parcela dentro do envelope; a geração do 13º pela folha tem prova separada.
