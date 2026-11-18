# G · Casa Viva

Em `/src/propostas/propostas.html#/g`, a família entra numa planta isométrica. O cômodo é o destino. Escritório abre Caixa, Cozinha abre Casa, Carteira abre Cartões e Cofre abre Patrimônio. Cada plaquinha associa o nome do cômodo, a área e uma medida que ajuda a decidir se vale entrar. Pode-se tocar na sala desenhada, acionar a plaquinha pelo teclado ou usar a navegação de quatro áreas e **Mais**.

## Ordem de leitura

- **2 segundos.** Saudação pessoal e Saúde da casa. O texto da faixa diz se existe pagamento em risco, tarefa da equipe ou lembrete. **Ver avisos** abre a fila já ordenada por prioridade.
- **5 segundos.** A maquete apresenta os quatro destinos e quem está trabalhando. Logo abaixo, o primeiro cartão responde quanto se pode gastar hoje. No desktop os três cartões cabem na primeira tela. No celular, o Plano 2029 está logo depois do primeiro cartão.
- **Depois.** Uma folha sobe pela base e mantém a casa ao fundo. O detalhe realça a sala, traz a tarefa do cômodo, os nomes e os estados da equipe e abre espaço para os dados daquela rotina. No Plano, o cartão inicial traz a falta mensal com margem e a folha detalha cobertura e renda estimada. A cobertura visual satura em 100% e o percentual oficial pode ultrapassar esse valor.

## Sistema visual

A referência de Airbnb orientou a composição com imagem dominante, fundo tranquilo, filetes finos, uma sombra discreta no claro e ações arredondadas. A maquete ocupa o papel de imagem principal. Fraunces Variable, em peso moderado, dá personalidade à saudação, aos títulos e aos nomes dos cômodos. DM Sans Variable dá clareza a controles e números, com 35 px no orçamento do dia, 26–27 px nos indicadores secundários e algarismos tabulares. Símbolos de moeda nas plaquinhas e de percentual nos indicadores têm escala menor.

O claro combina marfim `#fdfaf6`, branco `#ffffff` e palco areia `#f2e5da`. O destaque é terracota `#98472e`. O escuro usa as camadas `#0c0c0b`, `#131312` e `#1a1918`, com palco `#211b17` e coral `#f0a589`. Filetes e maquete derivam tons por mistura em OKLCH. O vermelho é reservado ao aviso **Dinheiro em risco**. **Operação** e **Lembrete** usam texto e ícones distintos em pílulas neutras.

## Primeira dobra medida na casca

- **Celular, 375 × 812.** 3 em claro e 3 em escuro. A casca encontrou próximas faturas, aplicações e o orçamento de hoje. O valor do dia começa por volta de 710 px e a navegação fixa por volta de 758 px. A estimativa do Plano aparece na sequência da rolagem.
- **Desktop, 1280 × 800.** 4 em claro e 4 em escuro. Aos três números do celular soma-se a falta estimada por mês do Plano 2029. Os três cartões de resumo e seus controles ficam visíveis.
- **Olho fechado.** A casca remove a lista de medição. Na tela e nos detalhes, a marcação exclui a cifra, o percentual, a barra de cobertura e textos livres que podem conter valores. Neste exemplo, saldo em conta e itens em falta estão indisponíveis. Com as quatro plaquinhas preenchidas, o orçamento de conteúdo é de cinco números antes do Plano e seis no total.

Contagem obtida pelo próprio medidor da casca no Chromium, com as fontes carregadas e a rolagem no topo. Nos quatro contextos conferi os acionadores, a devolução de foco no fechamento, o cancelamento equivalente a Escape, a folha do Plano com o olho fechado e a ausência de rolagem horizontal. Os botões da tela mediram pelo menos 44 × 44 px.

## O escritório como personagem

A cena principal usa a maquete de `comuns/` para mostrar os quatro espaços e os funcionários à mesa. O destaque do piso acompanha o foco da plaquinha. A folha de cada cômodo destaca aquela sala, com plaquinhas na cena e nomes e estados em HTML. Isso preserva a leitura no celular e nas tecnologias assistivas. Na versão compartilhada atualmente disponível, o SVG mantém a mesma geometria. A proposta reserva espaço e repassa `media` para celular e folha, `grande` para desktop, além de foco e privacidade. O desenho atual é uma maquete estática e as salas têm mobiliário semelhante. A lista textual do detalhe usa os funcionários realmente associados ao cômodo no contrato.

