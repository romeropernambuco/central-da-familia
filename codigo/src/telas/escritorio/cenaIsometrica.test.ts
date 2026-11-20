import { afterEach, expect, it, vi } from 'vitest'
import * as T from './tres'
import {
  montarEscritorioIsometrico,
  ORCAMENTO_ISOMETRICO,
  type EstadosIsometricos,
  type OpcoesIsometricas,
} from './cenaIsometrica'
import { EQUIPE } from './equipe'
import { SALAS_ISOMETRICAS } from './plantaIsometrica'

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
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frames.set(++numero, cb)
    return numero
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  const doc = Object.assign(new EventTarget(), { hidden: false })
  const movimento = Object.assign(new EventTarget(), { matches: reduz })
  vi.stubGlobal('document', doc)
  vi.stubGlobal('window', { matchMedia: () => movimento, devicePixelRatio: 3 })
  const desconectarResize = vi.fn(),
    desconectarIntersecao = vi.fn()
  let intersecao: (entradas: { isIntersecting: boolean }[]) => void
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect = desconectarResize
    },
  )
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(fn: typeof intersecao) {
        intersecao = fn
      }
      observe() {}
      disconnect = desconectarIntersecao
    },
  )
  const renderer = {
    domElement: new Elemento(),
    shadowMap: { enabled: false },
    info: { reset: vi.fn(), render: { calls: 0, triangles: 0 } },
    setSize: vi.fn(),
    setClearColor: vi.fn(),
    setPixelRatio: vi.fn(),
    forceContextLoss: vi.fn(),
    dispose: vi.fn(),
    render: vi.fn((scene, _camera) => {
      const custo = { calls: 0, triangles: 0 }
      scene.traverseVisible((obj: any) => {
        if (!obj.isInstancedMesh || obj.count === 0) return
        const passes = obj.castShadow && renderer.shadowMap.enabled ? 2 : 1
        custo.calls += passes
        custo.triangles +=
          ((obj.geometry.index?.count ?? obj.geometry.attributes.position.count) / 3) * obj.count * passes
      })
      renderer.info.render = custo
    }),
  }
  const etiquetas = new Map(EQUIPE.map(m => [m.id, new Elemento()]))
  const aoPerderContexto = vi.fn()
  const montar = (
    estados: EstadosIsometricos = { contador: 'trabalhando' },
    palco?: OpcoesIsometricas['palco'],
    tamanho?: { clientWidth: number; clientHeight: number },
  ) =>
    montarEscritorioIsometrico(
      {
        ...T,
        WebGLRenderer: function () {
          return renderer
        } as unknown as typeof T.WebGLRenderer,
      },
      Object.assign(new Elemento(), tamanho) as any,
      {
        estados,
        palco,
        vista: 'tudo',
        etiqueta: id => etiquetas.get(id) as any,
        placa: () => null,
        aoPerderContexto,
        aoTocar() {},
      },
    )
  const quadro = (t: number) => {
    const callbacks = [...frames.values()]
    frames.clear()
    callbacks.forEach(fn => fn(t))
  }
  return {
    montar,
    frames,
    renderer,
    etiquetas,
    quadro,
    aoPerderContexto,
    doc,
    movimento,
    desconectarResize,
    desconectarIntersecao,
    mostrar: (isIntersecting: boolean) => intersecao([{ isIntersecting }]),
  }
}
afterEach(() => vi.unstubAllGlobals())

const variantes = ['compacta', 'media', 'grande'] as const
const palcoDe = (variante: (typeof variantes)[number]) => ({
  variante,
  elenco: EQUIPE,
  posicionar: vi.fn<NonNullable<OpcoesIsometricas['palco']>['posicionar']>(),
  aoApontar() {},
  aoDesenhar() {},
})

