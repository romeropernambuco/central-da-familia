import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Cartoes } from './Cartoes'
import { simularCompra } from '../../lib/formato'
import type { Fatura } from '../../api/tipos'

const mocks = vi.hoisted(() => ({
  useState: vi.fn(), useEffect: vi.fn(), useApp: vi.fn(),
}))
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useState: mocks.useState, useEffect: mocks.useEffect,
}))
vi.mock('../../app/contexto', () => ({ useApp: mocks.useApp }))
vi.mock('../../componentes/Qm', () => ({ Qm: () => null }))
// Sequência de estados congelada do simulador. Conferência coberta pela integração f35.
vi.mock('../../componentes/ConferenciasResumo', () => ({ ConferenciaFaturas: () => null }))

afterEach(() => { vi.useRealTimers(); vi.resetAllMocks() })

describe('faturas existentes no simulador de cartões', () => {
  it.each([10, 12])('soma os compromissos até a última parcela de uma compra em %ix', async parcelas => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-18T12:00:00-03:00'))
    // Fechamento já passou e vencimento anterior ao fechamento: começa em janeiro.
    const cartao = { id: 'c', nome: 'Teste', dia_fechamento: 10, dia_vencimento: 5 }
    const ps = simularCompra(parcelas * 10, parcelas, '2026-11-18', 10, 5)
    expect(ps[0].mes).toBe('2027-01')
    const existentes: Fatura[] = Array.from({ length: 14 }, (_, i) => {
      const mes = new Date(Date.UTC(2026, 10 + i, 1)).toISOString().slice(0, 7)
      return { cartao_id: 'c', cartao: 'Teste', mes, vencimento: `${mes}-05`, total: 200, fechada: false }
    })
    const api = {
      cartoes: vi.fn().mockResolvedValue([cartao]),
      faturas: vi.fn(async (_familia: string, meses: number) => existentes.slice(0, meses)),
    }
    mocks.useApp.mockReturnValue({ api, familia: { id: 'f', papel: 'casal' }, resumo: { envelopes: [], livre_mes: 1000, colchao: 0 } })
    let carregadas: Fatura[] = []
    const preparar = () => {
      mocks.useState.mockReset()
      const estados = [[cartao], carregadas, true, false, null, 0, { chave: JSON.stringify(['f', undefined, 'casal']), carregando: false, falha: '', temDado: true }, String(parcelas * 10), parcelas, 'c']
      for (const [i, estado] of estados.entries()) {
        mocks.useState.mockImplementationOnce(() => [estado, i === 1 ? (fs: Fatura[]) => { carregadas = fs } : vi.fn()])
      }
      mocks.useState.mockImplementation((inicial: unknown) => [inicial, vi.fn()])
    }
    preparar()
    renderToStaticMarkup(createElement(Cartoes))
    // Executa o efeito de carregamento da tela e espera as respostas da API.
    mocks.useEffect.mock.calls[0][0]()
    await vi.waitFor(() => expect(carregadas.length).toBeGreaterThan(0))
    expect(api.faturas).toHaveBeenCalledWith('f', 14)
    expect(carregadas.some(f => f.mes === ps[ps.length - 1].mes)).toBe(true)
    preparar()
    const html = renderToStaticMarkup(createElement(Cartoes))
    const simulador = html.slice(html.indexOf('Faturas do Teste com a compra'))
    const totais = [...simulador.matchAll(/aria-label="R\$\s*([\d.,]+)"/g)].map(m => Number(m[1].replace('.', '').replace(',', '.')))
    expect(totais).toHaveLength(14)
    for (const [i, fatura] of existentes.entries()) {
      expect(totais[i]).toBe(200 + (ps.some(p => p.mes === fatura.mes) ? 10 : 0))
    }
    expect(totais.reduce((s, v) => s + v, 0)).toBe(14 * 200 + parcelas * 10)
    expect(totais[6]).toBe(210)
    expect(totais[existentes.findIndex(f => f.mes === ps[ps.length - 1].mes)]).toBe(210)
  })
})
