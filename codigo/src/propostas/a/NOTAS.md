# Proposta A · Painel Calmo · versão 2

O Início reúne duas decisões na primeira leitura. **Hoje você pode gastar** orienta o dia. **Plano 2029** mostra a diferença mensal com margem e a cobertura estimada, em uma superfície de destaque própria. Aplicações, Faturas e Recebimentos vêm logo abaixo. O escritório ocupa uma faixa inteira, com a equipe em cena e a fila ao lado no desktop.

## Crítica da versão 1 e correções

1. **O escritório parecia um acessório.** Ganhou a largura da seção. O SVG mede 325 px no celular e 568 px no desktop do laboratório.
2. **Dois funcionários resumiam uma equipe inteira.** A maquete exibe oito postos com pessoas à mesa e plaquinhas de nome e estado. **Equipe e estados** abre os nomes e estados por extenso, priorizando quem precisa da família.
3. **A maquete e a fila competiam por atenção em blocos separados.** A fila fica ao lado da cena no desktop e logo abaixo dela no celular. **Ver fila** rola a prévia e leva o foco à seção de tarefas.
4. **Os balões tinham pouco propósito.** **Total investido** abre o balão do Guardado sob demanda. A leitura padrão fica livre de valores adicionais.
5. **O traço do mês deixava o valor final em aberto.** A legenda nomeia e formata o total acumulado à vista. No celular, **Ver valores** abre a leitura exata.
6. **O limite era difícil de interpretar.** A linha tracejada representa o limite do envelope na mesma escala do acumulado. Quando o limite está indisponível, a leitura à vista continua e a legenda informa a ausência.
7. **O Plano 2029 parecia intercambiável com os outros cartões.** Passou para a primeira faixa, com 36 px, fundo próprio, valor oficial com margem e régua de cobertura.
8. **O grupo de dinheiro aparecia tarde no celular.** A grade deu lugar a três linhas de leitura com indicador à esquerda e valor à direita. O atalho do orçamento e o controle do gráfico passaram para as linhas que já tinham espaço.
9. **Aplicações se confundia com um saldo.** O rótulo identifica o rendimento líquido realizado hoje e o minigráfico mostra o histórico diário.
10. **Faturas dizia quanto, com pouco contexto de quando.** Mostra a próxima data informada e sinaliza a conferência pendente.
11. **Recebimentos repetia a linguagem visual do Plano.** Um anel indica a parcela garantida do previsto, com descrição acessível e tratamento para previsão vazia.
12. **A cena escura perdia profundidade.** Piso, parede e mesa se separam por luminosidade. Fundo, cartão e menu usam as três camadas do briefing, com sombra reservada ao claro.
13. **O percentual herdava o espaçamento dos rótulos.** O símbolo voltou a ficar colado ao valor, em corpo menor. Valores principais e secundários seguem em Geist, 36 e 27 px, tabulares e sem quebra. Os controles e rótulos usam Inter.
14. **A nova geometria e os balões ampliavam a superfície de privacidade.** O olho fechado desmonta os traços, a linha de limite, a barra, o anel, as legendas numéricas e o balão. A fila usa texto seguro quando fechada. O Assessor da Casa recebe apenas tarefas de casa autorizadas e seus respectivos rótulos.

## Medição da primeira dobra

O medidor da casca contou **5 ocorrências em 375 × 812** e **8 em 1280 × 800**, tanto no claro quanto no escuro. A v1 registrava 3 e 5. No celular entram o valor de hoje e os quatro cartões. O desktop acrescenta os dois valores do ritmo e o percentual do Plano. O celular guarda os dois valores do ritmo no detalhe e oferece o percentual do Plano na descrição acessível da barra. O olho fechado zera a contagem.

O escritório começa logo após o resumo financeiro. No celular é preciso rolar para ver a cena inteira. No desktop, o título, a fila e parte da maquete já entram na primeira dobra. Em Chromium, as quatro prévias ficaram sem rolagem horizontal e todos os controles medidos na Proposta A tiveram pelo menos 44 × 44 px. Também foram conferidos o foco de **Ver fila**, a abertura do balão e a remoção da geometria financeira com o olho fechado.

## Autoavaliação do briefing · v1 → v2

As notas da v1 foram recalibradas nesta revisão com base no código anterior, nas medidas já registradas e na crítica do dono.

