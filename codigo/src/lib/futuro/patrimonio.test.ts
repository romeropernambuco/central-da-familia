// RODADA_PATRIMONIO: o teste "do que entra de patrimônio" pedido pelo dono, contra a conta feita por fora pelo
// VERIFICADOR (fase_final/verificador/ESPERADO.md, mesmas premissas do item 7). Todo número é exemplo inventado.
import { describe, expect, it } from 'vitest'
import { aluguelLiquidoMes, cabeDesejo, futuro, pct, rentabilidadeAno, textoDeCentavos as t, Dec } from './index'
import type { FuturoEntrada, Imovel, Recebimento } from './index'

const rec = (id: string, valor: number, mes: string, certo = true, mes_novo: string | null = null): Recebimento => ({ id, dono: 'exemplo', valor, mes_previsto: mes, mes_novo, certo, recebido: false })
const meses = (de: string, ate: string) => { const out: string[] = []; let [a, m] = de.split('-').map(Number); const [a2, m2] = ate.split('-').map(Number); while (a < a2 || (a === a2 && m <= m2)) { out.push(`${a}-${m < 10 ? '0' : ''}${m}`); m++; if (m === 13) { a++; m = 1 } } return out }
const imovel = (x: Partial<Imovel> & Pick<Imovel, 'id' | 'apelido' | 'valor' | 'uso'>): Imovel => ({ dono: 'exemplo', aluguel_bruto: 0, custos_mes: 0, vacancia: '0', tem_contrato: false, contrato_ate: null, venda_valor: null, venda_mes: null, venda_contrato: false, ...x })

const SALA = imovel({ id: 'sala', apelido: 'Sala comercial', valor: 60_000_000, uso: 'aluga', aluguel_bruto: 300_000, custos_mes: 50_000, vacancia: '0.08', tem_contrato: true, contrato_ate: '2029-12' })
const PRAIA = imovel({ id: 'praia', apelido: 'Apartamento de praia', valor: 90_000_000, uso: 'aluga', aluguel_bruto: 400_000, tem_contrato: false })
const CASA = imovel({ id: 'casa', apelido: 'Casa onde mora', valor: 150_000_000, uso: 'mora' })
const LOTE = (contrato: boolean) => imovel({ id: 'lote', apelido: 'Lote', valor: 20_000_000, uso: 'vende', venda_valor: 22_000_000, venda_mes: '2028-10', venda_contrato: contrato })

function cenario(loteComContrato: boolean, mes_reajuste = 0, atraso: string | null = '2027-09', hoje = '2026-11-14'): FuturoEntrada {
  return {
    hoje, saldo_caixa: 4_000_000,
    aplicacoes: [{ id: 'ap', titular: 'exemplo', titulares: ['exemplo'], banco: 'Banco A (exemplo)', saldo: 120_000_000, taxa_bruta_anual: '0.12', isenta: false, aplicada_em: '2026-01-01', resgate_previsto: null, fgc: true }],
    recebimentos: [
      rec('contrato', 5_000_000, '2027-03'), rec('investimento', 12_000_000, '2027-08'),
      ...meses('2026-12', '2028-12').map((m) => rec(`parcela-${m}`, 200_000, m)),
      rec('comissao', 3_000_000, '2027-06', false), rec('atrasa', 2_500_000, '2027-05', true, atraso),
    ],
    compromissos: [], dividas: [], desvios: [], desejos: [],
    imoveis: [SALA, PRAIA, CASA, LOTE(loteComContrato)],
    parametros: {
      mes_base: '2026-11', virada: '2029-01', gasto_2029_hoje: 2_100_000, renda_certa_2029: 0, margem: '0.10', taxa_real_trabalho: '0.04',
      taxa_bruta_ano: { 2026: '0.1375', 2027: '0.125', 2028: '0.11', 2029: '0.1025' }, ipca_ano: { 2026: '0.0522', 2027: '0.049', 2028: '0.04', 2029: '0.04' },
      aliq_proj: '0.225', aliq_renda: '0.15', aliq_aluguel: '0.275', piso_meses: 6, teto_mes: 2_100_000, mes_reajuste,
    },
  }
}
const ultimo = (e: FuturoEntrada) => { const l = futuro(e).linha; return l[l.length - 1].saldo_final }
const mesDa = (e: FuturoEntrada, m: string) => futuro(e).linha.find((l) => l.mes === m)!

