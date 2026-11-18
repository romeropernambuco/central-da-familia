# Proposta E · Bento ilustrado

O Início vira um mosaico de cinco cartões. O orçamento do dia ocupa o maior bloco e estabelece a primeira leitura. O Plano 2029 ocupa a coluna alta. Aplicações e Faturas fecham a segunda linha, e o Escritório cruza toda a largura abaixo. No celular, a sequência segue a mesma ordem de leitura em uma coluna, com navegação inferior.

A referência visual orientou a abertura escura, os cartões em tons suaves com ilustrações de linha, a ação principal de cantos retangulares e o espaçamento em múltiplos de 4 px. O verde oliva dá unidade à Central. A assimetria e a presença das figuras diferenciam a proposta das outras composições do laboratório.

## Hierarquia

- **Em 2 segundos** — A faixa aponta a ação do dia. O bloco escuro responde quanto a pessoa pode gastar hoje.
- **Em 5 segundos** — O Plano 2029 mostra o que falta por mês com margem de segurança. Se a projeção for superavitária, o cartão informa a sobra mensal. Aplicações e Faturas mostram um total de cada área.
- **Depois** — O Escritório mostra quem trabalha em cada sala e traz a fila com a prioridade por escrito. A fila abre com até três itens por ordem de urgência e permite ver os demais em **Mais tarefas**. No celular, **Ver fila** leva o foco direto à lista.

## Fontes e paleta

- **Bricolage Grotesque Variable** para títulos e **Inter Variable** para controles, legendas e valores. O valor principal tem 36 px, e os secundários têm 27 px. Os algarismos são tabulares e ficam na mesma linha.
- **Claro** — Fundo `#f5f4ef`, cartão `#fffdfa`, verde oliva `#40582d`, bloco principal `#293923`. Plano `#e8eddd`, Aplicações `#f1f3e9` e Faturas `#f1ede4`.
- **Escuro** — Fundo `#0c0c0b`, cartão `#131312`, menu `#1a1918`, verde de destaque `#c0d6a7` e bloco principal `#263322`. Os fundos dos demais cartões variam do musgo ao carvão quente.
- Raios de 12, 8 e 6 px, sombra leve no claro e misturas em OKLCH nas bordas e ilustrações. O vermelho aparece em **Dinheiro em risco**. **Operação** e **Lembrete** se distinguem por rótulo, ícone e texto.

## Medição da primeira tela

Medição feita em Chromium com o HTML da proposta, as fontes locais, as dimensões CSS da casca e a função `medirNumeros` do laboratório. O snapshot da API de exemplo foi fixado em 17/11/2026 para repetir o teste.

- **Celular, 375 × 812** — 4 números no claro e 4 no escuro. Meta de até 5.
- **Desktop, 1280 × 800** — 4 números no claro e 4 no escuro. Meta de até 8.
- As quatro ocorrências são o orçamento diário, a projeção mensal oficial com margem, o total aplicado e o total de faturas a vencer ou conferir. O ano em **Plano 2029** identifica o plano. O Escritório mantém o balão abaixo da dobra e mostra apenas um valor distinto, quando a fila traz um valor para um posto desenhado.
- Sem transbordamento horizontal nos quatro quadros. O teste verificou alvo mínimo de 44 × 44 px e que os valores cabem nos cartões com o snapshot medido.

## Escritório

A maquete da frente compartilhada ocupa o palco do cartão largo, ao lado da fila no desktop e acima dela no celular. Os botões Caixa, Casa, Cartões e Patrimônio destacam a sala e abrem a lista em texto com nome e estado de cada pessoa. A cena usa as plaquinhas compartilhadas e pode mostrar um balão de valor quando ele acrescenta uma informação à fila. Com o olho fechado, os relatos da fila viram ações genéricas e o balão sai da cena. A área foi dimensionada para a variante média e usa as propriedades disponíveis nesta worktree. A maquete tem nome acessível por apresentar estado real da equipe. As cinco figuras decorativas ficam fora da leitura assistiva.

## Autoavaliação

