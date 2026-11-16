import { act, createElement, Fragment, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { ContextoApp, type Ctx } from '../app/contexto'
import { lojaEscritorio } from '../app/escritorioCompartilhado'
import type { Rota } from '../app/rotas'
import { DocumentoTeste, NoTeste } from '../telas/escritorio/numeros.dom-teste'
import { CASOS_LIGACAO, contextoLigacao } from '../lib/insights/ligacao.dom-teste'
import { chaveArmazenamento, lerMemoria } from '../lib/insights/memoria'
import { AgenteDaAba, MiniAgente, ControleFuncionarios, migrarModoFuncionario } from './AgenteDaAba'
import { elencoDaAba, SALA_POR_ABA, PRINCIPAL_POR_ABA } from '../telas/escritorio/elencoPorAba'
import { rotaPermitida } from '../app/rotas'
import { Sheet } from './base'
import { FichaFuncionario } from '../telas/escritorio/Ficha'
import { useEscritorio } from '../app/useDados2'
import * as composicao from '../telas/escritorio/elencoPorAba'
import { FALA_ANALISTA } from '../lib/insights/donos'
import { RumoHero } from './RumoA2029'

const cena = vi.hoisted(() => ({ montar: vi.fn(), definir: vi.fn(), destruir: vi.fn() }))
vi.mock('../telas/escritorio/tres', () => ({}))
vi.mock('../telas/escritorio/cena3d', () => ({ montarCena: cena.montar }))

function ambiente(webgl = false) {
  const doc = new DocumentoTeste(), eventos = new EventTarget(), storage = new Map<string, string>([['funcionarios:modo', 'completo'], ['funcionarios:modo:esquema', '2']])
  Object.assign(doc.documentElement, { dataset: {} })
  Object.assign(NoTeste.prototype, { focus() {}, closest() { return null }, querySelectorAll() { return [] }, getContext() { return webgl ? {} : null } })
  vi.stubGlobal('document', doc)
  vi.stubGlobal('window', Object.assign(eventos, { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {}, WebGLRenderingContext: webgl ? class {} : undefined }))
  vi.stubGlobal('addEventListener', eventos.addEventListener.bind(eventos)); vi.stubGlobal('removeEventListener', eventos.removeEventListener.bind(eventos))
  vi.stubGlobal('location', { hash: '', search: '' })
  vi.stubGlobal('Element', NoTeste)
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal('MutationObserver', class { observe() {} disconnect() {} })
  vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) || null, setItem: (k: string, v: string) => storage.set(k, v) })
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] }); vi.setSystemTime(new Date('2026-12-30T12:00:00-03:00'))
  cena.montar.mockReset(); cena.definir.mockClear(); cena.destruir.mockClear()
  cena.montar.mockImplementation(() => ({ definirEstado: cena.definir, destruir: cena.destruir, irPara() {}, tema() {} }))
  const container = doc.createElement('div'); doc.body.appendChild(container)
  const root = createRoot(container as unknown as HTMLElement)
  return { root, container, storage, eventos,
    render: async (ctx: Ctx, rota: Rota, filhos: ReactNode = createElement(AgenteDaAba, { rota })) => { await act(async () => root.render(createElement(ContextoApp.Provider, { value: ctx }, filhos))) },
    limpar: async () => { await act(async () => eventos.dispatchEvent(new Event('storage'))); await act(async () => root.unmount()); vi.useRealTimers(); vi.unstubAllGlobals() },
  }
}
function botao(n: NoTeste, texto: string) { const b = n.buscar(n => n.tagName === 'BUTTON' && n.textContent === texto)[0]; expect(b, texto).toBeDefined(); return b }
const perguntas = (n: NoTeste) => n.buscar(n => n.getAttribute('data-pergunta') !== null)
function memoria(ctx: Ctx, storage: Map<string, string>) { return lerMemoria(storage.get(chaveArmazenamento(ctx.api.modo, 'u', ctx.familia!.id)) || null) }

