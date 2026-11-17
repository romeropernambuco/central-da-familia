import { act, createElement, Fragment } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { Provedor, useApp, type Ctx } from './contexto'
import { protegerApi } from '../api/protegida'
import { normalizaGuardado } from '../api/normaliza2'
import { CartaoGuardado } from '../telas/guardado/CartaoGuardado'
import { Guardado } from '../telas/guardado/Guardado'
import { NumerosAba } from '../telas/escritorio/NumerosAba'
import { DocumentoTeste, NoTeste } from '../telas/escritorio/numeros.dom-teste'
import type { Api } from '../api/tipos'

afterEach(() => vi.unstubAllGlobals())
it('ação e releitura sincronizam aba, Início e funcionário; falha no resumo não trava Guardado', async () => {
  const doc = new DocumentoTeste(), eventos = new EventTarget()
  Object.assign(doc.body, { classList: { toggle() {}, remove() {} } })
  Object.assign(doc.documentElement, { dataset: {} })
  vi.stubGlobal('document', doc)
  vi.stubGlobal('window', Object.assign(eventos, { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {} }))
  vi.stubGlobal('addEventListener', eventos.addEventListener.bind(eventos))
  vi.stubGlobal('removeEventListener', eventos.removeEventListener.bind(eventos))
  vi.stubGlobal('localStorage', { getItem: () => null, setItem() {} })
  vi.stubGlobal('location', { hash: '#/guardado', search: '', pathname: '/' })
  vi.stubGlobal('navigator', { onLine: true })
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  let total = 100, falhaResumo = false, ctx!: Ctx
  const guardadoHoje = vi.fn(async () => normalizaGuardado({ total, rendeu_hoje_liquido: 2, rendeu_mes_liquido: 3, rendeu_desde_inicio_liquido: 4, aplicacoes: [{ id: 'a', saldo: total, nome: 'Reserva', titular: null }], por_dia_30: [], explicacao: [] }, '2026-11-17'))
  const resumoHoje = vi.fn(async () => { if (falhaResumo) throw new Error('Resumo fora do ar'); return { envelopes: [], livre_mes: 0, dias_restantes: 14 } })
  const familia = { id: 'f', membroId: 'm', membroNome: 'Teste', papel: 'casal', envelopeId: null }
  const api = protegerApi({ modo: 'real', sessao: async () => ({ userId: 's', familias: [familia], dono: false }), resumoHoje, guardadoHoje, membros: async () => [], guardadoMovimentar: async () => { total = 200 } } as unknown as Api)
  function Tela() { ctx = useApp(); return createElement(Fragment, null, createElement(Guardado), createElement(CartaoGuardado), createElement(NumerosAba, { id: 'guardado', fechar() {} })) }
  const el = doc.createElement('div'); doc.body.appendChild(el)
  const root = createRoot(el as unknown as HTMLElement)
  const conferir = (n: number) => {
    const texto = `R$${n}`
    const aba = el.buscar(x => x.getAttribute('aria-labelledby') === 'gHoje')[0]
    const inicio = el.buscar(x => x.getAttribute('class') === 'card guard-card')[0]
    const funcionario = el.buscar(x => x.getAttribute('aria-label') === 'Resumo da aba')[0]
    expect(aba?.textContent).toContain(texto)
    expect(inicio?.textContent).toContain(texto)
    expect(funcionario?.textContent).toContain(texto)
  }
  try {
    await act(async () => root.render(createElement(Provedor, { api, children: createElement(Tela) })))
    conferir(100)
    const chamadas = guardadoHoje.mock.calls.length
    await act(async () => { await api.guardadoMovimentar('a', 'aporte', 100, '2026-11-17', 'chave') })
    conferir(200)
    expect(guardadoHoje.mock.calls.length - chamadas).toBe(1)
    total = 300; falhaResumo = true
    const versao = ctx.versao
    await act(async () => { await ctx.recarregar() })
    expect(ctx.versao).toBeGreaterThan(versao)
    expect(ctx.erro).toBe('Resumo fora do ar')
    conferir(300)
  } finally { await act(async () => root.unmount()) }
})
