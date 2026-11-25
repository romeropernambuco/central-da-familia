/* eslint-disable @typescript-eslint/no-explicit-any */
// As peças de montar da cena: tudo é caixa. Caixas de cor fixa são fundidas numa malha só, para o aparelho
// desenhar o escritório inteiro em poucas chamadas.
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

export type Guardar = <V extends { dispose(): void }>(v: V) => V

/** `guardar` registra geometrias e materiais para serem liberados quando a cena é destruída. */
export function criarPecas(T: any, scene: any, guardar: Guardar) {
  const GEO = guardar(new T.BoxGeometry(1, 1, 1)),
    MATS: Record<number, any> = {}
  const mat = (c: number) => MATS[c] || (MATS[c] = guardar(new T.MeshLambertMaterial({ color: c })))
  const BASE = guardar(GEO.toNonIndexed()),
    BP = BASE.attributes.position.array,
    BN = BASE.attributes.normal.array,
    corTmp = new T.Color()
  const VC = guardar(new T.MeshLambertMaterial({ vertexColors: true }))
  /* B2: mancha de sombra fixa sob cada mesa e cada pessoa (fica mesmo quando o modo leve desliga a sombra de verdade) */
  const MANCHA = guardar(
    new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16, depthWrite: false }),
  )
  const GEO_M = guardar(new T.CircleGeometry(1, 24))
  function mancha(r: number, x: number, y: number, z: number, pai: any) {
    const m = new T.Mesh(GEO_M, MANCHA)
    m.scale.set(r, r, 1)
    m.rotation.x = -Math.PI / 2
    m.position.set(x, y, z)
    m.renderOrder = 1
    pai.add(m)
    return m
  }
  /* caixa de cantos arredondados (corpo dos funcionários): uma base por raio, criada só quando alguém pede */
  const SUAVES: Record<string, { p: ArrayLike<number>; n: ArrayLike<number> }> = {}
  function suave(raio: number, seg: number) {
    const chave = raio + ':' + seg
    if (!SUAVES[chave]) {
      const g = new RoundedBoxGeometry(1, 1, 1, seg, raio)
      SUAVES[chave] = { p: g.attributes.position.array.slice(), n: g.attributes.normal.array.slice() }
      g.dispose()
    }
    return SUAVES[chave]
  }
  /* junta muitas caixas numa peça só (1 desenho por peça em vez de 1 por caixa); caixa com raio (b[7]) sai arredondada */
  function mesclar(lista: number[][]) {
    const bases = lista.map(b => (b[7] ? suave(b[7], b[8] || 1) : { p: BP, n: BN })),
      total = bases.reduce((s, b) => s + b.p.length, 0),
      pos = new Float32Array(total),
      nor = new Float32Array(total),
      col = new Float32Array(total)
    let k = 0
    for (let i = 0; i < lista.length; i++) {
      const b = lista[i],
        { p, n } = bases[i]
      corTmp.setHex(b[3])
      for (let v = 0; v < p.length; v += 3, k += 3) {
        pos[k] = p[v] * b[0] + b[4]
        pos[k + 1] = p[v + 1] * b[1] + b[5]
        pos[k + 2] = p[v + 2] * b[2] + b[6]
        // a caixa é esticada: a normal acompanha (dividida pelo tamanho) e volta a medir 1
        const nx = n[v] / b[0],
          ny = n[v + 1] / b[1],
          nz = n[v + 2] / b[2],
          m = Math.hypot(nx, ny, nz) || 1
        nor[k] = nx / m
        nor[k + 1] = ny / m
        nor[k + 2] = nz / m
        col[k] = corTmp.r
        col[k + 1] = corTmp.g
        col[k + 2] = corTmp.b
      }
    }
    const g = guardar(new T.BufferGeometry())
    g.setAttribute('position', new T.BufferAttribute(pos, 3))
    g.setAttribute('normal', new T.BufferAttribute(nor, 3))
    g.setAttribute('color', new T.BufferAttribute(col, 3))
    const m = new T.Mesh(g, VC)
    m.receiveShadow = true
    return m
  }
  const FIXO: number[][][] = [[], []]
  /* caixa: cor em número e pai fixo entra na peça única; material próprio vira peça solta */
  function cx(
    w: number,
    h: number,
    d: number,
    c: any,
    x: number,
    y: number,
    z: number,
    pai?: any,
    semSombra?: boolean,
  ): any {
    if (typeof c === 'number' && (!pai || pai.userData.fixo)) {
      const px = pai ? pai.position.x : 0,
        pz = pai ? pai.position.z : 0
      FIXO[semSombra ? 1 : 0].push([w, h, d, c, x + px, y, z + pz])
      return null
    }
    if (typeof c === 'number' && pai && pai.userData.lista) {
      pai.userData.lista.push([w, h, d, c, x, y, z])
      return null
    }
    const m = new T.Mesh(GEO, typeof c === 'number' ? mat(c) : c)
    m.scale.set(w, h, d)
    m.position.set(x, y, z)
    m.castShadow = !semSombra
    m.receiveShadow = true
    ;(pai || scene).add(m)
    return m
  }
  function fecha(g: any) {
    if (g.userData.lista && g.userData.lista.length) {
      const m = mesclar(g.userData.lista)
      m.castShadow = true
      g.add(m)
      g.userData.lista = null
    }
  }
  function grupo(pai?: any, x = 0, y = 0, z = 0) {
    const g = new T.Group()
    g.position.set(x, y, z)
    g.userData.lista = []
    if (pai) pai.add(g)
    return g
  }
  return { GEO, mat, mancha, mesclar, FIXO, cx, fecha, grupo }
}

export type Pecas = ReturnType<typeof criarPecas>
