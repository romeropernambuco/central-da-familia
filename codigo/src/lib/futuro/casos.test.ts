// Portão 3: os 39 casos do ECONOMISTA (casos_teste.json, só número inventado) com igualdade exata.
// Nenhum caso pulado: cada id precisa ter a sua conta aqui, senão o teste falha.
import { describe, expect, it } from 'vitest'
import dados from './casos_teste.json'
import { centavosDeTexto as c, comCasas, Dec, pct, textoDeCentavos as txt } from './decimal'
import { aliquotaIR, diasIR, irSobre, rendimentoMes } from './f1_rendimento'
import { ALERTA_SEM_VALOR, semValor, taxaLiquidaAnual, taxaRealAnual, taxaRealMensal } from './f2_taxa_real'
import { fatorInflacao, gastoNaVirada, patrimonioNecessario, rendaSustentavel } from './f3_necessario'
import { projetarLinha } from './f4_linha'
import { folga, situacao } from './f5_folga'
import { impactoDesvio } from './f6_impacto'
import { avaliarAntecipacao, avaliarDesejo } from './f7_desejo'
import { reajustarTeto, tetoProjetado, tetoVigente } from './f8_reajuste'
import { cortarPorMes2029, ficaDevendo, guardarPorMes } from './f9_falta'
import { fgcConta } from './f10_fgc'
import { futuro } from './index'
import { mensal } from './decimal'
import type { FuturoEntrada, LinhaMes, Taxa } from './tipos'

type Caso = { id: string; entrada: any; saida_esperada: Record<string, unknown> }
const casos = (dados as { casos: Caso[] }).casos

/** '12.5000' (%) → '0.125' (texto decimal). */
const P = (s: string): Taxa => new Dec(s).div(100).toString()
/** 'MM/AAAA' → 'AAAA-MM'. */
const M = (s: string) => { const [m, a] = s.split('/'); return `${a}-${m}` }
const MM = (s: string) => { const [a, m] = s.split('-'); return `${m}/${a}` }

// Padrões do ECONOMISTA item 4 (Focus 06/11/2026), só pros casos que não trazem a taxa na entrada.
// Ficam no teste, nunca no motor: no app vêm de parametros.
const PADRAO = {
  taxa_bruta_ano: { 2026: '0.1375', 2027: '0.125', 2028: '0.11' } as Record<number, Taxa>,
  aliq_proj: '0.225', virada: '2029-01', taxa_real_trabalho: '0.04',
}
const IPCA_FOCUS: Record<number, Taxa> = { 2026: '0.0522', 2027: '0.049', 2028: '0.04', 2029: '0.04' }

function entradaLinha(hoje: string, saldo: string, recebimentoMes: string, mesNovo: string | null): FuturoEntrada {
  return {
    hoje, saldo_caixa: c(saldo), aplicacoes: [],
    recebimentos: [{ id: 'r1', dono: 'exemplo', valor: c('50000.00'), mes_previsto: recebimentoMes, mes_novo: mesNovo, certo: true, recebido: false }],
    compromissos: [{ mes: '2028-12', valor: c('12000.00'), tipo: 'conta_grande' }],
    dividas: ['2028-10', '2028-11', '2028-12'].map((mes) => ({ mes, valor: c('5000.00') })),
    desvios: [], desejos: [],
    parametros: {
      mes_base: '2028-09', virada: '2029-01', gasto_2029_hoje: 0, renda_certa_2029: 0, margem: '0.10',
      taxa_real_trabalho: '0.04', taxa_bruta_ano: { 2028: '0.11' }, ipca_ano: IPCA_FOCUS, aliq_proj: '0.225',
      piso_meses: 0, teto_mes: c('30000.00'), mes_reajuste: 1,
    },
  }
}