1. **Hierarquia em dois segundos · 7 → 9.** Hoje e Plano têm a mesma escala numérica, com a cor de superfície reservada ao Plano. A faixa de saúde ainda vem antes da decisão.
2. **Números acima da dobra · 8 → 9.** Os dois tamanhos cumprem o orçamento no estado inicial, com ocorrências distintas no exemplo. Expandir o ritmo redistribui o espaço no celular.
3. **Ritmo e espaçamento · 6 → 8.** Duas decisões no topo, três resumos curtos e uma faixa de escritório. A escala tem mais respiro no desktop.
4. **Tipografia · 8 → 9.** A separação de títulos, valores e legendas se mantém nos quatro contextos. O status das plaquinhas em SVG ainda depende da leitura do ícone ou da lista textual no celular.
5. **Ícones e ilustrações · 7 → 8.** Lucide marca os destinos e estados. A cena compartilhada mostra pessoas, mesas e salas. A diferenciação visual dos funcionários ainda é limitada.
6. **Organização por tarefa · 7 → 9.** Hoje, Plano e fila têm caminhos próprios. Para agir numa tarefa individual ainda é preciso abrir a fila completa.
7. **Acessibilidade · 8 → 9.** O salto da fila recebe foco. Os testes calculam contraste dos pares de tokens e a prévia confirma o tamanho dos alvos. Os gráficos têm rótulos e resumos, com o histórico diário completo nas telas de detalhe.
8. **Privacidade · 8 → 9.** A máscara cobre HTML, escala dos indicadores, balão, legendas e texto livre. Para manter a fila mais informativa com o olho fechado, o produto precisa de texto público estruturado.
9. **Temas claro e escuro · 8 → 9.** A prévia de 1280 px foi conferida nos dois temas. Os planos da cena e os estados de navegação permanecem distinguíveis.
10. **Escritório como personagem · 4 → 8.** A equipe ganhou uma superfície de trabalho e uma relação direta com a fila. A representação atual tem oito pessoas em cena, detalhes menores no celular e um recorte simplificado da referência 3D.

## Como produtizar

- **Orçamento e ritmo.** Ligar `useResumoFamilia` a `resumo.podeGastarHoje` e `lib/resumo/porDia`, preservando unidade, estado e envelope selecionado. Manter a distinção entre série à vista e limite do envelope. Para comparar o orçamento completo, integrar uma série histórica que inclua parcelas na data de competência. Destino `orcamento?secao=orcamento`.
- **Plano 2029.** Usar `resumo.plano2029` e o cenário oficial garantido. Exibir `faltamPorMesComMargem` em centavos convertidos para reais e `progressao` como percentual. Saturar apenas o desenho da barra. Destino `planejamento?secao=plano2029`.
- **Aplicações, faturas e recebimentos.** Usar `resumo.aplicacoes` e `guardadoHoje.por_dia_30`, `resumo.faturas` e `lib/resumo/faturas`, e `recebimentosDoMes` de `lib/resumo/recebimentos`. Destinos `guardado?secao=aplicacoes`, `cartoes` e `planejamento?secao=recebimentos`. Se houver aluguel, usar `resumo.imoveis` com o rótulo **Aluguel líquido estimado**.
- **Escritório e fila.** Ligar `escritorioHoje` e `useEquipeCompleta` à equipe e à fila autorizada. A tela reserva o espaço de `media` e `grande` e passa a variante à maquete. Nesta revisão, o SVG compartilhado ainda usa a geometria única, dimensionada pelo painel local. A frente compartilhada pode ativar as variantes sem reorganizar a faixa. Manter os balões no contexto do olho e ligar cada tarefa a seu destino.
- **Papel e privacidade.** Aplicar autorização no servidor e nos hooks antes de montar a tela. Ligar o olho à preferência real e estruturar a fila por escopo, texto público, detalhe privado, prazo e destino. Reservar o selo **Exemplo** ao ambiente de demonstração.

## Verificação da entrega

- TypeScript sem erros e 22 testes da Proposta A aprovados. Os testes cobrem os quatro contextos, presença da equipe, hierarquia e escala do Plano, acumulado e limite do ritmo, quatro indicadores distintos, privacidade, papéis, estados vazios, alvos e contraste.
- Para contornar o bloqueio de leitura da configuração pelo esbuild, o Vitest carregou a configuração existente via Node e executou sem gravar cache.
- A suíte completa repetiu três falhas fora da A. A confirmação de valor no teste de rascunho e a leitura aberta da sentinela no teste de privacidade da Proposta B falharam em asserções. No teste de isolamento do laboratório, o esbuild recebeu acesso negado ao carregar `vite.config.ts`. A reexecução também apresentou oscilações de privacidade global, cujo arquivo passou os 23 testes na execução isolada.
- O Git bloqueou `git add codigo` ao tentar criar `index.lock`. Os quatro arquivos da revisão ficaram na worktree.
