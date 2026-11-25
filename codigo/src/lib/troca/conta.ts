// A conta da troca. Função pura: recebe a comparação e devolve cada número que a tela mostra.
// Segue a mesma ordem do painel original: paga o preço cheio no caixa; reembolso, venda e dinheiro de volta
// entram depois; milhas nunca entram na conta.
import type { PagamentoTroca, Troca } from './tipos'

/** Parte da diferença do usado que a alfândega cobra sobre o que passa da cota (Receita Federal: 50%). */
export const IMPOSTO_ACIMA_DA_COTA = 0.5

const c2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100

export interface CustoPagamento {
  id: string
  /** Preço ao câmbio de referência, sem taxa nenhuma. */
  puro: number
  /** O que chega na fatura (ou sai da conta em moeda). */
  fatura: number
  /** Spread e IOF somados. */
  taxas: number
  /** Pontos no programa de milhas, já com o bônus. */
  pontos: number
  /** Dinheiro de volta. */
  cashback: number
  /** Quanto as milhas valem, só como referência. */
  milhasValem: number
  /** Fatura menos o dinheiro de volta: é por aqui que se compara. */
  liquido: number
}

export function custoDoPagamento(p: PagamentoTroca, t: Troca, preco: number): CustoPagamento {
  const puro = preco * t.cambio
  const comSpread = puro * (1 + p.spreadPct / 100)
  const fatura = p.tipo === 'conta' ? preco * t.contaCambio : comSpread * (1 + p.iofPct / 100)
  const pontos = p.pontosPorDolar ? preco * t.dolarPontos * p.pontosPorDolar * (1 + t.bonusPct / 100) : 0
  const cashback = p.cashbackPct ? (comSpread * p.cashbackPct) / 100 : 0
  return {
    id: p.id,
    puro,
    fatura,
    taxas: fatura - puro,
    pontos,
    cashback,
    milhasValem: (pontos * t.milheiro) / 1000,
    liquido: fatura - cashback,
  }
}

export interface ContaDaTroca {
  preco: number
  /** Reembolso pela tabela do país, na moeda de lá. */
  reembolsoTabela: number
  /** Reembolso usado na conta (o digitado ou o da tabela). */
  reembolso: number
  reembolsoReais: number
  custos: CustoPagamento[]
  /** Formas de pagar de verdade, da mais barata para a mais cara. A de referência fica de fora. */
  ordem: CustoPagamento[]
  escolhido: CustoPagamento
  /** O aparelho novo depois do reembolso e do dinheiro de volta. */
  aparelho: number
  /** Sai do bolso: aparelho menos a venda do usado. */
  bolso: number
  imposto: number
  total: number
  /** O número grande: com ou sem o imposto do Brasil. */
  custo: number
  /** Fatias da barra, em % (somam 100). */
  barra: { venda: number; bolso: number; imposto: number }
  contaReais: number
  /** Quanto sobra na conta em moeda depois de pagar. Negativo: quanto falta. */
  contaSobra: number
}

export function versaoDaTroca(t: Troca) {
  return t.versoes[t.versao] ?? t.versoes[0]
}

/** O reembolso nunca passa do imposto embutido no preço. */
export const tetoDoReembolso = (preco: number, ivaPct: number) => c2((preco * ivaPct) / (100 + ivaPct))

/** Diz o que impede a conta. Vazio quando está tudo certo. */
export function erroDaTroca(t: Troca): string {
  const v = versaoDaTroca(t)
  if (!v) return 'Esta comparação ficou sem o preço do aparelho novo.'
  const positivos = [t.cambio, t.dolarPontos, t.dolarFiscal, t.cambioFiscal, t.contaCambio, t.cambioReembolso ?? 1]
  const naoNegativos = [v.preco, t.venda, t.cota, t.bonusPct, t.milheiro, t.contaComprar, t.reembolso ?? 0]
  const numeros = [...positivos, ...naoNegativos, t.valorAduana ?? 0, ...t.pagamentos.map(p => p.spreadPct)]
  const certo =
    numeros.every(Number.isFinite) &&
    positivos.every(n => n > 0) &&
    naoNegativos.every(n => n >= 0) &&
    (t.reembolso ?? 0) <= tetoDoReembolso(v.preco, t.ivaPct)
  return certo
    ? ''
    : 'Confira os valores. O reembolso tem que caber no imposto da compra e os câmbios têm que ser positivos.'
}

