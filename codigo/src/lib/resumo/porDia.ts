import type { Lancamento } from '../../api/tipos'
import { centavos } from '../formato'

/** Histórico à vista do envelope, compartilhado pelo Início e Meu orçamento. */
export function porDiaDe(l: Lancamento[], envelope: string, hoje: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const x of l) if (!x.apagado_em && x.envelope_id === envelope && x.data.startsWith(hoje.slice(0, 7)) && x.data <= hoje && !x.parcela && !((x.parcelas || 1) > 1)) out[x.data] = centavos((out[x.data] || 0) + x.valor)
  return out
}
