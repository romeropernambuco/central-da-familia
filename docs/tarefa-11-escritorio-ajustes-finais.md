# Tarefa 11 · Módulo Escritório · Ajustes finais

Data: 24/11/2026 · Dono: Romero · Versão 2, revisada por produto e por engenharia

**Onde entregar:** documento "Central da Família · Diretrizes do CEO", logo abaixo da ficha "TAREFA: 11 Módulo Escritório".
Este arquivo complementa a Tarefa 11. Não substitui nada do que já foi decidido.

```
              ESCRITÓRIO: O QUE FALTA
                       │
   ┌──────────┬────────┼─────────┬──────────┐
  FAMÍLIA    DONO DO   BANCO      CUSTO     FILA DE
  vê saúde,  PRODUTO   3 tabelas  teto e    ESPERA
  novidades  vê custo, novas, só  conta     o que não
  e o time   modelo e  no banco   refeita   entra agora
             placar    novo
```

---

## 1. Retrato de hoje (conferido no banco e na tela em 24/11)

| Item | Número |
|---|---|
| Ajudantes cadastrados | 11 (8 do produto + 3 só da nossa família) |
| Conferências registradas | 16, todas de 07/11 |
| Conferências entregues | 1 de 16 |
| Paradas por dado ou decisão do dono | 10 de 16 |
| Dias sem conferência nova | 17 |
| Ajudantes com horário ligado de verdade | 1 de 11 |
| Banco novo do produto (Tarefa 2) | ainda não existe |

Os outros 10 ajudantes aparecem na tela com "só quando o dono mandar". Por isso nada rodou depois de 07/11.

Os 3 que ficam só na nossa família, fora do produto: Assistente de orçamento pessoal, Tesoureiro de Receitas e Gerente da empresa.

---

## 2. O que a tela já tem e não deve ser refeito

1. Número grande "coisas esperando você" e a lista "Depende de você", separada em "Pra decidir" e "Pra informar", com filtro Hoje, Esta semana e Tudo.
2. Um cartão por ajudante com: o que ele faz, número principal, situação, pendência, fonte e horário.
3. Cena do escritório com os personagens em pixel (visual já aprovado).
4. Botões "Primeiros passos", "Dias de cada ajudante" e "Resumo pra segunda".
5. Pedido escrito pra cada ajudante.
6. Empresa separada da família.

---

## 3. Comparativo com a referência de fora

Referência: escritório de IA de uma operação de anúncios, visto em 23/11. Serve de modelo de função, não de aparência.

| Ideia da referência | Nós temos? | Decisão | Quem vê |
|---|---|---|---|
| Um ajudante por setor | Sim | Manter | Família |
| Situação por cor | Sim | Manter | Família |
| Fila "esperando você" | Sim, e mais completa | Manter | Família |
| Horário que roda sozinho | Só 1 de 11 | Já é o item 2 da Tarefa 11 | Família |
| Linha de saúde | Não | **Entra (item D)** | Família, em 1 frase |
| Caixa de novidades | Não | **Entra (item E)** | Família |
| Quadro do time com data | Não | **Entra (item F)** | Família |
| Modelo leve ou forte por ajudante | Decidido, não aparece | **Entra (item A)** | Dono do produto |
| Consumo de IA por ajudante | Não | **Entra em R$ (itens B e C)** | Dono do produto |
| Placar do escritório | Não | **Entra (item G)** | Dono do produto |
| Gerente que recebe e distribui | Não | Fila de espera | |
| Falar por voz | Não | Não construir: o teclado do iPhone já dita | |

**Mudança da revisão:** custo de IA é conta do produto. A família não resolve esse número, então ele não aparece na tela dela.

O que nós temos e a referência não mostra: fonte de cada número, marca de dado de exemplo, pendência com o que destrava, empresa separada da família, acesso por pessoa e histórico de mudanças. Isso fica.

---

## 4. Ficha pronta pra colar

