# f35 — Resumo da família

Implementado na worktree `f35-resumo-familia`, branch `codex/f35-resumo-familia`, sobre a fundação f34. O Início apresenta seis cartões na ordem aprovada, a linha separada da Casa e cinco complementos. O destaque anterior de orçamento e os cartões anteriores de Guardado/2029/pendências foram substituídos pelos respectivos blocos, sem repetir o mesmo destaque na tela. Últimos lançamentos permanece abaixo. Detalhes de orçamento continuam em Meu orçamento.

## Composição e fontes

Caminhos a seguir são relativos a `codigo/`. A composição está em `src/lib/resumo/familia.ts:4`; as leituras em `src/lib/resumo/leituras.ts`; o hook em `src/app/useResumoFamilia.ts:56`. Cada campo traz estado discriminado, fonte, natureza, período, unidade e datas. As chamadas começam independentemente, compartilham a API/cache da f34 e não dependem de um `Promise.all` global do Início.

- **Saldo em conta:** `src/lib/resumo/saldos.ts:3`, `saldoDasContas`; leitura `leituras.ts:87`, API opcional `saldosConta`. A mesma leitura aparece em `src/telas/planejamento/SaldoConta.tsx:35`. Cadastro/edição manual e data em `SaldoConta.tsx:9`; exemplo em `src/api/exemplo.ts:753/757`. `exemplo.ts:779` usa exatamente o mesmo selector para fornecer `saldo_caixa` em centavos ao adaptador existente do Plano. Data agregada = conferência mais antiga das contas incluídas. Sem capacidade/cadastro não apresenta zero.
- **Hoje você pode gastar:** `src/lib/resumo/orcamento.ts:70`, `destaqueOrcamento`, também consumido por Meu orçamento e pelo funcionário; leitura `leituras.ts:58`, `api.resumoHoje`. Identifica Seu orçamento e mantém a linha Casa separada. Estouro é identificado como dívida no orçamento, sem misturar recebimentos previstos. Pessoa sem envelope próprio não recebe o número geral como substituto.
- **Faturas a vencer/conferir:** `src/lib/resumo/faturas.ts:3`, `faturasAConferir`; leitura `leituras.ts:34`, `api.faturas` + `api.faturasBanco`. Cartões usa a mesma conferência em `src/componentes/ConferenciasResumo.tsx:7`; o formulário do Analista de Cartão continua sendo a origem de `valor_banco`/`paga_em` em `src/telas/escritorio/Ficha.tsx`. Janela de 30 dias; pagamento informado exclui a ocorrência; valor informado, inclusive zero, prevalece. Fatura fechada não prova falta de pagamento. A janela de seis meses e a simulação de parcelas continuam no detalhe de Cartões.
- **Aplicações:** `src/lib/resumo/guardado.ts:5`, `totaisGuardado`; leitura `leituras.ts:73`, `api.guardadoHoje`. Mesmo total de Guardado/CartaoGuardado, sem adicionar imóveis. Não calcula rendimento localmente. A data da fonte permanece distinta da consulta e da conferência.
- **Recebimentos previstos:** `src/lib/resumo/recebimentos.ts:17`, `recebimentosDoMes`, apoiado em `totaisRecebimentos`, `mesesPendentes` e `recebimentoAtual`; leitura `leituras.ts:23`, `api.recebimentos`, `fontes_receita`, `receitas_controle`. A linha de totais do mês em `src/telas/planejamento/Recebimentos.tsx` consome o mesmo selector. Horizonte do mês atual, com pendências anteriores identificadas, valores separados por certeza. O funcionário em `src/telas/escritorio/numeros.ts` agora usa todas as ocorrências recorrentes, com rótulo explícito de todos os meses, encerrando C4 da f34.
- **Plano 2029:** `src/app/rumo2029.ts:4`, `numerosRumo2029`, pela fachada `src/lib/resumo/plano2029.ts`; leitura `leituras.ts:42`, `api.futuroEntradas`, `entradaDoCenario(..., 'garantido')` e `futuro()`. Principal = renda mensal estimada do cenário oficial Garantido. É a mesma renda calculada em RumoA2029; detalhes, margem e comparação ficam no Planejamento. O destino abre o cenário oficial sem alterar a preferência de comparação guardada pelo usuário.
- **Casa:** `src/lib/resumo/casa.ts:3`, `situacaoCasa`; leitura `leituras.ts:38`, `api.escritorioHoje`, `api.feiras`, `api.estoque`. Mesma conferência em Casa por `ConferenciaCasa`. Gatilho `feira_feita:` → “Feira ainda sem confirmação”; ausência desse gatilho não é afirmada como feira realizada. Nota pendente, estoque da semana e itens ativos em falta vêm dos registros correspondentes. Sem contagem, falta é desconhecida, sem zero inventado.
- **Imóveis:** `src/lib/resumo/imoveis.ts:4`, `totalImoveis`; leitura `leituras.ts:49`, `api.imoveis`. Aluguel líquido ESTIMADO é a soma da saída de imóveis de `futuro()`, sem repetir fórmula de vacância/imposto. Falha de projeção mantém o valor cadastrado legível e informa indisponibilidade do aluguel. O resumo não cria Patrimônio somado.
- **Gastos e entradas do mês:** `src/lib/resumo/movimentacao.ts:4`, `totaisDoMes`; leitura `leituras.ts:66`, lançamentos do mês, recebimentos e config `entradas`. Mesmo selector de `FaixaDoMes`/`ResumoDoMes` em Gastos e entradas; entrou, saiu e saldo são realizados até hoje. Não é saldo bancário. Últimos lançamentos compartilha a leitura do mês, evitando outra consulta.
- **Desejos:** `src/lib/resumo/desejos.ts:2`, `totaisDesejos`; leitura `leituras.ts:83`, `api.desejos`. O contador da lista da aba Desejos usa o mesmo selector; destino conserva o primeiro desejo pensando/combinado.
- **Precisa de você:** `src/lib/resumo/pendencias.ts:5`, `totalPendencias`; leitura `leituras.ts:78`, `api.escritorioHoje`. Total completo, nunca o tamanho da prévia de três; primeira tarefa vem da mesma fila. Escritório abre o funcionário e a tarefa solicitada, inclusive além da prévia.