## Autoavaliação

1. **Hierarquia em dois segundos · 9/10.** A faixa ocupa a primeira área de ação e tem uma única chamada principal. O valor do dia vem depois da maquete.
2. **Números acima da dobra · 9/10.** A casca mediu 3 e 4. Dois campos indisponíveis reduzem a contagem do exemplo. O teste preenche esses campos para verificar o orçamento do conteúdo.
3. **Ritmo e espaçamento · 8/10.** Palco, cartões e navegação formam grupos claros. No celular, ver o Plano exige rolar.
4. **Tipografia · 9/10.** Saudação, nomes, legendas e valores têm papéis distintos. Valores excepcionalmente longos podem ser abreviados visualmente por reticências nas plaquinhas, com o texto completo no DOM.
5. **Ícones e ilustrações · 8/10.** Os ícones identificam as áreas e as figuras apoiam os três cartões. Os cômodos ainda se parecem entre si na maquete compartilhada.
6. **Organização por tarefa · 8/10.** A faixa abre a fila, o primeiro cartão responde ao gasto de hoje e o Plano ganha detalhe próprio. A fila do laboratório informa o que fazer. A execução depende das rotas e ações do aplicativo.
7. **Acessibilidade · 8/10.** Título único, nomes nos acionadores, foco visível, folha nativa e contraste AA calculado nos pares de texto. A checagem em navegador inspecionou o DOM e a movimentação do foco. Falta uma sessão com leitor de tela.
8. **Privacidade · 9/10.** Valores, avisos com texto livre, percentuais e proporções somem com o olho. A vista do Assessor abre apenas a rotina doméstica. A autorização de dados continua sendo responsabilidade da integração do produto.
9. **Claro e escuro · 9/10.** As duas larguras e os dois temas foram conferidos. Os testes usam os tokens de cada tema para calcular contraste de forma independente.
10. **Escritório como personagem · 8/10.** A maquete é um menu funcional. O detalhe liga as pessoas e seus estados à tarefa da sala. A cena compartilhada ainda usa postos de trabalho estáticos.

## Como levar ao produto

- Montar a vista no Início e formar o modelo a partir de `useResumoFamilia`. Usar `saldoConta`, `casa`, `faturas`, `aplicacoes`, `podeGastarHoje` e `plano2029` dos seletores de `src/lib/resumo/leituras.ts`. Preservar unidade, natureza, autorização, origem e estado. Conectar falhas transitórias ao `repetir` do campo. Usar o valor com margem do mesmo modelo do Plano e converter centavos apenas na apresentação.
- Usar `lerPendencias` e a leitura existente de `escritorioHoje` para exibir a fila autorizada. Alimentar o elenco por `useEquipeCompleta`. Usar `enderecoDestino` para sair da folha em direção à ação no aplicativo e invalidar os recursos de resumo após alterações.
- Adaptar `tema`, identidade e `oculto` de `useApp`. Usar a largura efetiva do contêiner na troca de layout e vincular o selo ao modo exemplo. Selecionar o papel antes de montar as leituras financeiras. Para Assessor da Casa, montar apenas a superfície de compras, estoque e presença. Para papel pessoa, fornecer apenas o próprio orçamento permitido.

## Verificação da entrega

- TypeScript passou com zero erros. Os 15 testes da proposta passaram, incluindo o teste de geometria com o medidor da casca no Chromium. A execução com o componente de `HEAD` e sem a folha e os estilos novos fez falhar os 15.
- O comando padrão do Vitest encontrou acesso negado ao carregar `vite.config.ts` via esbuild neste sandbox. A suíte rodou pela API do Vitest com o mesmo plugin React, padrão de arquivos e timeout do repositório. O teste de isolamento ainda encontra essa restrição ao chamar o carregador do Vite. Em uma verificação separada, carreguei a configuração real pelo Node e confirmei a exclusão do laboratório do build de produção e da entrada direta compilada.
- O teste do texto privado em `src/propostas/b/proposta.test.ts` e o teste de salvar rascunho em `src/componentes/ux-cobertura.test.ts` falharam também na execução com a proposta G de `HEAD`.
- Suíte completa com 1.585 testes aprovados, 3 falhas e 3 pendentes. O Git negou a criação de `index.lock` no diretório administrativo da worktree. Os seis arquivos da entrega ficam disponíveis nesta pasta.
