/* eslint-disable @typescript-eslint/no-explicit-any */
import type { OpcoesCena } from '../../../lib/escritorio/cenaBase'
import { SALAS } from './planta'

/**
 * As etiquetas são botões em HTML (é nelas que a pessoa toca e é o que o leitor de tela lê). A cada quadro esta função
 * põe cada uma acima da cabeça do seu boneco, sem deixar uma cobrir a outra: quem precisa de você tem a vez, depois
 * o selecionado. O nome da sala cede lugar quando bate numa etiqueta.
 */
type Caixa = number[]
/** Bate numa das caixas (x, y, largura, altura) com folga de 3 px, ou no teto da cena. */
function bateEm(x: number, y: number, tw: number, th: number, caixas: Caixa[]) {
  if (y < 2) return true
  return caixas.some(c => x < c[0] + c[2] + 3 && x + tw + 3 > c[0] && y < c[1] + c[3] + 3 && y + th + 3 > c[1])
}

/** O primeiro lugar perto do ideal (x0, y0) onde a etiqueta não bate em nada; sem lugar livre, devolve o último. */
function acharLugar(ch: any, x0: number, y0: number, W: number, caixas: Caixa[]) {
  const { tw, th } = ch
  const tent = [
    [0, 0],
    [0, -th - 4],
    [tw * 0.55, -th * 0.5],
    [-tw * 0.55, -th * 0.5],
    [tw * 0.7, -th - 4],
    [-tw * 0.7, -th - 4],
    [0, -2 * th - 8],
    [tw, 0],
    [-tw, 0],
    [0, th + 40],
  ]
  let x = x0,
    y = y0,
    bate = true
  for (let k = 0; k < tent.length && bate; k++) {
    x = Math.max(4, Math.min(W - tw - 4, Math.round(x0 + tent[k][0])))
    y = Math.round(y0 + tent[k][1])
    bate = bateEm(x, y, tw, th, caixas)
  }
  return { x, y, bate }
}

export function criarEtiquetas(
  T: any,
  cam: any,
  el: HTMLElement,
  o: Pick<OpcoesCena, 'etiqueta' | 'placa'> & {
    /** a etiqueta de um funcionário também evita cobrir o corpo dos outros (a sala do Meu orçamento) */
    corpos?: boolean
  },
) {
  const v3 = new T.Vector3()
  function naTela(x: number, y: number, z: number) {
    v3.set(x, y, z).project(cam)
    return { x: (v3.x * 0.5 + 0.5) * el.clientWidth, y: (-v3.y * 0.5 + 0.5) * el.clientHeight }
  }
  /** Onde o corpo de cada um aparece na tela: da cabeça aos pés, com a largura dos ombros. */
  function corposNaTela(chars: any[]) {
    return chars.map(ch => {
      const { x, z } = ch.b.r.position,
        topo = naTela(x, ch.b.hips.position.y + 1.12, z),
        pe = naTela(x, 0, z),
        meia = Math.abs(naTela(x + 0.3, 0, z).x - pe.x)
      return { id: ch.id, caixa: [topo.x - meia, topo.y, 2 * meia, pe.y - topo.y] }
    })
  }
  return function atualizaTags(chars: any[], selecionado: string | null, camNome: string) {
    const W = el.clientWidth,
      H = el.clientHeight,
      caixas: number[][] = [],
      corpos = o.corpos ? corposNaTela(chars) : []
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
      // primeiro tenta um lugar que não cobre nem outra etiqueta nem o corpo de outra pessoa; sem lugar assim, só evita etiquetas
      const alheios = corpos.filter(c => c.id !== ch.id).map(c => c.caixa)
      let lugar = acharLugar(ch, x0, y0, W, [...caixas, ...alheios])
      if (lugar.bate && alheios.length) lugar = acharLugar(ch, x0, y0, W, caixas)
      const { x, y, bate } = lugar
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
