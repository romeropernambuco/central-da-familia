import { centavos } from '../../lib/formato'

/** À vista conta na compra; parcelado conta no mês da respectiva fatura. */
export function compromissoNesteMes(valor: number, parcelas: number, hoje: string, simulacao: { mes: string; valor: number }[]): number {
  return parcelas <= 1 ? valor : centavos(simulacao.filter(p => p.mes === hoje.slice(0, 7)).reduce((s, p) => s + p.valor, 0))
}

export function mesesDaSimulacao(faturas: { mes: string }[], parcelas: { mes: string }[]): string[] {
  return [...new Set([...faturas, ...parcelas].map(p => p.mes))].sort()
}