it.each([
  [341, 812],
  [356, 844],
  [628, 510],
  [984, 541],
])('enquadra os mesmos 19 postos e mantém o orçamento em %i × %i', (clientWidth, clientHeight) => {
  const a = ambiente(true)
  const palco = { ...palcoDe('grande'), completo: true, celular: clientWidth < 400 }
  const estados = Object.fromEntries(EQUIPE.map(m => [m.id, 'trabalhando' as const]))
  const c = a.montar(estados, palco, { clientWidth, clientHeight })
  a.quadro(100)
  const postos = () => palco.posicionar.mock.lastCall![0]
  expect(postos().map(p => p.id)).toEqual(EQUIPE.map(m => m.id))
  expect(postos().every(p => p.x > 0 && p.x < clientWidth && p.y > 0 && p.y < clientHeight)).toBe(true)
  expect(a.renderer.info.render.calls).toBeLessThanOrEqual(ORCAMENTO_ISOMETRICO.desenhos)
  expect(a.renderer.info.render.triangles).toBeLessThanOrEqual(ORCAMENTO_ISOMETRICO.triangulos)
  const distancia = () =>
    Math.abs(postos().find(p => p.id === 'contador')!.x - postos().find(p => p.id === 'tesoureiro')!.x)
  const naVistaCompleta = distancia()
  c.atualizar(estados, 'caixa')
  a.quadro(116)
  expect(distancia()).toBeGreaterThan(naVistaCompleta * 1.4)
  c.atualizar(estados, 'tudo')
  a.quadro(132)
  expect(postos()).toHaveLength(19)
  c.navegar({ zoom: 1.4, x: 0, y: 0 })
  a.quadro(148)
  expect(distancia()).toBeCloseTo(naVistaCompleta * 1.4)
  c.destruir()
})

it.each(['celular', 'desktop'] as const)(
  'enquadra os três postos inteiros e grandes no %s em cada variante',
  dispositivo => {
    const tamanhos = variantes.map(variante => {
      const largura = dispositivo === 'celular' ? 349 : { compacta: 448, media: 640, grande: 820 }[variante]
      const a = ambiente(true),
        palco = palcoDe(variante)
      const c = a.montar(undefined, palco, { clientWidth: largura, clientHeight: 380 })
      a.quadro(100)
      const [postos] = palco.posicionar.mock.lastCall!
      expect(postos.map(p => p.id)).toEqual(['contador', 'colchao', 'tesoureiro'])
      expect(postos.every(p => p.x > 28 && p.x < largura - 28 && p.y > 60 && p.y < 320)).toBe(true)
      const cam = a.renderer.render.mock.lastCall![1]
      const alturaEmPixels =
        (new T.Vector3(0, 1.37, -0.88).project(cam).y - new T.Vector3(0, 0.12, -0.88).project(cam).y) * 190
      expect(alturaEmPixels).toBeGreaterThanOrEqual(largura < 400 ? 40 : 60)
      expect(a.renderer.setPixelRatio).toHaveBeenCalledWith(2)
      c.destruir()
      return alturaEmPixels
    })
    expect(tamanhos[2]).toBeGreaterThan(tamanhos[1])
    expect(tamanhos[1]).toBeGreaterThan(tamanhos[0])
  },
)

it('mantém o orçamento ao paginar todas as salas, inclusive com pedidos simultâneos', () => {
  const a = ambiente(true),
    palco = palcoDe('grande')
  const c = a.montar(undefined, palco)
  for (const estado of ['trabalhando', 'vai_comecar', 'entregue', 'precisa_de_voce'] as const) {
    const estados = Object.fromEntries(EQUIPE.map(m => [m.id, estado]))
    for (const sala of SALAS_ISOMETRICAS) {
      c.atualizar(estados, 'tudo', sala)
      a.quadro(100)
      expect(a.renderer.info.render.calls).toBeLessThanOrEqual(ORCAMENTO_ISOMETRICO.desenhos)
      expect(a.renderer.info.render.triangles).toBeLessThanOrEqual(ORCAMENTO_ISOMETRICO.triangulos)
      expect(palco.posicionar.mock.lastCall![0].filter(p => p.chama).map(p => p.id)).toEqual(
        estado === 'precisa_de_voce' ? EQUIPE.filter(m => m.sala === sala).map(m => m.id) : [],
      )
    }
  }
  c.destruir()
})

