// Gordura x lucro da gordura (regra do dono, 22/11/2026): gastar o que o guardado rende não come o guardado.
import { describe, expect, it } from 'vitest'
import { analisarGordura, folgaNoMes, fraseDaGordura } from './gordura'
import type { LinhaMes } from './futuro'

const mes = (m: string, ini: number, rend: number, fim: number): LinhaMes => ({
  mes: m,
  saldo_inicial: ini,
  rendimento: rend,
  recebimentos: 0,
  teto: 0,
  compromissos: 0,
  dividas: 0,
  desvios: 0,
  retornos: 0,
  saldo_final: fim,
  piso: 0,
  fica_devendo: 0,
  devendo_ate: null,
})

describe('a gordura fica inteira ou é comida?', () => {
  it('gasto que cabe no lucro e na sobra: a gordura fica inteira e cresce', () => {
    const linha = [mes('2026-12', 10000000, 91400, 10030000), mes('2027-01', 10030000, 91600, 10060000)]
    const a = analisarGordura(linha)!
    expect(a).toMatchObject({ gordura: 10000000, lucroDoMes: 91400, comeEm: null, ganhoNoFim: 60000 })
    expect(fraseDaGordura(a, '2027-01')).toBe(
      'A gordura de hoje (R$ 100.000) fica inteira até 01/2027: os gastos e os desejos saem da sobra e do que ela rende. No fim, o guardado chega a R$ 100.600.',
    )
  })
  it('viagem maior que o lucro guardado: diz o mês e quanto come no pior mês', () => {
    const linha = [
      mes('2026-12', 10000000, 91400, 10050000),
      mes('2027-01', 10050000, 91700, 9800000),
      mes('2027-02', 9800000, 89000, 9900000),
    ]
    const a = analisarGordura(linha)!
    expect(a.comeEm).toBe('2027-01')
    expect(a.menorFolga).toBe(-200000)
    expect(fraseDaGordura(a, '2027-02')).toBe(
      'A partir de 01/2027 os gastos e os desejos passam a comer a gordura de hoje (R$ 100.000): no pior mês (01/2027) ela fica R$ 2.000 menor.',
    )
    expect(folgaNoMes(linha, '2026-12')).toBe(50000)
    expect(folgaNoMes(linha, '2027-01')).toBe(-200000)
    expect(folgaNoMes(linha, '2030-01')).toBeNull()
  })
  it('sem linha (depois da virada): nada a dizer', () => {
    expect(analisarGordura([])).toBeNull()
    expect(folgaNoMes([], '2027-01')).toBeNull()
  })
})
