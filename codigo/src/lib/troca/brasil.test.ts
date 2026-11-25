import { describe, expect, it } from 'vitest'
import { trocasDeExemplo } from '../../api/exemploTrocas'
import { compararComBrasil, compraSugerida, economiaConfirmada, taxaDoMes, valorDeHoje } from './brasil'
import { contaDaTroca } from './conta'
import { lerTroca } from './ler'
import type { Troca } from './tipos'

const c2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100
/** O exemplo no 512 GB, a versão que tem preço no Brasil (R$ 16.270 em 10x, dinheiro rendendo 12% ao ano). */
const duo512: Troca = { ...trocasDeExemplo[0], versao: 1 }
const comparar = (t: Troca) => compararComBrasil(t, contaDaTroca(t)!)

describe('parcelar sem juros com o dinheiro rendendo', () => {
  it('12% ao ano é 0,9489% ao mês', () => {
    expect(taxaDoMes(12)).toBeCloseTo(0.009489, 6)
    expect(Math.pow(1 + taxaDoMes(12), 12)).toBeCloseTo(1.12, 10)
  })

  it('R$ 16.270 em 10x a 12% ao ano valem R$ 15.452,16 hoje', () => {
    expect(c2(valorDeHoje(16270, 10, 12))).toBe(15452.16)
    expect(c2(valorDeHoje(16270, 10, 10))).toBe(15578.62)
  })

  it('à vista, ou com o dinheiro parado, vale o preço cheio', () => {
    expect(valorDeHoje(16270, 1, 12)).toBe(16270)
    expect(valorDeHoje(16270, 0, 12)).toBe(16270)
    expect(valorDeHoje(1200, 12, 0)).toBe(1200)
  })

  it('1 parcela daqui a 1 mês: o preço dividido por 1 mais a taxa do mês', () => {
    expect(valorDeHoje(1000, 2, 12)).toBeCloseTo(500 / (1 + taxaDoMes(12)) + 500 / Math.pow(1 + taxaDoMes(12), 2), 8)
  })
})

describe('lá fora ou no Brasil', () => {
  it('com o imposto do Brasil, comprar aqui em 10x sai R$ 4.770,33 mais barato', () => {
    const c = comparar(duo512)!
    expect(c2(c.fora)).toBe(20222.48)
    expect(c.brasil).toBe(16270)
    expect(c2(c.brasilParcelado)).toBe(15452.16)
    expect(c2(c.ganhoDeParcelar)).toBe(817.84)
    expect(c.melhor).toBe('brasil')
    expect(c2(c.economia)).toBe(4770.33)
  })

  it('sem o imposto do Brasil, comprar lá fora sai R$ 624,83 mais barato', () => {
    const c = comparar({ ...duo512, comImposto: false })!
    expect(c2(c.fora)).toBe(14827.33)
    expect(c.melhor).toBe('fora')
    expect(c2(c.economia)).toBe(624.83)
  })

  it('à vista no Brasil compara com o preço cheio', () => {
    const c = comparar({ ...duo512, comImposto: false, brasil: { ...duo512.brasil!, parcelas: 1 } })!
    expect(c.brasilParcelado).toBe(16270)
    expect(c.ganhoDeParcelar).toBe(0)
    expect(c2(c.economia)).toBe(1442.67)
  })

  it('a venda do usado não muda a comparação', () => {
    expect(comparar({ ...duo512, venda: 0 })!.economia).toBe(comparar(duo512)!.economia)
  })

  it('versão sem preço no Brasil, ou comparação sem loja, não compara', () => {
    expect(comparar(trocasDeExemplo[0])).toBeNull()
    expect(comparar({ ...duo512, brasil: null })).toBeNull()
    expect(comparar(trocasDeExemplo[1])).toBeNull()
  })
})

describe('economia confirmada', () => {
  it('a confirmação nasce preenchida com o caminho escolhido e a forma de pagar', () => {
    const c = comparar(duo512)!
    expect(compraSugerida(duo512, c, 'brasil', '2026-12-02')).toEqual({
      onde: 'brasil',
      forma: '10x sem juros',
      pago: 15452.16,
      outraOpcao: 20222.48,
      data: '2026-12-02',
    })
    expect(compraSugerida(duo512, c, 'fora', '2026-12-02')).toEqual({
      onde: 'fora',
      forma: 'Sicoob Black',
      pago: 20222.48,
      outraOpcao: 15452.16,
      data: '2026-12-02',
    })
  })

  it('economia é a outra opção menos o que foi pago; negativa quando a escolha saiu mais cara', () => {
    expect(
      economiaConfirmada({ onde: 'fora', forma: 'x', pago: 14800, outraOpcao: 15452.16, data: '2026-12-02' }),
    ).toBeCloseTo(652.16, 2)
    expect(
      economiaConfirmada({ onde: 'fora', forma: 'x', pago: 20222.48, outraOpcao: 15452.16, data: '2026-12-02' }),
    ).toBeLessThan(0)
  })

  it('preço no Brasil, loja e compra confirmada passam pela conferência de entrada', () => {
    const compra = {
      onde: 'brasil' as const,
      forma: '10x sem juros',
      pago: 16270,
      outraOpcao: 20222.48,
      data: '2026-12-02',
    }
    const lida = lerTroca(JSON.parse(JSON.stringify({ ...duo512, compra })))!
    expect(lida.versoes[1].precoBrasil).toBe(16270)
    expect(lida.brasil).toEqual(duo512.brasil)
    expect(lida.compra).toEqual(compra)
    const estragada = lerTroca({ ...duo512, brasil: { parcelas: -3, rendeAnoPct: 'abc' }, compra: { data: 'ontem' } })!
    expect(estragada.brasil).toEqual({ loja: '', parcelas: 1, rendeAnoPct: 0, nota: '' })
    expect(estragada.compra).toBeNull()
  })
})
