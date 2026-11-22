import { centavos } from '../../lib/formato'

import { mesCurto, reais } from '../../lib/formato'

/** Só apresenta as parcelas que simularCompra já calculou, inclusive os centavos da primeira. */
export function fraseParcelamento(valor: number, simulacao: { mes: string; valor: number }[]): string {
  if (simulacao.length < 2) return ''
  const primeira = simulacao[0],
    ultima = simulacao[simulacao.length - 1]
  const ajuste = primeira.valor !== ultima.valor ? ` (a primeira é ${reais(primeira.valor)})` : ''
  return `${reais(valor)} em ${simulacao.length} parcelas de ${reais(ultima.valor)}, de ${mesCurto(primeira.mes + '-01')} a ${mesCurto(ultima.mes + '-01')}${ajuste}.`
}

/** À vista conta na compra; parcelado conta no mês da respectiva fatura. */
export function compromissoNesteMes(
  valor: number,
  parcelas: number,
  hoje: string,
  simulacao: { mes: string; valor: number }[],
): number {
  return parcelas <= 1
    ? valor
    : centavos(simulacao.filter(p => p.mes === hoje.slice(0, 7)).reduce((s, p) => s + p.valor, 0))
}

export function mesesDaSimulacao(faturas: { mes: string }[], parcelas: { mes: string }[]): string[] {
  return [...new Set([...faturas, ...parcelas].map(p => p.mes))].sort()
}
