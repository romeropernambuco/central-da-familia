# f34 — fundação da fonte única

Implementação na worktree f34, branch encontrada `codex/f34-fonte-unica`. Não foram criados os cartões do Resumo da família, SQL, assinaturas em tempo real, outro motor de projeção ou alterações em `src/estilo.css`.

## Extrações e consumidores

Referências “antes” são do HEAD de entrada; caminhos abaixo são relativos a `src/`.

- `componentes/EnvelopeCard.tsx:22` → `lib/resumo/orcamento.ts:9`: `tetoDoMes`.
- `componentes/EnvelopeCard.tsx:24` → `lib/resumo/orcamento.ts:11`: `comecoDoMes`. A borda de apresentação injeta a formatação existente, conservando olho fechado e evitando estado global no selector.
- `componentes/EnvelopeCard.tsx:32` → `lib/resumo/orcamento.ts:20`: `numeroEnvelope` e auxiliares. A data civil e o fuso entram como argumentos. Os wrappers de compatibilidade conservam a assinatura usada pelas telas antigas; o relógio fica na borda React. Fuso preservado: America/Recife.
- `telas/casa/Casa.tsx:88` e o ramo semanal de `numeroEnvelope` → `lib/resumo/orcamento.ts:69`: `livreDaSemana`. Mesmo arredondamento e tratamento dos campos ausentes.
- `telas/lancamentos/Lancamentos.tsx:191` → `lib/resumo/movimentacao.ts:4`: `totaisDoMes`, com o filtro em `gastosRealizados`. A faixa da aba e o funcionário usam esse selector. Realizado e previsto continuam separados; não se altera recebimento parcial, remarcação ou data futura.
- `telas/lancamentos/Lancamentos.tsx:162` → `lib/resumo/faturas.ts:9`: `proximasPorCartao`, mantendo o filtro positivo e a ordem por vencimento.
- `telas/cartoes/Cartoes.tsx:68` → `lib/resumo/faturas.ts:4`: `proximaFatura`, com a opção de aceitar zero e usar a primeira vencida. A janela de seis meses da tela permanece.
- `telas/guardado/Guardado.tsx:83/90`, `CartaoGuardado.tsx` e funcionário → `lib/resumo/guardado.ts:5`: apresentação dos totais oficiais. Não há cálculo de rendimento novo.
- `telas/guardado/Imoveis.tsx:70/90` → `lib/resumo/imoveis.ts:4/5`: valor dos imóveis e patrimônio. Aluguéis e rentabilidade continuam em `futuro()`.
- Contagens de `Escritorio.tsx`, `PrecisaDeVoce.tsx`, loja compartilhada e funcionário → `lib/resumo/pendencias.ts:5`: total oficial completo.
- `componentes/RumoA2029.tsx:10` → fachada `lib/resumo/plano2029.ts:2`: reexporta `numerosRumo2029`, `rumoDoCenario` e tipo. O motor e a escolha de cenário permanecem intactos.
- `telas/planejamento/Recebimentos.tsx:88/89` → `lib/resumo/recebimentos.ts:3/6`: meses pendentes e valor atualizado. A própria tela consome a extração. `totaisRecebimentos` prepara a agregação das ocorrências para a f35.

`lib/resumo/tipos.ts` define todos os campos pedidos em `ResumoFamilia`, estados discriminados de `CampoResumo`, proveniência, períodos, datas e unidades monetárias. Os estados diferentes de pronto têm valor null. `campoGuardado` e `campoPendencias` não convertem contrato incompleto em zero. Evidência do contrato original é conservada em WeakMap antes da normalização tolerante, inclusive ao copiar a leitura para um consumidor.

## Divergências, separadas da refatoração

- C1: o título do Escritório usava a prévia de três; agora usa o mesmo total oficial do cartão. Teste próprio com oito pendências; falhou antes da troca.
- C2: o funcionário somava gastos futuros e parcelas sintéticas. Agora usa `totaisDoMes`, com o rótulo “Saiu no mês”. Teste próprio retornava 140 antes da correção e exige 20.
- C3: o funcionário mostrava 999 do orçamento geral quando o destaque pessoal mostrava 7. Agora ambos usam `destaqueOrcamento`; teste próprio exige 7 e “Seu orçamento”.
- C4: extração pronta; troca do consumidor do funcionário adiada para f35, conforme alternativa autorizada no pedido. A limitação também está em DEFINICOES-PROVISORIAS.md.

O único teste antigo ajustado foi `telas/escritorio/numeros.test.ts`: os lançamentos fictícios passaram a ter a data de hoje, pois o indicador agora respeita a mesma data de realização da aba. Permanecem as verificações de apagados, valor, erro de leitura e ausência de zero inventado. Nenhuma asserção foi removida.

## Leituras e invalidação

`app/invalidacao.ts` estende a loja anterior com cache por contexto completo, deduplicação em andamento, estado por recurso, erro e horário de consulta. `api/protegida.ts` é a borda compartilhada das leituras usadas tanto pelas telas existentes quanto pelo funcionário. Cada consumidor recebe uma cópia, para não corromper o cache ao ordenar ou editar objetos.

