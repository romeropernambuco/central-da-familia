# Proposta D · Rumo a 2029 · Versão 2

## Conceito

O Início abre com a meta da família de viver de rendimentos a partir de 2029 e a falta mensal no cenário oficial.  
O limite de hoje e as tarefas prioritárias transformam esse objetivo em decisões para agora.  
Aplicações, imóveis e receitas previstas têm um indicador cada, com responsáveis visíveis no escritório.

## Hierarquia da primeira tela

- **Em 2 segundos.** “Rumo a 2029” e a falta mensal com margem, no maior corpo numérico.
- **Em 5 segundos.** A trilha de 2026 a 2029 mostra a meta e “Você está aqui” com o percentual de cobertura em 36 px. O orçamento e a fila ficam juntos, logo depois do plano.
- **Depois.** O cenário sem margem e a fila completa abrem sob demanda. No celular, o escritório vem antes dos motores. No desktop, os três motores ocupam uma linha e o escritório ganha um palco à direita da ficha da equipe.

## Crítica da primeira versão e correções

1. A linha fina desaparecia no painel. A trilha passou a ter 15 px de espessura e um preenchimento verde sólido.
2. A cobertura tinha peso de nota de rodapé. O percentual passou para 36 px, em tabulares, com o símbolo menor e colado.
3. A posição atual era difícil de localizar. Um ponto branco com contorno e haste marca a ponta do trecho preenchido. A trilha tem proporções próprias no desktop para preservar a forma dos pontos.
4. Faltava um destino com significado. Os marcos 2026–2029 acompanham a curva e a bandeira nomeia a meta “Viver de rendimentos”.
5. Dois cenários concorriam pelo olhar. A falta oficial com margem permanece no herói e a alternativa sai da árvore até abrir o detalhe.
6. O cenário secundário podia repetir o valor oficial. Quando os dois são iguais, o detalhe indica a equivalência em texto.
7. Os motores pareciam três cartões genéricos. Cada um recebe uma ilustração do projeto, um valor com contexto e acesso ao responsável.
8. A associação entre números e pessoas era fraca. O botão do motor leva ao escritório, seleciona a pessoa e realça sua sala.
9. A miniatura do escritório tinha pouco espaço. A cena usa toda a largura disponível no celular e tem área de até 760 px no desktop. As plaquinhas de funcionários e os nomes de sala ganham respiro.
10. As fichas da equipe mostravam apenas estado. Ao selecionar alguém, a maquete pode mostrar um único balão de valor, com significado na ficha e proteção pelo olho. O balão aparece quando acrescenta um valor diferente do indicador do motor.
11. A ordem de teclado no celular pulava para a barra inferior antes do conteúdo. A ordem no documento acompanha a posição da navegação nos dois formatos.
12. Uma fila com somente pendências financeiras podia parecer indisponível ao Assessor da Casa. A vista agora apresenta o estado vazio quando a consulta foi concluída e nenhuma tarefa doméstica se aplica.

## Sistema visual

**Manrope Variable + Inter Variable.** A Manrope em 800 aproxima o peso geométrico da Wise nos títulos e valores. A Inter mantém a leitura de rótulos e controles próxima da Revolut.

- **Escala.** 12/16 px e peso 650–700 para rótulos, 13/16 px e 650 para ações, 14/19 px e 400 para tarefas, 16/20 px e 800 para subtítulos, 22/26 px e 800 para títulos de seção. Valores em 28/31 px ou 36/40 px, peso 800, tabulares e em uma linha. O H1 usa 42/43 px no celular e 60/61 px no desktop.
- **Claro.** Fundo sálvia `#e9ede6`, cartões `#ffffff`, camadas de apoio `#e1e7dd`, texto `#17201a` e secundário `#4b564e`. O painel do plano alterna para `#15221b` com texto `#f5f8f3` e secundário `#c0cdc3`.
- **Escuro.** Fundo `#0c0c0b`, cartões `#131312`, menu `#1a1918`, painel `#1c2b21`, texto `#f1f4ee` e secundário `#b8c1b8`. Divisórias, preenchimentos discretos e a maquete usam misturas em OKLCH.
- **Destaque único.** Verde folha `#426435` no claro e sua versão clara `#b6dfa0` nas superfícies escuras. Dinheiro em risco tem vermelho semântico `#96342d` ou `#ffa69e`. Operação e Lembrete usam texto e ícones próprios em superfícies neutras. Cartões usam raio de 12 px, grupos menores 8 px e o selo 6 px. Ações usam pílulas.

