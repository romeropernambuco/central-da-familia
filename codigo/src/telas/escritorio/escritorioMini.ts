/** Cenografia em unidades do boneco; o kit é medido DEPOIS das transformações glTF. */
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-ignore: Three sem tipos locais.
import * as T from 'three'
// @ts-ignore: Three sem tipos locais.
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import inventario from './inventarioModelos.json'
import type { SalaEquipe } from './equipe'

const comuns = ['floorFull', 'wall', 'wallWindow', 'rugRectangle', 'chairDesk', 'computerScreen', 'computerKeyboard', 'computerMouse', 'lampSquareTable', 'pottedPlant', 'bookcaseOpen']
export const VARIANTES: Record<SalaEquipe, { mesa: string; extras: string[]; descricao: string }> = {
  caixa: { mesa: 'deskCorner', extras: ['radio'], descricao: 'Mesa em L e rádio de conferência' },
  casa: { mesa: 'desk', extras: ['kitchenCoffeeMachine', 'cardboardBoxClosed'], descricao: 'Café, encomendas e verde' },
  cartoes: { mesa: 'desk', extras: ['cardboardBoxClosed', 'books'], descricao: 'Arquivo de faturas e caixas' },
  patrimonio: { mesa: 'desk', extras: ['books'], descricao: 'Biblioteca de investimentos' },
  recepcao: { mesa: 'desk', extras: ['loungeSofa', 'kitchenCoffeeMachine'], descricao: 'Espera com sofá e estação de café' },
  gestao: { mesa: 'desk', extras: ['cabinetTelevision'], descricao: 'Mesa executiva larga e painel de TV' },
  apoio: { mesa: 'desk', extras: ['cardboardBoxOpen', 'books'], descricao: 'Bancada técnica e arquivo de apoio' },
}
export const nomesDaSala = (sala: SalaEquipe) => [...comuns, VARIANTES[sala].mesa, ...VARIANTES[sala].extras]
export const bytesDaSala = (sala: SalaEquipe) => nomesDaSala(sala).reduce((n, k) => n + (inventario as any)[k].bytes, 0)

export function caixaReal(raiz: any) { raiz.updateMatrixWorld(true); return new T.Box3().setFromObject(raiz, true) }

