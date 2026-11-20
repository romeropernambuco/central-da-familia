import { FUSO, somaDias } from '../formato'

/** Nunca aceita um timestamp sem fuso (Date.parse o interpretaria no aparelho). */
export function instante(agora: unknown): number | null {
  const n =
    agora instanceof Date
      ? agora.getTime()
      : typeof agora === 'number'
        ? agora
        : typeof agora === 'string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(agora)
          ? Date.parse(agora)
          : NaN
  return Number.isFinite(n) && Math.abs(n) <= 8.64e15 ? n : null
}
export function diaValido(d: unknown): d is string {
  if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d) || d < '0100-01-01') return false
  const t = Date.parse(d + 'T12:00:00Z')
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === d
}
export const mesValido = (m: unknown): m is string =>
  typeof m === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) && m >= '0100-01'
export function tempoRecife(agora: unknown): { ms: number; dia: string; hora: number } | null {
  const ms = instante(agora)
  if (ms === null) return null
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(ms)
  const p = (k: string) => partes.find(x => x.type === k)?.value || ''
  const dia = `${p('year')}-${p('month')}-${p('day')}`
  return diaValido(dia) ? { ms, dia, hora: Number(p('hour')) } : null
}
export const amanhaDeManha = (dia: string) => Date.parse(somaDias(dia, 1) + 'T07:00:00-03:00')
