# Proposta F · Caixa de entrada

O Início funciona como uma fila de decisões da família. Cada linha tem um remetente, um assunto curto, a prioridade, o valor quando disponível e três ações. **Já fiz** e **Depois** movem a decisão entre pastas e permitem desfazer. **Abrir** mantém a pessoa na fila, explica o próximo passo e dá acesso à tarefa no Escritório. As mudanças de pasta duram enquanto a prévia está aberta.

## Ordem de leitura

- **Em 2 segundos.** “Precisa de você” domina a página. A fila começa por dinheiro em risco, seguido de operação e lembrete. Se há risco, “Revisar prioridade” leva o foco direto à primeira ação da fila.
- **Em 5 segundos.** A faixa superior dá quatro referências. São o limite de hoje, a diferença mensal do Plano 2029 com margem, o total aplicado e as faturas previstas. A decisão no topo traz a pergunta, o responsável e o valor que ajuda a responder.
- **Depois.** A pessoa pode abrir detalhes, trocar de pasta, passar de página, retomar ou desfazer. No desktop, as setas navegam enquanto o foco está na fila. **F**, **D** e **A** acionam Já fiz, Depois e Abrir. **Esc** recolhe o detalhe.

## Sistema visual

Geist Variable a 540 no título e nos valores, Inter Variable a 460 no texto, 540 nos rótulos e 600 nas ações. O H1 usa 52 px no desktop e 38 px no celular, com entrelinha de 0,98 e espaçamento justo. Valores tabulares usam 35 px para o limite de hoje e 27 px para os demais. O símbolo de percentual do componente compartilhado usa 65% do corpo, junto ao número.

A referência editorial aparece nos pesos intermediários, na entrelinha curta, no cinza quente, nas divisórias finas e nas ações de 8 px. O painel de equipe traduz a faixa verde-petróleo em uma superfície de trabalho. Escuro é o tema padrão do componente. Na casca, a proposta acompanha o seletor do laboratório.

- **Escuro.** Fundo `#0c0c0b`, fila `#131312`, controles `#1a1918`, escritório `#15221e`, texto `#f6f3ed` e secundário `#b5b2aa`.
- **Claro.** Fundo `#f7f6f2`, fila branca, controles `#eae8e1`, escritório `#e7efe9`, texto `#292827` e secundário `#595750`. Sombra leve na fila e no escritório.
- **Destaque.** Verde `#b9dcce` no escuro e `#285c4d` no claro. O vermelho semântico é `#ffada5` ou `#962e29` para dinheiro em risco. Operação e Lembrete são diferenciados por texto e ícone. Divisórias usam misturas em OKLCH. Painéis, botões e selo usam raios de 12, 8 e 6 px.

## Medição e escritório

- **375 × 812, claro e escuro.** O medidor da casca encontrou **5** ocorrências na fixture de 17/11/2026 às 11h de Recife. São quatro indicadores e o valor da primeira decisão.
- **1280 × 800, claro e escuro.** O mesmo medidor encontrou **8** ocorrências na fixture. São quatro indicadores e os valores das quatro primeiras decisões. O teste mede a geometria no Chromium com as fontes carregadas e procura repetições entre as ocorrências visíveis.
- **Fila vazia.** A casca fica com os quatro indicadores. Com o olho fechado, a casca omite a lista de números e a proposta remove marcadores, moeda, texto livre potencialmente financeiro, links com ID de tarefa e o sinal implícito da diferença no Plano. O Assessor da Casa vê apenas descrições fixas de tarefas domésticas autorizadas.

O escritório fica à direita no desktop e logo depois da fila no celular. A maquete compartilhada mostra as pessoas nas mesas, as plaquinhas de nome e estado e a sala da decisão em foco, quando representada. A lista “Trabalhando agora” apresenta em texto quem está em atividade. A área reserva espaço para a variante grande no desktop e média no celular. Os valores pertencem à faixa ou às decisões. Por isso a maquete recebe os funcionários e a sala, sem replicar valores em balões.

## Autoavaliação

