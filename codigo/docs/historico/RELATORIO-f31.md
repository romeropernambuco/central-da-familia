# f31 — Casa, Cartões e Escritório

## Antes e depois

- **Casa / Feira:** lista com uma linha de texto e vazios genéricos passou a ter chip de ícone, título e apoio (“Falta comprar” / “Na cesta”), checkbox com nome acessível e alvo mínimo de 44 px. Presenças e Assessores da Casa usam ícones da fundação. Lista, serviços e ausência de Assessores usam EstadoVazio ilustrado. A barra semanal fica neutra, com largura constante, quando o olho fecha; o aviso visual de excesso também deixa de revelar o sinal do saldo.
- **Casa / Serviços, Gás e Folha:** mantidos cadastros, visitas, pagamentos, cálculos e datas. Vazios agora usam CasaVazia ou AssessorDaCasa. Cards têm espaçamento consistente; números são tabulares; no celular, ações e valores podem ocupar outra linha sem comprimir o nome. Erros de configuração usam ilustração e preservam a explicação de recuperação automática.
- **Casa do Assessor:** mesma lista sem dinheiro, agora com ícone, apoio e checkbox nomeado. Vazios de compras, serviços e lista ilustrados; falha de leitura tem EstadoVazio e tentativa novamente. Preservados presença, confirmação de gás, envio adiado e desfazer.
- **CadastroAssessor:** aviso curto com ícone de privacidade e ícone na ação principal; campos, validações e convite mantidos.
- **Cartões:** cartões com cabeçalho em duas linhas, valor principal destacado, ritmo entre faturas e ícone nos controles de dias e salvamento. Estado sem cartões e erro de leitura ilustrados, mantendo ação e restrições existentes. Com olho fechado, cada mês conserva uma linha neutra, inclusive os zerados, sem agrupamento que revele ausência de gasto. Barras do simulador também têm geometria constante.
- **Escritório / Hoje:** navegação com ícones, introdução mais curta, equipe com linhas inteiras de pelo menos 72 px, seta, hover, foco e pressionado. O card vazio reservado ao 3D fica oculto quando o modo não o oferece; a grade ocupa a largura disponível. Motor, modelos e controles 3D não foram editados.
- **Escritório / Relatório e Lembretes:** indicadores com superfícies próprias e tipografia tabular; diário e lembretes vazios ilustrados. Ações “Já fiz” e “Adiar 1 dia” têm ícones. Erros de equipe e diário têm estado ilustrado com nova tentativa.
- **Ficha / NumerosAba:** resumo delimitado e números legíveis, seções espaçadas, cadastros com ícone por linha e ação de edição existente. Agora sem perguntas, histórico vazio e cadastro vazio usam ilustrações. Correção, cancelamento, salvamento, expansão do histórico e abertura da aba têm ícones. Estados continuam respeitando dados privados e permissões.
- **PrecisaDeVoce:** estado “Tudo em ordem” usa TudoEmDia e EstadoVazio, preservando a regra que não o mostra ao Assessor da Casa ou pessoa sem perguntas.
- **LerCupom:** orientação ilustrada antes da foto, estado de leitura e erros ilustrados; itens com chip de ícone e apoio de seleção; total em superfície destacada com números tabulares. Nenhuma mudança em foto, IA, conferência ou gravação.

## Escopo e acessibilidade

CSS novo e delimitado em `casa.css`, `cartoes.css`, `escritorio.css` e `ler-cupom.css`. `src/estilo.css`, fundações f27/f28, regras de negócio, APIs e permissões não foram alterados. Sem dependências ou raster. Cores vêm dos tokens; foco visível, controles nativos, ícones decorativos e movimento reduzido preservados. Telas continuam lazy. Conteúdo e componentes fora desta frente não foram redesenhados.

## Validação

- `npx tsc --noEmit`: zero erros.
- Suíte inteira: 71 arquivos, 1.346 testes aprovados e 3 todo preexistentes.
- Cinco regressões novas em `.test.ts`, usando createElement: lista do Assessor com ícone/apoio/nome acessível e sem dinheiro; estado vazio de cartões; geometria neutra das faturas inclusive zero; tudo em dia ilustrado; orientação ilustrada do cupom. As cinco falharam ao substituir os quatro componentes pelos originais de HEAD e passaram com a implementação. Os originais foram restaurados automaticamente após a verificação negativa.
- Ajustada uma expectativa em `privacidade-global.test.ts`: o teste exigia uma linha especial `fat zeros` com olho fechado. Agora exige linha neutra, pois distinguir o zero pela estrutura contrariava a privacidade visual. A varredura global de textos, atributos e formulários segue passando.
- `npx vite build` tentado antes e depois: bloqueado ao carregar vite.config.ts por leitura de diretório ancestral negada pelo sandbox. Build realizado pela API do mesmo Vite com `configFile:false`, plugin React, base `./`, assetsInlineLimit 4096 e geração de service worker no build final. Vitest também encontrou o bloqueio da configuração; a suíte rodou pela API de Vitest com `run:true`, `config:false`, cache desligado, mesmo include e timeout de 30 s, sem mudar a configuração versionada.
- Antes: index 1,88 KB gzip; partida 139,23 KB gzip; CSS inicial 12,01 KB gzip. Depois: index 1,88 KB; partida 141,69 KB; CSS inicial 12,74 KB. Crescimento da entrada JS: **2,46 KB gzip**; incluindo CSS inicial: **3,19 KB gzip**, abaixo de 5 KB. Folhas próprias de Casa, Cartões e LerCupom saem em chunks separados. Avisos de tamanho do Three e import misto de escritorioMini já existiam.
- `git diff --check`: sem erros.

## Limitações e entrega

Inspeção visual renderizada em 375 px e desktop pendente: inventário CUA respondeu `The browser access host is unavailable`. A revisão de responsividade foi de código; não há alegação de screenshots, medição de overflow ou contraste renderizado. Nenhum Chrome, aba ou servidor temporário foi aberto. Processos de verificação encerrados e scripts/logs temporários removidos.

`git add codigo` e commit tentados; bloqueados por `Permission denied` ao criar `central-da-familia/.git/worktrees/f31-casa-cartoes/index.lock`, fora da raiz gravável. Entrega preservada na worktree, sem commit.
