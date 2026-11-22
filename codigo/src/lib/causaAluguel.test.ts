// A causa do aluguel (pedido do dono, 22/11/2026): o pedido se atualiza sozinho e diz a regra de cada parte.
import { describe, expect, it } from 'vitest'
import type { CadernoImovel } from './aluguel'
import { CAUSA_PADRAO, contaDaCausa, lerCausa, regrasDaCausa } from './causaAluguel'

const caderno = (extra: Partial<CadernoImovel> = {}): CadernoImovel => ({
  dia_vencimento: 10,
  recebimentos: [],
  despesas: [],
  desde: '2026-01',
  problema: { etapa: 'advogado', desde: '2026-09', volta: null, advogado: 'Dra. Paula', divida: 0, andamento: [] },
  ...extra,
})

describe('o que pedir na causa', () => {
  it('cada mês sem pagar que já venceu entra com multa, juros e honorários', () => {
    // set, out e nov já venceram em 22/11 (dia 10); aluguel de R$ 2.000
    const k = contaDaCausa(caderno(), 2000, CAUSA_PADRAO, '2026-11-22')!
    expect(k.meses.map(m => m.mes)).toEqual(['2026-09', '2026-10', '2026-11'])
    expect(k.alugueis).toBe(6000)
    expect(k.multa).toBe(600)
    // juros de 1% ao mês, por dia desde cada vencimento: 73, 43 e 12 dias
    expect(k.juros).toBeCloseTo((2000 * (73 + 43 + 12)) / 100 / 30, 1)
    expect(k.honorarios).toBeCloseTo((6600 + k.juros) * 0.1, 1)
    expect(k.daFamilia).toBeCloseTo(6600 + k.juros, 1)
    expect(k.pedido).toBeCloseTo(k.daFamilia + k.honorarios, 1)
    expect(k.atualizar).toBe(true)
    expect(k.subiu).toBe(k.pedido)
  })

  it('o mês que ainda não venceu e o que chegou ficam de fora; o que voltou sai do pedido', () => {
    const c = caderno({ recebimentos: [{ mes: '2026-10', data: '2026-10-30', valor: 2000 }] })
    const k = contaDaCausa(c, 2000, { ...CAUSA_PADRAO, recuperado: 1000 }, '2026-11-05')!
    expect(k.meses.map(m => m.mes)).toEqual(['2026-09'])
    expect(k.daFamilia).toBeCloseTo(2000 + 200 + k.juros - 1000, 1)
  })

  it('a expectativa separa o que fica com o advogado do que sobra para a família', () => {
    const causa = { ...CAUSA_PADRAO, juros_pct: 0, multa_pct: 0, expectativa_pct: 50, advogado_pct: 20 }
    const k = contaDaCausa(caderno(), 2000, causa, '2026-11-22')!
    expect(k.daFamilia).toBe(6000)
    expect(k.expectativa).toEqual({ bruta: 3000, advogado: 600, liquida: 2400 })
  })

  it('passou ao advogado neste mês: não avisa; mês que vem, com o pedido maior, avisa de novo', () => {
    const k1 = contaDaCausa(caderno(), 2000, CAUSA_PADRAO, '2026-11-22')!
    const passado = { ...CAUSA_PADRAO, passado_em: '2026-11-22', pedido_passado: k1.pedido }
    expect(contaDaCausa(caderno(), 2000, passado, '2026-11-28')!.atualizar).toBe(false)
    const k2 = contaDaCausa(caderno(), 2000, passado, '2026-12-15')!
    expect(k2.atualizar).toBe(true)
    expect(k2.subiu).toBeGreaterThan(2000)
  })

  it('imóvel vazio ou em reforma não tem causa; sem problema também não', () => {
    const vazio = caderno({
      problema: { etapa: 'vazio', desde: '2026-09', volta: null, advogado: null, divida: 0, andamento: [] },
    })
    expect(contaDaCausa(vazio, 2000, CAUSA_PADRAO, '2026-11-22')).toBeNull()
    expect(contaDaCausa(caderno({ problema: null }), 2000, CAUSA_PADRAO, '2026-11-22')).toBeNull()
  })

  it('as regras dizem de onde vem cada parte e de quem são os honorários', () => {
    const k = contaDaCausa(caderno(), 2000, CAUSA_PADRAO, '2026-11-22')!
    const r = regrasDaCausa(k, CAUSA_PADRAO).join(' ')
    expect(r).toContain('Lei 8.245/91, art. 62')
    expect(r).toContain('Lei 8.906/94, art. 23')
    expect(r).toContain('art. 85')
    expect(r).toContain('O app não é advogado')
  })

  it('o que veio do banco: número fora da faixa volta para o padrão; em branco fica null', () => {
    expect(lerCausa({ multa_pct: 500, juros_pct: 2, expectativa_pct: 0, advogado_pct: null })).toMatchObject({
      multa_pct: 10,
      juros_pct: 2,
      expectativa_pct: 0,
      advogado_pct: null,
    })
    expect(lerCausa('x')).toBeNull()
  })
})
