# 17 meses a 10% anual, meses com 28/29/30/31 dias

Valores inventados em centavos: S0=100000; renda=0; gasto=0; início=2026-10.

S(n)=S0[1+a(1−IR)]^(Σdias/365), sem fluxos. IR é desconto na taxa anual: convenção explícita de projeção; não apuração tributária no resgate.

Passos: 1. Rendimento na abertura positiva. 2. Arredondar rendimento meio para cima ao centavo. 3. Entradas e saídas no fim. A solução fechada sem arredondamento é conferida separadamente com limite de propagação de meio centavo por mês, capitalizado.

- 2026-10, 31 dias: rendimento 813 + fluxo 0; saldo 100813 centavos. Fórmula fechada: 100812.76889668539736422116527663158790294 centavos.
- 2026-11, 30 dias: rendimento 793 + fluxo 0; saldo 101606 centavos. Fórmula fechada: 101605.60862122089127733490353471807175851 centavos.
- 2026-12, 31 dias: rendimento 826 + fluxo 0; saldo 102432 centavos. Fórmula fechada: 102431.42740538207130048177978721235587685 centavos.
- 2027-01, 31 dias: rendimento 833 + fluxo 0; saldo 103265 centavos. Fórmula fechada: 103263.95818776389890954324345207093293000 centavos.
- 2027-02, 28 dias: rendimento 758 + fluxo 0; saldo 104023 centavos. Fórmula fechada: 104021.73594875214420770026993178552351709 centavos.
- 2027-03, 31 dias: rendimento 845 + fluxo 0; saldo 104868 centavos. Fórmula fechada: 104867.19226433581437236337091006021060378 centavos.
- 2027-04, 30 dias: rendimento 825 + fluxo 0; saldo 105693 centavos. Fórmula fechada: 105691.91790908893971826459675912328342891 centavos.
- 2027-05, 31 dias: rendimento 859 + fluxo 0; saldo 106552 centavos. Fórmula fechada: 106550.94894416427779681453476442666344216 centavos.
- 2027-06, 30 dias: rendimento 838 + fluxo 0; saldo 107390 centavos. Fórmula fechada: 107388.91645497097890444769046327694992153 centavos.
- 2027-07, 31 dias: rendimento 873 + fluxo 0; saldo 108263 centavos. Fórmula fechada: 108261.74016640444966965780318247820520866 centavos.
- 2027-08, 31 dias: rendimento 880 + fluxo 0; saldo 109143 centavos. Fórmula fechada: 109141.65791748734679169325924512202678821 centavos.
- 2027-09, 30 dias: rendimento 858 + fluxo 0; saldo 110001 centavos. Fórmula fechada: 110000.00000000000000000000000000000000000 centavos.
- 2027-10, 31 dias: rendimento 894 + fluxo 0; saldo 110895 centavos. Fórmula fechada: 110894.04578635393710064328180429474669324 centavos.
- 2027-11, 30 dias: rendimento 872 + fluxo 0; saldo 111767 centavos. Fórmula fechada: 111766.16948334298040506839388818987893436 centavos.
- 2027-12, 31 dias: rendimento 908 + fluxo 0; saldo 112675 centavos. Fórmula fechada: 112674.57014592027843052995776593359146454 centavos.
- 2028-01, 31 dias: rendimento 916 + fluxo 0; saldo 113591 centavos. Fórmula fechada: 113590.35400654028880049756779727802622300 centavos.
- 2028-02, 29 dias: rendimento 863 + fluxo 0; saldo 114454 centavos. Fórmula fechada: 114453.79224881514781143999320114763341248 centavos.

Esperado final: **114454 centavos**.
