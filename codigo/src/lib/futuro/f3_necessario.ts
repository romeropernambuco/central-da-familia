// F3 Patrimônio necessário na virada (ECONOMISTA item 3, F3).
import { anoDe, arred, centavos, compararMes, Dec, listaMeses, mesAnterior, potencia, proximoMes, taxa, UM } from './decimal'
import { semValor, taxaRealMensal } from './f2_taxa_real'
import type { Centavos, Mes, Taxa } from './tipos'

/** Fator de inflação: produto de (1 + ipca_ano)^(1/12) de cada mês depois do mês-base até o mês antes da virada.
 *  Agrupado por ano: (1 + ipca)^(k/12), k = meses daquele ano (mesmo número, sem erro acumulado). */
export function fatorInflacao(mes_base: Mes, virada: Mes, ipca_ano: Record<number, Taxa>): Dec {
  const ultimo = mesAnterior(virada)
  if (compararMes(mes_base, ultimo) >= 0) return UM
  const porAno = new Map<number, number>()
  for (const m of listaMeses(proximoMes(mes_base), ultimo)) porAno.set(anoDe(m), (porAno.get(anoDe(m)) ?? 0) + 1)
  let f = UM
  for (const [ano, k] of porAno) {
    const i = ipca_ano[ano]
    if (i === undefined) throw new Error(`Falta o IPCA de ${ano}`)
    f = f.times(potencia(UM.plus(taxa(i)), new Dec(k).div(12)))
  }
  return f
}

/** Gasto mensal levado do mês-base à virada: arred(gasto_hoje × fator). */
export function gastoNaVirada(gasto_hoje: Centavos, mes_base: Mes, virada: Mes, ipca_ano: Record<number, Taxa>): Centavos {
  return arred(centavos(gasto_hoje).times(fatorInflacao(mes_base, virada, ipca_ano)))
}

/** patrimonio = a_cobrir × (1 + margem) ÷ taxa_real_mensal. null quando a taxa real ≤ 0 (nunca divide por zero). */
export function patrimonioNecessario(a_cobrir: Centavos, margem: Taxa | Dec, taxa_real_anual: Taxa | Dec): Centavos | null {
  if (semValor(taxa_real_anual)) return null
  if (a_cobrir <= 0) { centavos(a_cobrir); return 0 }
  return arred(centavos(a_cobrir).times(UM.plus(taxa(margem))).div(taxaRealMensal(taxa_real_anual)))
}

/** renda_sustentavel_mensal = patrimonio × taxa_real_mensal. Zero se taxa real ≤ 0 ou patrimônio ≤ 0. */
export function rendaSustentavel(patrimonio: Centavos, taxa_real_anual: Taxa | Dec): Centavos {
  if (semValor(taxa_real_anual) || patrimonio <= 0) { centavos(patrimonio); return 0 }
  return arred(centavos(patrimonio).times(taxaRealMensal(taxa_real_anual)))
}
