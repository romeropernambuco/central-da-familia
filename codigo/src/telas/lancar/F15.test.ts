import { desfazer } from '../../api/desfazer'
import { BarraDesfazer } from '../../componentes/BarraDesfazer'
import { Fragment } from 'react'
import { act, createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { DocumentoTeste, NoTeste } from '../escritorio/numeros.dom-teste'
import { ContextoApp, type Ctx } from '../../app/contexto'
import { apiExemplo } from '../../api/exemplo'
import type { Api } from '../../api/tipos'
import { Casa } from '../casa/Casa'
const roots: Root[] = []
afterEach(async () => {
  await act(async () => desfazer.limpar())
  for (const r of roots.splice(0)) await act(async () => r.unmount())
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
const pendente = <T>() => {
  let resolver!: (v: T) => void
  let rejeitar!: (e: Error) => void
  const promessa = new Promise<T>((r, j) => {
    resolver = r
    rejeitar = j
  })
  return { promessa, resolver, rejeitar }
}
const props = (n: NoTeste) => Object.entries(n).find(([k]) => k.startsWith('__reactProps'))![1] as any
async function montar(el: ReactElement, api: Partial<Api> = {}, extra: Partial<Ctx> = {}) {
  const doc = new DocumentoTeste()
  Object.defineProperty(NoTeste.prototype, 'options', {
    configurable: true,
    get() {
      return this.childNodes
    },
  })
  Object.assign(NoTeste.prototype, {
    focus() {},
    closest() {
      return null
    },
    querySelectorAll() {
      return []
    },
  })
  Object.assign(doc.documentElement, { dataset: {} })
  vi.stubGlobal('document', doc)
  vi.stubGlobal(
    'window',
    Object.assign(new EventTarget(), { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {} }),
  )
  vi.stubGlobal('addEventListener', window.addEventListener.bind(window))
  vi.stubGlobal('removeEventListener', window.removeEventListener.bind(window))
  vi.stubGlobal('localStorage', {
    getItem() {
      return null
    },
    setItem() {},
  })
  vi.stubGlobal('location', { hash: '#/casa?sem3d', search: '?sem3d', origin: 'https://teste.invalid', pathname: '/' })
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  let ctx = {
    api: {
      ...apiExemplo,
      membros: async () => [],
      config: async (_f: string, _k: string, p: unknown) => p,
      escritorioHoje: async () => ({ funcionarios: [], entregue: [], trabalhando: [], precisa_de_voce: [] }),
      ...api,
    },
    familia: { id: 'a', papel: 'casal', nome: 'Teste' },
    resumo: null,
    sessao: null,
    versao: 0,
    toast() {},
    recarregar: async () => {},
    tentar: async (f: () => Promise<unknown>) => {
      try {
        await f()
        return true
      } catch {
        return false
      }
    },
    ...extra,
  } as Ctx
  const box = doc.createElement('div')
  doc.body.appendChild(box)
  const root = createRoot(box as unknown as HTMLElement)
  roots.push(root)
  const render = async (c: Partial<Ctx> = {}) => {
    ctx = { ...ctx, ...c }
    await act(async () =>
      root.render(
        createElement(
          ContextoApp.Provider,
          { value: ctx },
          createElement(Fragment, null, el, createElement(BarraDesfazer)),
        ),
      ),
    )
  }
  await render()
  const find = (tag: string, text: string) =>
    box.buscar(n => n.tagName === tag && (n.textContent === text || n.getAttribute('aria-label') === text))[0]
  const click = async (text: string) => {
    const b = find('BUTTON', text)
    expect(b, text).toBeDefined()
    await act(async () => b.click())
  }
  const change = async (label: string, value: string) => {
    const n = box.buscar(
      n =>
        n.tagName === 'INPUT' &&
        (n.getAttribute('aria-label') === label ||
          n.parentNode?.textContent.startsWith(label) ||
          n.getAttribute('placeholder') === label),
    )[0]
    expect(n, label).toBeDefined()
    await act(async () => props(n).onChange({ target: { value } }))
  }
  const submit = async (twice = false) => {
    const form = box.buscar(n => n.tagName === 'FORM')[0]
    await act(async () => {
      props(form).onSubmit({ preventDefault() {} })
      if (twice) props(form).onSubmit({ preventDefault() {} })
    })
  }
  return { box, render, click, change, submit, find, ctx }
}

import { Lancar } from './Lancar'
import { calcularImpactoDaCompra } from './parcelamento'
import { esconderValores } from '../../lib/formato'

it.each([
  [1, 120, '2026-11-15', 120],
  [2, 120, '2026-11-15', 60],
  [6, 100, '2026-11-15', 16.7],
  [12, 100.01, '2026-12-31', 0],
])('F15: prévia inteira e confirmação iguais em %sx, total %s, data %s', async (n, valor, hoje, conta) => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(hoje + 'T12:00:00-03:00'))
  const cartao: any = { id: 'c', nome: 'Cartão teste', dia_fechamento: 20, dia_vencimento: 25 }
  const resumo: any = {
    envelopes: [{ id: 'e', nome: 'Pessoal', escreve: true, regra: 'mensal', limite_mes: 1000, livre: 1000 }],
    dias_restantes: 15,
  }
  const toast = vi.fn(),
    lancar = vi.fn(async () => ({ lancamento: { id: 'l' }, resumo }))
  const a = await montar(createElement(Lancar), { cartoes: async () => [cartao], lancar } as any, {
    resumo,
    toast,
    lancarAberto: { valor },
    fecharLancar() {},
  })
  await a.click('Cartão teste')
  if (n > 1) await a.click(n + 'x')
  const calculo = calcularImpactoDaCompra(valor, n, hoje, hoje, cartao)
  expect(calculo.contaNoMes).toBe(conta)
  if (n > 1) expect(Math.round(calculo.simulacao.reduce((s, p) => s + p.valor, 0) * 100)).toBe(Math.round(valor * 100))
  const textos = a.box
    .buscar(e => e.tagName === 'P' && /parc-(fatura|impacto)/.test(e.getAttribute('class') || ''))
    .map(e => e.textContent)
    .join(' ')
  expect(textos).toBe(calculo.confirmacao)
  if (hoje === '2026-12-31') expect(textos).toContain('jan/27 a dez/27')
  esconderValores(true)
  try {
    await a.render({ oculto: true })
    expect(a.box.textContent).not.toMatch(/R\$\s*\d/)
    expect(a.box.textContent).not.toContain('Pessoal')
  } finally {
    esconderValores(false)
  }
  await a.render({ oculto: false })
  await a.click('Salvar em Pessoal')
  expect(toast.mock.calls[0][0]).toBe(textos)
  expect(textos).not.toContain('hoje não muda')
})

it.each(['Cheguei', 'Saí', 'Veio hoje', 'Troquei o gás hoje'])(
  'F15: %s cancela sem gravar e duplo toque grava só uma vez',
  async botao => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const casa: any = {
      hoje: '2026-11-15',
      lista: [],
      comprado: [],
      prestadores: [{ id: 'p', nome: 'Pessoa', servico: 'Jardim', dia: 0, proxima_visita: '2026-11-15' }],
      gas: { trocas: [] },
      presenca: { hoje: [], meu_ponto: botao === 'Saí' ? { chegou: '08:00' } : {} },
    }
    const resposta = pendente<any>(),
      marcar = vi.fn(() => resposta.promessa)
    const a = await montar(
      createElement(Casa),
      { casaDaEquipe: async () => casa, casaMarcar: marcar },
      { familia: { id: 'a', papel: 'equipe' } as any },
    )
    const tocar = props(a.find('BUTTON', botao)).onClick
    await act(async () => {
      tocar()
      tocar()
    })
    expect(marcar).not.toHaveBeenCalled()
    await act(async () => vi.advanceTimersByTime(5999))
    await a.click('Desfazer')
    await act(async () => vi.advanceTimersByTime(10))
    expect(marcar).not.toHaveBeenCalled()
    await act(async () => {
      tocar()
      tocar()
    })
    await act(async () => vi.advanceTimersByTime(6000))
    expect(marcar).toHaveBeenCalledTimes(1)
    await act(async () => {
      tocar()
      tocar()
      vi.advanceTimersByTime(7000)
    })
    expect(marcar).toHaveBeenCalledTimes(1)
    expect(a.box.textContent).not.toContain('R$')
    await act(async () => resposta.resolver(casa))
  },
)