```
TAREFA: 11-B Escritório: custo, saúde e novidades
ESPECIALISTA: Engenheiro de agentes de IA (o mesmo da Tarefa 11)
ENTRA DEPOIS DE: Tarefas 5 e 7, igual à Tarefa 11. O item G entra com a
Tarefa 14. Coluna e tabela nova nascem no projeto novo (Tarefa 2), nunca
no projeto de hoje.
LEIA ANTES: CLAUDE.md; ficha da Tarefa 11; Escritório da Família
(https://claude.ai/artifact/F43Xn8RE49F4YN7PULvKnm); tabelas
escritorio_funcionarios e escritorio_turnos; a conta do produto na parte 9
das Diretrizes; limite de uso da Tarefa 12.

FAÇA:
A. Modelo por ajudante. Cada ajudante tem 1 campo "modelo": leve ou forte.
   Leve pra conferência que só lê, calcula e grava. Forte só pro relatório
   com insight. Aparece só no painel do dono do produto. A família não vê
   nem troca.
B. Custo em cada conferência. A função de servidor soma o uso de TODAS as
   chamadas de IA da conferência (entrada, saída, tentativas repetidas) e
   passa ao fechamento só o modelo e a contagem. Quem calcula o R$ é o
   banco: contagem x preço vigente x dólar da mesma linha de ia_precos.
   Grava em colunas próprias: modelo_id, tokens_entrada, tokens_saida,
   custo_brl. Valor gravado nunca é recalculado. Conferência sem IA:
   custo 0 e modelo vazio. Só a chave de servidor fecha conferência.
   ia_precos: 1 linha por modelo e data de vigência, com preço e dólar
   fixos. O administrador só insere linha nova, nunca edita.
C. Teto. 1 linha por família por mês em ia_gasto_mes (gasto, reservado,
   avisou_80_em). O mês é o do INÍCIO da conferência no fuso de Recife.
   1. Antes de chamar a IA, reserva o custo estimado travando a linha;
      ao fechar, troca pelo custo real. Reserva sem fechamento em 30 min
      é devolvida.
   2. Em 80%: 1 alerta por mês pro dono do produto, não 1 por conferência.
   3. Em 100%: conferência nova nasce no modelo leve; a que está em
      andamento termina no modelo em que começou.
   4. Em 150%, ou mais de 3 "Rodar agora" por ajudante por dia: nenhuma
      chamada de IA; a conferência grava os números do banco sem texto.
   5. Conferência de exemplo não conta. A família Silva tem conta própria
      e fica fora do total do produto.
   6. O teto é 1 só: soma o Escritório e as leituras da Tarefa 12.
      Só o administrador muda o teto.
   Tela da família: nunca mostra R$ de IA. No cartão afetado aparece só
   "Este mês o relatório vem resumido. O completo volta em 01/12."
   Painel do dono: "Custo de IA em novembro: R$ 0,00 de R$ 2,49", por
   família e por ajudante. Abaixo de 1 centavo: "menos de R$ 0,01".
D. Saúde. Na tela da família, 1 linha no rodapé, no lugar de "Atualizado
   em", com 2 formas: "Tudo funcionando. Última conferência: hoje, 8h13."
   ou "2 conferências atrasadas. Última: 07/11." com "Rodar agora".
   Atrasada = horário previsto + 30 min já passou, ou conferência aberta
   sem fim há mais de 30 min. 1 único agendamento, a cada 10 min, abre as
   vencidas e recalcula o próximo horário no fuso de Recife. A escala sai
   do código e vira tabela por família (escritorio_escala).
   Banco e escala, com essas palavras, só no painel do dono do produto.
E. Novidades. 1 linha abaixo de "coisas esperando você": "3 relatórios
   novos desde a sua última visita." Com 0, some. Conta só relatório que
   aquela pessoa pode ver. Tocar leva pro 1º relatório novo. Ninguém
   altera a tabela pessoas direto: grava só a função
   escritorio_marcar_visto(), sem parâmetro, com a pessoa logada e a hora
   do servidor. A tela conta as novas ANTES de marcar.
F. Time com data. 1 frase no topo de "Dias de cada ajudante": "Seus 8
   ajudantes trabalham desde 07/11." Mudança vira 1 linha no mesmo bloco
   por 7 dias ("Mudou em 24/11: o Comprador passou pra terça, 20h23."),
   sem aviso no celular. Nome de pessoa vem do cadastro, nunca do código.
G. Placar do Escritório. Na Tarefa 14, abaixo dos 4 números, 1 linha
   recolhida, só pro dono do produto: "Escritório: 5 de 6 no verde." Abre
   os 6 números com farol e 1 linha do que cada um mede. A segunda-feira
   continua com 4 números. Os números 4 e 6 ficam sem meta até 4 semanas
   de piloto. Os números 3 e 4 medem o ajudante, nunca a pessoa.

NÃO FAÇA:
- Criar ajudante novo. O produto tem 8 e continua com 8.
- Criar tabela paralela pro mesmo assunto.
- Mostrar custo de IA, "tokens", "modelo", "banco" ou "turno" pra família.
- Mexer na cena, nos personagens, na ordem dos blocos ou nas cores.
- Ligar a escala sozinha antes do teto de custo estar funcionando.
- Gastar IA em conferência sem dado: sem dado, o ajudante pergunta (item 3
  da Tarefa 11) e não chama a IA.
- Escrever nome ou número da nossa família no código.
- Tocar o projeto de hoje no Supabase fora das Tarefas 1 e 16.

PRONTO QUANDO: na família Silva, com relógio simulado, toda conferência
que chamou a IA tem modelo, contagem e custo (sem IA: R$ 0,00); o alerta
de 80% dispara 1 vez com o teto baixado pra teste; em 100% a conferência
seguinte sai no leve; 2 conferências ao mesmo tempo não furam o teto; a
virada de mês zera; a família A não vê custo da B; as novidades zeram
depois de abrir; os 6 números batem com a conta feita à mão. 1 rodada com
IA de verdade pra medir; as demais com resposta fixa. Print aprovado no
iPhone e no Windows.
```