## Medição e escritório

- **375 × 812, claro e escuro.** A casca mediu **3** ocorrências acima da dobra, uma a menos que na versão 1. São a falta com margem, a cobertura e o orçamento de hoje.
- **1280 × 800, claro e escuro.** A casca mediu **6** ocorrências, uma a menos que na versão 1. Aos três números do celular somam-se os três motores. As medidas usam o snapshot de exemplo, com fontes carregadas, olho aberto e cenário alternativo recolhido.
- **Checagem no navegador.** As quatro combinações ficaram sem rolagem lateral e sem sobreposição entre as plaquinhas e os nomes das salas na cena inicial. Os controles da proposta mediram pelo menos 44 px nos dois eixos. Abrir o cenário acrescentou uma ocorrência. O atalho do motor focou o escritório, mostrou o balão e o olho fechado retirou todas as ocorrências da medição.
- **Quem trabalha por você.** O escritório mostra oito pessoas nas mesas, com plaquinhas de nome e ícones de estado. Avatares de 32 px com controles de pelo menos 44 px selecionam Gestor do Guardado, Ajudante dos Imóveis ou Tesoureiro de Receitas. A ficha anuncia a pessoa e seu estado. As duas funções de patrimônio compartilham a sala. O balão associado ao responsável usa dados do contrato e aparece após seleção explícita.
- **Privacidade.** O olho da casca ou a prop `oculto` retiram valores, marcadores e a geometria de cobertura da árvore renderizada. Os textos livres das tarefas também são ocultados porque o contrato fornece a pergunta completa em uma única string. A vista do Assessor apresenta somente tarefas operacionais da casa por tipo de pendência.

## Mudança em relação ao Início atual

O plano ganha o primeiro lugar, o orçamento vira uma decisão do dia e a fila longa passa a mostrar primeiro até duas tarefas ordenadas por risco, operação e lembrete. O selo Exemplo aparece uma vez. O plano, o dia e os motores têm papéis tipográficos distintos. Lançamentos, faturas, envelopes e demais detalhes ganham acesso por seus destinos de produto. O escritório acompanha a leitura dos indicadores com nomes e estados dos responsáveis.

## Notas do crítico · Antes → depois

As notas de antes são uma reavaliação da versão 1 à luz da crítica do dono.

1. **Hierarquia em dois segundos · 6 → 9.** O título introduz a meta, a falta com margem indica a distância e o progresso ganhou uma figura própria.
2. **Números acima da dobra · 7 → 9.** O cenário alternativo fica recolhido. Os motores têm uma ocorrência cada e o balão depende de seleção.
3. **Ritmo e espaçamento · 7 → 8.** A faixa de saúde, o herói, a fila e os motores têm pesos distintos. Uma fila longa ainda empurra as seções seguintes.
4. **Tipografia · 7 → 9.** A falta mensal e a cobertura têm 36 px. Orçamento, motores e cenário secundário têm 28 px. O percentual mantém o símbolo em corpo menor.
5. **Ícones e ilustrações · 6 → 8.** Bandeira e marcos indicam a chegada. As três ilustrações diferenciam os motores. O desenho isométrico usa os personagens compartilhados.
6. **Organização por tarefa · 7 → 8.** Há acesso direto à fila priorizada, orçamento de hoje e responsáveis. Responder uma tarefa ainda depende da tela de produto.
7. **Acessibilidade · 7 → 8.** Um H1, alvos de 44 px, foco visível, ordem de teclado por dispositivo e pares AA verificados em teste. Falta uma sessão com leitor de tela.
8. **Privacidade · 8 → 9.** O olho remove marcadores financeiros, posição, preenchimento e balões. O Assessor recebe rótulos operacionais fixos. A fila ainda depende de texto livre na vista do casal.
9. **Temas claro e escuro · 8 → 9.** A hierarquia verde se mantém, com camadas escuras distintas, realces em OKLCH e sombras reservadas ao claro.
10. **Escritório como personagem · 5 → 8.** A equipe ganha espaço para oito funcionários, com sala em foco, ficha e balão. A evolução da maquete compartilhada pode melhorar a legibilidade das plaquinhas pequenas.

