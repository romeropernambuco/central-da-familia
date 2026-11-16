/** Cenografia em unidades do boneco; o kit é medido DEPOIS das transformações glTF. */
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-ignore: Three sem tipos locais.
import * as T from 'three'
// @ts-ignore: Three sem tipos locais.
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import inventario from './inventarioModelos.json'
import type { SalaEquipe } from './equipe'

// Só o posto de trabalho é comum. As massas de fundo pertencem à identidade da sala.
const comuns = ['floorFull', 'wall', 'chairDesk', 'computerScreen', 'computerKeyboard', 'computerMouse']
interface IdentidadeSala {
  mesa: string; extras: string[]; descricao: string
  paleta: { parede: number; piso: number; tapete: number }
  tapete: 'rugRectangle' | 'rugRound'
  exclusivas: string[]; assinatura: string; planta: string
}
export const ESCALA_FUNCIONARIO_MINI = .92
export const ESCALA_MOVEL_MINI = 1.815 // +10% sobre 1,65; tampo e assento continuam medidos.
export const VARIANTES: Record<SalaEquipe, IdentidadeSala> = {
  casa: {
    mesa: 'desk', extras: ['wallWindow', 'bookcaseClosedWide', 'plantSmall1', 'lampRoundTable', 'kitchenCoffeeMachine', 'cardboardBoxClosed'],
    descricao: 'Copa doméstica de terracota com despensa e bancada de café',
    paleta: { parede: 0xc97958, piso: 0xe7b88e, tapete: 0x713e31 }, tapete: 'rugRectangle',
    exclusivas: ['bookcaseClosedWide', 'plantSmall1', 'lampRoundTable'],
    assinatura: 'Três vasinhos sobre a despensa baixa', planta: 'Janela à esquerda, despensa horizontal ao fundo e copa à direita',
  },
  cartoes: {
    mesa: 'desk', extras: ['bookcaseClosed', 'doorway', 'chair', 'cardboardBoxClosed'],
    descricao: 'Arquivo violeta vertical com passagem aberta e torre de faturas',
    paleta: { parede: 0x9172bb, piso: 0xc5b4da, tapete: 0x493969 }, tapete: 'rugRectangle',
    exclusivas: ['bookcaseClosed', 'doorway', 'chair'],
    assinatura: 'Torre escalonada de três caixas junto ao portal aberto', planta: 'Arquivo à esquerda, portal isolado à direita, parede de fundo curta',
  },
  caixa: {
    mesa: 'deskCorner', extras: ['radio', 'lampSquareTable', 'wallCorner'],
    descricao: 'Contabilidade azul com mesa em L e rádio na ala lateral',
    paleta: { parede: 0x4f70c9, piso: 0xa4bee1, tapete: 0x254a71 }, tapete: 'rugRectangle',
    exclusivas: ['deskCorner', 'radio', 'lampSquareTable'],
    assinatura: 'Rádio de madeira na ponta da mesa em L', planta: 'Canto recuado azul, parede lateral baixa e grande ala de cálculo',
  },
  patrimonio: {
    mesa: 'desk', extras: ['bookcaseOpen', 'books', 'loungeChair', 'tableCoffee', 'wallCorner'],
    descricao: 'Biblioteca verde com duas estantes e canto de leitura',
    paleta: { parede: 0x598664, piso: 0xb8c99a, tapete: 0x2e513c }, tapete: 'rugRound',
    exclusivas: ['bookcaseOpen', 'books', 'loungeChair', 'tableCoffee'],
    assinatura: 'Estantes gêmeas de alturas diferentes e livros em três níveis', planta: 'Biblioteca à esquerda e poltrona de leitura à direita, canto aberto',
  },
  recepcao: {
    mesa: 'desk', extras: ['loungeSofa', 'sideTable', 'pottedPlant', 'kitchenCoffeeMachine', 'wallDoorway'],
    descricao: 'Salão de espera rosa com sofá e café no balcão lateral',
    paleta: { parede: 0xcc879b, piso: 0xe9c4cf, tapete: 0x873b5a }, tapete: 'rugRound',
    exclusivas: ['loungeSofa', 'sideTable', 'pottedPlant'],
    assinatura: 'Sofá diagonal acompanhado de planta alta', planta: 'Entrada à esquerda, sofá à direita, balcão de café ao fundo',
  },
  gestao: {
    mesa: 'desk', extras: ['cabinetTelevision', 'chairCushion', 'plantSmall2', 'wallWindow'],
    descricao: 'Gabinete ocre com mesa larga e TV de apresentação',
    paleta: { parede: 0xc5b939, piso: 0xe5d393, tapete: 0x70591f }, tapete: 'rugRectangle',
    exclusivas: ['cabinetTelevision', 'chairCushion', 'plantSmall2'],
    assinatura: 'TV elevada no aparador e duas cadeiras de reunião', planta: 'Janela panorâmica alta ao fundo, aparador à esquerda e reunião à direita',
  },
  apoio: {
    mesa: 'desk', extras: ['laptop', 'speaker', 'trashcan', 'cardboardBoxOpen', 'table', 'wallDoorway'],
    descricao: 'Oficina turquesa com bancada técnica, laptop e caixa aberta',
    paleta: { parede: 0x3ca6a0, piso: 0x9bd6ce, tapete: 0x205b61 }, tapete: 'rugRectangle',
    exclusivas: ['laptop', 'speaker', 'trashcan', 'cardboardBoxOpen', 'table'],
    assinatura: 'Coluna de som ao lado do laptop de manutenção', planta: 'Bancada transversal à esquerda, passagem à direita e rodapé de fundo baixo',
  },
}
export const nomesDaSala = (sala: SalaEquipe) => [...new Set([...comuns, VARIANTES[sala].tapete, VARIANTES[sala].mesa, ...VARIANTES[sala].extras])]
export const bytesDaSala = (sala: SalaEquipe) => nomesDaSala(sala).reduce((n, k) => n + (inventario as any)[k].bytes, 0)

