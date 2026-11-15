import { afterEach, describe, expect, it, vi } from 'vitest'
import * as Three from './tres'
import { montarCena } from './cena3d'
import { MedidorFPS, type OpcoesCena } from './cenaBase'

class Elemento extends EventTarget {
  clientWidth = 900
  clientHeight = 600
  firstChild = null
  setAttribute() {}
  insertBefore() {}
  remove = vi.fn()
}
function ambiente(parado = false) {
  vi.useFakeTimers()
  const janela = Object.assign(new EventTarget(), { devicePixelRatio: 2, matchMedia: vi.fn(() => Object.assign(new EventTarget(), { matches: false })) })
  const documento = Object.assign(new EventTarget(), { hidden: false })
  const frames = new Map<number, FrameRequestCallback>(); let numero = 0
  vi.stubGlobal('window', janela); vi.stubGlobal('document', documento)
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => { frames.set(++numero, f); return numero })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  const canvas = new Elemento(), el = new Elemento()
  const renderer = { domElement: canvas, shadowMap: { enabled: true }, setPixelRatio: vi.fn(), setSize: vi.fn(), render: vi.fn(), dispose: vi.fn(), forceContextLoss: vi.fn(), info: { render: { calls: 0, triangles: 0 } } }
  const T = { ...Three, WebGLRenderer: function () { return renderer } }
  const o: OpcoesCena = { funcionarios: [{ id: 'secretaria', sala: 'recepcao', estado: 'fila' }], etiqueta: () => null, placa: () => null, aoTocar: vi.fn(), escuro: false, celular: () => false, hora: () => 12, parado, aoContexto: vi.fn() }
  const montar = () => montarCena(T, el as unknown as HTMLElement, o)
  const frame = (agora: number) => { const lista = [...frames.values()]; frames.clear(); lista.forEach(f => f(agora)) }
  return { janela, documento, frames, renderer, T, el, canvas, o, montar, frame }
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

describe('FPS real', () => {
  it.each([10, 20, 30, 60])('mede %i fps sem limitar o tempo ao dt da animação', fps => {
    const m = new MedidorFPS(), amostras: number[] = []
    for (let i = 0; i < fps * 8; i++) { const v = m.quadro(i * 1000 / fps); if (v !== null) amostras.push(v) }
    expect(amostras.length).toBeGreaterThan(2)
    expect(amostras.every(v => v === fps)).toBe(true)
  })
  it('descarta o primeiro intervalo após uma pausa', () => {
    const m = new MedidorFPS()
    for (let t = 0; t < 4500; t += 20) m.quadro(t)
    m.pausar(); expect(m.quadro(900000)).toBeNull()
    let fps: number | null = null
    for (let t = 900020; t <= 901000; t += 20) fps = m.quadro(t) ?? fps
    expect(fps).toBe(50)
  })
})

