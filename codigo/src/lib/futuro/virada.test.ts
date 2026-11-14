// QA E11 (erros 1 a 4): 31/12/2028, virada (01/01/2029 e 02/01/2029) e "cabe" alinhado com a linha.
// Todo número é exemplo inventado. Os 39 casos do ECONOMISTA não mudam.
import { describe, expect, it } from 'vitest'
import { cabeDesejo, cortarPorMes2029, futuro, gastoNaVirada, impacto2029, MESES_MINIMOS_PRA_GUARDAR, patrimonioNecessario, pct, rendaSustentavel, Dec, taxaRealAnual } from './index'
import type { Desejo, FuturoEntrada } from './index'

const PAR = {
  mes_base: '2026-11', virada: '2029-01', gasto_2029_hoje: 2_000_000, renda_certa_2029: 0, margem: '0.10', taxa_real_trabalho: '0.04',
  taxa_bruta_ano: { 2026: '0.1375', 2027: '0.125', 2028: '0.11' } as Record<number, string>, ipca_ano: { 2026: '0.0522', 2027: '0.049', 2028: '0.04', 2029: '0.04' } as Record<number, string>,
  aliq_proj: '0.225', piso_meses: 6, teto_mes: 3_000_000, mes_reajuste: 1,
}
const ent = (hoje: string, extra: Partial<FuturoEntrada> = {}, par: Partial<typeof PAR> = {}): FuturoEntrada => ({
  hoje, saldo_caixa: 300_000_000, aplicacoes: [], recebimentos: [], compromissos: [], dividas: [], desvios: [], desejos: [], parametros: { ...PAR, ...par }, ...extra,
})
const desejo = (valor: number, mes: string): Desejo => ({ id: 'd', dono: 'exemplo', valor, mes, volta_de: 'nada', volta: 0, volta_mes: null, antecipado: null, volta_certa: false })

describe('erro 3: perto da virada o ajuste vira cortar em 2029', () => {
  it('31/12/2028: sem linha, folga negativa, sugerido cortar e guardar 0', () => {
    const s = futuro(ent('2028-12-31'))
    expect(s.modo).toBe('projecao'); expect(s.linha).toEqual([]); expect(s.renda).toBeNull()
    expect(s.folga).toBeLessThan(0)
    expect(s.ajustes_falta).toMatchObject({ sugerido: 'cortar', guardar_por_mes: 0, meses_restantes: 0, cortar_por_mes_2029: cortarPorMes2029(-s.folga, '0.04') })
  })
  it(`com menos de ${MESES_MINIMOS_PRA_GUARDAR} meses corta; com ${MESES_MINIMOS_PRA_GUARDAR} ou mais guarda`, () => {
    const poucos = futuro(ent('2028-08-10')).ajustes_falta!
    expect(poucos).toMatchObject({ sugerido: 'cortar', guardar_por_mes: 0, meses_restantes: 4 })
    const seis = futuro(ent('2028-06-15')).ajustes_falta!
    expect(seis.sugerido).toBe('guardar'); expect(seis.meses_restantes).toBe(6); expect(seis.guardar_por_mes).toBeGreaterThan(0)
    expect(seis.guardar_por_mes * 6).toBeLessThan(-futuro(ent('2028-06-15')).folga)
  })
})