1. **Hierarquia em dois segundos · 9/10.** O H1 e a fila formam o ponto de entrada. No celular os quatro indicadores ainda ocupam duas linhas antes do título.
2. **Números acima da dobra · 9/10.** Os quatro quadros respeitam as metas, inclusive no snapshot com tarefas. O desktop usa toda a margem prevista no briefing.
3. **Ritmo e espaçamento · 8/10.** Divisórias dão ritmo à fila e o escritório tem um plano próprio. Perguntas longas precisam de mais altura.
4. **Tipografia · 9/10.** Títulos, rótulos e valores têm escalas distintas. Os números tabulares permitem ler a coluna de valores rapidamente.
5. **Ícones e ilustrações · 8/10.** Avatares identificam os funcionários e os estados vazios usam SVGs da família visual. As plaquinhas da maquete atual ficam pequenas no celular.
6. **Organização por tarefa · 9/10.** Prioridade, responsável e ação rápida na mesma linha. Indicadores têm destinos próprios e as pastas mantêm as decisões à mão.
7. **Acessibilidade · 8/10.** Contraste dos pares CSS calculado, alvos visíveis de pelo menos 44 px, nomes acessíveis, foco visível e atalhos restritos à fila. A maquete é decorativa e a lista de presença tem leitura em texto.
8. **Privacidade · 9/10.** O teste injeta moeda, percentual e razão em texto livre e verifica a marcação com o olho fechado, inclusive o destino de tarefa. A cena usa geometria fixa e não recebe valores.
9. **Temas claro e escuro · 9/10.** Mesmas medidas de conteúdo nos dois temas, com pares de cor validados para as superfícies de ambos.
10. **Escritório como personagem · 8/10.** O remetente da fila tem lugar na equipe e a sala responde ao foco. O celular mostra a cena depois da primeira decisão. A versão compartilhada disponível nesta worktree desenha quatro salas.

## Da prévia ao produto

- Alimentar os quatro indicadores com `useResumoFamilia()` e os campos oficiais `podeGastarHoje`, `plano2029.falta_com_margem`, `aplicacoes.total` e `faturas.total`. Preservar unidade, natureza e estados de leitura. Para o Plano, usar apenas a medida com margem na barra.
- Compor a fila com `useEscritorio().perguntas`, a lista completa já filtrada no app. Usar `donoDaPergunta` para resolver o remetente, `useEquipeCompleta` para atualizar a presença e `totalPendencias` para indicar quando a API traz uma fila parcial. Derivar os níveis do tipo e vencimento da tarefa com a data de Recife.
- Ligar **Abrir** a `PerguntaCard` ou a `enderecoDestino`, conforme a tarefa. Ligar **Já fiz** e **Depois** às opções autorizadas de cada pergunta por `useEscritorio().responder`. O hook já aplica trava de envio e releitura. Quando a opção precisar de comprovante, valor ou data, abrir o formulário correspondente. Mostrar confirmação e oferecer desfazer pela correção oficial quando a API suportar.
- Ler papel e olho de `useApp`, manter as permissões do servidor antes da leitura e usar `dadosIsometricos` para a cena oficial do produto. A proteção de valores deve valer também para os atributos acessíveis, links e conteúdo visual da maquete.

## Verificação da entrega

- `npx tsc --noEmit` terminou sem erros. Os 12 testes da proposta F passaram, incluindo o teste de geometria em Chromium. O laboratório também abriu com fila vazia em ambos os temas e larguras. Uma verificação adicional com React montado conferiu abrir por teclado, fechar com Esc, adiar, desfazer, marcar como feita, retomar e ocultar valores sem remontar.
- O comando padrão do Vitest foi bloqueado no carregamento de `vite.config.ts` pelo esbuild. A execução programática do Vitest instalado, com a mesma seleção de arquivos e a configuração JSX equivalente, rodou 93 arquivos. Foram 1.581 testes aprovados, 3 pendentes da suíte e 4 falhas fora da proposta F.
- O teste de isolamento do laboratório parou na mesma restrição de leitura do esbuild. O teste da proposta B falhou ao procurar o valor injetado na marcação com o olho aberto. O teste de cobertura de rascunhos também continuou falhando na reexecução isolada. O arquivo de privacidade global passou na reexecução isolada.
- O `git add` foi bloqueado pela permissão de escrita do `index.lock` da worktree. Os arquivos da entrega ficaram no diretório da proposta.
