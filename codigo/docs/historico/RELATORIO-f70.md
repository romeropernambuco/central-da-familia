# F70 · Contagem e ficha do Escritório

## O que mudou

- O cabeçalho do Início J contava só o estado `trabalhando`, enquanto a maquete desenhava os postos cadastrados. Agora mostra a atividade registrada ou o tamanho da equipe com a situação da fila. Início e Escritório usam a mesma leitura de tarefas e ocultam os totais da fila com o olho fechado.
- A ficha do Início mostra a atividade atual, a última entrega ou resposta registrada, a data relativa quando disponível, os retornos ou lembretes agendados e as pendências do funcionário. O olho mascara os detalhes privados e a quantidade. As ações Abrir aba, Ver histórico, Já fiz e Depois continuam disponíveis conforme o papel e a tarefa.

## O que foi verificado

- Testes com dados sintéticos cobrem fila vazia, trabalho em andamento, duas pendências do mesmo funcionário, olho fechado, datas do diário, adiamento substituído por resposta e acesso do Assessor da Casa.
- `npx.cmd tsc --noEmit` passou. A CLI do Vitest parou no bloqueio do esbuild ao ler a configuração. A execução pela API, com plugin React e cache desativado, aprovou 1.787 testes em 104 arquivos, com 3 casos `todo`.

## O que ficou fora da verificação

- Sessão com dados reais e revisão visual manual da ficha. O diário fornece a data do último registro. O app não recebe um horário de execução separado.
- Sem acesso ao banco, mudanças em migrações, publicação ou commit.
