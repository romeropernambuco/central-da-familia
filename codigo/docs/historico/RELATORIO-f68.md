# F68 · Escritório completo

**A J é a candidata ao Início real.** Sua composição reúne o escritório, o resumo financeiro e a fila de decisões no mesmo painel. A M preserva a navegação lateral e as duas colunas aprovadas. A L dá a maior largura à planta. Ambas receberam o mesmo escritório, os controles e as fichas da J. Os blocos longos da f67 continuam nas duas páginas móveis.

- **Cena.** J, M e L abrem com 19 pessoas em sete salas. As pílulas aproximam cada sala e **Todas** recupera a vista completa. No celular, o palco ocupa a altura da tela e aceita pinça, arraste e zoom por botões. **Ampliar** abre em tela cheia. Os nomes aparecem sob demanda. O expediente fictício tem 8 pessoas trabalhando, 5 aguardando o início, 3 com entrega e 3 aguardando uma decisão.
- **Fichas.** Cada pessoa tem função, estado, atividade, último resultado e atalhos autorizados. A ficha abre a tarefa correspondente na fila e o remetente destaca seu posto e abre a ficha. O olho mascara valores e texto livre. O Assessor da Casa vê sua área doméstica. O expediente e as ações da fila usam somente dados de exemplo.
- **Chrome.** Conferi 375 × 812, 390 × 844, 1280 × 800 e 1440 × 900 em claro e escuro. Vi os 19 postos no enquadramento inicial, monitores acesos e os pontos de atenção. Rostos e acessórios ficam mais legíveis com o foco de sala. Testei pinça e arraste por toque emulado, tela cheia no desktop e a ida e volta entre a ficha do Analista de Cartão e sua tarefa. A cena fez 10 chamadas e 38.548 triângulos por quadro, dentro do orçamento de 32 e 45.000. O Início do aplicativo também abriu com 19 postos em modo exemplo. Ficaram por verificar celular físico, Safari e desempenho em GPU móvel.
- **Testes.** `npx tsc --noEmit` terminou com zero erros. O Vitest aprovou 1.775 testes em 104 arquivos, com 3 casos `todo`. A CLI esbarrou na leitura da configuração pelo esbuild. Executei a suíte pela API do Vitest.

O Git bloqueou a criação de `index.lock`. A entrega está no worktree, sem commit.
