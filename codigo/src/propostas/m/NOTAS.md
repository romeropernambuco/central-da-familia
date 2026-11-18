# Proposta M · Central em duas colunas

## Conceito e referências

O escritório ocupa a coluna principal e a fila fica imediatamente abaixo. A coluna direita concentra o plano, o orçamento e os totais para consulta. Em 1280 e 1440 px, a barra lateral permanece visível durante a rolagem e o espaço restante se divide em 60/40. Em 375 px, a ordem é escritório, fila, trilha, cartões ilustrados e referências, com navegação inferior persistente.

- **E** · Início, Orçamento, Faturas, Escritório e Mais, com uma pílula para o destino ativo. O bento fica à direita, com as ilustrações de casa e cartões em tom musgo. Cada cartão apresenta uma medida.
- **D** · A trilha grossa tem quatro marcos, de 2026 a 2029, e a bandeira «Viver de rendimentos». «Você está aqui» indica a cobertura de renda projetada. As datas representam marcos do calendário. A trilha satura na chegada e o texto conserva a cobertura oficial, inclusive acima de 100%.
- **F** · A fila «Precisa de você» começa pelas situações de dinheiro em risco, com os níveis nomeados. «Já fiz» conclui na prévia e «Depois» envia a tarefa para Adiadas, de onde pode ser retomada. «Abrir» traz o detalhe disponível. A faixa de quatro referências virou uma lista vertical com saldo em conta, recebimentos garantidos, aplicações e diferença mensal com margem. Orçamento e faturas já têm seus próprios cartões.
- **I, J e K** · Da I vieram os destinos locais com foco e a ficha ligada ao posto. A J reforçou a leitura da margem como medida oficial. Da K veio a distinção entre a área de trabalho e a consulta financeira, que na M aparecem juntas.

## Hierarquia e linguagem visual

- **Em dois segundos** · A frase de estado e o atalho para a fila aparecem acima do escritório. No desktop, o título e a bandeira do plano também aparecem junto à cena.
- **Em cinco segundos** · É possível reconhecer a equipe, localizar a ação mais urgente e ler a cobertura. No celular, «Ver fila» leva direto às decisões.
- **Depois** · Selecionar uma sala ou abrir a ficha de um funcionário, tratar tarefas e consultar os cartões. A leitura do plano usa a cobertura e a diferença mensal com margem em lugares distintos. O olho tira do DOM o trecho proporcional e a posição do marcador, além de ocultar valores e texto livre das tarefas.

**Bricolage Grotesque** mantém os títulos expressivos e os valores tabulares com personalidade. **Inter** dá legibilidade aos menus, rótulos e textos de tarefa. Números principais a 35 px, referências a 27 px. O tema claro parte de areia quente e papel. O verde-folha orienta navegação, trilha e seleção. O vermelho aparece no nível Dinheiro em risco. O tema escuro tem três superfícies em camadas e dispensa sombras.

## Escritório

A M usa `Escritorio3D` em variante grande, com 500 px no desktop e 448 px no celular. As plaquinhas, o foco por sala e os estados vêm do snapshot. Cada posto abre uma ficha com sala e estado. «Ver equipe» oferece os mesmos funcionários em botões nativos, inclusive quando a cena exige rolagem lateral no celular. O painel só destaca como ativos os funcionários cujo estado recebido é «Trabalhando».

Nesta worktree, a interface compartilhada ainda delega à maquete SVG. A troca da f60 encaixa o Three.js com as mesmas propriedades. A M usa o olho e o papel recebido e deixa os balões de valor fora da cena. Foram medidas a maquete e a navegação por botões. A cena WebGL depende da integração compartilhada.

## Autoavaliação

- **Hierarquia · 9/10.** Status, escritório e rumo têm posições previsíveis. O cartão de orçamento fica mais abaixo no fluxo móvel.
- **Números na primeira dobra · 9/10.** No Chromium, a amostra exibiu 0 em 375 × 812 e 3 em 1280 × 800 e 1440 × 800, nos dois temas. A cena e a ação do dia abrem o celular. A trilha e os cartões ficam visíveis no desktop.
- **Ritmo · 8/10.** A coluna de trabalho ganha espaço, com a fila logo abaixo. A rolagem lateral da maquete exige mais exploração no celular.
- **Tipografia · 9/10.** Títulos, valores e legendas têm papéis distintos. Os valores de exemplo cabem sem quebra nas três larguras.
- **Ícones e ilustrações · 8/10.** Lucide identifica ações, os cartões reaproveitam a arte da E e a trilha mantém seu desenho próprio.
- **Organização por tarefa · 9/10.** A fila permite abrir, concluir, adiar, retomar e desfazer na prévia.
- **Acessibilidade · 8/10.** O teste mede os alvos e verifica foco no destino e na ficha. A leitura com leitor de tela ainda precisa de avaliação manual.
- **Privacidade · 10/10 no escopo do laboratório.** O teste cobre valores, texto livre, proporção gráfica, detalhe já aberto e bloqueio do perfil Assessor da Casa.
- **Temas · 9/10.** Os dois temas passaram pelas mesmas medidas. A maquete mantém as cores de materiais definidas pelo componente compartilhado.
- **Escritório como personagem · 8/10.** Cena protagonista, salas e fichas ligadas ao elenco. Falta validar a troca compartilhada para Three.js e seu comportamento em aparelhos móveis.

## Integração com o produto

Montar um adaptador ao lado de `app/useResumoFamilia.ts` para receber a família e o papel autenticados. Aproveitar os seletores de `lib/resumo` para orçamento, saldo, faturas, recebimentos garantidos, aplicações e plano. Preservar fonte, unidade, previsão e estados de carregamento, vazio e erro. Usar `cobre_pct` e `falta_com_margem` do plano oficial. Fazer a autorização antes das leituras e aplicar a mesma privacidade ao formulário, à ficha e a qualquer detalhe financeiro.

Integrar a cena de `telas/escritorio/EscritorioIsometrico.tsx` pela camada compartilhada da f60. No produto, `dadosIsometricos` filtra postos e fila pelo perfil. Reutilizar o carregamento sob demanda, o tratamento de perda de contexto e a seleção de funcionário da cena. Ligar «Abrir» às fichas e destinos existentes e mapear «Já fiz» e «Depois» às opções válidas de cada tarefa. Atualizar o resumo após a confirmação da ação e dar retorno de erro antes de remover a tarefa da fila.
