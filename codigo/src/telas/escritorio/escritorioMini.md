# Escritório real no mini

Apenas `mini: true` recebe os modelos Kenney Furniture Kit 2.0 (CC0). O escritório completo conserva construção, roupas, luzes, percursos e câmeras. Os 41 GLBs foram inspecionados localmente: JSON, nós, hierarquia, materiais, escalas, origem e vértices transformados. O registro reproduzível está em `inventarioModelos.json`; o teste compara esse registro com cada original. Os assets não contêm imagens, texturas ou dependências externas.

## Composição e contato

Cada sala tem arquitetura, massas de mobiliário, paleta, tapete e assinatura próprios. Só o posto principal é compartilhado: mesa, cadeira, teclado, mouse e duas telas laterais (a segunda compacta). O colega universal foi removido para dar espaço às identidades. Piso e paredes recebem tinta por cores de vértice copiadas; os materiais/GLBs do cache ficam intactos. A borda do tapete conserva variação mais escura. Sem textura, luz ou sombra nova.

| Sala | Parede / piso / tapete (sRGB) | Planta e assinatura | Modelos reservados exclusivamente |
| --- | --- | --- | --- |
| Casa | `#c97958` / `#e7b88e` / `#713e31` | Janela à esquerda, copa à direita; três vasos na despensa horizontal | bookcaseClosedWide, plantSmall1, lampRoundTable |
| Cartões | `#9172bb` / `#c5b4da` / `#493969` | Parede curta, portal aberto à direita; torre escalonada de três caixas | bookcaseClosed, doorway, chair |
| Caixa | `#4f70c9` / `#a4bee1` / `#254a71` | Canto azul recuado, mesa em L; rádio na ala lateral | deskCorner, radio, lampSquareTable |
| Patrimônio | `#598664` / `#b8c99a` / `#2e513c` | Duas estantes de alturas diferentes, poltrona e mesa de leitura; livros em três níveis | bookcaseOpen, books, loungeChair, tableCoffee |
| Recepção | `#cc879b` / `#e9c4cf` / `#873b5a` | Entrada à esquerda, café no balcão; sofá diagonal com planta alta | loungeSofa, sideTable, pottedPlant |
| Gestão | `#c5b939` / `#e5d393` / `#70591f` | Janela panorâmica, mesa larga e reunião à direita; TV no aparador | cabinetTelevision, chairCushion, plantSmall2 |
| Apoio | `#3ca6a0` / `#9bd6ce` / `#205b61` | Parede baixa, passagem à direita, bancada transversal; coluna de som junto do laptop | laptop, speaker, trashcan, cardboardBoxOpen, table |

Patrimônio e Recepção têm tapete redondo; os demais, retangular. Cartões usa o tapete oblíquo. Todas as duplas têm distância euclidiana mínima **60 em RGB sRGB 0–255** nas paredes e **25** nos pisos. É uma trava objetiva de separação de tinta, não uma medida perceptual. O teste verifica as cores nos buffers efetivamente desenhados, não apenas na declaração.

O desk original mede 0,734475 × 0,384408 × 0,392300; chairDesk mede 0,334950 × 0,607600 × 0,314299. As origens não estão no centro. A composição preserva transforms internos, centraliza X/Z pela caixa real e apoia o mínimo Y na superfície de destino. Os móveis principais passaram de 1,65 para **1,815 (+10%)**; monitor principal, de 1,3 para **1,43 (+10%)**. O funcionário inteiro usa escala uniforme **0,92 (−8%)**, só após carregar a versão GLB. O tampo resulta em **Y=0,7086997034**; o assento, medido por raio na face horizontal do material carpet, em **Y=0,4348024977**. Não se usa o topo do encosto como altura de sentar.

O monitor GLB mede **0,2942852080** de altura com a base; montado mede **0,4208278474**. A relação testada é `(centro Y da caixa da cabeça, incluindo cabelo − tampo) / altura do monitor`, em coordenadas da sala: **X=1,10; Y=1,50**. Os 18 ids medem aproximadamente **1,226–1,486**; o limite superior inclui os coques. A escala anterior reprova. Teclado/mouse conservam suas dimensões. O raio vertical no centro das bases confirma apoio no tampo real, inclusive no recorte em L; apenas igualar Y não garantiria esse contato.

