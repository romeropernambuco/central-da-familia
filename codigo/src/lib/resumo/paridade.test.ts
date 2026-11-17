import { expect, it, vi } from 'vitest'
import * as antigo from './legado.fixture'
import { numeroEnvelope, tetoDoMes, livreDaSemana } from './orcamento'
import { totaisDoMes } from './movimentacao'
import { proximaFatura, proximasPorCartao } from './faturas'
import { totaisGuardado } from './guardado'
import { totalImoveis, patrimonioTotal } from './imoveis'
import { mesesPendentes, recebimentoAtual } from './recebimentos'
import type { Fatura, GuardadoHoje, ImovelTela, RecebimentoTela } from '../../api/tipos'
import { envelopes, gastos, recebimentos } from './cenarios.fixture'
it('preserva literalmente orçamento e movimentação com referência explícita', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-17T12:00:00Z'))
  try {
    for (const e of envelopes) {
      expect(numeroEnvelope(e, 14, '2026-11-17', 'America/Recife')).toEqual(antigo.numeroEnvelope(e, 14))
      expect(tetoDoMes(e)).toBe(antigo.tetoDoMes(e))
      expect(livreDaSemana(e)).toBe(e.teto_semana == null ? null : Math.round((e.teto_semana - (e.gasto_semana || 0) + Number.EPSILON) * 100) / 100)
    }
    for (const mes of ['2026-10', '2026-11', '2026-12']) expect(totaisDoMes(mes, '2026-11-17', gastos, recebimentos, [])).toEqual(antigo.totaisDoMes(mes, '2026-11-17', gastos, recebimentos, []))
  } finally { vi.useRealTimers() }
})
it('preserva as duas regras de fatura aberta/fechada/zero/vencida sem mutar a lista', () => {
  const fs = [ { cartao_id: 'c', mes: '2026-10', vencimento: '2026-10-20', total: 100, fechada: true }, { cartao_id: 'c', mes: '2026-11', vencimento: '2026-11-20', total: 0, fechada: false }, { cartao_id: 'c', mes: '2026-12', vencimento: '2026-12-20', total: 50, fechada: false } ] as Fatura[]
  expect(proximaFatura(fs, '2026-11-17', { exigirTotalPositivo: false, ordem: 'mes', usarPrimeiraVencida: true })).toBe(fs[1])
  expect(proximasPorCartao(fs, '2026-11-17')).toEqual([fs[2]])
  expect(proximaFatura(fs, '2027-01-01', { exigirTotalPositivo: false, ordem: 'mes', usarPrimeiraVencida: true })).toBe(fs[0])
  expect(proximasPorCartao(fs, '2027-01-01')).toEqual([])
  expect(fs[0].mes).toBe('2026-10')
})
it('apresenta totais oficiais, sem recalcular rendimentos nem aluguel', () => {
  expect(totaisGuardado({ total: 123, rendeu_hoje_liquido: -1, rendeu_mes_liquido: 7, rendeu_desde_inicio_liquido: 9 } as GuardadoHoje)).toEqual({ total: 123, hoje: -1, mes: 7, desdeInicio: 9 })
  expect(totalImoveis([{ valor: 10.125 }, { valor: 20 }] as ImovelTela[])).toBe(30.13)
  expect(patrimonioTotal(10.125, 20)).toBe(30.13)
})
it('recebimentos mantém ocorrências conferidas e o valor atualizado em centavos', () => {
  const r = { id: 'r', mes_previsto: '2026-11', valor: 10, recebido_em: '2026-11-01' } as RecebimentoTela
  const fontes = { r: { recorrencia: 'mensal' as const, fim: '2027-01' } }
  const controle = { r: { valor: 1234, recebidas: { '2026-12': { valor: 400, data: '2026-12-01' } } } }
  expect(mesesPendentes(r, fontes as any, controle)).toEqual(['2027-01'])
  expect(recebimentoAtual(r, controle).valor).toBe(12.34)
})
