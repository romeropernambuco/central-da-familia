import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { Simulate } from 'react-dom/test-utils'
import { afterEach, expect, expectTypeOf, it, vi } from 'vitest'
import type { OpcoesIsometricas } from '../../telas/escritorio/cenaIsometrica'
import { DocumentoTeste, NoTeste } from '../../telas/escritorio/numeros.dom-teste'
import { carregarDadosInicio } from './dadosDeExemplo'
import { Escritorio3D, type PropsEscritorio3D } from './Escritorio3D'
import type { PropsEscritorioMaquete } from './EscritorioMaquete'
import { distribuirEtiquetas } from './escritorio3d-etiquetas'
import { POR_ID } from '../../telas/escritorio/equipe'
import { PrivacidadePropostas } from './privacidade'

const cena = vi.hoisted(() => ({
  montar: vi.fn(),
  atualizar: vi.fn(),
  destruir: vi.fn(),
  falhar: false,
}))
vi.mock('../../telas/escritorio/tres', () => ({}))
vi.mock('../../telas/escritorio/cenaIsometrica', () => ({
  montarEscritorioIsometrico: (_t: unknown, _el: HTMLElement, opcoes: OpcoesIsometricas) => {
    cena.montar(opcoes)
    if (cena.falhar) throw new Error('Contexto WebGL indisponível')
    opcoes.palco?.aoDesenhar()
    return { atualizar: cena.atualizar, destruir: cena.destruir }
  },
}))

const dados = await carregarDadosInicio()
const { funcionarios } = dados
const funcionario = funcionarios.valor!.find(f => f.id === 'contador')!
const valores = { [funcionario.id]: dados.aplicacoes.total }
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
  valores[funcionario.id].valor!,
)
const opcoes = (): OpcoesIsometricas => cena.montar.mock.lastCall![0]

function ambiente({ webGL = true, reduz = false } = {}) {
  const documento = new DocumentoTeste()
  const criar = documento.createElement.bind(documento)
  documento.createElement = nome => {
    const no = criar(nome)
    Object.assign(no.style, { setProperty() {} })
    return no
  }
  const preferencia = Object.assign(new EventTarget(), { matches: reduz })
  vi.stubGlobal('document', documento)
  vi.stubGlobal('window', {
    document: documento,
    HTMLElement: NoTeste,
    HTMLIFrameElement: class {},
    HTMLCanvasElement: NoTeste,
    WebGLRenderingContext: webGL ? class {} : undefined,
    matchMedia: () => preferencia,
  })
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('ResizeObserver', class {})
  vi.stubGlobal('requestAnimationFrame', vi.fn())
  const observar = vi.fn(),
    desconectar = vi.fn()
  let intersecao: (entradas: { isIntersecting: boolean }[]) => void
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: typeof intersecao) {
        intersecao = callback
      }
      observe = observar
      disconnect = desconectar
    },
  )
  const el = documento.createElement('div')
  documento.body.appendChild(el)
  const root = createRoot(el as unknown as HTMLElement)
  fechar = () => act(async () => root.unmount())
  const ler = (attr: string, valor: string) => el.buscar(n => n.getAttribute(attr) === valor)[0]
  return {
    el,
    ler,
    observar,
    desconectar,
    preferencia,
    render: (props: Partial<PropsEscritorio3D> = {}, olhoFechado = false) =>
      act(async () =>
        root.render(
          createElement(
            PrivacidadePropostas.Provider,
            { value: olhoFechado },
            createElement(Escritorio3D, { funcionarios, ...props }),
          ),
        ),
      ),
    mostrar: async (isIntersecting = true) => {
      await act(async () => intersecao([{ isIntersecting }]))
      await act(async () => vi.dynamicImportSettled())
    },
    apontar: () => act(async () => opcoes().palco?.aoApontar(funcionario.id)),
  }
}

