/** Cenografia em unidades do boneco; o kit é medido DEPOIS das transformações glTF. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as T from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { SalaEquipe } from '../../lib/escritorio/equipe'

// Composição pura compartilhada com a legenda, sem antecipar a carga de Three.
import { VARIANTES, bytesDaSala } from './elencoPorAba'
import type { ComposicaoMini } from './elencoPorAba'
export { VARIANTES, nomesDaSala, bytesDaSala, composicaoMini, LIMITES_MINI } from './elencoPorAba'
export type { ComposicaoMini, OrcamentoMini, PostoMini } from './elencoPorAba'
export const ESCALA_FUNCIONARIO_MINI = 0.92
export const ESCALA_MOVEL_MINI = 1.815
export function caixaReal(raiz: any) {
  raiz.updateMatrixWorld(true)
  return new T.Box3().setFromObject(raiz, true)
}

/** Copia vértices e cores para a montagem; nunca altera/dispose os recursos emprestados. */
function colorida(m: any, matriz: any) {
  const original = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()
  const g = new T.BufferGeometry()
  g.setAttribute('position', original.attributes.position.clone())
  g.setAttribute('normal', original.attributes.normal.clone())
  const cores = new Float32Array(g.attributes.position.count * 3),
    c = m.userData.tinta === undefined ? m.material.color : new T.Color(m.userData.tinta),
    origem = m.material.vertexColors && original.attributes.color
  for (let i = 0; i < cores.length; i += 3) {
    cores[i] = c.r * (origem ? origem.getX(i / 3) : 1)
    cores[i + 1] = c.g * (origem ? origem.getY(i / 3) : 1)
    cores[i + 2] = c.b * (origem ? origem.getZ(i / 3) : 1)
  }
  g.setAttribute('color', new T.BufferAttribute(cores, 3))
  g.applyMatrix4(matriz)
  original.dispose()
  return g
}

/** Mescla por material de saída. Preserva cada pivô animado e as instâncias existentes. */
export function fundirGrupos(raiz: any, guardar: (r: any) => any, material?: any) {
  const vc = material || guardar(new T.MeshLambertMaterial({ vertexColors: true }))
  raiz.traverse((pai: any) => {
    const meshes = pai.children.filter(
      (m: any) =>
        m.isMesh && !m.isInstancedMesh && !m.userData.movel && !Array.isArray(m.material) && !m.material.transparent,
    )
    if (!meshes.length) return
    const partes = meshes.map((m: any) => {
      m.updateMatrix()
      return colorida(m, m.matrix)
    })
    const geometria = mergeGeometries(partes, false)
    partes.forEach((g: any) => g.dispose())
    if (!geometria) throw Error('geometrias incompatíveis')
    const mesh = new T.Mesh(guardar(geometria), vc)
    meshes.forEach((m: any) => pai.remove(m))
    pai.add(mesh)
  })
}

/** Partes sem gesto no coletivo: pernas sentadas ou cabelo/olhos junto à cabeça.
 * Mantém os pivôs/referências do rig; só as superfícies rígidas viram um desenho. */
export function fundirRamo(raiz: any, guardar: (r: any) => any, tinta = 1) {
  raiz.updateWorldMatrix(true, true)
  const inversa = raiz.matrixWorld.clone().invert(),
    partes: any[] = [],
    meshes: any[] = []
  raiz.traverse((m: any) => {
    if (m.isMesh) {
      const c = m.material.color?.clone().multiplyScalar(tinta)
      const substituto = {
        geometry: m.geometry,
        material: m.material,
        userData: { ...m.userData, ...(c && !m.material.vertexColors ? { tinta: c.getHex() } : {}) },
      }
      partes.push(colorida(substituto, new T.Matrix4().multiplyMatrices(inversa, m.matrixWorld)))
      meshes.push(m)
    }
  })
  if (!partes.length) return
  const geometria = guardar(mergeGeometries(partes, false))
  partes.forEach(g => g.dispose())
  if (tinta !== 1) {
    const c = geometria.attributes.color
    for (let i = 0; i < c.count; i++) c.setXYZ(i, c.getX(i) * tinta, c.getY(i) * tinta, c.getZ(i) * tinta)
  }
  meshes.forEach(m => m.removeFromParent())
  raiz.add(new T.Mesh(geometria, guardar(new T.MeshLambertMaterial({ vertexColors: true }))))
}

