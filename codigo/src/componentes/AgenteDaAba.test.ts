// @ts-ignore Node é fornecido pelo executor externo do Vitest.
import { existsSync, readFileSync } from 'node:fs'
// @ts-ignore Node é fornecido pelo executor externo do Vitest.
import { dirname, extname, resolve } from 'node:path'
import { expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { DocumentoTeste, NoTeste } from '../telas/escritorio/numeros.dom-teste'
const ciclo = vi.hoisted(() => ({ destruir: vi.fn(), montar: vi.fn() }))
vi.mock('../telas/escritorio/tres', () => ({}))
vi.mock('../telas/escritorio/cena3d', () => ({ montarCena: ciclo.montar }))
vi.mock('../telas/escritorio/cenaBase', async original => ({ ...await original<object>(), temWebGL: () => true }))
import { MiniAgente } from './AgenteDaAba'

it('carrega Three somente pelo import tardio do mini agente e libera o renderer', () => {
  const fonte = readFileSync(resolve('src/componentes/AgenteDaAba.tsx'), 'utf8')
  expect(fonte).toMatch(/import\('\.\.\/telas\/escritorio\/tres'\)/)
  expect(fonte).not.toMatch(/import\s+[^\n]+from\s+['"][^'"]*(?:three|\/tres)['"]/)
  expect(fonte).toContain('liberarRenderer?.()')
  expect(fonte).toContain('cena?.destruir()')
  const app = readFileSync(resolve('src/app/App.tsx'), 'utf8')
  expect(app).toContain('<AgenteDaAba key={r} rota={r} />')
  const vistos = new Set<string>()
  function visitar(arquivo: string) {
    if (vistos.has(arquivo)) return
    vistos.add(arquivo)
    const codigo = readFileSync(arquivo, 'utf8')
    for (const match of codigo.matchAll(/(?:^|\n)\s*(?:import|export)\s+(?!type\b)[^;\n]*?\sfrom\s*['"]([^'"]+)['"]/g)) {
      const origem = match[1]
      expect(origem, arquivo).not.toMatch(/^three(?:\/|$)/)
      if (!origem.startsWith('.')) continue
      const alvo = resolve(dirname(arquivo), origem)
      const dependencia = (extname(alvo) ? [alvo] : [alvo + '.ts', alvo + '.tsx', alvo + '/index.ts']).find(existsSync)
      if (dependencia && /\.[jt]sx?$/.test(dependencia)) visitar(dependencia)
    }
  }
  visitar(resolve('src/main.tsx')); visitar(resolve('src/partida.tsx'))
  expect([...vistos].some(p => /AgenteDaAba\.tsx$/.test(p))).toBe(true)
})

it('trocar de aba e desmontar libera a cena; sem3d não importa nem monta renderer', async () => {
  const doc = new DocumentoTeste()
  Object.assign(doc.documentElement, { dataset: {} })
  vi.stubGlobal('document', doc)
  vi.stubGlobal('window', Object.assign(new EventTarget(), { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {} }))
  vi.stubGlobal('location', { hash: '', search: '' })
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal('MutationObserver', class { observe() {} disconnect() {} })
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  ciclo.destruir.mockClear(); ciclo.montar.mockReset()
  ciclo.montar.mockImplementation(() => ({ destruir: ciclo.destruir, definirEstado() {}, irPara() {} }))
  const container = doc.createElement('div'); doc.body.appendChild(container)
  const root = createRoot(container as unknown as HTMLElement)
  try {
    await act(async () => root.render(createElement(MiniAgente, { id: 'cartao', sala: 'cartoes' })))
    expect(ciclo.montar).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ mini: true, parado: true, funcionarios: [{ id: 'cartao', sala: 'cartoes', estado: 'trabalhando' }] }))
    await act(async () => root.render(createElement(MiniAgente, { id: 'fiscal', sala: 'casa' })))
    expect(ciclo.destruir).toHaveBeenCalledTimes(1)
    await act(async () => root.unmount())
    expect(ciclo.destruir).toHaveBeenCalledTimes(2)
    location.search = '?sem3d'
    const lista = createRoot(container as unknown as HTMLElement)
    await act(async () => lista.render(createElement(MiniAgente, { id: 'fiscal', sala: 'casa' })))
    expect(container.textContent).toContain('Em lista')
    expect(ciclo.montar).toHaveBeenCalledTimes(2)
    await act(async () => lista.unmount())
  } finally { vi.unstubAllGlobals() }
})

import { renderToStaticMarkup } from 'react-dom/server'
import { ContextoApp, type Ctx } from '../app/contexto'
import { App } from '../app/App'
import { Lancar } from '../telas/lancar/Lancar'
import { AgenteDaAba } from './AgenteDaAba'
import { lojaEscritorio } from '../app/escritorioCompartilhado'

