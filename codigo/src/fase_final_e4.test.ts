// E4 (TELAS, 13/11): cartão com dia que fecha e dia que vence; cada parcela no mês da fatura dela (decisão do dono, TIME.md).
// A tela e o banco fazem a MESMA conta: src/lib/parcela_banco.json traz o que produto._mes_fatura e produto._parcela_valor
// devolveram nos mesmos casos (refazer: bash testes/compara_parcela_banco.sh). Família de EXEMPLO, número inventado.
import { afterEach, describe, expect, it, vi } from 'vitest'
import banco from './lib/parcela_banco.json'
import { gastosDoMes, mesFatura, mesMais, parcelasDe } from './lib/plano'
import { simularCompra } from './lib/formato'
import { apiExemplo, exemploComo, reiniciarExemplo } from './api/exemplo'

const F = 'fam-silva'
const em = (dia: string, hora = 10) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(`${dia}T${String(hora).padStart(2, '0')}:00:00-03:00`)); reiniciarExemplo() }
afterEach(() => { vi.useRealTimers() })

describe('E4: a tela faz a mesma conta do banco (casos rodados no banco)', () => {
  it(`${banco.casos.length} compras: mês da fatura e valor de cada parcela iguais a _mes_fatura e _parcela_valor`, () => {
    expect(banco.casos.length).toBeGreaterThanOrEqual(10)
    for (const c of banco.casos) {
      const m1 = mesFatura(c.data, c.fecha, c.vence)
      const ts = parcelasDe(c.valor, c.parcelas).map((v, i) => ({ n: i + 1, mes: mesMais(m1, i), valor: v }))
      expect(ts, c.id).toEqual(c.banco)
      // o "E se eu comprar?" e as faturas usam simularCompra: tem que dar o mesmo
      expect(simularCompra(c.valor, c.parcelas, c.data, c.fecha, c.vence).map(p => p.mes), c.id).toEqual(c.banco.map(p => p.mes))
    }
  })
  it('o limite do mês conta a soma das parcelas que vencem na fatura daquele mês (igual a _compromisso_mes)', () => {
    const lancs = banco.casos.filter(c => c.parcelas > 1).map(c => ({ data: c.data, valor: c.valor, parcelas: c.parcelas, fecha: c.fecha, vence: c.vence }))
    const meses = [...new Set(banco.casos.flatMap(c => c.banco.map(p => p.mes)))]
    for (const m of meses) {
      const doBanco = banco.casos.filter(c => c.parcelas > 1).flatMap(c => c.banco).filter(p => p.mes === m).reduce((s, p) => s + Math.round(p.valor * 100), 0) / 100
      expect(gastosDoMes(lancs, m, l => mesFatura(l.data, l.fecha, l.vence)).parcelas, m).toBeCloseTo(doBanco, 2)
    }
  })
})

describe('E4: no exemplo, R$ 1.200 em 6x no Nubank (fecha 3, vence 10)', () => {
  it('faturas de dezembro a maio com R$ 200 cada; novembro não conta nada; dezembro abate R$ 200 no dia 1', async () => {
    em('2026-11-18'); exemploComo('bruno')
    const antes = await apiExemplo.faturas(F, 8)
    exemploComo('ana')
    const gAntes = (await apiExemplo.resumoHoje(F)).envelopes.find(e => e.id === 'env-ana')!.gasto_mes
    await apiExemplo.lancar({ familia: F, envelope: 'env-ana', valor: 1200, data: '2026-11-18', descricao: 'Bicicleta (exemplo)', cartao: 'car-nu', parcelas: 6, chave: 'k-bici' })
    expect((await apiExemplo.resumoHoje(F)).envelopes.find(e => e.id === 'env-ana')!.gasto_mes).toBe(gAntes)
    const depois = await apiExemplo.faturas(F, 8)
    const dif = (m: string) => Math.round((depois.find(f => f.cartao_id === 'car-nu' && f.mes === m)!.total - antes.find(f => f.cartao_id === 'car-nu' && f.mes === m)!.total) * 100) / 100
    expect(['2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05', '2027-06'].map(dif)).toEqual([0, 200, 200, 200, 200, 200, 200, 0])
    const dez = (await apiExemplo.lancamentos(F, '2026-12')).filter(l => l.parcela && l.descricao === 'Bicicleta (exemplo)')
    expect(dez.map(l => [l.data, l.parcela!.n, l.valor])).toEqual([['2026-12-01', 1, 200]])
  })
  it('parcelado sem cartão (ou cartão sem os 2 dias) é recusado, igual ao banco', async () => {
    em('2026-11-18'); exemploComo('ana')
    await expect(apiExemplo.lancar({ familia: F, envelope: 'env-ana', valor: 300, data: '2026-11-18', descricao: 'x', parcelas: 3, chave: 'k-sem' })).rejects.toThrow(/Parcelado só no cartão/)
    await apiExemplo.cartaoSalvar(F, { nome: 'Sem dia', titular_id: 'm-ana' })
    const c = (await apiExemplo.cartoes(F)).find(x => x.nome === 'Sem dia')!
    await expect(apiExemplo.lancar({ familia: F, envelope: 'env-ana', valor: 300, data: '2026-11-18', descricao: 'x', cartao: c.id, parcelas: 3, chave: 'k-sem2' })).rejects.toThrow(/dia que fecha/)
  })
})
