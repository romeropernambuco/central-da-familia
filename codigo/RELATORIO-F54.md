# F54 — Acessibilidade, service worker e desempenho

## Acessibilidade

1. **Corrigido. Pergunta pendente na revisita móvel.** O controle de conversa continua acessível no modo Desligado se houver pergunta. O teste de revisita em `AgenteDaAba.test.ts` abre a mesma pendência em Completo, Só texto e Desligado.
2. **Corrigido. Foco ao abrir e recolher a conversa.** O primeiro botão de resposta recebe foco quando monta, inclusive quando a pergunta precisa adquirir a instância ativa. O fechamento devolve foco à divulgação. O mesmo teste de revisita verifica os dois destinos de foco.
3. **Corrigido. Rótulo das respostas.** O texto visível também dá nome acessível ao botão. O teste de revisita verifica “Anexar nota” e `privacidade-global.test.ts` verifica nomes distintos e consistentes com os rótulos nos estados do olho.
4. **Corrigido. Convites com o olho fechado.** As ações de um convite recém-criado e de reenvio usam botão nativo no estado oculto. Acioná-lo mostra a instrução para abrir o olho, sem reenviar nem incluir URL com dados privados. `f54.test.ts` percorre os dois fluxos.
5. **Corrigido. Editar nome nos Ajustes.** O botão fica fora do elemento truncado. O nome longo quebra linha no espaço disponível. `f54.test.ts` verifica o controle na linha do convite, sua estrutura e a regra de quebra.
6. **Corrigido. Contraste de foco e seleção.** O foco do aviso usa a tinta do próprio aviso. A opção pressionada tem contorno interno de 2 px. `f54.test.ts` calcula os contrastes WCAG a partir dos tokens de ambos os temas para o foco e para o contorno contra os dois fundos adjacentes.
7. **Corrigido. Anotar e página atual.** O botão central inclui ícone e texto. O destaque do grupo Ajustes funciona independentemente do `aria-current`, que acompanha a rota efetiva. `AgenteDaAba.test.ts` verifica os dois elementos dentro do botão e `f54.test.ts` abre o menu Mais em Privacidade.
8. **Corrigido. Nova tentativa no Início e cartão sem faturas.** Últimos lançamentos usa o botão compartilhado de pelo menos 44 px. Um cartão cadastrado sem faturas tem uma mensagem compacta na própria seção. `f54.test.ts` monta as duas telas nesses estados.
9. **Corrigido. Estilos do funcionário, ícone e ordem do Resumo.** A compactação do cartão fica limitada a 600 px. Imóveis usa `imoveis`, distinto de Aplicações. O Resumo tem uma ordem única de leitura, foco e apresentação, começando pelo orçamento também no desktop. `f54.test.ts` cobre o breakpoint e `familia.test.ts` cobre o ícone e a ordem dos blocos.

## Service worker e offline

10. **Corrigido. Isolamento de versões.** Cada instalação tem cache próprio por caminho e versão, e a ativação limpa os caches anteriores daquela instalação. A casca offline fica vinculada ao precache instalado. O navegador ainda recebe a navegação bem-sucedida da rede, e a recuperação de chunks continua disponível. URLs dos GLBs recebem um hash do conteúdo dos modelos no build. `sw.test.ts` simula HTML e GLB antigos e verifica instalação, fallback e ativação. `escritorioMini.test.ts` verifica leitura offline e mudança do hash ao alterar os bytes.
11. **Corrigido. Precache da abertura.** O manifesto do Vite identifica a entrada, a partida, o backend do modo, o Início e a interface isométrica. O script segue imports estáticos, CSS e assets associados. A cena, Three, GLBs, Ficha e rotas pesadas continuam fora da lista de abertura. `sw.test.ts` verifica o fechamento do grafo sem seguir as arestas dinâmicas. Também conferi a lista emitida pelo build.
12. **Corrigido. Quota e registro tardio.** Falhas no cache não descartam a resposta da rede. Se a partida baixar depois de `load`, registra o SW imediatamente. `sw.test.ts` simula quota e `f54.test.ts` importa a partida com o documento já completo.

## Desempenho

