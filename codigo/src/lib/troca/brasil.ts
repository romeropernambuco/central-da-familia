// Comprar lá fora ou no Brasil? A venda do usado acontece nos dois casos, então fica de fora: compara-se só o que o
// aparelho novo custa em cada caminho. No Brasil dá para parcelar sem juros e deixar o dinheiro rendendo: cada parcela
// é trazida para o valor de hoje pela taxa que o dinheiro da família rende.
import { versaoDaTroca, type ContaDaTroca } from './conta'
import type { CompraFeita, Troca } from './tipos'

/** Taxa ao ano (em %) vira taxa ao mês (fração): (1 + ano)^(1/12) − 1. */
export const taxaDoMes = (anoPct: number) => Math.pow(1 + anoPct / 100, 1 / 12) - 1

/**
 * Quanto vale hoje uma compra parcelada sem juros. A primeira parcela vence em 1 mês, a última em `parcelas` meses.
 * À vista (1 parcela ou menos) vale o preço cheio.
 */
export function valorDeHoje(preco: number, parcelas: number, rendeAnoPct: number): number {
  const n = Math.trunc(parcelas)
  if (!(n > 1) || !(rendeAnoPct > 0)) return preco
  const mes = taxaDoMes(rendeAnoPct)
  // soma das parcelas descontadas, em fórmula fechada (não depende de quantas parcelas são)
  return ((preco / n) * (1 - Math.pow(1 + mes, -n))) / mes
}

/** Limite de parcelas que a tela e a leitura aceitam. */
export const PARCELAS_MAXIMO = 48

/**
 * Imposto de renda sobre o rendimento de aplicação de 181 a 360 dias (tabela regressiva). Serve só para sugerir uma
 * taxa já líquida a partir da taxa do Guardado; a pessoa pode trocar.
 */
export const IR_DO_RENDIMENTO_PCT = 20
export const taxaLiquida = (brutaPct: number) => Math.round(brutaPct * (100 - IR_DO_RENDIMENTO_PCT)) / 100

export interface ComparacaoComBrasil {
  /** O aparelho comprado lá fora: fatura menos reembolso e dinheiro de volta, mais o imposto quando ele está ligado. */
  fora: number
  /** Preço da loja no Brasil, à vista. */
  brasil: number
  /** O mesmo preço parcelado, em valor de hoje. */
  brasilParcelado: number
  /** Quanto se ganha por parcelar e deixar o dinheiro rendendo. */
  ganhoDeParcelar: number
  /** Qual caminho sai mais barato. */
  melhor: 'fora' | 'brasil'
  /** Quanto o melhor caminho economiza sobre o outro. Nunca negativo. */
  economia: number
}

/** Devolve null quando a versão escolhida não tem preço no Brasil. */
export function compararComBrasil(t: Troca, conta: ContaDaTroca): ComparacaoComBrasil | null {
  const brasil = versaoDaTroca(t)?.precoBrasil
  if (!t.brasil || !brasil || !(brasil > 0)) return null
  const fora = conta.aparelho + (t.comImposto ? conta.imposto : 0)
  const brasilParcelado = valorDeHoje(brasil, t.brasil.parcelas, t.brasil.rendeAnoPct)
  const diferenca = brasilParcelado - fora
  return {
    fora,
    brasil,
    brasilParcelado,
    ganhoDeParcelar: brasil - brasilParcelado,
    melhor: diferenca >= 0 ? 'fora' : 'brasil',
    economia: Math.abs(diferenca),
  }
}

/** Economia confirmada: o que a outra opção custaria menos o que foi pago. Negativa quando a escolha saiu mais cara. */
export const economiaConfirmada = (c: CompraFeita) => c.outraOpcao - c.pago

/** A confirmação já preenchida com o caminho mais barato; a pessoa só corrige o que foi diferente. */
export function compraSugerida(t: Troca, c: ComparacaoComBrasil, onde: 'fora' | 'brasil', hoje: string): CompraFeita {
  const cartao = t.pagamentos.find(p => p.id === t.pagamento)?.nome ?? ''
  const vezes = Math.trunc(t.brasil?.parcelas ?? 1) || 1
  const arred = (v: number) => Math.round(v * 100) / 100
  return onde === 'fora'
    ? { onde, forma: cartao, pago: arred(c.fora), outraOpcao: arred(c.brasilParcelado), data: hoje }
    : {
        onde,
        forma: vezes > 1 ? `${vezes}x sem juros` : 'à vista',
        pago: arred(c.brasilParcelado),
        outraOpcao: arred(c.fora),
        data: hoje,
      }
}
