// Câmbio do dia pelo boletim PTAX do Banco Central (público, sem chave).
// Fim de semana e feriado não têm boletim: a busca olha os últimos 10 dias e fica com o mais recente.
import { MOEDAS, type Moeda } from './tipos'

export interface CotacaoMoeda {
  moeda: Moeda
  /** Reais por 1 unidade da moeda (venda). */
  reais: number
  /** Dólares por 1 unidade da moeda. */
  dolares: number
  /** Dia do boletim, AAAA-MM-DD. */
  data: string
}

const BASE = 'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/'
const FILTRO = '&$top=1&$orderby=dataHoraCotacao%20desc&$format=json'

/** O Banco Central pede a data como MM-DD-AAAA. */
const dataPtax = (iso: string) => `${iso.slice(5, 7)}-${iso.slice(8, 10)}-${iso.slice(0, 4)}`

function diasAntes(iso: string, dias: number): string {
  const d = new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)) - dias))
  return d.toISOString().slice(0, 10)
}

export const ehMoeda = (x: unknown): x is Moeda => MOEDAS.includes(x as Moeda)

/** Endereço do boletim mais recente da moeda, até o dia `hoje` (AAAA-MM-DD). */
export function enderecoPtax(moeda: Moeda, hoje: string): string {
  const periodo = `@dataInicial='${dataPtax(diasAntes(hoje, 10))}'&@dataFinalCotacao='${dataPtax(hoje)}'`
  if (moeda === 'USD')
    return `${BASE}CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?${periodo}${FILTRO}`
  return (
    `${BASE}CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)` +
    `?@moeda='${moeda}'&${periodo}${FILTRO}`
  )
}

/** Tira do boletim o valor de venda e o dia. Resposta fora do formato devolve null. */
export function lerPtax(resposta: unknown): { reais: number; data: string } | null {
  const linhas = (resposta as { value?: unknown } | null)?.value
  const linha = Array.isArray(linhas) ? (linhas[0] as Record<string, unknown> | undefined) : undefined
  const reais = Number(linha?.cotacaoVenda)
  const data = typeof linha?.dataHoraCotacao === 'string' ? linha.dataHoraCotacao.slice(0, 10) : ''
  return reais > 0 && Number.isFinite(reais) && /^\d{4}-\d{2}-\d{2}$/.test(data) ? { reais, data } : null
}

/** Junta o boletim da moeda com o do dólar. Para o dólar, os dois são o mesmo. */
export function montarCotacao(
  moeda: Moeda,
  daMoeda: { reais: number; data: string },
  doDolar: { reais: number },
): CotacaoMoeda {
  // 6 casas: o iene vale centésimos de real, e com 4 casas o erro chegava a 1%
  const casas = (n: number) => Math.round(n * 1e6) / 1e6
  return { moeda, reais: casas(daMoeda.reais), dolares: casas(daMoeda.reais / doDolar.reais), data: daMoeda.data }
}
