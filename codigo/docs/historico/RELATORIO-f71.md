# F71 · Acabamento das abas

As abas e as folhas usam o musgo do Início J, três camadas de superfície, cartões de 12 px, pílulas de seção e botões compartilhados. O cabeçalho reúne título, subtítulo, selo de exemplo e olho nos papéis que acessam valores. Os números principais usam algarismos tabulares de 34 px no celular e 36 px no desktop. Avisos neutros, atenção em âmbar e risco financeiro em vermelho formam os três níveis.

- **Gastos e entradas** — destaque para o saldo do mês, seletor de lixeira e linhas com ações de correção e restauração.
- **Meu orçamento** — cartão de hoje em destaque, atalhos de seção e linhas de sobra e conquistas. O destaque de estouro acompanha o olho.
- **Cartões** — total e lista de faturas a conferir, com ação por linha e os mesmos acessos ao simulador e ao cadastro.
- **Casa** — conferência com cabeçalho de cartão, pílulas de Feira, Serviços, Gás e Folha e destaque para o valor da semana.
- **Guardado** — rendimento de hoje em superfície sólida e totais de aplicações e imóveis na mesma escala.
- **Planejamento** — cartões de saldo, limites, rendas e projeções na mesma hierarquia. O olho também mascara o sinal de que uma previsão passa da renda.
- **Desejos** — formulário, resultado de viabilidade e lista com o mesmo acabamento de cartões e controles.
- **Escritório** — palco em superfície sólida, filtros de sala, fila, diário, lembretes e fichas com a linguagem das abas.
- **Família e ajustes** — cartões e linhas para membros e convites, com pílulas de aparência e modo dos funcionários.
- **Privacidade** — tratamento comum para termo, exportação, cópia e exclusão, conforme o papel.
- **Painel do dono** — indicadores semanais tabulares, com status e explicações de origem.
- **Anotar** — folha com o mesmo cabeçalho, visor tabular e opções que se acomodam na largura da tela. A compra doméstica tem seu próprio fluxo.

## Verificação

- Chromium no exemplo local na porta 5196, servido pela API do Vite. Percorri as 11 abas e a folha Anotar em 375 × 812, 1280 × 800 e 1440 × 900, nos dois temas. Conferi o selo, a ausência de rolagem lateral da página e os alvos de 44 px dos controles medidos. Os pares de texto medidos ficaram acima de 4,5:1 nos dois temas.
- Em 375 e 1280 px, conferi o olho ao trocar de aba, as quatro seções de Casa, o simulador de Cartões, o rendimento por dia e as seções do Escritório. No celular, a pessoa da família e o Assessor foram redirecionados ao tentar abrir Guardado. O Assessor abriu Casa, Privacidade e Anotar compra sem campos de dinheiro.
- O teste integrado percorre as rotas autorizadas do dono, casal, pessoa da família e Assessor da Casa. Confere cabeçalho, estrutura, ausência de cifras com o olho fechado e Anotar, inclusive a ausência de campo monetário no Assessor.
- `npx tsc --noEmit` passou. A CLI do Vitest teve o carregamento bloqueado pelo esbuild. Pela API, a suíte completa registrou 1.790 aprovações, três casos `todo` e uma falha pré-existente. O teste do SVG da maquete mediu 30.002 bytes para um limite inferior a 30.000. Reproduzi a falha numa cópia limpa do `HEAD`.

## Fora da verificação

Celular físico, leitor de tela e sessão real. A rodada usou dados fictícios e ficou na worktree, sem alterações no banco, publicação ou commit.