const contextoDesign = () => ({
 api: { modo: 'exemplo', feiras: async () => [], estoque: async () => ({ itens: [], contagens: [] }), lancamentos: async () => [], cartoes: async () => [], faturas: async () => [], membros: async () => [], escritorioHoje: async () => ({ funcionarios: [], entregue: [], precisa_de_voce: [{ id: 'feira-design', funcionario: 'fiscal', pergunta: 'Fez a feira?', contexto: '', opcoes: [{ id: 'sim', rotulo: 'Sim' }] }] }) },
 familia: { id: 'design-teste', nome: 'Exemplo', membroNome: 'Exemplo', papel: 'casal', envelopeId: 'teste' },
 sessao: { dono: true }, resumo: { dias_restantes: 10, envelopes: [{ id: 'teste', nome: 'Teste', casa: true, regra: 'mensal', livre: 100, limite_mes: 100 }] },
 versao: 0, lancarAberto: {}, oculto: false, tentar: async (f: () => Promise<void>) => { await f(); return true },
 abrirLancar() {}, fecharLancar() {}, recarregar: async () => {}, toast() {},
} as unknown as Ctx)

it('design: mini usa classe responsiva sem altura inline', () => {
 const html = renderToStaticMarkup(createElement(MiniAgente, { id: 'fiscal', sala: 'casa' }))
 expect(html).toContain('cena3d mini-agente')
 expect(html).not.toContain('style=')
 const css = readFileSync(resolve('src/estilo.css'), 'utf8')
 expect(css).toContain('.cena3d.mini-agente{height:128px;aspect-ratio:auto}')
 expect(css).toContain('@media (min-width:600px){.cena3d.mini-agente{height:180px}}')
})

