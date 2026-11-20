# f29 — Início e dinheiro do dia

## Antes e depois

- Início: ação Plano 2029 apenas em texto, listas com iniciais, vazio genérico e pouca separação entre o valor e seu apoio. Agora tem ícone de objetivo, chips de gasto, estado vazio SemGastos com ação preservada, erro ilustrado com nova tentativa e ritmo de 24 px. O cartão do dia tem borda de destaque, respiro e números tabulares. A explicação de mudança ganhou ícone de ajuda.
- Gastos e entradas: totais com o mesmo peso, explicação longa sempre aberta, itens com iniciais e vazios genéricos. Agora o realizado tem indicadores de entrada, saída e saldo, com saldo maior; a precisão da explicação foi conservada em um details acessível. Linhas recebem ícones, controles de edição com alvo de 44 px e feedback; vazios usam SemGastos/TudoEmDia. Falha de leitura usa Erro e permite repetir a consulta existente.
- Anotar / Entrou dinheiro: seleção e destinos pouco destacados. Agora Gastei, Entrou dinheiro, Pix, cartão, trabalho, entrada extra e categorias da compra do Assessor da Casa têm ícones semânticos. Destinos de salvamento têm confirmação e chevron SVG, mais respiro, foco e alvo mínimo de 72 px. Valor digitado recebe superfície própria e números tabulares. Ausência de limite usa Plano2029. Preservados rascunho, teclado, textos de confirmação, salvamento e tratamento de parcelas.
- Meu orçamento: navegação apenas textual, ausência de limite só em texto e blocos compactos. Agora atalhos com ícones, cartão de hoje destacado, seções com ritmo consistente, vazio Plano2029 e erro ilustrado com tentativa. Ações Não gastei, Esqueci de anotar e metas usam ícones. Rolagem dos atalhos respeita prefers-reduced-motion.
- Envelopes: cabeçalhos sem chip e barra mostrando proporção mesmo com olho fechado. Agora têm chip semântico e ação com ícone e seta. Com o olho fechado a superfície é constante, sem barra, cor de estado, explicação variável ou geometria que codifique o uso do limite. As condições de permissão para anotar foram preservadas.
- Ritmo e gráficos: CSS local compartilhado melhora separação, tipografia tabular, contenção de largura e foco do gráfico. As guardas existentes de olho fechado e os cálculos/desenhos foram preservados.
- Painel: apenas texto nas falhas e ausência de feedback antes da leitura. Agora estados ilustrados de carregamento, erro e consulta vazia; indicadores tabulares, maior hierarquia e cabeçalhos que quebram linha.

## Limites respeitados

Nenhuma edição em estilo.css, fundações, API, cálculos, permissões ou roteamento. Sem dependências, raster ou recursos externos novos. Somente arquivos da frente e CSS novos importados pelas próprias telas/componentes. Ilustrações e ícones reutilizam f27/f28; as figuras têm geometria fixa. Listas de leitura continuam sem aparência enganosa de linha inteira clicável; ações permanecem nos controles nomeados. O Assessor da Casa mantém seu formulário sem valores.

## Verificação

- `npx tsc --noEmit`: zero erros (executado em codigo/).
- Suíte inteira: 71 arquivos, 1.346 testes aprovados, 3 todo preexistentes. Nenhum teste existente foi alterado.
- Cinco regressões novas em `src/componentes/dinheiro-f29.test.ts`, sem JSX, usando createElement: chip e ação nomeada do envelope; remoção de barra oculta; hierarquia dos indicadores; HTML idêntico para limites pequenos/estourados com olho fechado; EstadoVazio do Início com ilustração, nome acessível e callback preservado. Os três primeiros falharam antes da implementação; o teste adicional de geometria também detectou a versão intermediária que removia apenas a barra. Sem a mudança, o quinto não encontra a composição SemGastosInicio, e os demais não satisfazem as verificações.
- `npx vite build` tentado antes e depois: bloqueio de leitura dos diretórios ancestrais pelo esbuild ao carregar vite.config.ts. `npx vitest run src/componentes/dinheiro-f29.test.ts --cache=false` encontra o mesmo bloqueio. Build e testes executados pelas APIs dos mesmos Vite/Vitest com configuração equivalente: React, base './', assetsInlineLimit 4096, geração do service worker; seleção src/**/*.test.ts, timeout 30 s e cache desligado para não escrever no node_modules vinculado fora da worktree.
- Build antes: index 1,88 KB gzip; partida 139,23 KB; CSS de partida 12,01 KB. Depois: index 1,88 KB; partida 139,37 KB; CSS de partida 12,01 KB. Aumento inicial de aproximadamente 0,14 KB gzip, abaixo de 5 KB. CSS das telas e EstadoVazio estão em chunks separados; rotas continuam lazy.
- `git diff --check`: aprovado.

## O que ficou

A inspeção renderizada em 375 px, desktop, zoom e ambos os temas está pendente: a descoberta de navegadores retornou “The browser access host is unavailable”. Não se afirma validação visual/medição de contraste no navegador. O CSS foi revisado para quebra de linhas, alvos, foco e herança dos tokens; não foram abertas abas nem iniciados servidores. Processos de build, testes e TypeScript terminaram.

A entrada/autenticação e os cartões importados de Guardado/Escritório/Plano permanecem nas frentes proprietárias. Microcopy financeira de cálculo foi mantida para preservar precisão e testes. A conclusão visual em aparelho real ainda precisa da revisão acima.

## Entrega na worktree

git add codigo foi bloqueado ao criar central-da-familia/.git/worktrees/f29-inicio-dinheiro/index.lock (Permission denied), fora da raiz gravável. Não foi possível criar commit. As alterações permanecem nesta worktree.