describe('erros 1 e 2: modo renda depois da virada', () => {
  for (const hoje of ['2029-01-01', '2029-01-02']) {
    it(`${hoje}: sem linha, renda do mês com a taxa real de trabalho e marca que falta a taxa de 2029`, () => {
      const s = futuro(ent(hoje))
      expect(s.modo).toBe('renda'); expect(s.linha).toEqual([])
      const gasto = gastoNaVirada(2_000_000, '2026-11', '2029-01', PAR.ipca_ano)
      const renda = rendaSustentavel(300_000_000, '0.04')
      expect(s.renda).toEqual({
        mes: '2029-01', patrimonio: 300_000_000, taxa_real_anual: '0.04', taxa_real_mensal: new Dec('1.04').pow(new Dec(1).div(12)).minus(1).toString(),
        renda_sustentavel: renda, gasto_do_mes: gasto, folga_do_mes: renda - gasto, falta_taxa: true,
      })
      expect(s.renda_sustentavel).toBe(renda)
      expect(s.patrimonio_necessario).toBe(patrimonioNecessario(gasto, '0.10', '0.04'))
      expect(s.folga).toBe(300_000_000 - s.patrimonio_necessario!)
      expect(s.ajustes_falta).toMatchObject({ sugerido: 'cortar', guardar_por_mes: 0, meses_restantes: 0 })
    })
  }
  it('com Selic e IPCA de 2029 nos parâmetros usa a taxa do ano (Focus 2029 do ECONOMISTA: 4,5313% real)', () => {
    const s = futuro(ent('2029-01-02', {}, { taxa_bruta_ano: { ...PAR.taxa_bruta_ano, 2029: '0.1025' }, aliq_proj: '0.15' }))
    expect(s.renda!.falta_taxa).toBe(false)
    expect(pct(taxaRealAnual('0.1025', '0.15', '0.04'))).toBe('4.5313')
    expect(pct(new Dec(s.renda!.taxa_real_anual))).toBe('4.5313')
  })
  it('nunca trava: sem taxa nenhuma, sem IPCA, patrimônio negativo, ano bem depois', () => {
    for (const hoje of ['2029-01-02', '2031-07-20']) {
      const s = futuro(ent(hoje, { saldo_caixa: -5_000_000 }, { taxa_bruta_ano: {}, ipca_ano: {} }))
      expect(s.modo).toBe('renda'); expect(s.renda!.falta_taxa).toBe(true); expect(s.renda!.renda_sustentavel).toBe(0)
    }
    expect(futuro(ent('2029-01-02', {}, { taxa_real_trabalho: '0' })).patrimonio_necessario).toBeNull()
  })
  it('impacto depois da virada: tira R$ X por mês da renda a partir de agora', () => {
    const r = impacto2029(ent('2029-01-02'), { mes: '2029-01', valor: 5_000_000 })
    expect(r).toEqual({ valor_na_virada: 5_000_000, perda_renda_mensal: rendaSustentavel(5_000_000, '0.04'), modo: 'renda' })
  })
  it('cabe? depois da virada responde nos 3 casos', () => {
    expect(cabeDesejo(ent('2029-01-02'), desejo(1_000_000, '2029-02'))).toMatchObject({ situacao: 'cabe, mas tira', modo: 'renda', tira_por_mes_2029: rendaSustentavel(1_000_000, '0.04') })
    expect(cabeDesejo(ent('2029-01-02', { saldo_caixa: 2_000_000_000 }), desejo(1_000_000, '2029-02')).situacao).toBe('cabe')
    expect(cabeDesejo(ent('2029-01-02'), desejo(290_000_000, '2029-02'))).toMatchObject({ situacao: 'ainda nao cabe', primeiro_mes_abaixo: '2029-02', caberia_em: null })
    expect(cabeDesejo(ent('2029-01-02', { saldo_caixa: 10_000_000 }), desejo(100_000, '2029-01'))).toMatchObject({ situacao: 'apertado sem o desejo', apertado_sem_desejo: '2029-01' })
  })
})

describe('erro 4: "cabe" nunca num mês em que a linha sem o desejo já fica devendo', () => {
  it('família devendo desde 12/2026 e sem quitar até 12/2028: o desejo mostra que já está apertado, nunca "cabe a partir de"', () => {
    const e = ent('2026-11-18', { saldo_caixa: 17_000_000 })
    const l = futuro(e).linha
    expect(l[0].fica_devendo).toBeGreaterThan(0); expect(l[0].devendo_ate).toBeNull()
    const r = cabeDesejo(e, desejo(5_000_000, '2026-12'))
    expect(r.situacao).toBe('apertado sem o desejo'); expect(r.caberia_em).toBeNull(); expect(r.apertado_sem_desejo).toBe('2026-12')
  })
  it('mês abaixo do piso que volta pra cima mas não quita conta como devendo (igual à Linha2028)', () => {
    // 12/2026 abaixo do piso; em 01/2027 entra um recebimento que põe o saldo acima do piso, mas não o bastante pra quitar.
    const e = ent('2026-11-18', { saldo_caixa: 17_000_000, recebimentos: [{ id: 'r', dono: 'exemplo', valor: 5_000_000, mes_previsto: '2027-01', mes_novo: null, certo: true, recebido: false }] }, { teto_mes: 500_000, piso_meses: 36 })
    const l = futuro(e).linha
    expect(l[0].fica_devendo).toBeGreaterThan(0)
    const r = cabeDesejo(e, desejo(1_000_000, '2027-03'))
    expect(r.situacao).not.toBe('cabe'); expect(r.caberia_em).toBeNull()
  })
  it('em 80 cenários sorteados, caberia_em nunca cai num mês em que a linha sem o desejo fica devendo dali em diante', () => {
    let s = 7
    const rnd = (a: number, b: number) => { s = (s * 1664525 + 1013904223) >>> 0; return a + Math.floor((s / 4294967296) * (b - a + 1)) }
    let comCaberia = 0
    for (let k = 0; k < 80; k++) {
      const e = ent('2026-11-18', {
        saldo_caixa: rnd(5_000_000, 120_000_000),
        recebimentos: [{ id: 'r', dono: 'exemplo', valor: rnd(0, 60_000_000), mes_previsto: `2027-0${rnd(1, 9)}`, mes_novo: null, certo: true, recebido: false }],
      }, { teto_mes: 500_000 })
      const r = cabeDesejo(e, desejo(rnd(1_000_000, 40_000_000), `2026-12`))
      if (r.caberia_em === null) continue
      comCaberia++
      const sem = futuro(e).linha
      const devendoDali = sem.some((l) => l.mes >= r.caberia_em! && (l.fica_devendo > 0 || sem.some((x) => x.fica_devendo > 0 && x.mes <= l.mes && (x.devendo_ate === null || x.devendo_ate > l.mes))))
      expect(devendoDali).toBe(false)
    }
    expect(comCaberia).toBeGreaterThan(0)
  })
})