13. **Corrigido. 3D antes de entrar na área visível.** O painel isométrico do Início e o mini dos funcionários exibem estado estático até a interseção. `EscritorioIsometrico.test.ts` testa o Início real e `AgenteDaAba.test.ts` testa o mini. Os dois verificam a ausência do import de Three antes da interseção.
14. **Corrigido. Carga inicial.** Cadastro, Ficha e Números da Aba são solicitados quando o usuário abre os respectivos controles. A abertura usa figuras nominais, e o vocabulário dinâmico dos funcionários usa seu próprio registro. Regras de etiquetas e de salas 3D saíram do CSS global. `AgenteDaAba.test.ts` verifica o grafo estático da abertura e `dinheiro-f29.test.ts` preserva a ilustração e a ação do estado vazio.
15. **Corrigido. Leituras e renderizações repetidas.** A projeção usa a mesma leitura protegida de `fontes_receita` e `receitas_controle` que Recebimentos. A mudança em `api/protegida.ts` limita-se ao receptor de `futuroEntradas` e deve ser preservada ao integrar a f53. Os campos memoizados e callbacks estáveis permitem que os cartões dos outros campos conservem seus resultados. As fórmulas e seletores de números são os mesmos. `f54.test.ts` conta as consultas concorrentes, e `familia.test.ts` verifica as referências após invalidar só Desejos.

## Ajustes de testes existentes

- Os testes de privacidade e interação agora verificam o nome acessível usado de fato e o botão de reenvio com o olho fechado. Permanecem as verificações de sigilo, operação e instrução.
- O teste da antiga composição em duas colunas verifica a ordem real das seis seções principais. As verificações de espaço reservado, navegação e expansão continuam no mesmo teste.
- Os testes do SW verificam a cauda do ciclo atual: a versão em uso é preservada durante a instalação e removida ao ativar a nova. Uma navegação online devolve HTML novo e conserva a cópia offline da versão ativa.
- Os testes de Ficha aguardam seu import sob demanda. O teste do estado vazio continua checando a figura de Sem Gastos e a ação de anotar. O teste de rascunho recebe um histórico conhecido para exercer a confirmação de valor atípico sem depender da data do exemplo.

## Medição e verificação

- Builds de produção com os mesmos valores locais de configuração, sem consultar o Supabase. JavaScript e CSS do grafo de abertura, medidos em gzip, passaram de **262,13 kB para 246,82 kB** (−5,8%). A soma inclui dependências compartilhadas, backend e a interface isométrica. A medição considera a cena 3D como recurso sob demanda.
- `index.js` passou de 1,883 kB para 1,880 kB. `partida.js` passou de 156,17 kB para 134,69 kB. O CSS de partida passou de 14,45 kB para 13,37 kB. O JavaScript próprio do Início passou de 6,12 kB para 6,43 kB.
- O build de produção gerou 28 arquivos para o precache, todos presentes na saída. A lista contém HTML, partida, backend, Início e interface isométrica e exclui Three, cenas, GLBs, Ficha e rotas lazy pesadas.
- O foco do aviso mediu 16,91:1 no claro e 17,15:1 no escuro. O contorno do segmento mediu, contra a superfície selecionada e o fundo do grupo, 18,52:1 e 15,39:1 no claro, e 16,21:1 e 14,69:1 no escuro.
- Os testes de regressão foram executados com o código original de `2bbed9a` para reproduzir as falhas. A verificação usou cópias temporárias com o mesmo código e dependências porque o resolvedor do esbuild precisava enumerar uma pasta ancestral bloqueada na worktree.
- `npx tsc --noEmit` passou com zero erros. Os builds de produção e exemplo passaram. Os 302 testes focados passaram.
- A suíte inteira terminou com **1.588 aprovados, 3 todo e 1 falha**. O mesmo teste de privacidade da Proposta B já falhava em `2bbed9a`, no controle positivo que espera encontrar `918273,46` na marcação com o olho aberto. O caminho `src/propostas/` ficou fora do escopo solicitado.
- O Git recusou `git add codigo` com acesso negado ao criar `index.lock` na worktree. Os arquivos ficaram disponíveis na worktree para o commit.

## Pedidos ao banco

Nenhum item da f54 requer alteração no banco.
