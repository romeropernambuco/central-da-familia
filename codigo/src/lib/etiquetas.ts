// Etiquetas de viagem e evento: as contas que não dependem de tela nem de banco.
// O envelope diz O QUE foi o gasto; a etiqueta diz POR QUE (ex.: "Europa nov/26").
// As contas daqui repetem as de produto.etiqueta_resumo e produto.etiqueta_simular, pra família de exemplo dar o mesmo número.

import { dataCurta } from './formato'

export const MAX_ETIQUETAS = 3

/** "10/11 a 30/11", ou "sem datas" pra etiqueta que só entra à mão. */
export const periodoDaEtiqueta = (e: { inicio: string | null; fim: string | null }) =>
  e.inicio && e.fim ? `${dataCurta(e.inicio)} a ${dataCurta(e.fim)}` : 'sem datas: entra à mão'

export interface PeriodoEtiqueta {
  id: string
  inicio: string | null
  fim: string | null
  moeda: string
  arquivada?: boolean
}
export interface GastoEtiquetado {
  valor: number
  data: string
  envelope: string
  moeda_original?: string | null
  valor_original?: number | null
}

const c2 = (v: number) => Math.round(v * 100) / 100
const dia = (d: string) => Date.parse(d + 'T12:00:00Z')
/** Dias do período, contando o primeiro e o último. Sem datas, não tem. */
export const diasDoPeriodo = (inicio: string | null, fim: string | null) =>
  inicio && fim ? Math.round((dia(fim) - dia(inicio)) / 86400000) + 1 : null

/** As etiquetas que entram sozinhas num gasto desta data: as que têm período e a data cai dentro. */
export const etiquetasDaData = <T extends PeriodoEtiqueta>(etiquetas: T[], data: string): T[] =>
  etiquetas
    .filter(e => !e.arquivada && !!e.inicio && !!e.fim && data >= e.inicio && data <= e.fim)
    .slice(0, MAX_ETIQUETAS)

/** O que falta fazer depois de salvar: tirar as automáticas que a pessoa desmarcou e colocar as que ela escolheu a mais. */
export function diferencaEtiquetas(automaticas: string[], escolhidas: string[]) {
  return {
    tirar: automaticas.filter(id => !escolhidas.includes(id)),
    colocar: escolhidas.filter(id => !automaticas.includes(id)),
  }
}

/** A moeda de fora das etiquetas escolhidas (a primeira que não for real), ou null. */
export const moedaDeFora = (etiquetas: { moeda: string }[]) => etiquetas.find(e => e.moeda !== 'BRL')?.moeda ?? null

const SIMBOLO: Record<string, string> = { EUR: '€', USD: 'US$', GBP: '£', BRL: 'R$' }
/** "€" para EUR; moeda sem símbolo conhecido aparece pela sigla. */
export const simboloMoeda = (moeda: string) => SIMBOLO[moeda] || moeda

/** Quantos reais custou cada unidade da moeda de fora (0 quando falta um dos lados). */
export const cambioDoGasto = (valorEmReais: number, valorOriginal: number) =>
  valorEmReais > 0 && valorOriginal > 0 ? Math.round((valorEmReais / valorOriginal) * 10000) / 10000 : 0

export interface ContaEtiqueta {
  dias: number | null
  pessoas: number | null
  lancamentos: number
  total: number
  antes: number
  durante: number
  depois: number
  por_dia: number | null
  por_pessoa_dia: number | null
  por_envelope: { envelope: string; total: number; pct: number }[]
  por_moeda: { moeda: string; valor_original: number; valor_brl: number; cambio_medio: number }[]
  por_data: { data: string; total: number; lancamentos: number }[]
}

function agrupar<T>(itens: T[], chave: (x: T) => string) {
  const m = new Map<string, T[]>()
  for (const x of itens) m.set(chave(x), [...(m.get(chave(x)) || []), x])
  return [...m]
}
const soma = (itens: GastoEtiquetado[]) => c2(itens.reduce((s, x) => s + x.valor, 0))

