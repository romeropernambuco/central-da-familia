# Proposta B · Escritório em primeiro

## Conceito

O escritório da família é o primeiro lugar onde se entende o dia.\
Cada sala aproxima o trabalho da equipe dos números que ajudam a decidir.\
A folha **Precisa de você** concentra o que depende de uma ação da família.

## Ordem de leitura

- **Em 2 segundos.** o título, o recado da faixa de saúde e a ação **Ver tarefas**. Na cena, o maior número responde quanto pode gastar hoje.
- **Em 5 segundos.** no desktop, a pessoa cruza as quatro salas com a fila ao lado. No celular, vê a maquete e o que falta por mês para o Plano 2029, com acesso direto à fila pelo mesmo botão.
- **Depois.** as pílulas destacam a sala e mostram os estados dos funcionários na legenda. O painel apresenta até três tarefas, ordenadas por risco, operação e lembrete. A fileira rolável dá acesso ao Plano 2029, aos gastos do mês, aos imóveis e aos desejos.

## Tipografia e cor

**Geist Variable para títulos e números, Inter Variable para texto.** A dupla preserva o desenho compacto da referência Linear, com hierarquia pelo espaçamento e boa leitura nos rótulos pequenos.

- **Escala.** Rótulos 12 px / 650 / 1,5, texto funcional 14 px / 400–550 / 1,5, texto corrido 16 px / 400 / 1,5, subtítulos 20 px / 600 / 1,2, H1 de 32 px no celular e 40 px no desktop / 600 / 1,08. Valores de 35 e 27 px / 600 / 1,12, com números tabulares, sem quebra e símbolo percentual a 65%.
- **Claro.** Fundo e cena #F5F5F3, painel #FFFFFF, menu #EFEFED, texto #19191B e texto secundário #56545B. Borda #77747E, violeta #5145A8, texto do botão #FFFFFF, risco #A1302E.
- **Escuro.** Fundo #0C0C0B, painel #131312, menu #1A1918, cena #151514, texto #F2F1F3 e texto secundário #B4B1BA. Borda #89858E, violeta #B4A8FA, texto do botão #161127, risco #FFA6A0.
- **Acabamento.** Violeta é o único destaque, concentrado no botão, na seleção e no foco. Vermelho serve a dinheiro em risco. As divisórias, o piso e a parede usam misturas em OKLCH. As sombras ficam no claro, com raios de 12, 8 e 6 px. Da Stripe vêm a disciplina dos algarismos tabulares e as legendas de estimativas.

## Dobra e escritório

O medidor da casca, em Chromium, contou **4 no celular (375 × 812)** e **7 no desktop (1280 × 800)** em claro e escuro, com o exemplo de 17/11/2026 pela manhã no Recife. São quatro valores da cena e, no desktop, os três valores das tarefas. A cobertura percentual do Plano fica na fileira abaixo da dobra. O valor do Plano na cena é o oficial mensal com margem.

A maquete compartilhada ocupa a maior superfície. As plaquinhas identificam oito postos com nome curto e ícone de estado. As pílulas destacam visualmente uma sala e abrem uma legenda legível com os estados dessa equipe. Os quatro chips fazem parte do mesmo quadro e ficam em volta do desenho no desktop. No celular, o orçamento fica acima da maquete e os demais valores ficam logo abaixo. Avatares Lucide de 32 px ligam as tarefas aos papéis da equipe.

O Início anterior dava peso parecido a dezenas de leituras simultâneas. Aqui a equipe, o orçamento de hoje e a fila dão a ordem de leitura. As demais áreas ganham atalhos curtos, o exemplo recebe um selo e os blocos sem informação dizem **Ainda sem dado**. A visão do Assessor da Casa tem apenas tarefas domésticas de uma lista de tipos permitidos.

## Autoavaliação

1. **Hierarquia em dois segundos — 9/10.** Título, recado e orçamento têm pesos distintos. No celular, o painel de tarefas exige rolar ou tocar no botão.
2. **Números acima da dobra — 9/10.** Quatro de cinco no celular e sete de oito no desktop no snapshot medido. A quantidade de tarefas com valores depende do dia.
3. **Ritmo e espaçamento — 8/10.** A moldura reúne mapa e chips, com fila e cartões em superfícies próprias. O corpo da fila pode ficar bem mais curto que a maquete.
4. **Tipografia — 9/10.** H1, rótulos, numerais primários e secundários têm escala e pesos definidos. Os rótulos SVG continuam mais compactos no celular.
5. **Ícones e ilustrações — 8/10.** Lucide nas salas, na prioridade e nos funcionários, com SVG do projeto para estados vazios. Avatares representam funções, sem retratos individuais.
6. **Organização por tarefa — 8/10.** A faixa leva à fila, o orçamento orienta gastos e a lacuna mensal informa o Plano. A resolução da tarefa acontece na ficha do app.
7. **Acessibilidade — 8/10.** Contraste dos tokens calculado, alvos medidos, um H1, SVG decorativo fora da árvore e indicação textual da prioridade. Falta validar com leitor de tela em uso prolongado.
8. **Privacidade — 9/10.** O olho remove valores e percentuais da marcação, inclusive identificadores de destino das tarefas e texto livre. O assunto fica menos específico enquanto o olho está fechado.
9. **Temas — 9/10.** A hierarquia e os alvos se mantêm nos dois modos. As bordas no escuro são discretas e a seleção depende do foco em violeta e do estado pressionado.
10. **Escritório como personagem — 9/10.** O mapa orienta a exploração por sala e a fila mantém vínculo com os funcionários. A maquete SVG tem oito postos e estados estáticos.

## Produtização

- **Indicadores da cena.** Adaptar os campos de `useResumoFamilia` ao contrato de apresentação, preservando unidade, natureza e disponibilidade. Em `lib/resumo`, usar `orcamento` para o disponível de hoje, `plano2029` para a lacuna com margem, `faturas` para a soma prevista e `guardado` para o total das aplicações.
- **Equipe.** Integrar `EscritorioIsometrico` da f38 na superfície Início, usando `useEquipeCompleta` e os estados de presença do escritório. Ligar a sala selecionada à câmera e às fichas. Manter a maquete SVG como apresentação estática quando a cena 3D estiver indisponível.
- **Fila e faixa de saúde.** Usar `useResumoFamilia` para a leitura resumida de pendências e `api.escritorioHoje` ou o motor de tarefas atual para prioridade, respostas e invalidação após resolver. Os links do laboratório já levam a `escritorio?secao=tarefa&entidade=…` no exemplo. Para o Assessor, usar a consulta do próprio papel e o destino Casa.
- **Fileira.** Mapear cobertura em `lib/resumo/plano2029` para Planejamento / `plano2029`, saídas em `movimentacao` para Lançamentos / `mes`, aluguel líquido estimado em `imoveis` para Guardado / `imoveis`, e combinados em `desejos` para Desejos / `desejo`. Usar `enderecoDestino` e as permissões de `app/rotas` no aplicativo.
- **Lacunas do contrato.** A família precisa de um assunto público por tarefa para o olho fechado e de público, seção e valor aplicável explícitos por tipo de tarefa. A proposta usa o nível recebido para texto genérico no modo privado e identifica os tipos domésticos pelo prefixo do ID. Em produção, derivar essas propriedades na origem evita depender dessa convenção. Ligar o olho ao contexto de privacidade do aplicativo.
