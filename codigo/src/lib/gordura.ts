// Gordura e lucro da gordura (regra do dono, 22/11/2026): "mesmo tirando da gordura, não era da gordura, era do lucro da
// gordura". A gordura é o que a família tem guardado hoje (aplicações + caixa), EM VALOR DE HOJE: a régua cresce com a
// inflação de cada ano, porque guardado que fica do mesmo tamanho em reais perde valor (decisão de 22/11, depois dos
// especialistas). Gasto e desejo (viagem) que saem da sobra e do que passa da inflação deixam a gordura inteira; o app
// só acende o alerta quando o saldo cai abaixo dessa régua, e diz em que mês e quanto. Conta em cima da linha do plano.
// Sem a inflação (ipcaAno ausente), a régua fica parada no valor de hoje, como antes.
import type { LinhaMes } from './futuro'

/** IPCA por ano, em texto decimal ("0.05") ou número; o ano que faltar usa o mais perto. */
export type IpcaPorAno = Readonly<Record<number, string | number>>

/** A régua mês a mês (centavos): a gordura de hoje corrigida pela inflação até o fim de cada mês da linha. */
export function reguaDaGordura(linha: readonly LinhaMes[], ipcaAno?: IpcaPorAno): number[] {
  if (!linha.length) return []
  const gordura = linha[0].saldo_inicial
  const anos = Object.entries(ipcaAno || {})
    .map(([a, v]) => [Number(a), Number(v)] as const)
    .filter(([a, v]) => Number.isFinite(a) && Number.isFinite(v) && v > -0.5 && v < 1)
  const ipcaDe = (ano: number) =>
    anos.length ? anos.reduce((p, q) => (Math.abs(q[0] - ano) < Math.abs(p[0] - ano) ? q : p))[1] : 0
  let fator = 1
  return linha.map(l => {
    fator *= Math.pow(1 + ipcaDe(Number(l.mes.slice(0, 4))), 1 / 12)
    return Math.round(gordura * fator)
  })
}

export interface AnaliseGordura {
  /** o que a família tem hoje (centavos): a gordura que não deve ser comida */
  gordura: number
  /** o que a gordura rende no 1º mês (centavos, já sem imposto) */
  lucroDoMes: number
  /** 1º mês em que o saldo fica abaixo da régua; null = a gordura fica inteira em toda a linha */
  comeEm: string | null
  /** o pior mês: o saldo menos a régua (negativo = quanto foi comido) */
  menorFolga: number
  mesDaMenorFolga: string | null
  /** quanto a família tem no fim da linha (centavos) e quanto isso é a mais que a régua do fim */
  saldoNoFim: number
  ganhoNoFim: number
}

/** Mês a mês, o saldo fica acima da gordura de hoje (em valor de cada mês)? Linha vazia (modo renda): null. */
export function analisarGordura(linha: readonly LinhaMes[], ipcaAno?: IpcaPorAno): AnaliseGordura | null {
  if (!linha.length) return null
  const regua = reguaDaGordura(linha, ipcaAno)
  let comeEm: string | null = null,
    menorFolga = Infinity,
    mesDaMenorFolga: string | null = null
  linha.forEach((l, k) => {
    const folga = l.saldo_final - regua[k]
    if (folga < menorFolga) {
      menorFolga = folga
      mesDaMenorFolga = l.mes
    }
    if (folga < 0 && !comeEm) comeEm = l.mes
  })
  const saldoNoFim = linha[linha.length - 1].saldo_final
  return {
    gordura: linha[0].saldo_inicial,
    lucroDoMes: linha[0].rendimento,
    comeEm,
    menorFolga,
    mesDaMenorFolga,
    saldoNoFim,
    ganhoNoFim: saldoNoFim - regua[regua.length - 1],
  }
}

/** No mês m, quanto do saldo está acima da régua (a sobra juntada até ali). Sem o mês: null. */
export function folgaNoMes(linha: readonly LinhaMes[], m: string, ipcaAno?: IpcaPorAno): number | null {
  const k = linha.findIndex(x => x.mes === m)
  if (k < 0) return null
  return linha[k].saldo_final - reguaDaGordura(linha, ipcaAno)[k]
}

const mm = (m: string) => `${m.slice(5, 7)}/${m.slice(0, 4)}`
const reais = (c: number) => 'R$ ' + Math.round(Math.abs(c) / 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })

/** A frase do plano: curta, na língua da família. */
export function fraseDaGordura(a: AnaliseGordura, ultimoMes: string): string {
  if (!a.comeEm) return `A gordura fica inteira até ${mm(ultimoMes)}, já contando a inflação.`
  return `Em ${mm(a.comeEm)} os gastos começam a comer a gordura. No pior mês, ${reais(a.menorFolga)} a menos.`
}