export function montarEscritorioMini(
  sala: SalaEquipe,
  modelos: Record<string, any>,
  cor: number,
  _boneco: (roupa: any) => any,
  composicao?: ComposicaoMini,
) {
  const recursos = new Set<any>(),
    guardar = (r: any) => {
      recursos.add(r)
      return r
    }
  const destruir = () => {
    recursos.forEach(r => r.dispose())
    recursos.clear()
  }
  try {
    const variante = VARIANTES[sala]
    const coletivo = !!composicao && composicao.ids.length > 1
    const dadosPostos: any[] = [],
      gruposDosPostos = new Set<any>()
    const raiz = new T.Group(),
      pecas: Record<string, any[]> = {},
      estaticos = new T.Group()
    raiz.add(estaticos)
    raiz.name = 'escritorio:kenney'
    const opaco = guardar(new T.MeshLambertMaterial({ vertexColors: true }))
    const vidro = guardar(
      new T.MeshLambertMaterial({ color: 0xbcdacf, transparent: true, opacity: 0.35, depthWrite: false }),
    )
    const tela = guardar(new T.MeshLambertMaterial({ color: cor, emissive: cor, emissiveIntensity: 0.75 }))
    const partes: any[][] = [[], [], []]
    function por(
      nome: string,
      x: number,
      y: number,
      z: number,
      escala: number | number[] = 1.65,
      giro = 0,
      tinta?: number,
    ) {
      const g = new T.Group(),
        copia = modelos[nome].clone(true)
      g.add(copia)
      if (tinta !== undefined)
        copia.traverse((m: any) => {
          if (m.isMesh && !m.material.transparent) {
            const c = new T.Color(tinta)
            if (m.material.name === 'carpetDarker') c.multiplyScalar(0.65)
            m.userData.tinta = c.getHex()
          }
        })
      const b = caixaReal(copia),
        centro = b.getCenter(new T.Vector3())
      copia.position.add(new T.Vector3(-centro.x, -b.min.y, -centro.z))
      const [ex, ey, ez] = Array.isArray(escala) ? escala : [escala, escala, escala]
      g.scale.set(ex, ey, ez)
      g.rotation.y = giro
      g.position.set(x, y, z)
      estaticos.add(g)
      g.name = nome
      ;(pecas[nome] ||= []).push(g)
      return g
    }
    // Piso de quatro módulos: um único draw com instâncias, sem material/textura nova por módulo.
    const piso = modelos.floorFull.clone(true),
      pg: any[] = []
    piso.updateMatrixWorld(true)
    piso.traverse((m: any) => {
      if (m.isMesh)
        pg.push(
          colorida(
            { geometry: m.geometry, material: m.material, userData: { tinta: variante.paleta.piso } },
            m.matrixWorld,
          ),
        )
    })
    const pisoGeo = guardar(mergeGeometries(pg, false))
    pg.forEach(g => g.dispose())
    const pisoMesh = guardar(new T.InstancedMesh(pisoGeo, opaco, 4)),
      transform = new T.Object3D()
    for (let i = 0; i < 4; i++) {
      // floorFull vai de Z=-1 a Z=0 (origem no canto), não de 0 a 1.
      transform.position.set(-1.55 + (i % 2) * 1.6, -0.05, 0.4 + Math.floor(i / 2) * 0.95)
      transform.scale.set(1.6, 1, 0.95)
      transform.updateMatrix()
      pisoMesh.setMatrixAt(i, transform.matrix)
    }
    pisoMesh.instanceMatrix.needsUpdate = true
    raiz.add(pisoMesh)
    pecas.floorFull = [pisoMesh]
    const redondo = variante.tapete === 'rugRound'
    por(
      variante.tapete,
      redondo ? 0.12 : 0,
      0.001,
      0.35,
      redondo ? [1.8, 1, 1.8] : [1.4, 1, 1.35],
      sala === 'cartoes' ? -0.18 : 0,
      variante.paleta.tapete,
    )
    const base = 0.011
    const parede = (nome: string, x: number, z: number, sx: number, sy: number, giro = 0) =>
      por(nome, x, 0, z, [sx, sy, 1], giro, variante.paleta.parede)
    // Sete recortes arquitetônicos: altura, vão, orientação e comprimento diferentes.
    if (sala === 'casa') {
      parede('wallWindow', -0.85, -0.55, 1.4, 1)
      parede('wall', 0.65, -0.55, 1.6, 0.65)
      parede('wall', -1.55, 0.05, 1.2, 0.65, Math.PI / 2)
    }
    if (sala === 'cartoes') {
      parede('wall', -0.68, -0.55, 1.75, 1.06)
      parede('doorway', 1.06, -0.5, 1, 1.28)
    }
    if (sala === 'caixa') {
      parede('wallCorner', -1.05, -0.3, 1.7, 1.05)
      parede('wall', 0.65, -0.57, 1.7, 0.65)
    }
    if (sala === 'patrimonio') {
      parede('wallCorner', -1.08, -0.25, 1.65, 1.03)
      parede('wall', 0.7, -0.55, 1.6, 0.55)
    }
    if (sala === 'recepcao') {
      parede('wallDoorway', -1, -0.55, 1.05, 1.03)
      parede('wall', 0.45, -0.55, 1.85, 0.72)
    }
    if (sala === 'gestao') {
      parede('wallWindow', 0, -0.57, 3.05, 1.02)
      parede('wall', -1.55, 0.08, 1.3, 0.5, Math.PI / 2)
    }
    if (sala === 'apoio') {
      parede('wall', -0.65, -0.55, 1.8, 0.48)
      parede('wallDoorway', 1.02, -0.55, 1.05, 0.98)
    }
    function montarPosto(posto: any, indice: number) {
      const antes = new Set(estaticos.children)
      const canto = variante.mesa === 'deskCorner'
      const mesa = por(
        variante.mesa,
        canto ? 0.18 : 0,
        base,
        canto ? 0.26 : 0.57,
        canto
          ? [1.48, ESCALA_MOVEL_MINI, 0.88]
          : [sala === 'gestao' ? 2.09 : ESCALA_MOVEL_MINI, ESCALA_MOVEL_MINI, ESCALA_MOVEL_MINI],
        Math.PI,
      )
      const tampo = caixaReal(mesa).max.y
      const cadeira = por('chairDesk', 0, base, 0.02, ESCALA_MOVEL_MINI)
      const bC = caixaReal(cadeira),
        centro = bC.getCenter(new T.Vector3())
      const acertos = new T.Raycaster(
        new T.Vector3(centro.x, bC.max.y + 1, centro.z),
        new T.Vector3(0, -1, 0),
      ).intersectObject(cadeira, true)
      const assento = acertos.find((h: any) => h.object.material.name === 'carpet' && h.face.normal.y > 0.99)?.point.y
      if (assento === undefined) throw Error('assento não encontrado')
      const tecladoZ = canto ? 0.43 : 0.34
      const teclado = por('computerKeyboard', 0.13, tampo, tecladoZ, 0.95, Math.PI)
      por('computerMouse', 0.36, tampo, tecladoZ, 1.3, Math.PI)
      por('computerScreen', canto ? -0.36 : -0.53, tampo, 0.65, 1.43, Math.PI / 2 + 0.12)
      // Segunda tela compacta no próprio posto, em vez do colega idêntico ao fundo.
      por('computerScreen', 0.53, tampo, canto ? 0.6 : 0.8, 0.65, -Math.PI / 2 - 0.12)
      const dados = { tampo, assento, teclado: new T.Vector3(0.13, caixaReal(teclado).max.y, tecladoZ), piso: base }
      for (const g of estaticos.children)
        if (!antes.has(g)) {
          gruposDosPostos.add(g)
          if (coletivo) {
            g.position.multiplyScalar(posto.escala).add(new T.Vector3(...posto.posicao))
            g.scale.multiplyScalar(posto.escala)
            g.userData.tom = indice ? 0.86 : 1
            if (indice)
              g.traverse((m: any) => {
                if (m.isMesh) m.userData.tinta = m.material.color.clone().multiplyScalar(0.86).getHex()
              })
          }
        }
      dadosPostos.push(dados)
    }
    const postos = composicao?.postos || [{ id: '', posicao: [0, 0, 0], escala: 1 }]
    postos.forEach(montarPosto)
    const { tampo, assento, teclado } = dadosPostos[0]
    const sobre = (nome: string, apoio: any, escala: number, giro = 0) => {
      const b = caixaReal(apoio),
        c = b.getCenter(new T.Vector3())
      return por(nome, c.x, b.max.y, c.z, escala, giro)
    }
    if (sala === 'casa') {
      const despensa = por('bookcaseClosedWide', -0.94, 0, -0.29, 1.1)
      for (let i = 0; i < 3; i++) por('plantSmall1', -1.18 + i * 0.24, caixaReal(despensa).max.y, -0.29, 1.05)
      const bancada = por('desk', 1.03, 0, -0.12, [0.95, 1.3, 0.85], Math.PI / 2)
      sobre('kitchenCoffeeMachine', bancada, 1.5, Math.PI / 2)
      por('lampRoundTable', 0.52, tampo, 0.56, 1)
      por('cardboardBoxClosed', 1.13, 0, 0.96, 1.1)
    }
    if (sala === 'cartoes') {
      por('bookcaseClosed', -1.05, 0, -0.25, 1.3)
      let y = 0
      for (let i = 0; i < 3; i++) {
        const b = por('cardboardBoxClosed', -0.99 + i * 0.06, y, 0.85, 1.2 - i * 0.18)
        y = caixaReal(b).max.y
      }
      por('chair', 1.1, 0, 0.82, 1.35, -0.55)
    }
    if (sala === 'caixa') {
      por('radio', -0.22, tampo, 0.05, 1, Math.PI)
      por('lampSquareTable', 0.85, tampo, 0.51, 1.15)
    }
    if (sala === 'patrimonio') {
      por('bookcaseOpen', -1.2, 0, -0.25, 1.25)
      por('bookcaseOpen', -0.68, 0, -0.26, 1.05)
      for (let i = 0; i < 3; i++) por('books', -1.2, 0.22 + i * 0.29, -0.18, 1.15)
      por('loungeChair', 1.03, 0, -0.1, 1.3, -0.55)
      const apoio = por('tableCoffee', 1.06, 0, 0.88, 0.85, Math.PI / 2)
      sobre('books', apoio, 1)
    }
    if (sala === 'recepcao') {
      por('loungeSofa', 1.17, 0, 0.95, 0.82, -0.35)
      por('pottedPlant', 1.2, 0, -0.23, 1.45)
      const balcao = por('sideTable', -0.99, 0, -0.15, [1.4, 1.6, 1.4])
      sobre('kitchenCoffeeMachine', balcao, 1.5, Math.PI / 2)
    }
    if (sala === 'gestao') {
      const aparador = por('cabinetTelevision', -1.05, 0, -0.24, 1.1)
      por('computerScreen', -1.05, caixaReal(aparador).max.y, -0.24, 1.65, 0.35)
      for (const z of [0.15, 0.99]) por('chairCushion', 1.13, 0, z, 1.1, -Math.PI / 2)
      por('plantSmall2', 0.68, tampo, 0.73, 1.1)
    }
    if (sala === 'apoio') {
      const bancada = por('table', -1.03, 0, 0.15, [1.05, 1.8, 0.95], Math.PI / 2)
      sobre('laptop', bancada, 1.6, Math.PI / 2)
      por('speaker', -1.25, 0, -0.29, 1.4)
      por('trashcan', 1.18, 0, -0.08, 1.15)
      por('cardboardBoxOpen', 1.1, 0, 0.95, 1.5, 0.2)
    }
    if (coletivo) {
      // Uma única arquitetura, com a cenografia ao fundo dos postos.
      for (const g of estaticos.children)
        if (!gruposDosPostos.has(g)) {
          if (['radio', 'lampSquareTable', 'lampRoundTable', 'plantSmall2'].includes(g.name)) {
            g.position.add(new T.Vector3(...postos[0].posicao))
            continue
          }
          g.position.x *= 1.25
          g.position.y *= 0.85
          g.position.z = -1.15 + g.position.z * 0.55
          g.scale.multiplyScalar(0.85)
        }
      pisoMesh.scale.set(1.4, 1, 1.65)
      pisoMesh.position.z = -0.35
    }
    estaticos.updateMatrixWorld(true)
    const tipoMaterial = (m: any, monitor: boolean) =>
      m.material.transparent ? 1 : monitor && m.material.name === 'metal' ? 2 : 0
    // Móveis/livros repetidos: uma geometria normalizada por modelo/material, várias matrizes.
    for (const [nome, grupos] of Object.entries(pecas))
      if (grupos.length > 1) {
        const prototipo: any[][] = [[], [], []],
          inversa = grupos[0].matrixWorld.clone().invert()
        grupos[0].traverse((m: any) => {
          if (m.isMesh)
            prototipo[tipoMaterial(m, nome === 'computerScreen')].push(
              colorida(m, new T.Matrix4().multiplyMatrices(inversa, m.matrixWorld)),
            )
        })
        for (let i = 0; i < 3; i++)
          if (prototipo[i].length) {
            const geometria = guardar(mergeGeometries(prototipo[i], false))
            prototipo[i].forEach(p => p.dispose())
            const instancias = guardar(new T.InstancedMesh(geometria, [opaco, vidro, tela][i], grupos.length))
            grupos.forEach((g, n) => {
              instancias.setMatrixAt(n, g.matrix)
              if (coletivo)
                instancias.setColorAt(
                  n,
                  new T.Color().setRGB(g.userData.tom || 1, g.userData.tom || 1, g.userData.tom || 1),
                )
              g.removeFromParent()
            })
            instancias.instanceMatrix.needsUpdate = true
            raiz.add(instancias)
          }
      }
    estaticos.traverse((m: any) => {
      if (!m.isMesh) return
      // GLTFLoader divide os primitives em meshes; a paleta vira cores de vértice.
      const materiais = Array.isArray(m.material) ? m.material : [m.material]
      if (materiais.length !== 1) throw Error('primitive inesperado')
      const monitor = m.parent?.name.startsWith('computerScreen') || m.name.startsWith('computerScreen')
      const k = tipoMaterial(m, monitor)
      partes[k].push(colorida(m, m.matrixWorld))
    })
    for (let i = 0; i < partes.length; i++)
      if (partes[i].length) {
        const g = mergeGeometries(partes[i], false)
        partes[i].forEach(p => p.dispose())
        raiz.add(new T.Mesh(guardar(g), [opaco, vidro, tela][i]))
      }
    raiz.remove(estaticos)
    raiz.userData.pecas = Object.fromEntries(Object.entries(pecas).map(([k, gs]) => [k, gs.map(g => caixaReal(g))]))
    raiz.userData.tampo = tampo
    raiz.userData.assento = assento
    raiz.userData.bytes = bytesDaSala(sala)
    raiz.userData.identidade = variante
    raiz.userData.composicao = composicao
    raiz.userData.postos = dadosPostos
    return { raiz, tampo, assento, piso: base, tela, teclado, postos: dadosPostos, pecas, guardar, destruir }
  } catch (e) {
    destruir()
    throw e
  }
}