## Estados e datas

Cada campo apresenta “Conferindo...”, erro com “Não foi possível conferir”/“Tentar de novo”, ou resultado de leitura bem-sucedida. O erro não mostra zero, vazio, exemplo ou valor anterior como atual. O botão repete as fontes daquele bloco, com propagação apenas aos outros campos que dependem dessas fontes. A versão por recurso invalida imediatamente a identidade da leitura do resumo; uma resposta da geração anterior não substitui a nova.

`consultadoEm` marca a consulta concluída; `atualizadoEm` só vem da fonte; `conferidoEm` só de registro humano. Aplicações/imóveis/recebimentos exigem conferência para todos os IDs antes de declarar uma data agregada. Resultado sem registro mostra “Sem conferência registrada”. Estado indisponível não apresenta selo de conferência de um número inexistente. Cadastro incompleto é rejeitado, inclusive evidência preservada antes da normalização tolerante de faturas/recebimentos/imóveis. A cópia do cache conserva também evidências aninhadas.

## Navegação, privacidade e permissões

Contrato em `src/app/destinos.ts`: `{rota, secao, entidade, periodo}`, serializado no hash. O observador de foco aguarda a seção/entidade surgir depois do Suspense, e é desligado ao sair. Casa aceita a subaba pelo destino, mantendo as permissões atuais. Cartões recebe cartão/mês; Planejamento recebe recebimentos/mês, saldo ou cenário oficial; Guardado recebe aplicações/imóveis; Gastos recebe o mês; desejos e tarefas recebem ID.

Olho fechado mascara números, contagens e frases privadas, sem valores em `aria-label`, `title`, largura de barra ou geometria de gráfico no resumo. O resumo não desenha gráficos. A varredura global foi ampliada para ResumoFamilia e SaldoConta com dados privados semeados.

Casal vê a visão familiar e seu orçamento identificado. Pessoa vê o próprio orçamento e desejos, com a linha permitida da Casa; não consulta aplicações, imóveis, recebimentos, faturas ou Plano 2029. Assessor da Casa é barrado antes de montar os hooks do resumo; sua rota continua Casa e o cache financeiro continua proibido pela f34.

## Medição visual

Chrome headless real, build `exemplo`, 17/11/2026, fontes carregadas, viewport 375×812, primeira visita, olho aberto. Medição por CDP com script temporário fora de `codigo/`, sem service worker. Também inspecionada captura da tela. A medição inicial mostrou o número parcialmente atrás da barra inferior; a última iteração compactou o cartão indisponível e os intervalos.

- Funcionário com cena padrão: altura 288 px; primeiro cartão em y=571, altura 81,1 px. Primeiro valor disponível, Hoje você pode gastar: y=695,1, fim em y=722,7. Barra inferior começa em y=725. Portanto o valor está visível antes da barra e dentro dos 812 px.
- Alternativa em lista: funcionário 260 px; primeiro cartão y=543; valor de hoje em y=667,1, fim y=694,7.
- Alturas dos seis cartões: saldo indisponível 81,1; orçamento 120,3; faturas 138,5; aplicações 120,3; recebimentos 138,5; Plano 138,5 px. Complementos: Casa e mês 128,7; imóveis, desejos e fila 110,5 px.
- Largura de documento no celular = 375 px; sem rolagem horizontal. Desktop 1280×900: duas colunas de 478,5 px e três linhas no topo.
- Link real Recebimentos: hash `#/planejamento?secao=recebimentos&periodo=2026-11`, foco final na seção `recebimentos`, período `2026-11`, depois da carga lazy. O foco/rolagem por entidade tardia também tem teste automatizado.

