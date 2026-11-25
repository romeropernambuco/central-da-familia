// Comparação nova a partir de poucas respostas: o que compra, o que vende, onde, por quanto.
// O resto (formas de pagar, regras, passos) entra com padrões que a pessoa ajusta na tela.
import { CONTA_GLOBAL_TOTAL_PCT, IOF_EXTERIOR_PCT, SPREAD_CARTAO_PCT } from '../guiaViagemPadroes'
import type { CotacaoMoeda } from './cambio'
import type { Moeda, PagamentoTroca, RegraTroca, Troca } from './tipos'

export interface PaisDaCompra {
  id: string
  nome: string
  moeda: Moeda
  /** Imposto de lá embutido no preço, em %. */
  ivaPct: number
  /** Quanto costuma voltar de fato no tax free, em % do preço pago. Estimativa: confira na loja. */
  reembolsoPct: number
  fonte?: string
}

const GLOBAL_BLUE = 'https://www.globalblue.com/en/shoppers/how-to-shop-tax-free/destinations/'
/** Imposto e mínimo: página de cada país na Global Blue. O % que volta é estimativa de mercado, não oficial. */
export const PAISES: readonly PaisDaCompra[] = [
  { id: 'es', nome: 'Espanha', moeda: 'EUR', ivaPct: 21, reembolsoPct: 14.5, fonte: GLOBAL_BLUE + 'spain' },
  { id: 'pt', nome: 'Portugal', moeda: 'EUR', ivaPct: 23, reembolsoPct: 15, fonte: GLOBAL_BLUE + 'portugal' },
  { id: 'fr', nome: 'França', moeda: 'EUR', ivaPct: 20, reembolsoPct: 12, fonte: GLOBAL_BLUE + 'france' },
  { id: 'it', nome: 'Itália', moeda: 'EUR', ivaPct: 22, reembolsoPct: 14, fonte: GLOBAL_BLUE + 'italy' },
  { id: 'de', nome: 'Alemanha', moeda: 'EUR', ivaPct: 19, reembolsoPct: 12, fonte: GLOBAL_BLUE + 'germany' },
  { id: 'jp', nome: 'Japão', moeda: 'JPY', ivaPct: 10, reembolsoPct: 8, fonte: GLOBAL_BLUE + 'japan' },
  // Estados Unidos e Reino Unido não devolvem imposto a turista (fora casos locais): entra zero.
  { id: 'us', nome: 'Estados Unidos', moeda: 'USD', ivaPct: 0, reembolsoPct: 0 },
  { id: 'uk', nome: 'Reino Unido', moeda: 'GBP', ivaPct: 20, reembolsoPct: 0 },
]

const RECEITA =
  'https://www.gov.br/receitafederal/pt-br/assuntos/aduana-e-comercio-exterior/viagens-internacionais/guia-do-viajante/'

export const REGRA_DA_COTA: RegraTroca = {
  titulo: 'Alfândega na volta',
  texto:
    'Por avião, cada viajante traz até US$ 1.000 em compras sem imposto. O que passar paga 50%. ' +
    'Aparelho novo comprado na viagem entra nessa cota quando a pessoa já saiu do Brasil com outro.',
  fontes: [
    {
      rotulo: 'Receita Federal: cota',
      link: RECEITA + 'entrada-no-brasil/cota-de-isencao-duty-free-e-bagagem-tributavel',
    },
    { rotulo: 'Receita Federal: perguntas', link: RECEITA + 'perguntas-e-respostas' },
  ],
}

