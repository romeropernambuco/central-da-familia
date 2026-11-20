# F64 — Alternância do modo do agente

O teste esperava zero botões “Recolher” em “Desligado”, mas usava a fila do exemplo. `criarDados()` cadastra a anuidade do Nubank para o mês seguinte. Em novembro, o Escritório gera `anuidade:car-nu:2026-12` e o agente mantém a conversa acessível em “Desligado”. Esse comportamento é coberto pelo teste de integração de perguntas pendentes.

Executando só o caso de alternância, com `localStorage` e `sessionStorage` vazios e o exemplo reiniciado, reproduzi a falha em 18/11/2026 às 08:39 e às 11:24 de Recife. Às 06:59, a regra de silêncio remove a anuidade da fila e o teste passa. Às 11:24, remover somente essa anuidade da resposta do Escritório também faz o teste passar. A falha independe de testes anteriores e de storage persistido. A passagem relatada às 08:39 não foi reproduzida.

O teste agora fixa o relógio e o storage, recebe uma fila vazia e fornece dados de cartão sem sugestões. Confirma que a leitura terminou, preserva as asserções de alternância e limpa a preferência em memória antes de desmontar. A espera original foi mantida.

Cinco execuções consecutivas do arquivo passaram com 25 testes cada. A suíte completa passou com 104 arquivos, 1.757 testes aprovados e 3 marcados como `todo`. `npx tsc --noEmit` terminou com código 0.

O sandbox bloqueou o carregamento de `vite.config.ts` pelo esbuild na CLI. As validações usaram a API do Vitest 2.1.8, importando a configuração original diretamente e desativando o cache. A rodada completa verde usou um diretório temporário dedicado e até quatro workers após duas rodadas com falhas intermitentes de limpeza do Chromium e de leitura tardia na cobertura de Ajuda.
