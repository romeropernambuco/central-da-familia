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
    const v = Number(r.tipo === 'variavel' ? r.fraco : r.valor)
    if (Number.isFinite(v) && v > 0) soma += v
  }
  return Math.round(soma * 100) / 100
}

export type SituacaoDoMes = 'folga' | 'limite' | 'passou'
export interface SeparacaoDoMes {
  /** o que entra no mês: o que já entrou e o que está previsto como certo; se o salário cadastrado for maior, ele */
  entra: number
  /** o lucro da gordura no mês (o que o guardado rende, sem imposto) */
  lucro: number
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
}): SeparacaoDoMes | null {
  const extras = Math.min(Math.max(0, x.extras || 0), Math.max(0, x.entrou))
  const entra = c2(extras + Math.max(x.entrou - extras + x.previsto, x.rendaCadastrada))
  const lucro = c2(Math.max(0, x.lucro))
  const pode = c2(entra + lucro)
  if (!(pode > 0)) return null
  const gasto = c2(Math.max(0, x.gasto))
  const folga = c2(pode - gasto)
  const situacao: SituacaoDoMes = folga < 0 ? 'passou' : gasto >= pode * LIMITE ? 'limite' : 'folga'
  return { entra, lucro, pode, gasto, folga, situacao }
}

const brl = (v: number) => 'R$ ' + Math.round(Math.abs(v)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })

/** O que o app fala, em português simples. */
export function fraseDaSeparacao(s: SeparacaoDoMes): { titulo: string; frase: string } {
  const base = `Neste mês dá para gastar até ${brl(s.pode)} sem tocar na gordura: ${brl(s.entra)} que entram (salário, aluguel e o que chegou) e ${brl(s.lucro)} que o guardado rende. Já foram ${brl(s.gasto)}.`
  if (s.situacao === 'passou')
    return {
      titulo: `Passou ${brl(s.folga)}: esse pedaço sai da gordura`,
      frase: `${base} O que passou come o guardado de hoje. Segure os gastos até o mês virar.`,
    }
  if (s.situacao === 'limite')
    return {
      titulo: `No limite: faltam ${brl(s.folga)}`,
      frase: `${base} Daqui para a frente, só o essencial. Dinheiro para a empresa também sai daqui, não da gordura.`,
    }
  return {
    titulo: `Ainda dá ${brl(s.folga)} este mês`,
    frase: `${base} O que sobrar engorda o guardado.`,
  }
}
