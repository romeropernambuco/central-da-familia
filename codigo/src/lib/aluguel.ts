// Caderno do aluguel: o dia a dia de quem vive de aluguel, imóvel por imóvel.
// Todo mês nasce sozinho o aluguel esperado de cada imóvel alugado; a pessoa marca "chegou" e, se não chegar até o dia
// combinado, ele aparece como atrasado (a ideia dos programas de quem administra imóveis, como o OpenProperty).
// No mesmo caderno ficam as despesas do imóvel (IPTU, condomínio, conserto) e a conta do que ele rendeu de verdade.
// Aqui só as contas; quem guarda são as tabelas produto.aluguel_* (só o casal lê e grava, 1 linha por mês e imóvel).

export interface RecebimentoAluguel {
  /** mês de referência do aluguel, AAAA-MM */
  mes: string
  /** dia em que o dinheiro chegou, AAAA-MM-DD */
  data: string
  valor: number
}
export interface DespesaImovel {
  id: string
  data: string
  valor: number
  descricao: string
}
export interface CadernoImovel {
  /** dia do mês em que o aluguel vence (1 a 31; mês curto usa o último dia) */
  dia_vencimento: number
  recebimentos: RecebimentoAluguel[]
  despesas: DespesaImovel[]
  /** mês em que o caderno começou (AAAA-MM): antes dele nada conta como atrasado */
  desde?: string
}
export type Caderno = Record<string, CadernoImovel>

export const DIA_PADRAO = 10
export const cadernoVazio = (): CadernoImovel => ({ dia_vencimento: DIA_PADRAO, recebimentos: [], despesas: [] })

const c2 = (v: number) => Math.round(v * 100) / 100
const pad = (n: number) => String(n).padStart(2, '0')
const dia = (d: string) => Date.parse(d + 'T12:00:00Z') / 86400000
export const mesMais = (mes: string, n: number) => {
  const [a, m] = mes.split('-').map(Number)
  const t = a * 12 + (m - 1) + n
  return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`
}
/** O dia em que o aluguel do mês vence; dia 31 em fevereiro vira o último dia de fevereiro. */
export function vencimento(mes: string, diaVence: number) {
  const [a, m] = mes.split('-').map(Number)
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate()
  return `${mes}-${pad(Math.min(Math.max(1, diaVence), ultimo))}`
}

/** O mês em que o caderno começou: o guardado, ou o 1º aluguel anotado, ou o mês de hoje. */
export function inicioDoCaderno(c: CadernoImovel, mesHoje: string) {
  const meses = [c.desde, ...c.recebimentos.map(r => r.mes)].filter((m): m is string => !!m)
  return meses.length ? meses.reduce((a, b) => (b < a ? b : a)) : mesHoje
}

export type SituacaoAluguel =
  | { tipo: 'recebido'; data: string; valor: number }
  | { tipo: 'atrasado'; dias: number; vence: string }
  | { tipo: 'a_vencer'; dias: number; vence: string }
  | { tipo: 'antes'; vence: string }
  | { tipo: 'confirmar'; vence: string }

/** O caderno nunca foi aberto: sem mês de começo e sem nenhum aluguel anotado (o dia do vencimento ainda é o padrão). */
export const cadernoNovo = (c: CadernoImovel) => !c.desde && c.recebimentos.length === 0

/** O aluguel de um mês: chegou, está atrasado (passou do dia combinado), ainda vai vencer ou é de antes do caderno.
 *  Imóvel recém-cadastrado, com o caderno nunca aberto: o mês de hoje fica "a confirmar", nunca "atrasado" (o dia de
 *  vencimento ainda não foi dito pela família; a simulação de 22/11 acusava "atrasado há 12 dias" 1 minuto depois). */
export function situacaoDoMes(c: CadernoImovel, mes: string, hoje: string): SituacaoAluguel {
  const r = c.recebimentos.find(x => x.mes === mes)
  if (r) return { tipo: 'recebido', data: r.data, valor: r.valor }
  const vence = vencimento(mes, c.dia_vencimento)
  if (mes < inicioDoCaderno(c, hoje.slice(0, 7))) return { tipo: 'antes', vence }
  if (cadernoNovo(c) && mes === hoje.slice(0, 7)) return { tipo: 'confirmar', vence }
  const dias = Math.round(dia(hoje) - dia(vence))
  return dias > 0 ? { tipo: 'atrasado', dias, vence } : { tipo: 'a_vencer', dias: -dias, vence }
}

/** "chegou em 05/11", "atrasado há 3 dias", "vence hoje", "vence em 4 dias". */
export function fraseDaSituacao(s: SituacaoAluguel) {
  const dm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`
  if (s.tipo === 'recebido') return `chegou em ${dm(s.data)}`
  if (s.tipo === 'atrasado') return `atrasado há ${s.dias === 1 ? '1 dia' : `${s.dias} dias`}`
  if (s.tipo === 'antes') return 'antes do caderno'
  if (s.tipo === 'confirmar') return 'já chegou? marque no caderno'
  return s.dias === 0 ? 'vence hoje' : `vence dia ${dm(s.vence)}`
}

