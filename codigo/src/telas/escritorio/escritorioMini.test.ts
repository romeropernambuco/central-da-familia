import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// @ts-ignore: APIs de teste do Node.
import { readFileSync, readdirSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
// @ts-ignore: APIs de teste do Node.
import { resolve } from 'node:path'
// @ts-ignore: API de teste do Node.
import { tmpdir } from 'node:os'
// @ts-ignore: Three sem tipos locais.
import * as T from 'three'
// @ts-ignore: Three sem tipos locais.
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { criarCacheModelos, modelosEscritorio } from './modelosEscritorio'
import { VARIANTES, nomesDaSala, bytesDaSala, caixaReal, montarEscritorioMini, composicaoMini, LIMITES_MINI } from './escritorioMini'
import { ATIVIDADES_MINI, PERFIL_IMOVEIS } from './atividadesMini'
import type { SalaEquipe } from './equipe'
import inventario from './inventarioModelos.json'
import { montarCena } from './cena3d'
import { EQUIPE } from './equipe'
import { elencoDaAba, funcionarioAutorizado, PRINCIPAL_POR_ABA } from './elencoPorAba'
import { rotaPermitida, type Rota } from '../../app/rotas'
// @ts-ignore: script JS do build.
import { gravarSw } from '../../../scripts/sw.mjs'

const pasta = resolve('public/modelos/escritorio')
const buffer = (nome: string) => { const b = readFileSync(resolve(pasta, nome + '.glb')); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) }
beforeEach(() => {
  modelosEscritorio.esquecerBytes()
  // Nenhum teste deste arquivo pode acessar rede, nem mesmo por acidente.
  vi.stubGlobal('fetch', vi.fn(async (url: string, o?: { signal?: AbortSignal }) => {
    if (o?.signal?.aborted) throw Error('aborted')
    const nome = url.match(/modelos\/escritorio\/([a-zA-Z0-9]+)\.glb$/)?.[1]
    if (!nome) throw Error('requisição não local')
    return { ok: true, arrayBuffer: async () => buffer(nome) }
  }))
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('carregador local com GLTF falso', () => {
  it('deduplica, compartilha e só libera geometria/material no último usuário', async () => {
    const geo = new T.BoxGeometry(), mat = new T.MeshLambertMaterial(), cena = new T.Group(); cena.add(new T.Mesh(geo, mat))
    const gd = vi.spyOn(geo, 'dispose'), md = vi.spyOn(mat, 'dispose')
    const parse = vi.fn(async () => cena), busca = vi.fn(async (_url: string, _opcoes: { signal: AbortSignal }) => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }))
    const cache = criarCacheModelos(busca, parse, './'), a = new AbortController(), b = new AbortController()
    const x = cache.adquirir(['desk', 'desk'], a.signal), y = cache.adquirir(['desk'], b.signal)
    expect(await x.pronto).toEqual(await y.pronto); expect(busca).toHaveBeenCalledTimes(1); expect(parse).toHaveBeenCalledTimes(1)
    expect(busca.mock.calls[0][0]).toBe('./modelos/escritorio/desk.glb')
    a.abort(); expect(gd).not.toHaveBeenCalled(); expect(cache.tamanho()).toBe(1)
    y.liberar(); y.liberar(); expect(gd).toHaveBeenCalledTimes(1); expect(md).toHaveBeenCalledTimes(1); expect(cache.tamanho()).toBe(0)
    const cancelado = new AbortController(); cancelado.abort()
    expect(await cache.adquirir(['desk'], cancelado.signal).pronto).toBeNull(); expect(busca).toHaveBeenCalledTimes(1)
  })
  it('cancela carga em voo e descarta parse que termina depois do cancelamento', async () => {
    let terminar!: (s: any) => void
    const parse = () => new Promise(r => { terminar = r }), busca = vi.fn(async (_url: string, _opcoes: { signal: AbortSignal }) => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }))
    const cache = criarCacheModelos(busca, parse), ac = new AbortController(), c = cache.adquirir(['chairDesk'], ac.signal)
    await vi.waitFor(() => expect(terminar).toBeDefined())
    ac.abort(); expect(busca.mock.calls[0][1].signal.aborted).toBe(true)
    const geo = new T.BoxGeometry(), mat = new T.MeshLambertMaterial(), modelo = new T.Mesh(geo, mat), gd = vi.spyOn(geo, 'dispose'), md = vi.spyOn(mat, 'dispose')
    terminar(modelo); expect(await c.pronto).toBeNull(); expect(gd).toHaveBeenCalledOnce(); expect(md).toHaveBeenCalledOnce(); expect(cache.tamanho()).toBe(0)
  })
  it.each(['404', 'offline', 'parse'])('falha %s devolve fallback total e permite nova tentativa', async falha => {
    const buscar = vi.fn(async () => { if (falha === 'offline') throw Error('offline'); return { ok: falha !== '404', arrayBuffer: async () => new ArrayBuffer(0) } })
    const cache = criarCacheModelos(buscar, async () => { throw Error('parse') }), ac = new AbortController()
    expect(await cache.adquirir(['desk', 'chairDesk'], ac.signal).pronto).toBeNull(); expect(cache.tamanho()).toBe(0)
    expect(await cache.adquirir(['desk'], ac.signal).pronto).toBeNull(); expect(buscar).toHaveBeenCalledTimes(3)
  })
})

class Elemento extends EventTarget {
  clientWidth = 303; clientHeight = 128; firstChild = null
  insertBefore() {} setAttribute() {} remove() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight } }
}
async function mini(id: string, w = 303, h = 128, falhar = false, esperar = true, reduz = true, ids = [id], sala?: SalaEquipe) {
  const janela = Object.assign(new EventTarget(), { devicePixelRatio: 1, matchMedia: () => Object.assign(new EventTarget(), { matches: reduz }) })
  const documento = Object.assign(new EventTarget(), { hidden: false })
  if (globalThis.IntersectionObserver) Object.assign(janela, { IntersectionObserver: globalThis.IntersectionObserver })
  vi.stubGlobal('window', janela); vi.stubGlobal('document', documento)
  const frames = new Map<number, any>(); let n = 0
  vi.stubGlobal('requestAnimationFrame', vi.fn((f: any) => { frames.set(++n, f); return n }))
  vi.stubGlobal('cancelAnimationFrame', (i: number) => frames.delete(i))
  const el = new Elemento(); el.clientWidth = w; el.clientHeight = h
  const renderer = { domElement: new Elemento(), shadowMap: {}, setPixelRatio() {}, setSize: vi.fn(), dispose: vi.fn(), forceContextLoss() {}, render: vi.fn(), info: { render: { calls: 0, triangles: 0 } } }
  if (falhar) vi.stubGlobal('fetch', vi.fn(async () => { throw Error('offline') }))
  const c = montarCena({ ...T, WebGLRenderer: function () { return renderer } }, el as any, { mini: true, sala, funcionarios: ids.map(id => ({ id, estado: 'trabalhando', sala: EQUIPE.find(e => e.id === id)?.sala || 'patrimonio' })), celular: () => true, escuro: false, parado: reduz, hora: () => 12, etiqueta: () => null, placa: () => null, aoTocar() {} })
  const frame = (tempo: number) => { const fs = [...frames.values()]; frames.clear(); fs.forEach(f => f(tempo)) }
  if (!reduz) frame(100)
  const [scene, camera] = renderer.render.mock.calls[0], agente = scene.getObjectByName('agente:' + id)
  if (!falhar && esperar) await vi.waitFor(() => expect(scene.getObjectByName('escritorio:kenney')).toBeDefined())
  else await new Promise(r => setTimeout(r, 30))
  return { c, scene, camera, agente, renderer, frames, frame, el, janela, documento, escritorio: scene.getObjectByName('escritorio:kenney'), atividade: scene.getObjectByName('atividade:' + id) }
}
function contagem(scene: any) {
  let calls = 0, triangles = 0
  scene.traverseVisible((m: any) => { if (m.isMesh) { calls += Array.isArray(m.material) ? m.material.length : 1; triangles += (m.geometry.index?.count || m.geometry.attributes.position.count) / 3 * (m.isInstancedMesh ? m.count : 1); if (m.castShadow) calls++ } })
  return { calls, triangles }
}

