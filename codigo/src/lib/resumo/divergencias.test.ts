import { expect, it, vi } from 'vitest'
import { numerosDaAba } from '../../telas/escritorio/numeros'
import { totalPendencias } from './pendencias'
import type { Api, FamiliaMinha, PerguntaEsc } from '../../api/tipos'
const arquivos = import.meta.glob('../../telas/escritorio/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const familia = { id: 'f', papel: 'casal', envelopeId: 'eu' } as FamiliaMinha
it('C1: título e prévia usam o mesmo total completo, acima de três', () => {
  expect(totalPendencias({ precisa_de_voce: Array(3).fill({}) as PerguntaEsc[], precisa_total: 8 })).toBe(8)
  for (const p of ['EscritorioIsometrico', 'PrecisaDeVoce']) expect(arquivos[`../../telas/escritorio/${p}.tsx`]).toContain('totalPendencias(e)')
})
it('C2: funcionário exclui parcelas sintéticas e futuro como Gastos', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-17T12:00:00Z'))
  try {
    const api = { lancamentos: async () => [ { valor: 20, data: '2026-11-01' }, { valor: 90, data: '2026-11-18' }, { valor: 30, data: '2026-11-02', parcela: {} } ] } as unknown as Api
    expect((await numerosDaAba(api, familia, 'lancamentos'))[1].valor).toBe(20)
  } finally { vi.useRealTimers() }
})
it('C3: Início do funcionário identifica e apresenta o orçamento pessoal', async () => {
  const api = { resumoHoje: async () => ({ pode_gastar_hoje: 999, livre_mes: 9000, dias_restantes: 10, envelopes: [{ id: 'eu', regra: 'mensal', hoje: 7, livre: 70, limite_mes: 100, gasto_mes: 30 }] }) } as unknown as Api
  expect(await numerosDaAba(api, familia, 'inicio')).toEqual([{ nome: 'Seu orçamento · pode gastar hoje', valor: 7 }, { nome: 'Livre no mês', valor: 70 }])
})
