// A separação do dinheiro (regra do dono, 22/11/2026): salário e aluguel pagam o mês; o que o guardado rende é o lucro
// da gordura; a gordura (o guardado de hoje) não se come. "O aplicativo precisa entender essa separação para poder falar:
// você está gastando até tanto, não pode gastar isso, ou você está no limite." Dinheiro posto na empresa sai daqui (é
// gasto anotado), nunca da gordura. Tudo em reais.

/** O salário cadastrado em Planejamento → Rendas (por mês). Extra fica de fora; a que muda todo mês conta pelo mês fraco. */
export function rendaDoMesCadastrada(rendas: unknown): number {
  if (!Array.isArray(rendas)) return 0
  let soma = 0
  for (const r of rendas as { valor?: unknown; tipo?: unknown; fraco?: unknown }[]) {
    if (!r || typeof r !== 'object' || r.tipo === 'extra') continue
    const v = Number(r.tipo === 'variavel' ? r.fraco || r.valor : r.valor)
    if (Number.isFinite(v) && v > 0) soma += v
  }
  return Math.round(soma * 100) / 100
}

/**
 * O que saiu no mês, com a compra parcelada contando só a parcela do mês (simulação de 22/11: a viagem de R$ 24 mil em
 * 10x entrava inteira no mês da compra e dizia "passou, sai da gordura"; nos meses seguintes, as parcelas sumiam).
 * Aproximação: a parcela cai no mês da compra e nos seguintes (a fatura pode virar um mês depois).
 */
export function gastoDoMes(
  lancamentos: readonly {
    data: string
    valor: number
    parcelas?: number | null
    parcela?: unknown
    apagado_em?: unknown
  }[],
  mes: string,
  hoje: string,
): number {
  const idx = (m: string) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7))
  let soma = 0
  const vistos = new Set<unknown>()
  for (const l of lancamentos) {
    if (!l || l.parcela || l.apagado_em || typeof l.data !== 'string' || l.data > hoje || vistos.has(l)) continue
    vistos.add(l)
    const n = Number.isInteger(l.parcelas) && (l.parcelas as number) > 1 ? (l.parcelas as number) : 1
    const k = idx(mes) - idx(l.data.slice(0, 7))
    if (k >= 0 && k < n) soma += (Number(l.valor) || 0) / n
  }
  return Math.round(soma * 100) / 100
}

export type SituacaoDoMes = 'folga' | 'limite' | 'passou'
export interface SeparacaoDoMes {
  /** o que entra no mês: o que já entrou e o que está previsto como certo; se o salário cadastrado for maior, ele */
  entra: number
  /** o lucro da gordura no mês (o que o guardado rende, sem imposto) */
  lucro: number
  /** separado para a viagem neste mês (sai do que pode gastar) */
  reservado: number
  /** até quanto dá para gastar no mês sem tocar na gordura */
  pode: number
  gasto: number
  /** pode − gasto: positivo = ainda dá; negativo = quanto saiu da gordura */
  folga: number
  situacao: SituacaoDoMes
}

/** No limite a partir de 85% do que pode. */
export const LIMITE = 0.85
const c2 = (v: number) => Math.round(v * 100) / 100

/**
 * O salário conta mesmo antes de cair ("cai sempre"); o resto do que entrou (aluguel, dívida recuperada, dinheiro avulso)
 * soma por cima, para não sumir enquanto o salário não chega. `extras` = a parte do "entrou" que não é salário.
 */
export function separarDoMes(x: {
  entrou: number
  previsto: number
  rendaCadastrada: number
  lucro: number
  gasto: number
  extras?: number
  /** o que o plano já prometeu neste mês e ainda não virou gasto (parcela da viagem não comprada, cofrinho) */
  reservado?: number
  /** o imposto do aluguel que entrou (o aluguel conta líquido, como no plano) */
  imposto?: number
}): SeparacaoDoMes | null {
  const extras = Math.min(Math.max(0, x.extras || 0), Math.max(0, x.entrou))
  const imposto = Math.min(Math.max(0, x.imposto || 0), extras)
  const entra = c2(extras - imposto + Math.max(x.entrou - extras + x.previsto, x.rendaCadastrada))
  const lucro = c2(Math.max(0, x.lucro))
  const reservado = c2(Math.max(0, x.reservado || 0))
  const pode = c2(entra + lucro - reservado)
  if (!(pode > 0)) return null
  const gasto = c2(Math.max(0, x.gasto))
  const folga = c2(pode - gasto)
  const situacao: SituacaoDoMes = folga < 0 ? 'passou' : gasto >= pode * LIMITE ? 'limite' : 'folga'
  return { entra, lucro, reservado, pode, gasto, folga, situacao }
}

const brl = (v: number) => 'R$ ' + Math.round(Math.abs(v)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })

/** O que o app fala (regra do dono: claro e curto; os três números já estão na tela). */
export function fraseDaSeparacao(s: SeparacaoDoMes): { titulo: string; frase: string } {
  const reserva = s.reservado > 0 ? `, menos ${brl(s.reservado)} separados para a viagem` : ''
  const base = `Dá para gastar até ${brl(s.pode)} sem tocar na gordura: ${brl(s.entra)} que entram e ${brl(s.lucro)} do salário da gordura${reserva}.`
  if (s.situacao === 'passou')
    return { titulo: `Passou ${brl(s.folga)}: esse pedaço sai da gordura`, frase: `${base} Segure até o mês virar.` }
  if (s.situacao === 'limite')
    return {
      titulo: `No limite: faltam ${brl(s.folga)}`,
      frase: `${base} Daqui para a frente, só o essencial. Dinheiro para a empresa também sai daqui.`,
    }
  return { titulo: `Ainda dá ${brl(s.folga)} este mês`, frase: `${base} O que sobrar engorda o guardado.` }
}
