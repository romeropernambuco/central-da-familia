# Frente 14 — entrega parcial revisável

## Itens

1. Resumo do mês em Gastos e entradas: faixa Entrou / Saiu / Saldo realizado, recebimentos certos pendentes separados, explicação das fontes e setas entre meses. Só o casal acessa os totais familiares. Falha de leitura não vira zero. Os lançamentos são somados como a API os entrega, sem reinterpretar parcelas. Registros de entrada e recebimentos não têm vínculo para deduplicação: conferir a definição provisória.
2. Fechamento histórico não implementado. A busca na base encontrou o aviso `fechou_mes` em api/exemplo2.ts, condicionado ao dia 1 e à sobra do mês passado, mas não uma tela Guia do mês nem uma função pública de fechamento para qualquer mês. Não foi inventada outra fórmula, nem foram alterados Inicio, Painel ou o agente.
3. Cartões informa que só o mês atual teve orçamento verificado; as demais linhas são faturas, sem promessa de caber. Desejos mostra o intervalo da entrada do motor até a véspera da virada; no modo renda, o mês de referência. A indicação caberia_em existente permanece visível. As respostas da filha também identificam o mês.
4. Coerência entre prévia e confirmação de parcelamento não implementada. A confirmação está em telas/lancar/Lancar.tsx, fora da área autorizada. Foi enviada uma pergunta de ampliação de escopo, sem resposta recebida durante o trabalho. Nenhuma regra de parcelas foi alterada.
5. Equipe: botão grande O gás acabou, confirmação, envio pela ação existente acabou na lista de compras. O prazo de seis segundos permite cancelar antes de gravar; a lista também oferece esse prazo ao marcar um item. Estoque informa quantos itens ativos não têm nenhuma conferência no histórico disponível, sem escolher estado inicial nem afirmar que o estoque atual foi conferido. Desfazer não foi adicionado à presença, serviços ou troca de botijão. Foto e miniatura permanecem pendentes porque o formulário pertence a Lancar.tsx.
6. Entrar: mensagens distintas para e-mail do convite, convite não reconhecido/vencido e conexão, com próximo passo. Avisos devolvidos na confirmação também passam pelo tratamento. Mensagens de existência de conta e endereços de e-mail em erros são substituídos por orientação neutra. Isso trata os sinais que chegam a Entrar; não modifica o aceite em PrimeiroUso nem erros que a camada de API não repassa.
7. Desejo próprio pode virar meta em Meu orçamento usando metas_pessoais/useConfig. Progresso acumula exclusivamente valores anotados pela pessoa, entre meses; não usa a sobra mensal como poupança. Substituir meta informa que conserva as anotações. Falha mantém o valor digitado. A meta não altera saldo nem transfere dinheiro. Barra oculta com olho fechado; outro adulto só lê.
8. Meu orçamento troca Cofrinho por Sobra anotada e explica o valor diário de referência; preserva ids. Não foi feita uma reescrita de todas as mensagens antigas da área.

## Arquivos

- codigo/src/telas/lancamentos/Lancamentos.tsx
- codigo/src/telas/cartoes/Cartoes.tsx
- codigo/src/telas/casa/Casa.tsx
- codigo/src/telas/desejos/Desejos.tsx
- codigo/src/telas/entrar/Entrar.tsx
- codigo/src/telas/meu-orcamento/MeuOrcamento.tsx
- codigo/src/telas/lancamentos/feedback.test.ts
- codigo/src/fase_final_e7e10.test.ts
- codigo/src/telas/planejamento/correcoes.test.ts — apenas texto esperado, sem mudança de componente ou regra de Planejamento.
- codigo/DEFINICOES-PROVISORIAS.md
- codigo/RELATORIO-F14.md

## Definições e validação

Seis definições provisórias, uma por linha no arquivo próprio: realizado; previsto; independência entre registros de entrada e recebimentos; significado do atalho do gás; ausência de conferência registrada; acumulação da meta pessoal.

TypeScript: `tsc -p codigo --noEmit`, zero erros. Vitest: 48 arquivos e 892 testes passando, contra 877 da base. Os 15 novos testes usam componentes reais e APIs simuladas, sem substituir hooks. Revertidas temporariamente as seis telas de produção, os 15 testes novos falharam; as mudanças foram restauradas e a suíte completa passou. Olho fechado e papéis também foram cobertos pela suíte global existente. Não há testes de fechamento, foto ou coerência de parcelamento novos, pois essas alterações estão pendentes.

Expectativas antigas alteradas intencionalmente: o caso E8 “cabe / ainda não cabe e quando cabe” em fase_final_e7e10.test.ts passa a esperar o intervalo nos títulos (duas asserções); os dois casos H de correcoes.test.ts (limite_base e limite_mes) passam a esperar “valor diário de referência” em vez de “dia de base”. Só os textos foram atualizados.

O npm test recebeu acesso negado ao carregar a configuração do Vite. A execução válida usou a API do Vitest, com executor em TEMP fora do repositório, configuração em memória e cache desativado. Não foram instalados pacotes nem adicionados scripts ao repositório. Sem commit, push, banco, migrações, credenciais, dados reais, build ou encerramento dos servidores.