it('projeta e anima os 19 postos no panorama móvel dentro do orçamento', () => {
  const a = ambiente(false),
    palco = { ...palcoDe('grande'), panorama: true }
  const largura = 940,
    altura = 552
  const estados = Object.fromEntries(EQUIPE.map(m => [m.id, 'trabalhando' as const]))
  const c = a.montar(estados, palco, { clientWidth: largura, clientHeight: altura })
  a.quadro(100)
  const [postos] = palco.posicionar.mock.lastCall!
  expect(postos.map(p => p.id)).toEqual(EQUIPE.map(m => m.id))
  expect(postos.every(p => p.x > 22 && p.x < largura - 22 && p.y > 22 && p.y < altura - 22)).toBe(true)
  const [scene, cam] = a.renderer.render.mock.lastCall!
  const pixels = ((new T.Vector3(0, 1.37, 0).project(cam).y - new T.Vector3(0, 0.12, 0).project(cam).y) * altura) / 2
  expect(pixels).toBeGreaterThanOrEqual(40)
  const telas = scene.getObjectByName('telas acesas')
  expect(telas.count).toBe(EQUIPE.length * 4) // Fundo e três traços por monitor aceso.
  expect(a.renderer.info.render.triangles).toBeLessThanOrEqual(ORCAMENTO_ISOMETRICO.triangulos)
  for (const estado of ['entregue', 'precisa_de_voce'] as const) {
    c.atualizar(Object.fromEntries(EQUIPE.map(m => [m.id, estado])), 'tudo')
    a.quadro(116)
    expect(telas.count).toBe(0)
    expect(palco.posicionar.mock.lastCall![0].every(p => p.chama === (estado === 'precisa_de_voce'))).toBe(true)
    expect(a.renderer.info.render.calls).toBeLessThanOrEqual(ORCAMENTO_ISOMETRICO.desenhos)
    expect(a.renderer.info.render.triangles).toBeLessThanOrEqual(ORCAMENTO_ISOMETRICO.triangulos)
  }
  c.destruir()
})

it('aproxima a sala em vários quadros e omite marcadores dos demais estados e páginas', () => {
  const a = ambiente(false),
    palco = palcoDe('grande')
  const estados: EstadosIsometricos = {
    contador: 'trabalhando',
    colchao: 'vai_comecar',
    tesoureiro: 'entregue',
    guardado: 'precisa_de_voce',
  }
  const c = a.montar(estados, palco, { clientWidth: 349, clientHeight: 365 })
  a.quadro(100)
  const [scene, cam] = a.renderer.render.mock.lastCall!
  const marcador = scene.getObjectByName('pedidos de atenção')
  expect(marcador.count).toBe(0)
  const escala = () => 349 / (cam.right - cam.left)
  const geral = escala()
  c.atualizar(estados, 'patrimonio')
  a.quadro(116)
  const primeiro = escala()
  expect(primeiro).toBeGreaterThan(geral)
  expect(marcador.count).toBe(2) // miolo e contorno do mesmo pedido
  expect(palco.posicionar.mock.lastCall![0].filter(p => p.chama).map(p => p.id)).toEqual(['guardado'])
  for (let i = 1; i <= 22; i++) a.quadro(116 + 16 * i)
  expect(escala()).toBeGreaterThan(primeiro * 1.3)
  const altura = (new T.Vector3(0, 1.37, -0.88).project(cam).y - new T.Vector3(0, 0.12, -0.88).project(cam).y) * 182.5
  expect(altura).toBeGreaterThanOrEqual(90)
  expect(altura).toBeLessThanOrEqual(120)
  c.atualizar({ ...estados, guardado: 'entregue' }, 'patrimonio')
  a.quadro(500)
  expect(marcador.count).toBe(0)
  expect(a.renderer.info.render.calls).toBeLessThanOrEqual(ORCAMENTO_ISOMETRICO.desenhos)
  expect(a.renderer.info.render.triangles).toBeLessThanOrEqual(ORCAMENTO_ISOMETRICO.triangulos)
  c.destruir()
})

it('com movimento reduzido o palco troca sala, zoom e estados em um único quadro, sem fila de animação', () => {
  const a = ambiente(true),
    palco = palcoDe('media')
  const c = a.montar({ guardado: 'precisa_de_voce' }, palco)
  a.quadro(100)
  const [scene, cam] = a.renderer.render.mock.lastCall!
  const marcador = scene.getObjectByName('pedidos de atenção')
  expect(marcador.count).toBe(0)
  const anterior = cam.right - cam.left
  c.atualizar({ guardado: 'precisa_de_voce' }, 'patrimonio')
  a.quadro(116)
  const largura = cam.right - cam.left
  expect(largura).toBeLessThan(anterior)
  expect(marcador.count).toBe(2)
  const matriz = new T.Matrix4()
  marcador.getMatrixAt(0, matriz)
  const inicial = matriz.clone()
  expect(a.frames.size).toBe(0)
  a.mostrar(false)
  a.mostrar(true)
  a.quadro(2400)
  marcador.getMatrixAt(0, matriz)
  expect(matriz.equals(inicial)).toBe(true)
  expect(cam.right - cam.left).toBe(largura)
  expect(a.frames.size).toBe(0)
  c.destruir()
})

