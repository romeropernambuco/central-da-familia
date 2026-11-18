# H · Instrumentos

## Conceito

Um caderno de leituras da família. A abertura verde-petróleo concentra o dinheiro disponível para hoje e o atalho para avisos. Abaixo, uma régua editorial reúne quatro instrumentos em uma fileira no desktop e em uma coluna no celular. A curva de Aplicações abre a régua e recebe a célula mais larga no desktop. Cada instrumento tem uma frase que resume o que o desenho ajuda a entender.

Da [referência visual](../referencias/nerdwallet.md) vêm a faixa editorial de ponta a ponta, a sequência de superfícies claras e mentas, a diferença de peso entre títulos e texto e os filetes finos entre módulos. A abertura usa cor sólida. O restante da tela alterna papel, cartões e duas intensidades do mesmo verde. Os raios são de 12, 8 e 6 px, com avatares circulares de 32 px.

## Hierarquia

- **Em 2 segundos** — identificar quanto está disponível hoje e se há algo a conferir.
- **Em 5 segundos** — ler a direção recente das Aplicações e localizar o Ritmo do mês. No desktop, o ritmo, o Plano 2029 e a leitura das faturas cabem na mesma dobra. No celular, os atalhos **Mês**, **Plano** e **Faturas** levam aos instrumentos.
- **Depois** — usar **Mais** para chegar ao escritório, alternar entre salas e ver quem está trabalhando ou precisa de atenção. **Ver avisos** vai direto à fila, que destaca uma ocorrência de cada nível disponível.

## Tipografia e cor

- **Manrope Variable** nos títulos, com pesos de 800, H1 de 40/52 px, H2 de 26 px e títulos dos instrumentos de 21 px.
- **Inter Variable** no texto, controles e quantias. O valor de hoje tem 35 px. Os valores de leitura têm 27 px. Os algarismos são tabulares, preservam a unidade na mesma linha e o símbolo de porcentagem tem 65% do tamanho do numeral.
- No claro, destaque `#166954`, abertura `#10473d`, papel `#f7faf8` e menta `#edf7f2`. No escuro, destaque `#8dd2ba`, três camadas `#0c0c0b` / `#131312` / `#1a1918` e menta escurecida `#14221d`. As misturas de cor são em OKLCH. Vermelho aparece na etiqueta **Dinheiro em risco**.

## Leituras e privacidade

A curva usa os pontos datados de `serieSaldo30Dias` e calcula a diferença entre os extremos cronológicos. O ritmo soma `serieDiaria` e compara com `limite`; o marcador de referência permanece legível quando os gastos passam do teto. O arco usa `progressao`, a cobertura oficial com margem, e satura visualmente no máximo. As barras somam `proximas` por mês de vencimento na janela do Início. A legenda de cada gráfico permanece no fluxo de leitura do leitor de tela.

Com o olho fechado, as geometrias e as frases dependentes de valores saem do DOM. Os quatro instrumentos passam a ter o mesmo bloco neutro. A fila usa as descrições de cada nível e a maquete não recebe balões. O perfil do Assessor da Casa entra diretamente nas tarefas operacionais. Um perfil indisponível recebe a mensagem de acesso indisponível.

## Escritório

**Equipe trabalhando** é uma faixa menta com duas áreas no desktop e empilhada no celular. A maquete isométrica compartilhada mostra funcionários em mesas, com plaquinhas de estado. Os controles de sala destacam o piso e atualizam a lista textual de nomes e estados. Essa lista dá acesso aos estados quando as plaquinhas estão pequenas. Após escolher uma sala, o casal pode ver o saldo em conta do Contador ou o rendimento de hoje do Guardado quando o dado existe. O balão recebe uma descrição acessível junto à maquete.

A integração passa `variante: 'media'` e `oculto`. A versão compartilhada disponível nesta worktree já aceita foco, plaquinhas e balões, e renderiza o SVG atual no espaço reservado para a média.

## Autoavaliação

