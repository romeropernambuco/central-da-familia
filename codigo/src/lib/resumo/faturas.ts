import type { Fatura } from '../../api/tipos'
/** Gastos: por vencimento, positiva, sem fallback. Cartões: por mês, inclusive zero,
 * limitada à janela visível, com fallback à primeira vencida. Não unificar estas decisões. */
export function proximaFatura(fs: Fatura[], hoje: string, op: { exigirTotalPositivo: boolean; ordem: 'mes' | 'vencimento'; limite?: number; usarPrimeiraVencida?: boolean }) {
  const janela = fs.filter(f => !op.exigirTotalPositivo || f.total > 0)
    .sort((a, b) => a[op.ordem].localeCompare(b[op.ordem])).slice(0, op.limite)
  return janela.find(f => f.vencimento >= hoje) || (op.usarPrimeiraVencida ? janela[0] : undefined)
}
export function proximasPorCartao(fs: Fatura[], hoje: string) {
  const out: Fatura[] = []
  for (const f of fs.filter(x => x.vencimento >= hoje && x.total > 0).sort((a, b) => a.vencimento.localeCompare(b.vencimento))) if (!out.some(x => x.cartao_id === f.cartao_id)) out.push(f)
  return out
}
