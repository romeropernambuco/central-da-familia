# Escritório 3D das propostas

`Escritorio3D` aceita todas as props de `EscritorioMaquete` e a altura opcional do palco em pixels. O palco 3D tem mínimo de 208 px para acomodar os alvos. Usa `DadosInicio['funcionarios']` para o elenco, as salas e os estados. O cadastro compartilhado fornece a mesa e a aparência de cada personagem. O contrato de exemplo tem 19 postos cadastrados em sete salas. O componente desenha só os postos presentes nesse recorte.

## Composição e comportamento

- A cena reutiliza `montarEscritorioIsometrico`, incluindo planta, mobília, personagens articulados e instâncias. Contador, Cartão, Assistente e Analista ganham monitor e teclado. Quando trabalham, alternam as mãos e a direção do olhar. Os demais mantêm os objetos e gestos do ofício. Quem precisa de você sai de trás da mesa e levanta a mão. O check Lucide identifica uma entrega.
- As três variantes reservam espaço suficiente para as figuras e os controles. Em área estreita, a vista geral é panorâmica e rolável. `salaDestacada` ajusta centro e escala da câmera na mesma cena. As salas vizinhas podem aparecer nas bordas, e os postos acionáveis ficam restritos à sala em foco.
- As plaquinhas usam ícone e inicial. `mostrarPlaquinhas={false}` deixa só os ícones no 3D. O posicionamento reserva o alvo inteiro de 44 × 44 px, prioriza quem pede atenção e usa uma haste até a cabeça para associar a plaquinha ao personagem. Nome, estado por extenso e eventual valor ocupam uma área única abaixo do palco ao passar o mouse, focar ou selecionar um posto.
- Um clique ou toque no personagem passa pelo raycast. Os botões HTML sobrepostos chamam o mesmo `onSelecionar` com o registro do snapshot e oferecem foco visível. Sem o callback, a cena permite inspecionar os postos e não cria botões de ficha. A tela consumidora abre a ficha e controla o retorno de foco.
- O componente retira os valores antes de montar o palco para `papel="equipe"` ou papel indisponível. O olho da casca e `oculto` retiram a cifra e seu marcador do DOM, preservando só a máscara. A cena Three.js recebe posições e estados de trabalho, sem cifras.

## Carregamento e verificação

Um esqueleto ocupa o palco até o primeiro quadro. O `IntersectionObserver` libera os imports da cena e de Three.js quando o palco aparece. Contexto indisponível, perda de contexto, falha ou timeout do carregamento, Node e preferência por movimento reduzido acionam `EscritorioMaquete` com as props correspondentes. Alterar a preferência com a cena aberta também troca a visualização e libera o contexto.

O renderer usa `low-power`, pixel ratio de até 1,5 e pausa o laço quando a cena sai da tela ou a aba fica oculta. A variante compacta já abre sem sombras projetadas. A cena compartilhada também reduz a resolução e desliga as sombras se a taxa de quadros cair. Na desmontagem, cancela frames, invalida a montagem de imports pendentes, desconecta os observadores e libera malhas, materiais, renderer e contexto.

O componente foi montado isoladamente no Chromium com os dados de `dadosExemplo.ts`. A verificação esperou 6,1 s após abrir a página e fixou no snapshot de teste um posto trabalhando e outro pedindo atenção para exercitar os gestos. Vi as figuras e os objetos das mesas, a mão levantada, o check de entrega e a aproximação de Patrimônio. A captura de dois quadros confirmou mudança em movimento. Em 1280 × 800 e na emulação de 375 × 812, a vista geral apresentou 19 alvos de 44 × 44 px sem sobreposição. Na vista de Patrimônio, havia três alvos. Tab exibiu o contorno, Enter e Espaço selecionaram o Contador, o clique direto no canvas acertou o mesmo posto e o toque emulado na plaquinha selecionou o Comprador. Também conferi a máscara ao fechar o olho, a ausência de cifra para Assessor e a troca para SVG ao emular movimento reduzido.

Nas amostras do Chromium com renderização por software, medi até 10 desenhos e 25.812 triângulos por quadro, dentro de `ORCAMENTO_ISOMETRICO` (32 e 45.000). Desempenho e bateria precisam de medições em dispositivos físicos. Falta conferir Safari e leitor de tela.

## Como levar ao Início real

1. Extrair este palco e sua alternativa SVG para uma área de código do produto, com um contrato pequeno de elenco, sala e estado. O adaptador do laboratório continua usando `DadosInicio`. O do produto deve partir de `useEscritorio`, `useEquipeCompleta` e `dadosIsometricos`, preservando as permissões, o modo do funcionário, a fila oficial e os estados de erro ou indisponibilidade.
2. Trocar a superfície visual de `EscritorioIsometrico` no Início pelo palco compartilhado. Ligar o clique da ficha ao fluxo atual de `EscritorioAutorizado`, preservando expansão, rotas, tarefas e retorno de foco. Injetar valores já autorizados e ligar a máscara ao olho real. O servidor deve continuar restringindo os dados financeiros de cada papel antes de a tela receber o snapshot.
3. No laboratório, I, J e K ainda chamam `EscritorioMaquete`. L e M estão em construção nesta worktree. Basta usar o export `Escritorio3D` com as mesmas props ao integrar as propostas. Essa troca de chamadores fica fora desta entrega.

O cenário representa o estado do snapshot, com gestos ilustrativos. As etiquetas projetadas dependem dos IDs do cadastro atual. Um posto novo precisa de posição e aparência cadastradas. A vista geral estreita exige rolagem para inspecionar todos os postos e a leitura dos gestos mais finos é melhor com uma sala em foco.
