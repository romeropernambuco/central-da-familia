import { describe, expect, it } from 'vitest'
import { trocasDeExemplo } from '../../api/exemploTrocas'
import { contaDaTroca, erroDaTroca, tetoDoReembolso, vereditoDaTroca } from './conta'
import type { Troca } from './tipos'

const c2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100
const duo = trocasDeExemplo[0]
const com = (mudancas: Partial<Troca>): Troca => ({ ...duo, ...mudancas })
const conta = (t: Troca) => {
  const r = contaDaTroca(t)
  if (!r) throw new Error('a conta deveria fechar')
  return r
}
const custo = (t: Troca, id: string) => conta(t).custos.find(c => c.id === id)!

describe('conta da troca: os mesmos números do painel original, centavo a centavo', () => {
  it('cenário padrão: 1 TB, Sicoob Black, venda de R$ 8.000, com imposto', () => {
    const r = conta(duo)
    expect(r.preco).toBe(3089)
    expect(r.reembolso).toBe(460.26)
    expect(c2(r.escolhido.puro)).toBe(19877.41)
    expect(c2(r.escolhido.taxas)).toBe(695.71)
    expect(c2(r.escolhido.fatura)).toBe(20573.12)
    expect(c2(r.reembolsoReais)).toBe(2961.73)
    expect(c2(r.aparelho)).toBe(17611.39)
    expect(c2(r.bolso)).toBe(9611.39)
    expect(c2(r.imposto)).toBe(7003.88)
    expect(c2(r.total)).toBe(16615.27)
    expect(c2(r.custo)).toBe(16615.27)
    expect(Math.round(r.escolhido.pontos)).toBe(16391)
    expect(Math.round(r.escolhido.milhasValem)).toBe(232)
  })

  it('sem o imposto do Brasil, o número grande é só o que sai do bolso', () => {
    const r = conta(com({ comImposto: false }))
    expect(c2(r.custo)).toBe(9611.39)
    expect(r.barra.imposto).toBe(0)
    expect(c2(r.barra.venda + r.barra.bolso)).toBe(100)
  })

  it('conta em euro: quanto comprar, quanto custa a remessa e quanto sobra', () => {
    const r = conta(duo)
    expect(c2(r.contaReais)).toBe(21998.79)
    expect(r.contaSobra).toBe(211)
    expect(conta(com({ contaComprar: 3000 })).contaSobra).toBe(-89)
    expect(c2(custo(duo, 'c6').fatura)).toBe(c2(3089 * 6.6663))
  })

  it('cada forma de pagar: fatura, dinheiro de volta e pontos', () => {
    expect(c2(custo(duo, 'ref').fatura)).toBe(19877.41)
    expect(custo(duo, 'ref').taxas).toBe(0)
    // Ultravioleta: 3,5% de spread e IOF devolvido dá a mesma fatura do Sicoob (spread zero e 3,5% de IOF)
    expect(c2(custo(duo, 'uvp').fatura)).toBe(20573.12)
    expect(c2(custo(duo, 'uvc').cashback)).toBe(c2(19877.41 * 1.035 * 0.0125))
    expect(custo(duo, 'uvc').pontos).toBe(0)
    // PicPay: 5% de spread, 3,5% de IOF e 4% de volta sobre o valor com spread
    expect(c2(custo(duo, 'epic').fatura)).toBe(c2(3089 * 6.4349 * 1.05 * 1.035))
    expect(c2(custo(duo, 'epic').cashback)).toBe(c2(3089 * 6.4349 * 1.05 * 0.04))
    expect(c2(custo(duo, 'nu').fatura)).toBe(c2(3089 * 6.4349 * 1.04 * 1.035))
  })

  it('outra versão troca o preço e a faixa do reembolso', () => {
    const r = conta(com({ versao: 0 }))
    expect(r.preco).toBe(2339)
    expect(r.reembolso).toBe(339.16)
    expect(conta(com({ versao: 3 })).reembolso).toBe(572.01)
  })

  it('reembolso digitado vale no lugar da tabela; zero simula sem reembolso', () => {
    expect(conta(com({ reembolso: 400 })).reembolso).toBe(400)
    const sem = conta(com({ reembolso: 0 }))
    expect(sem.reembolsoReais).toBe(0)
    expect(c2(sem.aparelho)).toBe(20573.12)
    expect(c2(conta(com({ cambioReembolso: 6 })).reembolsoReais)).toBe(2761.56)
  })

  it('imposto: metade do que passa da cota; dentro da cota, zero', () => {
    expect(conta(com({ cota: 0 })).imposto).toBeCloseTo(3089 * 0.5 * 6.4349, 6)
    expect(conta(com({ valorAduana: 900 })).imposto).toBe(0)
    expect(c2(conta(com({ valorAduana: 2000 })).imposto)).toBe(c2((2000 - 1000 / 1.0963) * 0.5 * 6.4349))
  })

  it('a venda do usado mexe só no que sai do bolso', () => {
    const r = conta(com({ venda: 9500 }))
    expect(c2(r.bolso)).toBe(8111.39)
    expect(c2(r.imposto)).toBe(7003.88)
    expect(c2(conta(com({ venda: 0 })).bolso)).toBe(17611.39)
  })

  it('venda maior que o aparelho: a barra não fica negativa', () => {
    const r = conta(com({ venda: 30000, comImposto: false }))
    expect(r.bolso).toBeLessThan(0)
    expect(r.barra).toEqual({ venda: 100, bolso: 0, imposto: 0 })
  })
})

