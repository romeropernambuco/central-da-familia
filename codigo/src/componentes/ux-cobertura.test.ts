import { rascunhos } from '../app/rascunhos'
import { act, createElement, Fragment, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { ContextoApp, type Ctx } from '../app/contexto'
import { App } from '../app/App'
import { apiExemplo } from '../api/exemplo'
import type { Api } from '../api/tipos'
import { AgenteDaAba } from './AgenteDaAba'
import { Ajustes } from '../telas/ajustes/Ajustes'
import { Lancar } from '../telas/lancar/Lancar'
import { DocumentoTeste, NoTeste } from '../telas/escritorio/numeros.dom-teste'
import { esconderValores, hojeRecife } from '../lib/formato'
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); esconderValores(false) })
async function montar(elemento: ReactElement, mudancas: Partial<Api> = {}, equipe = false, extra: Partial<Ctx> = {}) {
  const doc = new DocumentoTeste()
  Object.defineProperty(doc, 'activeElement', { value: null, writable: true })
  const teclado = new EventTarget()
  doc.addEventListener = teclado.addEventListener.bind(teclado) as any
  doc.removeEventListener = teclado.removeEventListener.bind(teclado) as any
  Object.assign(doc, { dispatchEvent: teclado.dispatchEvent.bind(teclado), contains(n: NoTeste) { return doc.buscar(x => x === n).length > 0 } })
  Object.assign(NoTeste.prototype, {
    focus(this: NoTeste) { Object.assign(doc, { activeElement: this }) },
    closest(this: NoTeste, seletor: string): NoTeste | null {
      for (let n: NoTeste | null = this; n; n = n.parentNode)
        if (seletor.split(',').some(s => s.startsWith('[role=') ? n!.getAttribute('role') === 'dialog' : n!.tagName === s.toUpperCase())) return n
      return null
    }, querySelectorAll() { return [] }
  })
  Object.defineProperty(NoTeste.prototype, 'options', { configurable: true, get(this: NoTeste) { return this.buscar(n => n.tagName === 'OPTION') } })
  Object.assign(doc.documentElement, { dataset: {} })
  vi.stubGlobal('document', doc)
  vi.stubGlobal('window', Object.assign(new EventTarget(), { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {}, scrollTo() {} }))
  vi.stubGlobal('addEventListener', window.addEventListener.bind(window))
  vi.stubGlobal('removeEventListener', window.removeEventListener.bind(window))
  vi.stubGlobal('localStorage', { getItem() { return null }, setItem() {} })
  vi.stubGlobal('location', { hash: '#/casa?sem3d', search: '?sem3d' })
  vi.stubGlobal('history', { state: null, replaceState(_s: unknown, _t: string, url: string) { location.hash = url.slice(url.indexOf('#')) } })
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const sessao = (await apiExemplo.sessao())!
  const familia = { ...sessao.familias[0], papel: equipe ? 'equipe' as const : 'casal' as const }
  const api = { ...apiExemplo, ...mudancas }
  const ctx = { api, sessao, familia, versao: 0, oculto: false, toast() {}, recarregar: async () => {}, tentar: async (f: () => Promise<unknown>) => { await f(); return true }, ...extra } as unknown as Ctx
  const container = doc.createElement('div'); doc.body.appendChild(container)
  const root = createRoot(container as unknown as HTMLElement)
  await act(async () => root.render(createElement(ContextoApp.Provider, { value: ctx }, elemento)))
  await act(async () => { await new Promise(r => setTimeout(r, 400)) })
  const botao = (texto: string) => container.buscar(n => n.tagName === 'BUTTON' && (n.textContent === texto || n.getAttribute('aria-label') === texto))[0]
  const clicar = async (texto: string) => { expect(botao(texto), texto).toBeDefined(); await act(async () => botao(texto).click()) }
  const preencher = async (rotulo: string, valor: string) => {
    const input = container.buscar(n => n.tagName === 'INPUT' && !!(n.getAttribute('aria-label') === rotulo || n.parentNode?.textContent.startsWith(rotulo) || n.parentNode?.parentNode?.textContent.startsWith(rotulo)))[0]
    expect(input, rotulo).toBeDefined()
    const props = Object.entries(input).find(([k]) => k.startsWith('__reactProps'))![1] as any
    await act(async () => props.onChange({ target: { value: valor } }))
  }
  return { api, ctx, familia, container, doc, clicar, preencher, atualizar: async () => { await act(async () => root.render(createElement(ContextoApp.Provider, { value: { ...ctx } }, elemento))) }, fechar: async () => { await act(async () => root.unmount()) } }
}

