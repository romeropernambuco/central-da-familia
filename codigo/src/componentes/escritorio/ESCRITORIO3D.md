# Escritório 3D das propostas

`Escritorio3D` usa o elenco e os estados de `DadosInicio`, a planta e o cadastro de `telas/escritorio`. A vista padrão usa a planta inteira. `salaDestacada` aproxima os postos da sala na mesma cena e `postoSelecionado` reflete a seleção feita no palco ou na fila. Os modos anteriores seguem disponíveis pela API para compatibilidade.

`VisorEscritorio` reúne as sete pílulas, **Todas**, os botões de zoom e **Ampliar**. A pinça aproxima o ponto entre os dedos. Com zoom, o arraste desloca a câmera. Na vista geral, o gesto vertical também permite continuar a rolagem da página. O palco móvel tem a altura da tela e, no desktop, cresce conforme a largura disponível. **Ampliar** usa a API de tela cheia quando disponível.

Os personagens têm rosto, óculos, crachá ou fone conforme o cadastro. As animações de digitação, pausa, revisão de documentos e aceno refletem os estados do snapshot. Os alvos HTML de 44 px permitem acionar as fichas por teclado. O nome e o estado aparecem em uma faixa no foco, no hover ou na seleção.

## Dados e privacidade

`FichaPosto` apresenta função, estado, atividade e último resultado. Seus atalhos usam as rotas e permissões do app. O remetente e a ação **Ver tarefa na fila** ligam o mesmo posto à mesma decisão. Os resultados indisponíveis aparecem como **Ainda sem dado**. A fila da prévia mantém as ações na sessão.

O olho da casca mascara valores e textos livres da ficha. A cena recebe apenas posições e estados. As três propostas restringem o Assessor da Casa à área doméstica. O expediente demonstrativo é composto no laboratório e mantém oito pessoas trabalhando e três pedidos de atenção.

## Renderização

O `IntersectionObserver` adia os imports da cena e de Three.js até o palco ficar visível. A cena pausa fora da tela ou com a aba oculta, reduz a resolução em baixo FPS e libera o contexto e as malhas na desmontagem. Falha de WebGL ou preferência por movimento reduzido ativam a alternativa SVG. No exame do laboratório, a vista completa usou 10 chamadas de desenho e 38.548 triângulos, dentro do orçamento de 32 e 45.000.

`EscritorioIsometrico` continua usando o mesmo renderizador com as autorizações, a fila e as fichas do aplicativo. Para integrar a J ao Início, ligar os seletores oficiais de `lib/resumo`, `useEquipeCompleta` e `dadosIsometricos` aos controles e fichas da proposta. O fluxo publicado de tarefas mantém os IDs e as mutações oficiais.