it('integração final: 12 abas x 4 perfis, orçamento real e 20 trocas com descarte completo', async () => {
  // Inclui o perfil integrado: esta regressão falha com o cadastro anterior.
  expect(EQUIPE.find(e => e.id === 'imoveis')!.roupa).toEqual(PERFIL_IMOVEIS.roupa)
  const rotas = Object.keys(PRINCIPAL_POR_ABA) as Rota[]
  expect(rotas).toHaveLength(12)
  const principais = ['anfitriao', 'contador', 'assistente', 'sonhadora', 'cartao', 'guardado', 'tesoureiro', 'fiscal', 'secretaria', 'zelador', 'protetora', 'analista']
  for (const perfil of ['casal', 'pessoa', 'equipe', 'dono'] as const) {
    const papel = perfil === 'dono' ? 'casal' : perfil, ehDono = perfil === 'dono'
    for (let i = 0; i < rotas.length; i++) {
      const rota = rotas[i], efetiva = rotaPermitida(rota, papel, ehDono)
      const elenco = elencoDaAba({ rota: efetiva, papel, ehDono })
      expect(elenco.principal).toBe(efetiva === 'casa' && papel === 'pessoa' ? 'comprador' : efetiva === rota ? principais[i] : efetiva === 'casa' ? 'fiscal' : 'anfitriao')
      const esperado = papel === 'equipe' ? ['fiscal'] : efetiva === 'inicio' ? ['anfitriao', papel === 'casal' ? 'guardado' : 'contador']
        : efetiva === 'guardado' ? ['guardado', 'imoveis'] : efetiva === 'planejamento' ? ['tesoureiro', 'colchao']
        : efetiva === 'casa' && papel === 'pessoa' ? ['comprador'] : [elenco.principal]
      expect([elenco.principal, ...elenco.secundarios]).toEqual(esperado)
      expect(esperado.every(id => funcionarioAutorizado(id, papel, ehDono))).toBe(true)
      const a = await mini(esperado[0], 303, 128, false, true, true, esperado, elenco.sala)
      try {
        expect(esperado.filter(id => a.scene.getObjectByName('agente:' + id))).toEqual(esperado)
        expect(contagem(a.scene).calls).toBeLessThanOrEqual(40)
        expect(contagem(a.scene).triangles).toBeLessThanOrEqual(60000)
        expect(bytesDaSala(elenco.sala)).toBeLessThanOrEqual(150000)
      } finally { a.c.destruir() }
      expect(a.frames.size).toBe(0)
      expect(a.renderer.dispose).toHaveBeenCalledOnce()
    }
  }
  for (let i = 0; i < 20; i++) {
    const elenco = elencoDaAba({ rota: rotas[i % 12], papel: 'casal', ehDono: true })
    const ids = [elenco.principal, ...elenco.secundarios]
    const a = await mini(ids[0], 303, 128, false, true, false, ids, elenco.sala)
    const recursos = new Set<any>()
    a.scene.traverse((m: any) => { if (m.isMesh) { recursos.add(m.geometry); for (const mat of Array.isArray(m.material) ? m.material : [m.material]) recursos.add(mat); if (m.isInstancedMesh) recursos.add(m) } })
    const descartes = [...recursos].map(r => vi.spyOn(r, 'dispose'))
    a.c.destruir(); a.c.destruir()
    descartes.forEach(d => expect(d).toHaveBeenCalledOnce())
    expect(a.renderer.dispose).toHaveBeenCalledOnce()
    expect(a.frames.size).toBe(0)
  }
}, 20000)
function projetar(box: any, camera: any) { return box.clone().applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix) }

/** Raster de cobertura dos triângulos REAIS (sem iluminação, materiais, rede ou GPU).
 * A mesma direção nas sete salas evita confundir câmera diferente com planta diferente. */
function silhueta(raiz: any) {
  raiz = raiz.clone(true); raiz.position.set(0, 0, 0)
  const w = 303, h = 128, pixels = new Uint8Array(w * h)
  const camera = new T.OrthographicCamera(-2.1, 2.1, .887, -.887, .1, 100)
  camera.position.set(10, 3, 16); camera.lookAt(0, .65, .25); camera.updateMatrixWorld(true)
  const vista = new T.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
  const local = new T.Matrix4(), matriz = new T.Matrix4(), ponto = new T.Vector3()
  raiz.updateMatrixWorld(true)
  raiz.traverseVisible((m: any) => {
    if (!m.isMesh) return
    const g = m.geometry, pos = g.attributes.position, n = g.index?.count || pos.count
    for (let instancia = 0; instancia < (m.isInstancedMesh ? m.count : 1); instancia++) {
      local.identity(); if (m.isInstancedMesh) m.getMatrixAt(instancia, local)
      matriz.copy(vista).multiply(m.matrixWorld).multiply(local)
      for (let i = 0; i < n; i += 3) {
        const v = [0, 1, 2].map(j => {
          ponto.fromBufferAttribute(pos, g.index ? g.index.getX(i + j) : i + j).applyMatrix4(matriz)
          return [(ponto.x + 1) * w / 2, (1 - ponto.y) * h / 2]
        })
        const lado = (a: number[], b: number[], x: number, y: number) => (x - a[0]) * (b[1] - a[1]) - (y - a[1]) * (b[0] - a[0])
        for (let y = Math.max(0, Math.floor(Math.min(...v.map(p => p[1])))); y <= Math.min(h - 1, Math.ceil(Math.max(...v.map(p => p[1])))); y++) {
          for (let x = Math.max(0, Math.floor(Math.min(...v.map(p => p[0])))); x <= Math.min(w - 1, Math.ceil(Math.max(...v.map(p => p[0])))); x++) {
            const s = [lado(v[0], v[1], x + .5, y + .5), lado(v[1], v[2], x + .5, y + .5), lado(v[2], v[0], x + .5, y + .5)]
            if (s.every(n => n >= 0) || s.every(n => n <= 0)) pixels[y * w + x] = 1
          }
        }
      }
    }
  })
  return pixels
}