describe('card de 2029: falta do mês e corte são o mesmo número na frase principal (QA E11, card de 02/01/2029)', () => {
  for (const hoje of ['2028-12-31', '2029-01-01', '2029-01-02']) {
    it(`${hoje}: corte = falta_por_mes + margem_por_mes, e a margem é a de 10% do gasto a cobrir`, () => {
      const s = futuro(ent(hoje))
      const a = s.ajustes_falta!
      expect(a.falta_por_mes! + a.margem_por_mes!).toBe(a.cortar_por_mes_2029)
      expect(a.falta_por_mes).toBeGreaterThan(0); expect(a.margem_por_mes).toBeGreaterThan(0)
      const gasto = gastoNaVirada(2_000_000, '2026-11', '2029-01', PAR.ipca_ano)
      expect(Math.abs(a.margem_por_mes! - Math.round(gasto * 0.1))).toBeLessThanOrEqual(1) // a margem de 10%, até 1 centavo de arredondamento
      if (s.modo === 'renda') expect(a.falta_por_mes).toBe(-s.renda!.folga_do_mes) // o mesmo número do "faltam por mês"
      else expect(a.falta_por_mes).toBe(gasto - s.renda_sustentavel)
    })
  }
  it('margem zero: o corte inteiro é a falta do mês', () => {
    const a = futuro(ent('2029-01-02', {}, { margem: '0' })).ajustes_falta!
    expect(a.margem_por_mes).toBeLessThanOrEqual(1); expect(a.falta_por_mes! + a.margem_por_mes!).toBe(a.cortar_por_mes_2029)
  })
  it('renda cobre o mês mas não a margem: falta 0 e o corte é só margem', () => {
    // patrimônio entre o que cobre o gasto e o que cobre gasto + 10%
    const gasto = gastoNaVirada(2_000_000, '2026-11', '2029-01', PAR.ipca_ano)
    const sem = patrimonioNecessario(gasto, '0', '0.04')!, com = patrimonioNecessario(gasto, '0.10', '0.04')!
    const s = futuro(ent('2029-01-02', { saldo_caixa: Math.round((sem + com) / 2) }))
    expect(s.renda!.folga_do_mes).toBeGreaterThanOrEqual(0)
    expect(s.ajustes_falta).toMatchObject({ falta_por_mes: 0 })
    expect(s.ajustes_falta!.margem_por_mes).toBe(s.ajustes_falta!.cortar_por_mes_2029)
  })
})

describe('desejo feito não sai 2 vezes (REVISOR E12, C2)', () => {
  const pend = { ...desejo(2_000_000, '2027-03'), id: 'pendente' }
  const feito: Desejo = { ...desejo(5_000_000, '2026-10'), id: 'feito', situacao: 'feito' }
  const desistiu: Desejo = { ...desejo(9_000_000, '2027-05'), id: 'desisti', situacao: 'desisti' }
  it('projeção: 1 feito e 1 pendente dão a mesma linha que só o pendente', () => {
    const so = futuro(ent('2026-11-18', { desejos: [pend] }))
    const os2 = futuro(ent('2026-11-18', { desejos: [feito, pend, desistiu] }))
    expect(os2.linha).toEqual(so.linha)
    expect(os2.linha.reduce((t, l) => t + l.desvios, 0)).toBe(2_000_000)
    expect(os2.ajustes_falta?.desejos_pra_adiar).toEqual(['pendente'])
  })
  it('modo renda: o feito não sai de novo do patrimônio; o pendente sai', () => {
    const r = futuro(ent('2029-01-02', { desejos: [{ ...feito, mes: '2028-12' }, { ...pend, mes: '2029-02' }] })).renda!
    expect(r.patrimonio).toBe(300_000_000 - 2_000_000)
  })
  it('cabe? não conta o feito que já está na lista', () => {
    const a = cabeDesejo(ent('2026-11-18', { desejos: [feito] }), pend)
    const b = cabeDesejo(ent('2026-11-18'), pend)
    expect(a).toEqual(b)
  })
})
