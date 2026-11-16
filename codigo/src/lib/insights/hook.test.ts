import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import type { Api, FamiliaMinha } from '../../api/tipos'
import { ContextoApp, type Ctx } from '../../app/contexto'
import { useInsightsDaAba } from '../../app/useInsightsDaAba'
import { PerguntaCard } from '../../componentes/Pergunta'
import { DocumentoTeste, NoTeste } from '../../telas/escritorio/numeros.dom-teste'
import { candidatosInsights } from './motor'
import { apresentarInsight } from './apresentacao'
import type { SnapshotInsights } from './tipos'
import type { Rota } from '../../app/rotas'

const agora = new Date('2026-12-30T12:00:00-03:00')
const familia: FamiliaMinha = { id: 'f', nome: 'Família privada', papel: 'casal', membroNome: 'Privado', membroId: 'eu', envelopeId: null }
const segredo = 'NomeSentinelaPrivado'
function ambiente() {
  const doc = new DocumentoTeste()
  Object.assign(NoTeste.prototype, { focus() {}, closest() { return null }, querySelectorAll() { return [] } })
  vi.stubGlobal('document', doc)
  vi.stubGlobal('window', { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {} })
  vi.stubGlobal('Element', NoTeste)
  vi.stubGlobal('addEventListener', vi.fn())
  vi.stubGlobal('removeEventListener', vi.fn())
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('location', { hash: '' })
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (k: string) => data.get(k) || null, setItem: (k: string, v: string) => data.set(k, v) })
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(agora)
  const container = doc.createElement('div'); doc.body.appendChild(container)
  return { container, root: createRoot(container as unknown as HTMLElement), data }
}
const apiBase = (): Api => ({ modo: 'real', guardadoHoje: vi.fn(async () => ({ aplicacoes: [{ id: 'a', nome: segredo, vence_em: '2027-01-01' }] })),
  feiras: vi.fn(async () => [{ id: 'feira', data: '2026-12-29', semana: '2026-12-28', tem_nota: false, sem_nota_motivo: null }]),
  feiraAnexarNota: vi.fn(async () => 'caminho'), feiraSemNota: vi.fn(async () => {}),
} as unknown as Api)

function contexto(api: Api): Ctx {
  return { api, familia, sessao: { userId: 'u', dono: true, email: null, familias: [familia] }, versao: 0, resumo: null, oculto: true,
    tentar: async (f: () => Promise<unknown>) => { try { await f(); return true } catch { return false } }, recarregar: vi.fn(async () => {}), explicar: vi.fn() } as unknown as Ctx
}

it('hook real: propõe sem escrever, máscara reversível, exibição deduplica após remontar', async () => {
  const { root, data } = ambiente(), api = apiBase()
  let ctx = contexto(api), saida!: ReturnType<typeof useInsightsDaAba>, chave = 0
  function Captura() { saida = useInsightsDaAba('guardado'); return null }
  const render = async () => act(async () => root.render(createElement(ContextoApp.Provider, { value: ctx }, createElement(Captura, { key: chave }))))
  try {
    await render()
    expect(saida.pergunta?.tipo).toBe('aplicacao')
    expect(saida.pergunta?.contexto).toBe('Aplicação: •••.')
    expect(data.size).toBe(0)
    expect(api.feiraAnexarNota).not.toHaveBeenCalled()
    ctx = { ...ctx, oculto: false }; await render()
    expect(saida.pergunta?.contexto).toContain(segredo)
    const id = saida.pergunta!.id
    await act(async () => saida.marcarVista(id))
    expect(saida.pergunta?.id).toBe(id)
    chave++; await render()
    expect(saida.pergunta).toBeNull()
  } finally { await act(async () => root.unmount()); vi.useRealTimers(); vi.unstubAllGlobals() }
})

it('hook: depois e resolvido, troca de modo/família sem reaproveitar dado velho', async () => {
  const { root } = ambiente(), api = apiBase()
  let ctx = contexto(api), saida!: ReturnType<typeof useInsightsDaAba>
  function Captura() { saida = useInsightsDaAba('guardado'); return null }
  const render = async () => act(async () => root.render(createElement(ContextoApp.Provider, { value: ctx }, createElement(Captura))))
  try {
    await render()
    expect(saida.pergunta?.tipo).toBe('aplicacao')
    await act(async () => { expect(await saida.responder(saida.pergunta!.id, 'depois')).toBe(true) })
    expect(saida.pergunta).toBeNull()
    ctx = { ...ctx, api: { ...api, modo: 'exemplo' } }; await render()
    expect(saida.pergunta).toMatchObject({ exemplo: true, etiqueta: 'Exemplo: nada é gravado na família real' })
    await act(async () => { await saida.responder(saida.pergunta!.id, 'resolvido') })
    expect(saida.pergunta).toBeNull()
    let concluir!: (v: unknown) => void
    ctx = { ...ctx, familia: { ...familia, id: 'outra' }, api: { ...api, guardadoHoje: vi.fn(() => new Promise(r => { concluir = r })) } as unknown as Api }
    await render()
    expect(saida.pergunta).toBeNull()
    expect(saida.estado).toBe('buscando')
    await act(async () => concluir({ aplicacoes: [] }))
    expect(saida.pergunta).toBeNull()
  } finally { await act(async () => root.unmount()); vi.useRealTimers(); vi.unstubAllGlobals() }
})