const assuntoAjuda: Record<string, string> = {
 inicio: 'números e avisos', lancamentos: 'gastos e entradas', orcamento: 'limite e suas sobras', casa: 'lista e as compras', cartoes: 'cartões e faturas', guardado: 'aplicações e imóveis', planejamento: 'limites e planeja', desejos: 'o que quer comprar', escritorio: 'tarefas e cadastros', ajustes: 'aparência e dos convites', privacidade: 'opções de privacidade', painel: 'indicadores do app', entrar: 'Entre com seu e-mail', 'primeiro-uso': 'cria sua família'
}
const abas = ['inicio', 'lancamentos', 'orcamento', 'casa', 'cartoes', 'guardado', 'planejamento', 'desejos', 'escritorio', 'ajustes', 'privacidade', 'painel', 'entrar', 'primeiro-uso'] as const
it.each(abas)('cobertura ajuda: folha fixa em %s, privada, sem rede ou escrita, Escape devolve foco', async rota => {
 const rede = vi.fn(() => { throw new Error('Ajuda não usa rede') })
 vi.stubGlobal('fetch', rede)
 const gravar = vi.fn(), storage = { getItem: () => null, setItem: gravar, removeItem: gravar }
 vi.stubGlobal('sessionStorage', storage)
 esconderValores(true)
 // App real verifica também os pontos de integração, inclusive entrada e primeiro uso.
 const a = await montar(createElement(App), {}, false, { oculto: true, ...(rota === 'entrar' ? { sessao: null } : rota === 'painel' ? { sessao: { ...(await apiExemplo.sessao())!, dono: true } } : {}) })
 try {
  if (rota !== 'entrar') {
   await act(async () => { location.hash = '#/' + rota; window.dispatchEvent(new Event('hashchange')) })
   // As leituras da nova aba terminam antes de medir os efeitos exclusivos da ajuda.
   await act(async () => { await new Promise(r => setTimeout(r, 400)) })
  }
  vi.stubGlobal('localStorage', storage)
  const chamadas = Object.fromEntries(Object.keys(a.api).filter(k => typeof (a.api as any)[k] === 'function').map(k => [k, vi.spyOn(a.api as any, k)]))
  rede.mockClear(); gravar.mockClear()
  const abrir = a.container.buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Preciso de ajuda')[0]
  expect(abrir).toBeDefined()
  ;(abrir as any).focus()
  await a.clicar('Preciso de ajuda')
  const folha = a.container.buscar(n => n.getAttribute('role') === 'dialog' && n.getAttribute('aria-label') === 'Preciso de ajuda')[0]
  expect(folha).toBeDefined()
  expect(folha.buscar(n => n.tagName === 'P').length).toBeGreaterThanOrEqual(3)
  expect(folha.buscar(n => n.tagName === 'P').length).toBeLessThanOrEqual(5)
  expect(folha.textContent).toContain(assuntoAjuda[rota])
  const respostas = folha.buscar(n => n.tagName === 'P').map(n => n.textContent)
  expect(folha.textContent).not.toMatch(/conversa livre|pergunte qualquer|chat|Silva|Ana|Bruno|R\$/i)
  expect(folha.buscar(n => n.tagName === 'INPUT' || n.tagName === 'TEXTAREA')).toHaveLength(0)
  expect(rede).not.toHaveBeenCalled(); expect(gravar).not.toHaveBeenCalled()
  for (const chamada of Object.values(chamadas)) expect(chamada).not.toHaveBeenCalled()
  expect(a.doc.activeElement).toBe(folha)
  await act(async () => { (a.doc as any).dispatchEvent(Object.assign(new Event('keydown'), { key: 'Escape' })) })
  expect(a.container.buscar(n => n.getAttribute('role') === 'dialog')).toHaveLength(0)
  expect(a.doc.activeElement).toBe(abrir)
  await a.clicar('Preciso de ajuda')
  expect(a.container.buscar(n => n.getAttribute('role') === 'dialog')[0].buscar(n => n.tagName === 'P').map(n => n.textContent)).toEqual(respostas)
  expect(rede).not.toHaveBeenCalled(); expect(gravar).not.toHaveBeenCalled()
 } finally { await a.fechar() }
})

