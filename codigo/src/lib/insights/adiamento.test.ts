import { act, createElement, Fragment } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { ContextoApp } from '../../app/contexto'
import { lojaEscritorio } from '../../app/escritorioCompartilhado'
import { useEscritorio } from '../../app/useDados2'
import { useInsightsDaAba } from '../../app/useInsightsDaAba'
import { PerguntaCard } from '../../componentes/Pergunta'
import { DocumentoTeste, NoTeste } from '../../telas/escritorio/numeros.dom-teste'
import { contextoLigacao } from './ligacao.dom-teste'
import { chaveArmazenamento, lerMemoria } from './memoria'

function ambiente() {
  const doc = new DocumentoTeste(), storage = new Map<string, string>()
  Object.assign(NoTeste.prototype, { focus() {}, closest() { return null }, querySelectorAll() { return [] } })
  vi.stubGlobal('document', doc)
  vi.stubGlobal('window', { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {} })
  vi.stubGlobal('Element', NoTeste)
  vi.stubGlobal('addEventListener', vi.fn())
  vi.stubGlobal('removeEventListener', vi.fn())
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) || null, setItem: (k: string, v: string) => storage.set(k, v) })
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
  vi.setSystemTime(new Date('2026-12-30T21:00:00-03:00'))
  const container = doc.createElement('div'); doc.body.appendChild(container)
  const root = createRoot(container as unknown as HTMLElement)
  let ctx = contextoLigacao('fatura_vencendo')
  const saidas: ReturnType<typeof useInsightsDaAba>[] = []
  function Captura({ indice }: { indice: number }) {
    useEscritorio()
    const insight = useInsightsDaAba('cartoes')
    saidas[indice] = insight
    const p = insight.pergunta
    return p ? createElement(PerguntaCard, { key: p.id, p, quem: 'Analista de Cartão', responder: insight.responder,
      aoExibir: () => insight.marcarVista(p.id) }) : null
  }
  return {
    container, ctx, saidas, loja: lojaEscritorio(ctx.api, ctx.familia!.id),
    memoria: () => lerMemoria(storage.get(chaveArmazenamento(ctx.api.modo, 'u', ctx.familia!.id)) || null),
    render: async (versao = 0) => {
      ctx = { ...ctx, versao }
      await act(async () => root.render(createElement(ContextoApp.Provider, { value: ctx }, createElement(Fragment, null,
        createElement(Captura, { indice: 0 }), createElement(Captura, { indice: 1 })))))
    },
    ate: async (hora: string) => { await act(async () => { await vi.advanceTimersByTimeAsync(Date.parse(hora) - Date.now()) }) },
    limpar: async () => { await act(async () => root.unmount()); vi.useRealTimers(); vi.unstubAllGlobals() },
  }
}
function botao(container: NoTeste, rotulo: string) {
  const b = container.buscar(n => n.tagName === 'BUTTON' && n.textContent === rotulo)
  expect(b).toHaveLength(1) // duas instâncias, apenas o card dono aparece
  return b[0]
}

it.each([false, true])('Depois às 21h volta às 7h de Recife e envia uma vez; releitura funciona: %s', async funciona => {
  const a = ambiente(), { api } = a.ctx
  let concluir!: () => void
  vi.mocked(api.faturaInformar).mockImplementation(() => new Promise<void>(r => { concluir = r }))
  if (!funciona) vi.mocked(api.escritorioHoje).mockResolvedValueOnce({ funcionarios: [], trabalhando: [], entregue: [], precisa_de_voce: [] })
    .mockRejectedValue(new Error('offline'))
  try {
    await a.render()
    const id = a.saidas[0].pergunta!.id
    await act(async () => botao(a.container, 'Depois').click())
    expect(a.saidas[0].pergunta).toBeNull()
    expect(Object.values(a.memoria())[0].adiadoAte).toBe(Date.parse('2026-12-31T07:00:00-03:00'))
    expect(api.faturaInformar).not.toHaveBeenCalled()
    await a.ate('2026-12-30T22:00:00-03:00')
    await a.ate('2026-12-31T00:00:00-03:00')
    await a.render(1) // releitura real de useEscritorio na virada, sem chamar a loja manualmente
    expect(api.escritorioHoje).toHaveBeenCalledTimes(2)
    expect(a.loja.snapshot().estado).toBe(funciona ? 'ok' : 'erro')
    await a.ate('2026-12-31T06:59:59-03:00')
    expect(a.saidas[0].pergunta).toBeNull()
    await a.ate('2026-12-31T07:00:00-03:00')
    expect(a.saidas[0].pergunta?.id).toBe(id)
    expect(a.container.textContent).toContain('Sua fatura vence em breve. Já pagou?')
    expect(a.container.textContent).not.toContain('Respondida, atualizando...')
    expect(a.loja.travas.has(id)).toBe(false)
    // Toca no componente real e tenta enviar pela outra instância durante a escrita.
    const responderAntigo = a.saidas[1].responder
    await act(async () => {
      const b = botao(a.container, 'Paguei hoje'); b.click(); b.click()
      expect(await responderAntigo(id, 'paguei_hoje')).toBe(false)
    })
    expect(a.loja.travas.get(id)).toBe('enviando')
    expect(api.faturaInformar).toHaveBeenCalledTimes(1)
    await act(async () => concluir())
    expect(a.saidas[0].pergunta).toBeNull()
    expect(Object.values(a.memoria())[0].resolvido).toBe(true)
    // Resposta definitiva continua protegida inclusive se uma releitura falhar.
    expect(a.loja.travas.get(id)).toBe('respondida')
    expect(await responderAntigo(id, 'paguei_hoje')).toBe(false)
    expect(api.faturaInformar).toHaveBeenCalledTimes(1)
    expect(api.faturaInformar).toHaveBeenCalledWith(a.ctx.familia!.id, 'c', '2027-01', { paga_em: '2026-12-31' })
    expect(api.escritorioResponder).not.toHaveBeenCalled()
  } finally { await a.limpar() }
})

it('Já resolvido permanece definitivo após a virada com Escritório offline', async () => {
  const a = ambiente(), { api } = a.ctx
  vi.mocked(api.escritorioHoje).mockRejectedValue(new Error('offline'))
  try {
    await a.render()
    const { id } = a.saidas[0].pergunta!, responderAntigo = a.saidas[1].responder
    await act(async () => botao(a.container, 'Já resolvido').click())
    expect(Object.values(a.memoria())[0].resolvido).toBe(true)
    expect(a.loja.travas.get(id)).toBe('respondida')
    await a.ate('2026-12-30T22:00:00-03:00')
    await a.ate('2026-12-31T00:00:00-03:00')
    await a.render(1)
    await a.ate('2026-12-31T07:00:00-03:00')
    expect(a.saidas[0].pergunta).toBeNull()
    expect(await responderAntigo(id, 'paguei_hoje')).toBe(false)
    expect(api.faturaInformar).not.toHaveBeenCalled()
    expect(api.escritorioResponder).not.toHaveBeenCalled()
  } finally { await a.limpar() }
})
