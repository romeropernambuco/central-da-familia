# Simulações da vida real: o que pega a família desprevenida (22/11/2026)

Ideia do dono: "a pior coisa é ser pego desprevenido; imagina ter que construir algo no sistema durante um problema".
Quatro agentes seguiram famílias inventadas no tempo, lendo o código de verdade: um inquilino que para de pagar
(18 meses), empresas e créditos (12 meses), dez anos de família e um ano de imprevistos.

## O que este documento conclui

1. **Construído e no ar: "Não me pagou".** No caderno do aluguel, a família registra a providência (cobrando,
   acordo, advogado, despejo, vazio, reforma), desde quando está sem receber, até quando acha que fica assim, quem cuida
   do caso, quanto o inquilino deve e de quanto em quanto tempo lembrar. A partir daí:
   - o caderno mostra "sem receber: com o advogado" em vez de "atrasado" todo mês;
   - o plano de 2029 e o "aluguel líquido estimado" do Início param de contar com esse aluguel até a volta
     (no exemplo: o plano foi de "faltam R$ 16.102" para "faltam R$ 18.040");
   - o celular para de avisar o atraso desse imóvel e passa a avisar "você tem um lembrete para hoje";
   - a Secretária cria o lembrete "Cobrar Dra. Paula sobre o processo do imóvel Sala", toda semana ou todo mês;
   - dá para anotar o andamento (notificação, audiência, acordo) e marcar "voltou a pagar".
2. **Consertado (decisão do dono, 22/11): o salário entra na conta até a virada.** Antes o motor tirava os limites todo
   mês do dinheiro guardado e não punha a renda; quem ganha mais do que gasta aparecia "abaixo do piso". Agora cada
   renda de Planejamento → Rendas entra todo mês até dez/2028 (a que muda, pelo mês fraco; extra fica de fora) e a sobra
   vai para o guardado. De 2029 em diante a família vive do que rende. Marina (R$ 5.000 de salário, R$ 4.500 de gasto,
   R$ 100 mil): o alerta "em 09/2028 o caixa fica abaixo do piso" sumiu e "você está aqui" foi de 0,9% para 7,7%.
   Família Silva: "faltam por mês" foi de R$ 16.102 para R$ 14.740.
3. **Contas do ano (IPTU, IPVA, matrícula, seguro) não existem em lugar nenhum.** Nada avisa antes de janeiro.
4. **Dívidas fixas (empréstimo com parcela) não têm cadastro.** O motor já sabe descontar dívida, mas ninguém manda.
5. **Retirada de empresa que falha ou varia, e dinheiro que sai do bolso para a empresa, ficam soltos** do Guardado e
   do plano. Dinheiro na rua não tem "não vai voltar" (calote).
6. **O ano "2029" está escrito direto em dezenas de lugares**; depois de jan/2029 várias telas perdem o sentido, e a
   janela das contas vai só até dez/2031.

## Por cenário (o essencial de cada agente)

**Inquilino que para de pagar (18 meses)** — resolvido nesta rodada (item 1). Falta: "chegou" com valor diferente
do combinado (pagamento parcial ou acordo) e os 10% do advogado sobre o que recuperar.

**Empresas e créditos (12 meses)**
- Retirada que falha: o plano empurra o mês que não veio para o seguinte e continua contando.
- "Tirei R$ 15 mil do bolso para a ração": "Tirar dinheiro" do Guardado não tem motivo nem destino; não liga à empresa.
- Recebimento parcial: "chegou" menor que o previsto encerra tudo, e o resto some calado.
- Empréstimo esquecido: nada detecta; fora do plano, R$ 14.400 por ano.

**Dez anos**
- Salário fora da conta (item 2); gasto do mês não é datado e perde inflação com o tempo.
- Faculdade e carro depois de 2029 aparecem como "Cabe" porque desejo depois da virada fica fora da linha.
- LCA que vence fica parada sem render na conta.
- Ano da meta fixo em 2029; taxas só até 2028; janela até 2031.

**Um ano de imprevistos**
- Antes: só fatura (3 dias e véspera), anuidade e aplicação vencendo. Depois: estouro, fatura maior, conta grande.
- 13º da família não tem lugar (a tela proíbe); IPTU/IPVA nada avisa.
- Queda de renda: o app só percebe se alguém editar a renda; não diz por quantos meses a reserva e o guardado cobrem.
- Os botões "Cobrir com a sobra da Casa" e "Foi imprevisto" só existem no modo exemplo.

