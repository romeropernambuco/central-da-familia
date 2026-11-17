# F38 · Escritório isométrico da família

## O original e a decisão de portar

`paineis/escritorio3d/index.html` tem 814.214 bytes. O Three.js r160 embutido ocupa 669.936 bytes. O script próprio inteiro tem 40.072 bytes, incluindo cadastro de demonstração, controles e ficha. A função de montagem concentra cerca de 25 KB desse script. O HTML e a identidade do painel publicado serviram de referência para esta etapa.

O original usa uma câmera ortográfica na direção `(1, .86, 1)`. A vista geral enquadra quatro salas de 6 × 5 e a recepção avançada. Paredes altas ao fundo e meias paredes no interior deixam o mobiliário visível. Cada sala tem piso, tapete e adereços próprios. Mesas de madeira, cadeiras, notebooks, papel e luminárias são construídos em Three. O prédio e partes do corpo são agrupados por geometria. Cada personagem é um boneco procedural com quadril, cabeça, ombros, cotovelos e joelhos articulados. Roupa, pele, cabelo, coque e óculos vêm da ficha visual do personagem.

A luz hemisférica, o sol direcional com sombras e as lâmpadas variam com a hora do painel. A animação combina pose sentada, digitação e caminhada até o tapete de quem pede atenção. Uma câmera de perspectiva captura o rosto do próprio boneco em 112 × 112. As placas e os balões são HTML projetado a partir da cena, com prioridade para os avisos quando etiquetas se cruzam. A lista lateral e a ficha reutilizam os retratos.

Cadastros narrativos, valores, horários de turno, entregas e perguntas da Família Silva estão codificados no painel. O estado muda com o relógio de demonstração e o botão de resposta altera apenas a demonstração. `paineis/assistentes/index.html` apresenta outra composição, com câmera em perspectiva, cinco papéis domésticos e ligação parcial de placas e falas ao banco. A planta e os funcionários que o dono pediu são os de `escritorio3d`.

A cena anterior do app, `cena3d.ts`, tem 699 linhas. Seu contrato em `cenaBase.ts` oferece `montarCena`, atualização, `definirEstado`, câmera e descarte. O caminho dos cartões usa `composicaoMini` para limitar elenco e orçamento, `SALA_POR_ABA` e `elencoDaAba` para selecionar o elenco por rota e papel, e modelos Kenney para a cenografia. O cadastro `equipe.ts` contém 19 funcionários, incluindo o Ajudante dos Imóveis. A composição pequena dos cartões e seus testes continuam disponíveis.

Foi portada a parte visual do original para módulos TypeScript com o Three já instalado, carregado por `tres.ts` sob demanda. A planta preserva as quatro salas e a recepção, com uma ala ao fundo para Gestão e Apoio. O rig mantém as proporções do original. As bancadas usam objetos e gestos individuais reaproveitados de `atividadesMini.ts`. A luz de trabalho tem intensidade estável e sombra direcional, com luminárias cenográficas. A perspectiva geral mantém os 19 postos visíveis, incluindo quando há alguém no corredor chamando. O filtro aproxima a câmera da sala selecionada.

Os 13 retratos existentes foram capturados com a câmera do próprio painel original. Os seis postos novos foram renderizados com a mesma câmera e o mesmo rig, usando as roupas do cadastro. São 19 WebP de 112 × 112 em `public/retratos-escritorio/`, com 29.334 bytes somados. A captura usou uma cópia em memória do HTML com saída WebP, servida localmente.

## Dados e interação

A fila integral vem de `useEscritorio` e da loja escopada em `escritorioCompartilhado`. O total usa `totalPendencias`, compartilhado com o Resumo da família. O balão usa o valor explícito da primeira tarefa do funcionário, pela leitura de `valorDaPendencia` em `lib/resumo/pendencias`. A lista mantém cada pergunta e seu próprio valor, inclusive quando um funcionário tem mais de uma. Os rótulos usam o estado do Escritório e as leituras suplementares já usadas por `useEquipeCompleta`. A fila corrente tem prioridade para marcar quem está chamando. A invalidação relê os dados e atualiza a postura e os rótulos na mesma cena.

A API aplica o escopo da família e do usuário antes da interface. O casal recebe sua fila autorizada inteira. A pessoa da família dispõe de fichas e tarefas compatíveis com seu papel e recebe da API apenas dados do próprio escopo. Para Assessor da Casa, a projeção do escritório só admite os papéis da Casa e remove o valor da tarefa. A rota do Assessor continua sendo Casa. Com o olho fechado, a tarefa aparece com texto genérico e o valor vira uma máscara fixa antes de chegar ao DOM. Tamanho e cor do balão dependem do estado de pendência e do espaço disponível. O renderizador recebe o mapa de estados, com valores e frases tratados na camada React.