it.each(['INPUT', 'TEXTAREA', 'SELECT'])('cobertura foco: navegação foca título e preserva edição em %s', async tag => {
 const a = await montar(createElement(App))
 try {
  await act(async () => { location.hash = '#/ajustes'; window.dispatchEvent(new Event('hashchange')) })
  const titulo = a.container.buscar(n => n.tagName === 'H1')[0]
  expect(a.doc.activeElement).toBe(titulo)
  expect(titulo.getAttribute('tabindex')).toBe('-1')
  expect(titulo.textContent).toBe('Família e ajustes')
  const formulario = a.doc.createElement('form'), campo = a.doc.createElement(tag)
  formulario.appendChild(campo); a.doc.body.appendChild(formulario); (campo as any).focus()
  await act(async () => { location.hash = '#/privacidade'; window.dispatchEvent(new Event('hashchange')) })
  expect(a.container.buscar(n => n.tagName === 'H1')[0].textContent).toBe('Privacidade')
  expect(a.doc.activeElement).toBe(campo)
 } finally { await a.fechar() }
})

it('cobertura modos: Ajustes muda o agente vivo sem remontar página', async () => {
 const a = await montar(createElement(Fragment, null, createElement(Ajustes), createElement(AgenteDaAba, { rota: 'cartoes' })))
 try {
  const pagina = a.container.childNodes[0]
  for (const rotulo of ['Completo', 'Desligado', 'Só texto']) {
   await a.clicar(rotulo)
   expect(a.container.childNodes[0]).toBe(pagina)
   expect(a.container.buscar(n => n.tagName === 'BUTTON' && n.textContent === rotulo)[0].getAttribute('aria-pressed')).toBe('true')
   const agente = a.container.buscar(n => n.getAttribute('data-agente') === 'cartao')[0]
   expect(agente).toBeDefined()
   expect(agente.buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Recolher').length).toBe(rotulo !== 'Desligado' ? 1 : 0)
   if (rotulo === 'Desligado') expect(agente.buscar(n => n.getAttribute('class') === 'cena3d mini-agente')).toHaveLength(0)
  }
 } finally { await a.fechar(); window.dispatchEvent(new Event('storage')) }
})

async function dadosRascunho() {
 const sessao = (await apiExemplo.sessao())!, familia = sessao.familias[0]
 const chave = 'anotar:' + JSON.stringify([apiExemplo.modo, sessao.userId, familia.id])
 const equipe = 'compra-equipe:' + JSON.stringify([apiExemplo.modo, sessao.userId, familia.id])
 const valor = { txt: '753,21', desc: 'SEGREDO-RASCUNHO', quando: hojeRecife(), cartao: null, envelope: familia.envelopeId || '', parcelas: 1 }
 const resumo = await apiExemplo.resumoHoje(familia.id)
 return { sessao, familia, chave, equipe, valor, resumo }
}
function storageFalso(inicial: [string, unknown][] = []) {
 rascunhos.clear(); const mapa = rascunhos; for(const [k,v] of inicial) mapa.set(k,v)
 vi.stubGlobal('sessionStorage', { getItem: (k: string) => mapa.get(k) ?? null, setItem: () => { throw new Error('Rascunho não pode ir para disco') }, removeItem: (k: string) => mapa.delete(k) })
 return mapa
}
it.each(['cheio', 'indisponível'])('cobertura rascunho: storage %s não impede editar e salvar', async erro => {
 const d = await dadosRascunho(), falhar = () => { throw new Error(erro) }
 vi.stubGlobal('sessionStorage', { getItem: erro === 'cheio' ? () => null : falhar, setItem: falhar, removeItem: falhar })
 const lancar = vi.fn().mockResolvedValue({ resumo: d.resumo, lancamento: { id: 'novo' } })
 const a = await montar(createElement(Lancar), { lancar }, false, { resumo: d.resumo, lancarAberto: {} })
 try {
  await a.clicar('1'); await a.preencher('O que foi', 'Compra')
  const salvar = a.container.buscar(n => !!n.getAttribute('aria-label')?.startsWith('Salvar em '))[0]
  expect(salvar).toBeDefined(); await act(async () => salvar.click())
  expect(lancar).toHaveBeenCalledTimes(1)
  expect(lancar.mock.calls[0][0]).toMatchObject({ valor: 1, descricao: 'Compra' })
 } finally { await a.fechar() }
})
it.each(['usuario', 'familia'])('cobertura rascunho: não restaura outro %s', async outro => {
 const d = await dadosRascunho(), chave = 'anotar:' + JSON.stringify([apiExemplo.modo, outro === 'usuario' ? 'outro' : d.sessao.userId, outro === 'familia' ? 'outra' : d.familia.id])
 const mapa = storageFalso([[chave, d.valor]])
 const a = await montar(createElement(Lancar), {}, false, { resumo: d.resumo, lancarAberto: {} })
 try {
  expect(a.container.textContent).not.toContain('Rascunho recuperado')
  expect(a.container.textContent).not.toContain('SEGREDO-RASCUNHO')
  expect(a.container.buscar(n => n.tagName === 'INPUT').some(n => String((n as any).value).includes('SEGREDO'))).toBe(false)
  expect(mapa.get(chave)).toBe(d.valor)
 } finally { await a.fechar() }
 // Controle positivo: o rascunho do próprio usuário/família precisa restaurar.
 mapa.set(d.chave, d.valor)
 const b = await montar(createElement(Lancar), {}, false, { resumo: d.resumo, lancarAberto: {} })
 try {
  expect(b.container.textContent).toContain('Rascunho recuperado')
  expect(b.container.buscar(n => n.tagName === 'INPUT').some(n => (n as any).value === 'SEGREDO-RASCUNHO')).toBe(true)
 } finally { await b.fechar() }
})
it.each(['salvar', 'descartar'])('cobertura rascunho: %s apaga e não recupera na próxima montagem', async acao => {
 const d = await dadosRascunho(), mapa = storageFalso([[d.chave, d.valor]])
 const lancar = vi.fn().mockResolvedValue({ resumo: d.resumo, lancamento: { id: 'novo' } })
 const extra = { resumo: d.resumo, lancarAberto: {} }
 const a = await montar(createElement(Lancar), { lancar }, false, extra)
 try {
  expect(a.container.textContent).toContain('Rascunho recuperado')
  if (acao === 'descartar') await a.clicar('Descartar')
  else {
   const salvar = a.container.buscar(n => !!n.getAttribute('aria-label')?.startsWith('Salvar em '))[0]
   await act(async () => salvar.click()); expect(a.container.textContent).toContain('bem acima do seu normal'); const confirmar = a.container.buscar(n => n.tagName === 'BUTTON' && n.textContent.startsWith('Confirmar '))[0]; expect(confirmar).toBeDefined(); await act(async () => confirmar.click()); expect(lancar).toHaveBeenCalledTimes(1)
  }
  expect(mapa.has(d.chave)).toBe(false)
 } finally { await a.fechar() }
 const b = await montar(createElement(Lancar), {}, false, extra)
 try { expect(b.container.textContent).not.toContain('Rascunho recuperado') } finally { await b.fechar() }
})
it('cobertura rascunho: formulários pessoal/equipe isolados e sem valor em atributos ou logs com olho fechado', async () => {
 const d = await dadosRascunho(), mapa = storageFalso([[d.chave, d.valor], [d.equipe, 'COMPRA-EQUIPE-SECRETA']])
 const logs = ['log', 'warn', 'error', 'info', 'debug'].map(k => vi.spyOn(console, k as 'log').mockImplementation(() => {}))
 esconderValores(true)
 for (const equipe of [false, true]) {
  const a = await montar(createElement(Lancar), {}, equipe, { resumo: d.resumo, lancarAberto: {}, oculto: true })
  try {
   expect(a.container.textContent).toContain('Rascunho recuperado')
   for (const n of a.container.buscar(() => true)) {
    expect(n.textContent).not.toMatch(/753|SEGREDO-RASCUNHO|COMPRA-EQUIPE-SECRETA/)
    expect([...n.atributos.values()].join(' ')).not.toMatch(/753|SEGREDO-RASCUNHO|COMPRA-EQUIPE-SECRETA/)
    if (n.tagName === 'INPUT') expect(String((n as any).value)).not.toMatch(/SEGREDO|753/)
   }
   await a.clicar('Descartar')
   expect(mapa.has(equipe ? d.equipe : d.chave)).toBe(false)
   if (!equipe) expect(mapa.get(d.equipe)).toBe('COMPRA-EQUIPE-SECRETA')
  } finally { await a.fechar() }
 }
 for (const log of logs) expect(JSON.stringify(log.mock.calls)).not.toMatch(/753|SEGREDO-RASCUNHO|COMPRA-EQUIPE-SECRETA/)
})