describe('identidades das salas — regressões da frente salas', () => {
  it.each(Object.keys(VARIANTES) as (keyof typeof VARIANTES)[])('%s: tinta real, três modelos exclusivos e assinatura construída', async sala => {
    const a = await mini(EQUIPE.find(e => e.sala === sala)!.id)
    try {
      const v = VARIANTES[sala], d = a.escritorio.userData, pecas = d.pecas
      expect(d.identidade).toEqual(v)
      expect(v.assinatura.length).toBeGreaterThan(20); expect(v.planta.length).toBeGreaterThan(20)
      expect(v.exclusivas.length).toBeGreaterThanOrEqual(3)
      for (const nome of v.exclusivas) {
        expect(pecas[nome]?.length, nome).toBeGreaterThan(0)
        for (const outra of Object.keys(VARIANTES) as (keyof typeof VARIANTES)[]) if (outra !== sala) expect(nomesDaSala(outra), nome).not.toContain(nome)
      }
      const piso = pecas.floorFull[0]
      for (const [nome, caixas] of Object.entries(pecas) as [string, any[]][]) {
        if (nome.startsWith('wall') || nome === 'doorway' || nome === 'floorFull') continue
        for (const b of caixas) {
          expect(b.min.x, nome).toBeGreaterThanOrEqual(piso.min.x - .00001)
          expect(b.max.x, nome).toBeLessThanOrEqual(piso.max.x + .00001)
          expect(b.min.z, nome).toBeGreaterThanOrEqual(piso.min.z - .00001)
          expect(b.max.z, nome).toBeLessThanOrEqual(piso.max.z + .00001)
        }
      }
      const rgb = (n: number) => [n >> 16, n >> 8 & 255, n & 255]
      for (const outra of Object.keys(VARIANTES) as (keyof typeof VARIANTES)[]) if (outra !== sala) {
        const distancia = (k: 'parede' | 'piso') => Math.hypot(...rgb(v.paleta[k]).map((c, i) => c - rgb(VARIANTES[outra].paleta[k])[i]))
        expect(distancia('parede'), sala + '/' + outra).toBeGreaterThanOrEqual(60)
        expect(distancia('piso')).toBeGreaterThanOrEqual(25)
        expect(v.paleta.tapete).not.toBe(VARIANTES[outra].paleta.tapete)
      }
      // A declaração sozinha não basta: as três tintas devem chegar aos buffers desenhados.
      const contadores = [0, 0, 0], cores = Object.values(v.paleta).map(n => new T.Color(n))
      a.escritorio.traverseVisible((m: any) => {
        const c = m.geometry?.attributes.color
        if (!c) return
        for (let i = 0; i < c.count; i++) cores.forEach((cor, k) => {
          if (Math.hypot(c.getX(i) - cor.r, c.getY(i) - cor.g, c.getZ(i) - cor.b) < .00001) contadores[k]++
        })
        expect(m.material?.map).toBeFalsy(); expect(m.castShadow).toBe(false)
      })
      expect(contadores.every(n => n >= 36)).toBe(true)
      expect(pecas[v.tapete]).toHaveLength(1)
      if (sala === 'casa') {
        expect(pecas.plantSmall1).toHaveLength(3)
        pecas.plantSmall1.forEach((b: any) => expect(b.min.y).toBeCloseTo(pecas.bookcaseClosedWide[0].max.y, 6))
      }
      if (sala === 'cartoes') {
        expect(pecas.cardboardBoxClosed).toHaveLength(3)
        for (let i = 1; i < 3; i++) expect(pecas.cardboardBoxClosed[i].min.y).toBeCloseTo(pecas.cardboardBoxClosed[i - 1].max.y, 6)
      }
      if (sala === 'caixa') expect(pecas.radio[0].min.y).toBeCloseTo(d.tampo, 6)
      if (sala === 'patrimonio') { expect(pecas.bookcaseOpen).toHaveLength(2); expect(pecas.books).toHaveLength(4) }
      if (sala === 'recepcao') expect(pecas.pottedPlant[0].max.y).toBeGreaterThan(pecas.loungeSofa[0].max.y * 1.5)
      if (sala === 'gestao') { expect(pecas.chairCushion).toHaveLength(2); expect(pecas.computerScreen[2].min.y).toBeCloseTo(pecas.cabinetTelevision[0].max.y, 6) }
      if (sala === 'apoio') expect(pecas.laptop[0].min.y).toBeCloseTo(pecas.table[0].max.y, 6)
      expect(contagem(a.scene).calls).toBeLessThanOrEqual(40)
      expect(contagem(a.scene).triangles).toBeLessThanOrEqual(60000)
      expect(bytesDaSala(sala)).toBeLessThanOrEqual(150000)
    } finally { a.c.destruir() }
  })

  it('as 21 duplas diferem em pelo menos 4% da silhueta monocromática a 303×128', async () => {
    const imagens: { sala: string; pixels: Uint8Array }[] = []
    for (const sala of Object.keys(VARIANTES)) {
      const a = await mini(EQUIPE.find(e => e.sala === sala)!.id)
      try { imagens.push({ sala, pixels: silhueta(a.escritorio) }) } finally { a.c.destruir() }
    }
    for (let i = 0; i < imagens.length; i++) for (let j = i + 1; j < imagens.length; j++) {
      let diferentes = 0, uniao = 0
      imagens[i].pixels.forEach((v, k) => { const b = imagens[j].pixels[k]; if (v || b) uniao++; if (v !== b) diferentes++ })
      console.log('SILHUETA', imagens[i].sala, imagens[j].sala, diferentes / uniao)
      expect(diferentes / uniao, imagens[i].sala + '/' + imagens[j].sala).toBeGreaterThanOrEqual(.04)
    }
  })

  it.each(EQUIPE.map(e => e.id))('%s: escala medida de cabeça/monitor, contatos e projeções nos três tamanhos', async id => {
    const a = await mini(id)
    try {
      const d = a.escritorio.userData, hips = a.agente.children[0], head = hips.children.find((g: any) => g.position.y === .5)
      expect(a.agente.scale.toArray()).toEqual([.92, .92, .92])
      const alturaMesaGLB = inventario.desk.max[1] - inventario.desk.min[1]
      expect(d.tampo - .011).toBeCloseTo(alturaMesaGLB * 1.815, 6)
      const monitor = d.pecas.computerScreen[0], alturaMonitor = monitor.max.y - monitor.min.y
      expect(alturaMonitor).toBeCloseTo((inventario.computerScreen.max[1] - inventario.computerScreen.min[1]) * 1.43, 6)
      // Centro da cabeça acima do tampo, em alturas do monitor GLB completo (base inclusa).
      const centro = caixaReal(head).getCenter(new T.Vector3()).sub(a.escritorio.position)
      const proporcao = (centro.y - d.tampo) / alturaMonitor
      console.log('ESCALA', id, proporcao)
      expect(proporcao).toBeGreaterThanOrEqual(1.10); expect(proporcao).toBeLessThanOrEqual(1.50)
      for (const [w, h] of [[303, 128], [303, 180], [560, 180]]) {
        a.el.clientWidth = w; a.el.clientHeight = h; a.janela.dispatchEvent(new Event('resize'))
        const p = projetar(caixaReal(a.agente), a.camera), ph = projetar(caixaReal(head), a.camera)
        expect((p.max.y - p.min.y) / 2).toBeGreaterThanOrEqual(.55)
        expect((p.max.y - p.min.y) / 2).toBeLessThanOrEqual(.70)
        expect(Math.max(Math.abs(ph.min.x), Math.abs(ph.max.x), Math.abs(ph.min.y), Math.abs(ph.max.y))).toBeLessThanOrEqual(.9)
        for (const estado of ['trabalhando', 'chamando', 'resolvido', 'parado'] as const) {
          a.c.definirEstado(id, estado)
          for (const objeto of [a.agente, a.atividade, a.escritorio]) {
            const b = projetar(caixaReal(objeto), a.camera)
            expect(Math.max(Math.abs(b.min.x), Math.abs(b.max.x), Math.abs(b.min.y), Math.abs(b.max.y))).toBeLessThanOrEqual(.9)
          }
        }
        a.c.definirEstado(id, 'trabalhando')
      }
    } finally { a.c.destruir() }
  })

  it('tintas simultâneas preservam o GLB do cache; bases dos acessórios encontram o tampo real', async () => {
    const salas = Object.keys(VARIANTES) as (keyof typeof VARIANTES)[]
    const nomes = [...new Set(salas.flatMap(nomesDaSala))], modelos: Record<string, any> = {}
    for (const nome of nomes) modelos[nome] = (await new GLTFLoader().parseAsync(buffer(nome), '')).scene
    const originais: { material: any; cor: number }[] = []
    Object.values(modelos).forEach(m => m.traverse((n: any) => { if (n.isMesh) originais.push({ material: n.material, cor: n.material.color.getHex() }) }))
    const montagens: ReturnType<typeof montarEscritorioMini>[] = []
    try {
      for (const sala of salas) {
        const a = montarEscritorioMini(sala, modelos, 0x123456, () => { throw Error('colega universal removido') }); montagens.push(a)
        const mesa = a.pecas[VARIANTES[sala].mesa][0]; mesa.updateMatrixWorld(true)
        for (const nome of ['computerScreen', 'computerKeyboard', 'computerMouse', 'lampSquareTable', 'lampRoundTable', 'radio', 'plantSmall2']) for (const g of a.pecas[nome] || []) {
          if (Math.abs(g.position.y - a.tampo) > .00001) continue // TV tem aparador próprio.
          const raio = new T.Raycaster(new T.Vector3(g.position.x, a.tampo + .01, g.position.z), new T.Vector3(0, -1, 0))
          const contato = raio.intersectObject(mesa, true)[0]
          expect(contato, sala + '/' + nome).toBeDefined()
          expect(contato.point.y).toBeCloseTo(a.tampo, 6)
        }
      }
      expect(new Set(montagens.map(a => a.raiz.userData.identidade.paleta.parede)).size).toBe(7)
      originais.forEach(({ material, cor }) => expect(material.color.getHex()).toBe(cor))
    } finally {
      montagens.forEach(a => a.destruir())
      const recursos = new Set<any>()
      Object.values(modelos).forEach(m => m.traverse((n: any) => { if (n.isMesh) { recursos.add(n.geometry); recursos.add(n.material) } }))
      recursos.forEach(r => r.dispose())
    }
  })
})

