# Proposta A · Painel Calmo

O Início abre com uma leitura do dia e um caminho direto para o que precisa de atenção.  
O valor disponível hoje e o ritmo de gasto ocupam a mesma superfície, com quatro decisões financeiras logo a seguir.  
O escritório fica junto do orçamento, onde o trabalho dos funcionários ganha contexto antes da fila de tarefas.

## Primeira tela

- **Em dois segundos.** A faixa responde se há algo esperando pela família. O maior número responde quanto a pessoa pode gastar hoje. **Ver fila** leva o foco ao cartão de tarefas.
- **Em cinco segundos.** O gráfico contextualiza o gasto à vista, e a maquete apresenta quem está trabalhando ou precisa de atenção. Os cartões seguem uma leitura consistente de ícone, valor, significado e atalho.
- **Depois.** Os indicadores dão contexto aos quatro valores. A fila abre com **Dinheiro em risco**, depois **Operação** e **Lembrete**. Cada linha mostra um aviso representativo, e o Escritório reúne a fila completa.

## Sistema visual

Geist Variable nos títulos e nos números, Inter Variable no texto e nos controles. A geometria da Geist dá presença aos valores no peso 500, e a Inter preserva o ritmo leve e aberto da Arcadia em corpo pequeno.

A escala usa 12/15–18 px para rótulos e legendas, 14/18–21 para navegação e avisos, 16/20–24 para títulos de cartão e corpo, 17/23 para o título do orçamento, 22/26 para seções e 30/33 ou 36/40 para o H1. Os valores usam 36/41 e 27/31, ambos com peso 500, algarismos tabulares e sem quebra. Rótulos usam pesos 500–600 em caixa mista ou baixa. O componente compartilhado de valores preserva o sinal de percentual junto ao número, em corpo menor, caso um percentual textual entre no layout.

- **Claro.** Fundo `#f7f7fa`, cartão `#ffffff`, faixa `#efeff6`, herói `#eeedf9`, texto `#242336` e texto secundário `#55546b`. O índigo `#4849c1` é o único destaque. A navegação usa fundo `#191825` com foco em `#b4afff`, a variante clara do mesmo índigo.
- **Escuro.** Fundo `#0c0c0b`, cartão `#131312`, menu `#1a1918`, herói `#201e2c`, texto `#f0efed` e secundário `#bcb9c6`. O mesmo destaque passa a `#b4afff`. Trilhos, divisores e fundos suaves misturam esses tokens em OKLCH.
- **Risco.** `#9c302e` sobre `#faecec` no claro e `#ffaca8` sobre `#322121` no escuro. A pílula por extenso informa o nível em qualquer tema. A ação principal ganha uma cápsula sólida. Cartões e superfícies usam raios de 12, 8 e 6 px e sombra leve só no claro.

## Dobra e escritório

A casca contou **3 números financeiros no celular** (375 × 812) e **5 no desktop** (1280 × 800), nos dois temas. No celular entram o orçamento, o Plano 2029 e Aplicações. Faturas e Recebimentos aparecem na segunda linha da grade. No desktop entram o orçamento e os quatro cartões. O olho fechado zera a medição e retira os gráficos e as barras do HTML.

O escritório ocupa o segundo painel da primeira faixa no desktop e fica logo sob o orçamento no celular. A maquete destaca a sala da primeira pessoa em evidência. Os avatares de 32 px mostram os dois funcionários priorizados por estado, começando por quem precisa da família. A ilustração fica fora da leitura assistiva, e a lista adjacente apresenta nomes e estados em texto. A seta abre o Escritório completo.

## Diferenças em relação ao Início atual

- O orçamento diário ganha o único número de 36 px. Os quatro valores de 27 px ficam em um grupo próprio, com o dinheiro no mesmo lugar em cada cartão.
- Saldos gerais, envelopes, desejos, imóveis e lançamentos recentes saem da leitura inicial. As abas dão acesso ao detalhe. Aplicações mostra o rendimento líquido de hoje uma única vez, e o Plano 2029 usa a falta oficial com margem.
- A lista cede espaço a um cartão de tarefas. A faixa amarela dá lugar a um selo cinza tracejado. A navegação mantém quatro abas e **Mais**.

## Autoavaliação

