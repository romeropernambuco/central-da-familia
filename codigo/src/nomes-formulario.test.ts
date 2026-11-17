import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { DocumentoTeste, NoTeste } from './telas/escritorio/numeros.dom-teste'
import { ContextoApp, type Ctx } from './app/contexto'
import { NomeDaPessoa } from './componentes/NomeDaPessoa'
import { apiExemplo, reiniciarExemplo } from './api/exemplo'
import { useEscritorio } from './app/useDados2'
import type { Api, PessoaNome } from './api/tipos'

let root: Root | undefined
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; vi.unstubAllGlobals(); vi.useRealTimers() })
const props = (n: NoTeste) => (n as unknown as Record<string, any>)[Object.keys(n).find(k => k.startsWith('__reactProps'))!]
async function montar(pessoa: PessoaNome, api: Api, oculto = false) {
  const doc = new DocumentoTeste()
  Object.assign(NoTeste.prototype, { focus() {}, closest() { return null }, querySelectorAll() { return [] } })
  Object.assign(doc.documentElement, { dataset: {} })
  vi.stubGlobal('document', doc)
  vi.stubGlobal('window', Object.assign(new EventTarget(), { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {} }))
  vi.stubGlobal('addEventListener', window.addEventListener.bind(window))
  vi.stubGlobal('removeEventListener', window.removeEventListener.bind(window))
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const sessao = (await api.sessao())!
  const box = doc.createElement('div'); doc.body.appendChild(box)
  root = createRoot(box as unknown as HTMLElement)
  function Fala() { const { e } = useEscritorio(); return createElement('output', {}, JSON.stringify(e)) }
  function App() {
    const [s, setS] = useState(sessao), [versao, mudar] = useState(0)
    const ctx = { api, sessao: s, familia: s.familias[0], versao, oculto,
      recarregar: async () => { mudar(x => x + 1) }, trocarSessao: async () => { setS((await api.sessao())!) }, tentar: async (f: () => Promise<unknown>) => { await f(); return true }, toast() {},
    } as unknown as Ctx
    return createElement(ContextoApp.Provider, { value: ctx }, createElement(NomeDaPessoa, { pessoa, editar: true }), createElement(Fala))
  }
  await act(async () => { root!.render(createElement(App)); await new Promise(r => setTimeout(r, 100)) })
  const esperar = async () => { await act(async () => { await new Promise(r => setTimeout(r, 150)) }) }
  await esperar()
  const clicar = async (texto: string) => {
    const b = box.buscar(n => n.tagName === 'BUTTON' && n.textContent === texto)[0]
    expect(b, texto).toBeDefined(); await act(async () => b.click())
  }
  return { box, clicar, esperar,
    preencher: async (nome: string) => { const n = box.buscar(n => n.tagName === 'INPUT')[0]; await act(async () => props(n).onChange({ target: { value: nome } })) },
    salvar: async () => { const form = box.buscar(n => n.tagName === 'FORM')[0]; await act(async () => { await props(form).onSubmit({ preventDefault() {} }) }); await esperar() },
  }
}
it('salva pela folha: lista e fala viva usam nome novo sem recarregar página', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-16T12:00:00-03:00'))
  reiniciarExemplo()
  const a = await montar({ tipo: 'membro', id: 'm-ana', nome: 'Ana' }, apiExemplo)
  await a.clicar('Editar nome')
  await a.preencher('  Marina  ')
  await a.salvar()
  expect(a.box.textContent).toContain('Marina')
  expect(a.box.buscar(n => n.tagName === 'OUTPUT')[0].textContent).toContain('Marina')
  expect((await apiExemplo.membros('fam-silva')).find(m => m.id === 'm-ana')?.nome).toBe('Marina')
})
it('falha de membros mostra tentativa e recupera a lista, sem pessoa genérica', async () => {
  reiniciarExemplo()
  let falhar = true
  const api = { ...apiExemplo, membros: async (f: string) => { if (falhar) throw new Error('offline'); return apiExemplo.membros(f) } }
  const a = await montar({ tipo: 'membro', id: 'm-bruno' }, api)
  expect(a.box.textContent).toContain('Não foi possível carregar os nomes')
  expect(a.box.textContent).not.toContain('Sem nome.')
  falhar = false; await a.clicar('Tentar de novo'); await a.esperar()
  expect(a.box.textContent).toContain('Bruno')
})
it('cadastro de assessor no real usa configuração existente e preserva salário fora do formulário', async () => {
  reiniciarExemplo()
  const salvarConfig = vi.fn(async () => {})
  const api = { ...apiExemplo, modo: 'real' as const, salvarNomePessoa: undefined, salvarConfig,
    config: async () => ({ pessoas: [{ id: 'a', nome: '', funcao: '', salario: 12345 }], daePaga: { mes: true } }) as any }
  const a = await montar({ tipo: 'assessor', id: 'a', nome: '' }, api)
  await a.clicar('Informar')
  const form = a.box.buscar(n => n.tagName === 'FORM')[0]
  expect(form.textContent).not.toContain('12345')
  expect(form.textContent).not.toContain('Salário')
  await a.preencher('Lia'); await a.salvar()
  expect(salvarConfig).toHaveBeenCalledWith(expect.any(String), 'casa_folha', { pessoas: [{ id: 'a', nome: 'Lia', funcao: '', salario: 12345 }], daePaga: { mes: true } })
})
