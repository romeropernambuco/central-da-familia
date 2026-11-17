# f27 — Sistema visual

## Auditoria inicial
Inspeção do código de entrada, navegação, Início, Casa, Guardado/Imóveis, Cartões, Planejamento, Desejos, Escritório, Ajustes e componentes compartilhados, antes das alterações:
- Ícones Lucide variavam de 16 a 28 px; Anotar usava traço 2,25, demais ícones herdavam 2. Faltava tratamento decorativo consistente.
- Ações se dividiam entre `primary`, `dark`, `line`, `ghost`, `danger`, `lnk` e controles locais. `btn.sm` tinha 36 px, pills 40 px e ajuda 28 px com área virtual de toque.
- Espaçamentos de 6, 10, 14 e 18 px conviviam com os de 8/16/24; entrada usava gap inline de 14 px. Cabeçalhos e seções tinham ritmos diferentes.
- Raios existiam, mas cards, tiles e controles não tinham hierarquia compartilhada. Sombras eram reservadas à navegação flutuante; cartões tinham separação muito discreta.
- Cards financeiros e resumos clicáveis não tinham hover/pressionado uniforme; o resumo Rumo a 2029 não tinha seta. Links de ação tinham pouca aparência de controle.
- Menu ativo dependia principalmente da cor do ícone; grupos não eram separados. A lista Mais não indicava a tela atual.
- Lista de compras, Assessores da Casa, últimos lançamentos, rendas e cabeçalhos do Guardado tinham rótulos apenas de texto onde um ícone ajudaria.
- Estados vazios não aceitavam ilustração; erro, espera e badges não compartilhavam uma linguagem visual.

A inspeção renderizada ficou bloqueada: o serviço de acesso ao navegador retornou “The browser access host is unavailable”. Não houve validação visual em 375 px, paisagem ou zoom; a revisão foi de código, sem alegar comparação por screenshots.

## Entrega
- Tokens de superfícies em três níveis, sucesso/aviso/erro/info, escala 4/8, tipografia, raios, sombras e durações. Preservados verde, fontes e temas automático/claro/escuro.
- `Icone.tsx`: 20 px, traço 1,75, decorativo por padrão e nome opcional para ícone informativo. Mapa semântico único para menus, ações, estados e funcionários; aplicado a todos os menus e aos ícones existentes das telas/componentes.
- `base.tsx`: Botao com cinco variantes, carregando/desativado; cabeçalhos de tela/cartão, cartão de navegação e selo de estado. Migração gradual de ações em entrada, Guardado, Imóveis, Cartões, Desejos, lançamentos, orçamento e recebimentos.
- Cabeçalhos com chips, cards delimitados, listas e controles com feedback, foco explícito e alvos compartilhados de pelo menos 44 px. Dinheiro mantém números tabulares e sua lógica original.
- Menu com separação visual de grupos, ativo por cor e marcador, Anotar destacado; Mais conserva destinos, permissões e fechamento, e informa seleção.
- Entrada com hierarquia, medidas e superfícies consistentes, mantendo todos os textos e fluxos.
- `EstadoVazio` mantém o alias `Vazio` e oferece `ilustracao?: ReactNode`; sem slot preenchido usa ícone grande. A f28 não foi alterada. Decorações adicionadas não dependem de valores, nem variam com patrimônio ou renda.

## Validação
- `npx tsc --noEmit`: zero erros.
- Suíte completa: 69 arquivos verdes, 1.303 testes aprovados e 3 todo já existentes. Após o último ajuste de layout, mais 68 testes de componentes aprovados.
- Três regressões `.test.ts`, com createElement: carregamento impede envio repetido e anuncia espera; ícones decorativos/informativos; slot substitui fallback preservando mensagem/ação. Todas falharam com base anterior e ícone Lucide direto, e passaram com a fundação.
- `npx vite build` foi tentado antes das mudanças, mas esbuild não pôde ler diretórios ancestrais ao carregar vite.config.ts. Build comparável antes/depois pela API Vite com configFile:false, React, mesma base, destino, limite inline e geração de service worker. Vitest também executado pela API com a mesma seleção `src/**/*.test.ts`, timeout 30 s e cache temporário dentro da worktree: a configuração padrão tentava escrever no node_modules vinculado fora dela.
- Inicial: entrada index 1,88 KB gzip, partida 138,20 KB gzip, CSS principal 10,71 KB gzip. Final: index 1,88 KB, partida 139,23 KB (+1,03 KB), CSS 12,01 KB (+1,30 KB). Crescimento combinado inicial: 2,33 KB gzip, abaixo dos 5 KB.
- Nenhuma dependência, raster ou importação 3D antecipada adicionada. Preservados testes de olho fechado e acesso do Assessor da Casa.
- Servidores temporários encerrados e arquivos temporários removidos. `git add codigo` bloqueado: Permission denied ao criar `central-da-familia/.git/worktrees/f27-sistema-visual/index.lock`, fora da raiz gravável. Alterações permanecem na worktree, sem commit.

## Próximas frentes
- f28 pode preencher o slot de ilustração com SVG leve e sem codificar valores privados em forma/cor/tamanho; nome acessível apenas quando informar.
- Completar a migração gradual das classes antigas para Botao nas folhas restantes; elas já recebem os estilos compartilhados.
- Revisar renderização em celular 375 px, paisagem, desktop, zoom e ambos os temas quando o acesso ao navegador estiver disponível. Conferir especialmente cabeçalhos com nomes longos e telas densas do Escritório.
