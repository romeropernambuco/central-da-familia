import { afterEach, describe, expect, it, vi } from 'vitest'
import * as Three from './tres'
import { montarCena } from './cena3d'
import { MedidorFPS, type OpcoesCena } from './cenaBase'
import { EQUIPE } from './equipe'
import { ATIVIDADES_MINI, faseDoId, LIMITE_MESHES_MINI } from './atividadesMini'
// @ts-ignore: o projeto não instala tipos do Three.
import { Box3, Vector3, InstancedMesh } from 'three'

class Elemento extends EventTarget {
  clientWidth = 900
  clientHeight = 600
  firstChild = null
  setAttribute() {}
  insertBefore() {}
  remove = vi.fn()
  getBoundingClientRect() { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight } }
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
  it('mini reutiliza o personagem, reduz a cena e libera o contexto', () => {
    const a = ambiente(true)
    const inteira = a.montar(); a.frame(100)
    const objetos = a.renderer.render.mock.calls[0][0].children.length
    inteira.destruir()
    a.renderer.render.mockClear()
    a.o.mini = true
    const mini = a.montar(); a.frame(200)
    expect(a.renderer.render.mock.calls[0][0].children.length).toBeLessThan(objetos)
    mini.destruir()
    expect(a.renderer.forceContextLoss).toHaveBeenCalledTimes(2)
    expect(a.frames.size).toBe(0)
  })
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

function miniDe(id: string, parado = false, altura = 128) {
  const a = ambiente(parado), membro = EQUIPE.find(e => e.id === id)!
  a.el.clientWidth = 303; a.el.clientHeight = altura; a.o.mini = true
  a.o.funcionarios = [{ id, sala: membro.sala, estado: 'trabalhando' }]
  const c = a.montar(); a.frame(100)
  const [scene, camera] = a.renderer.render.mock.calls[a.renderer.render.mock.calls.length - 1]
  const b = scene.getObjectByName(`agente:${id}`), trabalho = scene.getObjectByName(`atividade:${id}`)
  const avancar = (inicio: number, fim: number, passo = 25) => { for (let t = inicio; t <= fim; t += passo) a.frame(t) }
  const matrizes = (objeto: any) => { objeto.updateMatrixWorld(true); const valores: number[] = []; objeto.traverse((m: any) => { valores.push(...m.matrixWorld.elements) }); return valores }
  return { ...a, c, scene, camera, b, trabalho, avancar, matrizes }
}

