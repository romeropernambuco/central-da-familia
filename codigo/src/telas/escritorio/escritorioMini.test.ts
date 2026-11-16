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
import { criarCacheModelos } from './modelosEscritorio'
import { VARIANTES, nomesDaSala, bytesDaSala, caixaReal } from './escritorioMini'
import inventario from './inventarioModelos.json'
import { montarCena } from './cena3d'
import { EQUIPE } from './equipe'
// @ts-ignore: script JS do build.
import { gravarSw } from '../../../scripts/sw.mjs'

const pasta = resolve('public/modelos/escritorio')
const buffer = (nome: string) => { const b = readFileSync(resolve(pasta, nome + '.glb')); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) }
beforeEach(() => {
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
async function mini(id: string, w = 303, h = 128, falhar = false, esperar = true, reduz = true) {
  const janela = Object.assign(new EventTarget(), { devicePixelRatio: 1, matchMedia: () => Object.assign(new EventTarget(), { matches: reduz }) })
  const documento = Object.assign(new EventTarget(), { hidden: false })
  if (globalThis.IntersectionObserver) Object.assign(janela, { IntersectionObserver: globalThis.IntersectionObserver })
  vi.stubGlobal('window', janela); vi.stubGlobal('document', documento)
  const frames = new Map<number, any>(); let n = 0
  vi.stubGlobal('requestAnimationFrame', vi.fn((f: any) => { frames.set(++n, f); return n }))
  vi.stubGlobal('cancelAnimationFrame', (i: number) => frames.delete(i))
  const el = new Elemento(); el.clientWidth = w; el.clientHeight = h
  const renderer = { domElement: new Elemento(), shadowMap: {}, setPixelRatio() {}, setSize: vi.fn(), dispose: vi.fn(), forceContextLoss() {}, render: vi.fn(), info: { render: { calls: 0, triangles: 0 } } }
  const membro = EQUIPE.find(e => e.id === id)!
  if (falhar) vi.stubGlobal('fetch', vi.fn(async () => { throw Error('offline') }))
  const c = montarCena({ ...T, WebGLRenderer: function () { return renderer } }, el as any, { mini: true, funcionarios: [{ id, sala: membro.sala, estado: 'trabalhando' }], celular: () => true, escuro: false, parado: reduz, hora: () => 12, etiqueta: () => null, placa: () => null, aoTocar() {} })
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
function projetar(box: any, camera: any) { return box.clone().applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix) }

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
      expect(a.agente.children[0].position.y - d.assento).toBeCloseTo(.26 * Math.cos(1.5) + .1 * Math.sin(1.5), 5)
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
            expect(altura, id + ' altura').toBeGreaterThanOrEqual(.5); expect(altura).toBeLessThanOrEqual(.75)
            const quadril = a.agente.children[0], esquerdo = quadril.children.find((g: any) => g.position.x === -.3), direito = quadril.children.find((g: any) => g.position.x === .3)
            const y = a.escritorio.userData.tampo + inventario.computerKeyboard.max[1] * .95
            for (const [braco, x] of [[esquerdo, -.08], [direito, .31]]) {
              const antebraco = braco.children.find((g: any) => g.isGroup)
              const mao = antebraco.localToWorld(new T.Vector3(0, -.26, 0)).sub(a.escritorio.position)
              expect(mao.distanceTo(new T.Vector3(x, y, a.escritorio.userData.pecas.computerKeyboard[0].getCenter(new T.Vector3()).z))).toBeLessThan(.025)
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