---

## 5. Onde cada dado fica guardado

Tudo só no banco novo do produto. A versão 1 dizia "nenhuma tabela nova"; a revisão de engenharia derrubou isso. Não há duplicação: são 3 assuntos que hoje não têm tabela.

| Dado | Onde | Muda o banco? |
|---|---|---|
| Modelo, contagem e custo da conferência | `escritorio_turnos`: `modelo_id`, `tokens_entrada`, `tokens_saida`, `custo_brl` (+ `familia_id`) | 4 colunas |
| Preço por modelo e dólar | `ia_precos` (global, sem acesso da família) | tabela nova |
| Gasto, reserva e alerta do mês | `ia_gasto_mes` (família, mês) | tabela nova, usada também pela Tarefa 12 |
| Modelo padrão do ajudante | `escritorio_funcionarios.modelo` | 1 coluna |
| Dia, hora, próximo horário, "desde", ativo | `escritorio_escala` (por família) | tabela nova |
| Última visita | `pessoas.escritorio_visto_em`, só via função | 1 coluna |
| Teto | configuração da família, só o administrador grava | Tarefa 2 |
| Saúde e placar | funções calculadas na hora | não |

---

## 6. Placar do Escritório (só pro dono do produto)

| # | Número | Meta | De onde vem |
|---|---|---|---|
| 1 | Conferências que rodaram ÷ previstas na semana | 100% | escala × conferências |
| 2 | Ajudantes em "sem dados" no fim da semana | 0 | critério da Tarefa 11 |
| 3 | Pendências vencidas sem "Resolvi" (mede o ajudante) | 0 | item 6 da Tarefa 11 |
| 4 | Dias até uma pendência ser respondida (mede o ajudante) | sem meta até 4 semanas de piloto | data da pendência × "Resolvi" |
| 5 | Custo de IA da família no mês | até o teto | soma de `custo_brl` |
| 6 | Relatórios que viraram ação ÷ relatórios entregues | sem meta até 4 semanas de piloto | "Resolvi" depois do relatório |

