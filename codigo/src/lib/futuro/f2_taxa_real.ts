// F2 Taxa real (Fisher, já líquida de IR). ECONOMISTA item 3, F2.
import { Dec, mensal, taxa, UM } from './decimal'
import type { Taxa } from './tipos'

/** Taxa líquida anual: bruta × (1 − aliquota). */
export function taxaLiquidaAnual(taxa_bruta_anual: Taxa | Dec, aliquota: Taxa | Dec): Dec {
  return taxa(taxa_bruta_anual).times(UM.minus(taxa(aliquota)))
}

/** real = (1 + bruta × (1 − aliquota)) ÷ (1 + ipca) − 1. O IR sai antes de Fisher. */
export function taxaRealAnual(taxa_bruta_anual: Taxa | Dec, aliquota: Taxa | Dec, ipca_anual: Taxa | Dec): Dec {
  const ipca = taxa(ipca_anual)
  if (ipca.lte(-1)) throw new Error('Inflação inválida')
  return UM.plus(taxaLiquidaAnual(taxa_bruta_anual, aliquota)).div(UM.plus(ipca)).minus(1)
}

/** Taxa real mensal: (1 + real_anual)^(1/12) − 1. */
export function taxaRealMensal(real_anual: Taxa | Dec): Dec { return mensal(real_anual) }

/** Quando a taxa real não é positiva, o rendimento não repõe a inflação: não existe patrimônio que baste. */
export function semValor(real_anual: Taxa | Dec): boolean { return taxa(real_anual).lte(0) }

/** Chave do alerta quando a taxa real não é positiva (a tela escreve: "Nesse cenário o rendimento não repõe a inflação"). */
export const ALERTA_SEM_VALOR = 'rendimento nao repoe a inflacao'
