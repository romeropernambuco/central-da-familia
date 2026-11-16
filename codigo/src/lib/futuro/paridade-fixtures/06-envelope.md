# Envelope 300 contém parcela 100: desconta só 300

Valores inventados em centavos: S0=100000; renda=0; gasto=30000; início=2026-10.

S(n)=S0(1+i)^n+(R−G)((1+i)^n−1)/i. Se i=0: S0+n(R−G)+Σeventos.

Passos: 1. Rendimento na abertura positiva. 2. Arredondar rendimento meio para cima ao centavo. 3. Entradas e saídas no fim. A solução fechada sem arredondamento é conferida separadamente com limite de propagação de meio centavo por mês, capitalizado.

- 2026-10, 31 dias: rendimento 0 + fluxo -30000; saldo 70000 centavos. Fórmula fechada: 70000.00000000000000000000000000000000000 centavos.
- 2026-11, 30 dias: rendimento 0 + fluxo -30000; saldo 40000 centavos. Fórmula fechada: 40000.00000000000000000000000000000000000 centavos.
- 2026-12, 31 dias: rendimento 0 + fluxo -30000; saldo 10000 centavos. Fórmula fechada: 10000.00000000000000000000000000000000000 centavos.

Esperado final: **10000 centavos**.
API em separado: parcela 100 já no envelope 300 não gera compromisso. Primeiro saldo 700; piso do motor direto 600.
