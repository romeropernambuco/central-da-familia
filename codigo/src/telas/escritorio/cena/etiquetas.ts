/* eslint-disable @typescript-eslint/no-explicit-any */
import type { OpcoesCena } from '../../../lib/escritorio/cenaBase'
import { SALAS } from './planta'

/**
 * As etiquetas são botões em HTML (é nelas que a pessoa toca e é o que o leitor de tela lê). A cada quadro esta função
 * põe cada uma acima da cabeça do seu boneco, sem deixar uma cobrir a outra: quem precisa de você tem a vez, depois
 * o selecionado. O nome da sala cede lugar quando bate numa etiqueta.
 */
export function criarEtiquetas(T: any, cam: any, el: HTMLElement, o: Pick<OpcoesCena, 'etiqueta' | 'placa'>) {
  const v3 = new T.Vector3()
  function naTela(x: number, y: number, z: number) {
    v3.set(x, y, z).project(cam)
    return { x: (v3.x * 0.5 + 0.5) * el.clientWidth, y: (-v3.y * 0.5 + 0.5) * el.clientHeight }
  }
  return function atualizaTags(chars: any[], selecionado: string | null, camNome: string) {
    const W = el.clientWidth,
      H = el.clientHeight,
      caixas: number[][] = []
    const ordem = chars.slice().sort((a, b) => {
      const pa = a.st === 'precisa' ? 0 : a.id === selecionado ? 1 : 2,
        pb = b.st === 'precisa' ? 0 : b.id === selecionado ? 1 : 2
      return pa - pb
    })
    ordem.forEach(ch => {
      const t: any = o.etiqueta(ch.id)
      if (!t) return
      const chave = t.dataset.k || ''
      if (ch.tk !== chave || !ch.tw) {
        ch.tk = chave
        ch.tw = t.offsetWidth
        ch.th = t.offsetHeight
      }
      const hy = ch.b.hips.position.y + 1.12,
        p = naTela(ch.b.r.position.x, hy, ch.b.r.position.z)
      const x0 = Math.round(p.x - ch.tw / 2),
        y0 = Math.round(p.y - ch.th - 4)
      const fora =
        p.y < 0 ||
        p.y > H + 20 ||
        p.x < -10 ||
        p.x > W + 10 ||
        (camNome !== 'tudo' && ch.sala !== camNome && ch.id !== selecionado)
      let x = x0,
        y = y0,
        bate = false
      const tent = [
        [0, 0],
        [0, -ch.th - 4],
        [ch.tw * 0.55, -ch.th * 0.5],
        [-ch.tw * 0.55, -ch.th * 0.5],
        [ch.tw * 0.7, -ch.th - 4],
        [-ch.tw * 0.7, -ch.th - 4],
        [0, -2 * ch.th - 8],
        [ch.tw, 0],
        [-ch.tw, 0],
        [0, ch.th + 40],
      ]
      for (let k = 0; k < tent.length; k++) {
        x = Math.max(4, Math.min(W - ch.tw - 4, Math.round(x0 + tent[k][0])))
        y = Math.round(y0 + tent[k][1])
        bate = y < 2
        for (let i = 0; i < caixas.length && !bate; i++) {
          const c = caixas[i]
          if (x < c[0] + c[2] + 3 && x + ch.tw + 3 > c[0] && y < c[1] + c[3] + 3 && y + ch.th + 3 > c[1]) bate = true
        }
        if (!bate) break
      }
      if (fora || bate) {
        t.style.visibility = 'hidden'
      } else {
        t.style.visibility = 'visible'
        t.style.transform = `translate(${x}px,${y}px)`
        caixas.push([x, y, ch.tw, ch.th])
      }
    })
    Object.keys(SALAS).forEach(k => {
      const d: any = o.placa(k)
      if (!d) return
      const q = SALAS[k].rot,
        p = naTela(q[0], q[1], q[2])
      if (!d._w) d._w = d.offsetWidth
      const px = Math.round(p.x - d._w / 2),
        py = Math.round(p.y - 9)
      let fora = p.y < 10 || p.y > H - 10 || p.x < d._w / 2 || p.x > W - d._w / 2
      // o nome da sala cede a vez: se bater numa etiqueta de funcionário, some
      for (let i = 0; i < caixas.length && !fora; i++) {
        const c = caixas[i]
        if (px < c[0] + c[2] + 2 && px + d._w + 2 > c[0] && py < c[1] + c[3] + 2 && py + 18 + 2 > c[1]) fora = true
      }
      d.style.visibility = fora ? 'hidden' : 'visible'
      d.style.transform = `translate(${px}px,${py}px)`
    })
  }
}
