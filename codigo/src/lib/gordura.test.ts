// Gordura x lucro da gordura (regra do dono, 22/11/2026): gastar o que o guardado rende acima da inflação não come o
// guardado; a régua da gordura cresce com a inflação.
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
    expect(fraseDaGordura(a, '2027-01')).toBe('A gordura fica inteira até 01/2027, já contando a inflação.')
  })
  it('com a inflação, o guardado que só fica do mesmo tamanho em reais come a gordura', () => {
    const parado = [mes('2026-12', 10000000, 91400, 10000000), mes('2027-01', 10000000, 91400, 10000000)]
    expect(analisarGordura(parado)!.comeEm).toBeNull()
    const a = analisarGordura(parado, { 2026: '0.05', 2027: '0.05' })!
    expect(a.comeEm).toBe('2026-12')
    // 5% ao ano: perto de R$ 407 por mês em R$ 100 mil
    expect(a.menorFolga).toBeCloseTo(-81648, -1)
    expect(folgaNoMes(parado, '2026-12', { 2027: 0.05 })).toBeCloseTo(-40741, -1)
    expect(fraseDaGordura(a, '2027-01')).toBe(
      'Em 12/2026 os gastos começam a comer a gordura. No pior mês, R$ 816 a menos.',
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
      'Em 01/2027 os gastos começam a comer a gordura. No pior mês, R$ 2.000 a menos.',
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
