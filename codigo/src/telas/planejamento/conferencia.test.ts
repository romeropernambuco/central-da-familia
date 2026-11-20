import { act, createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { DocumentoTeste, NoTeste } from '../escritorio/numeros.dom-teste'
import { ContextoApp, type Ctx } from '../../app/contexto'
import { apiExemplo } from '../../api/exemplo'
import type { Api } from '../../api/tipos'
import { Recebimentos } from './Recebimentos'
const falso = vi.hoisted(() => ({ cliente: {} as any }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => new Proxy({}, { get: (_t, k) => falso.cliente[k] }) }))
import { apiReal } from '../../api/real'
const roots: Root[] = []
afterEach(async () => {
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
    await act(async () => root.render(createElement(ContextoApp.Provider, { value: ctx }, el)))
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

function bancoFalso() {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://teste.invalid')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'falso')
  const linhas: any[] = []
  let leituras = 0
  const segunda = pendente<any>()
  // Também permite executar contra o código antigo, que nem inicia a conferência.
  void segunda.promessa.catch(() => {})
  const insert = vi.fn(async (r: any) => {
    linhas.push({ ...r, criado_em: new Date(Date.now() + 1).toISOString() })
    throw new TypeError('Failed to fetch')
  })
  falso.cliente = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u' } } } }) },
    from: (t: string) => {
      const q: any = {
        select: () => q,
        eq: () => q,
        is: () => q,
        maybeSingle: async () => ({ data: { id: 'dono' }, error: null }),
        insert,
        then: (ok: any, ruim: any) => {
          leituras++
          return (leituras === 1 ? segunda.promessa : Promise.resolve({ data: linhas, error: null })).then(ok, ruim)
        },
      }
      expect(['membros', 'recebimentos']).toContain(t)
      return q
    },
  }
  return { linhas, insert, segunda }
}
afterEach(() => vi.unstubAllEnvs())

it('API real + formulário: gravação com resposta perdida confere antes da nova tentativa e termina com um registro', async () => {
  const b = bancoFalso(),
    toast = vi.fn()
  const a = await montar(
    createElement(Recebimentos),
    { recebimentos: async () => [], recebimentoCriar: apiReal.recebimentoCriar },
    { toast },
  )
  await a.click('Recebimento')
  await a.change('O que é', 'Contrato')
  await a.change('Quanto entra', '5000')
  await a.submit()
  expect(a.box.textContent).toContain('Aguardando conferência')
  expect(props(a.find('BUTTON', 'Anotar')).disabled).toBe(true)
  await a.submit(true)
  expect(b.insert).toHaveBeenCalledTimes(1)
  await act(async () => b.segunda.resolver({ data: b.linhas, error: null }))
  expect(toast).toHaveBeenCalledWith('Já estava salvo')
  expect(a.find('BUTTON', 'Anotar')).toBeUndefined()
  expect(b.linhas).toHaveLength(1)
})

it('conferência que falha mantém envio bloqueado; só lista confirmada sem correspondência libera nova tentativa', async () => {
  const b = bancoFalso()
  const a = await montar(createElement(Recebimentos), {
    recebimentos: async () => [],
    recebimentoCriar: apiReal.recebimentoCriar,
  })
  await a.click('Recebimento')
  await a.change('O que é', 'Contrato')
  await a.change('Quanto entra', '5000')
  await a.submit()
  await act(async () => b.segunda.rejeitar(new TypeError('Failed to fetch')))
  await a.submit()
  expect(b.insert).toHaveBeenCalledTimes(1)
  expect(props(a.find('BUTTON', 'Anotar')).disabled).toBe(true)
  b.linhas.length = 0
  await a.click('Conferir novamente')
  expect(a.box.textContent).toContain('Não encontrei na lista. Pode tentar de novo.')
  expect(props(a.find('BUTTON', 'Anotar')).disabled).toBe(false)
  await a.submit()
  expect(b.insert).toHaveBeenCalledTimes(2)
  expect(b.linhas).toHaveLength(1)
})

it.each([
  ['registro idêntico de outro envio (id diferente) não conta como salvo', { id: 'outro-id' }, false],
  [
    'o próprio registro conta como salvo mesmo com o relógio do aparelho adiantado',
    { criado_em: '2000-01-01T00:00:00Z' },
    true,
  ],
])('API real: %s', async (_nome, mudanca, esperado) => {
  const b = bancoFalso()
  const r = { descricao: 'Contrato', valor: 12.34, mes_previsto: '2026-12', tipo: 'contrato' as const, certo: true }
  const e = await apiReal.recebimentoCriar!('a', r).catch(e => e)
  expect(e.name).toBe('ErroRede')
  expect(e.conferir).toBeTypeOf('function')
  expect(b.linhas[0].id).toMatch(/^[0-9a-f-]{36}$/)
  b.segunda.resolver({ data: [{ ...b.linhas[0], ...mudanca }], error: null })
  expect(await e.conferir()).toBe(esperado)
  expect(b.insert).toHaveBeenCalledTimes(1)
})
