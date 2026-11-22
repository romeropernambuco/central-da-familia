# f36 — Acabamento e recuperação do Início

Implementado na worktree `f36-ajuste-resumo`. A f35 substituiu os cartões anteriores por um resumo que omitia informações essenciais. Esta frente recupera essas informações nos próprios blocos, sem duplicar o destaque diário e sem alterar fórmulas, `futuro()`, SQL, migrações ou `src/estilo.css`.

## Regressões: antes e depois

- **Plano 2029:** antes, o destaque era a renda estimada de R$ 1.638,50. Agora é **“Faltam R$ 16.102,76 por mês”**, no exemplo de 17/11/2026. A fonte continua sendo `lerPlano` → `entradaDoCenario(..., 'garantido')` → `numerosRumo2029`, campo `falta_com_margem`, exatamente como no compacto de `RumoA2029`. A frase identifica viver de rendimentos em 2029, margem de segurança e cenário oficial Garantido; o selo continua “estimado”. Sem margem e demais premissas continuam no destino Planejamento. Sem gasto necessário, apresenta a orientação de cadastro, como o compacto, sem inventar um número. Falta e sobra têm testes de apresentação preservados.
- **Hoje você pode gastar:** antes, havia apenas o destaque e uma linha separada da Casa. Agora “Ver detalhes” e seu chevron expandem o próprio bloco, com `aria-expanded` e `aria-controls`. Mostra “Hoje já saiu”, “Ainda pode gastar até domingo”, ritmo do mês e a linha da Casa. O número principal aparece uma única vez. O envelope vem do mesmo `destaqueOrcamento`, preservado pela leitura do resumo; gasto de hoje e até domingo são campos do envelope da API. `RitmoMes` continua responsável pela apresentação do ritmo e utiliza `porDiaDe`, extraído sem mudar sua regra para `lib/resumo/porDia.ts`, compartilhado com Meu orçamento. O histórico usa `lerLancamentosMes`, o mesmo cache de Últimos lançamentos, e só monta a leitura/gráfico quando expandido. Erro no histórico tem repetição própria. O link para a aba de orçamento permanece.
- **Aplicações:** antes, apenas total e descrição genérica. Agora a frase é **“Rendeu hoje R$ 31,22 líquido.”** no exemplo, usando `totaisGuardado(g).hoje`, o mesmo selector de `CartaoGuardado`/`useGuardado`. A paridade automatizada usa também rendimento fracionário para comparar os textos completos.
- **Precisa de você:** o bloco continua tocável e abre a primeira tarefa por ID. Agora há também “Ver fila no Escritório”, deixando explícito o acesso à fila completa e às respostas. O Escritório já usa `perguntas` completo, não a prévia de três. No navegador, o toque abriu `#/escritorio?secao=tarefa&entidade=feira_nota%3Afe1`, ficha `fiscal`, com “Anexar a nota agora”, “Não teve nota” e “Anexar depois”. Não foi necessário substituir a fila ou seu mecanismo de resposta.

## Acabamento: antes e depois por item