const contas: Record<string, (e: any) => Record<string, unknown>> = {}
for (const id of ['IR-179', 'IR-180', 'IR-181', 'IR-360', 'IR-361', 'IR-720', 'IR-721', 'IR-LCA']) {
  contas[id] = (e) => { const r = irSobre(c(e.rendimento_bruto), e.dias_corridos, e.isenta); return { aliquota_pct: pct(r.aliquota), ir: txt(r.ir), rendimento_liquido: txt(r.liquido) } }
}
for (const id of ['IR-DATA-2027-06-30', 'IR-DATA-2027-07-01']) {
  contas[id] = (e) => { const d = diasIR(e.data_aplicacao, e.data_resgate); return { dias_corridos: d, aliquota_pct: pct(aliquotaIR(d)) } }
}
for (const id of ['F1-2027-01', 'F1-2027-02', 'F1-2028-02', 'F1-2027-04']) {
  contas[id] = (e) => ({ rendimento_liquido: txt(rendimentoMes(c(e.saldo_inicial), P(e.taxa_bruta_anual_pct), P(e.aliquota_ir_pct), e.dias_no_mes)) })
}
contas['F1-NEG'] = (e) => ({ rendimento: txt(rendimentoMes(c(e.saldo_inicial), P(e.taxa_bruta_anual_pct), PADRAO.aliq_proj, e.dias_no_mes)) })
contas['F2-FONTE'] = (e) => { const r = taxaRealAnual(P(e.taxa_nominal_anual_pct), P(e.aliquota_ir_pct), P(e.ipca_anual_pct)); return { taxa_real_anual_pct: pct(r), taxa_real_mensal_pct: pct(taxaRealMensal(r)) } }
contas['F2-FOCUS2029'] = (e) => {
  const r = taxaRealAnual(P(e.taxa_nominal_anual_pct), P(e.aliquota_ir_pct), P(e.ipca_anual_pct))
  return { taxa_liquida_anual_pct: pct(taxaLiquidaAnual(P(e.taxa_nominal_anual_pct), P(e.aliquota_ir_pct))), taxa_real_anual_pct: pct(r), taxa_real_mensal_pct: pct(taxaRealMensal(r)) }
}
contas['F2-NEG'] = (e) => {
  const r = taxaRealAnual(P(e.taxa_nominal_anual_pct), P(e.aliquota_ir_pct), P(e.ipca_anual_pct))
  const nec = patrimonioNecessario(c(e.gasto_mensal_2029), '0', r)
  return { taxa_real_anual_pct: pct(r), patrimonio_necessario: nec === null ? null : txt(nec), alerta: semValor(r) ? ALERTA_SEM_VALOR : null }
}
contas['F2-ZERO'] = (e) => {
  const r = P(e.taxa_real_anual_pct); const nec = patrimonioNecessario(c(e.gasto_mensal_2029), '0', r)
  return { patrimonio_necessario: nec === null ? null : txt(nec), alerta: semValor(r) ? ALERTA_SEM_VALOR : null }
}
contas['F3-BASE'] = (e) => ({ taxa_real_mensal_pct: pct(taxaRealMensal(P(e.taxa_real_anual_pct))), patrimonio_necessario: txt(patrimonioNecessario(c(e.gasto_mensal_2029), P(e.margem_pct), P(e.taxa_real_anual_pct)) as number) })
contas['F3-MARGEM'] = (e) => ({ patrimonio_necessario: txt(patrimonioNecessario(c(e.gasto_mensal_2029), P(e.margem_pct), P(e.taxa_real_anual_pct)) as number) })
contas['F3-RENDA'] = (e) => ({ renda_mensal_sustentavel: txt(rendaSustentavel(c(e.patrimonio_jan_2029), P(e.taxa_real_anual_pct))) })
contas['F3-CORRIGE'] = (e) => {
  const ipca = { 2026: P(e.ipca_2026_pct), 2027: P(e.ipca_2027_pct), 2028: P(e.ipca_2028_pct) }
  return { fator_inflacao: comCasas(fatorInflacao(M(e.mes_base), '2029-01', ipca), 6), gasto_mensal_2029: txt(gastoNaVirada(c(e.gasto_hoje), M(e.mes_base), '2029-01', ipca)) }
}
contas['F4-LINHA'] = (e) => {
  const rec = new Map(Object.entries(e.recebimento as Record<string, string>).map(([m, v]) => [M(m), c(v)]))
  const comp = new Map(Object.entries(e.compromisso as Record<string, string>).map(([m, v]) => [M(m), c(v)]))
  const div = new Map(['2028-10', '2028-11', '2028-12'].map((m) => [m, c(e.divida_mensal)]))
  const linha = projetarLinha({
    saldo_inicial: c(e.saldo_inicial_01_10_2028), de: '2028-10', ate: '2028-12',
    taxa_bruta_ano: { 2028: P(e.taxa_bruta_2028_pct) }, aliq_proj: P(e.aliquota_ir_pct),
    teto: () => c(e.teto_mensal), piso: () => 0, recebimentos: rec, compromissos: comp, dividas: div,
  })
  const mov = (l: LinhaMes) => l.recebimentos - l.teto - l.compromissos - l.dividas - l.desvios + l.retornos
  return {
    meses: linha.map((l) => ({ mes: MM(l.mes), saldo_inicial: txt(l.saldo_inicial), rendimento: txt(l.rendimento), movimento: txt(mov(l)), saldo_final: txt(l.saldo_final) })),
    saldo_final_12_2028: txt(linha[2].saldo_final),
  }
}
contas['F4-ATRASO'] = (e) => {
  // Mesma linha do F4-LINHA, montada pelo futuro(): previsto 10/2028; com atraso entra na data nova (11/2028).
  const ult = (x: FuturoEntrada) => { const l = futuro(x).linha; return l[l.length - 1].saldo_final }
  const chegou = ult(entradaLinha('2028-09-15', '1000000.00', '2028-10', null))
  const atrasou = ult(entradaLinha('2028-09-15', '1000000.00', '2028-10', M(e.data_nova)))
  return { saldo_final_se_chegasse_em_10_2028: txt(chegou), saldo_final_com_atraso: txt(atrasou), custo_do_atraso: txt(chegou - atrasou) }
}
contas['F5-FOLGA'] = (e) => { const s = situacao(folga(c(e.saldo_final_12_2028), c(e.patrimonio_necessario))); return { folga: txt(s.valor), situacao: s.situacao } }
contas['F5-FALTA'] = (e) => {
  const s = situacao(folga(c(e.saldo_final_12_2028), c(e.patrimonio_necessario)))
  return { falta: txt(s.valor), reduzir_gasto_2029_por_mes: txt(cortarPorMes2029(s.valor, P(e.taxa_real_anual_pct))), situacao: s.situacao }
}
contas['F9-GUARDAR'] = (e) => { const i = mensal(P(e.taxa_liquida_anual_pct)); return { taxa_liquida_mensal_pct: pct(i), guardar_por_mes: txt(guardarPorMes(c(e.falta), e.meses, i)) } }
contas['F6-HOJE'] = (e) => {
  const tb = Object.fromEntries(Object.entries(e.taxas_brutas_pct as Record<string, string>).map(([a, v]) => [Number(a), P(v)]))
  const r = impactoDesvio(c(e.valor), M(e.mes_do_desvio), { taxa_bruta_ano: tb, aliq_proj: P(e.aliquota_ir_pct), virada: '2029-01', taxa_real_trabalho: P(e.taxa_real_2029_anual_pct) })
  return { valor_em_jan_2029: txt(r.valor_na_virada), renda_mensal_2029_perdida: txt(r.perda_renda_mensal as number) }
}
for (const id of ['F6-ULTIMO', 'F6-PENULTIMO']) {
  contas[id] = (e) => {
    const r = impactoDesvio(c(e.valor), M(e.mes_do_desvio), { ...PADRAO, taxa_real_trabalho: e.taxa_real_2029_anual_pct ? P(e.taxa_real_2029_anual_pct) : PADRAO.taxa_real_trabalho })
    return { valor_em_jan_2029: txt(r.valor_na_virada), renda_mensal_2029_perdida: txt(r.perda_renda_mensal as number) }
  }
}
const desejoDe = (e: any) => ({ valor: c(e.valor), mes: M(e.mes), volta: c(e.retorno), volta_mes: M(e.mes_retorno), volta_certa: e.certeza === 'certo', volta_de: 'investimento' as const })
contas['F7-RETORNO-CERTO'] = (e) => {
  const r = avaliarDesejo(desejoDe(e), PADRAO)
  return {
    saida_em_jan_2029: txt(r.saida_na_virada), retorno_em_jan_2029: txt(r.retorno_na_virada), perda_em_jan_2029: txt(r.perda_na_virada),
    impacto_renda_mensal_2029: txt(r.impacto_renda_mensal as number), taxa_implicita_mensal_pct: pct(r.taxa_implicita_mensal!), leitura: r.leitura,
  }
}
contas['F7-RETORNO-INCERTO'] = (e) => {
  const r = avaliarDesejo(desejoDe(e), PADRAO)
  return { impacto_liquido_jan_2029: txt(r.perda_na_virada), impacto_renda_mensal_2029: txt(r.impacto_renda_mensal as number), retorno_mostrado_como: r.retorno_mostrado_como }
}
contas['F7-ANTECIPA'] = (e) => {
  const r = avaliarAntecipacao(c(e.recebe_hoje), M(e.mes), c(e.abre_mao_de), M(e.mes_original), PADRAO)
  return { desconto_implicito_mensal_pct: pct(r.desconto_mensal!), efeito_em_jan_2029: txt(r.efeito_na_virada), leitura: r.leitura }
}
contas['F8-TETO'] = (e) => {
  const t27 = reajustarTeto(c(e.teto_2026), P(e.ipca_2026_pct)); const t28 = reajustarTeto(t27, P(e.ipca_2027_pct)); const t29 = reajustarTeto(t28, P(e.ipca_2028_pct))
  // A projeção (tetoProjetado) tem que dar os mesmos números.
  const ipca = { 2026: P(e.ipca_2026_pct), 2027: P(e.ipca_2027_pct), 2028: P(e.ipca_2028_pct) }
  expect([tetoProjetado(c(e.teto_2026), '2026-11', '2027-01', 1, ipca), tetoProjetado(c(e.teto_2026), '2026-11', '2028-06', 1, ipca), tetoProjetado(c(e.teto_2026), '2026-11', '2029-01', 1, ipca)]).toEqual([t27, t28, t29])
  return { teto_2027: txt(t27), teto_2028: txt(t28), teto_2029: txt(t29) }
}
contas['F8-SEM-APROVACAO'] = (e) => {
  // Teto atual (30.000,00) é o teto_2026 do caso F8-TETO, que este caso continua.
  const v = tetoVigente(c('30000.00'), c(e.teto_2027_sugerido), [e.aprovou_romero, e.aprovou_andreza], null, '2027-01')
  return { teto_vigente_2027: txt(v.teto), situacao: v.situacao }
}
contas['F9-MES'] = (e) => {
  const r = ficaDevendo([{ mes: '2027-03', saldo_final: c(e.saldo_final_03_2027), piso: c(e.piso_caixa) }, { mes: '2027-04', saldo_final: c(e.saldo_final_04_2027), piso: c(e.piso_caixa) }])
  // O motor nunca entrega cor nem sinal: "sem vermelho" = valor sem sinal e nenhum campo de cor na saída.
  const semVermelho = r[0].fica_devendo > 0 && !Object.keys(r[0]).some((k) => /cor|vermelh/i.test(k))
  return { fica_devendo: txt(r[0].fica_devendo), data_para_quitar: r[0].devendo_ate ? MM(r[0].devendo_ate) : null, cor: semVermelho ? 'sem vermelho' : 'com sinal' }
}
contas['FGC-1'] = (e) => { const r = fgcConta(c(e.saldo_coberto), 1); return { garantido: txt(r.garantido_por_titular), fora_da_garantia: txt(r.fora), alerta: r.alerta } }
contas['FGC-CONJUNTA'] = (e) => { const r = fgcConta(c(e.saldo), e.titulares); return { garantido_por_titular: txt(r.garantido_por_titular), fora_da_garantia: txt(r.fora) } }

describe('Portão 3: 39 casos do ECONOMISTA, igualdade exata', () => {
  it('o arquivo tem 39 casos e cada um tem conta', () => {
    expect(casos.length).toBe(39)
    expect(casos.map((x) => x.id).filter((id) => !contas[id])).toEqual([])
    expect(new Set(casos.map((x) => x.id)).size).toBe(39)
  })
  for (const caso of casos) {
    it(caso.id, () => {
      const obtido = contas[caso.id](caso.entrada)
      for (const [k, esperado] of Object.entries(caso.saida_esperada)) {
        expect(obtido, `${caso.id}: falta a chave ${k}`).toHaveProperty(k)
        expect(obtido[k], `${caso.id}.${k}`).toEqual(esperado)
      }
    })
  }
})