Mutações bem-sucedidas publicam os recursos de `api/recursos.ts`; falhas não publicam. Operações só com id resolvem a família pelo registro dos lançamentos/aplicações lidos, ou pela família da sessão ativa. Desfazer por API, inverso registrado e inverso devolvido pela ação publicam o mesmo conjunto. Respostas de outra geração não entram no cache nem publicam um desfazer na nova sessão.

`useLeituraRemota`, `useDados2`, `useConfig`, funcionário, Cartões e Gastos observam a invalidação existente. Guardado/Futuro compartilham a leitura entre instâncias. A loja do Escritório e os registros de conferências/perguntas são limpos nas trocas de contexto. O contexto não expõe um resumo de outra sessão/membro/papel enquanto a nova leitura termina. O Assessor da Casa é bloqueado antes de qualquer leitura financeira.

`recarregar()` invalida e avança a versão antes de buscar o resumo. Uma falha nessa fonte não impede Guardado, Casa e outras fontes de reler. Permanecem foco, reconexão e virada de dia; não há promessa de push entre aparelhos. Repetição explícita de leitura pode invalidar seu recurso; a invalidação de mutações foi retirada dos fluxos de recebimentos e concentrada na API. O botão Chegou conserva somente a atualização explícita das fontes antes da conferência, com recursos delimitados.

## Verificação

- Caracterização de orçamento/movimentação executada sobre o código antigo congelado antes de movê-lo, com snapshot e resultados fixos. Paridade sobre mês anterior, estouro, regras diária/semanal/mensal, campos opcionais, parcelas sintéticas, apagados, futuro, recebidos parciais e previstos.
- Casos de fatura aberta/fechada/zero/vencida, totais oficiais de Guardado/imóveis e ocorrências recorrentes com controle de valor e confirmação.
- Testes sentinela substituem selectors e verificam HTML das abas, cartão do Início e o cartão real `NumerosAba`, montado com React DOM para Início, Guardado e Gastos. A integração adicional verifica o mesmo funcionário após mutações.
- Integração real de ação → invalidação → uma releitura → Guardado, cartão do Início e funcionário sincronizados; inclui `resumoHoje` falhando e Guardado atualizando.
- Testes de resposta antiga, troca de sessão/família/membro/papel, bloqueio financeiro do Assessor, desfazer, falha distinta de zero e proteção contra mutação da cópia.
- Regra estática sobre pureza e ausência de reintrodução dos cálculos extraídos/importação de instância da API na apresentação migrada.

`npx tsc --noEmit`: zero erros. Suíte completa: 82 arquivos verdes, 1.389 testes aprovados e os 3 TODOs preexistentes (24 testes novos; os 1.365 anteriores preservados). A suíte foi repetida após os ajustes de integração. A execução usa somente `*.test.ts`, sem JSX nos testes novos. Verificações direcionadas de Recebimentos/Plano 2029 também passaram após retirar as invalidações de mutação das telas.

## Carga

`npx vite build` foi tentado antes e depois; o carregador esbuild não consegue percorrer o diretório pai neste sandbox. `npx vitest run` tem a mesma falha antes de coletar testes, já documentada na f25. Foram usadas as APIs das mesmas versões instaladas de Vite/Vitest, com `configFile:false`/`config:false`, plugin React, inclusão exclusiva de `src/**/*.test.ts`, timeout de 30s e cache desligado. Nenhum `npm test` foi executado. O build final também executou `gravarSw`.

- Antes: pacote principal `partida-DqRtlgM9.js`, 439,96 KB, 142,55 KB gzip; entrada `index-CGTOqP-D.js`, 3,63 KB, 1,89 KB gzip; 1.788 módulos; build 6,42s.
- Depois: pacote principal `partida-BSoZtbxk.js`, 446,90 KB, 145,37 KB gzip; entrada `index-DKWx0Xyd.js`, 3,63 KB, 1,89 KB gzip; 1.798 módulos; build 8,41s (junto da suíte).
- Aumento do pacote principal: 2,82 KB gzip, abaixo de 5 KB. A entrada permanece em 1,89 KB. Telas e cena 3D continuam em chunks lazy. Avisos preexistentes de chunk Three e import estático/dinâmico do Escritório permanecem.

## f35

Criar os cartões do Resumo da família, compor todos os `CampoResumo` a partir das leituras compartilhadas, conectar conferências por item, completar recebimentos/Casa e substituir o indicador-base de Planejamento pelo total das ocorrências. Não apresentar a atual soma-base como se já estivesse sincronizada com as recorrências. A fundação não adiciona uma tela nova nem recalcula aluguel/rendimento/projeção.

## Entrega no Git

`git add codigo` foi tentado e bloqueado: Permission denied ao criar `<pasta do projeto>/.git/worktrees/f34-fonte-unica/index.lock`. Portanto não foi possível criar commits, inclusive os commits separados das divergências. As correções C1/C2/C3 estão identificadas acima e possuem testes próprios; todas as alterações permanecem na worktree. Não houve tentativa de contornar a permissão. Scripts/logs/configurações temporários de validação foram removidos. Nenhum servidor ou processo de validação ficou em execução.