1. **Hierarquia em dois segundos — 9/10.** O disponível de hoje concentra o peso numérico, com o atalho de avisos ao lado. O título editorial ainda ocupa parte do espaço de leitura imediato.
2. **Números acima da dobra — 9/10.** A abertura tem um valor. Os outros surgem nas frases que explicam os gráficos. O ritmo comunica a posição dos gastos em relação ao limite com texto e geometria.
3. **Ritmo e espaçamento — 8/10.** A régua une os instrumentos por filetes e a faixa menta separa o escritório. Os quatro instrumentos ficam distribuídos por mais de uma dobra no celular.
4. **Tipografia — 9/10.** Manrope distingue títulos, enquanto Inter mantém textos curtos e cifras tabulares. As legendas da maquete compartilhada ficam pequenas no celular.
5. **Ícones e ilustrações — 8/10.** Os ícones identificam módulos, salas e alertas. A ilustração da porta ajuda no acolhimento e tem papel decorativo.
6. **Organização por tarefa — 8/10.** Disponível, avisos e Plano têm caminhos diretos. Resolver um aviso, atualizar um limite ou explorar o histórico completo depende das telas de origem na integração de produção.
7. **Acessibilidade — 8/10.** Texto, controles, foco e marcas têm pares de contraste testados. Cada instrumento tem uma síntese textual. Uma leitura ponto a ponto exigiria um detalhe acessível da série.
8. **Privacidade — 9/10.** Trocar valores, totais, frases ou percentuais produz o mesmo HTML com o olho fechado. O nível do aviso e o estado do funcionário continuam visíveis para orientar a operação.
9. **Claro e escuro — 9/10.** Cada tema tem paleta própria e a mesma sequência de leitura. O escuro conserva três superfícies perceptíveis, com separadores discretos.
10. **Escritório como personagem — 8/10.** Salas, mesas, estados e balões conectam a equipe ao dia. Nesta versão compartilhada, a representação isométrica cobre quatro salas e oito postos.

## Como produtizar

1. Montar a experiência dentro do roteamento e do escopo de sessão atuais. Iniciar pelo `useResumoFamilia` de `app/useResumoFamilia.ts` para obter disponibilidade de hoje, envelope autorizado, faturas, cobertura do Plano e pendências. Mapear estados e unidades num adaptador de apresentação. Manter a autorização também na origem e respeitar `restrito`, `carregando` e `erro` antes de renderizar valores.
2. Obter a série de saldo com `useGuardado` (`g.saldo_30`, em `app/useDados2.ts`). Para o ritmo, combinar `useLeituraRemota`, `lerLancamentosMes` e `porDiaDe` com o envelope visível, como em `RitmoOrcamento.tsx`. Preservar o fuso de Recife e o limite fornecido pelo seletor. Reusar `repetir` ou `atualizar` da leitura que falhou.
3. Alimentar a maquete com `useEscritorio`, `useEquipeCompleta` e o cadastro `EQUIPE`. Ligar o olho ao controle persistido do aplicativo. O escopo de dados do Assessor continua vindo do fluxo de Casa. Usar o selo apenas na sessão de exemplo.

## Fechamento

Medição na casca, no topo e com o olho aberto, com o snapshot de exemplo de 18/11/2026. Em claro e escuro, **375 × 812 mostrou 2 números** (disponível de hoje e variação das Aplicações) e **1280 × 800 mostrou 4 números** (os dois anteriores, cobertura do Plano e total de faturas do mês destacado). Sem rolagem horizontal nas quatro prévias, e todos os botões da proposta atingiram 44 × 44 px. A seleção de Patrimônio destacou a sala e abriu o balão do Guardado com descrição acessível. A casca zerou a contagem e removeu o balão e os gráficos ao fechar o olho.

O teste da proposta cobre a matriz claro/escuro × celular/desktop, o orçamento de números, a permissão do Assessor, estados sem dados, as três prioridades, nomes acessíveis, o alvo mínimo definido no CSS, movimento reduzido e o contraste dos pares. A prova de privacidade altera valores e compara o HTML fechado inteiro, incluindo geometria e atributos.

`npx tsc --noEmit` terminou com zero erros. Os 13 testes da H passaram e todos falharam ao substituir o componente pela versão de `HEAD`, sem alterar arquivos. A CLI do Vitest parou na leitura do `vite.config.ts` pelo esbuild, com acesso negado. As verificações rodaram pela API do próprio Vitest, com a configuração original importada diretamente e o cache desligado.

A última execução da suíte inteira terminou com **1.583 testes aprovados, 3 falhas e 3 TODOs**. A comparação com `HEAD` reproduziu as mesmas três falhas, com 1.570 aprovações antes dos 13 novos testes.

- `src/componentes/ux-cobertura.test.ts` esperava o aviso de valor atípico ao salvar um rascunho.
- `src/propostas/isolamento.test.ts` chama o carregamento de configuração via esbuild e encontrou acesso negado.
- `src/propostas/b/proposta.test.ts` esperava encontrar `918273,46` após alterar um valor na fila.