describe('escritório real no mini (renderer simulado, GLBs locais reais)', () => {
  it.each(Object.keys(VARIANTES))('%s compõe peças, mede tampo/assento e respeita orçamento', async sala => {
    const e = EQUIPE.find(e => e.sala === sala)!, a = await mini(e.id)
    try {
      const d = a.escritorio.userData, medidas = d.pecas
      for (const nome of nomesDaSala(e.sala)) expect(medidas[nome]?.length, nome).toBeGreaterThan(0)
      const piso = medidas.floorFull[0]
      for (const nome of ['chairDesk', VARIANTES[e.sala].mesa, 'bookcaseOpen', 'pottedPlant', 'loungeSofa']) for (const p of medidas[nome] || []) {
        expect(p.min.x).toBeGreaterThanOrEqual(piso.min.x); expect(p.max.x).toBeLessThanOrEqual(piso.max.x)
        expect(p.min.z).toBeGreaterThanOrEqual(piso.min.z); expect(p.max.z).toBeLessThanOrEqual(piso.max.z)
      }
      expect(medidas.computerScreen.length).toBeGreaterThanOrEqual(2)
      expect(d.tampo).toBeCloseTo(medidas[VARIANTES[e.sala].mesa][0].max.y, 6)
      expect(a.agente.children[0].position.y * a.agente.scale.y - d.assento).toBeCloseTo((.26 * Math.cos(1.5) + .1 * Math.sin(1.5)) * a.agente.scale.y, 5)
      const perna = a.agente.children[0].children.find((g: any) => g.position.x === -.12)
      const coxa = perna.children.find((g: any) => g.isMesh)
      expect(caixaReal(coxa).min.y).toBeCloseTo(d.assento, 5)
      expect(caixaReal(perna).min.y).toBeCloseTo(.011, 4)
      expect(a.agente.children[0].children.find((g: any) => g.position.x === -.12).rotation.x).toBeCloseTo(-1.5)
      const atividade = caixaReal(a.atividade)
      expect(atividade.min.y).toBeCloseTo(d.tampo, 5)
      const medido = contagem(a.scene)
      expect(medido.calls).toBeLessThanOrEqual(40); expect(medido.triangles).toBeLessThanOrEqual(60000)
      expect(bytesDaSala(e.sala)).toBeLessThanOrEqual(150000)
      expect(a.frames.size).toBe(0)
      const telas: any[] = []; a.escritorio.traverse((m: any) => { if (m.isMesh && m.material.emissive?.getHex() === e.roupa.camisa) telas.push(m) })
      expect(telas.some(m => m.material.emissiveIntensity > 0)).toBe(true)
      console.log('SALA', sala, JSON.stringify({ ...medido, bytes: d.bytes, tampo: d.tampo, assento: d.assento }))
    } finally { a.c.destruir() }
  })
  it.each(EQUIPE.map(e => e.id))('%s: câmera real, 3 proporções, resize e quatro estados', async id => {
    const a = await mini(id)
    try {
      const dados: any[] = [], custos: any[] = []
      for (const [w, h] of [[303, 128], [303, 180], [560, 180]]) {
        a.el.clientWidth = w; a.el.clientHeight = h; a.janela.dispatchEvent(new Event('resize'))
        for (const estado of ['trabalhando', 'chamando', 'resolvido', 'parado'] as const) {
          a.c.definirEstado(id, estado)
          a.scene.updateMatrixWorld(true); a.camera.updateMatrixWorld(true)
          const custo = contagem(a.scene); custos.push(custo)
          expect(custo.calls).toBeLessThanOrEqual(40); expect(custo.triangles).toBeLessThanOrEqual(60000)
          for (const objeto of [a.agente, a.atividade, a.escritorio]) {
            const p = projetar(caixaReal(objeto), a.camera)
            expect(Math.max(Math.abs(p.min.x), Math.abs(p.max.x)), id + estado + ' x').toBeLessThanOrEqual(.901)
            expect(Math.max(Math.abs(p.min.y), Math.abs(p.max.y)), id + estado + ' y').toBeLessThanOrEqual(.901)
          }
          if (estado === 'trabalhando') {
            const p = projetar(caixaReal(a.agente), a.camera), altura = (p.max.y - p.min.y) / 2
            dados.push([w, h, +(altura * 100).toFixed(2)])
            expect(altura, id + ' altura').toBeGreaterThanOrEqual(.55); expect(altura).toBeLessThanOrEqual(.70)
            const quadril = a.agente.children[0], esquerdo = quadril.children.find((g: any) => g.position.x === -.3), direito = quadril.children.find((g: any) => g.position.x === .3)
            const y = a.escritorio.userData.tampo + inventario.computerKeyboard.max[1] * .95
            for (const [braco, x] of [[esquerdo, -.08], [direito, .31]]) {
              const antebraco = braco.children.find((g: any) => g.isGroup)
              const mao = antebraco.localToWorld(new T.Vector3(0, id === 'imoveis' && x > 0 ? -.325 : -.26, 0))
              const alvo = id === 'imoveis' ? a.atividade.localToWorld(a.atividade.userData.maos[x < 0 ? 'esquerda' : 'direita'].clone()) : new T.Vector3(x, y, a.escritorio.userData.pecas.computerKeyboard[0].getCenter(new T.Vector3()).z).add(a.escritorio.position)
              expect(mao.distanceTo(alvo)).toBeLessThan(.025)
            }
            expect(caixaReal(a.atividade).min.y).toBeCloseTo(a.escritorio.userData.tampo, 5)
          }
        }
      }
      expect(a.frames.size).toBe(0); console.log('CAMERA', id, JSON.stringify(dados))
      console.log('CUSTO_ID', id, JSON.stringify({ calls: Math.max(...custos.map(c => c.calls)), triangles: Math.max(...custos.map(c => c.triangles)) }))
    } finally { a.c.destruir() }
  })
  it('falha local conserva caixas, personagem, atividade e API sem tela vazia', async () => {
    const a = await mini('contador', 303, 128, true)
    expect(fetch).toHaveBeenCalled()
    expect(a.escritorio).toBeUndefined(); expect(contagem(a.scene).triangles).toBeGreaterThan(0)
    a.c.definirEstado('contador', 'chamando'); expect(a.agente.userData.estado).toBe('chamando')
    a.c.destruir()
  })
  it('desmontagem cancela a carga sem aplicar objetos tardios', async () => {
    let terminar!: (v: any) => void
    vi.stubGlobal('fetch', vi.fn((_url: string, { signal }: { signal: AbortSignal }) => new Promise((r, rejeitar) => {
      terminar = r; signal.addEventListener('abort', () => rejeitar(Error('aborted')), { once: true })
    })))
    const a = await mini('contador', 303, 128, false, false)
    await vi.waitFor(() => expect(terminar).toBeDefined())
    const chamadas = (fetch as any).mock.calls
    a.c.destruir(); a.c.destruir()
    expect(chamadas.every((c: any) => c[1].signal.aborted)).toBe(true)
    terminar({ ok: true, arrayBuffer: async () => buffer('desk') })
    await new Promise(r => setTimeout(r, 10))
    expect(a.renderer.dispose).toHaveBeenCalledOnce(); expect(a.frames.size).toBe(0)
    expect(a.scene.getObjectByName('escritorio:kenney')).toBeUndefined()
  })
  it('destruir libera todos os recursos renderizáveis exatamente uma vez', async () => {
    const a = await mini('guardado'), recursos = new Set<any>()
    a.scene.traverse((m: any) => { if (m.geometry) recursos.add(m.geometry); if (m.material) for (const mat of [m.material].flat()) recursos.add(mat); if (m.isInstancedMesh) recursos.add(m) })
    const spies = [...recursos].map(r => vi.spyOn(r, 'dispose'))
    a.c.destruir(); a.c.destruir(); spies.forEach(s => expect(s).toHaveBeenCalledOnce())
  })
  it('escritório carregado congela microvida/brilho abaixo de 24 fps e pausa oculto/fora da tela', async () => {
    let visibilidade!: (en: { isIntersecting: boolean }[]) => void
    class Observador { constructor(fn: typeof visibilidade) { visibilidade = fn } observe() {} disconnect() {} }
    vi.stubGlobal('IntersectionObserver', Observador)
    const a = await mini('contador', 303, 128, false, true, false)
    try {
      for (let t = 200; t <= 9500; t += 100) a.frame(t)
      expect(a.c.medir().degrau).toBeGreaterThan(0)
      const head = a.agente.children[0].children.find((g: any) => g.position.y === .5), cabelo = head.children.find((g: any) => g.position.y === .4)
      const tela = a.escritorio.children.find((g: any) => g.material?.emissive?.getHex() === EQUIPE[0].roupa.camisa)
      const antes = [cabelo.rotation.z, tela.material.emissiveIntensity]
      for (let t = 9600; t <= 11000; t += 100) a.frame(t)
      expect([cabelo.rotation.z, tela.material.emissiveIntensity]).toEqual(antes)
      a.documento.hidden = true; a.documento.dispatchEvent(new Event('visibilitychange')); expect(a.frames.size).toBe(0)
      a.documento.hidden = false; a.documento.dispatchEvent(new Event('visibilitychange')); expect(a.frames.size).toBe(1)
      visibilidade([{ isIntersecting: false }]); expect(a.frames.size).toBe(0)
      visibilidade([{ isIntersecting: true }]); expect(a.frames.size).toBe(1)
      expect(a.renderer.render.mock.calls.every(([s, c]) => s === a.scene && c === a.camera)).toBe(true)
    } finally { a.c.destruir() }
  })
})