it('projeta todos os postos, instancia a sala e aplica foco e estados sem remontar', () => {
  const a = ambiente(true),
    c = a.montar()
  a.quadro(100)
  expect(a.renderer.domElement.setAttribute).toHaveBeenCalledWith('aria-hidden', 'true')
  expect(a.renderer.setPixelRatio).toHaveBeenCalledWith(1.5)
  expect(
    [...a.etiquetas.values()].filter(e => parseFloat(e.style.left) > 0 && parseFloat(e.style.left) < 100),
  ).toHaveLength(EQUIPE.length)
  expect(a.etiquetas.get('imoveis')?.style.top).toBeDefined()
  expect(a.renderer.info.render.calls).toBeLessThanOrEqual(ORCAMENTO_ISOMETRICO.desenhos)
  expect(a.renderer.info.render.triangles).toBeLessThanOrEqual(ORCAMENTO_ISOMETRICO.triangulos)
  const cam = a.renderer.render.mock.calls[0][1]
  const conteudo = () => cam.right - cam.left
  const largura = conteudo(),
    anterior = a.etiquetas.get('guardado')?.style.top
  c.atualizar({ guardado: 'precisa_de_voce' }, 'patrimonio')
  a.quadro(117)
  expect(conteudo()).toBeLessThan(largura)
  expect(a.etiquetas.get('guardado')?.style.top).not.toBe(anterior)
  expect(a.frames.size).toBe(0)
  c.destruir()
})

it('troca monitor, selo e marcador pelo estado e mantém a pose reduzida sem loop', () => {
  const a = ambiente(false)
  const c = a.montar({
    contador: 'trabalhando',
    fiscal: 'vai_comecar',
    cartao: 'entregue',
    guardado: 'precisa_de_voce',
  })
  a.quadro(100)
  const scene = a.renderer.render.mock.calls[0][0]
  const telas = scene.getObjectByName('telas acesas')
  const selos = scene.getObjectByName('selos de entrega')
  const marcadores = scene.getObjectByName('pedidos de atenção')
  expect(telas.count).toBe(4)
  expect(selos.count).toBe(3)
  expect(marcadores.count).toBe(1)
  const matriz = new T.Matrix4()
  const pulso = () => {
    marcadores.getMatrixAt(0, matriz)
    return matriz.elements[0]
  }
  const tamanhoInicial = pulso()
  a.quadro(170)
  expect(pulso()).not.toBe(tamanhoInicial)
  a.movimento.matches = true
  a.movimento.dispatchEvent(new Event('change'))
  a.quadro(185)
  expect(pulso()).toBeCloseTo(0.17)
  expect(a.frames.size).toBe(0)
  c.atualizar({ guardado: 'trabalhando', contador: 'vai_comecar' }, 'tudo')
  a.quadro(202)
  expect(telas.count).toBe(4)
  expect(selos.count).toBe(0)
  expect(marcadores.count).toBe(0)
  expect(a.frames.size).toBe(0)

  for (const estado of ['trabalhando', 'entregue', 'precisa_de_voce'] as const) {
    c.atualizar(Object.fromEntries(EQUIPE.map(m => [m.id, estado])), 'tudo')
    a.quadro(220)
    expect(a.renderer.info.render.calls).toBeLessThanOrEqual(ORCAMENTO_ISOMETRICO.desenhos)
    expect(a.renderer.info.render.triangles).toBeLessThanOrEqual(ORCAMENTO_ISOMETRICO.triangulos)
  }
  c.destruir()
})

it('pausa fora da tela e com a aba oculta, reduz detalhe sob FPS baixo e descarta em perda de contexto', () => {
  const a = ambiente(false),
    c = a.montar()
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
  } finally {
    descartar.mockRestore()
  }
})