it('integração final: Início segue primeira pergunta autorizada, Painel usa fala do dono e legenda segue degradação', async () => {
 const a = ambiente(true), ctx = contextoLigacao('nenhum')
 const fila = [
  { id: 'bloqueada', funcionario: 'cartao', pergunta: 'Não exibir', contexto: '', opcoes: [] },
  { id: 'lancou:permitida', funcionario: 'contador', pergunta: 'Conferir meu gasto?', contexto: '', opcoes: [] },
 ]
 vi.mocked(ctx.api.escritorioHoje).mockResolvedValue({ funcionarios: [], trabalhando: [], entregue: [], precisa_de_voce: fila })
 lojaEscritorio(ctx.api, ctx.familia!.id).travas.set('bloqueada', 'respondida')
 try {
  await a.render(ctx, 'inicio')
  expect(cena.montar.mock.calls[cena.montar.mock.calls.length - 1][2].funcionarios.map((f: { id: string }) => f.id)).toEqual(['anfitriao', 'contador'])
  expect(a.container.textContent).toContain('Conferir meu gasto?')
  expect(a.container.textContent).not.toContain('Não exibir')
  const dono = { ...ctx, sessao: { ...ctx.sessao!, dono: true } }
  await a.render(dono, 'painel')
  expect(a.container.textContent).toContain(FALA_ANALISTA)
  const original = composicao.composicaoMini
  const spy = vi.spyOn(composicao, 'composicaoMini').mockImplementation((sala, ids) => original(sala, ids, { desenhos: 1, triangulos: 1, KB: 1 }))
  try {
   await a.render(ctx, 'guardado')
   expect(cena.montar.mock.calls[cena.montar.mock.calls.length - 1][2].funcionarios.map((f: { id: string }) => f.id)).toEqual(['guardado'])
   expect(a.container.textContent).not.toContain('Com Ajudante dos Imóveis')
  } finally { spy.mockRestore() }
  for (const compacto of [false, true]) {
   await a.render(ctx, 'planejamento', createElement(RumoHero, { calculo: null, compacto, abrir() {} }))
   expect(a.container.textContent).toContain('Tesoureiro de Receitas: confira as premissas')
   expect(a.container.textContent).not.toContain('Analista do Painel')
  }
  for (const perfil of ['casal', 'pessoa', 'equipe', 'dono'] as const) {
   for (const rota of Object.keys(PRINCIPAL_POR_ABA) as Rota[]) {
    const papel = perfil === 'dono' ? 'casal' : perfil, ehDono = perfil === 'dono'
    await act(async () => a.root.render(null))
    cena.montar.mockClear()
    const restrito = { ...ctx, familia: { ...ctx.familia!, papel }, sessao: { ...ctx.sessao!, dono: ehDono } }
    await a.render(restrito, rota)
    const permitida = rotaPermitida(rota, papel, ehDono) === rota
    expect(cena.montar.mock.calls.length, perfil + rota).toBe(permitida ? 1 : 0)
    if (permitida) {
     const elenco = elencoDaAba({ rota, papel, ehDono, filaGeral: rota === 'inicio' ? [{ funcionario: 'contador' }] : [] })
     expect(cena.montar.mock.calls[0][2].funcionarios.map((f: { id: string }) => f.id)).toEqual([elenco.principal, ...elenco.secundarios])
    }
    if (papel === 'equipe') expect(a.container.textContent).not.toMatch(/R\$|renda|2029|fatura/i)
   }
  }
 } finally { await a.limpar() }
})

it.each(CASOS_LIGACAO)('ligação: %s na aba %s, funcionário %s, uma pergunta e sem polling', async (tipo, rota, funcionario, texto) => {
  const a = ambiente(), ctx = contextoLigacao(tipo)
  try {
    await a.render(ctx, rota)
    expect(a.container.textContent).toContain(texto)
    expect(a.container.buscar(n => n.getAttribute('data-agente') === funcionario)).toHaveLength(1)
    expect(perguntas(a.container)).toHaveLength(1)
    expect(a.container.textContent).toContain('Precisa de você')
    expect(a.container.textContent).toContain(funcionario === 'colchao' ? 'Ver resumo desta tela' : 'Ver tarefas e cadastros')
    const antes = Object.values(ctx.api).filter(v => vi.isMockFunction(v)).map(v => vi.mocked(v).mock.calls.length)
    await act(async () => { await vi.advanceTimersByTimeAsync(90000); a.eventos.dispatchEvent(new Event('focus')) })
    expect(Object.values(ctx.api).filter(v => vi.isMockFunction(v)).map(v => vi.mocked(v).mock.calls.length)).toEqual(antes)
    expect(cena.montar).not.toHaveBeenCalled()
  } finally { await a.limpar() }
})

it('ligação: mini muda sem recriar cena, inclusive movimento reduzido e falha do contexto', async () => {
  const a = ambiente(true)
  try {
    for (const estado of ['chamando', 'resolvido', 'parado', 'trabalhando'] as const) {
      await act(async () => a.root.render(createElement(MiniAgente, { id: 'cartao', sala: 'cartoes', estado })))
      expect(cena.definir).toHaveBeenLastCalledWith('cartao', estado)
      expect(cena.montar).toHaveBeenCalledTimes(1)
    }
    expect(cena.montar.mock.calls[0][2].parado).toBe(true)
    await act(async () => cena.montar.mock.calls[0][2].aoContexto('falhou'))
    expect(a.container.textContent).toContain('Trabalhando')
    expect(a.container.buscar(n => n.getAttribute('class') === 'cena3d mini-agente')).toHaveLength(0)
  } finally { await a.limpar() }
})

