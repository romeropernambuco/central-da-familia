# Dezembro a janeiro: teto 100 reajusta 10% em janeiro

Valores inventados em centavos: S0=100000; renda=0; gasto=10000; início=2026-12.

S(n)=S0−Σ arred(G0(1+IPCA)^J(k)); J(k) é o número de janeiros desde hoje. Dezembro 100, janeiro 110.

Passos: 1. Rendimento na abertura positiva. 2. Arredondar rendimento meio para cima ao centavo. 3. Entradas e saídas no fim. A solução fechada sem arredondamento é conferida separadamente com limite de propagação de meio centavo por mês, capitalizado.

- 2026-12, 31 dias: rendimento 0 + fluxo -10000; saldo 90000 centavos. Fórmula fechada: 90000.00000000000000000000000000000000000 centavos.
- 2027-01, 31 dias: rendimento 0 + fluxo -11000; saldo 79000 centavos. Fórmula fechada: 79000.00000000000000000000000000000000000 centavos.

Esperado final: **79000 centavos**.
