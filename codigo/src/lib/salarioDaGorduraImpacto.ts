// O impacto de cada percentual do salário da gordura, medido com os juros e a inflação de verdade (22/11/2026).
// Simulação: CDI (série 4391) e IPCA (série 433) do Banco Central, jan/2000 a out/2026; IR de 15%; R$ 1 milhão; o
// salário do ano é o percentual do guardado de cada janeiro, fixo por 12 meses; tudo em reais de hoje. Janelas de 20
// anos começando em 2000 a 2006 (7) e de 10 anos começando em 2000 a 2016 (17). O limite de 10% na revisão não mudou o
// resultado e ficou de fora.

export interface ImpactoHistorico {
  /** % ao ano do guardado */
  pct: number
  /** guardado no fim de 20 anos, em % do valor de hoje: o pior caso, o do meio e o melhor */
  pior20: number
  meio20: number
  melhor20: number
  /** em 10 anos: o pior caso e o do meio */
  pior10: number
  meio10: number
  /** salário médio por mês para cada R$ 1 milhão (reais de hoje, caso do meio em 20 anos) */
  salarioMilhao: number
  /** o pior ano: média por mês para cada R$ 1 milhão */
  piorAnoMilhao: number
}

export const IMPACTO_HISTORICO: readonly ImpactoHistorico[] = [
  {
    pct: 3,
    pior20: 99.9,
    meio20: 105.5,
    melhor20: 131.9,
    pior10: 82,
    meio10: 99.4,
    salarioMilhao: 2907,
    piorAnoMilhao: 2173,
  },
  {
    pct: 3.5,
    pior20: 90.5,
    meio20: 95.7,
    melhor20: 119.6,
    pior10: 78,
    meio10: 94.6,
    salarioMilhao: 3236,
    piorAnoMilhao: 2343,
  },
  {
    pct: 4,
    pior20: 82,
    meio20: 86.7,
    melhor20: 108.4,
    pior10: 74.2,
    meio10: 90,
    salarioMilhao: 3531,
    piorAnoMilhao: 2472,
  },
  {
    pct: 4.5,
    pior20: 74.2,
    meio20: 78.5,
    melhor20: 98.3,
    pior10: 70.6,
    meio10: 85.7,
    salarioMilhao: 3794,
    piorAnoMilhao: 2568,
  },
  {
    pct: 5,
    pior20: 67.1,
    meio20: 71,
    melhor20: 89,
    pior10: 67.1,
    meio10: 81.5,
    salarioMilhao: 4029,
    piorAnoMilhao: 2633,
  },
  {
    pct: 5.5,
    pior20: 60.7,
    meio20: 64.3,
    melhor20: 80.6,
    pior10: 63.8,
    meio10: 77.5,
    salarioMilhao: 4238,
    piorAnoMilhao: 2654,
  },
  {
    pct: 6,
    pior20: 54.8,
    meio20: 58.1,
    melhor20: 72.9,
    pior10: 60.6,
    meio10: 73.7,
    salarioMilhao: 4423,
    piorAnoMilhao: 2630,
  },
]

/**
 * O recomendado: o único percentual em que nenhum período de 20 anos terminou com o guardado valendo menos que hoje
 * (a regra do dono: a gordura não se come). Bate com o "3% para durar gerações" de family office (Cambridge Associates).
 */
export const PCT_RECOMENDADO = 3
