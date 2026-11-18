# Proposta C · Jornada do Dia

## Conceito

A Central recebe a família pelo nome e responde, em uma frase, quanto cabe no dia.
A jornada liga três momentos em uma linha de leitura vertical. Agora, Esta semana e O caminho até 2029.
Uma vinheta de escritório mostra o trabalho da equipe e dá acesso aos pedidos que ela precisa resolver com a família.

## Hierarquia da primeira tela

- **Em 2 segundos.** Saudação, limite de hoje e ação para abrir o orçamento. O valor do snapshot medido foi R$ 101,33.
- **Em 5 segundos.** Agora resume até dois pedidos no celular e três no desktop. Os avatares representam quem pediu e as pílulas distinguem Dinheiro em risco, Operação e Lembrete. A equipe aparece logo abaixo da fila no celular e ao lado no desktop.
- **Depois.** A semana reúne os cartões a vencer e o total previsto para entrar no mês. O caminho até 2029 mostra a cobertura e a diferença mensal oficial com margem. Os destinos abrem as telas de exemplo correspondentes.

## Tipografia e paleta

Fraunces Variable dá aos títulos a voz editorial da referência Oura, e DM Sans Variable mantém a leitura e os valores tabulares claros em tamanhos pequenos.

A escala usa 12 px/1,15–1,5 para rótulos 700 e legendas, 14 px/1,3–1,5 para ações 700 e texto de apoio 400, e 16 px/1,5 como base. A vinheta móvel usa 20 px/1,12, os capítulos móveis 28 px/1,12 e a frase de abertura 36 px/1,05 no celular e 64 px/1,05 no desktop, com pesos 430–460. O valor principal tem 36 px/1,15 e os secundários 27 px/1,2, ambos em peso 650 com algarismos tabulares sem quebra. O símbolo de percentual usa 65% do corpo do valor.

- **Claro.** Papel #f7f1e8, superfície #fffbf5, areia #ede4d8, texto #28231f e apoio #595147. Azul acinzentado #385c81 como único destaque, com texto branco. A vinheta usa grafite #24211e.
- **Escuro.** Fundo #0c0c0b, superfície #131312, menu #1a1918, texto #f5eee4 e apoio #c3b8aa. O mesmo azul ganha luminosidade #a9c7e8, com texto #172738. A vinheta usa grafite quente #211e1a.
- Filetes e tintas suaves usam mistura OKLCH. O vermelho semântico #8f332b / #ffa89e fica reservado para Dinheiro em risco. Os traços decorativos e focos usam tons do mesmo azul. Os blocos usam raios 12/8/6 px e as ações principais têm formato de pílula. A sombra da vinheta aparece no claro.

## Primeira dobra e privacidade

Medição da casca no Chromium, com o snapshot de exemplo de 17/11/2026 e fontes carregadas.

- **Celular, 375 × 812.** 1 número financeiro nos dois temas. A dobra prioriza o limite e os pedidos. A vinheta mostra duas contagens operacionais, num total de três indicadores de valor na tela, além de datas contextuais.
- **Desktop, 1280 × 800.** 2 números financeiros nos dois temas. A dobra inclui o previsto a receber do mês. Nenhuma fatura do snapshot vencia até domingo. A projeção completa fica na sequência da jornada.
- **Olho fechado.** A casca retorna “Valores ocultos”. O HTML perde os marcadores, os vencimentos e a barra, inclusive sua largura. A lista troca descrições livres por um rótulo seguro. Também são ocultadas as contagens da equipe. O papel de Assessor da Casa só recebe a superfície de tarefas operacionais da casa, com títulos controlados. O papel de pessoa da família usa apenas o orçamento pessoal e as rotas permitidas.

O teste SSR limita os marcadores financeiros da tela inteira. O navegador mede os retângulos do texto de cada ocorrência com a função da casca. A contagem pode variar com a data de exemplo, o número de faturas dentro da semana e o tamanho dos textos.

## Escritório e diferenças para o Início atual

A maquete isométrica compartilhada ocupa uma vinheta de grafite. Ela liga visualmente os avatares dos pedidos ao lugar onde a equipe trabalha. O bloco conta quem está trabalhando ou, quando ninguém está nessa situação entre os estados conhecidos, quem entregou. Em seguida, indica quem espera a família. Uma frase informa quando só parte dos estados está disponível. A maquete é decorativa para leitores de tela, pois a informação de estado e o link estão no texto.

