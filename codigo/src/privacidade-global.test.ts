import { AgenteDaAba, AGENTE_POR_ABA } from './componentes/AgenteDaAba'
﻿import { act, createElement, useState, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { ContextoApp, type Ctx } from './app/contexto'
import { esconderValores } from './lib/formato'
import { apiExemplo } from './api/exemplo'
import type { Api } from './api/tipos'
import { DocumentoTeste, NoTeste } from './telas/escritorio/numeros.dom-teste'
import { PerguntaCard } from './componentes/Pergunta'
import { Privacidade } from './telas/privacidade/Privacidade'
import { copiarProtegido } from './componentes/privacidade'
import { App as AppReal } from './app/App'
import { Provedor } from './app/contexto'

const modulos = import.meta.glob('./telas/**/*.tsx', { eager: true }) as Record<string, Record<string, ComponentType<any>>>
const telas = ['Inicio', 'Entrar', 'PrimeiroUso', 'Cartoes', 'Casa', 'Desejos', 'Guardado', 'Imoveis', 'FolhaImovel', 'Ajustes', 'Painel', 'Lancar', 'Lancamentos', 'MeuOrcamento', 'Planejamento', 'Parametros', 'Reajuste', 'Recebimentos', 'Privacidade', 'Escritorio', 'NumerosAba', 'FichaFuncionario', 'CartaoGuardado', 'PrecisaDeVoce', 'Cena3D']
const segredo = 'NomeSentinelaPrivado'
const dinheiro = 9876.54
const rotasAgentes = ['inicio', 'lancamentos', 'cartoes', 'casa', 'desejos', 'guardado', 'planejamento', 'orcamento', 'painel', 'ajustes', 'privacidade', 'escritorio']
const padrao = /NomeSentinelaPrivado|9876|9\.876|876,54/
function semear(v: unknown, k = ''): any {
  if (typeof v === 'string' && /^(nome|membroNome|titular|dono|dono_nome|apelido|descricao|pergunta|contexto|frase|assunto|resposta|respondido_por|banco|email|titular_nome|funcao|servico|categoria)$/.test(k)) return segredo + String(v)
  if (typeof v === 'number' && /valor|saldo|total|limite|salario|colchao|livre|rendeu/.test(k)) return dinheiro
  if (Array.isArray(v)) return v.map(x => semear(x))
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([ch, x]) => [ch, semear(x, ch)]))
  return v
}
function html(n: NoTeste): string { return [n.textContent, ...[...n.atributos].flat(), (n as any).value || '', ...n.childNodes.map(html)].join(' ') }
function vazamentos(n: NoTeste): string[] { return n.buscar(x => padrao.test([x.nodeValue, ...[...x.atributos].flat(), (x as any).value || ''].join(' '))).map(x => [x.nodeName, x.nodeValue, ...[...x.atributos].flat(), (x as any).value || ''].join(' ')) }
function ambiente() {
  Object.defineProperty(NoTeste.prototype, 'options', { configurable: true, get() { return this.buscar((n: NoTeste) => n.tagName === 'OPTION') } })
  const doc = new DocumentoTeste()
  Object.assign(NoTeste.prototype, { focus() {}, closest() { return null }, querySelectorAll() { return [] }, getBoundingClientRect() { return { width: 800, height: 400 } } })
  Object.assign(doc.documentElement, { dataset: {} })
  vi.stubGlobal('document', doc)
  vi.stubGlobal('window', { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {}, innerWidth: 1200, addEventListener() {}, removeEventListener() {}, confirm: vi.fn(() => false) })
  vi.stubGlobal('Element', NoTeste)
  vi.stubGlobal('location', { hash: '#/escritorio?aba=hoje&sem3d=1', search: '', origin: 'https://exemplo.test', pathname: '/' })
  vi.stubGlobal('addEventListener', () => {}); vi.stubGlobal('removeEventListener', () => {})
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal('localStorage', { getItem() { return null }, setItem() {} })
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('navigator', { onLine: true, clipboard: { writeText: vi.fn(async () => {}) } })
  return doc
}