## Validação

- `npx tsc --noEmit`: zero erros.
- Suíte inteira: 83 arquivos, **1.467 testes aprovados**, além dos três TODOs preexistentes. Base de 1.389 preservada; 78 casos novos. Testes novos são `*.test.ts`, usam `createElement`, sem JSX.
- Paridade dos onze campos com selectors e renderização das duas superfícies em três cenários; isolamento de todas as fontes e configs; contratos incompletos; carregamento independente, retry e resposta antiga; papéis; olho; AST; destinos e foco lazy.
- Ação → invalidação → releitura → resumo/origem → desfazer para gasto, pagamento de fatura, recebimento, aporte, feira, estoque e saldo. Cadastro real do exemplo exercitado pelo formulário, com seleção da conta cadastrada, Plano 2029 e desfazer. Nenhuma fixture é importada pela apresentação real.
- Sentinela f34 preservada e adaptada ao contrato do novo componente. Testes anteriores de Plano continuam cobrindo margem/detalhes nas superfícies detalhadas e verificam renda oficial no novo cartão. A auditoria global do olho agora cobre os novos componentes. O teste da ajuda aguarda as novas fontes lazy terminarem antes de contar chamadas, conservando todas as asserções de ausência de rede/escrita. O teste que congela a sequência interna de estados do simulador isola a nova conferência; a conferência real é exercitada pela integração nova. Nenhuma asserção de cálculo/segurança foi removida.

`npx vite build` antes/depois e `npx vitest run src/lib/resumo/familia.test.ts` encontram o bloqueio preexistente do esbuild ao percorrer diretório ancestral. A validação usou as APIs das mesmas versões instaladas, `configFile:false`/`config:false`, plugin React, inclusão `src/**/*.test.ts`, timeout de 30 s e cache de testes desligado, como na f34. Não foi executado `npm test`. O build de produção executou também `gravarSw`.

## Carga

- Antes: principal `partida-BSoZtbxk.js`, 446,90 KB / 145,37 KB gzip; entrada `index-DKWx0Xyd.js`, 3,63 KB / 1,89 KB gzip; Início 12,07 KB / 4,50 KB gzip.
- Depois: principal `partida-B6m4i06H.js`, 456,06 KB / 148,65 KB gzip; entrada `index-Dtx_O6J5.js`, 3,63 KB / 1,89 KB gzip; Início `Inicio-Dqskhc4g.js`, 11,03 KB / 4,04 KB gzip; CSS do Início 3,13 KB / 0,96 KB gzip.
- Principal +3,28 KB gzip; entrada sem aumento. Considerando também JS/CSS do Início, aumento aproximado de 3,32 KB gzip, abaixo do limite de 5 KB. Início/resumo continuam em chunk lazy, assim como as outras telas e Three. Nenhuma edição em `src/estilo.css` ou `lib/futuro/`.

## Banco e limites mantidos

Saldo real continua indisponível: a f_11 não aplicada, capacidades de leitura/escrita reais e registro da data manual ainda dependem do banco/API, conforme detalhado em `DEFINICOES-PROVISORIAS.md`. Não houve SQL ou migração nesta frente. Aluguel/rendimento/projeção continuam estimativas do motor existente, não garantias. Cache/reconexão/foco/virada do dia seguem a f34; não há push entre aparelhos.

Scripts, logs, perfis e imagens de validação estão fora de `codigo/` e não integram `git add codigo`. A revisão automática do ambiente rejeitou a exclusão das pastas temporárias `.f35-chrome`, `.f35-chrome2` e `.f35-vite-cache` por política, sem fornecer justificativa adicional; não se tentou contornar essa restrição. Os artefatos ficaram na raiz da worktree. Servidores e Chrome de validação encerrados; portas 4798/9335 conferidas fechadas.

`git add codigo` foi tentado e bloqueado: `Permission denied` ao criar `<pasta do projeto>/.git/worktrees/f35-resumo-familia/index.lock`. Não foi possível criar o commit. Toda a implementação permanece nesta worktree, sem tentar contornar a permissão. C4 é a troca aprovada pelo dono, com teste próprio; não foi encontrada nem aplicada outra mudança de fórmula que exigisse commit de correção separado.