/** Mais barata primeiro; no empate em dinheiro, ganha a que dá mais milhas. */
const maisBarata = (a: CustoPagamento, b: CustoPagamento) => a.liquido - b.liquido || b.milhasValem - a.milhasValem

/** A conta inteira. Devolve null quando `erroDaTroca` aponta problema. */
export function contaDaTroca(t: Troca): ContaDaTroca | null {
  if (erroDaTroca(t)) return null
  const preco = versaoDaTroca(t).preco
  const reembolsoTabela = c2((preco * versaoDaTroca(t).reembolsoPct) / 100)
  const reembolso = t.reembolso ?? reembolsoTabela
  const custos = t.pagamentos.map(p => custoDoPagamento(p, t, preco))
  const reais = t.pagamentos.filter(p => p.tipo !== 'referencia').map(p => p.id)
  const ordem = custos.filter(c => reais.includes(c.id)).sort(maisBarata)
  const escolhido = custos.find(c => c.id === t.pagamento) ?? ordem[0] ?? custos[0]
  if (!escolhido) return null
  const reembolsoReais = reembolso * (t.cambioReembolso ?? t.cambio)
  const aparelho = escolhido.fatura - reembolsoReais - escolhido.cashback
  const bolso = aparelho - t.venda
  const acimaDaCota = Math.max(0, (t.valorAduana ?? preco) - t.cota / t.dolarFiscal)
  const imposto = acimaDaCota * IMPOSTO_ACIMA_DA_COTA * t.cambioFiscal
  const total = bolso + imposto
  const fatias = [Math.max(0, t.venda), Math.max(0, bolso), t.comImposto ? imposto : 0]
  const soma = fatias[0] + fatias[1] + fatias[2] || 1
  const contaReais = t.contaComprar * t.contaCambio
  return {
    preco,
    reembolsoTabela,
    reembolso,
    reembolsoReais,
    custos,
    ordem,
    escolhido,
    aparelho,
    bolso,
    imposto,
    total,
    custo: t.comImposto ? total : bolso,
    barra: { venda: (fatias[0] / soma) * 100, bolso: (fatias[1] / soma) * 100, imposto: (fatias[2] / soma) * 100 },
    contaReais,
    contaSobra: t.contaComprar - preco,
  }
}

export interface Veredito {
  /** Uma ou mais formas de pagar empatadas no primeiro lugar (diferença menor que R$ 1). */
  melhores: CustoPagamento[]
  /** A primeira que perde, e por quanto. */
  seguinte: { custo: CustoPagamento; diferenca: number } | null
  /** Quanto a conta em moeda de lá sai mais cara que a melhor. */
  contaAMais: number | null
}

export function vereditoDaTroca(conta: ContaDaTroca, t: Troca): Veredito | null {
  const melhor = conta.ordem[0]
  if (!melhor) return null
  const perde = conta.ordem.find(c => c.liquido - melhor.liquido >= 1)
  const daConta = t.pagamentos.find(p => p.tipo === 'conta')
  const custoDaConta = daConta && conta.custos.find(c => c.id === daConta.id)
  return {
    melhores: conta.ordem.filter(c => c.liquido - melhor.liquido < 1),
    seguinte: perde ? { custo: perde, diferenca: perde.liquido - melhor.liquido } : null,
    contaAMais: custoDaConta ? custoDaConta.liquido - melhor.liquido : null,
  }
}