1. **Hierarquia em dois segundos · 9/10.** Valor principal, estado e ação têm níveis distintos. No desktop o olho ainda pode ir primeiro para a maquete.
2. **Números acima da dobra · 9/10.** O celular mostra três valores na primeira tela e os cinco cabem no limite mesmo se todos ficarem visíveis. Textos livres dos alertas podem carregar valores e exigem tratamento estruturado na integração.
3. **Ritmo e espaçamento · 8/10.** Faixa, dupla de painéis, grade e fila formam grupos claros. A densidade aumenta na grade de duas colunas do celular.
4. **Tipografia · 9/10.** Os dois tamanhos numéricos e o peso 500 estabelecem hierarquia. Alguns indicadores precisam do corpo de 12 px na grade compacta.
5. **Ícones e ilustrações · 9/10.** Lucide identifica áreas, estados e destinos. As figuras do projeto explicam ausência de informação. Os avatares usam ícones de função e oferecem menos individualidade que os personagens do 3D.
6. **Organização por tarefa · 8/10.** A faixa encaminha para a fila, o herói orienta o gasto e o Plano 2029 tem destino próprio. Responder um aviso exige abrir o Escritório.
7. **Acessibilidade · 8/10.** Os testes calculam contraste AA, verificam nomes e dimensões mínimas dos controles e checam a semântica. Os gráficos têm rótulos, mas a leitura dos valores de cada ponto ainda depende das telas de detalhe.
8. **Privacidade · 9/10.** O olho remove números, geometria dos gráficos, larguras dos indicadores e texto livre potencialmente financeiro. Os rótulos dos alertas continuam visíveis. O perfil de equipe recebe apenas tarefas da Casa com texto controlado.
9. **Temas claro e escuro · 9/10.** A hierarquia passa pela diferença tonal das superfícies. O sistema escuro usa as camadas pedidas e a maquete mantém contraste pelos planos iluminados. A navegação noturna mantém pouco contraste tonal entre itens neutros e ativos.
10. **Escritório como personagem · 8/10.** A maquete e os estados aparecem antes dos cartões financeiros. O espaço comporta dois destaques e a interação com as demais pessoas acontece depois de abrir a tela do Escritório.

## Como produtizar

- **Decisão de hoje e ritmo.** Ligar `useResumoFamilia` a `resumo.podeGastarHoje`, preservar estados e metadados da consulta e usar `lib/resumo/porDia` sobre os lançamentos do envelope selecionado. O gráfico soma a série à vista de `DadosInicio` e posiciona os registros pelos dias decorridos. O destino é `orcamento?secao=orcamento`.
- **Aplicações.** Usar `resumo.aplicacoes` para o líquido realizado de hoje e a série `por_dia_30` de `guardadoHoje` para o traço. Destino `guardado?secao=aplicacoes`. Se o produto passar a exibir aluguel, usar `resumo.imoveis` e o rótulo explícito **Aluguel líquido estimado**.
- **Faturas.** Ligar `resumo.faturas` a `lib/resumo/faturas`, preservando total previsto, janela de vencimento e conferência com o banco. O indicador sinaliza se a lista ainda tem saldo a conferir. Destino `cartoes`.
- **Recebimentos.** Usar `recebimentosDoMes` de `lib/resumo/recebimentos`. A barra deriva a parcela garantida sobre o total previsto; denominador zero recebe texto, sem barra. Destino `planejamento?secao=recebimentos`.
- **Plano 2029.** Usar `resumo.plano2029` e o motor oficial do cenário garantido. A quantidade monetária usa `faltamPorMesComMargem` em centavos e a barra usa `progressao`. Só o desenho satura na meta. Destino `planejamento?secao=plano2029`.
- **Faixa, fila e escritório.** Consumir a fila autorizada de `escritorioHoje`, suas pendências e os estados de `useEquipeCompleta`. Montar `EscritorioIsometrico` da f38 na prévia compacta e ligar os destaques às fichas. Os destinos são `escritorio` e, para o Assessor, `casa`. Em produção, aplicar a autorização nos hooks e no servidor antes da renderização, e ligar o contexto do olho à preferência real da família.
- **O que falta no contrato.** Para abrir cada tarefa no ponto certo e manter descrições úteis com o olho fechado, a fila precisa de destino estruturado, texto público separado de detalhes privados, prazo e escopo de papel. A prévia usa a classificação do snapshot e uma lista restrita de tipos da Casa para a equipe. O contrato fornece a série à vista, a projeção e o limite, mas ainda precisa de uma trajetória histórica comparável que inclua parcelas para representar o orçamento completo em um único traço.
