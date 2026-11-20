# f32 — Entrada, ajustes e cartão do funcionário

## Antes e depois

- Entrada: apresentação só em texto e formulário sem destaque. Agora tem título acolhedor, Bemvindo em SVG, marca arredondada, formulário com acento verde, códigos tabulares e ações com ícones. Convite sem link usa EstadoVazio com AssessorDaCasa; falhas usam Erro, mantendo a sanitização de mensagens e e-mails.
- Primeiro uso: ritmo irregular e conclusão apenas textual. Espaçamento de 16 px, título de criação mais claro, ação de convite com ícone e conclusão com EstadoVazio/TudoEmDia. Limites, reserva, convites e etapas mantêm as regras originais.
- Ajustes: pessoas sem ícones por linha e tutorial do iPhone sempre aberto. Pessoas e convites agora têm chip de ícone, apoio em segunda linha e ações com ícones. Aparência recebe controles flexíveis; o tutorial completo continua disponível em details nativo, com alvo de 48 px. Falhas de leitura e lista de convites vazia usam EstadoVazio.
- Privacidade: termo corrido sem abertura visual. PrivacidadeOlho introduz o termo; títulos, texto e áreas de ação têm ritmo próprio. Papéis, resumo, exportação, confirmação e exclusão permanecem iguais.
- Backup: ações e confirmação de sucesso só em texto. Download destacado com ícone, formulário organizado, erro e sucesso com EstadoVazio/Erro e Backup. Não mudou a confirmação de download ou restauração.
- Cartão do funcionário: dois botões largos em contorno disputavam atenção com o conteúdo. Papel virou chip com ícone semântico, pergunta tem destaque e respostas têm ícones; controles secundários são discretos. Recolher/Expandir e tarefas/resumo controlam painéis separados por aria-controls. Cena mini tem altura visual menor; código 3D, import tardio, estados e seleção dos funcionários não mudaram.
- Componentes de apoio: acolhimento com Bemvindo e ações com ícones; avisos de desfazer e pendências com controles de 44 px; ajuda numérica e edição de nome com ícones e alvo explícito. Marca continua SVG decorativo, agora sem foco. Falha de carga usa EstadoVazio com recuperação; carregamento não exige animação.
- Perguntas/contagem: opções de resposta ganham ícone, itens têm chip de Casa e estados vazio/erro usam EstadoVazio.

## Restrições preservadas

Nenhum arquivo fora desta frente de produção foi alterado; src/estilo.css e as fundações f27/f28 não foram editados. Sem dependências ou imagens raster. CSS novo por tela e por componente, cores dos tokens existentes e movimento reduzido explícito no cartão. Os novos SVG, chips e dimensões não recebem valores financeiros; não há barra, cor ou tamanho calculado a partir de dinheiro oculto. Mantidos filtros de papel e vocabulário Assessor da Casa.

## Validação

- `npx tsc --noEmit`: zero erros.
- Suíte inteira pela API do Vitest: 71 arquivos aprovados, 1.345 testes aprovados e 3 todo preexistentes. Sem npm test.
- Quatro testes novos em arquivos .test.ts com createElement: erro de convite ilustrado sem e-mail, marca decorativa no carregamento, recuperação ilustrada e painel próprio da conversa. Todos foram executados contra os arquivos anteriores do HEAD e falharam; passaram com a implementação atual.
- Testes existentes de identidade passaram a aceitar SVG decorativo antes do texto. Seletores de tarefas passaram a distinguir o painel de tarefas do novo painel acessível da conversa; mantidas as verificações de interação e privacidade. A suíte global exercitou fechado → aberto → fechado e papéis restritos.
- `npx vite build` tentado antes e depois; `npx vitest run src/componentes/visual-f32.test.ts --cache=false` também tentado. Ambos bloqueados ao carregar vite.config.ts: esbuild não consegue ler os diretórios ancestrais no sandbox. Usada a API com configFile:false/config:false, mesmas opções de React, base './', assetsInlineLimit 4096, produção e geração do service worker. Alternativa reproduzível: `node scripts/verificar-f32.mjs` e `node scripts/verificar-f32.mjs test` dentro de codigo.
- Build inicial: index 1,88 KB gzip; partida JS 139,23 KB; CSS inicial 12,01 KB. Final: index 1,88 KB; partida JS 141,50 KB; CSS inicial 13,19 KB. Aumento JS +2,27 KB; combinado com CSS +3,45 KB gzip, abaixo de 5 KB. Ajustes, Privacidade e PrimeiroUso continuam em chunks separados; Three continua tardio. Avisos de chunk Three e import misto de escritorioMini já existiam.
- Acesso ao navegador tentado: “The browser access host is unavailable”. Não houve screenshot nem validação renderizada de 375 px/desktop/zoom/contraste. Layout foi revisado por código com quebra de texto, controles flexíveis e medidas mínimas; essa revisão visual permanece pendente.
- Nenhum servidor temporário ou navegador foi aberto. Scripts de edição/regressão e logs temporários removidos.

## Entrega

`git add codigo` bloqueado: `Unable to create .../central-da-familia/.git/worktrees/f32-entrada-ajustes-funcionario/index.lock: Permission denied`. O índice da worktree está fora da raiz gravável. Sem commit; alterações preservadas na worktree, prontas para revisão e commit em ambiente com acesso ao índice.
