import { act, createElement, Fragment, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { ContextoApp, type Ctx } from '../app/contexto'
import { apiExemplo } from '../api/exemplo'
import { Cadastro, FichaFuncionario } from '../telas/escritorio/Ficha'
import { Guardado } from '../telas/guardado/Guardado'
import { Imoveis } from '../telas/guardado/Imoveis'
import { AgenteDaAba, AGENTE_POR_ABA } from './AgenteDaAba'
import { DocumentoTeste, NoTeste } from '../telas/escritorio/numeros.dom-teste'
import { useEscritorio } from '../app/useDados2'
import { PerguntaCard } from './Pergunta'
import { hojeRecife, esconderValores, reais } from '../lib/formato'
import type { Api, ImovelTela } from '../api/tipos'
import type { Rota } from '../app/rotas'

afterEach(() => { vi.unstubAllGlobals(); esconderValores(false) })
async function montar(elemento: ReactElement, mudancas: Partial<Api> = {}, equipe = false) {
  const doc = new DocumentoTeste()
  Object.assign(NoTeste.prototype, { focus() {}, closest() { return null }, querySelectorAll() { return [] } })
  Object.assign(doc.documentElement, { dataset: {} })
  vi.stubGlobal('document', doc)
  vi.stubGlobal('window', Object.assign(new EventTarget(), { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {} }))
  vi.stubGlobal('localStorage', { getItem() { return null }, setItem() {} })
  vi.stubGlobal('location', { hash: '#/casa?sem3d', search: '?sem3d' })
  vi.stubGlobal('history', { state: null, replaceState(_s: unknown, _t: string, url: string) { location.hash = url.slice(url.indexOf('#')) } })
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const sessao = (await apiExemplo.sessao())!
  const familia = { ...sessao.familias[0], papel: equipe ? 'equipe' as const : 'casal' as const }
  const api = { ...apiExemplo, ...mudancas }
  const ctx = { api, sessao, familia, versao: 0, oculto: false, toast() {}, recarregar: async () => {}, tentar: async (f: () => Promise<unknown>) => { await f(); return true } } as unknown as Ctx
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
  const navegar = async (texto: string) => {
    const link = container.buscar(n => n.tagName === 'A' && n.textContent === texto)[0]
    expect(link, texto).toBeDefined()
    await act(async () => link.click())
  }
  return { api, ctx, familia, container, clicar, preencher, navegar, fechar: async () => { await act(async () => root.unmount()) } }
}

it('equipe só monta agente em Casa e a feira não pede nem envia dinheiro', async () => {
  expect(Object.keys(AGENTE_POR_ABA)).toHaveLength(12)
  for (const rota of Object.keys(AGENTE_POR_ABA)) {
    const feiraRegistrar = vi.fn(async () => {})
    const a = await montar(createElement(AgenteDaAba, { rota: rota as Rota }), { feiraRegistrar }, true)
    try {
      expect(a.container.buscar(n => !!n.getAttribute('data-agente')).length).toBe(rota === 'casa' ? 1 : 0)
      if (rota !== 'casa') continue
      await a.clicar('Conversar e abrir tarefas'); await a.clicar('Nova feira')
      expect(a.container.textContent).not.toContain('Quanto deu')
      expect(a.container.textContent).not.toContain('R$')
      await a.clicar('Salvar')
      expect(feiraRegistrar).toHaveBeenCalledWith(a.familia.id, { data: hojeRecife(), loja: '' })
    } finally { await a.fechar() }
  }
}, 20000)

it('Cartões informa valor do banco em reais e data de pagamento', async () => {
  const faturaInformar = vi.fn(async () => {})
  const a = await montar(createElement(AgenteDaAba, { rota: 'cartoes' }), {
    faturaInformar, cartoes: async () => [], faturasBanco: async () => [],
    faturas: async () => [{ cartao_id: 'cartao', cartao: 'Banco', mes: '2026-11', vencimento: '2026-11-20', total: 10, fechada: true }],
  })
  try {
    await a.clicar('Conversar e abrir tarefas'); await a.clicar('Editar')
    await a.preencher('Valor que veio no banco', '123,45')
    await a.preencher('Paga em (deixe vazio se ainda não pagou)', '2026-11-15')
    await a.clicar('Salvar')
    expect(faturaInformar).toHaveBeenCalledWith(a.familia.id, 'cartao', '2026-11', { valor_banco: 123.45, paga_em: '2026-11-15' })
  } finally { await a.fechar() }
})

it.each(['feito', 'adiar_para'])('pergunta pendente da Secretária responde %s pelo contrato original, mesmo fora das primeiras três', async opcao => {
  const escritorioResponder = vi.fn(async () => {})
  const a = await montar(createElement(AgenteDaAba, { rota: 'escritorio' }), {
    escritorioResponder,
    escritorioHoje: async () => ({ funcionarios: [], entregue: [], trabalhando: [], precisa_de_voce: [
      ...[1, 2, 3].map(n => ({ id: String(n), funcionario: 'contador', pergunta: 'Outra pergunta', contexto: '', opcoes: [] })),
      { id: 'lembrete:l', funcionario: 'secretaria', pergunta: 'Lembrar de ligar', contexto: '', opcoes: [{ id: opcao, rotulo: 'Responder lembrete', ...(opcao === 'adiar_para' ? { pede: 'data' as const } : {}) }] },
    ] }),
  })
  try {
    await a.clicar('Responder lembrete')
    if (opcao === 'adiar_para') { await a.preencher('Em que dia?', '2026-11-25'); await a.clicar('Salvar resposta') }
    expect(escritorioResponder).toHaveBeenCalledWith(a.familia.id, 'lembrete:l', opcao, opcao === 'adiar_para' ? { data: '2026-11-25' } : undefined)
  } finally { await a.fechar() }
})

it('Tesoureiro confirma recebimento usando a função existente e valor em reais', async () => {
  const recebimentoMudar = vi.fn(async () => {})
  const a = await montar(createElement(AgenteDaAba, { rota: 'planejamento' }), {
    recebimentoMudar,
    recebimentos: async () => [{ id: 'r', descricao: 'Contrato', valor: 123.45, mes_previsto: '2026-11', tipo: 'contrato', certo: true, meu: true, dono_membro: 'm', dono_nome: null, recebido_em: null, valor_recebido: null, mes_novo: null }],
  })
  try { await a.clicar('Conversar e abrir tarefas'); await a.clicar('Chegou'); expect(recebimentoMudar).toHaveBeenCalledWith(a.familia.id, 'r', { recebido_em: hojeRecife(), valor_recebido: 123.45 }) }
  finally { await a.fechar() }
})

it('Secretária cria lembrete com o horário de Recife convertido para ISO', async () => {
  const lembreteCriar = vi.fn(async () => {})
  const a = await montar(createElement(AgenteDaAba, { rota: 'escritorio' }), { lembreteCriar, lembretes: async () => [] })
  try {
    await a.clicar('Conversar e abrir tarefas'); await a.clicar('Novo lembrete'); await a.preencher('O quê', 'Ligar'); await a.preencher('Quando', '2026-11-20T09:00'); await a.clicar('Salvar')
    expect(lembreteCriar).toHaveBeenCalledWith(a.familia.id, { titulo: 'Ligar', quando: '2026-11-20T12:00:00.000Z', repetir: 'nunca', para: 'eu' })
  } finally { await a.fechar() }
})

it('Fiscal registra feira, anexa a nota de exemplo e salva a contagem', async () => {
  const feiraRegistrar = vi.fn(async () => {}), feiraAnexarNota = vi.fn(async () => 'nota'), estoqueContar = vi.fn(async () => {})
  const a = await montar(createElement(AgenteDaAba, { rota: 'casa' }), {
    feiraRegistrar, feiraAnexarNota, estoqueContar,
    feiras: async () => [{ id: 'f', data: hojeRecife(), semana: '2026-11-09', loja: null, tem_nota: false, sem_nota_motivo: null, feita_por: null }],
    estoque: async () => ({ itens: [{ id: 'arroz', nome: 'Arroz', categoria: 'Despensa', ativo: true }], contagens: [] }),
  })
  try {
    await a.clicar('Conversar e abrir tarefas'); await a.clicar('Nova feira'); await a.preencher('Quanto deu', '123,45'); await a.clicar('Salvar')
    expect(feiraRegistrar).toHaveBeenCalledWith(a.familia.id, { data: hojeRecife(), valor: 123.45, loja: '' })
    await a.clicar('Anexar a nota'); expect(feiraAnexarNota).toHaveBeenCalledWith(a.familia.id, 'f', 'exemplo')
    await a.clicar('Contar agora'); await a.clicar('Pouco'); await a.clicar('Salvar a contagem')
    expect(estoqueContar).toHaveBeenCalledWith(a.familia.id, [{ item_id: 'arroz', estado: 'pouco' }])
  } finally { await a.fechar() }
})

it('Gestor abre aplicação e aporte na mesma aba, enviando reais', async () => {
  const guardadoCriar = vi.fn(async () => {}), guardadoMovimentar = vi.fn(async () => {})
  const a = await montar(createElement(Fragment, null, createElement(AgenteDaAba, { rota: 'guardado' }), createElement(Guardado)), { guardadoCriar, guardadoMovimentar })
  try {
    await a.clicar('Conversar e abrir tarefas'); await a.navegar('Nova aplicação')
    await a.preencher('Onde o dinheiro está', 'Inter'); await a.preencher('Quanto tem lá hoje', '123,45'); await a.clicar('Guardar')
    expect(guardadoCriar).toHaveBeenCalledWith(a.familia.id, expect.objectContaining({ banco: 'Inter', tipo: 'caixinha', valor_inicial: 123.45, pct_cdi: 100, data: hojeRecife() }))
    await a.navegar('Guardar dinheiro'); await a.preencher('Quanto', '12,34'); await a.clicar('Anotar o que guardei')
    expect(guardadoMovimentar).toHaveBeenCalledWith(expect.any(String), 'aporte', 12.34, hojeRecife(), expect.any(String))
  } finally { await a.fechar() }
})

it.each([false, true])('imóvel novo/edição=%s valida valor inválido e entrega reais ao salvar', async editar => {
  const inicial: ImovelTela | null = editar ? { id: 'i', apelido: 'Casa', valor: 500, uso: 'parado', aluguel: 0, custos: 0, vacancia: '0', tem_contrato: false, contrato_ate: null, venda_valor: null, venda_mes: null, venda_contrato: false, meu: true, dono_membro: 'm', dono_nome: null } : null
  let lista: ImovelTela[] = inicial ? [inicial] : []
  const salvar = vi.fn(async (_familia, _id, d) => { lista = [{ ...d, id: 'i', meu: true, dono_membro: 'm', dono_nome: null }] })
  const a = await montar(createElement(Imoveis, { aplicado: 100 }), { imoveis: async () => lista, imovelSalvar: salvar })
  try {
    expect(a.container.textContent).toContain('quer cadastrar um imóvel?')
    if (editar) await act(async () => a.container.buscar(n => n.tagName === 'BUTTON' && !!n.getAttribute('aria-label')?.startsWith('Casa,'))[0].click())
    else await a.clicar('Cadastrar imóvel')
    await a.preencher('Apelido', 'Casa nova'); await a.preencher('Quanto vale hoje', 'inválido')
    await a.clicar('Salvar'); expect(salvar).not.toHaveBeenCalled()
    await a.preencher('Quanto vale hoje', '123.456,78'); await a.clicar('Salvar')
    expect(salvar).toHaveBeenCalledWith(a.familia.id, editar ? 'i' : null, expect.objectContaining({ apelido: 'Casa nova', valor: 123456.78, aluguel: 0, custos: 0 }))
    expect(a.container.textContent.replace(/\s/g, '')).toContain(reais(123556.78).replace(/\s/g, ''))
  } finally { await a.fechar() }
})


it.each(['Nova aplica\u00e7\u00e3o', 'Guardar dinheiro', 'Tirar dinheiro'])('reabre o mesmo atalho %s depois de fechar, sem hashchange artificial', async atalho => {
  const a = await montar(createElement(Fragment, null, createElement(Cadastro, { id: 'guardado' }), createElement(Guardado)))
  try {
    await a.navegar(atalho)
    expect(a.container.buscar(n => n.getAttribute('role') === 'dialog')).toHaveLength(1)
    await a.clicar('Fechar')
    expect(a.container.buscar(n => n.getAttribute('role') === 'dialog')).toHaveLength(0)
    await a.navegar(atalho)
    expect(a.container.buscar(n => n.getAttribute('role') === 'dialog')).toHaveLength(1)
  } finally { await a.fechar() }
})

it.each([false, true])('duas instancias reais compartilham leitura e trava do lembrete recorrente; falha na releitura=%s', async falha => {
  const confirmacoes: (() => void)[] = []
  let enviada = false
  let ocorrencia = 1
  const pergunta = { id: 'lembrete:recorrente', funcionario: 'secretaria', pergunta: 'Lembrete diario', contexto: '', opcoes: [{ id: 'feito', rotulo: 'Feito recorrente' }] }
  const escritorioResponder = vi.fn(async () => { await new Promise<void>(r => { confirmacoes.push(r) }); enviada = true; ocorrencia++ })
  const escritorioHoje = vi.fn(async () => {
    if (enviada && falha) throw new Error('Sem rede na releitura')
    return { funcionarios: [], entregue: [], trabalhando: [], precisa_de_voce: enviada ? [] : [pergunta] }
  })
  const respostas: ReturnType<typeof useEscritorio>['responder'][] = []
  function Instancia({ indice }: { indice: number }) {
    const dados = useEscritorio()
    respostas[indice] = dados.responder
    const p = dados.perguntas[0]
    return p ? createElement(PerguntaCard, { p, quem: 'Secretaria', responder: dados.responder }) : null
  }
  const a = await montar(createElement(Fragment, null, createElement(Instancia, { indice: 0 }), createElement(Instancia, { indice: 1 })), { escritorioResponder, escritorioHoje })
  try {
    const botao = a.container.buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Feito recorrente')[0]
    let concorrente!: Promise<unknown>
    await act(async () => { botao.click(); botao.click(); concorrente = respostas[1](pergunta.id, 'feito') })
    expect(escritorioResponder).toHaveBeenCalledTimes(1)
    await act(async () => { confirmacoes.forEach(confirmar => confirmar()); await concorrente })
    if (falha) {
      expect(a.container.textContent).toContain('Respondida, atualizando')
      expect(a.container.buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Feito recorrente')).toHaveLength(0)
      await act(async () => { await respostas[0](pergunta.id, 'feito') })
      await a.clicar('Recarregar')
      expect(a.container.textContent).toContain('Respondida, atualizando')
    } else {
      expect(a.container.textContent).not.toContain('Lembrete diario')
      await act(async () => { await respostas[0](pergunta.id, 'feito') })
    }
    expect(ocorrencia).toBe(2)
    expect(escritorioHoje).toHaveBeenCalledTimes(falha ? 3 : 2)
    expect(escritorioResponder).toHaveBeenCalledTimes(1)
  } finally { await act(async () => { confirmacoes.forEach(confirmar => confirmar()) }); await a.fechar() }
})


it('agente da aba e ficha real nao duplicam a pergunta acionavel da Secretaria', async () => {
  const p = { id: 'lembrete:ficha', funcionario: 'secretaria', pergunta: 'Ligar hoje', contexto: '', opcoes: [{ id: 'feito', rotulo: 'Feito na ficha' }] }
  const f = { id: 'secretaria', nome: 'Secretaria', estado: 'precisa_de_voce', frase: 'Ligar', ultimas_respostas: [] } as any
  const e = { funcionarios: [f], entregue: [], trabalhando: [], precisa_de_voce: [p] }
  function Ficha() {
    const dados = useEscritorio()
    return dados.e ? createElement(FichaFuncionario, { f, e: dados.e, responder: dados.responder, fechar() {} }) : null
  }
  const a = await montar(createElement(Fragment, null, createElement(AgenteDaAba, { rota: 'escritorio' }), createElement(Ficha)), { escritorioHoje: async () => e })
  try { expect(a.container.buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Feito na ficha')).toHaveLength(1) }
  finally { await a.fechar() }
})
