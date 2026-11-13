// F7 Calculadora de Desejos (ECONOMISTA item 3, F7). O "cabe?" mora em index.ts (precisa da linha inteira).
import { centavos, compararMes, Dec, mesesEntre, potencia, UM } from './decimal'
import { perdaRendaMensal, valorNaVirada, type TaxasProjecao } from './f6_impacto'
import type { Centavos, Desejo, Mes, Taxa } from './tipos'

/** Taxa implícita mensal de quem tira V em d e recebe R em r: (R ÷ V)^(1/n) − 1, n = meses de d até r. */
export function taxaImplicitaMensal(V: Centavos, R: Centavos, n: number): Dec | null {
  if (V <= 0 || R <= 0 || !Number.isInteger(n) || n <= 0) return null
  return potencia(centavos(R).div(centavos(V)), UM.div(n)).minus(1)
}

export interface ResultadoDesejo {
  saida_na_virada: Centavos
  retorno_na_virada: Centavos /* 0 quando incerto: aparece fora da linha como "se vier" */
  perda_na_virada: Centavos /* negativo = o desejo devolve mais do que tirou */
  impacto_renda_mensal: Centavos | null
  taxa_implicita_mensal: Dec | null
  retorno_mostrado_como: 'na conta' | 'se vier' | 'sem retorno'
  leitura: 'ganha mais do que deixou de render' | 'tira da renda de 2029' | 'empata'
}

/** perda = F6(V, d) − F6(R, r) se certo; = F6(V, d) se incerto ou sem retorno. */
export function avaliarDesejo(d: Pick<Desejo, 'valor' | 'mes' | 'volta' | 'volta_mes' | 'volta_certa' | 'volta_de'>, t: TaxasProjecao & { taxa_real_trabalho: Taxa }): ResultadoDesejo {
  const temVolta = d.volta_de !== 'nada' && d.volta > 0 && d.volta_mes !== null
  const saida = valorNaVirada(d.valor, d.mes, t)
  const retorno = temVolta && d.volta_certa ? valorNaVirada(d.volta, d.volta_mes as Mes, t) : 0
  const perda = saida - retorno
  return {
    saida_na_virada: saida,
    retorno_na_virada: retorno,
    perda_na_virada: perda,
    impacto_renda_mensal: perdaRendaMensal(perda, t.taxa_real_trabalho),
    taxa_implicita_mensal: temVolta ? taxaImplicitaMensal(d.valor, d.volta, mesesEntre(d.mes, d.volta_mes as Mes)) : null,
    retorno_mostrado_como: !temVolta ? 'sem retorno' : d.volta_certa ? 'na conta' : 'se vier',
    leitura: perda < 0 ? 'ganha mais do que deixou de render' : perda > 0 ? 'tira da renda de 2029' : 'empata',
  }
}

/** Contrato antecipado: tira R do mês r e põe A no mês d. desconto_mensal = (R ÷ A)^(1/n) − 1.
 *  efeito = F6(A, d) − F6(R, r): negativo = antecipar custa mais do que o caixa rende. */
export function avaliarAntecipacao(A: Centavos, d: Mes, R: Centavos, r: Mes, t: TaxasProjecao & { taxa_real_trabalho: Taxa }): {
  desconto_mensal: Dec | null; efeito_na_virada: Centavos; impacto_renda_mensal: Centavos | null
  leitura: 'antecipar custa mais do que o caixa rende' | 'antecipar compensa'
} {
  const efeito = valorNaVirada(A, d, t) - valorNaVirada(R, r, t)
  return {
    desconto_mensal: taxaImplicitaMensal(A, R, mesesEntre(d, r)),
    efeito_na_virada: efeito,
    impacto_renda_mensal: perdaRendaMensal(efeito, t.taxa_real_trabalho),
    leitura: efeito < 0 ? 'antecipar custa mais do que o caixa rende' : 'antecipar compensa',
  }
}

/** O que o desejo faz na linha mês a mês. Saída de V em d (desvio); volta certa em volta_mes (retorno).
 *  Contrato antecipado: A entra em d (retorno) e R deixa de entrar em r (desvio). Volta incerta não entra. */
export function fluxosDoDesejo(d: Desejo): { desvios: { mes: Mes; valor: Centavos }[]; retornos: { mes: Mes; valor: Centavos }[] } {
  const desvios: { mes: Mes; valor: Centavos }[] = [{ mes: d.mes, valor: d.valor }]
  const retornos: { mes: Mes; valor: Centavos }[] = []
  if (d.volta_de === 'contrato' && d.antecipado !== null && d.volta_mes !== null) {
    retornos.push({ mes: d.mes, valor: d.antecipado })
    desvios.push({ mes: d.volta_mes, valor: d.volta })
  } else if (d.volta_de !== 'nada' && d.volta_certa && d.volta_mes !== null && d.volta > 0) {
    retornos.push({ mes: d.volta_mes, valor: d.volta })
  }
  return { desvios, retornos }
}

/** Ajuda pra ordenar meses (usado pela tela). */
export const antesDe = (a: Mes, b: Mes) => compararMes(a, b) < 0