## O que fazer, do que mais pega desprevenido ao que menos

1. (feito em 22/11: salário na conta até a virada)
2. Contas do ano: valor e "avisar N dias antes" nos lembretes que repetem todo ano, e o motor contar com elas.
3. Dívidas e parcelas fixas: cadastro simples, ligado ao motor (que já sabe descontar).
4. Retirada de empresa: botão "não veio este mês" e um aviso por mês vencido; "chegou menos" pergunta se o resto vem.
5. Fôlego: "com a renda de hoje, a reserva e o guardado cobrem N meses", no Planejamento.
6. Dinheiro na rua: "não vai voltar" (calote) com motivo; aporte na empresa tirando do Guardado.
7. Ano da meta escolhido pela família (tira o 2029 fixo).

## Respostas do dono (22/11) e o que já foi feito

- **Dívida do inquilino:** o que o advogado recuperar entra como dinheiro do mês; honorários são despesa do imóvel.
  Feito: botão "Recebi da dívida" no caso do aluguel (lib/aluguel.ts `receberDaDivida`).
- **Separação:** salário e aluguel pagam o mês, o guardado rende o lucro, a gordura não se come. Dinheiro posto na
  empresa sai do salário (é gasto anotado), nunca da gordura, salvo retorno muito sólido. Feito: "dá para gastar até R$ X
  sem tocar na gordura; ainda dá / no limite / passou" no Guardado e em Gastos e entradas (lib/separacao.ts).
- **Família sem meta:** o sistema identifica sozinho quando daria para viver do que rende, mantendo a sobra de hoje.
  Feito no Rumo a 2029 (lib/viverDeRenda.ts).
- **Empresas:** pró-labore ainda não definido; a usina e o empréstimo que a empresa paga entram como recebimento mensal.
- **A causa do aluguel:** o app monta o pedido mês a mês (aluguéis, encargos, multa e juros do contrato, honorários de
  10% da Lei 8.245/91, art. 62), diz a regra de cada parte, separa o que é da família do que é do advogado (Lei 8.906/94,
  art. 23), guarda a expectativa e avisa todo mês em que o pedido subiu: "passe o valor novo ao advogado"
  (lib/causaAluguel.ts). Correção monetária fica com o advogado.
- **Viagem:** planejada com antecedência, pacote parcelado no cartão e custos lá num cofrinho mês a mês. Entra no plano;
  o app diz se cabe na sobra sem tocar na gordura, quanto a família precisa ganhar a mais por mês se não cabe, e se à
  vista com desconto compensa mais do que parcelar deixando o dinheiro render (lib/viagem.ts, aba Desejos).

## Especialistas (22/11, rodada 2)

- **Direito de locação:** corrigidas 5 frases da causa (art. 23, I e CPC 323 para os aluguéis até as chaves; encargos só
  pelo contrato; juros pela Lei 14.905/2024 com a taxa legal quando o contrato não fala; multa sem o limite de 2% do CDC;
  o que se paga ao próprio advogado em regra não volta). Novos: garantia (fiador na ação, Súmula 268), prazo de 3 anos
  (CC 206, §3º, I) e custas adiantadas que voltam para a família.
- **Viagem:** guia item por item com estimativas pesquisadas (Google Flights e Hotéis para maio e julho/2027, PTAX de
  19/11/2026), IOF de 3,5% (Decreto 12.499/2025) e spread, criança e bebê, taxa de turismo de Lisboa, seguro Schengen,
  ETIAS, alta temporada. Itens sem fonte aparecem como "estimativa sem fonte: edite" (lib/guiaViagemPadroes.ts).
- **Simulador de 3 famílias:** consertados nesta rodada: compra parcelada contava inteira no mês; "Comprei" tirava a
  viagem do plano; cofrinho crescia sozinho; "Voltou a pagar" apagava o caso; o salário de um em Recebimentos tirava as
  Rendas do casal; renda variável sem mês fraco valia zero; dívida recuperada sem separar bruto e repasse.