export interface ContaDoAno {
  /** meses de aluguel esperados nos últimos 12, desde o começo do caderno (o atual só se já venceu) */
  esperados: number
  recebidos: number
  atrasados: string[]
  recebido: number
  despesas: number
  sobrou: number
  /** o que sobrou sobre o valor do imóvel, em % ao ano; null sem valor */
  pct_ano: number | null
}

/** Os últimos 12 meses do imóvel: quanto chegou, quanto saiu em despesa e o que sobrou, em % do valor dele. */
export function contaDoAno(c: CadernoImovel, valorImovel: number, hoje: string): ContaDoAno {
  const mesHoje = hoje.slice(0, 7)
  const de = mesMais(mesHoje, -11)
  const meses = Array.from({ length: 12 }, (_, i) => mesMais(de, i))
  const vencidos = meses.filter(m => {
    const s = situacaoDoMes(c, m, hoje).tipo
    return s !== 'antes' && s !== 'confirmar' && (m < mesHoje || s !== 'a_vencer')
  })
  const recebidos = c.recebimentos.filter(r => r.mes >= de && r.mes <= mesHoje)
  const despesas = c.despesas.filter(d => d.data.slice(0, 7) >= de && d.data <= hoje)
  const recebido = c2(recebidos.reduce((s, r) => s + r.valor, 0))
  const gasto = c2(despesas.reduce((s, d) => s + d.valor, 0))
  const sobrou = c2(recebido - gasto)
  return {
    esperados: vencidos.length,
    recebidos: recebidos.length,
    atrasados: vencidos.filter(m => situacaoDoMes(c, m, hoje).tipo === 'atrasado'),
    recebido,
    despesas: gasto,
    sobrou,
    pct_ano: valorImovel > 0 ? Math.round((1000 * sobrou) / valorImovel) / 10 : null,
  }
}

export interface ResumoDoMes {
  alugados: number
  recebidos: number
  atrasados: number
  /** o que chegou este mês */
  recebido: number
  /** o que ainda falta chegar este mês (aluguel combinado dos que não chegaram) */
  falta: number
}
/** Os aluguéis do mês de hoje, somando todos os imóveis alugados. */
export function resumoDoMes(imoveis: { id: string; aluguel: number }[], caderno: Caderno, hoje: string): ResumoDoMes {
  const mes = hoje.slice(0, 7)
  const r: ResumoDoMes = { alugados: imoveis.length, recebidos: 0, atrasados: 0, recebido: 0, falta: 0 }
  for (const i of imoveis) {
    const s = situacaoDoMes(caderno[i.id] || cadernoVazio(), mes, hoje)
    if (s.tipo === 'recebido') {
      r.recebidos++
      r.recebido = c2(r.recebido + s.valor)
    } else {
      if (s.tipo === 'atrasado') r.atrasados++
      r.falta = c2(r.falta + i.aluguel)
    }
  }
  return r
}

/** Os aluguéis que chegaram no mês (pela data em que chegaram, até hoje): entram no "Entrou" do mês, no Início e em
 *  Gastos. Antes ficavam só no caderno (simulação de 22/11: aluguel marcado e o mês dizia "entrou R$ 0"). */
export function entradasDoAluguel(caderno: Caderno, mes: string, hoje: string): { data: string; valor: number }[] {
  return Object.values(caderno).flatMap(c =>
    c.recebimentos
      .filter(r => r.data.slice(0, 7) === mes && r.data.slice(0, 10) <= hoje)
      .map(r => ({ data: r.data, valor: r.valor })),
  )
}

/** A configuração que veio do banco pode estar velha ou estragada: só passa o que tem formato de caderno. */
export function lerCaderno(v: unknown): Caderno {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const out: Caderno = {}
  for (const [id, c] of Object.entries(v as Record<string, Partial<CadernoImovel>>)) {
    if (!c || typeof c !== 'object') continue
    out[id] = {
      dia_vencimento: Number.isInteger(c.dia_vencimento) ? (c.dia_vencimento as number) : DIA_PADRAO,
      // o mesmo mês marcado em 2 celulares chega 2 vezes depois de juntar: fica o último, para não contar em dobro
      recebimentos: Array.isArray(c.recebimentos)
        ? [
            ...new Map(
              c.recebimentos
                .filter(r => r && /^\d{4}-\d{2}$/.test(r.mes) && typeof r.valor === 'number')
                .map(r => [r.mes, r] as const),
            ).values(),
          ]
        : [],
      despesas: Array.isArray(c.despesas)
        ? c.despesas.filter(d => d && typeof d.id === 'string' && typeof d.valor === 'number')
        : [],
      ...(typeof c.desde === 'string' && /^\d{4}-\d{2}$/.test(c.desde) ? { desde: c.desde } : {}),
    }
  }
  return out
}
