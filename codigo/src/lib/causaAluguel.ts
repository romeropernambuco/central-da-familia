// A causa do aluguel (pedido do dono, 22/11/2026): "o sistema tem que ter inteligência de falar: você tem que receber
// isso, porque na regra tal; tenho que atualizar o que a gente vai pedir na causa e a expectativa do que se conseguiria".
// O app monta o pedido mês a mês (cada mês sem pagar entra sozinho), diz a regra de cada parte, separa o que é da família
// do que é do advogado e guarda a expectativa. Não é parecer jurídico: o texto manda conferir com quem cuida do caso.
// Tudo em reais.
import { mesMais, semReceberNoMes, vencimento, type CadernoImovel } from './aluguel'

export interface CausaAluguel {
  /** multa do contrato sobre o atrasado (o comum é 10%) */
  multa_pct: number
  /** juros por mês do contrato (o comum é 1%) */
  juros_pct: number
  /** honorários pedidos na causa: Lei 8.245/91, art. 62, 10% se o contrato não disser outro valor */
  honorarios_pct: number
  /** condomínio, IPTU e contas que o inquilino devia pagar e não pagou, por mês */
  encargos_mes: number
  /** o que já voltou da dívida ("Recebi da dívida") */
  recuperado: number
  /** quanto a família acha que consegue do que é dela (0 a 100); null = ainda não perguntou ao advogado */
  expectativa_pct: number | null
  /** o que a família paga ao advogado sobre o que recuperar (0 a 100); null = não combinado */
  advogado_pct: number | null
  /** o último dia em que a família passou o pedido ao advogado, e o valor daquele dia */
  passado_em: string | null
  pedido_passado: number | null
}

export const CAUSA_PADRAO: CausaAluguel = {
  multa_pct: 10,
  juros_pct: 1,
  honorarios_pct: 10,
  encargos_mes: 0,
  recuperado: 0,
  expectativa_pct: null,
  advogado_pct: null,
  passado_em: null,
  pedido_passado: null,
}

export interface ContaDaCausa {
  meses: { mes: string; vence: string; valor: number }[]
  alugueis: number
  encargos: number
  multa: number
  juros: number
  /** honorários pedidos na causa: são do advogado (Lei 8.906/94, art. 23) */
  honorarios: number
  /** o pedido inteiro, já sem o que voltou */
  pedido: number
  /** o que é da família no pedido: aluguéis, encargos, multa e juros, menos o que já voltou */
  daFamilia: number
  expectativa: { bruta: number; advogado: number; liquida: number } | null
  /** o pedido subiu desde a última vez que a família passou ao advogado (ou nunca passou) */
  atualizar: boolean
  subiu: number
}

const c2 = (v: number) => Math.round(v * 100) / 100
const num = (v: unknown, min: number, max: number, padrao: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : padrao
const dia = (d: string) => Date.parse(d + 'T12:00:00Z') / 86400000

/** O que veio do banco: só passa número dentro da faixa; o resto volta para o padrão. */
export function lerCausa(v: unknown): CausaAluguel | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const c = v as Partial<CausaAluguel>
  const pct = (x: unknown) => {
    const r = num(x, 0, 100, NaN)
    return Number.isNaN(r) ? null : r
  }
  return {
    multa_pct: num(c.multa_pct, 0, 100, CAUSA_PADRAO.multa_pct),
    juros_pct: num(c.juros_pct, 0, 10, CAUSA_PADRAO.juros_pct),
    honorarios_pct: num(c.honorarios_pct, 0, 30, CAUSA_PADRAO.honorarios_pct),
    encargos_mes: num(c.encargos_mes, 0, 1e7, 0),
    recuperado: num(c.recuperado, 0, 1e9, 0),
    expectativa_pct: pct(c.expectativa_pct),
    advogado_pct: pct(c.advogado_pct),
    passado_em: typeof c.passado_em === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.passado_em) ? c.passado_em : null,
    pedido_passado: typeof c.pedido_passado === 'number' && c.pedido_passado >= 0 ? c.pedido_passado : null,
  }
}