export function caixaReal(raiz: any) { raiz.updateMatrixWorld(true); return new T.Box3().setFromObject(raiz, true) }

/** Copia vértices e cores para a montagem; nunca altera/dispose os recursos emprestados. */
function colorida(m: any, matriz: any) {
  const original = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()
  const g = new T.BufferGeometry()
  g.setAttribute('position', original.attributes.position.clone())
  g.setAttribute('normal', original.attributes.normal.clone())
  const cores = new Float32Array(g.attributes.position.count * 3), c = m.userData.tinta === undefined ? m.material.color : new T.Color(m.userData.tinta), origem = m.material.vertexColors && original.attributes.color
  for (let i = 0; i < cores.length; i += 3) {
    cores[i] = c.r * (origem ? origem.getX(i / 3) : 1)
    cores[i + 1] = c.g * (origem ? origem.getY(i / 3) : 1)
    cores[i + 2] = c.b * (origem ? origem.getZ(i / 3) : 1)
  }
  g.setAttribute('color', new T.BufferAttribute(cores, 3)); g.applyMatrix4(matriz); original.dispose()
  return g
}

/** Mescla por material de saída. Preserva cada pivô animado e as instâncias existentes. */
export function fundirGrupos(raiz: any, guardar: (r: any) => any, material?: any) {
  const vc = material || guardar(new T.MeshLambertMaterial({ vertexColors: true }))
  raiz.traverse((pai: any) => {
    const meshes = pai.children.filter((m: any) => m.isMesh && !m.isInstancedMesh && !m.userData.movel && !Array.isArray(m.material) && !m.material.transparent)
    if (!meshes.length) return
    const partes = meshes.map((m: any) => { m.updateMatrix(); return colorida(m, m.matrix) })
    const geometria = mergeGeometries(partes, false); partes.forEach((g: any) => g.dispose())
    if (!geometria) throw Error('geometrias incompatíveis')
    const mesh = new T.Mesh(guardar(geometria), vc)
    meshes.forEach((m: any) => pai.remove(m)); pai.add(mesh)
  })
}