it('design: foco apos reset e borda exclusiva dos campos', () => {
 const css = readFileSync(resolve('src/estilo.css'), 'utf8')
 expect(css.indexOf('button.li:focus-visible{outline:2px solid var(--accent);outline-offset:2px}')).toBeGreaterThan(css.indexOf('button.li{all:unset'))
 expect(css).toContain('::placeholder{color:var(--muted);opacity:1}')
 expect(css).toContain('--field-border:#777770')
 expect(css).toContain('--field-border:#888882')
 expect(css).toContain('input,select,textarea{border-color:var(--field-border)}')
 const luminancia = (hex: string) => hex.match(/\w\w/g)!.map(c => parseInt(c, 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4).reduce((s, c, i) => s + c * [.2126, .7152, .0722][i], 0)
 for (const [borda, superficie] of [['888882', 'FFFFFF'], ['777770', '1A1714']]) {
 const a = luminancia(borda), b = luminancia(superficie)
 expect((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toBeGreaterThanOrEqual(3)
 }
 expect(css).toMatch(/\.envbtn\{[^}]*min-height:60px/)
 expect(css).toMatch(/\.tabbar-lancar\{[^}]*font-size:12px;line-height:16px/)

})

it('design: formulario real mantem rotulo visivel e salvar no envelope', () => {
 const html = renderToStaticMarkup(createElement(ContextoApp.Provider, { value: contextoDesign() }, createElement(Lancar)))
 expect(html).toContain('<span>O que foi?</span>')
 expect(html).toContain('aria-label="O que foi"')
 expect(html).toContain('<b>Salvar em Teste</b>')
})

it('design: barra real tem rotulo visivel para lancar', async () => {
 const doc = new DocumentoTeste()
 Object.assign(doc.documentElement, { dataset: {} })
 vi.stubGlobal('document', doc)
 vi.stubGlobal('window', Object.assign(new EventTarget(), { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {} }))
 vi.stubGlobal('location', { hash: '#/lancamentos', search: '?sem3d' })
 vi.stubGlobal('addEventListener', () => {})
 vi.stubGlobal('removeEventListener', () => {})
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
 const container = doc.createElement('div'); doc.body.appendChild(container)
 const root = createRoot(container as unknown as HTMLElement)
 try {
 const ctx = contextoDesign(); ctx.lancarAberto = null
 await act(async () => root.render(createElement(ContextoApp.Provider, { value: ctx }, createElement(App))))
 const barra = container.buscar(n => n.tagName === 'NAV' && n.getAttribute('class') === 'tabbar')[0]
 expect(barra.buscar(n => n.tagName === 'SPAN' && n.textContent === 'Anotar')).toHaveLength(1)
 } finally { await act(async () => root.unmount()); vi.unstubAllGlobals() }
})

it('design: divulgacao real abre tarefas e informa o painel controlado', async () => {
 const doc = new DocumentoTeste()
 Object.assign(doc.documentElement, { dataset: {} })
 vi.stubGlobal('document', doc)
 vi.stubGlobal('window', Object.assign(new EventTarget(), { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {} }))
 vi.stubGlobal('location', { hash: '', search: '?sem3d' })
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
 vi.stubGlobal('addEventListener', () => {})
 vi.stubGlobal('removeEventListener', () => {})
 const ctx = contextoDesign()
 await lojaEscritorio(ctx.api, ctx.familia!.id).ler(ctx.api, ctx.familia!.id)
 const container = doc.createElement('div'); doc.body.appendChild(container)
 const root = createRoot(container as unknown as HTMLElement)
 try {
 await act(async () => root.render(createElement(ContextoApp.Provider, { value: ctx }, createElement(AgenteDaAba, { rota: 'casa' }))))
 const botoes = container.buscar(n => n.tagName === 'BUTTON' && n.getAttribute('aria-controls') !== null && (n.getAttribute('class') || '').includes('agente-aba-divulgacao'))
 expect(botoes).toHaveLength(1)
 const botao = botoes[0]
 expect(botao.textContent).toBe('Ver tarefas e cadastros')
 expect(botao).toBeDefined()
 expect(botao.getAttribute('class')).toContain('ghost')
 expect(container.buscar(n => n.getAttribute('class') === 'agente-aba-cabecalho')[0].textContent).toContain('Exemplo:')
 expect(botao.getAttribute('aria-expanded')).toBe('false')
 const painel = container.buscar(n => n.getAttribute('id') === botao.getAttribute('aria-controls'))[0]
 expect(painel).toBeDefined()
 await act(async () => botao.click())
 expect(botao.getAttribute('aria-expanded')).toBe('true')
 expect(painel.getAttribute('hidden')).toBeNull()
 await act(async () => botao.click())
 expect(botao.getAttribute('aria-expanded')).toBe('false')
 const escritorio = await ctx.api.escritorioHoje(ctx.familia!.id)
 ctx.api.escritorioHoje = async () => ({ ...escritorio, precisa_de_voce: [] })
 await act(async () => { await lojaEscritorio(ctx.api, ctx.familia!.id).ler(ctx.api, ctx.familia!.id) })
 expect(botao.textContent).toBe('Ver tarefas e cadastros')
 await act(async () => root.render(createElement(ContextoApp.Provider, { value: ctx }, createElement(AgenteDaAba, { rota: 'desejos' }))))
 expect(container.buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Ver resumo desta tela')).toHaveLength(1)

 } finally { await act(async () => root.unmount()); vi.unstubAllGlobals() }
})

it('design: mini segue tema automatico, explicito e remove observadores', async () => {
 const doc = new DocumentoTeste()
 const dataset: { theme?: string } = {}
 Object.assign(doc.documentElement, { dataset })
 const mq = Object.assign(new EventTarget(), { matches: true })
 const remover = vi.spyOn(mq, 'removeEventListener')
 let observar = () => {}
 const desconectar = vi.fn()
 vi.stubGlobal('document', doc)
 vi.stubGlobal('window', Object.assign(new EventTarget(), { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {} }))
 vi.stubGlobal('location', { hash: '', search: '' })
 vi.stubGlobal('matchMedia', () => mq)
 vi.stubGlobal('MutationObserver', class { constructor(f: () => void) { observar = f } observe() {} disconnect = desconectar })
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
 const tema = vi.fn()
 ciclo.montar.mockReset(); ciclo.montar.mockImplementation(() => ({ destruir() {}, definirEstado() {}, irPara() {}, tema }))
 const container = doc.createElement('div'); doc.body.appendChild(container)
 const root = createRoot(container as unknown as HTMLElement)
 try {
 await act(async () => root.render(createElement(MiniAgente, { id: 'fiscal', sala: 'casa' })))
 expect(ciclo.montar.mock.calls[0][2].escuro).toBe(true)
 mq.matches = false; mq.dispatchEvent(new Event('change'))
 expect(tema).toHaveBeenLastCalledWith(false)
 dataset.theme = 'dark'; observar()
 expect(tema).toHaveBeenLastCalledWith(true)
 dataset.theme = 'light'; mq.matches = true; observar()
 expect(tema).toHaveBeenLastCalledWith(false)
 await act(async () => root.unmount())
 expect(remover).toHaveBeenCalledWith('change', expect.any(Function))
 expect(desconectar).toHaveBeenCalledTimes(1)
 } finally { vi.unstubAllGlobals() }
})