## Como produtizar

- **Plano.** Adaptar `useResumoFamilia().resumo.plano2029` com `lib/resumo/leituras.lerPlano`. Usar `falta_com_margem` e `cobre_pct` para a leitura oficial e `falta_sem_margem` para o detalhe. O destino é `#/planejamento?secao=plano2029`. O valor pode exceder a cobertura completa na leitura textual. O desenho satura na chegada. Os anos são marcos do plano. Para mostrar projeções por ano, o contrato precisa fornecer a série correspondente.
- **Para hoje.** Ligar `resumo.podeGastarHoje` ao seletor `lerOrcamento` e ao valor com unidade de `lib/resumo/orcamento`. Destino `#/orcamento`. Ligar a fila de ações a `api.escritorioHoje`, `lib/resumo/pendencias` e `PrecisaDeVoce` em `#/escritorio`. O contrato fornece nível e ordem de origem, mas não traz um prazo em todas as tarefas. Para a fila real, expor o tipo de ação, destino, vencimento e trechos privados estruturados.
- **Motores.** Usar `resumo.aplicacoes` com `lerAplicacoes` e `totaisGuardado` para o rendimento diário, em `#/guardado?secao=aplicacoes`. Imóveis vêm de `resumo.imoveis` e `lerImoveis`, em `#/guardado?secao=imoveis`. Receitas vêm de `resumo.recebimentos` e `recebimentosDoMes`, em `#/planejamento?secao=recebimentos`. Os períodos são diferentes e os cartões não formam um total.
- **Escritório.** Manter os perfis de `lib/escritorio/equipe` e a composição de `useEquipe`. Esta versão consome as props atuais `salaDestacada`, `mostrarPlaquinhas` e `valores`. Quando a frente compartilhada publicar variantes, aplicar `media` no celular e avaliar `grande` no palco de desktop. No produto, carregar o `EscritorioIsometrico` da f38 sob demanda e levar o atalho a `#/escritorio`. A prévia usa ícones de função e uma associação local pelos IDs do contrato.
- **Casca e acesso.** Os atalhos da D focam seções na própria prévia. No produto, substituir pelos destinos de `app/destinos` e pelo menu autorizado de `app/rotas`, com o olho ligado ao contexto do app. Esta prévia aplica a apresentação financeira ao papel `casal`. Para `pessoa`, o app real mantém o orçamento próprio. Para `equipe`, montar somente a superfície de tarefas em `#/casa` antes de qualquer busca financeira.
- **Estados remotos.** O snapshot tem `pronto`, `vazio` e `indisponivel`. A composição do produto também carrega, restringe e pode falhar. Ligar esses estados ao texto com sua origem e ao `repetir` do hook. Um campo financeiro ausente mostra “Ainda sem dado”. Um zero é mostrado se a fonte o declarou pronto.

## Validação da entrega

- TypeScript com `npx tsc --noEmit`, zero erros. Os 19 testes da D passam e cobrem trilha, cenário recolhido, motores, escritório, privacidade, estados ausentes, proporções desktop, ordem de leitura e contraste.
- Os testes da D rodaram pelo script existente `scripts/verificar-f32.mjs`, que inicia o Vitest pela API após o esbuild receber acesso negado ao carregar `vite.config.ts`. A última rodada completa usou a mesma API. Passaram 1.575 testes, com 3 pendentes e 4 falhas fora da D. O teste de isolamento aciona o carregador bloqueado e há uma falha na B e duas em `ux-cobertura.test.ts`.
- O laboratório foi renderizado em Chromium com a entrada de exemplo e a casca de medição. O modo padrão do servidor de desenvolvimento depende do mesmo carregador de configuração, então a checagem usou o Vite com configuração passada pela API e saída temporária.
- O sandbox negou a criação de `index.lock` no diretório Git da worktree. A entrega está nos arquivos locais.