it.each(['trabalhando', 'vai_comecar'] as const)('ligação: banco vence insight, sucesso celebra 1,6s e retorna a %s', async estado => {
  const a = ambiente(true), ctx = contextoLigacao('fatura_vencendo')
  const f = { id: 'cartao', nome: 'Analista de Cartão', sala: 'cartoes', estado, frase: 'Conferindo as compras.' }
  let pendente = true
  vi.mocked(ctx.api.escritorioHoje).mockImplementation(async () => ({ funcionarios: [f], trabalhando: [], entregue: [], precisa_de_voce: pendente ? [{ id: 'banco', funcionario: 'cartao', pergunta: 'Pergunta do banco', contexto: '', opcoes: [{ id: 'sim', rotulo: 'Sim' }] }] : [] }))
  vi.mocked(ctx.api.escritorioResponder).mockImplementation(async () => { pendente = false; return {} })
  try {
    await a.render(ctx, 'cartoes')
    expect(a.container.textContent).toContain('Pergunta do banco')
    expect(a.container.textContent).not.toContain('Sua fatura vence')
    expect(memoria(ctx, a.storage)).toEqual({}) // insight encoberto não foi visto
    expect(cena.definir).toHaveBeenLastCalledWith('cartao', 'chamando')
    // Retira também a fonte do insight na confirmação: nada mais a perguntar.
    vi.mocked(ctx.api.faturas).mockResolvedValue([])
    await act(async () => botao(a.container, 'Sim').click())
    expect(cena.definir).toHaveBeenLastCalledWith('cartao', 'resolvido')
    await act(async () => { await vi.advanceTimersByTimeAsync(1599) })
    expect(cena.definir).toHaveBeenLastCalledWith('cartao', 'resolvido')
    // O insight já lido existe: adia para ficar só o estado do funcionário.
    if (perguntas(a.container).some(n => n.getAttribute('data-pergunta')?.startsWith('insight:'))) await act(async () => botao(a.container, 'Depois').click())
    await act(async () => { await vi.advanceTimersByTimeAsync(1600) })
    expect(cena.definir).toHaveBeenLastCalledWith('cartao', estado === 'vai_comecar' ? 'parado' : 'trabalhando')
    expect(cena.montar).toHaveBeenCalledTimes(1)
  } finally { await a.limpar() }
})