it('inventário dos 41 GLBs confere JSON, hierarquia, materiais, escala, origem e vértices reais', async () => {
  expect(Object.keys(inventario).length).toBe(41)
  expect(readdirSync(pasta).filter((s: string) => s.endsWith('.glb')).length).toBe(41)
  for (const [nome, esperado] of Object.entries(inventario)) {
    const b = buffer(nome), j = JSON.parse(new TextDecoder().decode(new Uint8Array(b, 20, new DataView(b).getUint32(12, true))))
    expect(b.byteLength).toBe(esperado.bytes); expect(j.nodes).toEqual(esperado.nodes); expect(j.images).toBeUndefined(); expect(j.textures).toBeUndefined()
    expect(j.materials.map((m: any) => ({ name: m.name, ...m.pbrMetallicRoughness, alphaMode: m.alphaMode }))).toEqual(esperado.materials)
    const cena = (await new GLTFLoader().parseAsync(b, '')).scene, caixa = caixaReal(cena)
    caixa.min.toArray().forEach((n: number, i: number) => expect(n).toBeCloseTo(esperado.min[i], 6))
    caixa.max.toArray().forEach((n: number, i: number) => expect(n).toBeCloseTo(esperado.max[i], 6))
    expect(contagem(cena).triangles).toBe(esperado.triangles)
    const recursos = new Set<any>(); cena.traverse((m: any) => { if (m.isMesh) { recursos.add(m.geometry); recursos.add(m.material) } }); recursos.forEach(r => r.dispose())
  }
})
it('usa apenas assets locais licenciados e exclui GLBs do precache', () => {
  for (const sala of Object.keys(VARIANTES) as (keyof typeof VARIANTES)[]) for (const nome of nomesDaSala(sala)) expect(existsSync(resolve(pasta, nome + '.glb'))).toBe(true)
  for (const nome of ['LICENSE-Kenney-CC0.txt', 'CREDITOS.md']) expect(readFileSync(resolve(pasta, nome), 'utf8').length).toBeGreaterThan(100)
  const carregador = readFileSync(resolve('src/telas/escritorio/modelosEscritorio.ts'), 'utf8')
  expect(carregador).not.toMatch(/https?:\/\//); expect(carregador).toContain('import.meta.env.BASE_URL')
  expect(carregador).toContain("three/examples/jsm/loaders/GLTFLoader.js")
  expect(gravarSw.toString()).toContain('modelos\\/escritorio')
})

it('SW gerado guarda GLB sob demanda, serve offline e muda versão quando o GLB muda', async () => {
  const temporario = mkdtempSync(resolve(tmpdir(), 'mini-sw-'))
  try {
    mkdirSync(resolve(temporario, 'modelos/escritorio'), { recursive: true }); mkdirSync(resolve(temporario, 'assets'))
    writeFileSync(resolve(temporario, 'index.html'), 'casca')
    writeFileSync(resolve(temporario, 'assets/modelosEscritorio-teste.js'), 'loader tardio')
    const arquivo = resolve(temporario, 'modelos/escritorio/desk.glb'); writeFileSync(arquivo, 'modelo v1')
    const v1 = gravarSw(temporario, resolve('src/sw.modelo.js')).versao
    const fonte = readFileSync(resolve(temporario, 'sw.js'), 'utf8')
    expect(fonte.match(/const ARQUIVOS = (.+)/)?.[1]).not.toContain('desk.glb')
    expect(fonte.match(/const ARQUIVOS = (.+)/)?.[1]).not.toContain('modelosEscritorio-teste.js')
    const dados = new Map<string, any>(), ouvintes: Record<string, any> = {}, raiz = 'http://localhost/app/'
    let offline = false, chamadas = 0
    const resposta = () => ({ ok: true, type: 'basic', clone: resposta, corpo: 'GLB local' })
    const rede = async () => { chamadas++; if (offline) throw Error('offline'); return resposta() }
    const caches = { open: async () => ({ addAll: async () => {}, put: async (req: any, r: any) => { dados.set(req.url, r) } }), match: async (req: any) => dados.get(req.url) }
    const self = { location: { href: raiz + 'sw.js' }, addEventListener: (nome: string, fn: any) => { ouvintes[nome] = fn } }
    new Function('self', 'caches', 'fetch', 'URL', fonte)(self, caches, rede, URL)
    const requisitar = () => { let p!: Promise<any>; ouvintes.fetch({ request: { method: 'GET', mode: 'same-origin', url: raiz + 'modelos/escritorio/desk.glb' }, respondWith: (r: Promise<any>) => { p = r } }); return p }
    expect((await requisitar()).corpo).toBe('GLB local'); offline = true
    expect((await requisitar()).corpo).toBe('GLB local'); expect(chamadas).toBe(1)
    writeFileSync(arquivo, 'modelo v2'); expect(gravarSw(temporario, resolve('src/sw.modelo.js')).versao).not.toBe(v1)
  } finally { rmSync(temporario, { recursive: true }) }
})

// Medição coletiva usa o renderer simulado e os GLBs reais, sem rede.
describe('sala compartilhada', () => {
  it.each(Object.keys(VARIANTES) as SalaEquipe[])('%s: custos coletivos', async sala => {
    const a = await mini('contador',303,128,false,true,true,['contador','colchao'],sala)
    try {
      console.log('COLETIVO', sala, JSON.stringify(contagem(a.scene)),JSON.stringify(contagem(a.escritorio)))
      for (const [w,h] of [[303,128],[303,180],[560,180]]) {
        a.el.clientWidth=w; a.el.clientHeight=h; a.janela.dispatchEvent(new Event('resize'))
        const p=projetar(caixaReal(a.agente),a.camera)
        console.log('ALTURA_COLETIVO',sala,w,h,(p.max.y-p.min.y)/2)
        expect((p.max.y-p.min.y)/2).toBeGreaterThanOrEqual(.5)
        expect((p.max.y-p.min.y)/2).toBeLessThanOrEqual(.75)
      }
      expect(a.scene.getObjectByName('agente:colchao')).toBeDefined()
      expect(contagem(a.scene).calls).toBeLessThanOrEqual(40)
    } finally { a.c.destruir() }
  })
})

const salasMini = Object.keys(VARIANTES) as SalaEquipe[]
describe('contrato do compositor compartilhado', () => {
  it.each(salasMini.flatMap(sala => [1,2,3].map(n => ({ sala, n }))))('$sala N=$n: postos, peças e previsão pura', async ({ sala, n }) => {
    const ids = Object.freeze(['anfitriao','sonhadora','presenca'].slice(0,n))
    const c = composicaoMini(sala, ids)
    expect(composicaoMini(sala, ids)).toEqual(c)
    expect(c.ids[0]).toBe(ids[0]); expect(c.ids.length).toBeGreaterThan(0)
    expect(c.orcamento.desenhos).toBeLessThanOrEqual(40)
    expect(c.orcamento.triangulos).toBeLessThanOrEqual(60000)
    expect(c.orcamento.KB).toBe(bytesDaSala(sala)/1000)
    for (const nome of [VARIANTES[sala].mesa, 'chairDesk','computerScreen','computerKeyboard',...VARIANTES[sala].exclusivas]) expect(c.pecas).toContain(nome)
    c.postos.forEach((p,i) => c.postos.slice(i+1).forEach(q => {
      expect([0,2].some(k => p.volume.max[k] <= q.volume.min[k] || q.volume.max[k] <= p.volume.min[k])).toBe(true)
    }))
    const a = await mini(ids[0],303,128,false,true,true,[...ids],sala)
    try {
      expect(a.escritorio.userData.postos).toHaveLength(c.ids.length)
      expect(a.escritorio.userData.pecas.chairDesk).toHaveLength(c.ids.length)
      expect(a.escritorio.userData.pecas.computerKeyboard).toHaveLength(c.ids.length)
      const volumes=c.ids.map((_,i)=>new T.Box3().union(a.escritorio.userData.pecas[VARIANTES[sala].mesa][i]).union(a.escritorio.userData.pecas.chairDesk[i]).union(a.escritorio.userData.pecas.computerKeyboard[i]))
      volumes.forEach((v:any,i)=>volumes.slice(i+1).forEach((outro:any)=>expect(v.intersectsBox(outro)).toBe(false)))
      for(const nome of VARIANTES[sala].exclusivas) expect(a.escritorio.userData.pecas[nome].length).toBeGreaterThan(0)
      const custos=[]
      for(const estado of ['trabalhando','chamando','resolvido','parado'] as const) {
        c.ids.forEach(id=>a.c.definirEstado(id,estado)); custos.push(contagem(a.scene))
      }
      expect(Math.max(...custos.map(x=>x.calls))).toBeLessThanOrEqual(c.orcamento.desenhos)
      expect(Math.max(...custos.map(x=>x.triangles))).toBeLessThanOrEqual(c.orcamento.triangulos)
      console.log('ORCAMENTO_N',sala,n,c.ids.length,JSON.stringify(custos.reduce((m,x)=>({ calls:Math.max(m.calls,x.calls),triangles:Math.max(m.triangles,x.triangles) }),{calls:0,triangles:0})))
    } finally {a.c.destruir()}
  })
  it('remove o último secundário por cada limite; uma dupla normal não degrada', () => {
    const ids=['anfitriao','sonhadora','presenca']
    expect(composicaoMini('caixa',ids).ids).toEqual(ids)
    for(const limites of [{...LIMITES_MINI,desenhos:27},{...LIMITES_MINI,triangulos:3000},{...LIMITES_MINI,KB:100}]) {
      const c=composicaoMini('caixa',ids,limites)
      expect(c.ids).toEqual(['anfitriao']); expect(c.removidos).toEqual(['sonhadora','presenca'])
    }
    const c=composicaoMini('casa',['fiscal','analista','usina'])
    expect(c.ids).toEqual(['fiscal','analista']); expect(c.removidos).toEqual(['usina'])
    expect(composicaoMini('patrimonio',['guardado','imoveis']).removidos).toEqual([])
  })
})

// Todas as possibilidades autorizadas de secundário contextual, incluindo sala sobreposta da Casa.
const elencosMini: { sala: SalaEquipe; ids: string[] }[] = [
  ...[...new Set([...Object.keys(ATIVIDADES_MINI),'imoveis'])].filter(id=>id!=='anfitriao').map(id=>({sala:'gestao' as const,ids:['anfitriao',id]})),
  ...['comprador','folha','presenca','auditor'].map(id=>({sala:'casa' as const,ids:['fiscal',id]})),
  {sala:'patrimonio',ids:['guardado','imoveis']}, {sala:'caixa',ids:['tesoureiro','colchao']},
  {sala:'gestao',ids:['anfitriao','sonhadora','presenca']},
]
describe('câmera e contato do elenco', () => {
  it.each(elencosMini)('$sala $ids: três proporções, estados e contato por posto', async ({sala,ids}) => {
    const a=await mini(ids[0],303,128,false,true,true,ids,sala)
    try {
      const renderer=a.renderer, camera=a.camera, principal=a.agente, posicionados=ids.map(id=>a.scene.getObjectByName('agente:'+id))
      const inicio=principal.position.clone()
      const alturas:number[]=[], custos:{ calls:number;triangles:number }[]=[]
      for(const [w,h] of [[303,128],[303,180],[560,180]]) {
        a.el.clientWidth=w; a.el.clientHeight=h; a.janela.dispatchEvent(new Event('resize'))
        const p=projetar(caixaReal(principal),camera),altura=(p.max.y-p.min.y)/2
        alturas.push(altura)
        expect(altura).toBeGreaterThanOrEqual(.5); expect(altura).toBeLessThanOrEqual(.75)
        for(const estado of ['trabalhando','chamando','resolvido','parado'] as const) {
          ids.forEach(id=>a.c.definirEstado(id,estado))
          for(const id of ids) for(const objeto of [a.scene.getObjectByName('agente:'+id),a.scene.getObjectByName('atividade:'+id),a.escritorio]) {
            const p=projetar(caixaReal(objeto),camera)
            expect(Math.max(Math.abs(p.min.x),Math.abs(p.max.x),Math.abs(p.min.y),Math.abs(p.max.y)),id+estado).toBeLessThanOrEqual(.901)
          }
          expect(contagem(a.scene).calls).toBeLessThanOrEqual(composicaoMini(sala,ids).orcamento.desenhos)
          custos.push(contagem(a.scene))
        }
        ids.forEach(id=>a.c.definirEstado(id,'trabalhando'))
        const cabecas=posicionados.map(b=>projetar(caixaReal(b.children[0].children.find((g:any)=>g.position.y===.5)),camera))
        cabecas.forEach((b:any,i)=>cabecas.slice(i+1).forEach((c:any)=>expect(b.max.x<c.min.x || c.max.x<b.min.x).toBe(true)))
      }
      ids.forEach((id,i)=>{
        const b=posicionados[i], quadril=b.children[0], escala=composicaoMini(sala,ids).postos[i].escala
        const atividade=a.scene.getObjectByName('atividade:'+id), dados=a.escritorio.userData.postos[i]
        for(const [lado,x] of [[-.3,-.08],[.3,.31]]) {
          const braco=quadril.children.find((g:any)=>g.position.x===lado), antebraco=braco.children.find((g:any)=>g.isGroup)
          const mao=antebraco.localToWorld(new T.Vector3(0,id==='imoveis' && lado>0 ? -.325 : -.26,0))
          const alvo=id==='imoveis' ? atividade.localToWorld(atividade.userData.maos[lado<0?'esquerda':'direita'].clone()) : new T.Vector3(x*escala,dados.teclado.y*escala,dados.teclado.z*escala).add(atividade.parent.position)
          expect(mao.distanceTo(alvo),id+lado).toBeLessThan(.025)
        }
      })
      a.c.definirEstado(ids[1],'chamando')
      expect(principal.position.toArray()).toEqual(inicio.toArray()); expect(principal.userData.estado).toBe('trabalhando')
      a.c.definirEstado(ids[1],'resolvido')
      expect(a.scene.getObjectByName('joinha:'+ids[1]).visible).toBe(true)
      expect(a.scene.getObjectByName('joinha:'+ids[0]).visible).toBe(false)
      expect(a.renderer).toBe(renderer); expect(a.renderer.render.mock.calls.every(([s,c])=>s===a.scene && c===camera)).toBe(true)
      expect(a.frames.size).toBe(0)
      console.log('ELENCO_MEDIDO',sala,JSON.stringify(ids),JSON.stringify({desenhos:Math.max(...custos.map(c=>c.calls)),triangulos:Math.max(...custos.map(c=>c.triangles)),alturas}))
      const recursos=new Set<any>(); a.scene.traverse((m:any)=>{if(m.geometry)recursos.add(m.geometry); if(m.material)recursos.add(m.material); if(m.isInstancedMesh)recursos.add(m)})
      const spies=[...recursos].map(r=>vi.spyOn(r,'dispose'))
      a.c.destruir(); a.c.destruir(); spies.forEach(s=>expect(s).toHaveBeenCalledOnce())
    } finally {a.c.destruir()}
  })
})

describe('ciclo coletivo e regressão unitária', () => {
  it.each(salasMini)('%s: N=1 mantém peças, custo e projeção com sala explícita', async sala => {
    const id=EQUIPE.find(e=>e.sala===sala)!.id, a=await mini(id)
    const b=await mini(id,303,128,false,true,true,[id],sala)
    try {
      expect(b.escritorio.userData.pecas).toEqual(a.escritorio.userData.pecas)
      expect(b.escritorio.userData.bytes).toBe(a.escritorio.userData.bytes)
      expect(contagem(b.scene)).toEqual(contagem(a.scene))
      expect(b.camera.projectionMatrix.elements).toEqual(a.camera.projectionMatrix.elements)
      expect(b.camera.matrixWorld.elements).toEqual(a.camera.matrixWorld.elements)
      const legado:Record<string,[number,number,number]>={contador:[.6454,25,2449],folha:[.6482,28,3127],cartao:[.6312,25,2655],guardado:[.6600,26,3557],secretaria:[.6703,24,2437],anfitriao:[.6698,25,2501],zelador:[.6526,24,2265]}
      const p=projetar(caixaReal(a.agente),a.camera)
      expect((p.max.y-p.min.y)/2).toBeCloseTo(legado[id][0],3)
      a.c.definirEstado(id,'chamando'); expect(contagem(a.scene)).toEqual({calls:legado[id][1],triangles:legado[id][2]})
      expect(composicaoMini(sala,[id]).postos).toHaveLength(1)
    } finally {a.c.destruir();b.c.destruir()}
  })
  it('Imóveis expõe metadados, câmera e pasta articulada com contatos durante todo o ciclo', async () => {
    expect(PERFIL_IMOVEIS.id).toBe('imoveis'); expect(PERFIL_IMOVEIS.sala).toBe('patrimonio')
    expect(ATIVIDADES_MINI.imoveis.camera.direcao).toHaveLength(3)
    const a=await mini('guardado',303,128,false,true,false,['guardado','imoveis'],'patrimonio')
    try {
      const atividade=a.scene.getObjectByName('atividade:imoveis'), agente=a.scene.getObjectByName('agente:imoveis')
      const alvos:any[]=[], posicoes:any[]=[]
      for(let t=150;t<=18000;t+=50) {
        a.frame(t); alvos.push(atividade.userData.maos.direita.toArray()); posicoes.push(atividade.children.filter((g:any)=>g.isGroup).map((g:any)=>g.rotation.z))
        for(const [lado,chave] of [[-.3,'esquerda'],[.3,'direita']] as const) {
          const braco=agente.children[0].children.find((g:any)=>g.position.x===lado), antebraco=braco.children.find((g:any)=>g.isGroup)
          const mao=antebraco.localToWorld(new T.Vector3(0,lado>0 ? -.325 : -.26,0)), alvo=atividade.localToWorld(atividade.userData.maos[chave].clone())
          expect(mao.distanceTo(alvo)).toBeLessThan(.025)
        }
      }
      expect(new Set(alvos.map(v=>JSON.stringify(v))).size).toBeGreaterThan(4)
      expect(new Set(posicoes.map(v=>JSON.stringify(v))).size).toBeGreaterThan(4)
    } finally {a.c.destruir()}
  })
  it('pausa as duas atividades e celebrações fora da tela/aba, congela microvida no modo leve', async () => {
    let observar!:(e:{isIntersecting:boolean}[])=>void
    class Observador {constructor(fn:typeof observar){observar=fn}observe(){}disconnect(){}}
    vi.stubGlobal('IntersectionObserver',Observador)
    const ids=['guardado','imoveis'], a=await mini(ids[0],303,128,false,true,false,ids,'patrimonio')
    try {
      for(let t=200;t<=9500;t+=100)a.frame(t)
      expect(a.c.medir().degrau).toBeGreaterThan(0)
      const tela=a.escritorio.children.find((m:any)=>m.material?.emissiveIntensity>0)
      const emissao=tela.material.emissiveIntensity
      a.c.definirEstado('imoveis','resolvido')
      for(let t=9600;t<=9900;t+=100)a.frame(t)
      const estado=a.scene.getObjectByName('agente:imoveis').userData.estado
      observar([{isIntersecting:false}]); expect(a.frames.size).toBe(0)
      const renderizacoes=a.renderer.render.mock.calls.length
      a.frame(100000); expect(a.renderer.render.mock.calls.length).toBe(renderizacoes)
      a.documento.hidden=true; a.documento.dispatchEvent(new Event('visibilitychange')); observar([{isIntersecting:true}]); expect(a.frames.size).toBe(0)
      a.documento.hidden=false; a.documento.dispatchEvent(new Event('visibilitychange')); a.frame(200000)
      expect(a.scene.getObjectByName('agente:imoveis').userData.estado).toBe(estado)
      expect(tela.material.emissiveIntensity).toBe(emissao)
      for(let t=200100;t<204000;t+=100)a.frame(t)
      expect(a.scene.getObjectByName('agente:imoveis').userData.estado).toBe('trabalhando')
      expect(a.scene.getObjectByName('agente:guardado').userData.estado).toBe('trabalhando')
    } finally {a.c.destruir()}
  })
  it('falha de carga conserva o elenco e sala sobreposta; falha durante fusão restaura pivôs', async () => {
    const ids=['fiscal','presenca'], offline=await mini(ids[0],303,128,true,true,true,ids,'casa')
    try {
      expect(offline.escritorio).toBeUndefined()
      expect(offline.scene.getObjectByName('agente:presenca').position.x).toBeCloseTo(offline.agente.position.x+1.45)
      offline.c.definirEstado('presenca','chamando'); expect(offline.scene.getObjectByName('agente:presenca').userData.estado).toBe('chamando')
    } finally {offline.c.destruir()}
    let liberar!:()=>void
    const espera=new Promise<void>(r=>liberar=r)
    vi.stubGlobal('fetch',vi.fn(async (url:string)=>{await espera; return {ok:true,arrayBuffer:async()=>buffer(url.match(/([a-zA-Z0-9]+)\.glb$/)![1])}}))
    const a=await mini(ids[0],303,128,false,false,true,ids,'casa')
    const clone=T.BufferAttribute.prototype.clone; let interrompeu=false
    vi.spyOn(T.BufferAttribute.prototype,'clone').mockImplementation(function(this:any){
      if(!interrompeu && a.scene.getObjectByName('escritorio:kenney')){interrompeu=true;throw Error('fusão interrompida')}
      return clone.call(this)
    })
    try {
      liberar(); await vi.waitFor(()=>expect(interrompeu).toBe(true))
      expect(a.scene.getObjectByName('escritorio:kenney')).toBeUndefined()
      a.c.definirEstado('presenca','resolvido')
      expect(a.scene.getObjectByName('agente:presenca').scale.x).toBe(.78)
      expect(a.scene.getObjectByName('joinha:presenca').visible).toBe(true)
    } finally {a.c.destruir()}
  })
  it('desmontar um elenco cancela a lease única e ignora resultados tardios', async () => {
    let liberar!:()=>void
    const espera=new Promise<void>(r=>liberar=r)
    vi.stubGlobal('fetch',vi.fn(async (url:string)=>{await espera; return {ok:true,arrayBuffer:async()=>buffer(url.match(/([a-zA-Z0-9]+)\.glb$/)![1])}}))
    const a=await mini('guardado',303,128,false,false,true,['guardado','imoveis'],'patrimonio')
    const chamadas=(fetch as any).mock.calls
    expect(chamadas.length).toBe(nomesDaSala('patrimonio').length)
    expect(new Set(chamadas.map((c:any)=>c[0])).size).toBe(chamadas.length)
    a.c.destruir(); liberar()
    await vi.waitFor(()=>expect(chamadas.every((c:any)=>c[1].signal.aborted)).toBe(true))
    expect(a.scene.getObjectByName('escritorio:kenney')).toBeUndefined();expect(a.frames.size).toBe(0)
  })
})