let fechar: (() => Promise<void>) | undefined
afterEach(async () => {
  await fechar?.()
  fechar = undefined
  cena.falhar = false
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

it('renderiza o SVG no Node e preserva os postos quando o navegador não oferece WebGL', async () => {
  const html = renderToStaticMarkup(createElement(Escritorio3D, { funcionarios }))
  expect(html).toContain('data-renderizacao="svg"')
  expect(html.match(/data-funcionario=/g)).toHaveLength(19)

  const a = ambiente({ webGL: false })
  const selecionar = vi.fn()
  await a.render({ salaDestacada: 'patrimonio', onSelecionar: selecionar })
  expect(a.ler('data-renderizacao', 'svg')).toBeDefined()
  expect(a.ler('data-sala', 'patrimonio').getAttribute('data-destaque')).toBe('true')
  expect(a.el.buscar(n => n.tagName === 'BUTTON')).toHaveLength(3)
  expect(a.observar).not.toHaveBeenCalled()
  expect(cena.montar).not.toHaveBeenCalled()
})

it('mantém o esqueleto fora da tela e recua para SVG quando a criação do contexto falha', async () => {
  const a = ambiente()
  cena.falhar = true
  await a.render()
  await a.mostrar(false)
  expect(a.ler('role', 'status').textContent).toContain('Carregando escritório')
  expect(cena.montar).not.toHaveBeenCalled()
  await a.mostrar()
  expect(cena.montar).toHaveBeenCalledOnce()
  expect(a.ler('data-renderizacao', 'svg')).toBeDefined()
  expect(a.el.buscar(n => n.getAttribute('data-sala') !== null)).toHaveLength(7)
})

it('mascara o balão Three.js com a prop oculto ou com o olho da casca', async () => {
  const a = ambiente()
  await a.render({ valores })
  await a.mostrar()
  expect(a.el.textContent).not.toContain(moeda)
  await a.apontar()
  expect(a.el.textContent).toContain(moeda)
  for (const [oculto, olho] of [
    [true, false],
    [false, true],
  ]) {
    await a.render({ valores, oculto }, olho)
    expect(a.ler('aria-label', 'Valor oculto')).toBeDefined()
    expect(a.el.textContent).not.toContain(moeda)
    expect(a.ler('data-numero-financeiro', 'true')).toBeUndefined()
  }
  expect(cena.montar).toHaveBeenCalledOnce()
})

it('mostra o posto e seu estado ao Assessor, sem inserir valor ou máscara no balão', async () => {
  const a = ambiente()
  await a.render({ valores, papel: 'equipe', oculto: true })
  await a.mostrar()
  await a.apontar()
  expect(a.el.textContent).toContain(funcionario.nome)
  expect(a.ler('class', 'escritorio3d-valor')).toBeUndefined()
  expect(a.el.textContent).not.toContain(moeda)
  expect(a.ler('aria-label', 'Valor oculto')).toBeUndefined()
})

it('usa botão nativo para a ativação por teclado e entrega o mesmo registro pelo raycast', async () => {
  const a = ambiente()
  const selecionar = vi.fn()
  await a.render({ onSelecionar: selecionar })
  await a.mostrar()
  const posto = a.ler('data-posto', funcionario.id)
  expect(posto.tagName).toBe('BUTTON')
  expect(posto.getAttribute('type')).toBe('button')
  expect(posto.getAttribute('tabindex')).toBeNull()
  expect(posto.getAttribute('aria-label')).toContain(funcionario.nome)
  expect(posto.textContent).toBe('')
  await act(async () => Simulate.focus(posto as unknown as HTMLElement))
  expect(a.el.textContent).toContain(funcionario.nome)
  // Enter e Espaço acionam click no botão nativo. O DOM mínimo entrega esse evento ao React.
  await act(async () => posto.click())
  await act(async () => opcoes().aoTocar(funcionario.id))
  expect(selecionar.mock.calls).toEqual([[funcionario], [funcionario]])
})

it('deixa o palco sem iniciais e usa uma única etiqueta para hover, foco e seleção', async () => {
  const a = ambiente()
  await a.render({ mostrarPlaquinhas: true })
  await a.mostrar()
  const postos = a.el.buscar(n => n.getAttribute('data-posto') !== null)
  expect(postos).toHaveLength(19)
  expect(postos.every(p => p.textContent === '')).toBe(true)
  const etiqueta = a.ler('class', 'escritorio3d-detalhe')
  expect(etiqueta.textContent).not.toContain(funcionario.nome)
  await a.apontar()
  expect(etiqueta.textContent).toContain(funcionario.nome)
  expect(etiqueta.textContent).toContain(POR_ID[funcionario.id].papel)
  const outro = postos.find(p => p.getAttribute('data-posto') !== funcionario.id)!
  await act(async () => Simulate.focus(outro as unknown as HTMLElement))
  expect(etiqueta.textContent).not.toContain(funcionario.nome)
  await act(async () => Simulate.blur(outro as unknown as HTMLElement))
  expect(etiqueta.textContent).not.toContain(funcionario.nome)
  await act(async () => a.ler('data-posto', funcionario.id).click())
  expect(etiqueta.textContent).toContain(funcionario.nome)
  expect(a.el.buscar(n => n.getAttribute('class') === 'escritorio3d-detalhe')).toHaveLength(1)
})

it('pagina as sete salas com botões nativos e mantém os 19 postos acessíveis sem remontar', async () => {
  const a = ambiente()
  await a.render({ completo: false })
  await a.mostrar()
  const anterior = a.ler('aria-label', 'Sala anterior')
  const proxima = a.ler('aria-label', 'Próxima sala')
  for (const botao of [anterior, proxima]) {
    expect(botao.tagName).toBe('BUTTON')
    expect(botao.getAttribute('tabindex')).toBeNull()
  }
  const ids = new Set<string>()
  for (let i = 0; i < 7; i++) {
    const postos = a.el.buscar(n => n.getAttribute('data-posto') !== null)
    expect(postos.length).toBeGreaterThan(0)
    expect(postos.every(p => p.tagName === 'BUTTON' && p.textContent === '')).toBe(true)
    postos.forEach(p => ids.add(p.getAttribute('data-posto')!))
    await act(async () => proxima.click())
  }
  expect(ids).toEqual(new Set(funcionarios.valor!.map(f => f.id)))
  await act(async () => anterior.click())
  expect(cena.atualizar).toHaveBeenLastCalledWith(opcoes().estados, 'tudo', 'apoio')
  expect(cena.montar).toHaveBeenCalledOnce()
})

it('mantém a identificação sob demanda e o olho no fallback sem as plaquinhas legadas', async () => {
  const a = ambiente({ reduz: true })
  const selecionar = vi.fn()
  await a.render({ mostrarPlaquinhas: true, valores, onSelecionar: selecionar }, true)
  expect(a.ler('class', 'maquete-placa maquete-rotulo')).toBeUndefined()
  expect(a.el.textContent).not.toContain(funcionario.nome)
  const posto = a.el.buscar(
    n => n.tagName === 'BUTTON' && n.getAttribute('aria-label')?.includes(funcionario.nome) === true,
  )[0]
  await act(async () => Simulate.focus(posto as unknown as HTMLElement))
  expect(a.el.textContent).toContain(POR_ID[funcionario.id].papel)
  expect(a.ler('aria-label', 'Valor oculto')).toBeDefined()
  expect(a.el.textContent).not.toContain(moeda)
  await act(async () => posto.click())
  expect(selecionar.mock.calls).toEqual([[funcionario]])
  await a.render({ mostrarPlaquinhas: true, valores, papel: 'equipe', onSelecionar: selecionar }, true)
  expect(a.ler('aria-label', 'Valor oculto')).toBeUndefined()
  expect(a.el.textContent).not.toContain(moeda)
})

it('expõe todos os postos na vista geral WebGL, encaminha a seleção e protege o valor sob demanda', async () => {
  const a = ambiente()
  const onSelecionar = vi.fn()
  await a.render({ panorama: true, salaDestacada: 'apoio', valores, onSelecionar })
  await a.mostrar()
  expect(opcoes().palco?.panorama).toBe(true)
  expect(opcoes().vista).toBe('tudo')
  const postos = a.el.buscar(n => n.getAttribute('data-posto') !== null)
  expect(postos.map(n => n.getAttribute('data-posto'))).toEqual(funcionarios.valor!.map(f => f.id))
  expect(postos.every(n => n.textContent === '')).toBe(true)
  expect(a.ler('aria-label', 'Próxima sala')).toBeUndefined()
  await act(async () => opcoes().aoTocar(funcionario.id))
  expect(onSelecionar.mock.calls).toEqual([[funcionario]])
  expect(a.el.textContent).toContain(moeda)
  await a.render({ panorama: true, valores, onSelecionar }, true)
  expect(a.el.textContent).not.toContain(moeda)
  expect(a.ler('aria-label', 'Valor oculto')).toBeDefined()
})

it('encerra a observação e descarta a cena ao desmontar', async () => {
  const a = ambiente()
  const removerPreferencia = vi.spyOn(a.preferencia, 'removeEventListener')
  await a.render()
  await a.mostrar()
  expect(a.ler('data-renderizacao', '3d')).toBeDefined()
  await fechar!()
  fechar = undefined
  expect(a.desconectar).toHaveBeenCalled()
  expect(removerPreferencia).toHaveBeenCalledWith('change', expect.any(Function))
  expect(cena.destruir).toHaveBeenCalledOnce()
})

it('reserva 44 px para cada um dos 19 postos mesmo quando várias projeções coincidem', () => {
  const postos = funcionarios.valor!.map(({ id }, i) => ({ id, x: 243, y: 150, chama: i === 6 }))
  const layout = distribuirEtiquetas(postos, 478, 208)
  expect(layout.size).toBe(postos.length)
  expect(layout.get(postos[6].id)).toEqual({ x: 243, y: 150 })
  const posicoes = [...layout.values()]
  for (const [i, p] of posicoes.entries()) {
    expect(p.x).toBeGreaterThanOrEqual(22)
    expect(p.x).toBeLessThanOrEqual(478 - 22)
    expect(p.y).toBeGreaterThanOrEqual(22)
    expect(p.y).toBeLessThanOrEqual(208 - 22)
    expect(posicoes.slice(i + 1).every(q => Math.abs(p.x - q.x) >= 44 || Math.abs(p.y - q.y) >= 44)).toBe(true)
  }
})

it('usa o SVG estático em movimento reduzido, inclusive se a preferência mudar com a cena aberta', async () => {
  const a = ambiente({ reduz: true })
  await a.render()
  expect(a.ler('data-renderizacao', 'svg')).toBeDefined()
  expect(a.observar).not.toHaveBeenCalled()
  const reduzir = (valor: boolean) =>
    act(async () => {
      a.preferencia.matches = valor
      a.preferencia.dispatchEvent(new Event('change'))
    })
  await reduzir(false)
  await a.mostrar()
  expect(a.ler('data-renderizacao', '3d')).toBeDefined()
  await reduzir(true)
  expect(a.ler('data-renderizacao', 'svg')).toBeDefined()
  expect(cena.destruir).toHaveBeenCalledOnce()
})

it('mantém a API da maquete e aplica altura, variante, estados e foco de sala', async () => {
  expectTypeOf<PropsEscritorio3D>().toMatchTypeOf<PropsEscritorioMaquete & { altura?: number }>()
  expectTypeOf<PropsEscritorioMaquete & { altura?: number }>().toMatchTypeOf<PropsEscritorio3D>()
  expect(renderToStaticMarkup(createElement(Escritorio3D, { funcionarios, altura: 320 }))).toContain(
    '--escritorio3d-altura:320px',
  )

  const a = ambiente()
  await a.render({ variante: 'compacta' })
  await a.mostrar()
  expect(opcoes().palco?.variante).toBe('compacta')
  expect(opcoes().palco?.elenco.map(m => m.id)).toEqual(funcionarios.valor!.map(f => f.id))
  expect(opcoes().estados[funcionario.id]).toBe(funcionario.estadoHoje.valor ?? undefined)
  await a.render({ variante: 'compacta', salaDestacada: 'patrimonio' })
  expect(cena.atualizar).toHaveBeenLastCalledWith(opcoes().estados, 'patrimonio', 'patrimonio')
  expect(a.el.buscar(n => n.getAttribute('data-posto') !== null)).toHaveLength(3)
  expect(cena.montar).toHaveBeenCalledOnce()
})