describe('qual forma de pagar ganha', () => {
  it('em dinheiro ganha o Ultravioleta cashback; Sicoob vem depois e a conta em euro sai mais cara', () => {
    const r = conta(duo)
    const v = vereditoDaTroca(r, duo)!
    expect(v.melhores.map(c => c.id)).toEqual(['uvc'])
    expect(c2(v.melhores[0].liquido)).toBe(20315.95)
    // Sicoob e Ultravioleta pontos têm a mesma fatura: empatam no segundo lugar
    expect(
      r.ordem
        .slice(1, 3)
        .map(c => c.id)
        .sort(),
    ).toEqual(['sicoob', 'uvp'])
    expect(c2(v.seguinte!.diferenca)).toBe(257.16)
    expect(c2(v.contaAMais!)).toBe(276.25)
    expect(r.ordem.some(c => c.id === 'ref')).toBe(false)
  })

  it('empate em dinheiro (diferença menor que R$ 1) aparece como empate', () => {
    const semCashback = com({ pagamentos: duo.pagamentos.filter(p => p.id !== 'uvc') })
    const v = vereditoDaTroca(conta(semCashback), semCashback)!
    expect(v.melhores.map(c => c.id).sort()).toEqual(['sicoob', 'uvp'])
    expect(v.seguinte!.custo.id).toBe('c6')
  })

  it('com spread de 2% no PicPay, ele passa a ser o mais barato', () => {
    const t = com({ pagamentos: duo.pagamentos.map(p => (p.id === 'epic' ? { ...p, spreadPct: 2 } : p)) })
    expect(conta(t).ordem[0].id).toBe('epic')
  })

  it('a forma escolhida que não existe mais cai na mais barata', () => {
    expect(conta(com({ pagamento: 'sumiu' })).escolhido.id).toBe(conta(duo).ordem[0].id)
  })
})

describe('quando a conta não fecha', () => {
  it('reembolso maior que o imposto embutido é barrado', () => {
    expect(tetoDoReembolso(3089, 21)).toBe(536.11)
    expect(erroDaTroca(com({ reembolso: 536.11 }))).toBe('')
    expect(erroDaTroca(com({ reembolso: 536.12 }))).not.toBe('')
    expect(contaDaTroca(com({ reembolso: 600 }))).toBeNull()
  })

  it('câmbio zero ou número quebrado não vira conta', () => {
    expect(contaDaTroca(com({ cambio: 0 }))).toBeNull()
    expect(contaDaTroca(com({ dolarFiscal: 0 }))).toBeNull()
    expect(contaDaTroca(com({ venda: NaN }))).toBeNull()
    expect(contaDaTroca(com({ versoes: [] }))).toBeNull()
  })
})
