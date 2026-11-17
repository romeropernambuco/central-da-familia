import type { EscritorioHoje } from '../../api/tipos'
import type { CampoResumo, FonteResumo } from './tipos'
import { camposAusentes } from './contrato'
/** A fila pode ser uma prévia de três perguntas; precisa_total é o total oficial. */
export function totalPendencias(e: Pick<EscritorioHoje, 'precisa_de_voce' | 'precisa_total'>): number {
  return Math.max(e.precisa_de_voce.length, e.precisa_total ?? 0)
}
export function campoPendencias(e: EscritorioHoje, fonte: FonteResumo[], consultadoEm: string): CampoResumo<number> {
  const meta = { fonte, consultadoEm, conferidoEm: null, atualizadoEm: null }
  return camposAusentes(e).length ? { ...meta, estado: 'indisponivel', valor: null, motivo: 'Contrato incompleto: precisa_de_voce' }
    : { ...meta, estado: 'pronto', valor: totalPendencias(e) }
}
