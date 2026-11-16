import { act, createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { DocumentoTeste, NoTeste } from '../escritorio/numeros.dom-teste'
import { ContextoApp, type Ctx } from '../../app/contexto'
import { apiExemplo } from '../../api/exemplo'
import type { Api } from '../../api/tipos'
import { Casa } from './Casa'
import { CadastroAssessor } from './CadastroAssessor'
import { Entrar } from '../entrar/Entrar'
const roots: Root[] = []
afterEach(async () => { for (const r of roots.splice(0)) await act(async () => r.unmount()); vi.useRealTimers(); vi.unstubAllGlobals() })
const pendente = <T,>() => { let resolver!: (v: T) => void; let rejeitar!: (e: Error) => void; const promessa = new Promise<T>((r, j) => { resolver = r; rejeitar = j }); return { promessa, resolver, rejeitar } }
const props = (n: NoTeste) => Object.entries(n).find(([k]) => k.startsWith('__reactProps'))![1] as any
async function montar(el: ReactElement, api: Partial<Api> = {}, extra: Partial<Ctx> = {}) {
  const doc = new DocumentoTeste()
  Object.defineProperty(NoTeste.prototype, 'options', { configurable: true, get() { return this.childNodes } })
  Object.assign(NoTeste.prototype, { focus() {}, closest() { return null }, querySelectorAll() { return [] } })
  Object.assign(doc.documentElement, { dataset: {} })
  vi.stubGlobal('document', doc)
  vi.stubGlobal('window', Object.assign(new EventTarget(), { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {} }))
  vi.stubGlobal('localStorage', { getItem() { return null }, setItem() {} })
  vi.stubGlobal('location', { hash: '#/casa?sem3d', search: '?sem3d', origin: 'https://teste.invalid', pathname: '/' })
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  let ctx = { api: { ...apiExemplo, membros: async () => [], config: async (_f: string, _k: string, p: unknown) => p, escritorioHoje: async () => ({ funcionarios: [], entregue: [], trabalhando: [], precisa_de_voce: [] }), ...api }, familia: { id: 'a', papel: 'casal', nome: 'Teste' }, resumo: null, sessao: null, versao: 0, toast() {}, recarregar: async () => {}, tentar: async (f: () => Promise<unknown>) => { try { await f(); return true } catch { return false } }, ...extra } as Ctx
  const box = doc.createElement('div'); doc.body.appendChild(box)
  const root = createRoot(box as unknown as HTMLElement); roots.push(root)
  const render = async (c: Partial<Ctx> = {}) => { ctx = { ...ctx, ...c }; await act(async () => root.render(createElement(ContextoApp.Provider, { value: ctx }, el))) }
  await render()
  const find = (tag: string, text: string) => box.buscar(n => n.tagName === tag && (n.textContent === text || n.getAttribute('aria-label') === text))[0]
  const click = async (text: string) => { const b = find('BUTTON', text); expect(b, text).toBeDefined(); await act(async () => b.click()) }
  const change = async (label: string, value: string) => { const n = box.buscar(n => n.tagName === 'INPUT' && (n.getAttribute('aria-label') === label || n.parentNode?.textContent.startsWith(label) || n.getAttribute('placeholder') === label))[0]; expect(n, label).toBeDefined(); await act(async () => props(n).onChange({ target: { value } })) }
  const submit = async (twice = false) => { const form = box.buscar(n => n.tagName === 'FORM')[0]; await act(async () => { props(form).onSubmit({ preventDefault() {} }); if (twice) props(form).onSubmit({ preventDefault() {} }) }) }
  return { box, render, click, change, submit, find, ctx }
}

const casaTeste = (nome: string) => ({ hoje: '2026-11-15', lista: [{ id: nome, nome, ok: false }], comprado: [], prestadores: [], gas: { trocas: [] }, presenca: { hoje: [], meu_ponto: { chegou: nome } } })
it('entrada oferece Assessor da Casa sem lista de profissões', async () => {
  vi.stubGlobal('addEventListener', vi.fn()); vi.stubGlobal('removeEventListener', vi.fn())
  const a = await montar(createElement(Entrar))
  expect(a.box.textContent).toContain('Assessor da Casa')
  expect(a.box.textContent).toContain('Entrar com o convite da família')
  expect(a.box.textContent).not.toMatch(/cozinheira|motorista/i)
})
it('cadastro recusa nome vazio ou composto de espaços sem gravar', async () => {
  const salvarConfig = vi.fn(), fechar = vi.fn()
  const a = await montar(createElement(CadastroAssessor, { fechar }), { salvarConfig })
  await a.submit()
  expect(a.box.textContent).toContain('Informe o nome do Assessor da Casa.')
  await a.change('Nome do Assessor da Casa', '   ')
  await a.submit()
  expect(salvarConfig).not.toHaveBeenCalled()
  expect(fechar).not.toHaveBeenCalled()
  expect(a.find('INPUT', 'Nome do Assessor da Casa')?.getAttribute('required')).not.toBeNull()
})
it('cadastro salva nome, função e celular na configuração existente', async () => {
  const salvarConfig = vi.fn(), fechar = vi.fn()
  const a = await montar(createElement(CadastroAssessor, { fechar }), { salvarConfig })
  await a.change('Nome do Assessor da Casa', ' Lia Avelar ')
  await a.change('Função na casa', 'Cozinha')
  await a.change('Celular', '81900000003')
  await a.submit()
  expect(salvarConfig).toHaveBeenCalledWith('a', 'casa_folha', expect.objectContaining({ pessoas: [expect.objectContaining({ nome: 'Lia Avelar', funcao: 'Cozinha', celular: '81900000003' })] }))
  expect(fechar).toHaveBeenCalledOnce()
})
it.each([false, true])('Casa: troca de família oculta lista e presença antigas; falha=%s', async falha => {
  const p = pendente<any>(), familia = { id: 'a', nome: 'Teste', papel: 'equipe' as const, membroNome: 'Pessoa', envelopeId: null }
  const ler = vi.fn().mockResolvedValueOnce(casaTeste('ANTIGA')).mockImplementationOnce(() => p.promessa).mockResolvedValue(casaTeste('ATUAL'))
  const a = await montar(createElement(Casa), { casaDaEquipe: ler }, { familia })
  expect(a.box.textContent).toContain('ANTIGA')
  await a.render({ familia: { ...familia, id: 'b' } })
  expect(a.box.textContent).not.toContain('ANTIGA')
  expect(a.box.buscar(n => n.tagName === 'INPUT' && n.getAttribute('type') === 'checkbox')).toHaveLength(0)
  if (falha) {
    await act(async () => p.rejeitar(new Error('Falha da família atual')))
    expect(a.box.textContent).not.toContain('ANTIGA')
    expect(a.box.textContent).toContain('Falha da família atual')
    await a.click('Tentar novamente')
    expect(ler).toHaveBeenLastCalledWith('b')
  } else await act(async () => p.resolver(casaTeste('ATUAL')))
  expect(a.box.textContent).toContain('ATUAL')
  expect(a.box.textContent).not.toContain('ANTIGA')
})

