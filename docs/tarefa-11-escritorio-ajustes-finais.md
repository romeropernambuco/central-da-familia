# Tarefa 11 · Módulo Escritório · Ajustes finais

Data: 24/11/2026 · Dono: Romero · Situação: pronto pra entrar na fila

**Onde entregar:** documento "Central da Família · Diretrizes do CEO", logo abaixo da ficha "TAREFA: 11 Módulo Escritório".
Este arquivo complementa a Tarefa 11. Não substitui nada do que já foi decidido.

```
              ESCRITÓRIO: O QUE FALTA
                       │
   ┌──────────┬────────┼─────────┬──────────┐
  CUSTO      SAÚDE    NOVIDADES   PLACAR    FILA DE
  em R$ por  a escala  desde a    6 números  ESPERA
  ajudante   rodou?    última     com meta   o que não
  e teto               visita                entra agora
```

---

## 1. Retrato de hoje (conferido no banco e na tela em 24/11)

| Item | Número |
|---|---|
| Ajudantes cadastrados | 11 (8 do produto + 3 só da nossa família) |
| Turnos registrados | 16, todos de 07/11 |
| Turnos entregues | 1 de 16 |
| Parados por dado ou decisão do dono | 10 de 16 |
| Dias sem nenhum turno novo | 17 |
| Turnos agendados de verdade | 1 de 11 (o da usina, dia 6) |
| Banco novo do produto (Tarefa 2) | ainda não existe |

Os outros 10 ajudantes aparecem na tela com "só quando o Romero mandar". Por isso nada rodou depois de 07/11.

Os 3 que ficam só na nossa família (fora do produto, como mandam as Diretrizes): Assistente da Andreza, Tesoureiro de Receitas e Gerente da Usina.

---

## 2. O que a tela já tem e não deve ser refeito

1. Número grande "coisas esperando você" e a lista "Depende de você", separada em "Pra decidir" e "Pra informar", com filtro Hoje, Esta semana e Tudo.
2. Um cartão por ajudante com: o que ele faz, número principal, situação, pendência, fonte e horário.
3. Cena do escritório com os personagens em pixel (visual já aprovado).
4. Botões "Primeiros passos", "Dias de cada ajudante" e "Resumo pra segunda".
5. Pedido escrito pra cada ajudante.
6. Empresa separada da família (a usina tem bloco próprio).

---

## 3. Comparativo com a referência de fora

Referência: escritório de IA de uma operação de anúncios, visto em 23/11. Serve de modelo de função, não de aparência.

| Ideia da referência | Nós temos? | Decisão |
|---|---|---|
| Um ajudante por setor | Sim | Manter |
| Situação por cor | Sim | Manter |
| Fila "esperando você" | Sim, e mais completa | Manter |
| Horário que roda sozinho | Só 1 de 11 | Já é o item 2 da Tarefa 11 |
| Modelo leve ou forte por ajudante | Decidido, não aparece | **Entra (item A)** |
| Consumo de IA por ajudante | Não | **Entra em R$ (item B)** |
| Total do dia com os que mais gastam | Não | **Entra com teto (item C)** |
| Linha de saúde no rodapé | Não | **Entra (item D)** |
| Caixa de "novas" | Não | **Entra (item E)** |
| Quadro do time com data | Não | **Entra (item F)** |
| Gerente que recebe e distribui | Não | Fila de espera (item G) |
| Falar por voz | Não | Não construir: o teclado do iPhone já dita |

O que nós temos e a referência não mostra: fonte de cada número, marca de dado de exemplo, pendência com o que destrava, empresa separada da família, acesso por pessoa e histórico de mudanças. Isso fica.

---

## 4. Ficha pronta pra colar