export function montarEscritorioMini(sala: SalaEquipe, modelos: Record<string, any>, cor: number, _boneco: (roupa: any) => any) {
  const recursos = new Set<any>(), guardar = (r: any) => { recursos.add(r); return r }
  const destruir = () => { recursos.forEach(r => r.dispose()); recursos.clear() }
  try {
    const variante = VARIANTES[sala]
    const raiz = new T.Group(), pecas: Record<string, any[]> = {}, estaticos = new T.Group(); raiz.add(estaticos)
    raiz.name = 'escritorio:kenney'
    const opaco = guardar(new T.MeshLambertMaterial({ vertexColors: true }))
    const vidro = guardar(new T.MeshLambertMaterial({ color: 0xbcdacf, transparent: true, opacity: .35, depthWrite: false }))
    const tela = guardar(new T.MeshLambertMaterial({ color: cor, emissive: cor, emissiveIntensity: .75 }))
    const partes: any[][] = [[], [], []]
    function por(nome: string, x: number, y: number, z: number, escala: number | number[] = 1.65, giro = 0, tinta?: number) {
      const g = new T.Group(), copia = modelos[nome].clone(true); g.add(copia)
      if (tinta !== undefined) copia.traverse((m: any) => {
        if (m.isMesh && !m.material.transparent) {
          const c = new T.Color(tinta)
          if (m.material.name === 'carpetDarker') c.multiplyScalar(.65)
          m.userData.tinta = c.getHex()
        }
      })
      const b = caixaReal(copia), centro = b.getCenter(new T.Vector3())
      copia.position.add(new T.Vector3(-centro.x, -b.min.y, -centro.z))
      g.scale.set(...(Array.isArray(escala) ? escala : [escala, escala, escala])); g.rotation.y = giro; g.position.set(x, y, z)
      estaticos.add(g); g.name = nome; (pecas[nome] ||= []).push(g); return g
    }
    // Piso de quatro módulos: um único draw com instâncias, sem material/textura nova por módulo.
    const piso = modelos.floorFull.clone(true), pg: any[] = []; piso.updateMatrixWorld(true)
    piso.traverse((m: any) => { if (m.isMesh) pg.push(colorida({ geometry: m.geometry, material: m.material, userData: { tinta: variante.paleta.piso } }, m.matrixWorld)) })
    const pisoGeo = guardar(mergeGeometries(pg, false)); pg.forEach(g => g.dispose())
    const pisoMesh = guardar(new T.InstancedMesh(pisoGeo, opaco, 4)), transform = new T.Object3D()
    for (let i = 0; i < 4; i++) {
      // floorFull vai de Z=-1 a Z=0 (origem no canto), não de 0 a 1.
      transform.position.set(-1.55 + (i % 2) * 1.6, -.05, .40 + Math.floor(i / 2) * .95)
      transform.scale.set(1.6, 1, .95); transform.updateMatrix(); pisoMesh.setMatrixAt(i, transform.matrix)
    }
    pisoMesh.instanceMatrix.needsUpdate = true
    raiz.add(pisoMesh); pecas.floorFull = [pisoMesh]
    const redondo = variante.tapete === 'rugRound'
    por(variante.tapete, redondo ? .12 : 0, .001, .35, redondo ? [1.8, 1, 1.8] : [1.4, 1, 1.35], sala === 'cartoes' ? -.18 : 0, variante.paleta.tapete)
    const base = .011
    const parede = (nome: string, x: number, z: number, sx: number, sy: number, giro = 0) => por(nome, x, 0, z, [sx, sy, 1], giro, variante.paleta.parede)
    // Sete recortes arquitetônicos: altura, vão, orientação e comprimento diferentes.
    if (sala === 'casa') { parede('wallWindow', -.85, -.55, 1.4, 1); parede('wall', .65, -.55, 1.6, .65); parede('wall', -1.55, .05, 1.2, .65, Math.PI / 2) }
    if (sala === 'cartoes') { parede('wall', -.68, -.55, 1.75, 1.06); parede('doorway', 1.06, -.50, 1, 1.28) }
    if (sala === 'caixa') { parede('wallCorner', -1.05, -.3, 1.7, 1.05); parede('wall', .65, -.57, 1.7, .65) }
    if (sala === 'patrimonio') { parede('wallCorner', -1.08, -.25, 1.65, 1.03); parede('wall', .7, -.55, 1.6, .55) }
    if (sala === 'recepcao') { parede('wallDoorway', -1, -.55, 1.05, 1.03); parede('wall', .45, -.55, 1.85, .72) }
    if (sala === 'gestao') { parede('wallWindow', 0, -.57, 3.05, 1.02); parede('wall', -1.55, .08, 1.3, .5, Math.PI / 2) }
    if (sala === 'apoio') { parede('wall', -.65, -.55, 1.8, .48); parede('wallDoorway', 1.02, -.55, 1.05, .98) }
    const canto = variante.mesa === 'deskCorner'
    const mesa = por(variante.mesa, canto ? .18 : 0, base, canto ? .26 : .57, canto ? [1.48, ESCALA_MOVEL_MINI, .88] : [sala === 'gestao' ? 2.09 : ESCALA_MOVEL_MINI, ESCALA_MOVEL_MINI, ESCALA_MOVEL_MINI], Math.PI)
    const tampo = caixaReal(mesa).max.y
    const cadeira = por('chairDesk', 0, base, .02, ESCALA_MOVEL_MINI)
    const bC = caixaReal(cadeira), centro = bC.getCenter(new T.Vector3())
    const acertos = new T.Raycaster(new T.Vector3(centro.x, bC.max.y + 1, centro.z), new T.Vector3(0, -1, 0)).intersectObject(cadeira, true)
    const assento = acertos.find((h: any) => h.object.material.name === 'carpet' && h.face.normal.y > .99)?.point.y
    if (assento === undefined) throw Error('assento não encontrado')
    const tecladoZ = canto ? .43 : .34
    const teclado = por('computerKeyboard', .13, tampo, tecladoZ, .95, Math.PI)
    por('computerMouse', .36, tampo, tecladoZ, 1.3, Math.PI)
    por('computerScreen', canto ? -.36 : -.53, tampo, .65, 1.43, Math.PI / 2 + .12)
    // Segunda tela compacta no próprio posto, em vez do colega idêntico ao fundo.
    por('computerScreen', .53, tampo, canto ? .60 : .80, .65, -Math.PI / 2 - .12)
    const sobre = (nome: string, apoio: any, escala: number, giro = 0) => {
      const b = caixaReal(apoio), c = b.getCenter(new T.Vector3())
      return por(nome, c.x, b.max.y, c.z, escala, giro)
    }
    if (sala === 'casa') {
      const despensa = por('bookcaseClosedWide', -.94, 0, -.29, 1.1)
      for (let i = 0; i < 3; i++) por('plantSmall1', -1.18 + i * .24, caixaReal(despensa).max.y, -.29, 1.05)
      const bancada = por('desk', 1.03, 0, -.12, [.95, 1.3, .85], Math.PI / 2)
      sobre('kitchenCoffeeMachine', bancada, 1.5, Math.PI / 2)
      por('lampRoundTable', .52, tampo, .56, 1)
      por('cardboardBoxClosed', 1.13, 0, .96, 1.1)
    }
    if (sala === 'cartoes') {
      por('bookcaseClosed', -1.05, 0, -.25, 1.3)
      let y = 0
      for (let i = 0; i < 3; i++) { const b = por('cardboardBoxClosed', -.99 + i * .06, y, .85, 1.2 - i * .18); y = caixaReal(b).max.y }
      por('chair', 1.10, 0, .82, 1.35, -.55)
    }
    if (sala === 'caixa') {
      por('radio', -.22, tampo, .05, 1, Math.PI)
      por('lampSquareTable', .85, tampo, .51, 1.15)
    }
    if (sala === 'patrimonio') {
      por('bookcaseOpen', -1.20, 0, -.25, 1.25)
      por('bookcaseOpen', -.68, 0, -.26, 1.05)
      for (let i = 0; i < 3; i++) por('books', -1.2, .22 + i * .29, -.18, 1.15)
      por('loungeChair', 1.03, 0, -.10, 1.3, -.55)
      const apoio = por('tableCoffee', 1.06, 0, .88, .85, Math.PI / 2)
      sobre('books', apoio, 1)
    }
    if (sala === 'recepcao') {
      por('loungeSofa', 1.17, 0, .95, .82, -.35)
      por('pottedPlant', 1.20, 0, -.23, 1.45)
      const balcao = por('sideTable', -.99, 0, -.15, [1.4, 1.6, 1.4])
      sobre('kitchenCoffeeMachine', balcao, 1.5, Math.PI / 2)
    }
    if (sala === 'gestao') {
      const aparador = por('cabinetTelevision', -1.05, 0, -.24, 1.1)
      por('computerScreen', -1.05, caixaReal(aparador).max.y, -.24, 1.65, .35)
      for (const z of [.15, .99]) por('chairCushion', 1.13, 0, z, 1.1, -Math.PI / 2)
      por('plantSmall2', .68, tampo, .73, 1.1)
    }
    if (sala === 'apoio') {
      const bancada = por('table', -1.03, 0, .15, [1.05, 1.8, .95], Math.PI / 2)
      sobre('laptop', bancada, 1.6, Math.PI / 2)
      por('speaker', -1.25, 0, -.29, 1.4)
      por('trashcan', 1.18, 0, -.08, 1.15)
      por('cardboardBoxOpen', 1.1, 0, .95, 1.5, .2)
    }
    estaticos.updateMatrixWorld(true)
    const tipoMaterial = (m: any, monitor: boolean) => m.material.transparent ? 1 : monitor && m.material.name === 'metal' ? 2 : 0
    // Móveis/livros repetidos: uma geometria normalizada por modelo/material, várias matrizes.
    for (const [nome, grupos] of Object.entries(pecas)) if (grupos.length > 1) {
      const prototipo: any[][] = [[], [], []], inversa = grupos[0].matrixWorld.clone().invert()
      grupos[0].traverse((m: any) => {
        if (m.isMesh) prototipo[tipoMaterial(m, nome === 'computerScreen')].push(colorida(m, new T.Matrix4().multiplyMatrices(inversa, m.matrixWorld)))
      })
      for (let i = 0; i < 3; i++) if (prototipo[i].length) {
        const geometria = guardar(mergeGeometries(prototipo[i], false)); prototipo[i].forEach(p => p.dispose())
        const instancias = guardar(new T.InstancedMesh(geometria, [opaco, vidro, tela][i], grupos.length))
        grupos.forEach((g, n) => { instancias.setMatrixAt(n, g.matrix); g.removeFromParent() })
        instancias.instanceMatrix.needsUpdate = true; raiz.add(instancias)
      }
    }
    estaticos.traverse((m: any) => {
      if (!m.isMesh) return
      // GLTFLoader divide os primitives em meshes; a paleta vira cores de vértice.
      const materiais = Array.isArray(m.material) ? m.material : [m.material]
      if (materiais.length !== 1) throw Error('primitive inesperado')
      const material = materiais[0]
      const monitor = m.parent?.name.startsWith('computerScreen') || m.name.startsWith('computerScreen')
      const k = tipoMaterial(m, monitor)
      partes[k].push(colorida(m, m.matrixWorld))
    })
    for (let i = 0; i < partes.length; i++) if (partes[i].length) {
      const g = mergeGeometries(partes[i], false); partes[i].forEach(p => p.dispose())
      raiz.add(new T.Mesh(guardar(g), [opaco, vidro, tela][i]))
    }
    raiz.remove(estaticos)
    raiz.userData.pecas = Object.fromEntries(Object.entries(pecas).map(([k, gs]) => [k, gs.map(g => caixaReal(g))]))
    raiz.userData.tampo = tampo; raiz.userData.assento = assento
    raiz.userData.bytes = bytesDaSala(sala)
    raiz.userData.identidade = variante
    return { raiz, tampo, assento, piso: base, tela, teclado: new T.Vector3(.13, caixaReal(teclado).max.y, tecladoZ), pecas, guardar, destruir }
  } catch (e) { destruir(); throw e }
}

