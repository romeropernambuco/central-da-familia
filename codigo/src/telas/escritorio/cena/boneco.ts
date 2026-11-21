/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Pecas } from './pecas'

/** Quadril acima do chão: de pé e sentado. */
export const HIP_PE = 0.555,
  HIP_SENTADO = 0.325

/**
 * Boneco low poly feito por código: tronco, cabeça, braços e pernas articulados.
 * No mini os olhos e o cabelo são grupos próprios, para piscar e balançar sem deformar a cabeça.
 */
export function criarBoneco(T: any, { cx, fecha, grupo }: Pecas, mini: boolean) {
  const o = { mini }
  return function boneco(c: any) {
    const r = new T.Group(),
      hips = grupo(r)
    const p: any = { r, hips }
    cx(0.46, 0.5, 0.26, c.camisa, 0, 0.25, 0, hips)
    cx(0.2, 0.05, 0.27, 0xf4efe6, 0, 0.49, 0.005, hips)
    const head = grupo(hips, 0, 0.5, 0)
    p.head = head
    cx(0.14, 0.08, 0.14, c.pele, 0, 0.03, 0, head)
    cx(0.44, 0.4, 0.4, c.pele, 0, 0.26, 0, head)
    /* olhos articulados só no mini: piscar não achata a cabeça ou os óculos */
    const olhos = o.mini ? grupo(head, 0, 0.25, 0) : head
    p.olhos = olhos
    ;[-0.1, 0.1].forEach(x => {
      cx(0.08, 0.06, 0.02, 0xf7f3ec, x, o.mini ? 0 : 0.25, 0.204, olhos)
      cx(0.04, 0.05, 0.02, 0x2a211b, x, o.mini ? -0.002 : 0.248, 0.212, olhos)
    })
    if (o.mini) fecha(olhos)
    cx(0.1, 0.025, 0.02, c.cabelo, -0.1, 0.335, 0.205, head)
    cx(0.1, 0.025, 0.02, c.cabelo, 0.1, 0.335, 0.205, head)
    cx(0.06, 0.07, 0.05, c.pele, 0, 0.2, 0.22, head)
    cx(0.12, 0.025, 0.02, 0x9a5a4c, 0, 0.12, 0.205, head)
    const cabelo = o.mini ? grupo(head, 0, 0.4, -0.08) : head
    p.cabelo = cabelo
    cx(0.48, 0.13, 0.44, c.cabelo, 0, o.mini ? 0.09 : 0.49, o.mini ? 0.08 : 0, cabelo)
    cx(0.48, 0.26, 0.1, c.cabelo, 0, 0.36, -0.19, head)
    cx(0.48, 0.07, 0.08, c.cabelo, 0, 0.43, 0.19, head)
    if (c.estilo === 'longo') {
      cx(0.5, 0.5, 0.1, c.cabelo, 0, o.mini ? -0.22 : 0.18, o.mini ? -0.12 : -0.2, cabelo)
      cx(0.07, 0.42, 0.3, c.cabelo, -0.245, o.mini ? -0.18 : 0.22, o.mini ? 0.03 : -0.05, cabelo)
      cx(0.07, 0.42, 0.3, c.cabelo, 0.245, o.mini ? -0.18 : 0.22, o.mini ? 0.03 : -0.05, cabelo)
    }
    if (c.estilo === 'coque') {
      cx(0.2, 0.18, 0.2, c.cabelo, 0, o.mini ? 0.23 : 0.63, o.mini ? 0 : -0.08, cabelo)
    }
    if (o.mini) fecha(cabelo)
    if (c.oculos) {
      ;[-0.1, 0.1].forEach(x => {
        cx(0.17, 0.02, 0.02, 0x1e1e22, x, 0.315, 0.225, head)
        cx(0.17, 0.02, 0.02, 0x1e1e22, x, 0.185, 0.225, head)
        cx(0.02, 0.15, 0.02, 0x1e1e22, x - 0.075, 0.25, 0.225, head)
        cx(0.02, 0.15, 0.02, 0x1e1e22, x + 0.075, 0.25, 0.225, head)
      })
    }
    function braco(x: number) {
      const b = grupo(hips, x, 0.44, 0)
      cx(0.13, 0.24, 0.14, c.camisa, 0, -0.12, 0, b)
      const e = grupo(b, 0, -0.24, 0)
      cx(0.115, 0.2, 0.125, c.pele, 0, -0.1, 0, e)
      cx(0.125, 0.09, 0.135, c.pele, 0, -0.24, 0, e)
      if (o.mini && c.apontaContrato && x > 0) cx(0.035, 0.07, 0.035, c.pele, 0, -0.29, 0, e)
      fecha(b)
      fecha(e)
      return { o: b, e }
    }
    function perna(x: number) {
      const b = grupo(hips, x, 0, 0)
      cx(0.18, 0.26, 0.2, c.calca, 0, -0.13, 0, b)
      const k = grupo(b, 0, -0.26, 0)
      cx(0.165, 0.22, 0.185, c.calca, 0, -0.11, 0, k)
      cx(0.175, 0.07, 0.27, 0x2a2623, 0, -0.255, 0.035, k)
      fecha(b)
      fecha(k)
      return { o: b, k }
    }
    p.bL = braco(-0.3)
    p.bR = braco(0.3)
    p.pL = perna(-0.12)
    p.pR = perna(0.12)
    fecha(hips)
    fecha(head)
    return p
  }
}
