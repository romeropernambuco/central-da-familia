# Correções f26 — segunda rodada

Somente app. Nenhum SQL ou migração alterado.

1. Corrigido: imóvel e desejo conferem o estado produzido antes da inversão. Conflito não grava e informa “Isso mudou depois; confira antes de desfazer”. Testes: f26.test.ts (imóvel e desejo).
2. Corrigido: nenhuma chamada pública pula proteções durante desfazer. Os inversos usam explicitamente a API interna capturada. Teste: f26.test.ts, gravação concorrente.
3. Corrigido: promessa registrada antes de iniciar o envio; chamadas com a mesma chave compartilham o resultado. Teste: f26.test.ts, duas chamadas simultâneas; a versão anterior terminava por timeout.
4. Corrigido: rascunho conserva gasto/entrada; os três caminhos de entrada limpam após confirmação. Teste: f26-ui.test.ts, recuperar entrada e salvar.
5. Corrigido: removida limpeza ampla da API. Formulários limpam suas próprias chaves, incluindo o ID no imóvel. Testes: f26.test.ts e f26-ui.test.ts, preservar outro imóvel e remover somente o salvo.
6. Corrigido: leitura auxiliar posterior não rejeita uma gravação concluída; informa que o desfazer está indisponível. Teste: f26.test.ts, falha na segunda leitura.
7. Corrigido: inverso acompanhado pelo status Desfazendo. Teste: f26.test.ts, promessa controlada do inverso.
8. Corrigido: exportar/restaurar exemplo exigem sessão ativa e papel casal na API. Testes: f26.test.ts, pessoa e sessão encerrada. O real mantém autorização do banco; não oferece restaurar.
9. Corrigido: validador compartilhado confere estruturas, campos obrigatórios, tipos, identidades, referências e coerência entre áreas antes de substituir. Rejeição atômica. Testes: f26.test.ts, envelopes objeto, objetivo incompleto, Guardado inválido, referência inexistente e configuração inválida.
10. Corrigido: prévia inclui inclusões, exclusões e alterações de todas as áreas do arquivo; detalhes antes/depois disponíveis com olho aberto e ocultos com olho fechado. Teste: f26.test.ts, alteração/exclusão/inclusão em config.
11. Corrigido: backup inclui chaves dos lançamentos e restaura o mapa; envios pendentes impedem restauração pela API e pelo adaptador. Teste: f26.test.ts, repetir a chave após restaurar não duplica.
12. Corrigido: estado atual do olho consultado após o await, imediatamente antes de mostrar ou baixar; confirmação inicial também é preservada. Teste: f26-ui.test.ts, fechar o olho durante leitura, e privacidade-global.test.ts.
13. Corrigido: Sair disponível no resumo de Privacidade do Assessor da Casa; Ajustes continua protegido. Teste: f26-ui.test.ts e pessoas-f25.test.ts.
14. Corrigido no app; pedido ao banco registrado: membros podem trazer user_id; autoria resolve esse vínculo. Sem vínculo, identifica alguém da família. Teste pessoas-f25.test.ts agora diferencia auth-ana do ID a; f26-ui.test.ts cobre vínculo ausente.
15. Corrigido no app; pedido ao banco registrado: falha do UPDATE gera aviso de gasto salvo e botão Informar de novo. Repetição faz somente o UPDATE, sem chamar novamente a RPC. Testes: api/erros-real.test.ts e fase_final_real.test.ts.
16. Corrigido: edição valida contra a coleção editada, incluindo Assessores, excluindo apenas o registro atual. Teste: f26-ui.test.ts, duplicidade de Assessor.
17. Corrigido: rejeita controles, caracteres invisíveis, marcação e nomes sem letra ou número. Testes: f26.test.ts e nome-pessoa.test.ts.
18. Corrigido: sem skipWaiting nem clients.claim; nova versão espera as abas antigas fecharem. Caches antigos são preservados, inclusive seus assets; não há coleta automática desses caches nesta rodada. Teste: sw.test.ts, instalar/ativar e recuperar asset antigo.
19. Corrigido: precache segue entrada, partida e imports estáticos; rotas lazy ficam sob demanda. Teste: f26.test.ts, dependência estática incluída e rota lazy excluída.
20. Corrigido: script inline independente do bundle oferece Tentar de novo em erro do módulo inicial ou timeout; eventos da entrada encerram o temporizador. Testes f26.test.ts executam o script sem módulo nos dois casos.
21. Corrigido: texto do roteiro alinhado a falha.ts; acrescentados módulo inicial e rota lazy após abertura (modo --exemplo). Teste: f26.test.ts e falha.test.ts. Roteiro Playwright não executado: dependência indisponível nesta instalação.
22. Corrigido: Anfitrião não repete o papel na fala de fallback. Teste: f26-ui.test.ts, contagem da frase.

## Verificação

- TypeScript: npx tsc --noEmit, zero erros.
- Suíte completa: 68 arquivos verdes; 1.300 testes passaram e 3 todo preexistentes na execução completa. Após reforçar a coerência e o vínculo das chaves restauradas, os 33 testes dos arquivos afetados passaram novamente.
- Build de produção validado por API do Vite, com a mesma base e plugin React, e geração real de sw.js. A chamada CLI via unidade temporária encontra uma limitação de caminhos do plugin de HTML; a execução programática no caminho canônico passou.
- Testes novos foram observados falhando antes das respectivas correções; cobertura adicional confirma preservação de chaves, rejeição atômica e repetição isolada do pagador.
- Nenhum navegador ou servidor foi iniciado. Sem alterações no banco. Pedidos ao dono em DEFINICOES-PROVISORIAS.md, seção Pedidos ao banco - rodada 2.