it('F15: erro simples mantém miniatura, foto recebida e permite reenviar; olho protege a foto', async () => {
  const enviar = vi.fn().mockRejectedValueOnce(Error('rede')).mockResolvedValue({ aviso: 'Recebido' })
  const fechar = vi.fn(),
    storage = vi.fn(),
    log = vi.spyOn(console, 'log')
  vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: storage, removeItem() {} })
  const a = await montar(
    createElement(Lancar),
    { anotarCompraEquipe: enviar },
    { familia: { id: 'a', papel: 'equipe' } as any, sessao: { userId: 'u' } as any, fecharLancar: fechar },
  )
  await a.change('O que você comprou?', 'Feira')
  const criar = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) =>
    tag === 'canvas'
      ? { getContext: () => ({ fillRect() {}, drawImage() {} }), toDataURL: () => 'data:image/jpeg;base64,Zm90bw==' }
      : criar(tag)) as any)
  vi.stubGlobal('createImageBitmap', async () => ({ width: 100, height: 120, close() {} }))
  const input = a.box.buscar(e => e.tagName === 'INPUT' && e.getAttribute('type') === 'file')[0]
  await act(async () => props(input).onChange({ target: { files: [new Blob(['foto'])], value: '' } }))
  await a.click('Anotar a compra')
  expect(a.box.textContent).toContain('Não consegui enviar. Tente de novo')
  expect(a.box.textContent).toContain('Foto recebida')
  expect(a.box.buscar(e => e.tagName === 'IMG')).toHaveLength(1)
  expect(fechar).not.toHaveBeenCalled()
  esconderValores(true)
  try {
    await a.render({ oculto: true })
    expect(a.box.buscar(e => e.tagName === 'IMG')).toHaveLength(0)
    expect(a.box.textContent).not.toContain('R$')
    await a.render({ oculto: false })
  } finally {
    esconderValores(false)
  }
  expect(a.box.buscar(e => e.tagName === 'IMG')).toHaveLength(1)
  await a.click('Anotar a compra')
  expect(enviar.mock.calls[1][1].foto).toBe('Zm90bw==')
  expect(fechar).toHaveBeenCalledTimes(1)
  expect(JSON.stringify(storage.mock.calls)).not.toContain('Zm90bw==')
  expect(JSON.stringify(log.mock.calls)).not.toContain('Zm90bw==')
  log.mockRestore()
})
