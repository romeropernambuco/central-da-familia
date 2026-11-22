# f33 — cartão compacto, conteúdo primeiro

Medição real em Chrome headless, 375×812, modo exemplo, 17/11/2026. Script Node temporário por CDP, servidor HTTP local e navegador encerrados ao terminar. O script e suas evidências ficam fora do commit, em ../.f33-temporario/codigo/. Para repetir a medição a partir de codigo/: `node ../.f33-temporario/codigo/.f33-medicao.mjs ../.f33-temporario/codigo/repeticao.json`. O navegador ignora o service worker durante a medição para ler o build atual. Fontes carregadas; não é estimativa por CSS. Alturas antes reproduziram as informadas na solicitação.

## Alturas por aba

- Início: 789.4 → 288.0 px; com pergunta; revisita 288 px; conteúdo “Hoje você pode gastar” em y=594.0 px.
- Guardado: 789.4 → 288.0 px; com pergunta; revisita 182 px; conteúdo “Rendeu hoje” em y=568.0 px.
- Casa: 757.4 → 288.0 px; com pergunta; revisita 182 px; conteúdo “Hoje, terça 17/11” em y=555.0 px.
- Cartões: 729.4 → 318.0 px; com pergunta; revisita 164 px; conteúdo “Nubank” em y=679.8 px.
- Escritório: 729.4 → 268.0 px; com pergunta; revisita 164 px; conteúdo “3 coisas precisam de você hoje” em y=535.0 px.
- Lançamentos: 575.0 → 226.0 px; sem pergunta; revisita 140 px; conteúdo “nov/26” em y=505.2 px.
- Orçamento: 519.0 → 226.0 px; sem pergunta; revisita 140 px; conteúdo “Ana, hoje” em y=571.0 px.
- Desejos: 519.0 → 226.0 px; sem pergunta; revisita 140 px; conteúdo “Quero…” em y=401.0 px.
- Ajustes: 519.0 → 226.0 px; sem pergunta; revisita 140 px; conteúdo “Família Silva” em y=403.0 px.
- Privacidade: 519.0 → 226.0 px; sem pergunta; revisita 140 px; conteúdo “Termo de uso, em 1 tela” em y=513.0 px.
- Planejamento: 835.8 → 226.0 px; sem pergunta; revisita 140 px; conteúdo “Rumo a 2029” em y=403.0 px.

Todas as onze abas: scrollWidth/clientWidth = 375/375 depois. Antes, Privacidade = 376/375. Os títulos acima são os primeiros títulos de conteúdo após o cabeçalho da página, fora do cartão do funcionário. O número de hoje do Início foi trazido para antes dos dois blocos de Plano 2029, seguindo a ordem de leitura e de teclado. Os limites de 330/230 px foram conferidos por asserções no script; formulários, detalhes e cadastros abertos explicitamente podem crescer, sem corte de conteúdo.

## Composição e comportamento

Cena com 112 px de altura e identidade ao lado, sem nome em linha anterior. No celular de 375 px, a cena mede aproximadamente 152×112; recolhida, 80×64. O papel e “Com X” estão no mesmo bloco de identidade; o aviso completo de exemplo continua acessível e no title. Só texto não monta a cena. Respostas usam fileira com wrap, altura mínima de 44 px e rótulos curtos; aria-label e title mantêm o rótulo integral. O contexto fica em “Detalhes”, com máscara de privacidade. Recolher e tarefas/resumo compartilham a linha de ações.

A visita é lembrada em sessionStorage por modo, família, membro, usuário e aba. Primeira visita aberta; revisita móvel recolhida para perguntas já conhecidas. Nova identidade de pergunta, celebração, carregamento e erro reabrem a conversa. A pergunta resumida e Responder continuam acessíveis. A saudação integra a fala apenas na primeira visita sem pergunta, e é dispensada quando a fala já contém o nome. Perguntas que já incluem o nome não recebem outra saudação. Storage indisponível mantém o cartão utilizável e aberto. Desktop não recolhe automaticamente: Início mediu 272 px em 1280×900.

## Privacidade e 3D

O input de arquivo de Restaurar de uma cópia tinha largura intrínseca de 339 px e alargava a coluna do grid; seu limite direito chegava a 376 px. min-width:0 na .campo e width:100%/min-width:0/box-sizing:border-box no input corrigem a causa, sem overflow:hidden ou corte. Os ajustes estão em apoio-f32.css.

Nenhuma alteração no motor 3D, montarCena, composicaoMini ou limites de desenho. A projeção existente reage ao aspecto do contêiner. O teste de silhueta continua cobrindo 303×128 e passou também em 152×112 e 80×64: todas as 21 duplas mantêm diferença de cobertura ≥4%. A mudança das proporções acompanha os tamanhos reais da composição ao lado da identidade. Mantidos reduced-motion, descarte dos renderers, funcionários autorizados, Assessor da Casa e testes globais do olho fechado. Raster geométrico e Chrome com software GPU não substituem avaliação de legibilidade em celular físico.

## Validação e carga

- npx tsc --noEmit: saída 0, nenhum erro.
- Suíte inteira: 74 arquivos, 1.365 testes aprovados e 3 TODO preexistentes. Só arquivos *.test.ts; testes React usam createElement. npm test não foi usado.
- As chamadas npx vite build e npx vitest run encontram bloqueio de leitura de diretório ancestral ao empacotar vite.config.ts neste ambiente. Foram executadas; a validação usou as APIs dos mesmos Vite/Vitest instalados, com configFile:false e a configuração original transpilada temporariamente (plugins, modos, SW e seleção de testes preservados). Nenhuma mudança de configuração do projeto foi necessária.
- Build production antes/depois: chunk partida JS 141,84 → 142,55 KB gzip (+0,71 KB); entrada index JS 1,88 → 1,89 KB; CSS partida 14,07 → 14,45 KB. Mesmo somando esses aumentos, permanece muito abaixo de +5 KB gzip. Three continua em import tardio.
- Contraprova: componentes e CSS originais repostos temporariamente via git show, sem reverter testes. Os três novos testes de integração f33 e os dois casos novos de proporção falharam; implementação restaurada. Suíte completa depois verde. Testes antigos atualizados apenas para nomes curtos, Responder e contexto agora em Detalhes, mantendo verificações de privacidade e rótulos acessíveis completos.
- src/estilo.css não foi editado. Script, perfis do Chrome, logs, imagens e configurações temporárias não entram no commit.

## Entrega na worktree

`git add codigo` e o commit foram tentados. Ambos bloqueados por Permission denied ao criar `<pasta do projeto>/.git/worktrees/f33-cartao-compacto/index.lock`. Alterações preservadas na worktree, sem commit. Nenhum processo de navegador ou servidor desta medição ficou aberto.