describe('aluguel líquido e rentabilidade (ESPERADO.md item 5)', () => {
  it('Sala: 3.000 × 0,92 − 500 = 2.260, IR 27,5% → R$ 1.638,50; 3,2770% ao ano', () => {
    expect(t(aluguelLiquidoMes(SALA, '0.275'))).toBe('1638.50')
    expect(t(aluguelLiquidoMes(SALA, '0'))).toBe('2260.00')
    expect(pct(rentabilidadeAno(SALA, '0.275'))).toBe('3.2770')
  })
  it('casa onde mora: renda zero; sem aliq_aluguel nos parâmetros usa 27,5% e marca [confirmar]', () => {
    expect(aluguelLiquidoMes(CASA, '0.275')).toBe(0)
    const e = cenario(false); delete (e.parametros as { aliq_aluguel?: string }).aliq_aluguel
    const s = futuro(e)
    expect(s.aliq_aluguel_confirmar).toBe(true); expect(s.aluguel_liquido_2029).toBe(163_850)
  })
})

describe('cenário A (Lote sem contrato), teto fixo como no ESPERADO.md', () => {
  const s = futuro(cenario(false))
  it('linha de 12/2026 a 12/2028 com as entradas no mês certo (meses conferidos com o VERIFICADOR)', () => {
    expect(s.linha[0].mes).toBe('2026-12'); expect(s.linha.length).toBe(25)
    const v = (m: string) => { const l = s.linha.find((x) => x.mes === m)!; return [t(l.saldo_inicial), t(l.rendimento), t(l.recebimentos + l.alugueis!), t(l.saldo_final)] }
    expect(v('2026-12')).toEqual(['1240000.00', '10710.02', '3638.50', '1233348.52'])
    expect(v('2027-03')).toEqual(['1217074.55', '9595.57', '53638.50', '1259308.62'])
    expect(v('2027-08')).toEqual(['1228574.10', '9686.24', '123638.50', '1340898.84'])
    expect(v('2027-09')).toEqual(['1340898.84', '10229.49', '28638.50', '1358766.83'])
    expect(v('2027-12')).toEqual(['1345071.60', '10604.72', '3638.50', '1338314.82'])
    expect(v('2028-12')).toEqual(['1245011.41', '8680.81', '3638.50', '1236330.72'])
    for (const l of s.linha) expect(l.alugueis).toBe(163_850)
  })
  it('totais: saldo 01/2029, imóveis à parte, renda das aplicações + aluguel = R$ 5.685,93', () => {
    expect(t(s.linha[24].saldo_final)).toBe('1236330.72')
    expect(t(s.patrimonio_imoveis!)).toBe('3200000.00')
    expect(t(s.renda_sustentavel)).toBe('4047.43')
    expect(t(s.aluguel_liquido_2029!)).toBe('1638.50')
    expect(t(s.renda_total_2029!)).toBe('5685.93')
  })
  it('gatilhos: comissão incerta, praia sem contrato e venda do Lote sem contrato; nenhum entra na conta', () => {
    expect(s.gatilhos!.map((g) => [g.id, g.tipo, g.motivo, t(g.valor), g.mes])).toEqual([
      ['praia', 'aluguel', 'sem contrato', t(aluguelLiquidoMes(PRAIA, '0.275')), null],
      ['lote', 'venda', 'sem contrato', '220000.00', '2028-10'],
      ['comissao', 'recebimento', 'incerto', '30000.00', '2027-06'],
    ])
    expect(mesDa(cenario(false), '2027-06').recebimentos).toBe(200_000) // só a parcela, sem a comissão
    expect(mesDa(cenario(false), '2028-10').recebimentos).toBe(200_000) // sem a venda
  })
  it('o recebimento que atrasa de 05 pra 09/2027 move o mês e custa R$ 871,93 em 12/2028', () => {
    expect(mesDa(cenario(false), '2027-05').recebimentos).toBe(200_000)
    expect(mesDa(cenario(false), '2027-09').recebimentos).toBe(2_700_000)
    const noPrazo = ultimo(cenario(false, 0, null))
    expect(t(noPrazo)).toBe('1237202.65')
    expect(t(noPrazo - ultimo(cenario(false)))).toBe('871.93')
  })
  it('rentabilidade por imóvel comparada com a taxa real das aplicações', () => {
    const sala = s.imoveis!.find((i) => i.id === 'sala')!
    expect(pct(new Dec(sala.rentabilidade_ano))).toBe('3.2770')
    expect(pct(new Dec(sala.taxa_real_aplicacoes))).toBe('4.5313') // Focus 2029 com IR 15% (aliq_renda)
    expect(sala.rende_mais_que_aplicacao).toBe(false); expect(sala.entra_na_conta).toBe(true)
    expect(s.imoveis!.find((i) => i.id === 'praia')!.entra_na_conta).toBe(false)
    expect(s.imoveis!.find((i) => i.id === 'casa')!.aluguel_liquido_mes).toBe(0)
  })
})

