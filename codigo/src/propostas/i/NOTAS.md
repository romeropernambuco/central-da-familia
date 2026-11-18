# Proposta I · Bento Completo

O Início abre com quatro referências da família. A maquete ocupa o cartão maior e é um ponto de entrada para o trabalho de cada pessoa. A fila e o Plano 2029 acompanham a cena no desktop. No celular, a faixa se percorre horizontalmente e o mosaico segue em coluna, com o menu ao alcance do polegar.

## De onde veio cada parte

- **E.** Mantive o mosaico assimétrico, as ilustrações do projeto, os tons de musgo e areia, Bricolage Grotesque com Inter e os cinco destinos do menu. A mesma pílula ativa aparece na barra lateral do desktop e na barra inferior do celular. **Mais** abre Plano 2029 e Aplicações. Cada destino leva ao cartão na prévia e coloca o foco no título.
- **D.** Adaptei a curva quadrática para a coluna do bento. A trilha tem 15 px em ambos os formatos, preenchimento verde sólido, marcos de 2026 a 2029, ponto branco e bandeira **Viver de rendimentos**. A cobertura tem 36 px e o percentual a 65% do corpo. A falta mensal oficial com margem de segurança fica na faixa. O cenário sem margem abre sob demanda. Quando há superávit, o rótulo passa a **Sobra mensal** e o valor aparece sem sinal. O olho fechado usa o rótulo neutro **Diferença mensal** e retira da trilha o trecho preenchido e a posição atual.
- **F.** A faixa traz limite de hoje, falta mensal com margem, total aplicado e faturas previstas. **Precisa de você** abre com até dois pedidos, em ordem de risco, operação e lembrete. A linha traz avatar de 32 px, responsável, assunto, prioridade por extenso, quantia e ações. **Ver todos** mostra a fila e as pastas. **Já fiz** e **Depois** movem a decisão na sessão da prévia. **Desfazer** restaura a última mudança. **Abrir** dá contexto e leva à ficha de quem pediu, quando o vínculo existe.
- **Escritório compartilhado de B, C e G.** O cartão traz a planta com os 19 postos e plaquinhas de nome e estado. A variante grande ocupa toda a largura do herói no desktop. A média mantém alvos de 44 px com rolagem dentro do palco no celular. **Ver planta inteira** enquadra a visão geral no celular e **Explorar postos** volta à escala interativa. O filtro de sala aproxima o cômodo e abre uma lista textual. Tocar um posto ou ativar seu botão por teclado abre a ficha e leva o foco ao nome. Os movimentos do SVG seguem a preferência de movimento reduzido.

## Ordem de leitura

- **Em 2 segundos.** Saudação, limite do dia e a faixa de estado com **Ver fila**. O cartão amplo do Escritório começa na primeira tela. O aviso usa vermelho quando há dinheiro em risco.
- **Em 5 segundos.** No desktop, os outros três indicadores e o primeiro pedido aparecem ao lado da maquete, com a cobertura do Plano logo abaixo. No celular, deslizar a faixa revela os demais indicadores, e **Ver fila** leva direto à decisão sem percorrer toda a planta.
- **Depois.** Explorar salas, abrir fichas, conferir o cenário sem margem e acompanhar o restante do mosaico. Os três cartões menores mostram o disponível até domingo, o rendimento de hoje e a quantidade de faturas na lista. O balão de Imóveis usa o aluguel líquido estimado, em centavos no contrato. Ao abrir essa ficha, a quantia passa do balão para o texto acessível. Valores monetários iguais já apresentados recebem uma referência em texto.

## Tipografia e paleta

Bricolage Grotesque Variable nos títulos e Inter Variable em controles, texto e números. A escala usa 12/14/16/20/28/36/48 px, com 27 px para números secundários. Os algarismos são tabulares e permanecem na mesma linha. Raios de 12, 8 e 6 px, filetes em OKLCH e sombra externa apenas no claro.

- **Claro.** Fundo `#f5f4ef`, cartões `#fffdfa`, menu `#eeece5`, palco `#e8eddd` e destaque `#40582d`.
- **Escuro.** Fundo `#0c0c0b`, cartões `#131312`, menu `#1a1918`, palco `#20261c` e destaque `#c0d6a7`. Aplicações e Faturas variam entre musgo e carvão quente.
- **Alertas.** Vermelho `#992e26` no claro e `#ffa59d` no escuro para dinheiro em risco. Operação e Lembrete usam rótulos e ícones distintos. O selo Exemplo usa cinza tracejado.

## Medição na casca

React montado em Chromium com as fontes locais, o CSS da casca, suas dimensões e a função compartilhada `medirNumeros`. O snapshot foi fixado em 17/11/2026 às 11h de Recife. O teste repetiu a medição com três decisões de exemplo, uma em cada prioridade.

