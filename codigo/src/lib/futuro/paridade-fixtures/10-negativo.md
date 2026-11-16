# Saldo negativo sem custo de dívida por 3 meses

Valores inventados em centavos: S0=-10000; renda=0; gasto=0; início=2026-10.

S(n)=S0[1+a(1−IR)]^(Σdias/365), sem fluxos. IR é desconto na taxa anual: convenção explícita de projeção; não apuração tributária no resgate.

Passos: 1. Rendimento na abertura positiva. 2. Arredondar rendimento meio para cima ao centavo. 3. Entradas e saídas no fim. A solução fechada sem arredondamento é conferida separadamente com limite de propagação de meio centavo por mês, capitalizado.

- 2026-10, 31 dias: rendimento 0 + fluxo 0; saldo -10000 centavos. Fórmula fechada: -10000.00000000000000000000000000000000000 centavos.
- 2026-11, 30 dias: rendimento 0 + fluxo 0; saldo -10000 centavos. Fórmula fechada: -10000.00000000000000000000000000000000000 centavos.
- 2026-12, 31 dias: rendimento 0 + fluxo 0; saldo -10000 centavos. Fórmula fechada: -10000.00000000000000000000000000000000000 centavos.

Esperado final: **-10000 centavos**.