1. **Saldo indisponível:** antes, “Saldo em conta” repetia no rótulo e no estado; ação apertada à direita. Agora rótulo único, “Ainda sem dado” e botão primário abaixo. No celular o botão ocupa a largura útil do cartão e tem 44 px de altura. Sem capacidade de escrita, não aparece ação inexistente; indisponível continua sem zero inventado.
2. **Formulário do saldo:** o campo monetário herdava `max-width:220px` e `justify-self:end` do componente genérico. `saldo.css` remove essas duas restrições somente neste formulário e estabelece uma coluna. Conta tem rótulo visível e exemplo “Conta corrente”; valor tem `label` associado por ID, prefixo R$ e mesma largura externa de Conta/data. O foco inicial vai a Conta; `Sheet` conserva Esc, contenção de Tab e devolução de foco ao botão de abertura. Salvar mantém validação, permissões e privacidade existentes. O teste de integração de salvar/selecionar conta/desfazer continua passando.
3. **Datas:** novo `dataConferencia` em `lib/formato.ts`, consumido por Início e SaldoConta no Planejamento. Produz dd/mm no ano atual e dd/mm/aaaa em outro ano, inclusive recebendo timestamp, sem deslocar a data civil pelo fuso. Testes com 17/11, 31/12/2025 e 01/01.
4. **Concordância:** reutilizado o helper único `plural` já existente em `lib/formato.ts`; nenhuma segunda implementação. Resumo, Desejos e Conferência da Casa agora dizem “1 nota pendente”, “1 atrasado” e “2 pensando · 1 combinado”. Casos 0/1/2 cobertos.
5. **Ícones:** tamanho explícito no `Icone`, dimensões mínimas no SVG e base flex estável no chip, impedindo colapso por dimensionamento intrínseco. Todos os onze blocos têm teste de SVG com dimensões positivas e proteção CSS; no Chrome cada um mediu 20×20 px, inclusive Faturas.
6. **Casa:** antes, uma frase longa com “Feira: sem pergunta pendente”. Agora o destaque é “Feira ainda sem confirmação” quando existe o gatilho, senão “Feira em dia”. Nota e estoque ficam em linhas curtas; contagem ausente continua desconhecida. A conferência da aba usa a mesma terminologia e plural.
7. **Conferência:** antes, “Sem conferência registrada” em cada bloco. Agora há uma nota no cabeçalho: “Nenhum número conferido manualmente ainda” ou “Conferido em ...”. Cada bloco só acrescenta data quando possui registro humano; saldo mantém a ressalva quando aplicável. Consulta automática continua distinta de conferência manual. Datas também são mascaradas pelo olho.
8. **Desktop e acessibilidade:** 1024 e 1280 px conferidos com valores visíveis, duas colunas e três linhas nos seis blocos principais; textos sem cortes ou sobreposições. Sem rolagem horizontal. Foco medido com contorno de 3 px e controle de expansão com alvo de 44 px. Contraste mínimo medido nos textos/controles/ícones do resumo: 5,32:1 no tema claro e 7,65:1 no escuro, após estabilizar as transições.

## Medidas reais — 375×812

Chrome Headless Shell 153 instalado, build `exemplo`, data fixada em 17/11/2026, fontes carregadas, olho aberto, sem service worker anterior. A barra inferior começa em y=725. O viewport é 375 px; a área de documento é 360 px com a barra vertical de 15 px do Chrome. Não há transbordamento horizontal.

- **Antes, primeira visita/conversa aberta:** funcionário 288 px; título do resumo em y=534,98; primeiro valor financeiro em y=695,08 até 722,67. Saldo indisponível: 81,09 px, com texto duplicado e ação lateral.
- **Depois, primeira visita/conversa aberta:** funcionário 244 px; título em y=490,98; primeiro valor financeiro em **y=695,92 até 723,52**, integralmente antes da barra inferior. Para acomodar a ação de saldo abaixo e a nota do cabeçalho, a identidade do funcionário no Início móvel usa a mesma composição compacta já usada recolhida: cena de 64 px e coluna de 80 px. A pergunta e todas as ações permanecem presentes. Ajuste restrito a `inicio.css`, sem mudar o comportamento de primeira visita/revisita do agente ou o desktop.
- **Depois, funcionário recolhido:** altura preservada em **182 px**; título em y=428,98; primeiro valor em **y=633,92 até 661,52**. Cabe sem rolar. A diferença em relação à medição fornecida pelo dono decorre também da ação de saldo agora abaixo e da nota única adicionada; o critério de visibilidade permanece atendido.
- **Alturas recolhidas dos seis blocos principais:** saldo 109,94; orçamento 165,78; faturas 139,97; aplicações 121,78; recebimentos 139,97; Plano 185,75 px.
- **Complementos:** Casa, imóveis e movimentação 130,22 px cada; desejos 93,84; fila 168,03 px.
- **Expansão do orçamento:** passa de 165,78 para 852,95 px somente ao tocar; recolher desmonta os detalhes. Não adiciona outro destaque diário. Exemplo exibiu até domingo R$ 838 e hoje já saiu R$ 12, além do mesmo gráfico da aba.
- **Formulário:** Conta, moldura monetária e data começam em x=20 e têm 320 px de largura. Alturas de 44, 48 e 44 px. R$ fica dentro da moldura monetária. Esc fecha e foco retorna ao controle de abertura.
- **Desktop:** documento 1009 px para viewport 1024 e 1265 px para 1280, ambos descontando a barra vertical; colunas de 350,5 e 478,5 px, respectivamente. Nenhum bloco ultrapassa a largura disponível.

## Testes e privacidade