/** Total da etiqueta e os recortes: pago antes, durante, por dia, por pessoa por dia, por envelope, por moeda e por data. */
export function resumirEtiqueta(
  e: { inicio: string | null; fim: string | null },
  gastos: GastoEtiquetado[],
  pessoas: number | null,
): ContaEtiqueta {
  const dias = diasDoPeriodo(e.inicio, e.fim)
  const total = soma(gastos)
  const antes = soma(gastos.filter(g => !!e.inicio && g.data < e.inicio))
  const depois = soma(gastos.filter(g => !!e.fim && g.data > e.fim))
  const durante = c2(total - antes - depois)
  return {
    dias,
    pessoas,
    lancamentos: gastos.length,
    total,
    antes,
    durante,
    depois,
    por_dia: dias ? c2(durante / dias) : null,
    por_pessoa_dia: dias && pessoas ? c2(durante / dias / pessoas) : null,
    por_envelope: agrupar(gastos, g => g.envelope)
      .map(([envelope, gs]) => ({
        envelope,
        total: soma(gs),
        pct: total ? Math.round((1000 * soma(gs)) / total) / 10 : 0,
      }))
      .sort((a, b) => b.total - a.total),
    por_moeda: agrupar(gastos, g => g.moeda_original || 'BRL')
      .map(([moeda, gs]) => {
        const original = c2(gs.reduce((s, g) => s + (g.valor_original ?? g.valor), 0))
        return { moeda, valor_original: original, valor_brl: soma(gs), cambio_medio: cambioDoGasto(soma(gs), original) }
      })
      .sort((a, b) => b.valor_brl - a.valor_brl),
    por_data: agrupar(gastos, g => g.data)
      .map(([data, gs]) => ({ data, total: soma(gs), lancamentos: gs.length }))
      .sort((a, b) => a.data.localeCompare(b.data)),
  }
}

export interface ContaSimulacao {
  dias: number
  pessoas: number
  gasto_durante: number
  pago_antes_referencia: number
  total_estimado: number
}
/** Outra viagem com o gasto real desta: por pessoa por dia × pessoas × dias, mais o "pago antes" na proporção das pessoas. */
export function simularEtiqueta(
  base: Pick<ContaEtiqueta, 'por_pessoa_dia' | 'pessoas' | 'antes'>,
  dias: number,
  pessoas?: number | null,
): ContaSimulacao {
  const gente = pessoas ?? base.pessoas
  if (!Number.isInteger(dias) || dias < 1 || dias > 366) throw new Error('Os dias vão de 1 a 366.')
  if (!gente || !Number.isInteger(gente) || gente < 1 || gente > 50) throw new Error('As pessoas vão de 1 a 50.')
  if (base.por_pessoa_dia == null)
    throw new Error('Para simular, a etiqueta precisa de datas e de gastos durante a viagem.')
  const gasto_durante = c2(base.por_pessoa_dia * gente * dias)
  const pago_antes_referencia = base.pessoas ? c2((base.antes * gente) / base.pessoas) : 0
  return {
    dias,
    pessoas: gente,
    gasto_durante,
    pago_antes_referencia,
    total_estimado: c2(gasto_durante + pago_antes_referencia),
  }
}

/** Confere o que a pessoa digitou na folha de criar etiqueta; devolve a frase do erro ou ''. */
export function erroDaEtiqueta(e: { nome: string; inicio: string; fim: string; moeda: string; pessoas: string }) {
  const nome = e.nome.trim()
  if (!nome || nome.length > 60) return 'Dê um nome de até 60 letras. Ex.: Europa nov/26.'
  if (!!e.inicio !== !!e.fim) return 'Informe o início e o fim juntos, ou deixe os 2 em branco.'
  if (e.inicio && e.fim && e.fim < e.inicio) return 'O fim não pode ser antes do início.'
  if (e.inicio && e.fim && (diasDoPeriodo(e.inicio, e.fim) || 0) > 367)
    return 'O período passou de 1 ano. Confira as datas.'
  if (!/^[A-Za-z]{3}$/.test(e.moeda.trim())) return 'A moeda tem 3 letras, como EUR, USD ou BRL.'
  if (e.pessoas.trim() && !(/^\d+$/.test(e.pessoas.trim()) && +e.pessoas >= 1 && +e.pessoas <= 50))
    return 'As pessoas vão de 1 a 50. Em branco, conta quem é da família.'
  return ''
}
