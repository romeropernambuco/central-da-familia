# Frente 15 — Lançar

Trabalho na worktree `f15-lancar`, sem commit, push, instalação, build ou acesso a serviços externos/dados reais. Servidores 5198/5199 não foram alterados.

## Entrega por item

1. **Parcelamento:** `calcularImpactoDaCompra` reúne simulação, valor que conta no mês, frase e confirmação. A prévia e o botão usam esse resultado; a confirmação repete os dois textos da prévia, incluindo o impacto no mês. Cartão em 1x também ganha prévia e confirmação coerentes, com valor integral na data da compra. Datas de fechamento/vencimento e regra do dia 1 continuam iguais. A frase mensal existente permanece igual à de Cartões.
2. **Foto da equipe:** a base já tinha miniatura, “Foto recebida”, espera pela resposta verdadeira, bloqueio durante preparo/envio e manutenção da foto após falha. Preservei esses estados e troquei o erro por “Não consegui enviar. Tente de novo. A foto continua aqui.” A imagem fica só no estado do componente; o rascunho existente da equipe guarda somente o nome da compra. Olho fechado remove a imagem do DOM e abrir o olho recupera a miniatura. Sem nova persistência ou log de foto.
3. **Desfazer:** chegada, saída, serviço e troca de botijão agora usam a espera cancelável de seis segundos da Casa da equipe. Não chamam `casaMarcar` antes do prazo. Uma trava síncrona impede substituir ou duplicar a ação com dois toques antes da renderização; outra trava existente protege o envio. “O gás acabou” e os itens da lista usam o mesmo agendamento. Desmontar a tela ou trocar de família cancela o temporizador. O texto informa que ainda vai enviar; nenhuma confirmação antecipada de gravação.
4. **Documentação:** acrescentei definições provisórias sem apagar linhas anteriores.

## O que ficou de fora e por quê

- **Ajustar os centavos na última parcela não foi implementado.** `simularCompra` em `lib/formato.ts` e `parcelasDe` em `lib/plano.ts` distribuem o restante na primeira; o modo exemplo usa essas regras para faturas e lançamentos. O pedido também manda preservar o cálculo e editar somente a área local. Alterar só a apresentação para a última faria a tela divergir da gravação; alterar as funções compartilhadas e o banco excederia a área. Mantive soma exata do total e explicação explícita da primeira parcela ajustada. Essa parte exige resolução do conflito e uma frente com escopo para alinhar regra compartilhada, gravação e exibição.
- Desfazer depois que os seis segundos acabam e a gravação começa: fora do pedido de cancelamento **antes** de gravar. Não criei exclusão compensatória nem novos contratos de API.
- Fluxos do casal para presença/serviços/gás permaneceram intactos: o escopo desta alteração é o fluxo da equipe em Casa.
- Não fiz inspeção visual em navegador ou aparelho real: validação de interação e privacidade por componentes React reais no DOM de teste existente.
- Nenhuma mudança em futuro, Planejamento, RumoA2029, AgenteDaAba, banco, ambientes, chaves ou infraestrutura.

## Verificação

- Tipos: `node codigo/node_modules/typescript/bin/tsc -p codigo` — **zero erros**.
- Suíte completa: **53 arquivos, 975 testes passando, 3 TODO**, contra a referência de 966 passando e 3 TODO. Sem regressão.
- Testes focados: 43 passando (Casa, feedback existente e F15). Após acrescentar a conferência de olho fechado aos casos de parcelas, os 9 testes F15 foram executados novamente e passaram.
- `npm test` foi tentado e falhou ao carregar `vite.config.ts` por acesso negado na varredura de diretórios. Executei Vitest pela API, com `config:false`, JSX automático e executor em `%TEMP%/f15-vitest.mjs`, fora do repositório, sem cache ou pacotes novos.
- **Controle negativo:** restaurei temporariamente `Lancar.tsx` e `Casa.tsx` de HEAD, mantendo os testes novos. Os **9 falharam**: 4 casos de prévia/confirmacão (1x, 2x, 6x e 12x, incluindo centavos e virada de ano), 4 ações sem a espera cancelável e 1 caso da nova mensagem de falha da foto. Restaurei a implementação em `finally`. A miniatura já existia; a falha deste último teste sem a mudança é pela mensagem nova, não por ausência anterior de miniatura.
- Testes `.test.ts`, `createElement`, componentes e hooks reais, com substituição apenas dos contratos de API e primitivas de navegador (canvas/imagem/storage/relógio). Cobrem cancelamento aos 5.999 segundos, envio aos 6 segundos, repetição durante espera e envio, foto preservada ao reenviar, ausência de base64 em rascunho/log, olho fechado e equipe sem dinheiro.
- Teste existente atualizado somente quanto ao texto esperado: os 3 casos parametrizados de `parcelas: previa, confirmacao e Cartoes usam a mesma frase` em `feedback.test.ts` agora esperam na confirmação também a explicação do impacto mensal já mostrada na prévia. A comparação da frase mensal com Cartões permanece.
- `git diff --check` sem erros.

## Arquivos

- `codigo/src/telas/lancar/Lancar.tsx`
- `codigo/src/telas/lancar/parcelamento.ts` (novo)
- `codigo/src/telas/lancar/F15.test.ts` (novo, 9 casos)
- `codigo/src/telas/casa/Casa.tsx` (somente CasaEquipe)
- `codigo/src/telas/lancamentos/feedback.test.ts` (expectativa de texto)
- `codigo/DEFINICOES-PROVISORIAS.md` (linhas acrescentadas)
- `RELATORIO-F15.md`