1. **Hierarquia em dois segundos — 9/10.** A escala e o fundo do orçamento criam um ponto focal. A leitura em dois segundos é uma hipótese de design.
2. **Números acima da dobra — 10/10.** Quatro ocorrências nos quatro quadros, confirmadas pelo medidor da casca, com folga nas duas metas.
3. **Ritmo e espaçamento — 9/10.** O desktop intercala bloco largo, torre e linha menor. No celular, o ritmo depende mais da diferença entre o bloco inicial e os cartões seguintes.
4. **Tipografia — 9/10.** Títulos, cifras e legendas têm funções distintas. Valores extremos e fontes ampliadas ainda merecem ensaio com dados variados.
5. **Ícones e ilustrações — 9/10.** Cada cartão tem uma figura própria. A escala no celular preserva a leitura das cifras, com menor detalhe na arte.
6. **Organização por tarefa — 8/10.** Os três assuntos do Início têm lugar e a ação da faixa leva à fila. O protótipo permite consultar a fila e explorar a equipe. A execução de tarefas fica para a integração.
7. **Acessibilidade — 8/10.** Um H1, foco visível, alvos de 44 px, alertas com texto, ilustrações decorativas ocultas e contraste AA calculado dos pares de tokens principais. Falta ensaio com leitor de tela e zoom elevado.
8. **Privacidade — 9/10.** O teste desafia a marcação com moeda, percentual e proporção no texto livre. A vista do Assessor da Casa fica separada do mosaico financeiro.
9. **Temas — 9/10.** A geometria e as contagens foram confirmadas nos dois temas. A hierarquia se apoia no contraste de fundo e na escala.
10. **Escritório como personagem — 8/10.** Os postos dão rosto à fila e a sala revela estados em texto. As plaquinhas são pequenas no celular. A lista da sala oferece uma leitura mais confortável.

## Integração futura

- Extrair um adaptador ao lado de `useResumoFamilia` para ler `resumo.podeGastarHoje`, `resumo.plano2029.falta_com_margem`, `resumo.aplicacoes.total` e `resumo.faturas.total`. Preservar o estado de cada leitura, a unidade e a escopagem do papel. Ligar os erros a `repetir(chave)` e manter a autorização do Assessor da Casa antes das leituras financeiras.
- Montar o Escritório com a leitura de `api.escritorioHoje` via `useLeituraRemota` e `useEquipeCompleta`. Levar o ID da tarefa à ficha existente pelo contrato de `enderecoDestino` e reaproveitar o fluxo de resposta e releitura do Escritório. Conservar a lista de salas em texto com a evolução da maquete.
- Conectar o olho ao estado de privacidade de `useApp`. Aplicar a mesma proteção a nomes acessíveis, atributos, detalhes expansíveis e conteúdo embutido. Exibir **Exemplo** somente no modo correspondente.
- Usar a navegação e as rotas do aplicativo para Orçamento, Cartões, Guardado, Plano 2029 e Escritório. No laboratório, as quatro abas e **Mais** levam aos cartões e movem o foco para o título.

## Validação da entrega

`npx tsc --noEmit` passou com zero erros. Os 22 testes da proposta E passaram, incluindo a medição da casca em Chromium. O Vitest usou a configuração existente importada pelo Node, com cache desativado, porque o esbuild recebeu acesso negado ao percorrer os diretórios acima da worktree e o cache padrão aponta para o `node_modules` compartilhado.

A última execução completa terminou com 1.590 testes aprovados, 5 falhas e 3 pendências marcadas como `todo`. As falhas ocorreram fora da proposta E.

- `src/propostas/b/proposta.test.ts` — A cifra sentinela esperada não aparece com o olho aberto.
- `src/componentes/ux-cobertura.test.ts` — O teste de rascunho não encontrou a confirmação de valor acima do normal.
- `src/propostas/isolamento.test.ts` — A chamada interna de build recebeu acesso negado ao carregar `vite.config.ts` pelo esbuild.
- `src/privacidade-global.test.ts` — O teste de resposta com olho inicial aberto não encontrou o controle esperado.
- `src/lib/resumo/familia.test.ts` — O teste de expansão não encontrou a frase de ritmo semanal esperada.

As falhas de B e do rascunho se repetiram quando executadas isoladamente. Os casos de privacidade global e expansão do resumo passaram na reexecução filtrada.

O Git recusou a criação de `index.lock` no diretório de metadados da worktree por falta de permissão. Os arquivos da proposta ficaram salvos para commit quando o índice estiver gravável.