- `npx tsc --noEmit`: **zero erros**.
- Suíte completa: **83 arquivos, 1.481 testes aprovados**, com os três TODOs preexistentes. Os 1.467 anteriores permanecem; 14 casos novos, todos em `*.test.ts` e com `createElement`, sem JSX.
- Prova de regressão: os **14 casos novos falharam contra os arquivos de produção de HEAD/f35** e passaram com a implementação. Os arquivos foram restaurados em `finally`; nenhum código de validação entra no commit.
- Novos casos cobrem principal 2029 renderizado junto ao compacto em três cenários; expansão e ausência de duplicação; rendimento líquido junto ao cartão de origem; nota única/saldo/ícones; três datas; plural 0/1/2; rótulos/foco/Esc/devolução de foco; tarefa e acesso explícito à fila.
- A auditoria global do olho foi ampliada para incluir o novo chunk `RitmoOrcamento` e o orçamento expandido em Início/ResumoFamilia, nas transições fechado → aberto → fechado, conservando a inspeção de texto e atributos com dados privados semeados. Fechado, a expansão não monta o gráfico: não há valores em texto, atributos ou geometria. Sentinelas f34/f35, estados de erro, papéis, cache/invalidação e cenários oficiais continuam cobertos.
- As asserções antigas que exigiam a apresentação substituída foram atualizadas: principal de 2029 agora exige falta/sobra oficial com margem e seu estado sem dados; saldo indisponível exige texto novo e rótulo único. Não foram removidas asserções de cálculo, segurança ou testes existentes.

O comando literal `npx vitest run ...` encontrou o bloqueio preexistente do esbuild ao ler um diretório ancestral. Foi usada a API `startVitest` da mesma instalação Vitest 2.1.8, com `config:false`, plugin React, `include: src/**/*.test.ts`, timeout de 30 s, sem cache e sem watch. Build pela API Vite 5.4.11 com `configFile:false`, modo exemplo e plugin React; `gravarSw` executado. Não foi executado `npm test`. A busca opcional da skill de UI também não tinha Python executável autorizado; aplicadas suas diretrizes de rótulos, foco, contraste e alvos, verificadas no navegador.

## Carga e limites

Comparação de builds com a mesma configuração e gzip calculado sobre os artefatos. Cruzamento dos JS/CSS pedidos na visita inicial com os artefatos equivalentes do build anterior: aumento agregado de **1.913 bytes gzip (1,91 KB)**, abaixo dos 5 KB permitidos. Inclui a nova folha do saldo, o selector diário compartilhado e as alterações nos chunks já carregados.

Principal: 154.554 → 154.702 bytes gzip; entrada: 1.900 → 1.902; Início JS: 4.035 → 4.734; Início CSS: 960 → 1.336; SaldoConta JS: 1.307 → 1.431; SaldoConta CSS: novo, 340 bytes. O resumo continua no chunk lazy do Início. `RitmoOrcamento`, `RitmoMes` e o gráfico só são requisitados após expandir; nenhum deles apareceu na lista de recursos da primeira visita. Nenhuma dependência adicionada.

Não há mudança no motor financeiro nem em fórmulas. As limitações de capacidade do saldo real continuam as registradas na f35: esta frente não cria API, SQL ou migração.

## Entrega e limpeza

Validações, capturas, logs e perfis temporários ficaram fora de `codigo/` e não fazem parte de `git add codigo`. Os servidores e navegadores iniciados nesta validação foram encerrados; o Chrome Headless Shell final saiu com código 0. Portas 4796 e 9366 verificadas fechadas ao final.

`git add codigo` foi tentado e bloqueado por `Permission denied` ao criar `<pasta do projeto>/.git/worktrees/f36-ajuste-resumo/index.lock`. Portanto não foi possível criar o commit; a implementação e este relatório ficam na worktree, sem contornar a permissão do repositório principal.

A revisão automática rejeitou a exclusão recursiva dos perfis, mesmo com verificação do caminho absoluto dentro da worktree. Também rejeitou a alternativa de excluir somente os arquivos temporários, sem recursão. A única razão retornada foi **“blocked by policy”**. Não foi tentado outro mecanismo de exclusão.

Permanecem na raiz as pastas **`.f36-chrome/` e `.f36-shell/`**. Também permanecem os scripts `.f36-run.mjs`, `.f36-browser.mjs`, `.f36-regression-check.mjs`, os arquivos `.f36-*.log`, `.f36-*.json`, `.f36-*.png` e `debug.log`. Nenhum integra a entrega em `codigo/`. São artefatos da validação, não dependências para rodar a aplicação.