```
TAREFA: 11-B Escritório: custo, saúde e novidades
ESPECIALISTA: Engenheiro de agentes de IA (o mesmo da Tarefa 11)
ENTRA DEPOIS DE: Tarefas 4 e 5 prontas. Faz parte da Tarefa 11, não é fila nova.
LEIA ANTES: CLAUDE.md; ficha da Tarefa 11; Escritório da Família
(https://claude.ai/artifact/F43Xn8RE49F4YN7PULvKnm); tabelas
escritorio_funcionarios e escritorio_turnos; a conta do produto na parte 9
das Diretrizes.

FAÇA:
A. Modelo por ajudante. Cada ajudante tem 1 campo "modelo": leve ou forte.
   Leve pra turno que só lê, calcula e grava. Forte só pro relatório com
   insight. Quem troca é o administrador, nunca a família.
B. Custo em cada turno. Ao fechar o turno, grave dentro de "extras":
   modelo usado, custo em R$, duração em segundos. Use o campo "extras"
   que já existe em escritorio_turnos. Nenhuma tabela nova.
C. Custo na tela. No cartão do ajudante: "IA no mês: R$ 0,00".
   No topo: total do mês da família e o teto. Em 80% do teto, aviso
   "precisa de você". Em 100%, os turnos passam pro modelo leve e os
   relatórios com insight esperam o mês virar. Nenhum turno de conta para.
D. Linha de saúde no rodapé, em 1 frase: banco respondeu, escala ligada,
   último turno rodou há quanto tempo, quantos turnos atrasados.
   Turno atrasado já vira alerta pela Tarefa 11; aqui é só o resumo.
E. Novidades. Contador "X novas" = relatórios entregues depois da última
   vez que a pessoa abriu o Escritório. Tocar leva pro 1º relatório novo.
   Guarde a última visita por pessoa.
F. Time com data. "Dias de cada ajudante" mostra "Time desde dd/mm" e
   avisa quando entra, sai ou muda o horário de um ajudante.
G. Placar do Escritório (6 números, tabela da parte 6). Entra no Painel
   dos 4 números (Tarefa 14) como 1 bloco, sem tela nova.

NÃO FAÇA:
- Criar ajudante novo. O produto tem 8 e continua com 8.
- Criar tabela paralela pro mesmo assunto.
- Mostrar consumo em "tokens" pra família. Só R$.
- Mexer na cena, nos personagens, na ordem dos blocos ou nas cores.
- Ligar a escala sozinha antes do teto de custo estar funcionando.
- Gastar IA em turno sem dado: sem dado, o ajudante pergunta (item 3 da
  Tarefa 11) e não chama a IA.
- Escrever número da nossa família no código.

PRONTO QUANDO: na semana simulada da família Silva, toda linha de turno
tem modelo e custo, o total do mês aparece na tela com o teto, o aviso
de 80% dispara num teste forçado, "novas" zera depois de abrir, e os 6
números do placar aparecem. Print aprovado no iPhone e no Windows.
```

---

## 5. Onde cada dado fica guardado

| Dado | Onde | Muda o banco? |
|---|---|---|
| Modelo usado, custo em R$ e duração do turno | `escritorio_turnos.extras` | Não, o campo já existe |
| Modelo padrão do ajudante (leve ou forte) | `escritorio_funcionarios.modelo` | 1 coluna nova |
| Última visita de cada pessoa ao Escritório | `pessoas.escritorio_visto_em` | 1 coluna nova |
| Teto de custo da família | configuração da família | Usa a configuração que a Tarefa 2 criar |
| Saúde e placar | calculados na hora | Não |

---

## 6. Placar do Escritório

| # | Número | Meta | De onde vem |
|---|---|---|---|
| 1 | Turnos que rodaram ÷ turnos previstos na semana | 100% | escala × turnos |
| 2 | Ajudantes em "sem dados" no fim da semana | 0 | critério da Tarefa 11 |
| 3 | Pendências vencidas sem "Resolvi" | 0 | item 6 da Tarefa 11 |
| 4 | Dias até o dono responder uma pendência | até 2 (proposta) | data da pendência × "Resolvi" |
| 5 | Custo de IA da família no mês | até o teto | soma do custo dos turnos |
| 6 | Relatórios que viraram ação ÷ relatórios entregues | 50% (proposta) | "Resolvi" depois do relatório |

Teto proposto: **R$ 2,49 por família por mês**. É o topo da faixa que as Diretrizes já estimaram (R$ 0,12 a R$ 2,49). Vale como estimativa até a Tarefa 11 medir o custo real.

---

## 7. Regra de modelo (proposta, a confirmar com o custo medido)

| Ajudante | Turno normal | Relatório com insight |
|---|---|---|
| Contador da Casa | leve | forte, 1 vez por mês |
| Analista de Cartão | leve | forte, no fechamento |
| Auditor de Estoque | leve | forte, 1 vez por semana |
| Comprador | leve | forte, 1 vez por semana |
| Controlador de Presença | leve | leve |
| Folha da Casa | leve | leve |
| Agenda de Vencimentos | leve | leve |
| Guardião do Colchão | leve | forte, 1 vez por semana |

A conta é sempre do banco (Tarefa 4). A IA só escreve o relatório e o insight.

---

## 8. Ordem de construção

| Passo | O quê | Pronto quando |
|---|---|---|
| 1 | Itens A e B: modelo e custo gravados em cada turno | 1 semana simulada com custo em toda linha |
| 2 | Itens C e D: custo, teto e saúde na tela | aviso de 80% dispara no teste forçado |
| 3 | Itens E e F: novidades e time com data | "novas" zera depois de abrir |
| 4 | Item G: placar no Painel dos 4 números | os 6 números aparecem com a meta |

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
| 1 | Teto de custo de IA por família | R$ 2,49 por mês, revisto quando a Tarefa 11 medir |
| 2 | Gerente que encaminha pedido entra no piloto? | Não. Só se 2 famílias pedirem |
| 3 | Ligar já os 10 turnos da nossa família no painel de hoje? | Não. Ligar cada um só quando tiver dado real; turno sem dado só gasta |
