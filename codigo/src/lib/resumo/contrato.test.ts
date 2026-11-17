import { expect, it } from 'vitest'
import { normalizaGuardado, normalizaEscritorio } from '../../api/normaliza2'
import { campoPendencias } from './pendencias'
import { campoGuardado } from './guardado'
import { daTela, paraMotor } from './tipos'
it('normalização das telas continua tolerante; resumo distingue contrato incompleto de zero válido', () => {
  const incompleto = normalizaGuardado({}, '2026-11-17')
  expect(incompleto.total).toBe(0)
  expect(campoGuardado(incompleto, [], '2026-11-17T12:00:00Z', null)).toMatchObject({ estado: 'indisponivel', valor: null, atualizadoEm: null, conferidoEm: null })
  const zero = normalizaGuardado({ total: 0, rendeu_hoje_liquido: 0, rendeu_mes_liquido: 0, rendeu_desde_inicio_liquido: 0, aplicacoes: [] }, '2026-11-17')
  expect(campoGuardado(zero, [], '2026-11-17T12:00:00Z', null)).toMatchObject({ estado: 'pronto', valor: { total: 0 }, atualizadoEm: null, conferidoEm: null })
  expect(campoPendencias(normalizaEscritorio({}), [], 'consulta')).toMatchObject({ estado: 'indisponivel', valor: null })
  expect(campoPendencias(normalizaEscritorio({ precisa_de_voce: [] }), [], 'consulta')).toMatchObject({ estado: 'pronto', valor: 0 })
})
it('unidade da API e unidade do motor são explícitas, sem conversão dupla', () => {
  expect(paraMotor(daTela(12.34))).toBe(1234)
  expect(paraMotor({ unidade: 'centavos', valor: 1234 })).toBe(1234)
})
