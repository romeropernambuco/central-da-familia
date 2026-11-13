// F6 Impacto de um desvio de R$ X no mês d (ECONOMISTA item 3, F6).
// valor_em_virada: começa em X e, a cada mês de d+1 até o mês antes da virada, soma arred(valor × fator_m).
import { anoDe, arred, centavos, compararMes, Dec, diasDoMes, listaMeses, mesAnterior, proximoMes, taxa } from './decimal'
import { fatorLiquido } from './f1_rendimento'
import { rendaSustentavel } from './f3_necessario'
import type { Centavos, Mes, Taxa } from './tipos'

export interface TaxasProjecao { taxa_bruta_ano: Record<number, Taxa>; aliq_proj: Taxa; virada: Mes }

/** Quanto o dinheiro que saiu no mês d valeria na virada se tivesse ficado no caixa. Negativo vale também (é simétrico). */
export function valorNaVirada(valor: Centavos, d: Mes, t: TaxasProjecao): Centavos {
  let x = valor
  centavos(x)
  const ultimo = mesAnterior(t.virada)
  if (compararMes(d, ultimo) >= 0) return x
  for (const m of listaMeses(proximoMes(d), ultimo)) {
    const tb = t.taxa_bruta_ano[anoDe(m)]
    if (tb === undefined) throw new Error(`Falta a taxa bruta de ${anoDe(m)}`)
    x = x + arred(centavos(x).times(fatorLiquido(tb, t.aliq_proj, diasDoMes(m))))
  }
  return x
}

/** perda_renda_mensal = arred(valor_na_virada × taxa_real_mensal_trabalho). null quando a taxa real ≤ 0. */
export function perdaRendaMensal(valor_na_virada: Centavos, taxa_real_trabalho: Taxa | Dec): Centavos | null {
  if (taxa(taxa_real_trabalho).lte(0)) return null
  if (valor_na_virada < 0) return -rendaSustentavel(-valor_na_virada, taxa_real_trabalho)
  return rendaSustentavel(valor_na_virada, taxa_real_trabalho)
}

export function impactoDesvio(valor: Centavos, d: Mes, t: TaxasProjecao & { taxa_real_trabalho: Taxa }): { valor_na_virada: Centavos; perda_renda_mensal: Centavos | null } {
  const v = valorNaVirada(valor, d, t)
  return { valor_na_virada: v, perda_renda_mensal: perdaRendaMensal(v, t.taxa_real_trabalho) }
}