it('ligação: duas instâncias compartilham leitura e trava; ficha aberta assume a pergunta', async () => {
  const a = ambiente(), ctx = contextoLigacao('fatura_vencendo')
  let concluir!: () => void
  vi.mocked(ctx.api.faturaInformar).mockImplementation(() => new Promise<void>(r => { concluir = r }))
  const fundo = createElement(AgenteDaAba, { rota: 'cartoes' })
  const ficha = createElement(Sheet, { titulo: 'Ficha', fechar() {}, children: createElement(AgenteDaAba, { rota: 'cartoes' }) })
  try {
    await a.render(ctx, 'cartoes', fundo)
    await a.render(ctx, 'cartoes', createElement(Fragment, null, fundo, ficha))
    expect(perguntas(a.container)).toHaveLength(1)
    const dialogo = a.container.buscar(n => n.getAttribute('role') === 'dialog')[0]
    expect(perguntas(dialogo)).toHaveLength(1)
    expect(ctx.api.cartoes).toHaveBeenCalledTimes(1)
    expect(ctx.api.faturas).toHaveBeenCalledTimes(1)
    expect(ctx.api.lancamentos).toHaveBeenCalledTimes(26)
    await act(async () => { const b = botao(dialogo, 'Paguei hoje'); b.click(); b.click() })
    expect(ctx.api.faturaInformar).toHaveBeenCalledTimes(1)
    expect(ctx.api.escritorioResponder).not.toHaveBeenCalled()
    // Releitura da API e recarregar falham depois da escrita confirmada.
    vi.mocked(ctx.api.faturas).mockRejectedValue(new Error('offline'))
    vi.mocked(ctx.recarregar).mockRejectedValue(new Error('offline'))
    await act(async () => concluir())
    expect(a.container.textContent).toContain('Respondido')
    expect(Object.values(memoria(ctx, a.storage)).some(m => m.resolvido)).toBe(true)
    expect(a.container.buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Paguei hoje')).toHaveLength(0)
    await a.render({ ...ctx, versao: 1 }, 'cartoes', createElement(Fragment, null, fundo, ficha))
    expect(ctx.api.faturaInformar).toHaveBeenCalledTimes(1)
  } finally { await a.limpar() }
})

it('ligação: ficha real tem prioridade sobre banco no fundo, e releitura falha mantém trava', async () => {
  const a = ambiente(), ctx = contextoLigacao('nenhum')
  const f = { id: 'fiscal', nome: 'Fiscal da Feira', sala: 'casa', estado: 'trabalhando' as const, frase: 'Conferindo.' }
  const p = { id: 'banco-ficha', funcionario: 'fiscal', pergunta: 'Fez a feira?', contexto: '', opcoes: [{ id: 'sim', rotulo: 'Sim' }] }
  const e = { funcionarios: [f], trabalhando: [], entregue: [], precisa_de_voce: [p] }
  vi.mocked(ctx.api.escritorioHoje).mockResolvedValueOnce(e).mockRejectedValue(new Error('offline'))
  function Ficha() { const { responder, e: atual } = useEscritorio(); return createElement(FichaFuncionario, { f, e: atual || e, responder, fechar() {} }) }
  try {
    await a.render(ctx, 'casa', createElement(Fragment, null, createElement(AgenteDaAba, { rota: 'casa' }), createElement(Ficha)))
    const dialogo = a.container.buscar(n => n.getAttribute('role') === 'dialog')[0]
    expect(perguntas(a.container)).toHaveLength(1); expect(perguntas(dialogo)).toHaveLength(1)
    await act(async () => { const b = botao(dialogo, 'Sim'); b.click(); b.click() })
    expect(ctx.api.escritorioResponder).toHaveBeenCalledTimes(1)
    expect(a.container.textContent).toContain('Respondido')
    expect(lojaEscritorio(ctx.api, ctx.familia!.id).travas.get(p.id)).toBe('respondida')
    await act(async () => botao(dialogo, 'Recarregar').click())
    expect(a.container.buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Sim')).toHaveLength(0)
    expect(ctx.api.escritorioResponder).toHaveBeenCalledTimes(1)
    expect(a.container.textContent).toContain('Resposta enviada. Recarregue para confirmar.')
    // A celebração também precisa aparecer quando a releitura confirma imediatamente.
    const novo = contextoLigacao('nenhum')
    let pendente = true
    vi.mocked(novo.api.escritorioHoje).mockImplementation(async () => ({ ...e, precisa_de_voce: pendente ? [p] : [] }))
    vi.mocked(novo.api.escritorioResponder).mockImplementation(async () => { pendente = false; return {} })
    await a.render(novo, 'casa', createElement(Fragment, null, createElement(AgenteDaAba, { rota: 'casa' }), createElement(Ficha)))
    await act(async () => botao(a.container, 'Sim').click())
    expect(a.container.textContent).toContain('Respondido')
    expect(novo.api.escritorioResponder).toHaveBeenCalledTimes(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(1600) })
    expect(a.container.textContent).toContain('Trabalhando')
  } finally { await a.limpar() }
})

it('ligação: depois adia, falha mostra erro genérico sem repetir envio, resolvido é lembrado', async () => {
  const a = ambiente(), ctx = contextoLigacao('fatura_vencendo')
  vi.mocked(ctx.api.faturaInformar).mockRejectedValue(new Error('Mensagem técnica privada'))
  try {
    await a.render(ctx, 'cartoes')
    await act(async () => botao(a.container, 'Paguei hoje').click())
    expect(a.container.textContent).toContain('Não deu certo. Tente de novo.')
    expect(a.container.textContent).not.toContain('Mensagem técnica privada')
    await act(async () => { await vi.advanceTimersByTimeAsync(60000) })
    expect(ctx.api.faturaInformar).toHaveBeenCalledTimes(1)
    expect(Object.values(memoria(ctx, a.storage)).some(m => m.resolvido)).toBe(false)
    await act(async () => botao(a.container, 'Depois').click())
    expect(Object.values(memoria(ctx, a.storage)).some(m => m.adiadoAte! > Date.now())).toBe(true)
    expect(perguntas(a.container)).toHaveLength(0)
    const outro = contextoLigacao('aplicacao')
    await a.render(outro, 'guardado')
    await act(async () => botao(a.container, 'Já resolvido').click())
    expect(Object.values(memoria(outro, a.storage)).some(m => m.resolvido)).toBe(true)
  } finally { await a.limpar() }
})

it('ligação: exemplo identificado e isolado da família real, inclusive memória', async () => {
  const a = ambiente(), real = contextoLigacao('fatura_vencendo')
  const exemplo = { ...real, api: { ...real.api, modo: 'exemplo' as const, faturaInformar: vi.fn(async () => {}) } }
  try {
    await a.render(exemplo, 'cartoes')
    expect(a.container.textContent).toContain('Exemplo: nada é gravado na família real')
    await act(async () => botao(a.container, 'Paguei hoje').click())
    expect(exemplo.api.faturaInformar).toHaveBeenCalledTimes(1)
    expect(real.api.faturaInformar).not.toHaveBeenCalled()
    expect(memoria(real, a.storage)).toEqual({})
    await a.render(real, 'cartoes')
    expect(perguntas(a.container)).toHaveLength(1)
    expect(a.container.textContent).not.toContain('Exemplo:')
  } finally { await a.limpar() }
})

it('ligação: equipe só vê Casa sem nomes/valores; nota abre tarefa sem gravar', async () => {
  const a = ambiente(), base = contextoLigacao('feira_nota'), ctx = { ...base, familia: { ...base.familia!, papel: 'equipe' as const } }
  try {
    for (const rota of ['cartoes', 'planejamento', 'guardado', 'inicio'] as const) { await a.render(ctx, rota); expect(a.container.textContent).toBe('') }
    expect(ctx.api.cartoes).not.toHaveBeenCalled(); expect(ctx.api.guardadoHoje).not.toHaveBeenCalled(); expect(ctx.api.recebimentos).not.toHaveBeenCalled()
    await a.render(ctx, 'casa')
    expect(perguntas(a.container)).toHaveLength(1)
    expect(a.container.textContent).not.toMatch(/NomeSentinelaPrivado|9\.876|876,54/)
    await act(async () => botao(a.container, 'Guardar a nota').click())
    expect(a.container.buscar(n => n.getAttribute('role') === 'dialog' && n.getAttribute('aria-label') === 'Guardar a nota da feira')).toHaveLength(1)
    expect(a.container.buscar(n => n.tagName === 'INPUT' && n.getAttribute('type') === 'file')).toHaveLength(1)
    expect(ctx.api.feiraAnexarNota).not.toHaveBeenCalled()
    expect(ctx.api.escritorioResponder).not.toHaveBeenCalled()
  } finally { await a.limpar() }
})

it('ligação: propostas concorrentes no Planejamento mostram uma pergunta, com o funcionário de cada assunto', async () => {
  const a = ambiente(), ctx = { ...contextoLigacao('recebimento'), resumo: contextoLigacao('reserva').resumo }
  try {
    await a.render(ctx, 'planejamento')
    expect(perguntas(a.container)).toHaveLength(1)
    expect(a.container.buscar(n => n.getAttribute('data-agente') === 'colchao')).toHaveLength(1)
    expect(a.container.textContent).not.toContain('Esse dinheiro já entrou')
    await act(async () => botao(a.container, 'Depois').click())
    expect(perguntas(a.container)).toHaveLength(1)
    expect(a.container.buscar(n => n.getAttribute('data-agente') === 'tesoureiro')).toHaveLength(1)
    await act(async () => botao(a.container, 'Confirmar recebimento').click())
    await act(async () => botao(a.container, 'Salvar resposta').click())
    expect(ctx.api.recebimentoMudar).toHaveBeenCalledTimes(1)
    expect(ctx.api.recebimentoMudar).toHaveBeenCalledWith(ctx.familia!.id, 'r', { recebido_em: '2026-12-30', valor_recebido: 9876.54 })
    expect(ctx.api.escritorioResponder).not.toHaveBeenCalled()
    expect(perguntas(a.container)).toHaveLength(0)
  } finally { await a.limpar() }
})

it('ligação: diálogo que encobre a aba não marca insight visto; fechar revela sem reler', async () => {
  const a = ambiente(), ctx = contextoLigacao('aplicacao'), fundo = createElement(AgenteDaAba, { rota: 'guardado' })
  try {
    await a.render(ctx, 'guardado', createElement(Fragment, null, fundo, createElement(Sheet, { titulo: 'Outra ficha', fechar() {}, children: 'Cadastro' })))
    expect(perguntas(a.container)).toHaveLength(0)
    expect(memoria(ctx, a.storage)).toEqual({})
    await a.render(ctx, 'guardado', createElement(Fragment, null, fundo))
    expect(perguntas(a.container)).toHaveLength(1)
    expect(Object.values(memoria(ctx, a.storage)).some(m => m.vistoEm === '2026-12-30')).toBe(true)
    expect(ctx.api.guardadoHoje).toHaveBeenCalledTimes(1)
  } finally { await a.limpar() }
})

it('ligação: sucesso do insight leva mini de chamando a resolvido e parado sem remontar nem tick', async () => {
  const a = ambiente(true), ctx = contextoLigacao('fatura_vencendo')
  try {
    await a.render(ctx, 'cartoes')
    expect(cena.definir).toHaveBeenLastCalledWith('cartao', 'chamando')
    await act(async () => botao(a.container, 'Paguei hoje').click())
    expect(cena.definir).toHaveBeenLastCalledWith('cartao', 'resolvido')
    await act(async () => { await vi.advanceTimersByTimeAsync(1600) })
    expect(cena.definir).toHaveBeenLastCalledWith('cartao', 'parado')
    const chamadas = cena.definir.mock.calls.length
    await act(async () => { await vi.advanceTimersByTimeAsync(90000); a.eventos.dispatchEvent(new Event('focus')) })
    expect(cena.definir).toHaveBeenCalledTimes(chamadas)
    expect(cena.montar).toHaveBeenCalledTimes(1)
  } finally { await a.limpar() }
})

it('UX: Recolher conserva a cena; escolhas explícitas dispensam WebGL', async () => {
 const a = ambiente(true), ctx = contextoLigacao('nenhum')
 try {
  const filhos = createElement(Fragment, null, createElement(ControleFuncionarios), createElement(AgenteDaAba, { rota: 'cartoes' }))
  await a.render(ctx, 'cartoes', filhos)
  expect(cena.montar).toHaveBeenCalledTimes(1)
  await act(async () => botao(a.container, 'Recolher').click())
  expect(cena.destruir).not.toHaveBeenCalled()
  await act(async () => botao(a.container, 'Expandir').click())
  expect(cena.montar).toHaveBeenCalledTimes(1)
  await act(async () => botao(a.container, 'Só texto').click())
  expect(cena.destruir).toHaveBeenCalledTimes(1)
  expect(a.storage.get('funcionarios:modo')).toBe('compacto')
  await act(async () => botao(a.container, 'Desligado').click())
  expect(a.storage.get('funcionarios:modo')).toBe('desligado')
  expect(cena.montar).toHaveBeenCalledTimes(1)
  await act(async () => botao(a.container, 'Completo').click())
  expect(cena.montar).toHaveBeenCalledTimes(2)
 } finally { await a.limpar() }
})

// Apenas a fronteira WebGL é substituída; componentes, preferência e hooks são reais.
it.each(['completo', 'compacto', 'desligado'] as const)('cobertura modos: %s persiste por aparelho entre montagens', async modo => {
 const a = ambiente(true), ctx = contextoLigacao('nenhum')
 try {
  await a.render(ctx, 'cartoes', createElement(ControleFuncionarios))
  await act(async () => botao(a.container, modo === 'completo' ? 'Completo' : modo === 'compacto' ? 'Só texto' : 'Desligado').click())
  expect(a.storage.get('funcionarios:modo')).toBe(modo)
  // Invalida enquanto ainda há assinante; depois desmonta, forçando leitura do storage.
  await act(async () => a.eventos.dispatchEvent(new Event('storage')))
  await act(async () => a.root.render(null))
  await a.render(ctx, 'cartoes', createElement(Fragment, null, createElement(ControleFuncionarios), createElement(AgenteDaAba, { rota: 'cartoes' })))
  expect(a.container.buscar(n => n.getAttribute('aria-pressed') === 'true').map(n => n.textContent)).toEqual([modo === 'completo' ? 'Completo' : modo === 'compacto' ? 'Só texto' : 'Desligado'])
  expect(cena.montar.mock.calls.length).toBe(modo === 'completo' ? 1 : 0)
 } finally { await a.limpar() }
})
it.each(['invalido', 'throw'])('cobertura modos: storage %s usa completo e permite mudar na sessão', async tipo => {
 const a = ambiente(true), ctx = contextoLigacao('nenhum')
 try {
  a.storage.set('funcionarios:modo', 'estranho')
  if (tipo === 'throw') vi.stubGlobal('localStorage', { getItem() { throw Error('indisponível') }, setItem() { throw Error('cheio') } })
  a.eventos.dispatchEvent(new Event('storage'))
  await a.render(ctx, 'cartoes', createElement(Fragment, null, createElement(ControleFuncionarios), createElement(AgenteDaAba, { rota: 'cartoes' })))
  expect(botao(a.container, 'Completo').getAttribute('aria-pressed')).toBe('true')
  expect(cena.montar).toHaveBeenCalledTimes(1)
  await act(async () => botao(a.container, 'Completo').click())
  expect(botao(a.container, 'Completo').getAttribute('aria-pressed')).toBe('true')
  expect(cena.montar).toHaveBeenCalledTimes(1)
 } finally { await a.limpar() }
})
it.each(['compacto', 'desligado'])('cobertura modos: pergunta pendente no %s aparece automaticamente', async modo => {
 const a = ambiente(true)
 try {
  a.storage.set('funcionarios:modo', modo); a.eventos.dispatchEvent(new Event('storage'))
  await a.render(contextoLigacao('fatura_vencendo'), 'cartoes')
  expect(perguntas(a.container)).toHaveLength(1)
  expect(a.container.textContent).toContain('Já pagou a fatura que vence em breve?')
  expect(cena.montar.mock.calls.length).toBe(0)
  if (modo === 'compacto') expect(botao(a.container, 'Recolher')).toBeDefined()
 } finally { await a.limpar() }
})
it('cobertura modos: vinte alternâncias descartam cada renderer e não prendem expansão', async () => {
 const a = ambiente(true), ctx = contextoLigacao('nenhum'), vivos = new Set<object>(), disposes: ReturnType<typeof vi.fn>[] = []
 cena.montar.mockImplementation(() => {
  const renderer = {}, dispose = vi.fn(() => vivos.delete(renderer)); vivos.add(renderer); disposes.push(dispose)
  return { definirEstado: cena.definir, destruir: dispose, irPara() {}, tema() {} }
 })
 try {
  a.storage.set('funcionarios:modo', 'compacto'); a.eventos.dispatchEvent(new Event('storage'))
  await a.render(ctx, 'cartoes', createElement(Fragment, null, createElement(ControleFuncionarios), createElement(AgenteDaAba, { rota: 'cartoes' })))
  const agente = a.container.buscar(n => n.getAttribute('data-agente') === 'cartao')[0]
  for (let i = 0; i < 20; i++) {
   await act(async () => botao(a.container, 'Completo').click())
   expect(vivos.size).toBe(1); expect(botao(a.container, 'Recolher')).toBeDefined()
   await act(async () => botao(a.container, 'Só texto').click())
   expect(vivos.size).toBe(0); expect(botao(a.container, 'Recolher')).toBeDefined()
   expect(a.container.buscar(n => n.getAttribute('data-agente') === 'cartao')[0]).toBe(agente)
  }
  // Também cobre mudanças no mesmo turno, antes de os imports assíncronos concluírem.
  await act(async () => { for (let i = 0; i < 20; i++) { botao(a.container, 'Completo').click(); botao(a.container, 'Só texto').click() } })
  expect(vivos.size).toBe(0)
  expect(botao(a.container, 'Recolher')).toBeDefined()
  expect(cena.montar).toHaveBeenCalledTimes(20)
  for (const dispose of disposes) expect(dispose).toHaveBeenCalledTimes(1)
  await act(async () => botao(a.container, 'Completo').click())
  expect(vivos.size).toBe(1)
 } finally { await a.limpar() }
 expect(vivos.size).toBe(0)
 expect(disposes).toHaveLength(21)
 for (const dispose of disposes) expect(dispose).toHaveBeenCalledTimes(1)
})
it.each(['query', 'hash', 'sem-webgl'])('cobertura modos: fallback %s mantém pergunta sem renderer', async tipo => {
 const a = ambiente(tipo !== 'sem-webgl')
 try {
  a.storage.set('funcionarios:modo', 'completo'); a.eventos.dispatchEvent(new Event('storage'))
  if (tipo === 'query') location.search = '?sem3d'
  if (tipo === 'hash') location.hash = '#/cartoes?sem3d'
  await a.render(contextoLigacao('fatura_vencendo'), 'cartoes')
  expect(cena.montar).not.toHaveBeenCalled()
  expect(perguntas(a.container)).toHaveLength(1)
  expect(a.container.textContent).toContain('Já pagou a fatura que vence em breve?')
 } finally { await a.limpar() }
})

it.each(['automatico', 'compacto', 'desligado', 'completo', 'invalido', null])('migra preferência antiga %s uma única vez', async antigo => {
 expect(migrarModoFuncionario(antigo, null)).toBe('completo')
 const a = ambiente(true)
 try {
  a.storage.delete('funcionarios:modo:esquema')
  if (antigo) a.storage.set('funcionarios:modo', antigo); else a.storage.delete('funcionarios:modo')
  a.eventos.dispatchEvent(new Event('storage'))
  await a.render(contextoLigacao('nenhum'), 'cartoes', createElement(Fragment, null, createElement(ControleFuncionarios), createElement(AgenteDaAba, { rota: 'cartoes' })))
  expect(cena.montar).toHaveBeenCalledTimes(1)
  expect(a.storage.get('funcionarios:modo:esquema')).toBe('2')
  await act(async () => botao(a.container, 'Só texto').click())
  expect(migrarModoFuncionario(a.storage.get('funcionarios:modo')!, '2')).toBe('compacto')
 } finally { await a.limpar() }
})

it.each(Object.keys(SALA_POR_ABA) as Rota[])('3D por padrão em %s com elenco e sala do contrato', async rota => {
 const a = ambiente(true), base = contextoLigacao('nenhum'), ctx = { ...base, sessao: { ...base.sessao!, dono: true } }
 a.storage.clear(); a.eventos.dispatchEvent(new Event('storage'))
 try {
  await a.render(ctx, rota)
  const elenco = elencoDaAba({ rota, papel: 'casal', ehDono: true })
  expect(cena.montar).toHaveBeenCalledTimes(1)
  const opcoes = cena.montar.mock.calls[0][2]
  expect(opcoes.sala).toBe(elenco.sala)
  expect(opcoes.funcionarios.map((f: { id: string }) => f.id)).toEqual([elenco.principal, ...elenco.secundarios])
  expect(a.container.buscar(n => n.getAttribute('aria-label')?.startsWith('Escritório ilustrativo com ') === true)).toHaveLength(1)
 } finally { await a.limpar() }
})

it('pergunta da Reserva mantém Tesoureiro principal e só celebra o dono, sem remontar', async () => {
 const a = ambiente(true), ctx = contextoLigacao('reserva')
 try {
  await a.render(ctx, 'planejamento')
  expect(cena.montar.mock.calls[0][2].funcionarios.map((f: { id: string }) => f.id)).toEqual(['tesoureiro', 'colchao'])
  expect(cena.definir).toHaveBeenCalledWith('tesoureiro', 'parado')
  expect(cena.definir).toHaveBeenCalledWith('colchao', 'chamando')
  expect(a.container.textContent).toContain('Guardião da Reserva')
  expect(a.container.textContent).toContain('Com Tesoureiro de Receitas')
  await act(async () => botao(a.container, 'Já resolvido').click())
  expect(cena.definir).toHaveBeenCalledWith('colchao', 'resolvido')
  expect(cena.definir).not.toHaveBeenCalledWith('tesoureiro', 'resolvido')
  expect(cena.montar).toHaveBeenCalledTimes(1)
 } finally { await a.limpar() }
})

it('trocas rápidas entre todas as abas descartam cada renderer', async () => {
 const a = ambiente(true), base = contextoLigacao('nenhum'), ctx = { ...base, sessao: { ...base.sessao!, dono: true } }, vivos = new Set<object>()
 cena.montar.mockImplementation(() => {
  const renderer = {}; vivos.add(renderer)
  return { definirEstado() {}, tema() {}, irPara() {}, destruir() { vivos.delete(renderer) } }
 })
 try {
  for (const rota of Object.keys(SALA_POR_ABA) as Rota[]) { await a.render(ctx, rota); expect(vivos.size).toBe(1) }
 } finally { await a.limpar() }
 expect(vivos.size).toBe(0)
})

it('falha ao montar a cena conserva o cartão e suas ações', async () => {
 const a = ambiente(true)
 cena.montar.mockImplementation(() => { throw Error('WebGL indisponível') })
 try {
  await a.render(contextoLigacao('fatura_vencendo'), 'cartoes')
  expect(a.container.textContent).toContain('Em lista')
  expect(perguntas(a.container)).toHaveLength(1)
  expect(botao(a.container, 'Paguei hoje')).toBeDefined()
 } finally { await a.limpar() }
})

it('Mini atualiza estados de cada pessoa sem refazer a composição', async () => {
 const a = ambiente(true), ctx = contextoLigacao('nenhum')
 try {
  await a.render(ctx, 'planejamento', createElement(MiniAgente, { id: 'tesoureiro', sala: 'caixa', funcionarios: [{ id: 'tesoureiro', estado: 'parado' }, { id: 'colchao', estado: 'chamando' }] }))
  await a.render(ctx, 'planejamento', createElement(MiniAgente, { id: 'tesoureiro', sala: 'caixa', funcionarios: [{ id: 'tesoureiro', estado: 'trabalhando' }, { id: 'colchao', estado: 'resolvido' }] }))
  expect(cena.definir).toHaveBeenCalledWith('tesoureiro', 'trabalhando')
  expect(cena.definir).toHaveBeenCalledWith('colchao', 'resolvido')
  expect(cena.montar).toHaveBeenCalledTimes(1)
 } finally { await a.limpar() }
})

it('Guardado não troca o elenco por pergunta de Usina', async () => {
 const a = ambiente(true), ctx = contextoLigacao('nenhum')
 ctx.api.escritorioHoje = vi.fn().mockResolvedValue({ funcionarios: [], entregue: [], trabalhando: [], precisa_de_voce: [{ id: 'usina', funcionario: 'usina', pergunta: 'Pergunta fora do elenco', contexto: '', opcoes: [] }] })
 try {
  await a.render(ctx, 'guardado')
  expect(a.container.textContent).not.toContain('Pergunta fora do elenco')
  expect(cena.montar.mock.calls[0][2].funcionarios.map((f: { id: string }) => f.id)).toEqual(['guardado', 'imoveis'])
 } finally { await a.limpar() }
})
