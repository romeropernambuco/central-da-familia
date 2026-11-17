# f28 — Ilustrações

Criadas 17 ilustrações SVG inline, com viewBox 160×120, formas arredondadas, traço fino e cores exclusivamente dos tokens do tema. Sem raster, dependências novas, dados pessoais ou financeiros. A geometria é constante: não recebe valor, quantidade ou papel. Assessor da Casa aparece de forma respeitosa, com pessoa e cesta.

## Uso nas próximas frentes

Importação nominal: `import { SemGastos } from './componentes/ilustracoes'`. Para seleção por nome: `<Ilustracao nome="SemGastos" />`; mapa tipado `ilustracoes` e tipo `NomeIlustracao` exportados no índice. Todas são decorativas por padrão (`aria-hidden`, sem foco). `titulo` não vazio cria `<title>` com id único, `role="img"` e `aria-labelledby`. `animada` é opcional, desligada por padrão: uma passagem de 3 s, sem repetição, desativada por movimento reduzido.

Novo `componentes/EstadoVazio.tsx`, com CSS próprio: `ilustracao`, `titulo`, `frase`, `acao?: { texto, aoClicar, desabilitada? }`. Título h2, região nomeada, botão nativo de pelo menos 44 px e foco visível. A figura é decorativa porque o texto já descreve o estado. Não concede acesso a dados; as telas continuam responsáveis por permissões e por selecionar mensagens compatíveis com privacidade.

Galeria DEV, fora do menu: com Vite em desenvolvimento, abrir `/src/componentes/ilustracoes/galeria.html#/galeria`. Mostra as 17 figuras, EstadoVazio com/sem ação, figura informativa, temas claro/escuro e movimento opcional. A entrada tem guarda `import.meta.env.DEV` e import dinâmico: até um build explícito dessa entrada elimina a galeria e seus estilos. Não é uma entrada do build normal. Os tokens de amostra claro/escuro estão isolados na galeria; as figuras usam os tokens herdados do app.

Não foram alterados roteador, telas, estilo.css, base.tsx ou AgenteDaAba.tsx. Integrar EstadoVazio e figuras às telas cabe à f27 e às próximas frentes. Um atalho `#/galeria` na raiz do app requer futura alteração no roteador; esta frente oferece a rota na página interna independente, respeitando o limite de arquivos autorizado.

## Verificação

- `npx tsc --noEmit`: 0 erros.
- Suíte completa: 69 arquivos aprovados, 1.338 testes aprovados, 3 todo existentes. Inclui 38 testes novos em `ilustracoes/ilustracoes.test.ts` (createElement, arquivo .test.ts). A execução inicial dos testes novos falhou antes da implementação, por ausência da biblioteca.
- Verificados todos os SVG: até 4.096 bytes renderizados, viewBox, sem conteúdo ativo, imagens, referências externas ou cores literais; título e ids únicos; mapa; EstadoVazio; CSS de foco, toque e movimento reduzido; exclusão da galeria em build production real de sua entrada.
- `npx vite build` e `npx vitest run src/componentes/ilustracoes/ilustracoes.test.ts --cache=false` encontram bloqueio de leitura do esbuild nos diretórios ancestrais ao carregar vite.config.ts neste sandbox. Foram executados pelas APIs dos mesmos Vite/Vitest, com `configFile:false`/`config:false`, sem editar configuração versionada. Build com base './', plugin React e geração do service worker; Vitest com include `src/**/*.test.ts`, timeout de 30 s e cache desligado para evitar escrita na junction node_modules externa.
- Build antes/depois: entrada `index-CtKpxgIO.js` 3,63 KB / 1,88 KB gzip; módulo `partida-7fb-pBUg.js` 425,93 KB / 138,20 KB gzip. Mesmos hashes: aumento de 0 bytes, abaixo do limite de 5 KB gzip. Nenhuma figura ou galeria é importada pelo app nesta frente.
- Prévia temporária da galeria compilada com sucesso. Conferência visual no navegador não realizada: o serviço de acesso ao navegador respondeu “The browser access host is unavailable”. Não foi criada aba. Servidores e artefatos temporários encerrados/removidos ao final. Revisão visual humana continua pendente.

A busca auxiliar da skill ui-ux-pro-max também ficou indisponível porque o executável Python não pôde iniciar. Foram aplicadas as orientações de acessibilidade, tokens e movimento reduzido do próprio SKILL.md.

## Entrega na worktree

Commit tentado com a mensagem `feat: cria biblioteca de ilustracoes e estado vazio f28`. Git bloqueado: `Unable to create .../central-da-familia/.git/worktrees/f28-ilustracoes/index.lock: Permission denied`. Os arquivos novos ficam preservados na worktree, sem commit. A limpeza foi concluída com Remove-Item sem Force; não há artefatos de prévia ou logs temporários na entrega.
