// F9 Quando a linha mostra falta (ECONOMISTA item 3, F9). Nunca vermelho, nunca sinal: "fica devendo".
import { arred, centavos, compararMes, Dec, potencia, taxa, UM } from './decimal'
import { taxaRealMensal } from './f2_taxa_real'
import type { Centavos, Desejo, Mes, Taxa } from './tipos'

export interface MesDoPiso { mes: Mes; saldo_final: Centavos; piso: Centavos }

/** Mês abaixo do piso: fica_devendo = piso − saldo_final; devendo_ate = 1º mês seguinte em que
 *  saldo_final − fica_devendo ≥ piso (do mês). null se não quita dentro da linha. */
export function ficaDevendo(meses: MesDoPiso[]): { mes: Mes; fica_devendo: Centavos; devendo_ate: Mes | null }[] {
  const ord = [...meses].sort((a, b) => compararMes(a.mes, b.mes))
  return ord.map((x, i) => {
    if (x.saldo_final >= x.piso) return { mes: x.mes, fica_devendo: 0, devendo_ate: null }
    const dev = x.piso - x.saldo_final
    let ate: Mes | null = null
    for (let j = i + 1; j < ord.length; j++) if (ord[j].saldo_final - dev >= ord[j].piso) { ate = ord[j].mes; break }
    return { mes: x.mes, fica_devendo: dev, devendo_ate: ate }
  })
}

/** (a) guardar por mês: P = F × i ÷ ((1 + i)^n − 1), i = taxa líquida mensal. Sem juros (i = 0): F ÷ n. */
export function guardarPorMes(falta: Centavos, meses: number, taxa_liquida_mensal: Taxa | Dec): Centavos {
  const F = centavos(falta)
  if (falta <= 0) return 0
  if (!Number.isInteger(meses) || meses <= 0) return falta
  const i = taxa(taxa_liquida_mensal)
  if (i.isZero()) return arred(F.div(meses))
  return arred(F.times(i).div(potencia(UM.plus(i), meses).minus(1)))
}

/** (a) com os fatores mês a mês da linha (F4), depósito no fim de cada mês (revisão do ECONOMISTA, caso N1):
 *  P = F ÷ S, S = soma, pra cada mês k, do produto de (1 + fator_m) dos meses depois de k. Sem meses: F de uma vez. */
export function guardarPorMesNaLinha(falta: Centavos, fatores: Dec[]): Centavos {
  const F = centavos(falta)
  if (falta <= 0) return 0
  if (fatores.length === 0) return falta
  let S = new Dec(0)
  let acumulado = UM // produto de (1 + fator) dos meses depois do mês k, de trás pra frente
  for (let k = fatores.length - 1; k >= 0; k--) {
    S = S.plus(acumulado)
    acumulado = acumulado.times(UM.plus(fatores[k]))
  }
  return arred(F.div(S))
}

/** (b) reduzir o gasto de 2029 em F × taxa_real_mensal. */
export function cortarPorMes2029(falta: Centavos, taxa_real_anual: Taxa | Dec): Centavos {
  if (falta <= 0 || taxa(taxa_real_anual).lte(0)) { centavos(falta); return 0 }
  return arred(centavos(falta).times(taxaRealMensal(taxa_real_anual)))
}

/** (c) desejos pra adiar ou cortar, do maior pro menor (empate: ordem do cadastro). */
export function desejosPraAdiar(desejos: Desejo[]): string[] {
  return desejos.map((d, i) => ({ d, i })).sort((a, b) => b.d.valor - a.d.valor || a.i - b.i).map((x) => x.d.id)
}
