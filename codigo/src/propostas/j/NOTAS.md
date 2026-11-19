# J · Escritório no centro

## F69 · Início do aplicativo

A J virou o Início em `telas/inicio/Inicio.tsx`. A faixa, os cartões e a trilha usam `useResumoFamilia`. Os detalhes mantêm o resumo anterior, o ritmo, os envelopes, o placar e os últimos lançamentos. A trilha usa o cenário oficial Garantido, com a estimativa sem margem recolhida.

`EscritorioInicio` adapta a equipe e a fila compartilhadas ao `VisorEscritorio` e ao `Escritorio3D`. A ficha abre a aba da pessoa ou seu diário e oferece as opções de resposta que a API devolve para aquela tarefa. O Assessor continua em Casa. O menu do app reúne as dez abas e as áreas autorizadas de conta, com Anotar no centro no celular e na lateral no desktop. O Início acompanha a aparência escolhida em Ajustes, inclusive a opção automática.

O clássico abre pelo hash `#/inicio-classico` para o dono no exemplo. A verificação das rotas, dos papéis, do olho e da cena está no [relatório f69](../../../RELATORIO-f69.md).

## Versão f68

O resumo, a sala de decisões e a planta inteira compõem o mesmo painel. No desktop, a fila acompanha o palco na lateral. No celular, ela vem logo depois da cena, em uma folha expansível. O palco WebGL abre nos 19 postos. As sete pílulas aproximam as salas e **Todas** recupera a vista geral. Pinça, arraste, zoom por botões e **Ampliar** usam a câmera compartilhada. O SVG fica disponível em movimento reduzido ou sem WebGL.

Selecionar um posto abre função, estado, atividade atual, último resultado e atalhos do cadastro. **Ver tarefa na fila** abre a decisão correspondente. O remetente na fila abre a mesma ficha e destaca o posto. O olho protege os valores e o texto livre. O Assessor da Casa recebe somente a área doméstica.

O laboratório abre em escuro e mostra oito pessoas trabalhando e três pedidos de atenção na amostra. Os resultados e ações da fila são da prévia. A J é a candidata ao Início por reunir equipe, resumo e decisões no mesmo painel.

## Registro da proposta original

A família entra pelo escritório. O palco reúne sete salas, 19 postos e os quatro valores que orientam o dia. A fila fica na lateral do palco no desktop e abre como folha a partir da base da cena no celular. As rotinas e o horizonte de 2029 vêm na sequência.

## O que veio de cada proposta

- **E · Menu e bento.** Mantive Início, Orçamento, Faturas, Escritório e Mais, com Lucide e pílula ativa. A barra inferior vira navegação superior no desktop. Os quatro cartões com SVGs do projeto trazem gasto já registrado hoje, rendimento líquido de hoje, quantidade de faturas da lista e aluguel líquido estimado. Assim, teto, saldo aplicado e previsão de faturas continuam com uma única ocorrência no resumo.
- **D · Rumo a 2029.** Mantive a curva quadrática, o traço de 15 px, o avanço sólido, o ponto branco, os marcos 2026–2029 e o destino **Viver de rendimentos**. O percentual oficial usa 36 px e símbolo menor. A curva satura no fim, enquanto o percentual conserva o valor oficial. A diferença mensal com margem fica no chip da cena, com acesso direto a partir do gráfico. A estimativa sem margem abre em um detalhe e se recolhe por padrão.
- **F · Resumo e fila.** Os quatro chips são atalhos do palco e a fila mostra avatar, assunto, nível por extenso, montante e ações. **Já fiz** e **Depois** movem a decisão para as pastas Feitas e Depois. **Desfazer** recupera a última movimentação. **Abrir** mostra os atalhos para o posto e para a tarefa no escritório de exemplo. A folha mostra uma decisão por vez no celular e até duas no desktop. As ações da fila valem nesta prévia e são reiniciadas ao trocar de pessoa ou família.
- **Maquete compartilhada · Equipe em cena.** Uso a variante `grande`, com plaquinhas e `onSelecionar`. A vista geral contém todos os 19 postos, com o estado real do snapshot e animação breve quando o estado permite. A seleção por sala aproxima o desenho e lista a equipe em texto. Tab chega aos postos e os botões nativos abrem a ficha. Em 375 px, a vista geral é panorâmica e rolável nos dois eixos para manter os alvos de 44 px. Há rolagem horizontal própria para as sete pílulas, acima da maquete. Até três postos têm indicadores próprios de saldo, receita garantida ou valor de imóveis. O balão só aparece ao escolher um posto que tem esse campo pronto e só ocupa um lugar na tela.

## Ordem de leitura

- **Em dois segundos.** O título situa a pessoa. A faixa diz se há postos pedindo atenção e oferece **Ver decisões**. Limite de hoje e diferença mensal com margem ganham os numerais maiores.
- **Em cinco segundos.** A maquete mostra onde cada pessoa está. **Precisa de você** explicita as ações prioritárias na lateral ou na aba da folha inferior. Os outros dois chips respondem sobre aplicações e faturas.
- **Depois.** Explorar salas, abrir fichas, rever decisões adiadas, ver as rotinas e acompanhar o quanto da meta de renda está coberto.

## Sistema visual

Geist Variable para títulos e números, Inter Variable para texto e controles. A escala passa por 12, 14, 16, 20, 28 e 48 px. Os dois valores principais do resumo usam 34 px no celular e 36 px no desktop. Os secundários usam 27 px. Os algarismos são tabulares e ficam em uma linha. A moeda usa corpo menor dentro do mesmo marcador que mede o valor.