/** IK de dois segmentos. Buffers próprios do personagem; nenhuma alocação no quadro. */
export function criarApoioDasMaos() {
  const baixo = new T.Vector3(0, -1, 0), d = new T.Vector3(), curva = new T.Vector3(), cotovelo = new T.Vector3(), segmento = new T.Vector3(), inversa = new T.Quaternion()
  return (braco: any, alvo: any) => {
    d.copy(alvo).sub(braco.o.position)
    const distancia = Math.min(.499, Math.max(.025, d.length())), a = (.24 ** 2 - .26 ** 2 + distancia ** 2) / (2 * distancia)
    d.normalize(); curva.copy(baixo).addScaledVector(d, -baixo.dot(d)).normalize()
    cotovelo.copy(braco.o.position).addScaledVector(d, a).addScaledVector(curva, Math.sqrt(Math.max(0, .24 ** 2 - a ** 2)))
    segmento.copy(cotovelo).sub(braco.o.position).normalize()
    braco.o.quaternion.setFromUnitVectors(baixo, segmento)
    segmento.copy(braco.o.position).addScaledVector(d, distancia).sub(cotovelo).normalize()
    inversa.copy(braco.o.quaternion).invert(); segmento.applyQuaternion(inversa)
    braco.e.quaternion.setFromUnitVectors(baixo, segmento)
  }
}

/** Enquadra o conjunto real de pontos, com margem de 5%; sem depender do tamanho CSS. */
export function enquadrarMini(camera: any, largura: number, altura: number, limites: any) {
  camera.updateMatrixWorld(true)
  const inversa = camera.matrixWorldInverse, b = limites.clone().applyMatrix4(inversa), c = b.getCenter(new T.Vector3()), s = b.getSize(new T.Vector3())
  const aspecto = largura / altura, hh = Math.max(s.y / 1.65, s.x / (1.65 * aspecto)), hw = hh * aspecto
  camera.left = c.x - hw; camera.right = c.x + hw; camera.top = c.y + hh; camera.bottom = c.y - hh; camera.updateProjectionMatrix()
}