/** IK de dois segmentos. Buffers próprios do personagem; nenhuma alocação no quadro. */
export function criarApoioDasMaos(alcance = 0.26) {
  const baixo = new T.Vector3(0, -1, 0),
    d = new T.Vector3(),
    curva = new T.Vector3(),
    cotovelo = new T.Vector3(),
    segmento = new T.Vector3(),
    inversa = new T.Quaternion()
  return (braco: any, alvo: any) => {
    d.copy(alvo).sub(braco.o.position)
    const distancia = Math.min(0.24 + alcance - 0.001, Math.max(0.025, d.length())),
      a = (0.24 ** 2 - alcance ** 2 + distancia ** 2) / (2 * distancia)
    d.normalize()
    curva.copy(baixo).addScaledVector(d, -baixo.dot(d)).normalize()
    cotovelo
      .copy(braco.o.position)
      .addScaledVector(d, a)
      .addScaledVector(curva, Math.sqrt(Math.max(0, 0.24 ** 2 - a ** 2)))
    segmento.copy(cotovelo).sub(braco.o.position).normalize()
    braco.o.quaternion.setFromUnitVectors(baixo, segmento)
    segmento.copy(braco.o.position).addScaledVector(d, distancia).sub(cotovelo).normalize()
    inversa.copy(braco.o.quaternion).invert()
    segmento.applyQuaternion(inversa)
    braco.e.quaternion.setFromUnitVectors(baixo, segmento)
  }
}

/** Enquadra o conjunto real de pontos, com margem de 5%; sem depender do tamanho CSS. */
export function enquadrarMini(camera: any, largura: number, altura: number, limites: any, coletivo = false) {
  camera.updateMatrixWorld(true)
  const inversa = camera.matrixWorldInverse,
    b = limites.clone().applyMatrix4(inversa),
    c = b.getCenter(new T.Vector3()),
    s = b.getSize(new T.Vector3())
  const aspecto = largura / altura,
    ocupacao = coletivo ? 1.8 : 1.65,
    hh = Math.max(s.y / ocupacao, s.x / (ocupacao * aspecto)),
    hw = hh * aspecto
  camera.left = c.x - hw
  camera.right = c.x + hw
  camera.top = c.y + hh
  camera.bottom = c.y - hh
  camera.updateProjectionMatrix()
}