O escuro é o padrão do componente. A casca continua definindo o tema da prévia e abre em claro. Fundo `#0c0c0b`, cartão `#131312`, menu `#1a1918` e palco `#20221c` dão profundidade. O musgo da E aparece como `#c0d6a7` no escuro e `#40582d` no claro. O claro parte de `#f5f4ef` com palco `#e7e9df`. Os filetes e materiais do escritório usam mistura em OKLCH, com sombra apenas no claro.

## Dobra medida na casca

Medição no Chromium com `medirNumeros`, as dimensões da casca, Geist e Inter carregadas, olho aberto, rolagem no topo e o snapshot fictício de 18/11/2026 às 11h no Recife.

- **Celular, 375 × 812, claro e escuro.** 4 números. São os quatro chips, com a folha recolhida.
- **Desktop, 1280 × 800, claro e escuro.** 6 números. São os quatro chips e dois montantes da fila lateral.
- **Olho fechado.** Zero marcadores. A geometria visível da trilha independe da cobertura, o balão mostra a máscara e a fila usa assunto genérico. A vista do Assessor da Casa abre o atalho para a área doméstica.

## Autoavaliação

1. **Hierarquia em dois segundos · 9/10.** O título e os dois valores principais têm pesos distintos. No celular, o título e o resumo ocupam cerca de 325 px antes da entrada no palco.
2. **Números acima da dobra · 10/10.** A casca encontrou quatro e seis, dentro das metas, sem repetição entre os valores medidos.
3. **Ritmo e espaçamento · 8/10.** Cena, folha, bento e trilha se leem em blocos. A panorâmica móvel exige navegação dentro da cena.
4. **Tipografia · 9/10.** O tamanho e o peso distinguem cifra, título e legenda. As etiquetas de mesa conservam a escala do desenho compartilhado.
5. **Ícones e ilustrações · 9/10.** Lucide identifica destinos, prioridades e ações. As quatro figuras distinguem as rotinas e a mobília distingue as salas.
6. **Organização por tarefa · 9/10.** Limite, diferença mensal e fila têm acesso direto. **Abrir** liga a decisão ao posto e à tarefa do exemplo.
7. **Acessibilidade · 8/10.** Contraste AA calculado, foco visível, estados textuais e alvos de 44 px medidos. Verifiquei o foco dos botões nativos em navegador. Falta uma sessão com leitor de tela.
8. **Privacidade · 9/10.** Olho da casca e prop escondem valores, geometria proporcional, link identificável e texto livre da decisão. O Assessor recebe uma abertura doméstica.
9. **Temas claro e escuro · 9/10.** Ambos mantêm áreas e controles, e o escuro dá mais separação à cena. Os testes calcularam contraste nos dois conjuntos de tokens.
10. **Escritório como personagem · 9/10.** Os 19 postos têm estado, ficha e foco por sala. No celular, a panorâmica revela a planta por partes para preservar o tamanho dos postos.

## Plano de integração registrado na f68

- Adaptar `useResumoFamilia` para um modelo de apresentação com os seletores de `lib/resumo`. Usar orçamento para o valor de hoje e o gasto registrado, aplicações para saldo e rendimento de hoje, faturas para previsão e lista, plano para diferença oficial e cobertura, e imóveis para aluguel estimado e valor cadastrado. A quantidade do cartão de faturas deriva de `faturas.proximas.valor.length` quando a lista está pronta. Preservar escopo por papel, unidade, natureza, falhas recuperáveis e `repetir`.
- Obter equipe autorizada por `useEquipeCompleta` e fila por `lerPendencias` ou `escritorioHoje`. Usar IDs estáveis de funcionário, assunto seguro para o olho fechado, estado persistido, prazo para Depois e destino estruturado por decisão no contrato do produto. Na prévia, a ligação entre tarefa e posto usa ID, nome ou apelido disponíveis e o estado da fila é local. No produto, ligar **Já fiz**, **Depois** e **Desfazer** às mutações autorizadas e refazer a leitura após confirmação.
- Integrar `EscritorioIsometrico` da f38 com `superficie="inicio"` sob demanda. Conectar as pílulas ao foco por sala, a seleção à ficha e o retorno de foco à pessoa selecionada. Preservar alvos HTML e a alternativa SVG para a vista sem WebGL.
- A navegação da prévia focada por seção mantém `#/j`. No produto, ligar Início a `inicio`, Orçamento a `orcamento`, Faturas a `cartoes`, Escritório a `escritorio`, Aplicações a `guardado`, Imóveis a `imoveis` e Rumo a 2029 a `planejamento` com a seção `plano2029`. Usar `enderecoDestino` e as permissões de `app/rotas` para abrir seções e tarefas. No Assessor, consultar apenas a rotina autorizada antes de montar a análise financeira.

## Validação

Os nove testes da J exercitam a casca em Chromium, os controles da fila, a navegação, o foco dos postos, os alvos de 44 px, o cálculo de contraste e a privacidade. A suíte completa registrou 1.658 aprovações, três pendências e dez falhas externas à J, em C, D, E, G, no teste de rascunho e no isolamento do laboratório. Neste sandbox, a CLI do Vitest não conseguiu carregar `vite.config.ts` pelo esbuild. A execução usou a API do Vitest com o plugin React e cache desativado.
