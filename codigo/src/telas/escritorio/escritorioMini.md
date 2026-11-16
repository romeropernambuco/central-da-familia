# Escritório real no mini

Apenas `mini: true` recebe os modelos Kenney Furniture Kit 2.0 (CC0). O escritório completo conserva construção, roupas, luzes, percursos e câmeras. Os 41 GLBs foram inspecionados localmente: JSON, nós, hierarquia, materiais, escalas, origem e vértices transformados. O registro reproduzível está em `inventarioModelos.json`; o teste compara esse registro com cada original. Os assets não contêm imagens, texturas ou dependências externas.

## Composição e contato

Todas as salas têm piso modular, duas paredes em L com janela, tapete, mesa, cadeira giratória, monitor lateral emissivo na cor da roupa, teclado, mouse, luminária, planta, estante e um colega ocupado mais escuro ao fundo. O colega usa o mesmo construtor de bonecos. A recepção usa o próprio desk, reduzido/girado, como mesa lateral para a cafeteira, sem outro download.

O desk original mede 0,734475 × 0,384408 × 0,392300; chairDesk mede 0,334950 × 0,607600 × 0,314299. As origens não estão no centro. A composição preserva transforms internos, centraliza X/Z pela caixa real e apoia o mínimo Y na superfície de destino. A escala vertical dos móveis principais é 1,65. O tampo resulta em **Y=0,6452724574**; o assento, medido por raio na face horizontal do material carpet, em **Y=0,3962749977**. Não se usa o topo do encosto como altura de sentar.

A face inferior da coxa encosta no assento; o quadril fica acima conforme espessura e ângulo da perna. As canelas são ajustadas para apoiar os sapatos no tapete. IK de dois segmentos coloca as mãos no teclado/mouse; a oscilação de digitação continua. O menor Y dos objetos de cada atividade é apoiado no tampo medido; escala e deslocamento são aplicados ao grupo, conservando seus pivôs animados. Os 18 ids ficam sentados na versão GLB; o fallback conserva as posturas anteriores.

## Desempenho por sala

Pior caso entre **todos os ids da sala e os quatro estados**, nas três proporções testadas. Medição dos buffers reais por travessia da cena com renderer simulado: uma chamada por mesh/material, triângulos multiplicados por instância e peças visíveis de gesto incluídas. **Não é uma captura de GPU.** Os modelos novos e o protagonista não geram passes adicionais de sombra; o cenário de caixas fica oculto após a troca. Limites: 40 chamadas, 60.000 triângulos e **150.000 bytes de GLB por variante fria** (KB decimal).

| Sala | Variante | Desenhos máx. | Triângulos máx. | KB GLB | Bytes GLB |
| --- | --- | ---: | ---: | ---: | ---: |
| caixa | Mesa em L e rádio na ala lateral | 29 | 4.103 | 148,520 | 148520 |
| casa | Café em console lateral, encomendas e planta | 31 | 4.003 | 139,296 | 139296 |
| cartoes | Arquivo de faturas, caixas e livros | 30 | 3.741 | 132,828 | 132828 |
| patrimonio | Duas estantes e livros em três níveis | 32 | 4.425 | 127,428 | 127428 |
| recepcao | Sofá de espera e café em mesa lateral | 29 | 3.951 | 143,540 | 143540 |
| gestao | Mesa mais larga, móvel com tela de TV | 30 | 3.613 | 131,088 | 131088 |
| apoio | Bancada técnica, caixa aberta e arquivo | 29 | 3.597 | 132,832 | 132832 |

Partes estáticas únicas são fundidas por material com `BufferGeometryUtils.mergeGeometries`, preservando normais e cores de vértice. Piso, móveis e livros repetidos usam `InstancedMesh`; as atividades mantêm instâncias de teclas, moedas, envelopes etc. Apenas grupos articulados permanecem separados. Sem luz, textura ou sombra nova. A tela usa emissão de material.

## Câmera por id

Percentual da altura projetada do boneco trabalhando. A câmera ortográfica usa caixas reais e proporção do contêiner. Os testes projetam também cabeça, atividade, sala e gestos nos quatro estados, exigindo **margem ≥5%** e funcionário entre 50% e 75%. A reserva normal é 8,75%. Resize altera apenas projeção/DPR/tamanho, mantendo cena, personagens e renderer. A direção individual vem da atividade, com elevação reduzida para a nova cenografia.

| Id | 303×128 | 303×180 | 560×180 |
| --- | ---: | ---: | ---: |
| contador | 65,21% | 63,45% | 65,21% |
| colchao | 66,44% | 62,99% | 66,44% |
| tesoureiro | 64,33% | 64,33% | 64,33% |
| folha | 65,63% | 65,63% | 65,63% |
| comprador | 65,92% | 63,15% | 65,92% |
| fiscal | 66,06% | 63,26% | 66,06% |
| cartao | 63,71% | 63,71% | 63,71% |
| assistente | 63,27% | 63,27% | 63,27% |
| guardado | 66,47% | 63,05% | 66,47% |
| usina | 64,86% | 63,39% | 64,86% |
| secretaria | 67,50% | 61,84% | 67,50% |
| presenca | 66,75% | 63,53% | 66,75% |
| auditor | 69,24% | 68,53% | 69,24% |
| anfitriao | 67,62% | 63,21% | 67,62% |
| sonhadora | 66,89% | 62,59% | 66,89% |
| analista | 68,24% | 61,95% | 68,24% |
| zelador | 65,89% | 63,80% | 65,89% |
| protetora | 68,31% | 62,12% | 68,31% |

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

- TypeScript sem erros. **775 testes passaram**: os 738 existentes e 37 casos novos, em 45 arquivos.
- Contraprova: cena3d, atividadesMini e SW repostos com HEAD; carregador desativado e inventário vazio, mantendo contratos dos módulos novos para coletar a suíte. **37/37 casos novos falharam**. Implementação restaurada e casos novos novamente aprovados.
- `npm test` encontrou acesso negado ao carregar vite.config.ts. Execução pela API startVitest, com executor/cache fora do repositório. Nenhum build foi executado.
- **Inspeção visual WebGL não realizada**: host do navegador conectado indisponível. Legibilidade em 128 px, oclusões, estética das poses, materiais, renderer.info real, GPU/FPS/memória em celular físico e cache instalado precisam de conferência no navegador. Projeções e contagens geométricas não substituem essa conferência.
- Nenhuma alteração em AgenteDaAba.tsx, estilo.css, App.tsx, privacidade, dados, equipe.ts, Cena3D.tsx ou GLBs. Sem commit, push, instalação ou publicação. O Vite 5199 não foi encerrado.