A jornada substitui a sequência de resumos, envelopes, ritmo mensal e lançamentos recentes por uma frase com ação e três capítulos. Os dados detalhados continuam acessíveis pelas rotas correspondentes. O selo Exemplo aparece uma vez no cabeçalho. A linha da jornada é um filete neutro. A navegação usa quatro abas e Mais, no topo do desktop e na base do celular.

## Autoavaliação

1. **Hierarquia em dois segundos · 9/10.** A frase e o limite dominam a abertura. Em 375 px a frase ocupa duas linhas, o que toma espaço do capítulo seguinte.
2. **Números acima da dobra · 9/10.** A casca confirmou 1 financeiro no celular e 2 no desktop em ambos os temas. O celular tem menos valores financeiros que a ambição de três a quatro. A diferença abre espaço para tarefas e equipe.
3. **Ritmo e espaçamento · 8/10.** Filetes e intervalos separam os momentos. Títulos longos de pedidos consomem linhas no celular.
4. **Tipografia · 9/10.** A serifa abre e pontua a jornada. A sans sustenta os dados e ações. Nomes longos de tarefas podem dividir a leitura em mais de uma linha.
5. **Ícones e ilustrações · 8/10.** Lucide diferencia as ações e os autores. As figuras do projeto pontuam os capítulos. O celular reduz a maquete e omite as legendas das salas.
6. **Organização por tarefa · 8/10.** Orçamento, fila e Plano 2029 têm destinos claros. A resolução de um pedido acontece no Escritório. O Plano 2029 pede rolagem no celular.
7. **Acessibilidade · 8/10.** H1 único, foco na cor de destaque, rótulos visíveis, contraste AA calculado e alvos de pelo menos 44 × 44 px medidos no Chromium. A verificação assistiva foi estrutural, sem sessão com leitor de tela.
8. **Privacidade · 9/10.** O olho remove valores internos, descrições livres dos pedidos e a geometria de progresso. A disponibilidade de dados continua comunicada.
9. **Temas claro e escuro · 9/10.** A hierarquia foi verificada nas quatro combinações. As ilustrações pequenas têm menos presença no escuro para preservar o foco no texto.
10. **Escritório como personagem · 8/10.** A equipe aparece na primeira tela, com resumo do trabalho e entrada própria. A maquete cobre quatro salas e depende dos dados de estado disponíveis.

## Como produtizar

- **Limite de hoje.** Adaptar o campo podeGastarHoje de app/useResumoFamilia.ts, calculado em lib/resumo/orcamento.ts e lib/resumo/leituras.ts. Usar a saudação e o relógio local já compartilhados. Enviar o botão para #/orcamento.
- **Agora.** Compartilhar a leitura de escritorioHoje com a superfície do escritório. O hook de resumo expõe o total de pendências, enquanto a fila vem de precisa_de_voce. Usar lib/resumo/pendencias.ts para o total quando necessário. O resumo leva a #/escritorio. No produto, a origem da tarefa pode permitir entrada direta na ficha ou em PrecisaDeVoce. Para Assessor, usar somente a leitura autorizada de Casa e o destino #/casa, sem montar o hook financeiro.
- **Esta semana.** Ligar useResumoFamilia aos campos faturas e recebimentos, com lib/resumo/faturas.ts e lib/resumo/recebimentos.ts. Filtrar faturas abertas de hoje a domingo, com destino #/cartoes. O previsto do mês leva a #/planejamento, que monta Recebimentos. Uma previsão semanal exigiria no contrato as datas previstas por recebimento e o total calculado para o intervalo.
- **O caminho até 2029.** Usar plano2029 do mesmo hook e os números oficiais de lib/resumo/plano2029.ts, com cobertura e falta mensal com margem no cenário garantido. Preservar a cobertura oficial acima de 100% e saturar somente a barra. O destino de produto é #/planejamento.
- **Escritório.** Usar a leitura de escritorioHoje e useEquipeCompleta para os estados, sem presumir que “entregue” ou “trabalhando” significa “em dia”. Integrar EscritorioIsometrico da frente f38 sob carregamento adiado, com a maquete SVG como opção leve. Preservar a vinheta e o link #/escritorio.
- **Casca e privacidade.** Integrar o olho do contexto do app, as permissões de app/rotas.ts e o menu do App. Levar os estados de carregamento, falta de dados e nova tentativa do useResumoFamilia ao adaptador de apresentação. Para preservar títulos úteis no modo privado, o contrato precisaria oferecer o tipo da tarefa e um título explicitamente seguro. Hoje o estado de Assessor usa os tipos de tarefa reconhecidos pelo prefixo do ID.
