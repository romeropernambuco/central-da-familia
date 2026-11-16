# Renda 300, gasto 200, sem juros

Valores inventados em centavos: S0=100000; renda=30000; gasto=20000; início=2026-10.

S(n)=S0(1+i)^n+(R−G)((1+i)^n−1)/i. Se i=0: S0+n(R−G)+Σeventos.

Passos: 1. Rendimento na abertura positiva. 2. Arredondar rendimento meio para cima ao centavo. 3. Entradas e saídas no fim. A solução fechada sem arredondamento é conferida separadamente com limite de propagação de meio centavo por mês, capitalizado.

- 2026-10, 31 dias: rendimento 0 + fluxo 10000; saldo 110000 centavos. Fórmula fechada: 110000.00000000000000000000000000000000000 centavos.
- 2026-11, 30 dias: rendimento 0 + fluxo 10000; saldo 120000 centavos. Fórmula fechada: 120000.00000000000000000000000000000000000 centavos.
- 2026-12, 31 dias: rendimento 0 + fluxo 10000; saldo 130000 centavos. Fórmula fechada: 130000.00000000000000000000000000000000000 centavos.
- 2027-01, 31 dias: rendimento 0 + fluxo 10000; saldo 140000 centavos. Fórmula fechada: 140000.00000000000000000000000000000000000 centavos.
- 2027-02, 28 dias: rendimento 0 + fluxo 10000; saldo 150000 centavos. Fórmula fechada: 150000.00000000000000000000000000000000000 centavos.
- 2027-03, 31 dias: rendimento 0 + fluxo 10000; saldo 160000 centavos. Fórmula fechada: 160000.00000000000000000000000000000000000 centavos.
- 2027-04, 30 dias: rendimento 0 + fluxo 10000; saldo 170000 centavos. Fórmula fechada: 170000.00000000000000000000000000000000000 centavos.
- 2027-05, 31 dias: rendimento 0 + fluxo 10000; saldo 180000 centavos. Fórmula fechada: 180000.00000000000000000000000000000000000 centavos.
- 2027-06, 30 dias: rendimento 0 + fluxo 10000; saldo 190000 centavos. Fórmula fechada: 190000.00000000000000000000000000000000000 centavos.
- 2027-07, 31 dias: rendimento 0 + fluxo 10000; saldo 200000 centavos. Fórmula fechada: 200000.00000000000000000000000000000000000 centavos.
- 2027-08, 31 dias: rendimento 0 + fluxo 10000; saldo 210000 centavos. Fórmula fechada: 210000.00000000000000000000000000000000000 centavos.
- 2027-09, 30 dias: rendimento 0 + fluxo 10000; saldo 220000 centavos. Fórmula fechada: 220000.00000000000000000000000000000000000 centavos.

Esperado final: **220000 centavos**.
