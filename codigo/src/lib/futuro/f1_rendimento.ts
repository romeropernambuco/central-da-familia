// F1 Rendimento líquido do mês, por aplicação (ECONOMISTA item 3, F1) + tabela de IR (item 2).
import { arred, centavos, Dec, diasCorridos, potencia, taxa, UM, ZERO } from './decimal'
import type { Aplicacao, Centavos, Mes, Taxa } from './tipos'
import { diasDoMes } from './decimal'

/** Tabela regressiva de IR da renda fixa (dias corridos). Isenta = 0. Lei, não parâmetro. */
export function aliquotaIR(dias: number, isenta = false): Dec {
  if (isenta) return ZERO
  if (!Number.isInteger(dias) || dias < 0) throw new Error(`Dias inválidos: ${dias}`)
  if (dias <= 180) return new Dec('0.225')
  if (dias <= 360) return new Dec('0.20')
  if (dias <= 720) return new Dec('0.175')
  return new Dec('0.15')
}

/** IR e líquido de um rendimento bruto já conhecido. */
export function irSobre(rendimento_bruto: Centavos, dias: number, isenta = false): { aliquota: Dec; ir: Centavos; liquido: Centavos } {
  const a = aliquotaIR(dias, isenta)
  const b = centavos(rendimento_bruto)
  return { aliquota: a, ir: arred(b.times(a)), liquido: arred(b.times(UM.minus(a))) }
}

/** Dias pra tabela de IR: data_resgate_prevista − data_aplicacao. */
export function diasIR(data_aplicacao: string, data_resgate: string): number {
  return diasCorridos(data_aplicacao, data_resgate)
}

/** Fator líquido do mês: (1 + taxa_bruta × (1 − aliquota))^(dias/365) − 1. Precisão cheia. */
export function fatorLiquido(taxa_bruta_anual: Taxa | Dec, aliquota: Taxa | Dec, dias: number): Dec {
  const liquida = taxa(taxa_bruta_anual).times(UM.minus(taxa(aliquota)))
  return potencia(UM.plus(liquida), new Dec(dias).div(365)).minus(1)
}

/** Rendimento líquido do mês em centavos. Saldo negativo ou zero não rende. */
export function rendimentoMes(saldo_inicial: Centavos, taxa_bruta_anual: Taxa | Dec, aliquota: Taxa | Dec, dias: number): Centavos {
  if (saldo_inicial <= 0) { centavos(saldo_inicial); return 0 }
  return arred(centavos(saldo_inicial).times(fatorLiquido(taxa_bruta_anual, aliquota, dias)))
}

/** Padrão do resgate quando a aplicação não tem data: último dia antes da virada. */
function resgatePadrao(virada: Mes): string { const [a] = virada.split('-'); return `${Number(a) - 1}-12-31` }

/** F1 aplicado a uma aplicação cadastrada no mês m. */
export function rendimentoAplicacao(ap: Aplicacao, m: Mes, virada: Mes): Centavos {
  const resgate = ap.resgate_previsto ?? resgatePadrao(virada)
  const al = aliquotaIR(diasIR(ap.aplicada_em, resgate), ap.isenta)
  return rendimentoMes(ap.saldo, ap.taxa_bruta_anual, al, diasDoMes(m))
}
