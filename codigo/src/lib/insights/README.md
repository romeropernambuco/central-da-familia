# Insights proativos — contrato para integração

Todos os arquivos desta frente são novos. Não houve mudança em `Pergunta.tsx`, `AgenteDaAba.tsx`, telas, cálculo existente ou banco.

## Motor e regras

`avaliarInsights(snapshot, agora, memoria)` é puro e devolve no máximo um `Insight` por rota. `candidatosInsights` permite auditar separadamente os oito gatilhos. `agora` aceita epoch em milissegundos, Date válido ou ISO com fuso explícito; texto sem fuso é rejeitado. Calendário e silêncio usam `America/Recife`, sem getters locais do aparelho. Ausência/valor inválido não vira zero.

| Gatilho | Condição | Funcionário / rota | Ação explícita |
| --- | --- | --- | --- |
| Fatura | Sem pagamento, vencimento inclusivo de hoje até 3 dias | cartao / cartoes | `faturaInformar`, hoje ou data informada |
| Divergência | Valor do banco conhecido; diferença absoluta de pelo menos 1 centavo | cartao / cartoes | Conferir composição; vale também para fatura paga |
| Parcelas | Parcela identificada na mesma fatura não paga, de hoje até 3 dias | cartao / cartoes | Composição, nunca pagamento de parcela |
| Reserva | Combinada positiva e livre menor, ambos do mês atual | colchao / planejamento | Abrir Planejamento |
| Recebimento | Aberto; `mesNovo || mesPrevisto` estritamente anterior ao mês atual | tesoureiro / planejamento | Dono confirma data e valor previsto, ou reagenda para mês futuro, via `recebimentoMudar`; alheio só consulta |
| Aplicação | Ativa; vencimento inclusivo de hoje até 15 dias | guardado / guardado | Revisar destino no Guardado |
| Feira | Registrada até hoje, sem nota e justificativa nula ou vazia | fiscal / casa | Abrir tarefa de foto ou `feiraSemNota` |
| Objetivo | Projeção financeira menor que necessário, na saída existente de `futuro` em modo projeção | tesoureiro / planejamento | Rever aportes/premissas; não usa metas pessoais |

Prioridade: vence hoje (0), vence em breve (1), informativo (2). Desempate: data mais próxima, ordem explícita do motor, chave do assunto. Divergência não herda a exceção noturna da fatura: é informativa. Silêncio das 22h inclusive até 7h exclusive; só vencimentos do próprio dia passam. Adiamento e resolução continuam valendo mesmo nessa exceção.

Fatura, divergência e parcela compartilham chave cartão+mês. Se coexistem, a cobrança ganha; a frase “Há parcelas vencendo nesta fatura” aparece no contexto e a composição permanece disponível no mesmo card. Não se fazem três perguntas sobre a mesma fatura. A mesma chave vista suprime todos esses candidatos naquele dia; outro cartão continua elegível. Reserva/objetivo usam período mensal; recebimento usa mês efetivo; aplicação usa vencimento; feira usa registro+semana. “Já resolvido” cala esse assunto/período, sem afirmar pagamento ao banco.

Dinheiro chega da API em reais somente ao adaptador `snapshot.ts`, que o converte a centavos inteiros seguros. O motor não formata nem interpola valores: nenhuma das oito perguntas precisa deles. Nomes ficam no contexto com fragmentos explícitos; `apresentarInsight` usa as mesmas primitivas centrais de `PerguntaCard` (`textoDeAgente`/`rotuloDeOpcao`, sobre `formato`). O hook usa `textoPrivado`, reexportado por `componentes/privacidade`, na composição. Rótulos fixos continuam legíveis; não há descoberta de nomes por capitalização.

## Uso do hook

`useInsightsDaAba(rota)` devolve:

- `pergunta` (ou null), `perguntas` (0 ou 1), `responder`: contrato de `PerguntaCard`, com metadados `tipo`, `acao`, `chave`, `prioridade`, `exemplo` e `etiqueta`.
- `marcarVista(id)`: chamar num efeito **após o card ter sido efetivamente exibido**, com dependência no ID. Não chamar durante render ou para card encoberto por outro diálogo. Persiste dedupe sem retirar o card que já está na tela. Remontar no mesmo dia não repete.
- `estado`, `motivo`, `atualizar`: erro parcial é explícito e só dados concluídos participam. Trocas de usuário/família/papel/modo invalidam leituras anteriores; não se reutiliza snapshot velho.
- `notaPendente`, `anexarNota(fotoBase64Jpeg)`, `fecharNota`: estado e callbacks para a folha de foto da UI. O consumidor deve renderizar a folha/input e reduzir a foto com `reduzirFoto`, como já faz o cadastro. Somente a foto escolhida pelo usuário chama `feiraAnexarNota`. Não usar `abre:'nota'`: PerguntaCard envia o caminho pelo contrato de pergunta do banco, incompatível com IDs locais.

