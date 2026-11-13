// Casos N1 a N5 da revisão do ECONOMISTA (fase_final/revisao/MOTOR_por_ECONOMISTA.md; conta à mão em
// scratchpad/revisao_motor/novos.py). Ficam fora do casos_teste.json, que é do ECONOMISTA. Todo número é exemplo.
import { describe, expect, it } from 'vitest'
import { comCasas, textoDeCentavos as t } from './decimal'
import { aliquotaIR, diasIR, rendimentoAplicacao } from './f1_rendimento'
import { fatorInflacao, gastoNaVirada } from './f3_necessario'
import { avaliarDesejo } from './f7_desejo'
import { avisosFGC } from './f10_fgc'
import { cabeDesejo, futuro } from './index'
import { pct } from './decimal'
import type { Aplicacao, Desejo, FuturoEntrada, Taxa } from './tipos'

const TB: Record<number, Taxa> = { 2026: '0.1375', 2027: '0.125', 2028: '0.11' }
const IP: Record<number, Taxa> = { 2026: '0.0522', 2027: '0.049', 2028: '0.04', 2029: '0.04' }
const TAXAS = { taxa_bruta_ano: TB, aliq_proj: '0.225', virada: '2029-01', taxa_real_trabalho: '0.04' }
const ap = (id: string, titular: string, saldo: number, conj = 1): Aplicacao => ({ id, titular, banco: 'Banco X (exemplo)', saldo, taxa_bruta_anual: '0.10', isenta: false, aplicada_em: '2026-01-01', resgate_previsto: null, conta_conjunta_titulares: conj, fgc: true })
const base: FuturoEntrada = {
  hoje: '2026-11-13', saldo_caixa: 20_000_000, aplicacoes: [ap('a1', 'T1', 80_000_000)], recebimentos: [], compromissos: [], dividas: [], desvios: [], desejos: [],
  parametros: { mes_base: '2026-11', virada: '2029-01', gasto_2029_hoje: 3_000_000, renda_certa_2029: 0, margem: '0.10', taxa_real_trabalho: '0.04', taxa_bruta_ano: TB, ipca_ano: IP, aliq_proj: '0.225', piso_meses: 6, teto_mes: 3_000_000, mes_reajuste: 1 },
}
const ultimo = (e: FuturoEntrada) => { const l = futuro(e).linha; return l[l.length - 1].saldo_final }

describe('Revisão do ECONOMISTA: N1 a N5', () => {
  // Motivo: prova o futuro() inteiro e a correção 3 (guardar por mês com os fatores da linha;
  // antes dava 394.660,27 com a Selic do último ano).
  it('N1 futuro() completo', () => {
    const r = futuro(base)
    expect(r.linha.length).toBe(25)
    expect(t(r.linha[r.linha.length - 1].saldo_final)).toBe('323268.93')
    expect(t(r.patrimonio_necessario as number)).toBe('11043839.59')
    expect(t(-r.folga)).toBe('10720570.66')
    expect(t(r.ajustes_falta!.cortar_por_mes_2029)).toBe('35096.36')
    expect(t(r.renda_sustentavel)).toBe('1058.30')
    expect(t(r.ajustes_falta!.guardar_por_mes)).toBe('393380.12')
  })
  // Motivo: correção 1. Desejo pago com contrato antecipado: entra A em d e deixa de entrar R em r.
  // Antes a calculadora dizia "ganha" (−71.192,35) quando a família perde.
  it('N2 desejo com contrato antecipado', () => {
    const des: Desejo = { id: 'd1', dono: 'p1', valor: 5_000_000, mes: '2027-01', volta_de: 'contrato', volta: 12_000_000, volta_mes: '2027-12', antecipado: 10_000_000, volta_certa: true }
    const r = avaliarDesejo(des, TAXAS)
    expect(t(r.perda_na_virada)).toBe('71192.41')
    expect(t(r.impacto_renda_mensal as number)).toBe('233.07')
    expect(r.leitura).toBe('tira da renda de 2029')
    // Desconto do contrato: (120.000 ÷ 100.000)^(1/11) − 1, 11 meses de 01/2027 a 12/2027 (não é do ECONOMISTA; conferência minha).
    expect(pct(r.taxa_implicita_mensal!)).toBe('1.6713')
    // A linha do próprio motor confere (tolerância de R$ 0,01 por mês, ECONOMISTA F6).
    const dif = ultimo(base) - ultimo({ ...base, desejos: [des] })
    expect(Math.abs(dif - r.perda_na_virada)).toBeLessThanOrEqual(25)
    expect(cabeDesejo(base, des).tira_por_mes_2029).toBe(23_307)
  })
  // Motivo: correção 2. Conta individual + conjunta no mesmo banco: cada conta limitada a 250 mil ÷ titulares,
  // depois o titular no banco limitado a 250 mil. Antes não saía aviso.
  it('N3 FGC misto', () => {
    expect(avisosFGC([ap('i', 'T1', 10_000_000), ap('c', 'T1', 28_000_000, 2)])).toEqual([{ banco: 'Banco X (exemplo)', titular: 'T1', fora: 1_500_000 }])
  })
  // Motivo: mês-base diferente de 11/2026.
  it('N4 gasto na virada com mês-base 06/2027', () => {
    expect(comCasas(fatorInflacao('2027-06', '2029-01', IP), 6)).toBe('1.065175')
    expect(t(gastoNaVirada(1_000_000, '2027-06', '2029-01', IP))).toBe('10651.75')
  })
  // Motivo: IR por data nas bordas de 720 dias e resgate padrão (31/12 antes da virada).
  it('N5 IR por data e resgate padrão', () => {
    expect(diasIR('2027-01-01', '2028-12-21')).toBe(720); expect(aliquotaIR(720).toString()).toBe('0.175')
    expect(diasIR('2027-01-01', '2028-12-22')).toBe(721); expect(aliquotaIR(721).toString()).toBe('0.15')
    expect(diasIR('2027-01-02', '2028-12-31')).toBe(729)
    expect(t(rendimentoAplicacao({ ...ap('x', 'T1', 10_000_000), aplicada_em: '2027-01-02' }, '2027-03', '2029-01'))).toBe('695.28')
  })
})
