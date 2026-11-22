// O salário da gordura (22/11/2026). O dono não tinha regra e pediu a do mentor e do planejador: "deixe lá com base na
// recomendação; se o cara quiser mudar, ele muda; e embaixo mostre o impacto". A regra recomendada (fundações como Yale e
// Harvard e family offices, com o percentual ajustado pela simulação com CDI e IPCA de 2000 a 2026):
// - o salário do ano é um percentual do guardado, pago em 12 meses iguais e fixo por 12 meses (não pula com a Selic);
// - uma vez por ano ele é revisto pelo guardado de hoje (sobe quando o guardado cresce; a simulação mostrou que o limite
//   de 10% por revisão não muda nada com renda fixa e só atrapalharia quando a família guarda ou tira muito de uma vez);
// - o que o guardado rende a mais que o salário fica nele: cobre a inflação e é a reserva para os anos de juro baixo.
// Tudo em reais.
import { IMPACTO_HISTORICO, PCT_RECOMENDADO, type ImpactoHistorico } from './salarioDaGorduraImpacto'

export { IMPACTO_HISTORICO, PCT_RECOMENDADO, type ImpactoHistorico }

/** IPCA esperado quando o Focus não chegou: Focus de 13/11/2026 para 2027 (5,00%). */
export const IPCA_PADRAO = 0.05
/** Os percentuais que a família pode escolher (os que a simulação mediu). */
export const PERCENTUAIS = IMPACTO_HISTORICO.map(i => i.pct)

/** Guardado na config 'salario_gordura'. */
export interface RegraSalario {
  /** % ao ano do guardado */
  pct: number
  /** 'AAAA-MM' do mês em que o salário foi calculado; vale 12 meses */
  desde: string
  /** o salário de cada mês até a revisão */
  salario_mes: number
  /** o guardado usado na conta */
  base: number
  /** true = a família escolheu o percentual; false = é o recomendado */
  escolhido: boolean
}

const c2 = (v: number) => Math.round(v * 100) / 100
const MES = /^\d{4}-(0[1-9]|1[0-2])$/

