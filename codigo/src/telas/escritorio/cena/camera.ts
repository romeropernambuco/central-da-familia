/* eslint-disable @typescript-eslint/no-explicit-any */
import { ATIVIDADES_MINI } from '../atividadesMini'
import { SALAS } from './planta'

/** Um enquadramento: centro e meia largura/altura, no plano da câmera. */
export interface Vista {
  cx: number
  cy: number
  hw: number
  hh: number
}

/**
 * Câmera isométrica (sem perspectiva) e os enquadramentos prontos: a planta inteira ("tudo") e um por sala.
 * No mini a câmera fecha no posto do funcionário.
 */
export function criarCamera(T: any, chars: any[], mini: boolean, coletivo: boolean) {
  const o = { mini }
  const cam = new T.OrthographicCamera(-10, 10, 10, -10, 0.1, 100)
  const miniCamera = o.mini && chars[0] ? ATIVIDADES_MINI[chars[0].id]?.camera : null
  const DIR = new T.Vector3(...(coletivo ? [0, 0.24, 1] : miniCamera?.direcao || [1, 0.86, 1])).normalize()
  cam.position.copy(DIR).multiplyScalar(40)
  cam.lookAt(0, 0, 0)
  cam.updateMatrixWorld()
  const Rt = new T.Vector3(),
    Up = new T.Vector3(),
    Fw = new T.Vector3()
  cam.matrixWorld.extractBasis(Rt, Up, Fw)
  function vistaDe(x0: number, x1: number, y1: number, z0: number, z1: number) {
    const a = [1e9, -1e9, 1e9, -1e9],
      v = new T.Vector3()
    ;[x0, x1].forEach(x => {
      ;[0, y1].forEach(y => {
        ;[z0, z1].forEach(z => {
          v.set(x, y, z).sub(cam.position)
          const cxx = v.dot(Rt),
            cy = v.dot(Up)
          a[0] = Math.min(a[0], cxx)
          a[1] = Math.max(a[1], cxx)
          a[2] = Math.min(a[2], cy)
          a[3] = Math.max(a[3], cy)
        })
      })
    })
    return { cx: (a[0] + a[1]) / 2, cy: (a[2] + a[3]) / 2, hw: (a[1] - a[0]) / 2, hh: (a[3] - a[2]) / 2 }
  }
  /* B3 e B4 (pacote 4): enquadramento mais justo; cada sala só com ela mesma */
  // "Ver tudo" enquadra a planta de verdade (o bloco das 6 salas + a Recepção), não a caixa em volta:
  // a caixa incluía o canto vazio ao lado da Recepção e a cena ficava pequena, com espaço sobrando embaixo.
  const juntar = (...vs: { cx: number; cy: number; hw: number; hh: number }[]) => {
    const x0 = Math.min(...vs.map(v => v.cx - v.hw)),
      x1 = Math.max(...vs.map(v => v.cx + v.hw)),
      y0 = Math.min(...vs.map(v => v.cy - v.hh)),
      y1 = Math.max(...vs.map(v => v.cy + v.hh))
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, hw: (x1 - x0) / 2, hh: (y1 - y0) / 2 }
  }
  const VISTAS: Record<string, any> = {
    tudo: juntar(vistaDe(-6.2, 12.2, 2.2, -5.2, 5.2), vistaDe(-3.2, 3.2, 2.2, 5, 9.3)),
  }
  Object.keys(SALAS).forEach(k => {
    const s = SALAS[k]
    VISTAS[k] = vistaDe(s.cx - 3, s.cx + 3, 1.9, s.cz - s.d / 2, s.cz + s.d / 2)
  })
  if (o.mini && chars[0]) {
    const ch = chars[0]
    VISTAS[ch.sala] = vistaDe(
      ch.S.x - (miniCamera?.largura || 1.15),
      ch.S.x + (miniCamera?.largura || 1.15),
      ATIVIDADES_MINI[ch.id]?.emPe ? 1.95 : 1.72,
      ch.S.z - 0.35,
      ch.S.z + (miniCamera?.fundo || 1.35),
    )
    if (coletivo) VISTAS[ch.sala] = vistaDe(ch.S.x - 1, ch.S.x + 2.1, 1.95, ch.S.z - 1.5, ch.S.z + 1.35)
  }
  return { cam, VISTAS, DIR, miniCamera }
}
