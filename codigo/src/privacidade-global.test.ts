import { AgenteDaAba, AGENTE_POR_ABA } from './componentes/AgenteDaAba'
﻿import { act, createElement, useState, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
// Semeia o exemplo na mesma data da auditoria, inclusive quando o teste roda após meia-noite.
vi.hoisted(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-15T12:00:00-03:00')) })
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
import { Cadastro, FichaFuncionario } from './telas/escritorio/Ficha'
import { CASOS_LIGACAO, contextoLigacao } from './lib/insights/ligacao.dom-teste'

it.each(CASOS_LIGACAO)('insight integrado %s em %s: olho mascara trechos e mantém opções/aria legíveis', async (tipo, rota, funcionario, pergunta) => {
  const doc = ambiente(), container = doc.createElement('div'); doc.body.appendChild(container)
  const root = createRoot(container as unknown as HTMLElement), ctx = contextoLigacao(tipo)
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-12-30T12:00:00-03:00'))
  let alternar = () => {}
  function App() {
    const [oculto, mudar] = useState(true)
    alternar = () => mudar(v => !v); esconderValores(oculto)
    return createElement(ContextoApp.Provider, { value: { ...ctx, oculto } }, createElement(AgenteDaAba, { rota }))
  }
  try {
    await act(async () => root.render(createElement(App)))
    expect(container.textContent).toContain(pergunta)
    const card = container.buscar(n => n.getAttribute('data-pergunta')?.startsWith('insight:') === true)[0]
    expect(card).toBeDefined()
    expect(container.buscar(n => n.getAttribute('data-agente') === funcionario)).toHaveLength(1)
    const opcoes = card.buscar(n => n.tagName === 'BUTTON').map(n => n.textContent)
    for (const fechado of [true, false, true]) {
      expect(container.buscar(n => n.getAttribute('data-pergunta') !== null)).toHaveLength(1)
      expect(card.buscar(n => n.tagName === 'BUTTON').map(n => n.textContent)).toEqual(opcoes)
      expect(card.buscar(n => n.tagName === 'BUTTON').map(n => n.getAttribute('aria-label'))).toEqual(opcoes)
      expect(opcoes).toContain('Depois'); expect(opcoes).toContain('Já resolvido')
      expect(opcoes.every(r => !r.includes('•••'))).toBe(true)
      if (fechado) expect(vazamentos(container)).toEqual([])
      else if (['fatura_vencendo', 'fatura_divergente', 'parcelas', 'recebimento', 'aplicacao'].includes(tipo)) {
        expect(card.textContent).toContain(segredo); expect(card.textContent).toContain('9.876,54')
      }
      await act(async () => alternar())
    }
  } finally { await act(async () => root.unmount()); esconderValores(false); vi.useRealTimers(); vi.unstubAllGlobals() }
})

const modulos = import.meta.glob('./telas/**/*.tsx', { eager: true }) as Record<string, Record<string, ComponentType<any>>>
const telas = ['CadastroAssessor', 'Inicio', 'Entrar', 'PrimeiroUso', 'Cartoes', 'Casa', 'Desejos', 'Guardado', 'Imoveis', 'FolhaImovel', 'Ajustes', 'Painel', 'Lancar', 'Lancamentos', 'MeuOrcamento', 'Planejamento', 'Parametros', 'Reajuste', 'Recebimentos', 'Privacidade', 'Escritorio', 'NumerosAba', 'FichaFuncionario', 'CartaoGuardado', 'PrecisaDeVoce', 'Cena3D']
const segredo = 'NomeSentinelaPrivado'
const dinheiro = 9876.54
const rotasAgentes = ['inicio', 'lancamentos', 'cartoes', 'casa', 'desejos', 'guardado', 'planejamento', 'orcamento', 'painel', 'ajustes', 'privacidade', 'escritorio']
const padrao = /NomeSentinelaPrivado|9876|9\.876|876,54|R\$\s*0(?:[^\d]|$)/

for (const alvo of ['PerguntaCard', 'AgenteDaAba', 'FichaFuncionario']) {
 for (const inicial of [true, false]) {
  it(`respostas legíveis e privadas em ${alvo}, olho inicial ${inicial}`, async () => {
    const doc = ambiente()
    const container = doc.createElement('div'); doc.body.appendChild(container)
    const root = createRoot(container as unknown as HTMLElement)
    const sessao = (await apiExemplo.sessao())!
    const familia = { ...sessao.familias[0], membroNome: segredo }
    const e = await apiExemplo.escritorioHoje(familia.id)
    const p = { id: 'privacidade-opcoes', funcionario: 'guardado',
      pergunta: segredo + ', o CDB AplicacaoSentinela vence dia 27/11, daqui a 12 dias. Tem R$ 9.876,54.',
      contexto: 'Pode renovar para ' + segredo + ' por R$ 9.876,54.',
      trechosPrivados: [segredo, 'AplicacaoSentinela'],
      opcoes: [{ id: 'renovar', rotulo: 'Vou renovar' }, { id: 'tirar', rotulo: 'Vou tirar o dinheiro' }, { id: 'depois', rotulo: 'Decido depois' },
        { id: 'valor', rotulo: 'Renovar por R$ 9.876,54' }, { id: 'nome', rotulo: 'Conversar com ' + segredo },
        { id: 'privada1', rotulo: segredo }, { id: 'privada2', rotulo: 'AplicacaoSentinela' }] }
    const escritorio = { ...e, precisa_de_voce: [p] }
    const api = { ...apiExemplo, escritorioHoje: async () => escritorio }
    let alternar = () => {}
    function App() {
      const [oculto, mudar] = useState(inicial)
      alternar = () => mudar(v => !v); esconderValores(oculto)
      const ctx = { api, sessao, familia, versao: 0, oculto, resumo: null, abrirLancar() {}, toast() {},
        tentar: async (f: () => Promise<unknown>) => { await f(); return true }, recarregar: async () => {} } as unknown as Ctx
      const f = { ...escritorio.funcionarios.find(f => f.id === 'guardado')!, ultimas_respostas: [{
        id: 'diario-privacidade', funcionario: 'guardado', assunto: 'Renovação', pergunta: p.pergunta,
        resposta: 'Renovar por R$ 9.876,54 para ' + segredo, respondido_por: segredo,
        quando: '2026-11-15T12:00:00-03:00', adiado_ate: null, trechosPrivados: p.trechosPrivados,
      }] }
      const componente = alvo === 'PerguntaCard' ? createElement(PerguntaCard, { p, quem: 'Gestor do Guardado', responder: async () => true })
        : alvo === 'AgenteDaAba' ? createElement(AgenteDaAba, { rota: 'guardado' })
        : createElement(FichaFuncionario, { f, e: escritorio, responder: async () => true, fechar() {} })
      return createElement(ContextoApp.Provider, { value: ctx }, componente)
    }
    try {
      await act(async () => root.render(createElement(App)))
      await act(async () => { await new Promise(r => setTimeout(r, 100)) })
      const grupo = () => container.buscar(n => n.getAttribute('class') === 'perg-ops')[0]
      const original = grupo()
      expect(original).toBeDefined()
      for (const fechado of [inicial, !inicial, inicial]) {
        const botoes = grupo().buscar(n => n.tagName === 'BUTTON')
        const esperados = fechado ? ['Vou renovar', 'Vou tirar o dinheiro', 'Decido depois', 'Renovar por R$ •••', 'Conversar com •••', 'Opção 6', 'Opção 7'] : p.opcoes.map(o => o.rotulo)
        expect(botoes.map(n => n.textContent)).toEqual(esperados)
        expect(botoes.map(n => n.getAttribute('aria-label'))).toEqual(esperados)
        expect(new Set(botoes.map(n => n.getAttribute('aria-label'))).size).toBe(7)
        expect(grupo()).toBe(original)
        const fala = container.buscar(n => n.getAttribute('class') === 'perg-t')[0]
        const contexto = container.buscar(n => n.getAttribute('class') === 'perg-c')[0]
        expect(fala.textContent).toBe(fechado ? '•••, o CDB ••• vence dia 27/11, daqui a 12 dias. Tem R$ •••.' : p.pergunta)
        expect(contexto.textContent).toBe(fechado ? 'Pode renovar para ••• por R$ •••.' : p.contexto)
        if (fechado) expect(html(grupo()) + html(fala) + html(contexto)).not.toMatch(/NomeSentinelaPrivado|AplicacaoSentinela|9[.]876|876,54/)
        if (alvo === 'FichaFuncionario') {
          const diario = container.buscar(n => n.tagName === 'LI' && n.getAttribute('data-resposta') !== null)[0]
          expect(diario.getAttribute('data-resposta')).toBe(fechado ? 'Renovar por R$ ••• para •••' : 'Renovar por R$ 9.876,54 para ' + segredo)
          expect(diario.textContent).toContain('Renovar por R$')
          if (fechado) expect(html(diario)).not.toMatch(/NomeSentinelaPrivado|9[.]876|876,54/)
        }
        await act(async () => alternar())
      }
    } finally { await act(async () => root.unmount()); esconderValores(false); vi.unstubAllGlobals() }
  })
 }
}

it('cadastro real mantém opções fixas, nome privado e ações ao alternar o olho', async () => {
  const doc = ambiente()
  const container = doc.createElement('div'); doc.body.appendChild(container)
  const root = createRoot(container as unknown as HTMLElement)
  const sessao = (await apiExemplo.sessao())!
  const familia = { ...sessao.familias[0], membroNome: segredo }
  const api = { ...apiExemplo, membros: async () => [{ id: familia.membroId, nome: segredo }] }
  let alternar = () => {}
  function App() {
    const [oculto, mudar] = useState(true)
    alternar = () => mudar(v => !v); esconderValores(oculto)
    return createElement(ContextoApp.Provider, { value: { api, familia, sessao, versao: 0, oculto, toast() {}, tentar: async () => true, recarregar: async () => {} } as unknown as Ctx },
      createElement(Cadastro, { id: 'cartao' }))
  }
  try {
    await act(async () => root.render(createElement(App)))
    await act(async () => container.buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Novo cartão')[0].click())
    for (const fechado of [true, false, true]) {
      const botoes = container.buscar(n => n.tagName === 'BUTTON')
      for (const nome of ['Da família', 'Todo mês', '1 vez por ano', 'Uso', 'Não uso mais']) {
        const botao = botoes.find(n => n.textContent === nome)
        expect(botao, nome).toBeDefined(); expect(botao!.getAttribute('aria-label')).toBe(nome)
      }
      expect(html(container)).toContain(fechado ? 'Meu (•••)' : 'Meu (' + segredo + ')')
      if (fechado) expect(vazamentos(container)).toEqual([])
      await act(async () => alternar())
    }
  } finally { await act(async () => root.unmount()); esconderValores(false); vi.unstubAllGlobals() }
})
function semear(v: unknown, k = ''): any {
  if (typeof v === 'string' && /^(nome|membroNome|titular|dono|dono_nome|apelido|descricao|pergunta|contexto|frase|assunto|resposta|respondido_por|banco|email|titular_nome|funcao|servico|categoria)$/.test(k)) return segredo + ' ' + String(v)
  if (typeof v === 'number' && /valor|saldo|total|limite|salario|colchao|livre|rendeu/.test(k)) return dinheiro
  if (Array.isArray(v)) return v.map(x => semear(x))
  if (v && typeof v === 'object') {
    const resultado = Object.fromEntries(Object.entries(v).map(([ch, x]) => [ch, semear(x, ch)]))
    // Ao injetar texto privado, atualiza tamb?m os fragmentos que descrevem essa fala.
    if ('trechosPrivados' in resultado) resultado.trechosPrivados = [segredo, ...resultado.trechosPrivados]
    return resultado
  }
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
    // O exemplo silencia perguntas às 22h; a auditoria precisa sempre exercitar dados.
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-15T12:00:00-03:00'))
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
        await act(async () => container.buscar(n => n.tagName === 'BUTTON' && n.getAttribute('aria-controls') !== null)[0].click())
        await act(async () => { await new Promise(r => setTimeout(r, 400)) })
        expect(vazamentos(container), nome + ' tarefas abertas').toEqual([])
      }
      if (nome === 'Guardado') {
        await act(async () => container.buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Rendeu por dia')[0].click())
        expect(vazamentos(container), 'Rendimentos: texto e atributos').toEqual([])
        const aplicacoes = container.buscar(n => n.tagName === 'BUTTON' && n.getAttribute('class') === 'li')
        expect(aplicacoes.length).toBeGreaterThan(0)
        for (const botao of aplicacoes) expect(botao.getAttribute('aria-label')).toContain('Abrir.')
        for (const botao of aplicacoes) { await act(async () => botao.click()); expect(vazamentos(container), 'Ficha da aplicação').toEqual([]) }
      }
      if (nome === 'Lancamentos') expect(container.buscar(n => n.tagName === 'BUTTON' && (n.getAttribute('aria-label') || '').startsWith('Corrigir ou apagar ')).length).toBeGreaterThan(0)
      if (nome === 'Casa') {
        for (const aba of ['Serviços', 'Folha', 'Gás', 'Feira']) {
          await act(async () => container.buscar(n => n.tagName === 'BUTTON' && n.textContent === aba)[0].click())
          await act(async () => { await new Promise(r => setTimeout(r, 150)) })
          expect(vazamentos(container), 'Casa: ' + aba).toEqual([])
        }
      }
      await act(async () => alternar())
      const aberto = html(container)
      if (nome.startsWith('Agente:')) { expect(container.buscar(n => n.getAttribute('data-principal') === AGENTE_POR_ABA[nome.slice(7)]).length, nome).toBe(1); expect(aberto).toContain('Recolher') }
      // Algumas telas iniciais são formulários vazios e não apresentam dados privados.
      if (!nome.startsWith('Agente:') && !['CadastroAssessor', 'Entrar', 'PrimeiroUso', 'Privacidade', 'Parametros', 'Reajuste', 'Cena3D'].includes(nome)) expect(aberto, nome + ' deve exercitar dados privados').toMatch(padrao)
      await act(async () => alternar())
      expect(html(container).match(padrao), nome).toBeNull()
    } finally { await act(async () => root.unmount()); esconderValores(false); vi.useRealTimers(); vi.unstubAllGlobals() }
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
      await act(async () => container.buscar(n => n.tagName === 'BUTTON' && n.getAttribute('aria-label') === 'Anotar gasto')[0].click())
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
import { GraficoMes } from './componentes/Graficos'
import { Cartoes } from './telas/cartoes/Cartoes'
it('4: zero literal e atributos monetários ficam protegidos', async()=>{
 const doc=ambiente(), container=doc.createElement('div');doc.body.appendChild(container)
 const root=createRoot(container as unknown as HTMLElement)
 const sessao=(await apiExemplo.sessao())!, familia=sessao.familias[0]
 const api={...apiExemplo,cartoes:async()=>[{id:'c',nome:'Cartão de teste'}],faturas:async()=>[{cartao_id:'c',mes:'2026-11',vencimento:'2026-11-30',total:0}]}
 try {
  esconderValores(true)
  await act(async()=>root.render(createElement(ContextoApp.Provider,{value:{api,familia,oculto:true,versao:0} as unknown as Ctx},createElement(Cartoes))))
  expect(container.buscar(n=>n.getAttribute('class')==='fat zeros')).toHaveLength(1)
  expect(vazamentos(container)).toEqual([])
  for(const n of container.buscar(n=>n.atributos.size>0)) for(const attr of ['title','aria-label','aria-valuetext']) expect(n.getAttribute(attr)||'').not.toMatch(/R\$\s*\d/)
 } finally {await act(async()=>root.unmount());esconderValores(false);vi.unstubAllGlobals()}
})
it('4: gráfico oculto não guarda geometria financeira',async()=>{
 const doc=ambiente(), container=doc.createElement('div');doc.body.appendChild(container)
 const root=createRoot(container as unknown as HTMLElement)
 try {
  for(const gasto of [10,9000]) {
   await act(async()=>root.render(createElement(ContextoApp.Provider,{value:{oculto:true} as Ctx},createElement(GraficoMes,{gasto,limite:10000,fecha:gasto*2,hoje:'2026-11-16',dias:30}))))
   expect(container.textContent).toBe('Gráfico oculto.')
   expect(container.buscar(n=>['SVG','POLYLINE','PATH'].includes(n.tagName))).toHaveLength(0)
  }
 } finally {await act(async()=>root.unmount());vi.unstubAllGlobals()}
})
