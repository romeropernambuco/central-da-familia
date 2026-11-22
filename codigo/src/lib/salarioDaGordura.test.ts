// O salário da gordura (22/11/2026): um percentual do guardado, fixo por 12 meses, revisto uma vez por ano; o recomendado
// é o único que, com os juros de 2000 a 2026, nunca deixou o guardado valendo menos em 20 anos.
import { describe, expect, it } from 'vitest'
import {
  fraseDoImpacto,
  fraseDoSalario,
  IMPACTO_HISTORICO,
  inflacaoDoMes,
  ipcaDosProximos12Meses,
  IPCA_PADRAO,
  lerRegra,
  mesDoSalario,
  mesMais,
  PCT_RECOMENDADO,
  proximaRevisao,
  regraDeHoje,
  regraNova,
} from './salarioDaGordura'

describe('a regra do salário', () => {
  it('sem regra gravada: a recomendada (3% ao ano), a gravar', () => {
    const h = regraDeHoje(null, 1_000_000, '2026-11')!
    expect(h.gravar).toBe(true)
    expect(h.regra).toMatchObject({ pct: PCT_RECOMENDADO, desde: '2026-11', salario_mes: 2500, escolhido: false })
    expect(proximaRevisao(h.regra)).toBe('2027-11')
  })

  it('fica fixo por 12 meses mesmo com o guardado mudando', () => {
    const r = regraNova(1_000_000, 3, '2026-11', false)
    const h = regraDeHoje(r, 1_300_000, '2027-10')!
    expect(h).toEqual({ regra: r, gravar: false })
  })

  it('na revisão do ano: o mesmo percentual sobre o guardado de hoje, mantendo a escolha da família', () => {
    const r = regraNova(1_000_000, 4, '2026-11', true)
    const h = regraDeHoje(r, 1_200_000, '2027-11')!
    expect(h.gravar).toBe(true)
    expect(h.regra).toMatchObject({ pct: 4, desde: '2027-11', salario_mes: 4000, base: 1_200_000, escolhido: true })
  })

  it('config estragada ou percentual fora da tabela: recalcula pela recomendação', () => {
    expect(lerRegra({ pct: 7, desde: '2026-11', salario_mes: 1, base: 1 })).toBeNull()
    expect(lerRegra({ pct: 3, desde: '2026-13', salario_mes: 1, base: 1 })).toBeNull()
    expect(lerRegra('x')).toBeNull()
    expect(lerRegra({ pct: 3.5, desde: '2026-11', salario_mes: 2916.67, base: 1e6, escolhido: true })).toMatchObject({
      pct: 3.5,
      escolhido: true,
    })
  })

  it('sem guardado e sem regra: nada', () => {
    expect(regraDeHoje(null, 0, '2026-11')).toBeNull()
  })

  it('mesMais vira o ano', () => {
    expect(mesMais('2026-11', 12)).toBe('2027-11')
    expect(mesMais('2026-12', 1)).toBe('2027-01')
  })
})

describe('o mês com o salário fixo', () => {
  it('juros de hoje (R$ 1 milhão rende R$ 9.190, IPCA 5%): sobra reserva depois do salário e da inflação', () => {
    const r = regraNova(1_000_000, 3, '2026-11', false)
    const m = mesDoSalario(9190, 1_000_000, 0.05, r.salario_mes)
    expect(m.inflacao).toBeCloseTo(4074.12, 2)
    expect(m.cresce).toBeCloseTo(2615.88, 2)
    const { titulo, frase } = fraseDoSalario(r, m)
    expect(titulo).toBe('Salário da gordura: R$ 2.500 por mês, fixo até 11/2027')
    expect(frase).toContain('a regra que os especialistas recomendam')
    expect(frase).toContain('ainda cresce R$ 2.616')
  })

  it('juro baixo: o salário continua e o app diz quanto o guardado perde de valor no mês', () => {
    const r = regraNova(1_000_000, 3, '2026-11', true)
    const m = mesDoSalario(3000, 1_000_000, 0.045, r.salario_mes)
    expect(m.cresce).toBeLessThan(0)
    const { frase } = fraseDoSalario(r, m)
    expect(frase).toContain('como a família escolheu')
    expect(frase).toContain('o salário continua')
  })

  it('inflação inválida não come nada', () => {
    expect(inflacaoDoMes(1000, Number.NaN)).toBe(0)
  })
})

describe('o impacto de cada percentual', () => {
  it('a tabela vai de 3% a 6% e o recomendado nunca deixou o guardado valer menos em 20 anos', () => {
    expect(IMPACTO_HISTORICO.map(i => i.pct)).toEqual([3, 3.5, 4, 4.5, 5, 5.5, 6])
    const rec = IMPACTO_HISTORICO.find(i => i.pct === PCT_RECOMENDADO)!
    expect(fraseDoImpacto(rec, 2_000_000)).toContain('o salário começa em R$ 5.000 por mês')
    expect(fraseDoImpacto(rec, 2_000_000)).toContain('nunca ficou valendo menos que hoje')
    expect(fraseDoImpacto(IMPACTO_HISTORICO[4], 1_000_000)).toContain('no pior caso, valendo 67,1%')
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