A face inferior da coxa encosta no assento; o quadril fica acima conforme espessura e ângulo da perna. A conversão entre escala local do boneco e unidades da sala mantém esse contato, os sapatos no tapete e os alvos de IK no teclado/mouse. A correção de comprimento das canelas já existente continua apoiando os pés, sem mudar ângulos ou separar articulações. A oscilação de digitação continua. O menor Y dos objetos de cada atividade é apoiado no tampo medido; escala e deslocamento são aplicados ao grupo, conservando seus pivôs animados. Os 18 ids ficam sentados na versão GLB; o fallback conserva as posturas e a escala anteriores.

## Desempenho por sala

Pior caso entre **todos os ids da sala e os quatro estados**, nas três proporções testadas. Medição dos buffers reais por travessia da cena com renderer simulado: uma chamada por mesh/material, triângulos multiplicados por instância e peças visíveis de gesto incluídas. **Não é uma captura de GPU.** Os modelos novos e o protagonista não geram passes adicionais de sombra; o cenário de caixas fica oculto após a troca. Limites: 40 chamadas, 60.000 triângulos e **150.000 bytes de GLB por variante fria** (KB decimal).

| Sala | Variante | Desenhos máx. | Triângulos máx. | KB GLB | Bytes GLB |
| --- | --- | ---: | ---: | ---: | ---: |
| caixa | Mesa em L, rádio e canto azul | 25 | 2.449 | 116,640 | 116640 |
| casa | Copa terracota e despensa de três vasos | 30 | 3.127 | 146,044 | 146044 |
| cartoes | Arquivo violeta, portal e torre de caixas | 25 | 2.655 | 132,420 | 132420 |
| patrimonio | Biblioteca verde e canto de leitura | 28 | 3.557 | 132,824 | 132824 |
| recepcao | Salão rosa, sofá diagonal e café | 25 | 2.461 | 131,372 | 131372 |
| gestao | Gabinete ocre, TV e reunião | 28 | 2.585 | 125,452 | 125452 |
| apoio | Oficina turquesa e bancada técnica | 24 | 2.265 | 126,380 | 126380 |

Partes estáticas únicas são fundidas por material com `BufferGeometryUtils.mergeGeometries`, preservando normais e cores de vértice. Piso, móveis e livros repetidos usam `InstancedMesh`; as atividades mantêm instâncias de teclas, moedas, envelopes etc. Apenas grupos articulados permanecem separados. Sem luz, textura ou sombra nova. A tela usa emissão de material.

## Câmera por id

Percentual da altura projetada do boneco trabalhando. A câmera ortográfica usa caixas reais e proporção do contêiner. Os testes projetam também cabeça, atividade, sala e gestos nos quatro estados, exigindo **margem ≥5%** e funcionário entre **55% e 70%**. A reserva normal é 8,75%. Resize altera apenas projeção/DPR/tamanho, mantendo cena, personagens e renderer. A direção individual vem da atividade, com elevação reduzida para a nova cenografia.

| Id | 303×128 | 303×180 | 560×180 |
| --- | ---: | ---: | ---: |
| contador | 64,54% | 61,45% | 64,54% |
| colchao | 65,85% | 61,06% | 65,85% |
| tesoureiro | 63,59% | 62,48% | 63,59% |
| folha | 64,82% | 64,82% | 64,82% |
| comprador | 65,28% | 60,86% | 65,28% |
| fiscal | 65,44% | 61,04% | 65,44% |
| cartao | 63,12% | 62,11% | 63,12% |
| assistente | 62,68% | 62,05% | 62,68% |
| guardado | 66,00% | 61,37% | 66,00% |
| usina | 64,33% | 61,60% | 64,33% |
| secretaria | 67,03% | 60,01% | 67,03% |
| presenca | 66,18% | 61,57% | 66,18% |
| auditor | 68,64% | 66,25% | 68,64% |
| anfitriao | 66,98% | 60,78% | 66,98% |
| sonhadora | 66,23% | 60,19% | 66,23% |
| analista | 67,65% | 59,59% | 67,65% |
| zelador | 65,26% | 61,82% | 65,26% |
| protetora | 67,83% | 60,25% | 67,83% |

## Carregamento e descarte

O módulo da cena continua atrás do import dinâmico junto com Three. `modelosEscritorio.ts` e seu GLTFLoader só são importados no ramo mini. Nenhum pacote foi instalado; nenhum Draco ou URL externo foi introduzido. O prefixo é `import.meta.env.BASE_URL + 'modelos/escritorio/'`, compatível com base relativa.

