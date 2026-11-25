// "Trocar lá fora": comprar um aparelho novo no exterior e vender o usado no Brasil.
// Cada comparação guarda tudo o que a conta usa (preço, câmbio, formas de pagar, regras e fontes),
// então a mesma tela serve para celular, drone ou qualquer outro aparelho.

/** Moedas que o Banco Central cota todo dia (boletim PTAX). */
export const MOEDAS = ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'] as const
export type Moeda = (typeof MOEDAS)[number]

/** Uma versão do aparelho novo (256 GB, 1 TB, kit com mais baterias...). */
export interface VersaoTroca {
  rotulo: string
  /** Preço cheio na loja, na moeda de lá, com o imposto de lá dentro. */
  preco: number
  /** Quanto do preço volta no reembolso do turista (tax free), em %. Zero quando o país não devolve. */
  reembolsoPct: number
}

/** Uma forma de pagar a compra lá fora. */
export interface PagamentoTroca {
  id: string
  nome: string
  /** Linha curta embaixo do nome ("Spread zero · IOF 3,5%"). */
  nota: string
  /** cartao: câmbio de referência + spread + IOF. conta: usa o câmbio já fechado da conta em moeda. referencia: só para comparar. */
  tipo: 'cartao' | 'conta' | 'referencia'
  spreadPct: number
  iofPct: number
  pontosPorDolar: number
  cashbackPct: number
  /** O spread deste cartão não é oficial: a tela deixa mudar e mostra o aviso abaixo. */
  spreadIncerto?: string
}

export interface LinkTroca {
  rotulo: string
  link: string
}

/** Um anúncio do usado, para saber por quanto vender. */
export interface ReferenciaTroca {
  local: string
  detalhe: string
  preco: number
  link: string
}

export interface PassoTroca {
  texto: string
  link?: LinkTroca
}

export interface RegraTroca {
  titulo: string
  texto: string
  fontes: LinkTroca[]
}

/** Textos de apoio que mudam de uma comparação para outra. Todos opcionais. */
export interface TextosTroca {
  /** Nome do grupo de versões ("Armazenamento do Duo"). */
  versoes?: string
  /** Marca do meio da régua de venda ("Contar com R$ 8.000"). */
  vendaMeio?: string
  milhas?: string
  conta?: string
  pagamentos?: string
  detalhe?: string
  contaComprar?: string
  venda?: string
  vendaRodape?: string
  cambio?: string
  aduana?: string
  valorAduana?: string
  fontesRodape?: string
}

export interface Troca {
  id: string
  /** O aparelho novo. */
  nome: string
  /** O aparelho que sai. */
  usado: string
  /** Onde compra e onde vende ("Madrid", "Recife"). */
  de: string
  para: string
  moeda: Moeda
  versoes: VersaoTroca[]
  /** Posição da versão escolhida em `versoes`. */
  versao: number
  /** Imposto de lá embutido no preço (IVA), em %. O reembolso nunca passa dele. */
  ivaPct: number
  /** Reembolso digitado à mão, na moeda de lá. Vazio (null) usa o % da versão. */
  reembolso: number | null
  venda: number
  vendaMin: number
  vendaMax: number
  /** Por quanto anunciar o usado. Zero quando ainda não há sugestão. */
  anunciar: number
  /** Reais por 1 unidade da moeda, sem taxas. */
  cambio: number
  /** Dia da cotação (AAAA-MM-DD) ou vazio. */
  cambioData: string
  /** Reais por unidade devolvida no reembolso. Vazio (null) usa o câmbio de referência. */
  cambioReembolso: number | null
  /** Dólares por unidade da moeda, para contar os pontos do cartão. */
  dolarPontos: number
  /** Dólares por unidade da moeda, para a cota da alfândega. */
  dolarFiscal: number
  /** Reais por unidade da moeda, para o imposto da alfândega. */
  cambioFiscal: number
  /** Cota de isenção que ainda está livre, em dólares. */
  cota: number
  /** Valor do aparelho para a alfândega, na moeda de lá. Vazio (null) usa o preço cheio. */
  valorAduana: number | null
  comImposto: boolean
  pagamentos: PagamentoTroca[]
  /** id da forma de pagar escolhida. */
  pagamento: string
  /** Bônus na transferência dos pontos para o programa de milhas, em %. */
  bonusPct: number
  /** Preço de mil pontos do programa, em reais. Só dá preço às milhas: não entra na conta. */
  milheiro: number
  /** Nome do programa de milhas ("Azul"). */
  programa: string
  /** Reais por unidade da moeda na conta em moeda de lá, com spread e IOF dentro. */
  contaCambio: number
  /** Quanto comprar de moeda na conta. */
  contaComprar: number
  textos: TextosTroca
  referencias: ReferenciaTroca[]
  passos: PassoTroca[]
  frase: { rotulo: string; idioma: string; texto: string } | null
  regras: RegraTroca[]
  fontes: LinkTroca[]
}