---

## 7. Custo de IA: a conta refeita (estimativa)

Teto proposto: **R$ 2,49 por família por mês**, topo da faixa que as Diretrizes já estimaram (R$ 0,12 a R$ 2,49).

Premissas, todas a confirmar: 24 conferências por mês pela escala de hoje; dólar a R$ 5,45; tamanho de cada conferência estimado, ainda sem medição; preço dos modelos a confirmar na página oficial.

| Cenário | R$ por mês | % do teto |
|---|---|---|
| Tudo no modelo leve | 0,08 | 3% |
| Insight forte só 1 vez por mês (Contador e Cartão) | 0,44 | 18% |
| Insight forte toda semana, modelo intermediário | 1,91 | 77% |
| Idem, em mês de 5 semanas | 2,29 | 92% |
| Insight forte toda semana, modelo mais caro | 3,79 | 152% |

Com insight forte toda semana, o alerta de 80% dispara quase todo mês e não sobra nada pras leituras da Tarefa 12.

**Regra de modelo recomendada:**

| Ajudante | Conferência normal | Relatório com insight |
|---|---|---|
| Contador da Casa | leve | forte, 1 vez por mês |
| Analista de Cartão | leve | forte, no fechamento |
| Auditor de Estoque | leve | leve |
| Comprador | leve | leve |
| Controlador de Presença | leve | leve |
| Folha da Casa | leve | leve |
| Agenda de Vencimentos | leve | leve |
| Guardião do Colchão | leve | leve |

A conta é sempre do banco (Tarefa 4). A IA só escreve o relatório e o insight.

---

## 8. Ordem de construção

| Passo | O quê | Pronto quando |
|---|---|---|
| 1 | Itens A e B: modelo e custo gravados em cada conferência | toda conferência com IA tem modelo, contagem e custo |
| 2 | Item C e saúde técnica: teto, reserva e alerta | 80% dispara 1 vez; 100% rebaixa; 2 ao mesmo tempo não furam |
| 3 | Itens D, E e F: saúde, novidades e time com data na tela da família | novidades zeram depois de abrir; atraso aparece |
| 4 | Item G: função do placar | bate com a conta à mão na família Silva. O bloco na tela entra com a Tarefa 14 |

Os passos 1 e 2 vêm antes de ligar a escala sozinha. Sem teto, a escala fica desligada.

---

## 9. Fila de espera (não entra agora)

| Ideia | Destino | O que destrava |
|---|---|---|
| Gerente que recebe 1 pedido e encaminha | Produto, depois do piloto | 2 famílias do piloto pedirem |
| Escola dos filhos, saúde, carro, manutenção | Produto, depois do piloto | 2 famílias do piloto pedirem. Prestadores e gás já são a Tarefa 21 |
| Negociador de Credores e Fiscal de Juros | Só na Central da nossa família | Tarefa 16 pronta. Dívida e credor ficam fora do produto |
| Contratos, processos e sócios | Só na Central da nossa família | Tarefa 16 pronta |
| Pesquisa de mercado e cenários de negócio | Outra frente | Caixa da família ajustado |

---

## 10. Decisões do dono

| # | Decisão | Recomendação |
|---|---|---|
| 1 | Teto de custo de IA por família | R$ 2,49 por mês, somando Escritório e Tarefa 12, revisto quando a Tarefa 11 medir |
| 2 | Insight forte toda semana ou só no mês? | Só no mês (Contador e Cartão). Semanal fica no modelo leve. A alternativa é subir o teto |
| 3 | Gerente que encaminha pedido entra no piloto? | Não. Só se 2 famílias pedirem |
| 4 | Ligar já as 10 conferências da nossa família no painel de hoje? | Não. Ligar cada uma só quando tiver dado real; conferência sem dado só gasta |