/** Copia vértices e cores para a montagem; nunca altera/dispose os recursos emprestados. */
function colorida(m: any, matriz: any) {
  const original = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()
  const g = new T.BufferGeometry()
  g.setAttribute('position', original.attributes.position.clone())
  g.setAttribute('normal', original.attributes.normal.clone())
  const cores = new Float32Array(g.attributes.position.count * 3), c = m.material.color, origem = m.material.vertexColors && original.attributes.color
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

export function montarEscritorioMini(sala: SalaEquipe, modelos: Record<string, any>, cor: number, boneco: (roupa: any) => any) {
  const recursos = new Set<any>(), guardar = (r: any) => { recursos.add(r); return r }
  const destruir = () => { recursos.forEach(r => r.dispose()); recursos.clear() }
  try {
    const raiz = new T.Group(), pecas: Record<string, any[]> = {}, estaticos = new T.Group(); raiz.add(estaticos)
    raiz.name = 'escritorio:kenney'
    const opaco = guardar(new T.MeshLambertMaterial({ vertexColors: true }))
    const vidro = guardar(new T.MeshLambertMaterial({ color: 0xbcdacf, transparent: true, opacity: .35, depthWrite: false }))
    const tela = guardar(new T.MeshLambertMaterial({ color: cor, emissive: cor, emissiveIntensity: .75 }))
    const partes: any[][] = [[], [], []]
    function por(nome: string, x: number, y: number, z: number, escala: number | number[] = 1.65, giro = 0) {
      const g = new T.Group(), copia = modelos[nome].clone(true); g.add(copia)
      const b = caixaReal(copia), centro = b.getCenter(new T.Vector3())
      copia.position.add(new T.Vector3(-centro.x, -b.min.y, -centro.z))
      g.scale.set(...(Array.isArray(escala) ? escala : [escala, escala, escala])); g.rotation.y = giro; g.position.set(x, y, z)
      estaticos.add(g); g.name = nome; (pecas[nome] ||= []).push(g); return g
    }
    // Piso de quatro módulos: um único draw com instâncias, sem material/textura nova por módulo.
    const piso = modelos.floorFull.clone(true), pg: any[] = []; piso.updateMatrixWorld(true)
    piso.traverse((m: any) => { if (m.isMesh) pg.push(colorida(m, m.matrixWorld)) })
    const pisoGeo = guardar(mergeGeometries(pg, false)); pg.forEach(g => g.dispose())
    const pisoMesh = guardar(new T.InstancedMesh(pisoGeo, opaco, 4)), transform = new T.Object3D()
    for (let i = 0; i < 4; i++) {
      // floorFull vai de Z=-1 a Z=0 (origem no canto), não de 0 a 1.
      transform.position.set(-1.55 + (i % 2) * 1.6, -.05, .40 + Math.floor(i / 2) * .95)
      transform.scale.set(1.6, 1, .95); transform.updateMatrix(); pisoMesh.setMatrixAt(i, transform.matrix)
    }
    pisoMesh.instanceMatrix.needsUpdate = true
    raiz.add(pisoMesh); pecas.floorFull = [pisoMesh]
    por('rugRectangle', 0, .001, .35, [1.35, 1, 1.35])
    const base = (inventario.rugRectangle.max[1] - inventario.rugRectangle.min[1]) + .001
    por('wallWindow', .05, 0, -.57, [3.2, 1.22, 1])
    por('wall', -1.55, 0, .39, [1.9, 1.22, 1], Math.PI / 2)
    const variante = VARIANTES[sala], canto = variante.mesa === 'deskCorner'
    const mesa = por(variante.mesa, canto ? .18 : 0, base, canto ? .26 : .57, canto ? [1.35, 1.65, .8] : [sala === 'gestao' ? 1.9 : 1.65, 1.65, 1.65], Math.PI)
    const tampo = caixaReal(mesa).max.y
    const cadeira = por('chairDesk', 0, base, .02, 1.65)
    // Raio sobre o centro da almofada: mede o assento, não o topo do encosto/apoio de braço.
    const bC = caixaReal(cadeira), centro = bC.getCenter(new T.Vector3())
    const acertos = new T.Raycaster(new T.Vector3(centro.x, bC.max.y + 1, centro.z), new T.Vector3(0, -1, 0)).intersectObject(cadeira, true)
    const assento = acertos.find((h: any) => h.object.material.name === 'carpet' && h.face.normal.y > .99)?.point.y
    if (assento === undefined) throw Error('assento não encontrado')
    const tecladoZ = canto ? .46 : .34
    const teclado = por('computerKeyboard', .13, tampo, tecladoZ, .95, Math.PI)
    por('computerMouse', .36, tampo, tecladoZ, 1.3, Math.PI)
    // Tela lateral: funcionário e câmera enxergam a face emissiva, não a carcaça.
    por('computerScreen', canto ? -.30 : -.48, tampo, canto ? .57 : .68, 1.3, Math.PI / 2 + .12)
    por('lampSquareTable', canto ? .60 : .49, tampo, canto ? .50 : .77, 1.15)
    por('pottedPlant', -1.3, 0, .92, 1.1)
    por('bookcaseOpen', -1.14, 0, -.29, 1.2)
    // Um colega ocupado em escala de fundo; construído pelo MESMO construtor do protagonista.
    const md = por(variante.mesa, 1.03, base, -.10, canto ? [.65, .85, .5] : .85, Math.PI)
    const mt = caixaReal(md).max.y
    por('chairDesk', 1.03, base, -.40, .85)
    por('computerScreen', .82, mt, .02, .7, Math.PI / 2 + .12)
    por('computerKeyboard', 1.02, mt, -.18, .55, Math.PI)
    const colega = boneco({ camisa: 0x384551, calca: 0x272d35, pele: 0x986e55, cabelo: 0x292725, estilo: 'curto' })
    colega.r.name = 'colega:ocupado'; colega.r.scale.setScalar(.55); colega.r.position.set(1.03, base, -.4)
    colega.hips.position.y = (assento - base) / 1.65 * .85 / .55
    for (const p of [colega.pL, colega.pR]) { p.o.rotation.x = -1.5; p.k.rotation.x = 1.5 }
    for (const a of [colega.bL, colega.bR]) { a.o.rotation.x = -.7; a.e.rotation.x = -1.1 }
    estaticos.add(colega.r)
    if (sala === 'caixa') por('radio', .72, tampo, .17, .85, Math.PI)
    if (sala === 'casa' || sala === 'recepcao') {
      const apoio = por('desk', -1, 0, .35, [.7, .95, .9], Math.PI / 2)
      por('kitchenCoffeeMachine', -1, caixaReal(apoio).max.y, .35, 1.4, Math.PI / 2)
      if (sala === 'recepcao') por('loungeSofa', .88, 0, 1.04, .85, Math.PI)
    }
    if (sala === 'casa' || sala === 'cartoes') {
      const caixa = por('cardboardBoxClosed', -.95, 0, 1.03, 1.1)
      por('cardboardBoxClosed', -.94, caixaReal(caixa).max.y, 1.03, .8)
    }
    if (sala === 'patrimonio') por('bookcaseOpen', -.70, 0, -.32, 1.2)
    if (variante.extras.includes('books')) for (let i = 0; i < 3; i++) por('books', -1.16, .20 + i * .24, -.22, 1.3)
    if (sala === 'apoio') por('cardboardBoxOpen', -.96, 0, .9, 1.4)
    if (sala === 'gestao') {
      const movel = por('cabinetTelevision', .83, 0, 1.03, .8, Math.PI)
      por('computerScreen', .83, caixaReal(movel).max.y, 1.03, 1.4, Math.PI + .2)
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
