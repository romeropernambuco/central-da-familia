import { afterEach, expect, it, vi } from 'vitest'
import * as antigo from './legado.fixture'

afterEach(() => vi.useRealTimers())
import { envelopes, gastos, recebimentos } from './cenarios.fixture'
it('fixa os resultados antigos antes da extração, inclusive sinais e ausentes', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-17T12:00:00Z'))
  expect(envelopes.map(e => antigo.numeroEnvelope(e, 14))).toMatchSnapshot()
  expect(envelopes.map(antigo.tetoDoMes)).toEqual([100, 150, 100, 90, 100])
  expect(antigo.totaisDoMes('2026-11', '2026-11-17', gastos, recebimentos, [{ data: '2026-11-02', valor: 5 }])).toEqual(
    { entrou: 30, saiu: 10.13, saldo: 19.87, previsto: 120 },
  )
  expect(antigo.totaisDoMes('2026-10', '2026-11-17', gastos, recebimentos, [])).toEqual({
    entrou: 40,
    saiu: 99,
    saldo: -59,
    previsto: 0,
  })
})
