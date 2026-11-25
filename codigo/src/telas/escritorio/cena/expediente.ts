/* eslint-disable @typescript-eslint/no-explicit-any */
// O expediente no escritório inteiro: dormir na mesa fora do horário e a reunião que chama todo mundo para a frente.
import type { EstadoCena } from '../../../lib/escritorio/cenaBase'
import { HIP_SENTADO } from './boneco'

/** Dormindo debruçado na mesa: tronco deitado para a frente, rosto virado para quem olha, braços largados no tampo. */
export function dormir(ch: any, dt: number, a: number, ph: number) {
  const b = ch.b
  b.r.rotation.y += (0 - b.r.rotation.y) * Math.min(1, dt * 8)
  return {
    hy: HIP_SENTADO + a * Math.sin(ph * 1.1) * 0.008,
    hx: 0.86,
    cx: -0.25,
    cy: 0.95,
    lx: -2.35,
    lz: -0.25,
    le: -0.35,
    rx: -2.35,
    rz: 0.25,
    re: -0.35,
    rez: 0,
    tl: -2.36,
    kl: 1.5,
    tr: -2.36,
    kr: 1.5,
  }
}

/** Pra onde ir: quem precisa de você (ou foi chamado para a reunião) vai pra frente da sala; depois, volta pra mesa. */
export function decidirRumo(ch: any, st: EstadoCena) {
  if (ch.path) return
  const chamado = st === 'precisa' || ch.reuniao > 0
  if (chamado && ch.loc === 'sentado') {
    ch.path = [ch.G1, ch.G2, ch.F]
    ch.dest = 'frente'
  } else if (!chamado && ch.loc === 'frente') {
    ch.path = [ch.G2, ch.G1, ch.S]
    ch.dest = 'sentado'
  }
}

/** A reunião dura alguns segundos na frente da sala; quando acaba, todo mundo volta e trabalha com gosto por um tempo. */
export function contarReuniao(ch: any, dt: number) {
  if (ch.embalo > 0) ch.embalo -= dt
  if (!(ch.reuniao > 0) || ch.path || ch.loc !== 'frente') return
  ch.reuniao -= dt
  if (ch.reuniao <= 0) {
    ch.reuniao = 0
    ch.embalo = 8
  }
}