Passar `p={pergunta}`, `quem` conforme `funcionario`, `responder={responder}`. Conservar a etiqueta já existente de `api.modo === 'exemplo'`. Não enviar IDs `insight:*` a `useEscritorio().responder`/`escritorioResponder`. A composição abre a folha de explicação existente; atalhos navegam pelo hash. Nenhuma resposta de domínio é escrita por efeito de avaliação, timer ou render. As escritas ficam nos callbacks de ação do usuário e usam a API selecionada. Trava síncrona impede toque duplo; falha não marca resolvido.

## Leituras e limites de dados

`leitura.ts` usa apenas endpoints existentes, por aba, sem importar `api/exemplo*` ou fallback fictício. Equipe só consulta `feiras` em Casa; pessoa não consulta finanças. O snapshot da equipe descarta dinheiro/nome de feira mesmo se a resposta contiver campos extras. O resumo do contexto é reutilizado no Planejamento.

Cartões usa cartões, faturas de 2 meses e pagamentos informados. Sem uma dessas leituras não infere “não pagou”. Apenas quando há cobrança/divergência elegível, lê o histórico por mês de compra: 26 meses, em grupos de 4, cobrindo até 24 parcelas com deslocamento de até 2 meses do calendário de fechamento. Reutiliza `simularCompra`, sem alterar a lógica de cálculo. O exemplo também entrega parcelas sintéticas; elas são ignoradas para não duplicar as compras originais. Qualquer falha no histórico impede a composição e o gatilho de parcela; a cobrança baseada na fatura continua válida. A folha distingue composição indisponível de compras localizadas; itens/tarifas não localizados não são inventados. Compras com mais de 24 parcelas estão fora do contrato do cálculo existente.

Aplicações de `guardadoHoje` já são as ativas. Objetivo reutiliza `futuro`; compara a última linha financeira com `patrimonio_necessario`, sem somar imóveis novamente e sem converter centavos em centavos outra vez. Modo renda, taxa que produz necessário null e saída sem projeção não geram esse aviso.

## Persistência

Escolhido **localStorage com try/catch e fallback em memória**, seguindo o padrão já usado pelo olho no contexto. Chave `insights:v1:` + JSON `[modo, userId, familiaId]`. Valor contém só chaves opacas de assunto/período e `vistoEm`, `adiadoAte` ou `resolvido`. Não guarda snapshot, dinheiro, nomes, fotos, tokens ou mensagens. JSON é validado com lista de campos permitidos. “Depois” padrão: amanhã às 7h de Recife; o motor também aceita adiamento até um instante exato.

É uma preferência deste aparelho/navegador, sem nova chave de config/banco, sem sincronização entre dispositivos. Não é criptografia. Armazenamento bloqueado mantém a sessão funcional; depois de fechar/reabrir nesse caso o dedupe pode se perder. Duas instâncias mesclam metadados lidos; evento `storage` atualiza outras abas, sem prometer transação entre processos concorrentes.

## Validação e escopo

Testes `.test.ts`, sem JSX: tabelas dos oito gatilhos, limites de centavos/calendário, silêncio, desempate/dedupe/adiamento/resolução, papéis/proveniência, snapshot/leituras/ações, hooks React reais e DOM/aria-label real de PerguntaCard. Propriedade determinística percorre 2.000 snapshots, inclusive incompletos/corrompidos, sem exceções, mutação ou mais de uma pergunta por rota.

Resultado verificado: TypeScript (`node node_modules/typescript/bin/tsc -p . --noEmit`) sem erros; suíte completa com **590 testes em 37 arquivos**, incluindo os **504 existentes + 86 novos**. `npm test` teve acesso negado ao carregar vite.config.ts; foi usada a API do Vitest por executor temporário fora do repositório, com cwd/root em `codigo`, `config:false`, `envFile:false`, JSX automático e processos isolados. Contraprova: implementações novas substituídas temporariamente por exportações sem comportamento, mantendo imports/coleta válidos; **86/86 testes novos falharam**. Os arquivos foram restaurados byte a byte antes da validação final. Nenhum teste ficou pulado, nem houve instalação ou build.

A integração visual ficou deliberadamente fora: outra frente conecta o hook ao agente e renderiza a tarefa de foto. Sem esse encaixe, nada novo aparece no app. Não há notificações do sistema ou execução com app fechado: o hook verifica o relógio a cada 30 segundos, no foco e na volta de visibilidade; leituras acompanham versão/dia/atualização. Não houve alteração de telas, componentes protegidos, exportações API, scripts do repositório, pacotes, banco ou serviços externos.
