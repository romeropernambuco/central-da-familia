import { describe, expect, it } from 'vitest'
import { simularCompra } from '../../lib/formato'
import { compromissoNesteMes, mesesDaSimulacao } from './simulacao'

describe('simulador de cartões', () => {
  it('não desconta neste mês parcelas que começam no próximo', () => {
    const ps = simularCompra(100, 3, '2026-11-18', 3, 10)
    expect(compromissoNesteMes(100, 3, '2026-11-18', ps)).toBe(0)
    expect(compromissoNesteMes(100, 3, '2026-12-01', ps)).toBe(ps[0].valor)
  })
  it('compra à vista conta inteira no dia da compra', () => {
    expect(compromissoNesteMes(100.01, 1, '2026-11-18', [{ mes: '2026-12', valor: 100.01 }])).toBe(100.01)
  })
  it('exibe todas as 12 parcelas e preserva os centavos da última', () => {
    const ps = simularCompra(100, 12, '2026-11-18', 3, 10)
    expect(mesesDaSimulacao([], ps)).toHaveLength(12)
    expect(mesesDaSimulacao([], ps)).toContain(ps[11].mes)
    expect(ps.reduce((s, p) => s + Math.round(p.valor * 100), 0)).toBe(10000)
  })
})
