# f30 — Patrimônio e Plano 2029

## Escopo e direção

Tema e tokens existentes preservados. Sem dependências, imagens raster, alterações no motor, APIs ou permissões. `src/estilo.css` não foi editado. CSS novo em `guardado/guardado.css`, `planejamento/planejamento.css`, `desejos/desejos.css` e `componentes/patrimonio-plano.css`, com seletores limitados a esta frente. Reuso de Icone, EstadoVazio e SVGs f28.

## Antes e depois por tela

- **Guardado:** o rendimento já era o número principal, mas os blocos tinham pouca distinção. Agora há superfície com acento verde, resumos separados, linhas de aplicação com seta, foco e estados de interação. O primeiro uso recebe SemAplicacoes; falha recebe Erro com nova tentativa. Aportes, resgates e encerramento mantêm os fluxos anteriores.
- **Cartão Guardado e atalhos:** destino, nomes acessíveis e roteamento preservados. O cartão ganha foco destacado e alvo mínimo; os atalhos continuam usando o mecanismo existente, inclusive reabertura na mesma aba. `atalhos.ts` não precisou mudar.
- **Imóveis:** linhas ganham chevron, ícone em chip e valor separado no celular. Patrimônio total ganha destaque numérico. SemImoveis e Erro substituem estados só de texto. O convite existente para cadastrar imóvel foi preservado por ser parte do fluxo testado; sua ação principal recebe ícone.
- **Planejamento:** cabeçalhos com chips, ritmo de cartões, campos com espaço e linhas de renda com ícones. Números tabulares. Rendas e metas vazias usam EstadoVazio. Previsão oculta tem rótulo e tratamento neutros.
- **Recebimentos:** linhas com chip de relógio, ações com ícones e valores separados no celular. SemRecebimentos e Erro dão contexto aos estados da lista. Origem, certeza, recorrência, confirmação e desfazer permanecem iguais.
- **Parâmetros:** estilos locais refinam cabeçalho, campos, foco, alvos e disposição no celular; as explicações e todos os campos técnicos continuam disponíveis.
- **Reajuste:** ações com ícones, área de decisão com espaçamento e leitura mais confortável. Votos, vigência e aplicação não foram alterados.
- **Desejos:** formulário com ritmo regular, resultado destacado, chips nas linhas e SemDesejos no primeiro uso. Resultado e cores derivadas do veredito não aparecem com o olho fechado.
- **Rumo a 2029:** ícones na decomposição da renda, valores destacados, premissas em disclosure e superfície mais leve. Ausência de dados/erro recebe EstadoVazio. A versão oculta é invariável entre saldos/coberturas, com barra neutra e sem geometria do gráfico.
- **Linha2028 e renda após a virada:** tipografia tabular, disposição em coluna no celular e estado fixo quando oculto, sem sinal, cor ou quantidade de meses derivada dos valores.
- **Cenários de receitas:** cartões separados, números maiores e cenário selecionado identificável. Com o olho fechado, a comparação financeira não é desenhada.
- **Fontes de receita:** ícones na identificação da origem, recorrência e confirmação. Formulário e validações preservados.
- **Atualizar números:** ícone por tipo de item e estado TudoEmDia para lista vazia. Links, conferência de data e edição existente de imóvel preservados.
- **Impacto2029:** ícone de objetivo e texto fixo quando oculto, sem revelar se a perda foi positiva, zero ou de outro tamanho.

## Acessibilidade e celular

Seletores próprios definem alvos de pelo menos 44 px, foco de 3 px com afastamento, feedback de hover/pressionado e redução de movimento. Grades móveis usam `minmax(0,1fr)`, quebra de texto e valores em segunda linha. SVGs decorativos continuam escondidos da árvore acessível. Texto/ações acessíveis existentes foram preservados.

## Validação

- `npx tsc --noEmit`: zero erros.
- Cinco testes novos em `src/componentes/patrimonio-f30.test.ts`, sem JSX: estado vazio ilustrado de imóveis, affordance/nome acessível da linha, erro ilustrado com ação, privacidade visual do hero e privacidade da linha/renda.
- Os testes foram verificados contra os componentes originais para comprovar regressão, e com as mudanças para comprovar correção.
- A execução direta de `npx vite build` foi tentada antes das alterações e bloqueada pelo esbuild ao resolver a configuração: acesso negado a diretório ancestral fora da worktree. O build foi medido antes/depois pela API do Vite com os mesmos plugins React e service worker, `base: './'`, configuração de produção padrão e `preserveSymlinks` para as dependências compartilhadas.
- Vitest também foi executado pela API com `configFile: false`, JSX automático, inclusão `src/**/*.test.ts`, timeout de 30 s e cache desativado (o cache padrão estava no node_modules compartilhado sem escrita). Não foi usado `npm test`.
- Entrada JavaScript: **139,23 → 141,68 KB gzip**, diferença **+2,45 KB**. CSS de entrada: **12,01 → 12,76 KB gzip**, diferença **+0,75 KB**. Total adicional de JS + CSS: **3,20 KB gzip**, abaixo dos 5 KB. As telas continuam em chunks lazy separados.

## Limitações e o que ficou

O host de acesso ao navegador retornou indisponível nesta sessão. Portanto, não há aprovação visual por screenshot de 375 px/desktop nem medição real de overflow em navegador; a adaptação foi implementada em CSS e verificada estruturalmente. Não foi aberto Chrome nem iniciado servidor temporário.

Explicações financeiras, premissas, histórico e microcopy usados pelos testes de negócio permanecem disponíveis; não houve simplificação que removesse a precisão das contas. Fundamentos f27/f28 não foram recriados nem modificados.

Resultado final da suíte: **71 arquivos aprovados; 1.346 testes aprovados e 3 todo preexistentes** (1.349 casos). Os cinco testes novos falharam individualmente contra os componentes originais e passaram novamente após restaurar as mudanças. Verificação final de TypeScript sem erros.

Commit bloqueado pelo sandbox: git add codigo não pôde criar o index.lock no diretório Git compartilhado fora da worktree (Permission denied). Alterações e relatório permanecem na worktree, sem commit. Arquivos temporários removidos; nenhum servidor ou navegador foi deixado aberto por esta frente.
