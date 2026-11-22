// O salário da gordura (regra do dono, 22/11/2026): metade do que rende é salário, metade fica, e a parte que fica nunca
// é menor que a inflação do mês.
import { describe, expect, it } from 'vitest'
import {
  fraseDoSalario,
  inflacaoDoMes,
  ipcaDosProximos12Meses,
  IPCA_PADRAO,
  salarioDaGordura,
} from './salarioDaGordura'

describe('salário da gordura', () => {
  it('juros de hoje (R$ 1 milhão rende R$ 9.190, IPCA 5%): metade cobre a inflação e o guardado ainda cresce', () => {
    const s = salarioDaGordura(9190, 1_000_000, 0.05)!
    expect(s.inflacao).toBeCloseTo(4074.12, 2)
    expect(s).toMatchObject({ salario: 4595, guarda: 4595, metadeCobre: true })
    expect(s.cresce).toBeCloseTo(520.88, 2)
    expect(fraseDoSalario(s)).toContain('A outra metade, R$ 4.595, é o salário da gordura')
  })

  it('juro baixo (Selic 6%, IPCA 4,5%): a metade não cobre; fica a inflação e o salário cai', () => {
    const s = salarioDaGordura(4080, 1_000_000, 0.045)!
    expect(s.metadeCobre).toBe(false)
    expect(s.guarda).toBe(s.inflacao)
    expect(s.salario).toBeCloseTo(4080 - s.inflacao, 2)
    expect(s.cresce).toBe(0)
    expect(fraseDoSalario(s)).toContain('metade do rendimento não cobre a inflação')
  })

  it('rende menos que a inflação (2021): não há salário; tudo fica guardado', () => {
    const s = salarioDaGordura(3000, 1_000_000, 0.1)!
    expect(s).toMatchObject({ salario: 0, guarda: 3000, cresce: 0, metadeCobre: false })
    expect(fraseDoSalario(s)).toContain('não sobra salário da gordura')
  })

  it('sem rendimento ou sem guardado: nada a dividir', () => {
    expect(salarioDaGordura(0, 1000, 0.05)).toBeNull()
    expect(salarioDaGordura(100, 0, 0.05)).toBeNull()
    expect(inflacaoDoMes(1000, Number.NaN)).toBe(0)
  })
})

describe('IPCA dos próximos 12 meses', () => {
  const focus = [
    { ano: 2026, ipca: '0.0511' },
    { ano: 2027, ipca: '0.0500' },
    { ano: 2028, ipca: '0.0400' },
  ]
  it('de julho em diante usa o ano que vem; antes, o ano de hoje', () => {
    expect(ipcaDosProximos12Meses(focus, '2026-11-22')).toEqual({ ipca: 0.05, doFocus: true })
    expect(ipcaDosProximos12Meses(focus, '2026-03-10')).toEqual({ ipca: 0.0511, doFocus: true })
  })
  it('sem o ano pedido usa o mais perto; sem Focus, o padrão', () => {
    expect(ipcaDosProximos12Meses(focus, '2030-01-05').ipca).toBe(0.04)
    expect(ipcaDosProximos12Meses([], '2026-11-22')).toEqual({ ipca: IPCA_PADRAO, doFocus: false })
    expect(ipcaDosProximos12Meses([{ ano: 2027, ipca: 'x' }], '2026-11-22').doFocus).toBe(false)
  })
})