/** 'AAAA-MM' + n meses. */
export function mesMais(m: string, n: number): string {
  const i = Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1 + n
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`
}

/** Lê a config; qualquer coisa estragada vira null (o app recalcula pela recomendação). */
export function lerRegra(v: unknown): RegraSalario | null {
  if (!v || typeof v !== 'object') return null
  const r = v as Record<string, unknown>
  const pct = Number(r.pct),
    salario_mes = Number(r.salario_mes),
    base = Number(r.base)
  if (!PERCENTUAIS.includes(pct) || typeof r.desde !== 'string' || !MES.test(r.desde)) return null
  if (!(salario_mes >= 0) || !(base >= 0)) return null
  return { pct, desde: r.desde, salario_mes, base, escolhido: r.escolhido === true }
}

/** O salário de um mês para um guardado e um percentual ao ano. */
export function salarioPelo(guardado: number, pct: number): number {
  return guardado > 0 ? c2((guardado * pct) / 100 / 12) : 0
}

/** Uma regra nova, calculada hoje (a primeira vez, na revisão do ano, ou quando a família muda o percentual). */
export function regraNova(guardado: number, pct: number, mesHoje: string, escolhido: boolean): RegraSalario {
  return { pct, desde: mesHoje, salario_mes: salarioPelo(guardado, pct), base: c2(guardado), escolhido }
}

/** O mês da próxima revisão. */
export const proximaRevisao = (r: RegraSalario) => mesMais(r.desde, 12)

/** A revisão do ano: o mesmo percentual, sobre o guardado de hoje. */
export function revisar(r: RegraSalario, guardado: number, mesHoje: string): RegraSalario {
  return regraNova(guardado, r.pct, mesHoje, r.escolhido)
}

/**
 * A regra que vale hoje e se ela precisa ser gravada: sem regra, a recomendada; com 12 meses passados, a revisada.
 * Sem guardado: null.
 */
export function regraDeHoje(
  guardada: RegraSalario | null,
  guardado: number,
  mesHoje: string,
): { regra: RegraSalario; gravar: boolean } | null {
  if (!(guardado > 0)) return guardada ? { regra: guardada, gravar: false } : null
  if (!guardada) return { regra: regraNova(guardado, PCT_RECOMENDADO, mesHoje, false), gravar: true }
  if (mesHoje >= proximaRevisao(guardada)) return { regra: revisar(guardada, guardado, mesHoje), gravar: true }
  return { regra: guardada, gravar: false }
}

/** Quanto a inflação de um ano come de um valor em um mês. */
export function inflacaoDoMes(valor: number, ipcaAnual: number): number {
  if (!(valor > 0) || !Number.isFinite(ipcaAnual) || ipcaAnual <= 0) return 0
  return c2(valor * (Math.pow(1 + ipcaAnual, 1 / 12) - 1))
}

export interface MesDoSalario {
  /** o que o guardado rende no mês, já sem o imposto */
  rende: number
  /** quanto a inflação do mês come do valor do guardado */
  inflacao: number
  salario: number
  /** rende − salário − inflação: positivo = o guardado cresce de verdade; negativo = perde valor neste mês */
  cresce: number
}

/** O mês de hoje com o salário fixo. */
export function mesDoSalario(rende: number, guardado: number, ipcaAnual: number, salario: number): MesDoSalario {
  const inflacao = inflacaoDoMes(guardado, ipcaAnual)
  return { rende: c2(rende), inflacao, salario: c2(salario), cresce: c2(rende - salario - inflacao) }
}

/**
 * O IPCA dos próximos 12 meses pelo Focus: o do ano de hoje até junho, o do ano que vem de julho em diante (é o ano em
 * que cai a maior parte dos próximos 12 meses). Sem o ano, o mais perto; sem Focus, o padrão.
 */
export function ipcaDosProximos12Meses(
  focus: readonly { ano: number; ipca: string }[] | null | undefined,
  hoje: string,
): { ipca: number; doFocus: boolean } {
  const alvo = Number(hoje.slice(0, 4)) + (Number(hoje.slice(5, 7)) >= 7 ? 1 : 0)
  const validos = (focus || [])
    .map(f => ({ ano: Number(f.ano), ipca: Number(f.ipca) }))
    .filter(f => Number.isFinite(f.ano) && Number.isFinite(f.ipca) && f.ipca > 0 && f.ipca < 1)
  if (!validos.length) return { ipca: IPCA_PADRAO, doFocus: false }
  const perto = validos.reduce((a, b) => (Math.abs(b.ano - alvo) < Math.abs(a.ano - alvo) ? b : a))
  return { ipca: perto.ipca, doFocus: true }
}

const brl = (v: number) => 'R$ ' + Math.round(Math.abs(v)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
const mmaa = (m: string) => `${m.slice(5, 7)}/${m.slice(0, 4)}`
export const pctTexto = (p: number) => p.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

/**
 * O que o app fala no Guardado (regra do dono: claro para a família e curto): o número, uma linha com até quando e de
 * onde ele vem, e o "por quê" para quem abrir.
 */
export function fraseDoSalario(r: RegraSalario, m: MesDoSalario): { titulo: string; linha: string; porque: string } {
  const titulo = `Salário da gordura: ${brl(r.salario_mes)} por mês`
  const linha = `Fixo até ${mmaa(proximaRevisao(r))} · ${pctTexto(r.pct)}% ao ano do guardado (${r.escolhido ? 'escolha da família' : 'recomendado'})`
  const base = 'É o que dá para gastar do guardado sem ele perder valor.'
  const porque =
    m.cresce >= 0
      ? `${base} Este mês ele rende ${brl(m.rende)}, a inflação come ${brl(m.inflacao)} e sobram ${brl(m.cresce)} de reserva para quando os juros caírem.`
      : `${base} Este mês ele rende ${brl(m.rende)}, menos que o salário e a inflação juntos: o salário continua e o guardado perde ${brl(m.cresce)} de valor.`
  return { titulo, linha, porque }
}

/** A frase do impacto de um percentual, pela história de 2000 a 2026. */
export function fraseDoImpacto(i: ImpactoHistorico, guardado: number): string {
  const pior =
    i.pior20 >= 99.5
      ? 'nunca ficou valendo menos que hoje'
      : `ficou, no pior caso, valendo ${pctTexto(i.pior20)}% do que vale hoje (no meio dos casos, ${pctTexto(i.meio20)}%)`
  return `Com ${pctTexto(i.pct)}% ao ano, o salário começa em ${brl(salarioPelo(guardado, i.pct))} por mês. Com os juros e a inflação de verdade de 2000 a 2026, depois de 20 anos o guardado ${pior}.`
}
