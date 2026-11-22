# Etiquetas (viagem, evento, projeto)

Feito em 21/11/2026, no Supabase `central-da-familia`, esquema `produto`.

## Para que serve

O **envelope** diz *o que* foi o gasto (mercado, restaurante). A **etiqueta** diz *por que* (Europa nov/26).
Um mesmo almoço conta no envelope Restaurante do mês e no total da viagem. Ninguém lança 2 vezes.

## Regras

1. Etiqueta pode ter **data de início e fim**. Todo lançamento novo nesse período já nasce com ela.
2. Ao criar ou mudar as datas, os lançamentos que **já existiam** no período também recebem a etiqueta.
3. Se alguém **tirar** a etiqueta de um lançamento (ex.: conta de luz), ela não volta sozinha.
4. Até **3 etiquetas** por lançamento.
5. Gasto em moeda de fora: o valor em R$ continua em `valor`. O euro fica em `valor_original`, `moeda_original` e `cambio`.
6. Só o **casal** cria etiqueta, marca, desmarca e vê os totais. `pessoa` vê só os nomes. `equipe` não vê nada.

## Funções que a tela chama

| Função | O que faz | Exemplo |
|---|---|---|
| `etiqueta_salvar(familia, nome, inicio, fim, moeda, pessoas, etiqueta, arquivada)` | cria (sem `etiqueta`) ou muda (com `etiqueta`) | `('…', 'Europa nov/26', '2026-11-10', '2026-11-30', 'EUR', 5)` |
| `etiquetar(lancamento, etiqueta, ligar)` | coloca (`true`) ou tira (`false`) | devolve as etiquetas do lançamento |
| `lancamento_moeda(lancamento, valor_original, moeda, cambio)` | guarda o valor em moeda de fora | `('…', 48)` usa a moeda da etiqueta e calcula o câmbio pelo R$ |
| `etiquetas_da_familia(familia, incluir_arquivadas)` | lista com total e quantidade | pra tela de escolher etiqueta |
| `etiqueta_resumo(etiqueta)` | total, antes/durante/depois, por dia, por pessoa por dia, por envelope, por moeda, por data | pra tela da viagem |
| `etiqueta_simular(etiqueta, dias, pessoas)` | estima outra viagem com o gasto real desta | `('…', 10, 5)` |

Chamada pelo app: `sb.schema('produto').rpc('etiqueta_resumo', { etiqueta: id })`.

## Como a conta funciona

1. **Antes:** gasto etiquetado com data anterior ao início (passagem, hotel). Não cresce por dia.
2. **Durante:** gasto entre início e fim. É a base do "por dia" e do "por pessoa por dia".
3. **Simulação:** `por pessoa por dia × pessoas × dias` + o "antes" proporcional às pessoas.
4. **Pessoas:** se a etiqueta não disser, conta os membros ativos `casal` e `pessoa`.

## Tabelas

1. `produto.etiquetas`: nome, início, fim, moeda, pessoas, arquivada.
2. `produto.lancamento_etiquetas`: liga lançamento e etiqueta. `ativa = false` guarda que foi tirada a mão.
3. `produto.lancamentos`: ganhou `moeda_original`, `valor_original`, `cambio`.

Leitura direta só com `select`. Toda escrita passa pelas funções, que conferem o papel.
As etiquetas entram no `exportar_familia`, então vão junto no backup.

## Conferido

1. Teste com login simulado do casal, desfeito no fim: 9 de 9 casos certos (etiqueta nos antigos, automática nos novos, conta de luz não volta, euro, resumo, simulação, outra família bloqueada).
2. Bateria antiga do app (`rodar_testes_noturnos`): 463 casos, nenhuma falha.

## Tela (feita em 22/11/2026, no app da pasta `codigo`)

1. **Anotar:** linha "Etiqueta", já marcada pela data do gasto. O casal tira ou troca (até 3). A pessoa da família só lê o nome.
2. **Valor na moeda de fora:** o campo aparece quando a etiqueta marcada não é em real. O valor em reais continua valendo no limite.
3. **Gastos e entradas > Viagens e eventos:** lista das etiquetas. O casal abre a viagem e vê total, pago antes, durante, por dia, por pessoa por dia, por limite, por moeda, dia a dia e o simulador.
4. **Nova etiqueta:** nome, início, fim, moeda e pessoas. Mudar e arquivar ficam na mesma folha.
5. Código: `src/lib/etiquetas.ts` (contas), `src/api/etiquetasBanco.ts` (banco real), `src/api/exemploEtiquetas.ts` (família de exemplo), `src/telas/lancamentos/Viagens.tsx`, `Viagem.tsx`, `NovaEtiqueta.tsx` e `src/telas/lancar/EtiquetaNoLancar.tsx`.

## Falta

1. Testar com login de verdade no banco real (até aqui: família de exemplo e testes automáticos).
2. Sem internet, o gasto fica na fila, mas a troca de etiqueta e o valor em moeda de fora não: acerta-se depois pelo lápis.
3. Mudar a **data** de um lançamento depois não troca a etiqueta automática. Tirar ou colocar à mão resolve.
