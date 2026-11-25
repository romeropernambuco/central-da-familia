// O relógio do escritório: a hora em Recife e em que parte do dia a equipe está.
import { FUSO } from '../formato'

/** A hora de agora em Recife, de 0 a 24 (14h30 = 14,5). */
export function horaRecife(agora: Date = new Date()): number {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: FUSO,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(agora)
  return (Number(p[0].value) % 24) + Number(p[2].value) / 60
}

export type Turno = 'dia' | 'fimDeTarde' | 'noite'
/** Das 20h às 6h é noite (a equipe dorme); a partir das 17h30 o dia está fechando. */
export const turnoDe = (hora: number): Turno => (hora >= 20 || hora < 6 ? 'noite' : hora >= 17.5 ? 'fimDeTarde' : 'dia')

/** "noite" no endereço (#/inicio?v3&noite) mostra o escritório de noite a qualquer hora: serve para ver e para gravar. */
export const noiteForcada = () =>
  typeof location !== 'undefined' && /[?&]noite\b/.test(`${location.search}${location.hash}`)
/** A hora que vale quando a noite é forçada pelo endereço. */
export const HORA_DA_NOITE = 21.5
