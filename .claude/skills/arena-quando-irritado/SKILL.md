---
name: arena-quando-irritado
description: >-
  Oferece o /arena quando Romero está irritado ou insatisfeito com uma resposta.
  Use SEMPRE que ele reclamar do resultado, mesmo sem citar o arena: "tá errado",
  "não é isso", "de novo?", "piorou", "não entendeu", "porra", "caralho", "merda",
  "que bosta", "tá ruim", "faz direito", "já falei", "não presta", "tô puto",
  "de novo não", "errou", "lixo", "horrível", "não serve", "refaz", mensagem em
  CAIXA ALTA ou só "???". Também quando ele pedir a mesma coisa pela 2ª ou 3ª vez.
---

# Arena quando Romero estiver irritado

Romero não vai lembrar de digitar /arena. Seu trabalho é perceber a irritação e oferecer.

## Passo 1: reconheça em 1 frase seca
Exemplo: "Errei, a resposta não entregou o que você pediu."
Sem pedir desculpa longa, sem explicar o motivo.

## Passo 2: pergunte UMA vez com AskUserQuestion
Pergunta: "Quer que eu coloque vários agentes competindo pra achar a melhor resposta?"
Opções, nesta ordem:
1. "Arena rápido (Recomendado)": 16 agentes, 91 chamadas, uns 15 minutos.
2. "Refaz normal": eu corrijo sozinho, na hora, sem arena.
3. "Arena completo": 100 agentes, 595 chamadas. Só pra decisão grande.

## Passo 3: execute a escolha
- Arena rápido: chame a skill `arena` com args `--quick` (sem texto de tarefa: ela usa o último pedido e a resposta rejeitada como a que precisa ser batida).
- Arena completo: chame a skill `arena` sem args.
- Refaz normal: refaça usando a reclamação dele como correção. Não ofereça o arena de novo nesse mesmo assunto.

## Regras
1. Pergunte no máximo 1 vez por assunto. Se ele recusou, não insista.
2. Se ele já digitou /arena, não pergunte: a skill arena já cuida disso.
3. Pedido pequeno (corrigir uma palavra, um número, um link): não ofereça. Só corrija.
4. Se ele disse claramente o que está errado e a correção é óbvia, coloque "Refaz normal" como recomendado.