/** O pedido de hoje: cada mês sem receber que já venceu entra com aluguel, encargos, multa e juros. */
export function contaDaCausa(
  c: CadernoImovel,
  aluguel: number,
  causa: CausaAluguel,
  hoje: string,
): ContaDaCausa | null {
  const p = c.problema
  if (!p || p.etapa === 'vazio' || p.etapa === 'reforma') return null
  const meses: ContaDaCausa['meses'] = []
  for (let m = p.desde; m <= hoje.slice(0, 7); m = mesMais(m, 1)) {
    const vence = vencimento(m, c.dia_vencimento)
    if (vence >= hoje || !semReceberNoMes(c, m) || c.recebimentos.some(r => r.mes === m)) continue
    meses.push({ mes: m, vence, valor: c2(aluguel + causa.encargos_mes) })
  }
  const alugueis = c2(aluguel * meses.length)
  const encargos = c2(causa.encargos_mes * meses.length)
  const multa = c2(((alugueis + encargos) * causa.multa_pct) / 100)
  const juros = c2(
    meses.reduce((s, x) => s + (x.valor * causa.juros_pct * Math.max(0, dia(hoje) - dia(x.vence))) / 100 / 30, 0),
  )
  const sub = alugueis + encargos + multa + juros
  const honorarios = c2((sub * causa.honorarios_pct) / 100)
  const pedido = c2(Math.max(0, sub + honorarios - causa.recuperado))
  const daFamilia = c2(Math.max(0, sub - causa.recuperado))
  const expectativa =
    causa.expectativa_pct === null
      ? null
      : (() => {
          const bruta = c2((daFamilia * causa.expectativa_pct) / 100)
          const advogado = c2((bruta * (causa.advogado_pct || 0)) / 100)
          return { bruta, advogado, liquida: c2(bruta - advogado) }
        })()
  const subiu = causa.pedido_passado === null ? pedido : c2(pedido - causa.pedido_passado)
  const atualizar =
    pedido > 0 && (causa.passado_em === null || (causa.passado_em.slice(0, 7) < hoje.slice(0, 7) && subiu > 0))
  return { meses, alugueis, encargos, multa, juros, honorarios, pedido, daFamilia, expectativa, atualizar, subiu }
}

const brl = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** As regras, uma por parte do pedido. Texto simples; termina mandando conferir com o advogado. */
export function regrasDaCausa(k: ContaDaCausa, causa: CausaAluguel): string[] {
  const n = k.meses.length
  return [
    `Aluguéis atrasados: ${n === 1 ? '1 mês' : `${n} meses`}, ${brl(k.alugueis)}. Quem não paga deve todo aluguel que vencer até sair do imóvel (Lei do Inquilinato, Lei 8.245/91, art. 62). Cada mês que passa entra no pedido sozinho.`,
    ...(k.encargos > 0
      ? [`Condomínio, IPTU e contas que eram dele: ${brl(k.encargos)} (os "acessórios da locação", art. 62).`]
      : []),
    `Multa de ${causa.multa_pct}% (${brl(k.multa)}) e juros de ${causa.juros_pct}% ao mês (${brl(k.juros)}): valem se estiverem no contrato de aluguel; confira a cláusula.`,
    'Correção monetária pelo índice do contrato (IGP-M ou IPCA): o advogado calcula; não está nesta conta.',
    `Honorários de ${causa.honorarios_pct}% (${brl(k.honorarios)}): a lei do inquilinato fixa 10% se o contrato não disser outro valor; na sentença o juiz fixa de 10% a 20% (Código de Processo Civil, art. 85). Esse dinheiro é do advogado, não da família (Estatuto da Advocacia, Lei 8.906/94, art. 23), salvo se o contrato com ele disser outra coisa.`,
    'O que você paga ao seu advogado (o contrato com ele): a justiça às vezes manda o inquilino devolver (Código Civil, arts. 389 e 404), mas os tribunais divergem. Pergunte ao advogado se vale pedir.',
    'O app não é advogado: leve estes números para quem cuida do caso conferir.',
  ]
}
