import { afterEach, expect, it, vi } from 'vitest'
import * as T from './tres'
import { montarEscritorioIsometrico, ORCAMENTO_ISOMETRICO } from './cenaIsometrica'
import { EQUIPE } from './equipe'

class Elemento extends EventTarget {
  dataset: Record<string, string> = {}
  style: Record<string, string> = {}
  clientWidth = 820
  clientHeight = 430
  setAttribute = vi.fn()
  remove = vi.fn()
  prepend = vi.fn()
}

function ambiente(reduz: boolean) {
  const frames = new Map<number, FrameRequestCallback>()
  let numero = 0
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.set(++numero, cb); return numero })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  const doc = Object.assign(new EventTarget(), { hidden: false })
  const movimento = Object.assign(new EventTarget(), { matches: reduz })
  vi.stubGlobal('document', doc)
  vi.stubGlobal('window', { matchMedia: () => movimento, devicePixelRatio: 3 })
  const desconectarResize = vi.fn(), desconectarIntersecao = vi.fn()
  let intersecao: (entradas: { isIntersecting: boolean }[]) => void
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect = desconectarResize })
  vi.stubGlobal('IntersectionObserver', class {
    constructor(fn: typeof intersecao) { intersecao = fn }
    observe() {}
    disconnect = desconectarIntersecao
  })
  const renderer = {
    domElement: new Elemento(), shadowMap: { enabled: false }, info: { reset: vi.fn(), render: { calls: 0, triangles: 0 } },
    setSize: vi.fn(), setClearColor: vi.fn(), setPixelRatio: vi.fn(), forceContextLoss: vi.fn(), dispose: vi.fn(),
    render: vi.fn((scene, _camera) => {
      const custo = { calls: 0, triangles: 0 }
      scene.traverseVisible((obj: any) => {
        if (!obj.isInstancedMesh) return
        const passes = obj.castShadow && renderer.shadowMap.enabled ? 2 : 1
        custo.calls += passes
        custo.triangles += (obj.geometry.index?.count ?? obj.geometry.attributes.position.count) / 3 * obj.count * passes
      })
      renderer.info.render = custo
    }),
  }
  const etiquetas = new Map(EQUIPE.map(m => [m.id, new Elemento()]))
  const aoPerderContexto = vi.fn()
  const montar = () => montarEscritorioIsometrico({ ...T, WebGLRenderer: function () { return renderer } }, new Elemento() as any, {
    estados: { contador: 'trabalhando' }, vista: 'tudo', etiqueta: id => etiquetas.get(id) as any,
    placa: () => null, aoPerderContexto, aoTocar() {},
  })
  const quadro = (t: number) => {
    const callbacks = [...frames.values()]
    frames.clear()
    callbacks.forEach(fn => fn(t))
  }
  return {
    montar, frames, renderer, etiquetas, quadro, aoPerderContexto, doc, movimento,
    desconectarResize, desconectarIntersecao, mostrar: (isIntersecting: boolean) => intersecao([{ isIntersecting }]),
  }
}
afterEach(() => vi.unstubAllGlobals())

it('projeta todos os postos, instancia a sala e aplica foco e estados sem remontar', () => {
  const a = ambiente(true), c = a.montar()
  a.quadro(100)
  expect(a.renderer.domElement.setAttribute).toHaveBeenCalledWith('aria-hidden', 'true')
  expect(a.renderer.setPixelRatio).toHaveBeenCalledWith(1.5)
  expect([...a.etiquetas.values()].filter(e => parseFloat(e.style.left) > 0 && parseFloat(e.style.left) < 100)).toHaveLength(EQUIPE.length)
  expect(a.etiquetas.get('imoveis')?.style.top).toBeDefined()
  expect(a.renderer.info.render.calls).toBeLessThanOrEqual(ORCAMENTO_ISOMETRICO.desenhos)
  expect(a.renderer.info.render.triangles).toBeLessThanOrEqual(ORCAMENTO_ISOMETRICO.triangulos)
  const cam = a.renderer.render.mock.calls[0][1]
  const conteudo = () => cam.right - cam.left
  const largura = conteudo(), anterior = a.etiquetas.get('guardado')?.style.top
  c.atualizar({ guardado: 'precisa_de_voce' }, 'patrimonio')
  a.quadro(117)
  expect(conteudo()).toBeLessThan(largura)
  expect(a.etiquetas.get('guardado')?.style.top).not.toBe(anterior)
  expect(a.frames.size).toBe(0)
  c.destruir()
})

it('pausa fora da tela e com a aba oculta, reduz detalhe sob FPS baixo e descarta em perda de contexto', () => {
  const a = ambiente(false), c = a.montar()
  a.quadro(100)
  a.mostrar(false)
  expect(a.frames.size).toBe(0)
  a.mostrar(true)
  expect(a.frames.size).toBe(1)
  a.doc.hidden = true
  a.doc.dispatchEvent(new Event('visibilitychange'))
  expect(a.frames.size).toBe(0)
  a.doc.hidden = false
  a.doc.dispatchEvent(new Event('visibilitychange'))
  for (let t = 100; t <= 2200; t += 100) a.quadro(t)
  expect(a.renderer.shadowMap.enabled).toBe(false)
  expect(a.renderer.setPixelRatio).toHaveBeenLastCalledWith(1)
  const perda = new Event('webglcontextlost', { cancelable: true })
  a.renderer.domElement.dispatchEvent(perda)
  expect(perda.defaultPrevented).toBe(true)
  expect(a.aoPerderContexto).toHaveBeenCalledOnce()
  c.destruir()
  expect(a.renderer.dispose).toHaveBeenCalledOnce()
  expect(a.frames.size).toBe(0)
})

it('vinte montagens liberam todos os lotes, canvases, observadores e contextos', () => {
  const a = ambiente(false)
  const descartar = vi.spyOn(T.InstancedMesh.prototype, 'dispose')
  try {
    for (let i = 0; i < 20; i++) {
      const c = a.montar()
      a.quadro(100)
      c.destruir()
      expect(a.frames.size).toBe(0)
    }
    expect(descartar.mock.calls.length).toBeGreaterThan(20)
    expect(a.renderer.domElement.remove).toHaveBeenCalledTimes(20)
    expect(a.renderer.forceContextLoss).toHaveBeenCalledTimes(20)
    expect(a.desconectarResize).toHaveBeenCalledTimes(20)
    expect(a.desconectarIntersecao).toHaveBeenCalledTimes(20)
  } finally { descartar.mockRestore() }
})
