# Aplicação isenta 10% vence em novembro; caixa sem rendimento depois

Valores inventados em centavos: S0=100000; renda=0; gasto=0; início=2026-10.

S(n)=S0[1+a(1−IR)]^(Σdias/365), sem fluxos. IR é desconto na taxa anual: convenção explícita de projeção; não apuração tributária no resgate. Depois do vencimento fator=0. O resgate transfere para caixa, não cria receita.

Passos: 1. Rendimento na abertura positiva. 2. Arredondar rendimento meio para cima ao centavo. 3. Entradas e saídas no fim. A solução fechada sem arredondamento é conferida separadamente com limite de propagação de meio centavo por mês, capitalizado.

- 2026-10, 31 dias: rendimento 813 + fluxo 0; saldo 100813 centavos. Fórmula fechada: 100812.76889668539736422116527663158790294 centavos.
- 2026-11, 30 dias: rendimento 793 + fluxo 0; saldo 101606 centavos. Fórmula fechada: 101605.60862122089127733490353471807175851 centavos.
- 2026-12, 31 dias: rendimento 0 + fluxo 0; saldo 101606 centavos. Fórmula fechada: 101605.60862122089127733490353471807175851 centavos.

Esperado final: **101606 centavos**.