export function pagamentosPadrao(): PagamentoTroca[] {
  const spread = String(SPREAD_CARTAO_PCT).replace('.', ',')
  const iof = String(IOF_EXTERIOR_PCT).replace('.', ',')
  return [
    {
      id: 'cartao',
      nome: 'Cartão de crédito',
      nota: `Spread ${spread}% · IOF ${iof}% · ajuste para o seu cartão`,
      tipo: 'cartao',
      spreadPct: SPREAD_CARTAO_PCT,
      iofPct: IOF_EXTERIOR_PCT,
      pontosPorDolar: 0,
      cashbackPct: 0,
      spreadIncerto: 'Cada banco cobra um spread. Confira o do seu cartão no aplicativo.',
    },
    {
      id: 'conta',
      nome: 'Conta em moeda de lá',
      nota: 'Câmbio da conta, com tudo dentro',
      tipo: 'conta',
      spreadPct: 0,
      iofPct: 0,
      pontosPorDolar: 0,
      cashbackPct: 0,
    },
    {
      id: 'ref',
      nome: 'Câmbio de referência',
      nota: 'Sem taxas · só para comparar',
      tipo: 'referencia',
      spreadPct: 0,
      iofPct: 0,
      pontosPorDolar: 0,
      cashbackPct: 0,
    },
  ]
}

export interface RespostasDaNova {
  id: string
  nome: string
  usado: string
  pais: PaisDaCompra
  preco: number
  venda: number
  cotacao: CotacaoMoeda
  /** Formas de pagar de uma comparação anterior: os cartões da família não precisam ser digitados de novo. */
  pagamentos?: PagamentoTroca[]
}

const arredonda = (v: number, passo: number) => Math.round(v / passo) * passo

export function trocaNova(r: RespostasDaNova): Troca {
  const pagamentos = r.pagamentos?.length ? r.pagamentos : pagamentosPadrao()
  const { pais, cotacao } = r
  const temReembolso = pais.reembolsoPct > 0
  return {
    id: r.id,
    nome: r.nome,
    usado: r.usado,
    de: pais.nome,
    para: 'Brasil',
    moeda: pais.moeda,
    versoes: [{ rotulo: 'Preço da loja', preco: r.preco, reembolsoPct: pais.reembolsoPct }],
    versao: 0,
    ivaPct: pais.ivaPct,
    reembolso: null,
    venda: r.venda,
    vendaMin: arredonda(r.venda * 0.8, 50),
    vendaMax: arredonda(r.venda * 1.2, 50),
    anunciar: 0,
    cambio: cotacao.reais,
    cambioData: cotacao.data,
    cambioReembolso: null,
    dolarPontos: cotacao.dolares,
    dolarFiscal: cotacao.dolares,
    cambioFiscal: cotacao.reais,
    cota: 1000,
    valorAduana: null,
    comImposto: true,
    pagamentos,
    pagamento: pagamentos[0].id,
    bonusPct: 0,
    milheiro: 0,
    programa: '',
    contaCambio: Math.round(cotacao.reais * (1 + CONTA_GLOBAL_TOTAL_PCT / 100) * 10000) / 10000,
    contaComprar: Math.ceil(r.preco / 50) * 50,
    textos: {
      venda: 'Preço pedido em anúncio não é preço de venda fechada. Conte com um pouco menos.',
      ...(temReembolso
        ? {
            fontesRodape: `O reembolso de ${pais.nome} é estimativa de mercado. O valor certo sai no formulário da loja.`,
          }
        : {}),
    },
    referencias: [],
    passos: temReembolso
      ? [
          { texto: 'Na loja, leve o passaporte e peça o formulário de tax free junto com a nota.' },
          { texto: 'Aparelho novo sem uso, na bagagem de mão.' },
          { texto: 'Valide o formulário na alfândega do último aeroporto antes de sair do país.' },
        ]
      : [],
    frase: null,
    regras: [REGRA_DA_COTA],
    fontes: pais.fonte ? [{ rotulo: `Tax free: ${pais.nome}`, link: pais.fonte }] : [],
  }
}

/** Endereços de busca do usado, prontos, para a pessoa ver os anúncios de hoje. */
export function buscasDoUsado(usado: string): { rotulo: string; link: string }[] {
  const q = usado.trim()
  if (!q) return []
  return [
    { rotulo: 'Ver anúncios na OLX', link: 'https://www.olx.com.br/brasil?q=' + encodeURIComponent(q) },
    {
      rotulo: 'Ver no Mercado Livre',
      link: 'https://lista.mercadolivre.com.br/' + encodeURIComponent(q.replace(/\s+/g, '-') + '-usado'),
    },
  ]
}
