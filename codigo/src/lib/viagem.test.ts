// Viagem planejada (regra do dono, 22/11/2026): antecipar, parcelar, custos lá; sai da sobra, nunca da gordura.
import { describe, expect, it } from 'vitest'
import type { LinhaMes } from './futuro'
import {
  analisarViagem,
  custosDaViagem,
  frasesDaViagem,
  lerViagens,
  reservaDasViagens,
  viagensNoPlano,
  type ViagemPlanejada,
} from './viagem'

const viagem = (x: Partial<ViagemPlanejada> = {}): ViagemPlanejada => ({
  id: 'v1',
  nome: 'Lisboa',
  mes: '2027-12',
  compra: '2027-01',
  pacote: 12000,
  parcelas: 12,
  custos_la: 6000,
  desconto_vista: null,
  situacao: 'planejando',
  ...x,
})
/** linha do plano com sobra fixa por mês (reais), de dez/2026 em diante */
const linha = (sobra: number, meses = 24): LinhaMes[] =>
  Array.from({ length: meses }, (_, i) => {
    const t = 2026 * 12 + 11 + i
    const mes = `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`
    return {
      mes,
      saldo_inicial: 0,
      rendimento: 0,
      recebimentos: 0,
      teto: 0,
      compromissos: 0,
      dividas: 0,
      desvios: 0,
      retornos: 0,
      saldo_final: sobra * 100,
      piso: 0,
      fica_devendo: 0,
      devendo_ate: null,
    }
  })

describe('a viagem no plano', () => {
  it('parcelas a partir da compra e o cofrinho dos custos lá até o mês da viagem', () => {
    const c = custosDaViagem(viagem(), '2026-12')
    expect(c[0]).toEqual({ mes: '2026-12', parcela: 0, cofrinho: 461.54 })
    expect(c.find(x => x.mes === '2027-01')).toEqual({ mes: '2027-01', parcela: 1000, cofrinho: 461.54 })
    expect(c.reduce((s, x) => s + x.parcela, 0)).toBeCloseTo(12000, 0)
    expect(c.reduce((s, x) => s + x.cofrinho, 0)).toBeCloseTo(6000, 0)
  })

  it('no motor: parcelas como compromisso e custos lá no mês da viagem, também depois de comprada', () => {
    const p = viagensNoPlano([viagem()], '2026-11')
    expect(p.compromissos).toHaveLength(12)
    expect(p.compromissos[0]).toEqual({ mes: '2027-01', valor: 100000, tipo: 'parcela' })
    expect(p.desvios).toEqual([{ mes: '2027-12', valor: 600000, origem: 'viagem:v1' }])
    // "Comprei" não tira a viagem do plano (simulação de 22/11: melhorava o plano no valor da viagem inteira)
    expect(viagensNoPlano([viagem({ situacao: 'comprada' })], '2026-11')).toEqual(p)
    expect(viagensNoPlano([viagem({ situacao: 'feita' })], '2026-11')).toEqual({ compromissos: [], desvios: [] })
  })

  it('o cofrinho é repartido desde o mês em que a viagem foi planejada e não cresce com o tempo', () => {
    const v = viagem({ criada: '2026-12' })
    const dez = custosDaViagem(v, '2026-12').find(x => x.mes === '2027-06')!.cofrinho
    const jun = custosDaViagem(v, '2027-06').find(x => x.mes === '2027-06')!.cofrinho
    expect(jun).toBe(dez)
    expect(jun).toBe(461.54)
  })

  it('a reserva do mês: cofrinho sempre; a parcela só enquanto não foi comprada (comprada, ela vem pelo cartão)', () => {
    expect(reservaDasViagens([viagem({ criada: '2026-12' })], '2027-01')).toEqual({
      parcela: 1000,
      cofrinho: 461.54,
      total: 1461.54,
    })
    expect(reservaDasViagens([viagem({ criada: '2026-12', situacao: 'comprada' })], '2027-01').parcela).toBe(0)
    expect(reservaDasViagens([viagem({ situacao: 'feita' })], '2027-01').total).toBe(0)
  })

  it('cabe na sobra: a gordura fica inteira', () => {
    const a = analisarViagem(viagem(), linha(2000), 0.008, false)!
    expect(a.cabe).toBe(true)
    expect(frasesDaViagem(viagem(), a).join(' ')).toContain('a gordura fica inteira')
  })

  it('não cabe: diz quanto a família precisa ganhar a mais por mês', () => {
    const a = analisarViagem(viagem(), linha(800), 0.008, false)!
    expect(a.cabe).toBe(false)
    // custa R$ 18.000 em 13 meses; com R$ 800 de sobra, faltam ~R$ 585 por mês
    expect(a.aMaisPorMes).toBeGreaterThan(500)
    expect(a.aMaisPorMes).toBeLessThan(800)
    expect(a.ate).toBe('2027-12')
    expect(frasesDaViagem(viagem(), a).join(' ')).toContain('a mais por mês até 12/2027')
  })

  it('quando a viagem já está no plano, ela volta para a sobra antes de comparar (não conta 2 vezes)', () => {
    const v = viagem()
    const desconta = linha(2000).map(l => {
      const p = viagensNoPlano([v], '2026-11')
      const sai = [...p.compromissos, ...p.desvios].filter(x => x.mes === l.mes).reduce((s, x) => s + x.valor, 0)
      return { ...l, saldo_final: l.saldo_final - sai }
    })
    expect(analisarViagem(v, desconta, 0.008, true)!.cabe).toBe(true)
  })

  it('à vista com desconto x parcelar deixando o dinheiro render', () => {
    const vista = analisarViagem(viagem({ desconto_vista: 10 }), linha(3000), 0.008, false)!.vista!
    expect(vista.compensa).toBe('vista')
    const parcelar = analisarViagem(viagem({ desconto_vista: 1 }), linha(3000), 0.008, false)!.vista!
    expect(parcelar.compensa).toBe('parcelar')
  })

  it('lê só viagem com mês e valor certos', () => {
    expect(lerViagens([{ id: 'a', mes: '2027-13', pacote: 10 }, { id: 'b', mes: '2027-05', pacote: 0 }, null])).toEqual(
      [],
    )
    expect(lerViagens([{ id: 'c', mes: '2027-05', pacote: 100, parcelas: 30, compra: '2028-01' }])[0]).toMatchObject({
      parcelas: 12,
      compra: '2027-05',
      situacao: 'planejando',
    })
  })
})