describe('cenário B (Lote com contrato)', () => {
  const s = futuro(cenario(true))
  it('a venda entra bruta em 10/2028 e o Lote sai do patrimônio de imóveis', () => {
    const l = mesDa(cenario(true), '2028-10')
    expect([t(l.saldo_inicial), t(l.rendimento), t(l.recebimentos + l.alugueis!), t(l.saldo_final)]).toEqual(['1262471.96', '8802.55', '223638.50', '1473913.01'])
    expect(t(s.linha[24].saldo_final)).toBe('1459359.30')
    expect(t(s.patrimonio_imoveis!)).toBe('3000000.00')
    expect(t(s.renda_sustentavel)).toBe('4777.56'); expect(t(s.renda_total_2029!)).toBe('6416.06')
    expect(t(s.linha[24].saldo_final - futuro(cenario(false)).linha[24].saldo_final)).toBe('223028.58')
    expect(s.gatilhos!.map((g) => g.id)).toEqual(['praia', 'comissao'])
    expect(s.imoveis!.find((i) => i.id === 'lote')!.vendido).toBe(true)
  })
})

describe('variante com reajuste do teto em janeiro (ESPERADO.md premissa 3)', () => {
  it('A R$ 1.194.266,47 e B R$ 1.417.295,05', () => {
    expect(t(ultimo(cenario(false, 1)))).toBe('1194266.47')
    expect(t(ultimo(cenario(true, 1)))).toBe('1417295.05')
  })
})

describe('valor de imóvel nunca vira saque', () => {
  it('tirar ou pôr imóveis sem aluguel com contrato nem venda com contrato não muda a linha', () => {
    const com = cenario(false), sem = { ...cenario(false), imoveis: [SALA] }
    expect(futuro(sem).linha).toEqual(futuro(com).linha)
    const so = { ...cenario(false), imoveis: [] }
    expect(futuro(so).linha.every((l) => l.alugueis === 0)).toBe(true)
  })
  it('faltando dinheiro, o motor sugere cortar ou guardar e nunca vender imóvel', () => {
    const pobre = { ...cenario(false), saldo_caixa: 0, aplicacoes: [] }
    const s = futuro(pobre)
    expect(s.patrimonio_imoveis).toBe(320_000_000)
    expect(JSON.stringify(s.ajustes_falta)).not.toMatch(/imov|vend/i)
  })
})

describe('modo renda (2029) soma aplicações + aluguel com contrato', () => {
  it('02/01/2029: renda_total = renda das aplicações + aluguel da Sala; contrato acaba em 12/2029 e vira gatilho depois', () => {
    const e = cenario(false, 0, '2027-09', '2029-01-02')
    const r = futuro(e).renda!
    expect(r.aluguel_liquido).toBe(163_850); expect(r.renda_total).toBe(r.renda_sustentavel + 163_850)
    const depois = futuro(cenario(false, 0, '2027-09', '2030-01-05'))
    expect(depois.renda!.aluguel_liquido).toBe(0)
    expect(depois.gatilhos!.some((g) => g.id === 'sala' && g.motivo === 'depois do contrato' && g.mes === '2030-01')).toBe(true)
    expect(cabeDesejo(e, { id: 'd', dono: 'exemplo', valor: 100_000, mes: '2029-02', volta_de: 'nada', volta: 0, volta_mes: null, antecipado: null, volta_certa: false }).modo).toBe('renda')
  })
})
