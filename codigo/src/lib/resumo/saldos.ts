export interface SaldoConta {
  id: string
  nome: string
  valor: number
  conferidoEm: string
}
/** Valores em reais, sem confundir saldo bancário com limite de orçamento. */
export function saldoDasContas(contas: SaldoConta[]) {
  if (
    !Array.isArray(contas) ||
    contas.some(c => !c.id || !c.nome || !Number.isFinite(c.valor) || !/^\d{4}-\d{2}-\d{2}$/.test(c.conferidoEm))
  )
    throw new Error('Saldo incompleto')
  return {
    valor: Math.round(contas.reduce((s, c) => s + c.valor, 0) * 100) / 100,
    conferidoEm: contas.length ? contas.map(c => c.conferidoEm).sort()[0] : null,
  }
}