O carregador busca em paralelo somente os nomes únicos da variante. Cache por nome deduplica busca e parse simultâneos; leases mantêm recursos compartilhados enquanto houver consumidores. O último usuário aborta a requisição e libera geometrias/materiais. Parse terminado depois do cancelamento também é descartado. Buffers fundidos e materiais da composição pertencem à montagem e são liberados separadamente, incluindo buffers de instância. Descarte idempotente. Trocar a aba/desmontar cancela a aplicação tardia. Não se conservam geometrias sem consumidores: reutilização entre visitas sequenciais vem do cache HTTP/SW; a de parse/geometria vale enquanto as leases coexistirem.

Falha de import, rede, 404, parse ou montagem mantém a cena de caixas com personagem, atividade e API funcionando. A troca ocorre depois de preparar a composição. Testes de carga usam GLTF falso; testes de composição usam GLBs reais do disco. Fetch é substituído em todos os casos novos: nenhuma rede é usada.

## Offline

O SW já tinha cache-first para GETs locais e nome de cache versionado. `scripts/sw.mjs` agora exclui GLBs e chunks tardios da casca inicial. Os modelos entram no cache quando solicitados; seu conteúdo continua participando do hash da versão. Uma variante já visitada abre offline; uma variante fria offline usa o fallback. O teste gera o SW em diretório temporário, simula rede/cache, aquece um GLB, corta a rede e verifica a mudança de versão ao modificar o conteúdo.

## API e movimento

`definirEstado(id, 'trabalhando' | 'chamando' | 'resolvido' | 'parado')`, `atualizar` e atividades por id permanecem. Resolvido faz joinha por 1,6 segundo de tempo visível e volta ao trabalho; novas chamadas interrompem a celebração. Pausas por id, indicador, relógio, caneca, vapor, piscar, cabelo e acompanhamento de ponteiro são preservados. Os objetos continuam ilustrativos, sem valores financeiros da família.

Movimento reduzido renderiza pose estática sob demanda, sem RAF. Em menos de 24 fps, microvida e emissão animada congelam; gesto principal continua. Fora da tela/aba oculta/contexto perdido pausam o loop e a contagem da celebração. Não há segundo loop de render. Privacidade, olho fechado, dados, `?sem3d` e lista sem WebGL permanecem sob os componentes originais.

## Validação e limites

- TypeScript sem erros (`node node_modules/typescript/bin/tsc -p .`, sem emissão). **802 testes passaram**, preservando os 775 da base e acrescentando 27, nos mesmos 45 arquivos.
- Contraprova desta frente: `escritorioMini.ts` e `cena3d.ts` repostos temporariamente com os originais da worktree, mantendo os testes atuais. **27/27 casos novos falharam** (7 identidades, 18 escalas/projeções, 1 silhueta, 1 isolamento de tinta/apoios). Implementação restaurada; suíte completa aprovada. Na base, Caixa e Casa tiveram silhuetas idênticas no raster.
- O raster monocromático usa os triângulos reais, inclusive matrizes das instâncias, câmera comum e resolução 303×128. Exige diferença de cobertura ≥4% da união nas 21 duplas; o menor resultado medido ficou em aproximadamente 7,36%. Não usa renderer WebGL e não certifica percepção humana.
- As verificações existentes foram conservadas: a expectativa de folga do quadril agora converte a posição local pela escala do boneco antes de comparar com o assento mundial; o intervalo de câmera foi apertado de 50–75% para 55–70%. Nenhum texto esperado precisou mudar.
- `npm test` encontrou acesso negado ao carregar vite.config.ts. Execução pela API startVitest, com executor/cache fora do repositório. Nenhum build foi executado.
- **Inspeção visual WebGL não realizada nesta frente**. Conferir no navegador: identificação das sete salas sem etiquetas a 303×128, cores sob iluminação de dia/noite e tema escuro, oclusões entre móveis e atividades, aparência da cabeça/mesa/monitor e dos gestos em movimento, contagens reais de `renderer.info`, GPU/FPS/memória em celular físico e cache/SW instalado. Projeções, raios de contato e cobertura de triângulos não substituem essa conferência.
- Alterados apenas `escritorioMini.ts`, `cena3d.ts` (ramo mini), `escritorioMini.test.ts` e este documento. Os 41 GLBs e o inventário ficaram intactos, pois as medidas de origem não mudaram. Cache, atividades por id, cenaBase, equipe, modo completo, componentes, CSS, privacidade e textos do produto não precisaram de alterações. Sem commit, push, build, instalação, publicação ou acesso a serviços/dados reais. Executores e logs temporários fora do repositório.