describe('atividades individuais dos minis', () => {
  it('cobre todos os ids com atividade, objeto, câmera e fase próprios', () => {
    expect(Object.keys(ATIVIDADES_MINI).sort()).toEqual([...new Set([...EQUIPE.map(e => e.id), 'imoveis'])].sort())
    for (const campo of ['atividade', 'objeto', 'camera'] as const) {
      expect(new Set(EQUIPE.map(e => JSON.stringify(ATIVIDADES_MINI[e.id][campo]))).size).toBe(EQUIPE.length)
    }
    expect(new Set(EQUIPE.map(e => faseDoId(e.id))).size).toBe(EQUIPE.length)
    const assinaturas = EQUIPE.map(e => {
      const a = miniDe(e.id, true); expect(a.trabalho).toBeDefined()
      const assinatura = JSON.stringify(a.matrizes(a.trabalho)); a.c.destruir(); return assinatura
    })
    expect(new Set(assinaturas).size).toBe(EQUIPE.length)
  })
  it.each(EQUIPE.map(e => e.id))('%s tem cenografia animada, orçamento real e cache de recursos', id => {
    const a = miniDe(id), meshes: any[] = []
    a.scene.traverse((m: any) => { if (m.isMesh) meshes.push(m) })
    expect(a.trabalho).toBeDefined()
    expect(meshes.length).toBeLessThanOrEqual(LIMITE_MESHES_MINI)
    const antes = a.matrizes(a.trabalho); a.avancar(125, 1100)
    expect(a.matrizes(a.trabalho)).not.toEqual(antes)
    expect(new Set(meshes.map(m => m.geometry)).size).toBeLessThan(meshes.length)
    const formas = new Set<any>(); a.trabalho.traverse((m: any) => { if (m.isMesh) formas.add(m.geometry) })
    expect(formas.size).toBeLessThanOrEqual(id === 'guardado' ? 2 : 1)
    expect(new Set(meshes.map(m => m.material)).size).toBeLessThan(meshes.length)
    // Novos objetos não acrescentam sombras ou luzes.
    a.trabalho.traverse((m: any) => { expect(m.castShadow).not.toBe(true); expect(m.isLight).not.toBe(true) })
    const geometrias = new Set(meshes.map(m => m.geometry)), materiais = new Set(meshes.map(m => m.material))
    const descartar = [...geometrias, ...materiais, ...meshes.filter(m => m.isInstancedMesh)].map(r => vi.spyOn(r, 'dispose'))
    a.c.destruir(); a.c.destruir()
    descartar.forEach(dispose => expect(dispose).toHaveBeenCalledTimes(1))
    expect(a.frames.size).toBe(0)
  })
  it.each(EQUIPE.map(e => e.id))('%s mantém cabeça e atividade enquadradas em 303×128 e 303×180', id => {
    for (const altura of [128, 180]) {
      const a = miniDe(id, true, altura)
      a.scene.updateMatrixWorld(true); a.camera.updateMatrixWorld(true)
      const limites = new Box3().setFromObject(a.trabalho)
      // Inclui a cabeça com coque e cabelo; não usa a caixa do cenário para esconder cortes.
      const head = a.b.children[0].children.find((m: any) => m.position.y === .5)
      limites.union(new Box3().setFromObject(head))
      for (const x of [limites.min.x, limites.max.x]) for (const y of [limites.min.y, limites.max.y]) for (const z of [limites.min.z, limites.max.z]) {
        const p = new Vector3(x, y, z).project(a.camera)
        expect(Math.abs(p.x)).toBeLessThan(1); expect(Math.abs(p.y)).toBeLessThan(1)
      }
      a.c.destruir()
    }
  })
  it.each(EQUIPE.map(e => e.id))('%s alcança os quatro estados, interpola poses, interrompe e retorna sem recriar recursos', id => {
    const a = miniDe(id), geometria = vi.spyOn(Three.BufferGeometry.prototype, 'dispose')
    const meshes: any[] = []; a.scene.traverse((m: any) => { if (m.isMesh) meshes.push(m) })
    let tempo = 100
    for (const st of ['chamando', 'parado', 'resolvido', 'trabalhando'] as const) {
      const antes = a.matrizes(a.b)
      a.c.definirEstado(id, st); expect(a.b.userData.estado).toBe(st)
      expect(a.matrizes(a.b)).toEqual(antes)
      a.avancar(tempo + 25, tempo + 1000); tempo += 1000
      expect(a.matrizes(a.b)).not.toEqual(antes)
      a.c.definirEstado(id, 'trabalhando'); a.avancar(tempo + 25, tempo + 1000); tempo += 1000
    }
    a.c.definirEstado(id, 'resolvido'); a.avancar(tempo + 25, tempo + 2000)
    expect(a.b.userData.estado).toBe('trabalhando')
    const depois: any[] = []; a.scene.traverse((m: any) => { if (m.isMesh) depois.push(m) })
    expect(depois).toEqual(meshes); expect(geometria).not.toHaveBeenCalled()
    expect(a.renderer.render.mock.calls.every(([s, c]) => s === a.scene && c === a.camera)).toBe(true)
    a.c.definirEstado('desconhecido', 'chamando'); a.c.destruir()
  })
  it('para a atividade quando chama e a retoma, com indicador e joinha', () => {
    const a = miniDe('colchao')
    a.c.definirEstado('colchao', 'chamando'); a.avancar(125, 2500)
    const antes = a.matrizes(a.trabalho); a.avancar(2525, 3500)
    const depois = a.matrizes(a.trabalho)
    depois.forEach((v, i) => expect(v).toBeCloseTo(antes[i], 7))
    expect(a.scene.getObjectByName('agente:colchao').userData.estado).toBe('chamando')
    expect(a.scene.getObjectByName('chamada:colchao').visible).toBe(true)
    expect(a.scene.getObjectByName('joinha:colchao').visible).toBe(false)
    a.c.definirEstado('colchao', 'resolvido'); a.frame(3525)
    expect(a.scene.getObjectByName('chamada:colchao').visible).toBe(false)
    expect(a.scene.getObjectByName('joinha:colchao').visible).toBe(true)
    a.avancar(3550, 5500)
    expect(a.b.userData.estado).toBe('trabalhando'); expect(a.matrizes(a.trabalho)).not.toEqual(depois)
    a.c.destruir()
  })
  it('mini reduzido não agenda nenhum RAF, mantém atividade e aceita estados sob demanda', () => {
    const a = miniDe('secretaria', true)
    expect(a.frames.size).toBe(0); expect(a.renderer.render).toHaveBeenCalledTimes(1)
    const antes = a.matrizes(a.trabalho)
    a.c.definirEstado('secretaria', 'chamando'); expect(a.b.userData.estado).toBe('chamando')
    a.c.definirEstado('secretaria', 'resolvido'); expect(a.b.userData.estado).toBe('resolvido')
    vi.advanceTimersByTime(1600); expect(a.b.userData.estado).toBe('trabalhando')
    expect(a.matrizes(a.trabalho)).toEqual(antes)
    expect(a.frames.size).toBe(0)
    a.c.definirEstado('secretaria', 'resolvido'); a.c.destruir(); vi.advanceTimersByTime(2000)
    expect(a.renderer.render).toHaveBeenCalledTimes(5)
  })
  it('honra prefers-reduced-motion mesmo sem a opção parado', () => {
    const a = ambiente(); a.o.mini = true
    a.janela.matchMedia.mockImplementation(() => Object.assign(new EventTarget(), { matches: true }))
    const c = a.montar(); expect(a.frames.size).toBe(0); expect(a.renderer.render).toHaveBeenCalledTimes(1); c.destruir()
  })
  it('modo leve congela microvida mas mantém o gesto principal; oculto pausa tudo', () => {
    const a = miniDe('folha')
    a.avancar(200, 9200, 100); expect(a.c.medir().degrau).toBeGreaterThan(0)
    const antes = a.matrizes(a.trabalho), head = a.b.children[0].children.find((m: any) => m.position.y === .5)
    const olhos = head.children.find((m: any) => m.position.y === .25), cabelo = head.children.find((m: any) => m.position.y === .4)
    const micro = [olhos.scale.y, cabelo.rotation.z]
    a.avancar(9300, 10000, 100)
    expect(a.matrizes(a.trabalho)).not.toEqual(antes)
    expect([olhos.scale.y, cabelo.rotation.z]).toEqual(micro)
    a.c.definirEstado('folha', 'resolvido')
    a.documento.hidden = true; a.documento.dispatchEvent(new Event('visibilitychange'))
    expect(a.frames.size).toBe(0); a.frame(900000)
    expect(a.b.userData.estado).toBe('resolvido')
    a.documento.hidden = false; a.documento.dispatchEvent(new Event('visibilitychange')); a.frame(900025)
    expect(a.b.userData.estado).toBe('resolvido'); a.avancar(900050, 901800)
    expect(a.b.userData.estado).toBe('trabalhando'); a.c.destruir()
  })
  it('atualizar traduz os estados legados sem desmontar o mini', () => {
    const a = miniDe('analista', true)
    for (const [estado, esperado] of [['fila', 'parado'], ['precisa', 'chamando'], ['entregue', 'resolvido'], ['trabalhando', 'trabalhando']] as const) {
      a.c.atualizar([{ id: 'analista', sala: 'gestao', estado }]); expect(a.b.userData.estado).toBe(esperado)
    }
    const entregue = [{ id: 'analista', sala: 'gestao', estado: 'entregue' as const }]
    a.c.atualizar(entregue); vi.advanceTimersByTime(1600)
    expect(a.b.userData.estado).toBe('trabalhando')
    a.c.atualizar(entregue); expect(a.b.userData.estado).toBe('trabalhando')
    a.c.destruir()
  })
  it('pausa o retorno pontual reduzido enquanto a aba está oculta', () => {
    const a = miniDe('protetora', true)
    const agora = vi.spyOn(performance, 'now').mockReturnValue(0)
    a.c.definirEstado('protetora', 'resolvido'); vi.advanceTimersByTime(600)
    agora.mockReturnValue(600)
    a.documento.hidden = true; a.documento.dispatchEvent(new Event('visibilitychange')); vi.advanceTimersByTime(100000)
    expect(a.b.userData.estado).toBe('resolvido')
    agora.mockReturnValue(100600)
    a.documento.hidden = false; a.documento.dispatchEvent(new Event('visibilitychange')); vi.advanceTimersByTime(999)
    expect(a.b.userData.estado).toBe('resolvido'); vi.advanceTimersByTime(1)
    expect(a.b.userData.estado).toBe('trabalhando'); expect(a.frames.size).toBe(0); a.c.destruir()
  })
  it('segue o ponteiro com a cabeça, sem interferir no gesto; remove o ouvinte ao destruir', () => {
    const a = miniDe('contador')
    const head = a.b.children[0].children.find((m: any) => m.position.y === .5)
    const ev = Object.assign(new Event('pointermove'), { clientX: 303, clientY: 0 })
    a.canvas.dispatchEvent(ev); a.avancar(125, 1000)
    const seguindo = head.rotation.y
    a.canvas.dispatchEvent(new Event('pointerleave')); a.avancar(1025, 2000)
    expect(head.rotation.y).not.toBe(seguindo)
    const remover = vi.spyOn(a.canvas, 'removeEventListener'); a.c.destruir()
    expect(remover.mock.calls.some(([evento]) => evento === 'pointermove')).toBe(true)
  })
  it.each([false, true])('libera todo recurso inclusive em montagem interrompida: %s', falhar => {
    const a = ambiente(); a.o.mini = true; a.o.funcionarios = [{ id: 'guardado', sala: 'patrimonio', estado: 'trabalhando' }]
    const recursos: any[] = []
    for (const nome of ['BoxGeometry', 'CylinderGeometry', 'CircleGeometry', 'BufferGeometry', 'MeshLambertMaterial', 'MeshBasicMaterial'] as const) {
      const Original = a.T[nome]
      a.T[nome] = function (...args: any[]) { const r = new Original(...args); recursos.push(r); return r } as never
    }
    const converter = Three.BufferGeometry.prototype.toNonIndexed
    vi.spyOn(Three.BufferGeometry.prototype, 'toNonIndexed').mockImplementation(function (this: any) {
      const g = converter.call(this); recursos.push(g); return g
    })
    // Falha depois da atividade montada, como uma API de interação indisponível.
    if (falhar) a.T.Raycaster = class { constructor() { throw Error('depois das atividades') } } as never
    const disposes = vi.spyOn(Three.BufferGeometry.prototype, 'dispose')
    const materiais = vi.spyOn(Three.MeshLambertMaterial.prototype, 'dispose'), basicos = vi.spyOn(Three.MeshBasicMaterial.prototype, 'dispose')
    const instancias = vi.spyOn(InstancedMesh.prototype, 'dispose')
    let c: ReturnType<typeof montarCena> | undefined
    if (falhar) expect(() => a.montar()).toThrow('depois das atividades')
    else { c = a.montar(); a.frame(100); c.destruir() }
    const liberados = [...disposes.mock.instances, ...materiais.mock.instances, ...basicos.mock.instances]
    expect(new Set(liberados)).toEqual(new Set(recursos))
    expect(liberados.length).toBe(new Set(recursos).size)
    expect(recursos.some(r => r.type === 'CylinderGeometry')).toBe(true)
    expect(instancias).toHaveBeenCalledTimes(2)
    expect(a.frames.size).toBe(0); expect(a.renderer.dispose).toHaveBeenCalledTimes(1)
    c?.destruir()
  })
})