- **Ainda abertos (do simulador):** lucro da gordura sem tirar a inflação (decisão do dono); cofrinho como pote de
  verdade no Guardado; data de saída do inquilino; contas do ano, IR do aluguel, seguros e vencimentos; empresa como
  patrimônio; ajuda ao filho; reserva de emergência separada da gordura; o plano começa no mês que vem com o saldo de hoje.

## O salário da gordura (22/11, especialistas e mentores)

Pergunta do dono: "Do que rende, metade vira salário e metade fica guardada, encarada como a inflação. Estou errado?"
Três agentes: planejador financeiro (números de hoje), mentor de famílias ricas (Yale, Harvard, guardrails, family
office) e simulador (CDI e IPCA do Banco Central, jan/2000 a out/2026, janelas de 20 anos, IR de 15%).

- **Hoje a metade e "o que passa da inflação" quase empatam.** Selic 13,75%, IPCA esperado 5% (Focus 13/11/2026):
  R$ 1 milhão rende ~R$ 9.190 por mês líquidos; a inflação come ~R$ 4.070; metade = R$ 4.595; acima da inflação =
  ~R$ 5.100. Descontar a inflação não empobrece ninguém: hoje dá até mais que a metade.
- **A metade sozinha falha com juro baixo.** Ela só protege enquanto o CDI for ~2,4 vezes a inflação. Na história
  (2000-2026) a metade pura deixou o guardado com 75% a 84% do valor real em 20 anos; em 2020 o salário foi R$ 806 por
  mês por milhão. Gastar tudo deixou ~30%.
- **Feito: a metade com piso da inflação** (lib/salarioDaGordura.ts, Guardado). Metade do que rende é o salário da
  gordura; a metade que fica nunca é menor que a inflação do mês. Foi a única regra que nunca deixou o guardado perder
  valor na simulação. A separação do mês ("pode gastar") usa esse salário, não o rendimento inteiro.
- **Decisão do dono (22/11, depois):** "eu não tenho regra; deixe a recomendação do mentor e do planejador; se o cara
  quiser mudar, ele muda; embaixo mostre o impacto". Feito e substitui a metade: o salário da gordura é um percentual do
  guardado por ano, fixo por 12 meses e revisto uma vez por ano pelo guardado daquele dia. O recomendado é **3% ao ano**,
  o único que, com CDI e IPCA de 2000 a 2026, nunca deixou o guardado valendo menos em 20 anos (pior caso 99,9%; R$ 2.500
  por mês por milhão no início). A família escolhe de 3% a 6% e vê, para cada um, o salário de hoje e o pior caso em 20
  anos (6% ao ano: 54,8%). O limite de "no máximo 10% por revisão" do mentor foi testado e não mudou nada; ficou de fora.
- **Imóveis:** o salário da gordura sai só do dinheiro aplicado. O imóvel paga a família pelo aluguel, que já entra no
  "pode gastar" do mês; o valor do imóvel acompanha a inflação sozinho, por isso o aluguel líquido não precisa guardar a
  parte da inflação. Em aberto: separar uma reserva de manutenção e vacância do aluguel.
- **Corrigido:** a conta de 22/11 que dizia "R$ 1,5 milhão rende R$ 14,8 mil, mas só R$ 4,9 mil acima da inflação"
  usava a taxa real conservadora do plano (4%). Com as taxas de hoje, acima da inflação são ~R$ 7.600.

## Uma régua só para a gordura (22/11)

- A gordura é o guardado de hoje **em valor de hoje**: a régua cresce com a inflação de cada ano do plano. O plano de
  2029, os desejos, a viagem e o Guardado usam a mesma conta (lib/gordura.ts `reguaDaGordura`). Antes, o plano e a
  viagem achavam que o guardado parado em reais estava "inteiro".
- O "pode gastar" do mês conta o aluguel líquido (sem o imposto), como o plano.
- Textos encurtados pela regra do dono ("claro para a família, sem poluir"): número + uma linha; a conta no "Por quê?".
- Fica para depois: a frase dos desejos "Verificado de 11/2026 até 12/2028" (tem teste antigo).

## O que este documento NÃO resolve

- **Depende do dono:** o ano da meta; o pró-labore das empresas.
- **Não testado num celular de verdade:** o aviso "você tem um lembrete para hoje" (o servidor foi testado no banco).