it('hook: ignora resposta antiga; equipe não lê finanças; nota só grava ao anexar, erro permite tentar de novo', async () => {
  const { root } = ambiente(), api = apiBase()
  let ctx = contexto(api), rota: Rota = 'guardado', saida!: ReturnType<typeof useInsightsDaAba>
  function Captura() { saida = useInsightsDaAba(rota); return null }
  const render = async () => act(async () => root.render(createElement(ContextoApp.Provider, { value: ctx }, createElement(Captura))))
  try {
    await render()
    expect(saida.pergunta?.tipo).toBe('aplicacao')
    const responderAntigo = saida.responder, idAntigo = saida.pergunta!.id
    ctx = { ...ctx, familia: { ...familia, papel: 'equipe' } }; await render()
    expect(saida.pergunta).toBeNull()
    expect(await responderAntigo(idAntigo, 'abrir')).toBe(false)
    expect(api.guardadoHoje).toHaveBeenCalledTimes(1)
    rota = 'casa'; await render()
    expect(saida.pergunta?.tipo).toBe('feira_nota')
    const id = saida.pergunta!.id
    await act(async () => { await saida.responder(id, 'abrir') })
    expect(saida.notaPendente).toBe('feira')
    expect(api.feiraAnexarNota).not.toHaveBeenCalled()
    vi.mocked(api.feiraAnexarNota).mockRejectedValueOnce(new Error('Offline'))
    await act(async () => { expect(await saida.anexarNota('foto-explicita')).toBe(false) })
    expect(saida.notaPendente).toBe('feira')
    await act(async () => { expect(await saida.anexarNota('foto-explicita')).toBe(true) })
    expect(api.feiraAnexarNota).toHaveBeenLastCalledWith('f', 'feira', 'foto-explicita')
    expect(saida.notaPendente).toBeNull()
  } finally { await act(async () => root.unmount()); vi.useRealTimers(); vi.unstubAllGlobals() }
})

it('PerguntaCard real para os oito: DOM e aria-label não mostram nomes/valores com olho fechado', async () => {
  const { root, container } = ambiente(), ctx = contexto(apiBase())
  const s: SnapshotInsights = { modo: 'real', origem: 'real', papel: 'casal',
    faturas: [{ cartaoId: 'c', mes: '2027-01', nome: segredo, vencimento: '2027-01-02', total: 987654, banco: 1, paga: false, podeInformar: true,
      composicao: [{ id: 'l', nome: segredo, centavos: 987654, parcela: true }] }],
    reserva: { mes: '2026-12', combinada: 987654, livre: 0 }, recebimentos: [{ id: 'r', nome: segredo, recebido: false, meu: true, mesPrevisto: '2026-11', mesNovo: null, valor: 987654 }],
    aplicacoes: [{ id: 'a', nome: segredo, ativa: true, vencimento: '2027-01-14' }],
    feiras: [{ id: 'f', semana: '2026-12-28', data: '2026-12-29', temNota: false, justificativa: null }], objetivo: { mes: '2029-01', projetado: 1, necessario: 987654 } }
  const candidatos = candidatosInsights(s, agora)
  try {
    expect(candidatos).toHaveLength(8)
    for (const i of candidatos) {
      const p = apresentarInsight(i, true)
      await act(async () => root.render(createElement(ContextoApp.Provider, { value: ctx }, createElement(PerguntaCard, {
        key: p.id, p, quem: 'Analista de Cartão', responder: async () => true,
      }))))
      expect(container.textContent).toContain(i.pergunta)
      expect(container.textContent).not.toMatch(/NomeSentinelaPrivado|987654|9\.876|876,54/)
      const botoes = container.buscar(n => n.tagName === 'BUTTON')
      expect(botoes.map(n => n.getAttribute('aria-label'))).toEqual(p.opcoes.map(o => o.rotulo))
      expect(botoes.map(n => n.textContent)).toEqual(p.opcoes.map(o => o.rotulo))
      for (const node of container.buscar(() => true)) {
        expect(String(node.getAttribute('aria-label') || '')).not.toMatch(/NomeSentinelaPrivado|987654|9\.876|876,54/)
      }
    }
  } finally { await act(async () => root.unmount()); vi.useRealTimers(); vi.unstubAllGlobals() }
})

it('hook: duplo toque grava uma vez; falha não resolve e preserva nova tentativa', async () => {
  const { root } = ambiente()
  const pagamento = vi.fn<() => Promise<void>>(async () => { throw new Error('Offline') })
  const api = { modo: 'real', cartoes: async () => [{ id: 'c', nome: segredo, dia_fechamento: 10, dia_vencimento: 2 }],
    faturas: async () => [{ cartao_id: 'c', cartao: segredo, mes: '2027-01', vencimento: '2027-01-02', total: 100, fechada: true }],
    faturasBanco: async () => [], lancamentos: async () => [], faturaInformar: pagamento } as unknown as Api
  const ctx = contexto(api)
  let saida!: ReturnType<typeof useInsightsDaAba>
  function Captura() { saida = useInsightsDaAba('cartoes'); return null }
  try {
    await act(async () => root.render(createElement(ContextoApp.Provider, { value: ctx }, createElement(Captura))))
    expect(saida.pergunta?.tipo).toBe('fatura_vencendo')
    const id = saida.pergunta!.id
    await act(async () => { expect(await saida.responder(id, 'paguei_hoje')).toBe(false) })
    expect(saida.pergunta?.id).toBe(id)
    let concluir!: () => void
    pagamento.mockImplementationOnce(() => new Promise<void>(resolve => { concluir = resolve }))
    await act(async () => {
      const primeira = saida.responder(id, 'paguei_hoje')
      expect(await saida.responder(id, 'paguei_hoje')).toBe(false)
      concluir(); expect(await primeira).toBe(true)
    })
    expect(pagamento).toHaveBeenCalledTimes(2) // uma falha + uma gravação, não três
    expect(saida.pergunta).toBeNull()
  } finally { await act(async () => root.unmount()); vi.useRealTimers(); vi.unstubAllGlobals() }
})
