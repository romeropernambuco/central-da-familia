// Como a tela da troca escreve moeda de fora, pontos e porcentagem. Tudo respeita o olho fechado.
import { NBSP, reais } from '../formato'
import { textoPrivado } from '../olho'
import type { Moeda } from './tipos'

const SIMBOLO: Record<Moeda, string> = { EUR: '€', USD: 'US$', GBP: '£', JPY: '¥', CHF: 'CHF', CAD: 'C$', AUD: 'A$' }
const NOME: Record<Moeda, string> = {
  EUR: 'euro',
  USD: 'dólar',
  GBP: 'libra',
  JPY: 'iene',
  CHF: 'franco suíço',
  CAD: 'dólar canadense',
  AUD: 'dólar australiano',
}
export const simboloDaMoeda = (m: Moeda) => SIMBOLO[m]
export const nomeDaMoeda = (m: Moeda) => NOME[m]

const casas = (n: number, quantas: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: quantas, maximumFractionDigits: quantas }).format(n)

/** "3.089,00 €". */
export const emMoeda = (v: number, m: Moeda) => textoPrivado(`${casas(v, 2)}${NBSP}${SIMBOLO[m]}`)
/** "16.391". */
export const inteiro = (n: number) => textoPrivado(casas(Math.round(n), 0))
/** "R$ 16.615,27", sempre com os centavos (a conta é conferida centavo a centavo). */
export const reaisComCentavos = (v: number) => textoPrivado(`R$${NBSP}${casas(v, 2)}`)
/** Reais sem centavos, para comparar formas de pagar. */
export const reaisRedondos = (v: number) => reais(Math.round(v))
/** "3,5" ou "120": sem zero sobrando. */
export const semZeros = (n: number, maximo = 6) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: maximo, useGrouping: false }).format(n)

/**
 * Texto de campo vira número. Vírgula é sempre a casa decimal ("6,4349"). Em câmbio e taxa, ponto também é casa decimal
 * ("6.434" é 6,434). Só campo de quantia (`aceitaMilhar`) lê "1.000" como mil. Vazio ou texto que não é número: null.
 */
export function lerDecimal(txt: string, aceitaMilhar = false): number | null {
  const t = txt.trim()
  const milhar = t.includes(',') || (aceitaMilhar && /^\d{1,3}(\.\d{3})+$/.test(t))
  const limpo = milhar ? t.replace(/\./g, '').replace(',', '.') : t
  if (!/^\d+(\.\d*)?$/.test(limpo)) return null
  const n = Number(limpo)
  return Number.isFinite(n) ? n : null
}

/** "24/11" a partir de AAAA-MM-DD. */
export const diaCurto = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '')
