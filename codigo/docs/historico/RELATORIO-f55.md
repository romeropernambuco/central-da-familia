# Integração f55 · Laboratório de propostas

A worktree já continha correções da execução anterior. A revisão reaproveitou essas alterações e completou a verificação da geometria, dos testes e das datas. O app de produção continua passando pelo teste de isolamento do laboratório.

## Maquete e regressões

- **C · Jornada do Dia.** O teste procurava uma classe isolada da plaquinha antiga. Agora confere os nomes curtos da equipe da sala vinculada ao pedido e verifica que o olho fechado remove os rótulos e o foco. A vinheta usa a variante média.
- **D · Rumo a 2029.** O nome acessível ficava diretamente no SVG antigo, e a contagem de oito plaquinhas vinha daquele elenco. A cena decorativa agora fica dentro de uma imagem com nome acessível. O teste confere o elenco pelos nomes do snapshot, preserva o mínimo de oito rótulos e verifica o foco em Patrimônio e os três atalhos dos motores. A maquete recebe o papel da pessoa para proteger os balões.
- **E · Escritório Bento, quatro combinações.** O SVG decorativo da f44 saiu da árvore de acessibilidade. O palco passou a expor a cena como imagem com nome acessível. Os quatro testes verificam esse contrato e a variante média junto das cinco figuras, do título principal e do selo Exemplo. O papel também é passado para restringir os balões.
- **G · Primeira dobra.** O CSS anterior deixava a estimativa mensal do Plano 2029 entrar na dobra móvel com a nova geometria. A comparação no Chromium com o mesmo snapshot reproduziu quatro ocorrências no celular. Aumentar o palco móvel de 300 para 320 px e reduzir a margem negativa de 20 para 12 px devolveu a estimativa à rolagem. O teste original manteve a meta de 3, 3, 4 e 4, a legibilidade, a ausência de transbordo, o orçamento inteiro acima da navegação móvel e os 12 alvos de pelo menos 44 px.
- **G · Detalhe do cômodo.** Os oito elementos `foreignObject` são camadas compartilhadas da maquete nova. O teste confere os IDs dos postos e os nomes dos funcionários da sala focada. O detalhe conserva o título associado e a lista textual da equipe.
- **A, B e H.** A e H usam a variante média e passam o papel ao oferecer balões. B usa a variante grande nos dois dispositivos. Os testes de A e B verificam a variante na própria maquete. A também confere os nomes do elenco, em lugar de contar camadas do SVG. F conserva as variantes existentes.

## Medições da casca

Entrada real do laboratório aberta no Chromium, com as fontes locais, a rolagem no topo e o olho aberto. Foram conferidos os snapshots fictícios de 17 e 18/11/2026 às 11h no Recife. As contagens abaixo se repetiram nos dois temas e nas duas datas. Cada par indica primeiro o celular de 375 × 812 e depois o desktop de 1280 × 800. A largura da cena foi medida nos mesmos quadros.

- **A** · 5 e 8 números. Maquete de 325 e 568 px.
- **B** · 5 e 7 números. Maquete de 337 e 902 px.
- **C** · 1 e 1 número. Maquete de 301 e 437 px. A dobra do desktop termina antes dos valores da semana e do Plano 2029.
- **D** · 3 e 6 números. Maquete de 341 e 727 px.
- **E** · 4 e 4 números. Maquete de 307 e 640 px.
- **F** · 5 e 8 números. Maquete de 331 e 397 px.
- **G** · 3 e 4 números. Maquete de 320 e 480 px.
- **H** · 2 e 4 números. Maquete de 309 e 520 px.

Nenhum quadro apresentou rolagem horizontal. As vistas gerais iniciais de B, E e G mostram os 19 postos. Nas vistas focadas, o recorte cruza 13 postos em A, C, F e H e oito em D.

## Relógio e confirmação de lançamento

`Lancar` consulta os lançamentos do mês corrente no Recife. O histórico fictício é montado até o dia corrente. Na mesma conta de exemplo, a mediana usada pelo formulário passa de R$ 150,00 em 17/11 a R$ 155,00 em 18/11. O limite de cinco medianas sobe de R$ 750,00 para R$ 775,00. O rascunho de R$ 753,21 cruza o primeiro limite e fica abaixo do segundo. Em 1º/12 a amostra volta a ter só o café de R$ 12,00. A função do alerta calcula a mediana e os limites a partir dos números que recebe. A mudança observada vem dos lançamentos da fixture.

O teste de rascunho fixa a data no Vitest em 17/11 às 12h no Recife e recria a família de exemplo depois de ajustar o relógio. Continua cobrindo a mensagem, a gravação única após confirmar, a limpeza do rascunho e a remontagem. Também verifica que nenhuma gravação acontece antes da confirmação. O contexto de teste fornece o callback de fechamento que o formulário chama após salvar.

A busca por `Date.now`, `new Date()` e `hojeRecife` em testes também levou à revisão dos fixtures e usos indiretos. Os casos de privacidade da pergunta e do diário fixam 15/11, data à qual pertencem o vencimento e a resposta de exemplo. Os usos relativos que constroem e verificam os dados a partir do mesmo dia foram exercitados com o relógio adiantado.

## Validação

- `npx tsc --noEmit` terminou com zero erros.
- 96 arquivos e 1.659 testes passaram. Os três `todo` preexistentes de `motor_f13.test.ts` completam os 1.662 casos coletados. Os testes de geometria em Chromium rodaram.
- A suíte também passou com o relógio temporário avançado para 30/11 às 23h59 e 1º/12 às 00h01 no Recife. Cada arquivo de teste iniciou com a data simulada próxima da virada. O setup ficou fora da worktree.
- O Vite via CLI recebeu acesso negado do esbuild ao resolver o caminho absoluto da configuração. O Vitest rodou com a configuração do projeto importada pelo Node, com cache desativado. Pelo mesmo motivo, o teste de isolamento importa a configuração diretamente e mantém as duas verificações de build e seus asserts.
- `git add codigo` recebeu `Permission denied` ao criar `.git/worktrees/f55-integracao-design/index.lock` no repositório compartilhado. As alterações e este relatório ficaram na worktree para o commit.
