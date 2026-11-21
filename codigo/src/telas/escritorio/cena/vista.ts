/* eslint-disable @typescript-eslint/no-explicit-any */
import { enquadrarMini } from '../escritorioMini'
import type { Vista } from './camera'
import { lerp } from './movimento'

const LADOS = ['cx', 'cy', 'hw', 'hh'] as const
/** Quanto dura a passagem de um enquadramento para outro, em milissegundos. */
const PASSAGEM = 1200

/**
 * O enquadramento vivo da câmera: qual sala está em foco, o zoom e a passagem suave de uma sala para outra.
 * No mini com escritório montado, o enquadramento segue os limites reais dos móveis.
 */
export function criarVista(
  cam: any,
  el: HTMLElement,
  VISTAS: Record<string, Vista>,
  chars: any[],
  mini: boolean,
  coletivo: boolean,
) {
  let nome: string = mini ? chars[0]?.sala || 'tudo' : 'tudo'
  const atual: Vista = { ...VISTAS[nome] }
  let de: Vista | null = null,
    para: Vista | null = null,
    t0 = 0,
    zoom = 1
  const soltarEtiquetas = () =>
    chars.forEach(c => {
      c.tk = ''
    })
  function aplicar() {
    if (chars[0]?.limitesMini) {
      enquadrarMini(cam, el.clientWidth || 1, el.clientHeight || 1, chars[0].limitesMini, coletivo)
      return
    }
    const W = el.clientWidth || 1,
      H = el.clientHeight || 1,
      a = W / H,
      m = nome === 'tudo' ? 1.04 : 1.12,
      hw = Math.max(atual.hw * m, atual.hh * m * a) / zoom,
      hh = hw / a
    cam.left = atual.cx - hw
    cam.right = atual.cx + hw
    cam.top = atual.cy + hh
    cam.bottom = atual.cy - hh
    cam.updateProjectionMatrix()
  }
  return {
    aplicar,
    /** A sala em foco agora ("tudo" é a planta inteira). */
    get nome() {
      return nome
    },
    /** Começa a levar a câmera para uma sala; nome desconhecido volta para a planta inteira. */
    irPara(destino: string) {
      nome = VISTAS[destino] ? destino : 'tudo'
      de = { ...atual }
      para = VISTAS[nome]
      t0 = performance.now()
      soltarEtiquetas()
    },
    /** Interrompe a passagem em andamento. */
    parar() {
      para = null
    },
    /** Um passo da passagem, a cada quadro. Sem movimento, chega de uma vez. */
    avancar(agora: number, reduz: boolean) {
      if (!para || !de) return
      const k = reduz ? 1 : Math.min(1, (agora - t0) / PASSAGEM),
        e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
      for (const n of LADOS) atual[n] = lerp(de[n], para[n], e)
      aplicar()
      if (k >= 1) para = null
    },
    /** Multiplica o zoom (entre 1 e 3) e devolve o valor novo. */
    aproximar(fator: number) {
      zoom = Math.min(3, Math.max(1, +(zoom * fator).toFixed(3)))
      aplicar()
      soltarEtiquetas()
      return zoom
    },
  }
}

export type VistaViva = ReturnType<typeof criarVista>
