import { hojeRecife } from '../formato'
import type { NumerosAtualizados } from '../../app/useNumerosAtualizados'
import type { conferenciasDoPlano } from './plano2029'

export const dataConferenciaValida = (v: unknown): v is string => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}(T|$)/.test(v) || !Number.isFinite(Date.parse(v))) return false
  return new Date(`${v.slice(0, 10)}T12:00:00Z`).toISOString().slice(0, 10) === v.slice(0, 10)
}

export function frescor(data: string | undefined, agora: Date): { dias: number | null; cor: 'verde' | 'ambar' | 'vermelho'; texto: string } {
  if (!dataConferenciaValida(data) || Date.parse(data) > agora.getTime()) return { dias: null, cor: 'vermelho', texto: 'Sem conferência registrada' }
  // Dias de calendário no fuso da família; não muda de cor no meio da tarde.
  const dia = data.includes('T') ? hojeRecife(new Date(data)) : data
  const dias = Math.round((Date.parse(hojeRecife(agora)) - Date.parse(dia)) / 86400000)
  return { dias, cor: dias <= 30 ? 'verde' : dias <= 60 ? 'ambar' : 'vermelho', texto: dias === 0 ? 'Conferido hoje' : `Conferido há ${dias} dias` }
}

export function planoComConferenciaAntiga(ids: ReturnType<typeof conferenciasDoPlano>, dados: NumerosAtualizados, hoje: string) {
  const agora = new Date(`${hoje}T23:59:59-03:00`)
  const antiga = (d: string | undefined) => (frescor(d, agora).dias ?? 0) > 60
  return antiga(dados.saldo_caixa) || (['aplicacoes', 'imoveis', 'recebimentos'] as const).some(grupo =>
    ids[grupo].some(id => antiga(dados[grupo][id])))
}