describe('regra do olho em cada tela real', () => {
  it('cada tela: HTML completo, fechado → aberto → fechado sem remontar', async () => {
   expect(Object.entries(modulos).filter(([, m]) => !telas.some(nome => m[nome])).map(([arquivo]) => arquivo)).toEqual([])
   for (const nome of [...telas, ...rotasAgentes.map(r => 'Agente:' + r)]) {
    const doc = ambiente()
    const container = doc.createElement('div'); doc.body.appendChild(container)
    const root = createRoot(container as unknown as HTMLElement)
    const api = Object.fromEntries(Object.entries(apiExemplo).map(([k, v]) => [k, typeof v === 'function' ? async (...args: unknown[]) => semear(await (v as Function)(...args)) : v])) as unknown as Api
    const sessao = { ...semear(await apiExemplo.sessao()), dono: true }
    const familia = sessao.familias[0]
    const resumo = semear(await apiExemplo.resumoHoje(familia.id))
    const escritorio = semear(await apiExemplo.escritorioHoje!(familia.id))
    const imoveis = semear(await apiExemplo.imoveis!(familia.id))
    const Tela = nome.startsWith('Agente:') ? AgenteDaAba : Object.values(modulos).find(m => m[nome])![nome]
    const props = nome.startsWith('Agente:') ? { rota: nome.slice(7) } : nome === 'Cena3D' ? { funcionarios: escritorio.funcionarios, selecionado: null, aoTocar() {} } : nome === 'FichaFuncionario' ? { f: escritorio.funcionarios[0], e: escritorio, responder: async () => true, fechar() {} }
      : nome === 'FolhaImovel' ? { inicial: imoveis[0], fechar() {}, salvar: async () => true, tirar() {} }
      : nome === 'Reajuste' ? { envelopes: resumo.envelopes, mudaLimite: () => true }
      : nome === 'NumerosAba' ? { id: 'analista', fechar() {} } : { aplicado: dinheiro }
    let alternar: () => void = () => {}
    function App() {
      const [oculto, setOculto] = useState(true)
      esconderValores(oculto)
      alternar = () => setOculto(o => !o)
      const ctx = { api, sessao, familia, resumo, versao: 0, oculto, alternarOculto: alternar, lancarAberto: { corrigir: { id: 'l', descricao: segredo, valor: dinheiro, data: '2026-11-15', envelope_id: resumo.envelopes[0].id } },
        toast() {}, tentar: async (f: () => Promise<unknown>) => { await f(); return true }, recarregar: async () => {}, trocarSessao: async () => {}, sair: async () => {}, explicar() {}, abrirLancar() {}, fecharLancar() {}, semRede: false, erro: null } as unknown as Ctx
      return createElement(ContextoApp.Provider, { value: ctx }, createElement(Tela as ComponentType<any>, props))
    }
    try {
      await act(async () => root.render(createElement(App)))
      await act(async () => { await new Promise(r => setTimeout(r, 700)) })
      expect(vazamentos(container), nome).toEqual([])
      if (nome.startsWith('Agente:')) {
        await act(async () => container.buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Conversar e abrir tarefas')[0].click())
        await act(async () => { await new Promise(r => setTimeout(r, 400)) })
        expect(vazamentos(container), nome + ' tarefas abertas').toEqual([])
      }
      if (nome === 'Guardado') {
        const aplicacoes = container.buscar(n => n.tagName === 'BUTTON' && n.getAttribute('class') === 'li')
        expect(aplicacoes.length).toBeGreaterThan(0)
        for (const botao of aplicacoes) { await act(async () => botao.click()); expect(vazamentos(container), 'Ficha da aplicação').toEqual([]) }
      }
      if (nome === 'Casa') {
        for (const aba of ['Serviços', 'Folha', 'Gás', 'Feira']) {
          await act(async () => container.buscar(n => n.tagName === 'BUTTON' && n.textContent === aba)[0].click())
          await act(async () => { await new Promise(r => setTimeout(r, 150)) })
          expect(vazamentos(container), 'Casa: ' + aba).toEqual([])
        }
      }
      await act(async () => alternar())
      const aberto = html(container)
      if (nome.startsWith('Agente:')) { expect(container.buscar(n => n.getAttribute('data-agente') === AGENTE_POR_ABA[nome.slice(7)]).length).toBe(1); expect(aberto).toContain('Em lista') }
      // Algumas telas iniciais são formulários vazios e não apresentam dados privados.
      if (!nome.startsWith('Agente:') && !['Entrar', 'PrimeiroUso', 'Privacidade', 'Parametros', 'Reajuste', 'Cena3D'].includes(nome)) expect(aberto, nome + ' deve exercitar dados privados').toMatch(padrao)
      await act(async () => alternar())
      expect(html(container).match(padrao), nome).toBeNull()
    } finally { await act(async () => root.unmount()); esconderValores(false); vi.unstubAllGlobals() }
   }
  }, 60000)
})

it('clipboard fechado usa versão segura e bloqueia sem ela; aberto devolve original', async () => {
  ambiente()
  const aviso = vi.fn()
  try {
    const doc = document as unknown as DocumentoTeste
    const container = doc.createElement('div'); doc.body.appendChild(container)
    const root = createRoot(container as unknown as HTMLElement)
    esconderValores(true)
    try {
      await act(async () => root.render(createElement(ContextoApp.Provider, { value: { oculto: true, familia: { papel: 'casal' } } as Ctx },
        createElement(PerguntaCard, { p: { id: 'prestador', funcionario: 'secretaria', pergunta: segredo, mensagem: segredo, opcoes: [{ id: 'copiar', rotulo: 'Copiar mensagem' }] } as any, quem: 'Secretaria', responder: async () => ({ mensagem: segredo }) }))))
      await act(async () => container.buscar(n => n.tagName === 'BUTTON')[0].click())
      expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith('Conteúdo oculto.')
      expect(vazamentos(container)).toEqual([])
      const props = { p: { id: 'prestador', funcionario: 'secretaria', pergunta: segredo, mensagem: segredo, opcoes: [{ id: 'copiar', rotulo: 'Copiar mensagem' }] } as any, quem: 'Secretaria', responder: async () => ({ mensagem: segredo }) }
      for (const oculto of [false, true]) {
        esconderValores(oculto)
        await act(async () => root.render(createElement(ContextoApp.Provider, { value: { oculto, familia: { papel: 'casal' } } as Ctx }, createElement(PerguntaCard, props))))
        if (oculto) expect(vazamentos(container)).toEqual([])
        else expect(container.buscar(n => n.getAttribute('role') === 'status')[0].textContent).toContain(segredo)
      }
    } finally { await act(async () => root.unmount()); esconderValores(false) }
    vi.mocked(navigator.clipboard.writeText).mockClear()
    expect(await copiarProtegido(segredo, undefined, aviso, true)).toBe(false)
    expect(aviso).toHaveBeenCalled()
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled()
    expect(await copiarProtegido(segredo, 'Conteúdo oculto.', aviso, true)).toBe(true)
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith('Conteúdo oculto.')
    expect(await copiarProtegido(segredo, undefined, aviso, false)).toBe(true)
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(segredo)
  } finally { vi.unstubAllGlobals() }
})

it('guarda estática: decimal e number só nas primitivas; nenhum clipboard direto nas telas', () => {
  const fontes = import.meta.glob(['./telas/**/*.tsx', './app/**/*.tsx', './componentes/**/*.tsx'], { eager: true, query: '?raw', import: 'default' }) as Record<string, string>
  for (const [arquivo, fonte] of Object.entries(fontes)) {
    if (/componentes\/(base|privacidade)\.tsx$/.test(arquivo)) continue
    expect.soft(fonte, arquivo).not.toMatch(/<input\b[^>]*(?:inputMode\s*=\s*["']decimal["']|type\s*=\s*["']number["'])/)
    expect(fonte, arquivo).not.toMatch(/navigator\.clipboard\.writeText/)
    expect(fonte, arquivo).not.toMatch(/>\s*\{familia\.(nome|membroNome)\}/)
  }
})

it('exportação exige confirmação fechada, permite arquivo integral e retira JSON ao fechar o olho', async () => {
  const doc = ambiente()
  const container = doc.createElement('div'); doc.body.appendChild(container)
  const root = createRoot(container as unknown as HTMLElement)
  const exportarFamilia = vi.fn(async () => ({ nome: segredo, valor: dinheiro }))
  const blobUrl = vi.fn((_blob: Blob) => 'blob:exportacao')
  vi.stubGlobal('URL', { createObjectURL: blobUrl, revokeObjectURL() {} })
  let alternar = () => {}
  function App() {
    const [oculto, setOculto] = useState(true)
    alternar = () => setOculto(o => !o)
    esconderValores(oculto)
    return createElement(ContextoApp.Provider, { value: { oculto, familia: { id: 'f', papel: 'casal', nome: segredo }, api: { modo: 'exemplo', membros: async () => [], exportarFamilia }, toast() {} } as unknown as Ctx }, createElement(Privacidade))
  }
  const baixar = () => container.buscar(n => n.tagName === 'BUTTON' && n.textContent.includes('Baixar'))[0].click()
  try {
    await act(async () => root.render(createElement(App)))
    await act(async () => baixar())
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Os valores aparecerão no arquivo'))
    expect(exportarFamilia).not.toHaveBeenCalled()
    vi.mocked(window.confirm).mockReturnValue(true)
    await act(async () => baixar())
    expect(exportarFamilia).toHaveBeenCalledTimes(1)
    expect(await blobUrl.mock.calls[0][0].text()).toContain(segredo)
    expect(await blobUrl.mock.calls[0][0].text()).toContain(String(dinheiro))
    expect(vazamentos(container)).toEqual([])
    expect(container.buscar(n => n.tagName === 'TEXTAREA')).toHaveLength(0)
    await act(async () => alternar())
    await act(async () => baixar())
    expect(html(container)).toMatch(padrao)
    await act(async () => alternar())
    expect(vazamentos(container)).toEqual([])
    expect(container.buscar(n => n.tagName === 'TEXTAREA')).toHaveLength(0)
  } finally { await act(async () => root.unmount()); esconderValores(false); vi.unstubAllGlobals() }
})

for (const inicial of [true, false]) {
  it(`estrutura real: nomes e teclado com olho inicial ${inicial}`, async () => {
    const doc = ambiente()
    vi.stubGlobal('location', { hash: '#/inicio', search: '', pathname: '/' })
    vi.stubGlobal('localStorage', { getItem: (k: string) => k === 'esconder_valores' && inicial ? '1' : null, setItem() {} })
    Object.assign(doc.body, { classList: { toggle() {}, remove() {} } })
    const container = doc.createElement('div'); doc.body.appendChild(container)
    const root = createRoot(container as unknown as HTMLElement)
    const sessao = (await apiExemplo.sessao())!
    const api = { ...apiExemplo, sessao: async () => ({ ...sessao, familias: [{ ...sessao.familias[0], nome: segredo, membroNome: segredo }] }) }
    const classe = (c: string) => container.buscar(n => n.getAttribute('class') === c)[0]
    const olho = () => classe('iconbtn olho')
    try {
      await act(async () => root.render(createElement(Provedor, { api, children: createElement(AppReal) })))
      const marca = classe('brand')
      for (const fechado of [inicial, !inicial, inicial]) {
        expect(olho().getAttribute('aria-pressed')).toBe(String(fechado))
        for (const c of ['brand', 'tt', 'exemplo-faixa']) {
          expect(classe(c)).toBeDefined()
          if (fechado) expect(html(classe(c))).not.toContain(segredo)
          else expect(html(classe(c))).toContain(segredo)
        }
        expect(classe('brand')).toBe(marca)
        await act(async () => olho().click())
      }
      if (olho().getAttribute('aria-pressed') !== 'true') await act(async () => olho().click())
      await act(async () => container.buscar(n => n.tagName === 'BUTTON' && n.getAttribute('aria-label') === 'Lançar gasto')[0].click())
      const teclas = classe('keys').buscar(n => n.tagName === 'BUTTON')
      const nomes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'Apagar']
      expect(teclas.map(n => n.getAttribute('aria-label'))).toEqual(nomes)
      for (const i of [0, 1, 9, 2, 3]) await act(async () => teclas[i].click())
      const visor = () => container.buscar(n => n.tagName === 'OUTPUT')[0]
      expect(visor().getAttribute('aria-label')).toBe('Valor escondido')
      expect(visor().textContent).toContain('•••')
      expect(html(visor())).not.toContain('12,34')
      await act(async () => olho().click())
      expect(visor().textContent).toContain('12,34')
      await act(async () => olho().click())
      expect(visor().textContent).toContain('•••')
      expect(teclas.map(n => n.getAttribute('aria-label'))).toEqual(nomes)
    } finally { await act(async () => root.unmount()); esconderValores(false); vi.unstubAllGlobals() }
  })
}
