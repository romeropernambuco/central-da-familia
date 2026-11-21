import { describe, expect, it } from 'vitest'
import { entradaDoBanco, type FuturoBanco } from './lib/futuroReceitas'
import { cabeDesejo, futuro, reajustarTeto, type Desejo } from './lib/futuro'

// Valores inventados, em centavos. Sem juros, inflação ou outros movimentos.
function banco(): FuturoBanco {
  return {
    hoje: '2028-09-15',
    mes_base: '2028-09',
    saldo_caixa: 500_000,
    aplicacoes: [],
    cdi_hoje: { pct_ano: '0' },
    recebimentos: [],
    limites_mes: [{ envelope_id: 'e', limite_centavos: 100_000 }],
    config: null,
    desejos: [],
    parametros: null,
    focus: [{ ano: 2028, selic_fim: '0', ipca: '0', divulgado_em: '2028-09-01', fonte: 'teste' }],
    parcelas_futuras: [{ parcelas_lista: [{ mes_fatura: '2028-10', valor_centavos: 20_000 }] }],
  }
}

describe('parcelas no teto: regressão do saldo final pelo adaptador', () => {
  it('R$ 5000 menos teto de R$ 1000 incluindo parcela de R$ 200 resulta em R$ 4000', () => {
    const e = entradaDoBanco(banco()).entrada!
    const l = futuro(e).linha
    expect(l[0]).toMatchObject({
      saldo_inicial: 500_000,
      teto: 100_000,
      compromissos: 0,
      rendimento: 0,
      saldo_final: 400_000,
    })
    expect(l.map(x => x.saldo_final)).toEqual([400_000, 300_000, 200_000])
  })

  it('mantém o 13º de R$ 300 da folha como saída adicional em dezembro', () => {
    const j = banco()
    j.hoje = '2028-11-15'
    j.mes_base = '2028-11'
    j.parcelas_futuras[0].parcelas_lista[0].mes_fatura = '2028-12'
    j.config = { casa_folha: { pessoas: [{ salario: 300 }] } }
    const e = entradaDoBanco(j).entrada!
    expect(e.compromissos).toEqual([{ mes: '2028-12', valor: 30_000, tipo: 'folha_13' }])
    expect(futuro(e).linha[0].saldo_final).toBe(370_000)
  })

  it('duas parcelas em meses diferentes não se acumulam como saídas extras', () => {
    const j = banco()
    j.parcelas_futuras.push({ parcelas_lista: [{ mes_fatura: '2028-11', valor_centavos: 20_000 }] })
    const l = futuro(entradaDoBanco(j).entrada!).linha
    expect(l.map(x => [x.mes, x.compromissos, x.saldo_final])).toEqual([
      ['2028-10', 0, 400_000],
      ['2028-11', 0, 300_000],
      ['2028-12', 0, 200_000],
    ])
  })

  it('preserva teto integral, reajuste, piso e gasto padrão de 2029', () => {
    const j = banco()
    j.hoje = '2027-11-15'
    j.mes_base = '2027-11'
    j.focus = [2027, 2028].map(ano => ({
      ano,
      selic_fim: '0',
      ipca: '0.1',
      divulgado_em: '2027-11-01',
      fonte: 'teste',
    }))
    const e = entradaDoBanco(j).entrada!
    expect(e.parametros.teto_mes).toBe(100_000)
    expect(e.parametros.gasto_2029_hoje).toBe(100_000)
    expect(reajustarTeto(e.parametros.teto_mes, '0.1')).toBe(110_000)
    const l = futuro(e).linha
    expect(l[0]).toMatchObject({ teto: 100_000, piso: 600_000 })
    expect(l.find(x => x.mes === '2028-01')).toMatchObject({ teto: 110_000, piso: 660_000 })
  })

  it('preserva o piso de seis tetos no cabe? em modo renda', () => {
    const j = banco()
    j.hoje = '2029-01-15'
    j.mes_base = '2029-01'
    j.saldo_caixa = 610_000
    const e = entradaDoBanco(j).entrada!
    const d: Desejo = {
      id: 'd',
      dono: 'exemplo',
      valor: 10_001,
      mes: '2029-02',
      volta_de: 'nada',
      volta: 0,
      volta_mes: null,
      antecipado: null,
      volta_certa: false,
    }
    expect(cabeDesejo(e, d).situacao).toBe('ainda nao cabe')
    expect(cabeDesejo(e, { ...d, valor: 10_000 }).situacao).not.toBe('ainda nao cabe')
    expect(e.parametros.gasto_2029_hoje).toBe(100_000)
  })
})