describe('ciclo da cena sem WebGL', () => {
  it('interrompe RAF escondido e retoma sem medir a pausa', () => {
    const a = ambiente(), c = a.montar(); a.frame(100)
    expect(a.frames.size).toBe(1)
    a.documento.hidden = true; a.documento.dispatchEvent(new Event('visibilitychange'))
    expect(a.frames.size).toBe(0)
    a.documento.hidden = false; a.documento.dispatchEvent(new Event('visibilitychange'))
    expect(a.frames.size).toBe(1)
    a.frame(900000); expect(c.medir().hist).toEqual([])
    c.destruir(); c.destruir(); expect(a.renderer.dispose).toHaveBeenCalledTimes(1)
    expect(a.frames.size).toBe(0)
  })
  it('renderiza sob demanda com movimento reduzido', () => {
    const a = ambiente(true), c = a.montar(); a.frame(100)
    expect(a.frames.size).toBe(0)
    c.irPara('recepcao'); expect(a.frames.size).toBe(1); a.frame(200)
    expect(a.frames.size).toBe(0)
    c.atualizar([{ id: 'secretaria', sala: 'recepcao', estado: 'precisa' }]); a.frame(300)
    expect(a.renderer.render).toHaveBeenCalledTimes(3)
    c.destruir()
  })
  it('recalcula DPR sem repetir setSize e respeita modo leve', () => {
    const a = ambiente(), c = a.montar(); a.frame(100)
    expect(a.renderer.setSize).toHaveBeenCalledTimes(1)
    a.janela.devicePixelRatio = 1.25; a.janela.dispatchEvent(new Event('resize'))
    expect(a.renderer.setPixelRatio).toHaveBeenLastCalledWith(1.25)
    expect(a.renderer.setSize).toHaveBeenCalledTimes(1)
    for (let t = 200; t <= 9000; t += 100) a.frame(t)
    expect(c.medir().degrau).toBeGreaterThan(0)
    a.janela.devicePixelRatio = 3; a.janela.dispatchEvent(new Event('resize'))
    expect(a.renderer.setPixelRatio).toHaveBeenLastCalledWith(1)
    c.destruir()
  })
  it('suspende no contexto perdido e recupera ou oferece lista após 8 s', () => {
    const a = ambiente(), c = a.montar()
    const ev = new Event('webglcontextlost', { cancelable: true }); a.canvas.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(true); expect(a.frames.size).toBe(0)
    expect(a.o.aoContexto).toHaveBeenLastCalledWith('perdido')
    a.canvas.dispatchEvent(new Event('webglcontextrestored'))
    expect(a.frames.size).toBe(1); expect(a.o.aoContexto).toHaveBeenLastCalledWith('restaurado')
    a.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })); vi.advanceTimersByTime(8000)
    expect(a.o.aoContexto).toHaveBeenLastCalledWith('falhou'); expect(a.renderer.dispose).toHaveBeenCalledTimes(1)
    c.destruir(); expect(a.renderer.dispose).toHaveBeenCalledTimes(1)
  })
  it('descarta materiais, BASE e sombra; também limpa montagem interrompida', () => {
    const a = ambiente()
    const geometria = vi.spyOn(Three.BufferGeometry.prototype, 'dispose')
    const material = vi.spyOn(Three.MeshLambertMaterial.prototype, 'dispose')
    const sombra = vi.spyOn(new Three.DirectionalLight().shadow.constructor.prototype, 'dispose')
    const c = a.montar(); c.destruir()
    expect(geometria.mock.instances.length).toBeGreaterThan(3)
    expect(material.mock.instances.length).toBeGreaterThanOrEqual(9)
    expect(new Set(material.mock.instances).size).toBe(material.mock.instances.length)
    expect(sombra).toHaveBeenCalledTimes(1)
    a.T.Scene = class { constructor() { throw new Error('interrompida') } } as never
    expect(a.montar).toThrow('interrompida')
    expect(a.renderer.dispose).toHaveBeenCalledTimes(2); expect(a.canvas.remove).toHaveBeenCalledTimes(2)
  })
})
it('não agenda RAF fora da tela e religa ao voltar', () => {
  const a = ambiente()
  let observar!: (entradas: { isIntersecting: boolean }[]) => void
  class Observador {
    constructor(fn: typeof observar) { observar = fn }
    observe() {}
    disconnect() {}
  }
  Object.assign(a.janela, { IntersectionObserver: Observador }); vi.stubGlobal('IntersectionObserver', Observador)
  const c = a.montar()
  observar([{ isIntersecting: false }]); expect(a.frames.size).toBe(0)
  observar([{ isIntersecting: true }]); expect(a.frames.size).toBe(1)
  c.destruir()
})
it('descarta os recursos já criados quando falha depois das luminárias', () => {
  const a = ambiente()
  const geometria = vi.spyOn(Three.BufferGeometry.prototype, 'dispose')
  const material = vi.spyOn(Three.MeshLambertMaterial.prototype, 'dispose')
  a.T.Raycaster = class { constructor() { throw Error('montagem parcial') } } as never
  expect(a.montar).toThrow('montagem parcial')
  expect(material.mock.instances.length).toBeGreaterThanOrEqual(9)
  expect(geometria.mock.instances.length).toBeGreaterThan(3)
  expect(a.frames.size).toBe(0)
  expect(a.renderer.dispose).toHaveBeenCalledTimes(1)
})
it('oferece lista quando o primeiro render após restauração falha', () => {
  const a = ambiente(), c = a.montar()
  a.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
  a.canvas.dispatchEvent(new Event('webglcontextrestored'))
  a.renderer.render.mockImplementation(() => { throw Error('contexto indisponível') })
  a.frame(100)
  expect(a.o.aoContexto).toHaveBeenLastCalledWith('falhou')
  expect(a.frames.size).toBe(0)
  expect(a.renderer.dispose).toHaveBeenCalledTimes(1)
  c.destruir()
})
