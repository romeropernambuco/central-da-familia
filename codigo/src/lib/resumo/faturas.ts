import type { Fatura, FaturaBanco } from '../../api/tipos'
import { camposAusentes } from './contrato'
export function faturasAConferir(fs: Fatura[], banco: FaturaBanco[], hoje: string, fim: string) {
  if (
    !Array.isArray(fs) ||
    !Array.isArray(banco) ||
    camposAusentes(fs).length ||
    camposAusentes(banco).length ||
    fs.some(f => camposAusentes(f).length || !Number.isFinite(f.total) || !f.vencimento || !f.cartao_id) ||
    banco.some(f => camposAusentes(f).length || !('paga_em' in f) || !('valor_banco' in f))
  )
    throw new Error('Faturas incompletas')
  const lista = fs
    .filter(f => f.vencimento >= hoje && f.vencimento <= fim)
    .map(f => {
      const b = banco.find(b => b.cartao_id === f.cartao_id && b.mes === f.mes)
      return { ...f, total: b?.valor_banco ?? f.total, paga: !!b?.paga_em, conferir: b?.valor_banco == null }
    })
    .filter(f => !f.paga && f.total > 0)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  return { lista, total: Math.round(lista.reduce((s, f) => s + f.total, 0) * 100) / 100 }
}
/** Gastos: por vencimento, positiva, sem fallback. Cartões: por mês, inclusive zero,
 * limitada à janela visível, com fallback à primeira vencida. Não unificar estas decisões. */
export function proximaFatura(
  fs: Fatura[],
  hoje: string,
  op: { exigirTotalPositivo: boolean; ordem: 'mes' | 'vencimento'; limite?: number; usarPrimeiraVencida?: boolean },
) {
  const janela = fs
    .filter(f => !op.exigirTotalPositivo || f.total > 0)
    .sort((a, b) => a[op.ordem].localeCompare(b[op.ordem]))
    .slice(0, op.limite)
  return janela.find(f => f.vencimento >= hoje) || (op.usarPrimeiraVencida ? janela[0] : undefined)
}
export function proximasPorCartao(fs: Fatura[], hoje: string) {
  const out: Fatura[] = []
  for (const f of fs
    .filter(x => x.vencimento >= hoje && x.total > 0)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento)))
    if (!out.some(x => x.cartao_id === f.cartao_id)) out.push(f)
  return out
}
