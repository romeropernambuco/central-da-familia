import type { GuardadoHoje } from '../../api/tipos'
import type { CampoResumo, FonteResumo } from './tipos'
import { camposAusentes } from './contrato'
/** Só apresenta os totais oficiais. Rendimento continua exclusivamente na fonte. Unidade: reais. */
export function totaisGuardado(g: GuardadoHoje) {
  return {
    total: g.total,
    hoje: g.rendeu_hoje_liquido,
    mes: g.rendeu_mes_liquido,
    desdeInicio: g.rendeu_desde_inicio_liquido,
  }
}
export function campoGuardado(
  g: GuardadoHoje,
  fonte: FonteResumo[],
  consultadoEm: string,
  conferidoEm: string | null,
): CampoResumo<{ unidade: 'reais' } & ReturnType<typeof totaisGuardado>> {
  const meta = { fonte, consultadoEm, conferidoEm, atualizadoEm: g.atualizado_em || null }
  const ausentes = camposAusentes(g)
  return ausentes.length
    ? { ...meta, estado: 'indisponivel', valor: null, motivo: `Contrato incompleto: ${ausentes.join(', ')}` }
    : { ...meta, estado: 'pronto', valor: { unidade: 'reais', ...totaisGuardado(g) } }
}
