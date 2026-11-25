/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Pecas } from './pecas'

/** Quadril acima do chão: de pé e sentado. */
export const HIP_PE = 0.555,
  HIP_SENTADO = 0.325

/**
 * Boneco low poly feito por código: tronco, cabeça, braços e pernas articulados.
 * No mini os olhos e o cabelo são grupos próprios, para piscar e balançar sem deformar a cabeça.
 */
/** O que só o escritório inteiro ganha: orelhas, sorriso, cinto e o que cada um leva no peito (crachá, gravata ou botões). */
type Caixa = (w: number, h: number, d: number, c: any, x: number, y: number, z: number, pai: any) => void
function detalhar(T: any, cx: Caixa, c: any, hips: any, head: any) {
  const tom = (cor: number, f: number) => new T.Color(cor).multiplyScalar(f).getHex()
  ;[-0.235, 0.235].forEach(x => cx(0.05, 0.11, 0.1, tom(c.pele, 0.94), x, 0.24, 0, head))
  ;[-0.07, 0.07].forEach(x => cx(0.025, 0.025, 0.02, 0x9a5a4c, x, 0.137, 0.205, head))
  cx(0.47, 0.06, 0.27, 0x2a2623, 0, 0.03, 0, hips)
  cx(0.05, 0.04, 0.02, 0xc9b27a, 0, 0.03, 0.14, hips)
  ;[-0.07, 0.07].forEach(x => cx(0.09, 0.06, 0.05, 0xf4efe6, x, 0.475, 0.115, hips))
  const peito = c.camisa % 3
  if (peito === 0) {
    cx(0.02, 0.17, 0.02, 0x2a2623, 0.11, 0.39, 0.132, hips)
    cx(0.1, 0.12, 0.02, 0xfbf8f1, 0.11, 0.27, 0.136, hips)
    cx(0.06, 0.03, 0.02, tom(c.camisa, 0.7), 0.11, 0.29, 0.142, hips)
  } else if (peito === 1) {
    cx(0.07, 0.05, 0.02, tom(c.camisa, 0.55), 0, 0.43, 0.134, hips)
    cx(0.06, 0.24, 0.02, tom(c.camisa, 0.55), 0, 0.29, 0.134, hips)
  } else [0.38, 0.28, 0.18].forEach(y => cx(0.03, 0.03, 0.02, tom(c.camisa, 1.35), 0, y, 0.134, hips))
}

export function criarBoneco(T: any, { cx: caixa, fecha, grupo }: Pecas, mini: boolean) {
  const o = { mini }
  /* no escritório inteiro o corpo tem cantos arredondados; no mini continua em caixas, como já era */
  const cx = (
    w: number,
    h: number,
    d: number,
    c: any,
    x: number,
    y: number,
    z: number,
    pai: any,
    raio = 0,
    seg = 1,
  ) => {
    caixa(w, h, d, c, x, y, z, pai)
    const feita = pai.userData.lista?.at(-1)
    if (raio && !mini && feita) feita.push(raio, seg)
  }
  return function boneco(c: any) {
    const r = new T.Group(),
      hips = grupo(r)
    const p: any = { r, hips }
    cx(0.46, 0.5, 0.26, c.camisa, 0, 0.25, 0, hips, 0.24)
    cx(0.2, 0.05, 0.27, 0xf4efe6, 0, 0.49, 0.005, hips)
    const head = grupo(hips, 0, 0.5, 0)
    p.head = head
    cx(0.14, 0.08, 0.14, c.pele, 0, 0.03, 0, head)
    cx(0.44, 0.4, 0.4, c.pele, 0, 0.26, 0, head, 0.3, 2)
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
    cx(0.48, 0.13, 0.44, c.cabelo, 0, o.mini ? 0.09 : 0.49, o.mini ? 0.08 : 0, cabelo, 0.3, 2)
    cx(0.48, 0.26, 0.1, c.cabelo, 0, 0.36, -0.19, head, 0.3)
    cx(0.48, 0.07, 0.08, c.cabelo, 0, 0.43, 0.19, head)
    if (c.estilo === 'longo') {
      cx(0.5, 0.5, 0.1, c.cabelo, 0, o.mini ? -0.22 : 0.18, o.mini ? -0.12 : -0.2, cabelo, 0.3)
      cx(0.07, 0.42, 0.3, c.cabelo, -0.245, o.mini ? -0.18 : 0.22, o.mini ? 0.03 : -0.05, cabelo)
      cx(0.07, 0.42, 0.3, c.cabelo, 0.245, o.mini ? -0.18 : 0.22, o.mini ? 0.03 : -0.05, cabelo)
    }
    if (c.estilo === 'coque') {
      cx(0.2, 0.18, 0.2, c.cabelo, 0, o.mini ? 0.23 : 0.63, o.mini ? 0 : -0.08, cabelo, 0.4, 2)
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
      cx(0.13, 0.24, 0.14, c.camisa, 0, -0.12, 0, b, 0.3)
      const e = grupo(b, 0, -0.24, 0)
      cx(0.115, 0.2, 0.125, c.pele, 0, -0.1, 0, e, 0.3)
      cx(0.125, 0.09, 0.135, c.pele, 0, -0.24, 0, e, 0.35)
      if (o.mini && c.apontaContrato && x > 0) cx(0.035, 0.07, 0.035, c.pele, 0, -0.29, 0, e)
      fecha(b)
      fecha(e)
      return { o: b, e }
    }
    function perna(x: number) {
      const b = grupo(hips, x, 0, 0)
      cx(0.18, 0.26, 0.2, c.calca, 0, -0.13, 0, b, 0.25)
      const k = grupo(b, 0, -0.26, 0)
      cx(0.165, 0.22, 0.185, c.calca, 0, -0.11, 0, k, 0.25)
      cx(0.175, 0.07, 0.27, 0x2a2623, 0, -0.255, 0.035, k, 0.3)
      if (!o.mini) cx(0.185, 0.02, 0.28, 0xe9e2d4, 0, -0.28, 0.035, k)
      fecha(b)
      fecha(k)
      return { o: b, k }
    }
    if (!o.mini) detalhar(T, cx, c, hips, head)
    p.bL = braco(-0.3)
    p.bR = braco(0.3)
    p.pL = perna(-0.12)
    p.pR = perna(0.12)
    fecha(hips)
    fecha(head)
    return p
  }
}
