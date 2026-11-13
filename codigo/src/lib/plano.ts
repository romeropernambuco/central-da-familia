// A conta do envelope "por dia", igual à do banco (porte de produto._plano e _diario), mais as respostas que a
// Andreza pediu: até domingo, ritmo do mês, valor de amanhã. Sem tela e sem rede: dá pra testar sozinho.
import { centavos, diasNoMes, segundaDaSemana, somaDias } from './formato'
import { FERIADOS } from './guardado'

export const PESO_FDS = 1.5

/** Fim de semana, feriado, 24/12 e 31/12 valem 1,5 dia (produto._peso). */
export function pesoDia(iso: string, pesoFds = PESO_FDS): number {
  const dow = new Date(iso + 'T12:00:00Z').getUTCDay()
  const md = iso.slice(5)
  return dow === 0 || dow === 6 || FERIADOS[iso] || md === '12-24' || md === '12-31' || md === '11-15' ? Math.max(pesoFds, 1) : 1
}

export interface Plano {
  valor_dia: number; gasto_hoje: number; pode_hoje: number
  /** saldo do mês na manhã de hoje */
  saldo_hoje: number
  /** saldo depois do gasto de hoje (negativo = passou) */
  ate_fim_mes: number
  /** valor do dia de amanhã se nada mais for gasto hoje; null no último dia do mês */
  amanha: number | null
  ate_domingo: number
  /** soma dos pesos de hoje até o fim do mês */
  pesos_restantes: number
}

/**
 * produto._plano: pote do mês dividido pelos dias que faltam, pesando fim de semana e feriado.
 * Dia que passou do valor leva o excesso pros dias seguintes; dia que gastou menos devolve a sobra.
 */
export function plano(pote: number, porDia: Record<string, number>, hoje: string, pesoFds = PESO_FDS): Plano {
  const mes = hoje.slice(0, 7), n = diasNoMes(hoje)
  const dias = Array.from({ length: n }, (_, k) => `${mes}-${String(k + 1).padStart(2, '0')}`)
  const pesos = dias.map(d => pesoDia(d, pesoFds))
  const soma = (de: number, ate: number) => pesos.slice(de, ate + 1).reduce((s, x) => s + x, 0)
  let antes = 0, valor_dia = 0, gasto_hoje = 0, saldo_hoje = 0, gastoAteHoje = 0
  const ih = dias.indexOf(hoje)
  for (let i = 0; i < n; i++) {
    const wrem = soma(i, n - 1)
    const saldo = pote - antes
    const pode = saldo <= 0 ? 0 : (saldo * pesos[i]) / wrem
    const g = porDia[dias[i]] || 0
    if (i === ih) { valor_dia = centavos(pode); gasto_hoje = g; saldo_hoje = centavos(saldo) }
    if (i < ih) antes += g
    else if (i === ih) antes += Math.max(g, pode)
    else antes += pode
    if (i <= ih) gastoAteHoje += g
  }
  const pode_hoje = Math.max(0, centavos(valor_dia - gasto_hoje))
  const resto = pote - gastoAteHoje
  const amanha = ih < n - 1 ? centavos(resto <= 0 ? 0 : (resto * pesos[ih + 1]) / soma(ih + 1, n - 1)) : null
  // até domingo: o que sobra de hoje + o plano dos próximos dias até domingo
  const dom = Math.min(n - 1, ih + ((7 - new Date(hoje + 'T12:00:00Z').getUTCDay()) % 7))
  const depoisDeHoje = Math.max(0, resto - pode_hoje)
  const ate_domingo = dom > ih ? centavos(pode_hoje + (depoisDeHoje * soma(ih + 1, dom)) / soma(ih + 1, n - 1)) : pode_hoje
  return { valor_dia, gasto_hoje, pode_hoje, saldo_hoje, ate_fim_mes: centavos(saldo_hoje - gasto_hoje), amanha, ate_domingo, pesos_restantes: soma(ih, n - 1) }
}

/**
 * "Se continuar assim, você fecha em R$ X de R$ Y". Conta: gasto do dia a dia até hoje ÷ dias passados × dias do mês,
 * mais 1 vez só as parcelas e compras grandes de 1 vez (`pontual`): elas não se repetem, então não viram ritmo (rodada 2).
 */
export function projecao(gastoMes: number, limite: number, hoje: string, pontual = 0): { fecha: number; dentro: boolean; passa: number; deveria: number } {
  const d = Number(hoje.slice(8)), n = diasNoMes(hoje)
  const p = Math.min(Math.max(0, pontual), gastoMes)
  const fecha = centavos(p + ((gastoMes - p) / d) * n)
  return { fecha, dentro: fecha <= limite + 0.005, passa: centavos(Math.max(0, fecha - limite)), deveria: centavos((limite / n) * d) }
}

/** Gasto desde segunda (até hoje). */
export function gastoSemana(porDia: Record<string, number>, hoje: string): number {
  let s = 0
  for (let d = segundaDaSemana(hoje); d <= hoje; d = somaDias(d, 1)) s += porDia[d] || 0
  return centavos(s)
}

/** Divide a compra em N parcelas iguais (a 1ª leva os centavos que sobram), como o simulador do cartão. */
export function parcelasDe(valor: number, n: number): number[] {
  const k = Math.max(1, Math.min(12, Math.floor(n || 1)))
  const total = Math.round(valor * 100), base = Math.floor(total / k), sobra = total - base * k
  return Array.from({ length: k }, (_, i) => (base + (i === 0 ? sobra : 0)) / 100)
}

/** Mês (AAAA-MM) somado de i meses. */
export function mesMais(mes: string, i: number): string {
  const [a, m] = mes.split('-').map(Number)
  const t = a * 12 + (m - 1) + i
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`
}

/**
 * O que conta no mês, com parcela no mês de cada fatura (decisão 3 do RANKING): a 1ª parcela conta no dia da compra,
 * cada parcela seguinte sai do mês dela (o mês já nasce menor, como conta que volta).
 */
export function gastosDoMes(lancs: { data: string; valor: number; parcelas?: number }[], mes: string): { porDia: Record<string, number>; parcelas: number } {
  const porDia: Record<string, number> = {}
  let parcelas = 0
  for (const l of lancs) {
    const ps = parcelasDe(l.valor, l.parcelas || 1)
    const m0 = l.data.slice(0, 7)
    ps.forEach((v, i) => {
      if (mesMais(m0, i) !== mes) return
      if (i === 0) porDia[l.data] = centavos((porDia[l.data] || 0) + v)
      else parcelas = centavos(parcelas + v)
    })
  }
  return { porDia, parcelas }
}

/** Cofrinho que bate com o mês (R8): soma (valor do dia de base − gasto) dos dias fechados anotados, sem o "max 0" por dia. */
export function cofrinhoDoMes(porDia: Record<string, number>, base: number, fechados: string[], anotados: Set<string>): number {
  let s = 0
  for (const d of fechados) if (anotados.has(d)) s += base - (porDia[d] || 0)
  return Math.max(0, centavos(s))
}