- **Celular · 375 × 812.** 2 números financeiros no claro e 2 no escuro, com e sem as decisões inseridas. A contagem inclui a parte visível da próxima referência na faixa rolável.
- **Desktop · 1280 × 800.** 8 no claro e 8 no escuro, com e sem as decisões inseridas. As quatro referências vêm primeiro. Cobertura, balão e quantias das decisões ocupam a margem restante.
- **Privacidade.** O olho retira marcadores, valores, relações em texto livre e geometria financeira. As posições fixas das mesas e dos quatro anos continuam. O Assessor só recebe descrições fixas de tarefas domésticas, equipe da Casa e nenhum número financeiro. O papel pessoa vê o próprio orçamento. Um campo vazio ou indisponível recebe **Ainda sem dado**.

## Autoavaliação

1. **Hierarquia em dois segundos · 9/10.** Limite, estado e ação da fila têm posição estável. A leitura em dois segundos é hipótese de design.
2. **Números acima da dobra · 9/10.** A medição confirma 2 no celular e 8 no desktop. O desktop usa toda a margem disponível.
3. **Ritmo e espaçamento · 9/10.** O desenho largo equilibra a fila à direita e a coluna do Plano. Uma ficha aberta desloca os cartões seguintes.
4. **Tipografia · 9/10.** Saudação, títulos, valores e legendas têm escalas distintas. Os rótulos da maquete são menores por causa da escala da planta.
5. **Ícones e ilustrações · 9/10.** Menu, alertas e avatares usam Lucide. O SVG de cada cartão reforça sua área e a figura fica fora da leitura assistiva.
6. **Organização por tarefa · 9/10.** A fila tem entrada direta na faixa de estado. As decisões podem ser abertas, adiadas e desfeitas. O cartão do orçamento complementa o limite diário com a janela até domingo.
7. **Acessibilidade · 8/10.** Um H1, foco visível, contraste AA calculado e controles medidos a partir de 44 × 44 px. A visão geral do celular usa o desenho como panorama e oferece a exploração por posto ou sala.
8. **Privacidade · 9/10.** Os testes exercitam o olho da casca e a prop local, a trilha, a ficha, o cenário e os balões. Assuntos com moeda ou percentual usam um rótulo curto quando esses dados já cabem no campo estruturado.
9. **Temas claro e escuro · 9/10.** A geometria e as contagens se mantêm nos dois temas, com pares de cores verificados.
10. **Escritório como personagem · 9/10.** Toda a equipe habita o herói e as decisões apontam de volta para os postos. O celular usa rolagem interna para ver a equipe em escala interativa.

## Da prévia ao produto

- Adaptar os campos de `useResumoFamilia()` e os seletores de `lib/resumo` para a faixa. Usar `podeGastarHoje.valor` e o envelope autorizado, `plano2029.falta_com_margem` e `cobre_pct`, `aplicacoes.total/hoje` e `faturas.total/lista`. Conservar unidade, natureza, fonte, permissão e estados de carregamento, erro e vazio. A quantidade de faturas é derivada de `proximas.valor.length` só quando a lista está pronta.
- Usar `useEscritorio().perguntas`, `donoDaPergunta` e `useEquipeCompleta` para fila e presença. Vincular **Abrir** a `PerguntaCard` ou ao destino `escritorio/tarefa`. Aplicar **Já fiz** e **Depois** às opções de `useEscritorio().responder`, incluindo os formulários exigidos pela tarefa. Oferecer desfazer pela revisão oficial quando a API suportar. Para a integração faltam no snapshot o título público seguro para o olho fechado, as opções, o contexto, o destino da tarefa e a autorização por item. A prévia usa títulos domésticos fixos para o Assessor, que deve receber apenas dados autorizados já na consulta.
- Integrar o `EscritorioIsometrico` da f38 com `superficie="inicio"` e o adaptador de presença. Preservar a maquete SVG e a alternativa textual para redução de movimento, ambientes sem WebGL e foco por teclado. Ligar a seleção ao foco de sala ou de câmera e à ficha. Alimentar os balões com campos autorizados de `lib/resumo` pela mesma camada do olho.
- Ligar a navegação da prévia ao aplicativo por `enderecoDestino`. Os destinos são `#/inicio` para Início, `orcamento/orcamento` para Orçamento, `cartoes/fatura` com cartão e mês para Faturas, `#/escritorio` para Escritório, `guardado/aplicacoes` para Aplicações e `planejamento/plano2029` para o Plano. Aplicar `rotaPermitida` e o papel antes de montar ou buscar dados da respectiva superfície.
