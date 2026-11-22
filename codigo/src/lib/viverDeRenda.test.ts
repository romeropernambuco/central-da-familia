// Família sem meta (regra do dono, 22/11/2026: "o sistema tem que identificar"): quando daria para viver do que rende.
import { describe, expect, it } from 'vitest'
import type { LinhaMes } from './futuro'
import { fraseViverDeRenda, quandoViveDeRenda } from './viverDeRenda'

const linhaCom = (ini: number, sobra: number, meses: number, rende = 0): LinhaMes[] =>
  Array.from({ length: meses }, (_, i) => {
    const m = `2027-${String(i + 1).padStart(2, '0')}`
    const s0 = ini + i * (sobra + rende)
    return {
      mes: m,
      saldo_inicial: s0,
      rendimento: rende,
      recebimentos: 0,
      teto: 0,
      compromissos: 0,
      dividas: 0,
      desvios: 0,
      retornos: 0,
      saldo_final: s0 + sobra + rende,
      piso: 0,
      fica_devendo: 0,
      devendo_ate: null,
    }
  })

describe('quando a família viveria do que rende, sem meta escolhida', () => {
  it('a sobra média sai da linha do plano, sem o rendimento', () => {
    const v = quandoViveDeRenda(linhaCom(10_000_000, 200_000, 12, 50_000), {
      gasto: 500_000,
      taxaRealAnual: 0.04,
      margem: 0.1,
      alugueis: 0,
    })!
    expect(v.sobraMes).toBe(200_000)
    expect(v.jaCobre).toBe(false)
    // precisa de ~R$ 5.500 por mês a 4% real: perto de R$ 1,68 milhão; com R$ 100 mil e R$ 2 mil de sobra, leva décadas
    expect(v.mes! > '2050-01').toBe(true)
    expect(fraseViverDeRenda(v)).toMatch(
      /^Meta ainda não escolhida\. Pelo que a família cadastrou \(gasto de R\$ 5\.000 por mês, guardando a sobra de hoje, perto de R\$ 2\.000 por mês\), daria para viver só do que rende por volta de [a-z]{3}\/20\d\d\./,
    )
  })

  it('aluguel ajuda: com os aluguéis cobrindo quase tudo, chega bem antes', () => {
    const base = { gasto: 500_000, taxaRealAnual: 0.04, margem: 0.1 }
    const sem = quandoViveDeRenda(linhaCom(10_000_000, 200_000, 12), { ...base, alugueis: 0 })!
    const com = quandoViveDeRenda(linhaCom(10_000_000, 200_000, 12), { ...base, alugueis: 400_000 })!
    expect(com.mes! < sem.mes!).toBe(true)
  })

  it('já cobre hoje', () => {
    const v = quandoViveDeRenda(linhaCom(300_000_000, 0, 3), {
      gasto: 500_000,
      taxaRealAnual: 0.04,
      margem: 0.1,
      alugueis: 0,
    })!
    expect(v.jaCobre).toBe(true)
    expect(fraseViverDeRenda(v)).toContain('já daria para viver só do que rende')
  })

  it('sem sobra e sem guardado que chegue: não chega em 40 anos', () => {
    const v = quandoViveDeRenda(linhaCom(1_000_000, -10_000, 6), {
      gasto: 500_000,
      taxaRealAnual: 0.04,
      margem: 0.1,
      alugueis: 0,
    })!
    expect(v.mes).toBeNull()
    expect(fraseViverDeRenda(v)).toContain('não daria para viver só do que rende nos próximos 40 anos')
  })

  it('sem linha, sem gasto ou sem taxa: nada a dizer', () => {
    expect(quandoViveDeRenda([], { gasto: 1, taxaRealAnual: 0.04, margem: 0, alugueis: 0 })).toBeNull()
    expect(quandoViveDeRenda(linhaCom(1, 1, 1), { gasto: 0, taxaRealAnual: 0.04, margem: 0, alugueis: 0 })).toBeNull()
  })
})
