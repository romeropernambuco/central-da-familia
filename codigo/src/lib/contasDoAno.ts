// As contas do ano (pedido do dono, 22/11/2026): "IPTU etc. vem todo ano. Tem que deixar pra família preencher e você
// calcular. Precisa só lembrar ao funcionário de imposto pra ele lembrar do IPTU." A família diz o nome, o valor e o dia;
// o app calcula quanto separar por mês até vencer e o Contador lembra 30 dias antes. Fica na config 'contas_ano'.
import { dataBr, diasEntre } from './formato'

export interface ContaDoAno {
  id: string
  nome: string
  /** valor do ano inteiro, em reais */
  valor: number
  /** mês do vencimento (1 a 12) */
  mes: number
  /** dia do vencimento (1 a 31; em mês curto vale o último dia) */
  dia: number
  /** 1 = cota única; mais de 1 = parcelas mensais a partir do mês do vencimento */
  parcelas: number
  /** anos já pagos ('2026') */
  pagas: string[]
}

/** As que a família costuma esquecer: aparecem como sugestão quando a lista está vazia. */
export const SUGESTOES = [
  'IPTU',
  'IPVA',
  'Licenciamento do carro',
  'Seguro do carro',
  'Matrícula da escola',
  'Seguro da casa',
]

/** Avisa a partir de 30 dias antes; depois do dia, pergunta por mais 30 dias se já pagou. */
export const AVISO_DIAS = 30

const c2 = (v: number) => Math.round(v * 100) / 100
const inteiroEntre = (v: unknown, a: number, b: number, padrao: number) => {
  const n = Number(v)
  return Number.isInteger(n) && n >= a && n <= b ? n : padrao
}

export function lerContasDoAno(cru: unknown): ContaDoAno[] {
  if (!Array.isArray(cru)) return []
  return cru.flatMap((x: Record<string, unknown>) => {
    if (!x || typeof x !== 'object' || typeof x.id !== 'string' || typeof x.nome !== 'string' || !x.nome.trim())
      return []
    const valor = Number(x.valor)
    const mes = inteiroEntre(x.mes, 1, 12, 0)
    if (!(valor > 0) || !mes) return []
    return [
      {
        id: x.id,
        nome: x.nome.trim(),
        valor: c2(valor),
        mes,
        dia: inteiroEntre(x.dia, 1, 31, 10),
        parcelas: inteiroEntre(x.parcelas, 1, 12, 1),
        pagas: Array.isArray(x.pagas) ? x.pagas.filter((a): a is string => typeof a === 'string') : [],
      },
    ]
  })
}

/** O dia do vencimento num ano ('AAAA-MM-DD'); dia 31 em mês curto vira o último dia. */
export function vencimentoNoAno(c: Pick<ContaDoAno, 'mes' | 'dia'>, ano: number): string {
  const ultimo = new Date(Date.UTC(ano, c.mes, 0)).getUTCDate()
  return `${ano}-${String(c.mes).padStart(2, '0')}-${String(Math.min(c.dia, ultimo)).padStart(2, '0')}`
}

export interface ProximaConta {
  conta: ContaDoAno
  /** o vencimento que importa agora */
  vence: string
  /** dias até vencer (negativo = já venceu e não foi marcada como paga) */
  dias: number
  /** quanto separar por mês, deste mês até o mês do vencimento */
  porMes: number
  /** meses para juntar (deste mês até o anterior ao vencimento; no mínimo 1) */
  meses: number
}

/**
 * O vencimento que importa: o deste ano, se ainda não passou e não foi pago; se passou há até 30 dias sem marcar como
 * paga, continua sendo ele (o Contador pergunta se pagou); senão, o do ano que vem.
 */
export function proximaDaConta(c: ContaDoAno, hoje: string): ProximaConta {
  const ano = Number(hoje.slice(0, 4))
  let vence = vencimentoNoAno(c, ano)
  const dias0 = diasEntre(hoje, vence)
  const paga = c.pagas.includes(String(ano))
  if (paga || dias0 < -AVISO_DIAS) vence = vencimentoNoAno(c, ano + 1)
  const dias = diasEntre(hoje, vence)
  const idx = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7))
  // parcelada: as parcelas caem uma por mês; separar 1/12 do ano todo mês dá para pagar todas
  const meses = c.parcelas > 1 ? 12 : Math.max(1, idx(vence) - idx(hoje))
  return { conta: c, vence, dias, meses, porMes: c2(c.valor / meses) }
}

export interface ResumoContas {
  lista: ProximaConta[]
  /** soma do que separar por mês, agora, para pagar todas na data */
  porMes: number
  /** a soma de um ano inteiro */
  noAno: number
}

export function resumoDasContas(contas: readonly ContaDoAno[], hoje: string): ResumoContas {
  const lista = contas.map(c => proximaDaConta(c, hoje)).sort((a, b) => a.vence.localeCompare(b.vence))
  return {
    lista,
    porMes: c2(lista.reduce((s, p) => s + p.porMes, 0)),
    noAno: c2(contas.reduce((s, c) => s + c.valor, 0)),
  }
}

/** As que o Contador lembra hoje: até 30 dias antes e até 30 dias depois, enquanto não marcar como paga. */
export function contasParaLembrar(contas: readonly ContaDoAno[], hoje: string): ProximaConta[] {
  return contas.map(c => proximaDaConta(c, hoje)).filter(p => p.dias <= AVISO_DIAS && p.dias >= -AVISO_DIAS)
}

const brl = (v: number) => 'R$ ' + Math.round(Math.abs(v)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })

/** Quando vence, em palavras (sem valor: aparece também com o olho fechado). */
export function quandoVence(p: ProximaConta): string {
  return p.dias < 0
    ? `venceu em ${dataBr(p.vence)}`
    : p.dias === 0
      ? 'vence hoje'
      : p.dias <= AVISO_DIAS
        ? `vence em ${p.dias === 1 ? '1 dia' : `${p.dias} dias`} (${dataBr(p.vence)})`
        : `vence em ${dataBr(p.vence)}`
}

/** Uma linha por conta, na língua da família. */
export function linhaDaConta(p: ProximaConta): string {
  const quando = quandoVence(p)
  const parcelas =
    p.conta.parcelas > 1 ? ` em ${p.conta.parcelas} parcelas de ${brl(p.conta.valor / p.conta.parcelas)}` : ''
  return `${brl(p.conta.valor)}${parcelas} · ${quando}`
}

/** O número + uma frase; a conta vai para o "Por quê?". */
export function fraseDasContas(r: ResumoContas): { titulo: string; porque: string } | null {
  if (!r.lista.length) return null
  return {
    titulo: `Separe ${brl(r.porMes)} por mês para pagar as contas do ano em dia.`,
    porque:
      `As contas do ano somam ${brl(r.noAno)}. ` +
      `Para cada uma, o app divide o valor pelos meses que faltam até ela vencer e soma tudo ` +
      `(a parcelada divide o valor do ano por 12). ` +
      `Depois de paga, a conta volta para o ano seguinte e o valor por mês cai. ` +
      `O Contador avisa 30 dias antes de cada uma.`,
  }
}