O Início posiciona a prévia antes do Resumo. No celular, o toque abre uma folha de tela cheia com filtros e fila. Na aba Escritório, a sala já aparece em Hoje, com a lista por sala logo abaixo. Plaquinhas, fila e lista abrem a ficha existente ou a pergunta autorizada pelo fluxo de `PerguntaCard` e `responder`. O modo Só texto oferece acesso à fila e à equipe. Desligado recolhe a apresentação no Início e mantém o acesso às tarefas da aba Escritório. O canvas é decorativo para leitores de tela, com descrição textual, botões focáveis e lista acionável na indisponibilidade do WebGL.

## Desenho, carga e descarte

- Orçamento da sala inteira, incluindo a passagem de sombra: **até 32 chamadas de desenho e 45.000 triângulos**. Medição pelo `renderer.info` no Chromium com SwiftShader: **10 chamadas e 26.652 triângulos** nas três vistas aferidas.
- Geometrias por forma em `InstancedMesh`, com cores por instância. O mobiliário, os vidros e as sombras de contato são estáticos. O corpo e os objetos de trabalho compartilham lotes atualizados pelas matrizes das articulações. O DPR tem teto de 1,5. Quando cai abaixo de 25 FPS na janela de amostragem, o modo leve limita o DPR a 1, retira sombras dinâmicas, congela detalhes de mesa e desacelera a renderização.
- A cena pausa fora da tela e com a aba oculta. Com movimento reduzido, desenha uma pose estática e recorta a câmera de imediato. Perda do contexto ativa a lista e libera RAF, observadores, eventos, instâncias, geometrias, materiais, renderizador e canvas. Nas 20 trocas reais entre Início e Escritório houve um canvas e um contexto ativo por vez. Foram observadas 19 liberações durante as trocas, com o vigésimo contexto pertencente à última tela.
- O build mantém a cena (**5.912 bytes gzip**), as atividades (**4.868 bytes gzip**) e o Three (**129.439 bytes gzip**) em chunks de carga tardia. A interface React do escritório ocupa 5.693 bytes gzip. A lista gerada pelo service worker deixa esses chunks 3D e os retratos para o cache no primeiro uso.
- A entrada passou de **1.885 para 1.886 bytes gzip**, com 3.636 bytes sem compressão nos dois builds. O JavaScript de partida foi de **149.071 para 147.535 bytes gzip**. O CSS de partida manteve 14.454 bytes gzip. A CLI de Vite e Vitest encontrou acesso negado no esbuild ao resolver o arquivo de configuração. A medição e a suíte foram executadas pelas APIs Node das mesmas versões do Vite e Vitest, com a configuração React equivalente e sem escrita no cache das dependências.

## Conferência de layout

- **Início 375 × 812:** faixa de 240 px, canvas de 343 × 194 px, com a sala inteira. O primeiro valor do Resumo terminou em Y = 612, com a barra inferior a partir de Y = 725. A medição inclui a faixa de aviso do modo exemplo.
- **Início 1280 × 900:** faixa de 544 px e canvas de 726 × 430 px. Primeira linha de valores do Resumo a partir de Y = 822.
- **Escritório 1280 × 900:** canvas de 726 × 430 px, fila à direita e lista da equipe a partir de Y = 735.

As capturas usam a família de exemplo do próprio app, com o perfil Bruno. O valor de R$ 1.000 no segundo item do Gestor do Guardado chega da fila desse perfil. A fonte de produção é o Escritório da família autenticada. A verificação automatizada troca o valor recebido por sentinelas e inspeciona rótulo, fila, máscara, papéis, navegação, atualização, fallback e descarte.

O TypeScript passou com `npx tsc --noEmit`. O Vitest passou em 85 arquivos, com 1.507 testes aprovados, zero falhas e os três `todo` preexistentes. A auditoria geral do olho agora também monta o escritório isométrico.

PNGs de conferência em `C:\Users\ROMERO~1\AppData\Local\Temp\f38-conferencia-dBkg3Q`. O servidor e o Chromium temporários foram encerrados depois das medições.

Em grupos densos, as plaquinhas ainda podem se cruzar na vista geral. Os filtros aproximam cada sala e a lista mantém todas as fichas acessíveis.

O Git bloqueou `git add codigo` por falta de permissão no `index.lock` da worktree. O trabalho está salvo no diretório da worktree. A limpeza dos arquivos temporários externos foi bloqueada pela política do ambiente. Em `%TEMP%` ficaram `f38-verificar.mjs`, `f38-vitest-final.log` e os rascunhos `f38-browser-xl8JtR`, `f38-conferencia-jKtQI4`, `f38-conferencia-qdPqr6`, `f38-conferencia-3GrUoj`, `f38-conferencia-W7nnI7` e `f38-conferencia-eOOpCx`. A raiz da worktree e `codigo/` estão livres dos scripts e capturas temporários.

## Próxima etapa

Substituir a cenografia Kenney dos cartões das demais abas por recortes da mesma sala isométrica, preservando o contrato de interação e o orçamento já testado dos cartões. O legado 3D permanece nesta worktree para essa transição.
