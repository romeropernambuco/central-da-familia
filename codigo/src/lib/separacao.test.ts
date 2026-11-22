// A separação (regra do dono, 22/11/2026): salário e aluguel pagam o mês, o guardado rende o lucro, a gordura não se come.
import { describe, expect, it } from 'vitest'
import { fraseDaSeparacao, gastoDoMes, rendaDoMesCadastrada, separarDoMes } from './separacao'

describe('quanto dá para gastar no mês sem tocar na gordura', () => {
  it('soma o salário cadastrado; extra fica de fora e a variável conta pelo mês fraco', () => {
    expect(
      rendaDoMesCadastrada([
        { valor: 5000, tipo: 'salario' },
        { valor: 900, tipo: 'extra' },
        { valor: 3000, fraco: 1200, tipo: 'variavel' },
        null,
      ]),
    ).toBe(6200)
    expect(rendaDoMesCadastrada('estragado')).toBe(0)
  })

  it('começo do mês: o salário ainda não caiu, mas conta; gastou pouco, ainda dá', () => {
    const s = separarDoMes({ entrou: 0, previsto: 0, rendaCadastrada: 5000, lucro: 800, gasto: 1200 })!
    expect(s).toMatchObject({ entra: 5000, lucro: 800, pode: 5800, folga: 4600, situacao: 'folga' })
    const f = fraseDaSeparacao(s)
    expect(f.titulo).toBe('Ainda dá R$ 4.600 este mês')
    expect(f.frase).toContain('Dá para gastar até R$ 5.800 sem tocar na gordura')
    expect(f.frase).toContain('O que sobrar engorda o guardado.')
  })

  it('com 85% ou mais do que pode: no limite (o dinheiro da empresa também sai daqui)', () => {
    const s = separarDoMes({ entrou: 6000, previsto: 1500, rendaCadastrada: 5000, lucro: 500, gasto: 7000 })!
    expect(s).toMatchObject({ entra: 7500, pode: 8000, folga: 1000, situacao: 'limite' })
    expect(fraseDaSeparacao(s).titulo).toBe('No limite: faltam R$ 1.000')
    expect(fraseDaSeparacao(s).frase).toContain('Dinheiro para a empresa também sai daqui.')
  })

  it('o aluguel conta líquido, como no plano: o imposto dele sai do que entra', () => {
    const s = separarDoMes({
      entrou: 3000,
      previsto: 0,
      rendaCadastrada: 5000,
      lucro: 0,
      gasto: 0,
      extras: 3000,
      imposto: 825,
    })!
    // R$ 5.000 de salário + R$ 3.000 de aluguel − R$ 825 de imposto (27,5%)
    expect(s.entra).toBe(7175)
  })

  it('passou do que entra e do que rende: diz quanto saiu da gordura', () => {
    const s = separarDoMes({ entrou: 5000, previsto: 0, rendaCadastrada: 5000, lucro: 800, gasto: 7300 })!
    expect(s).toMatchObject({ folga: -1500, situacao: 'passou' })
    expect(fraseDaSeparacao(s).titulo).toBe('Passou R$ 1.500: esse pedaço sai da gordura')
  })

  it('aluguel e dívida recuperada somam por cima do salário que ainda não caiu', () => {
    // entrou R$ 3.000 de aluguel + R$ 3.000 da dívida; o salário de R$ 16.000 ainda não caiu
    const s = separarDoMes({
      entrou: 6000,
      previsto: 0,
      rendaCadastrada: 16000,
      lucro: 600,
      gasto: 9000,
      extras: 6000,
    })!
    expect(s.entra).toBe(22000)
    expect(s.pode).toBe(22600)
    // sem dizer o que é extra, o salário esperado engole o que entrou (conta antiga, mais conservadora)
    expect(separarDoMes({ entrou: 6000, previsto: 0, rendaCadastrada: 16000, lucro: 600, gasto: 9000 })!.entra).toBe(
      16000,
    )
  })

  it('a compra parcelada conta só a parcela do mês, também nos meses seguintes', () => {
    const lanc = [
      { data: '2026-12-05', valor: 24000, parcelas: 10 },
      { data: '2026-12-10', valor: 300 },
      { data: '2027-01-03', valor: 2400, parcela: 2 }, // projeção do exemplo: não conta (a compra original é a fonte)
      { data: '2026-11-20', valor: 999, apagado_em: '2026-11-21' },
    ]
    expect(gastoDoMes(lanc, '2026-12', '2026-12-31')).toBe(2700)
    expect(gastoDoMes(lanc, '2027-03', '2027-03-31')).toBe(2400)
    expect(gastoDoMes(lanc, '2027-10', '2027-10-31')).toBe(0)
  })

  it('o que foi separado para a viagem sai do que pode gastar', () => {
    const s = separarDoMes({
      entrou: 0,
      previsto: 0,
      rendaCadastrada: 10000,
      lucro: 500,
      gasto: 6000,
      reservado: 1500,
    })!
    expect(s.pode).toBe(9000)
    expect(fraseDaSeparacao(s).frase).toContain('menos R$ 1.500 separados para a viagem')
  })

  it('sem renda e sem guardado: nada a dizer', () => {
    expect(separarDoMes({ entrou: 0, previsto: 0, rendaCadastrada: 0, lucro: 0, gasto: 300 })).toBeNull()
  })
})
