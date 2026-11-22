// Gordura e lucro da gordura (regra do dono, 22/11/2026): "mesmo tirando da gordura, não era da gordura, era do lucro da
// gordura". A gordura é o que a família tem guardado hoje (aplicações + caixa). O lucro é o que ela rende. Gasto e desejo
// (viagem) que saem da sobra do salário e do que a gordura rende deixam a gordura inteira; o app só acende o alerta quando
// o saldo cai ABAIXO da gordura de hoje, e diz em que mês e quanto. Conta em cima da linha mês a mês do plano (lib/futuro).
import type { LinhaMes } from './futuro'

export interface AnaliseGordura {
  /** o que a família tem hoje (centavos): a gordura que não deve ser comida */
  gordura: number
  /** o que a gordura rende no 1º mês (centavos, já sem imposto): o lucro da gordura */
  lucroDoMes: number
  /** 1º mês em que o saldo fica abaixo da gordura de hoje; null = a gordura fica inteira em toda a linha */
  comeEm: string | null
  /** o pior mês: o saldo menos a gordura (negativo = quanto foi comido) */
  menorFolga: number
  mesDaMenorFolga: string | null
  /** quanto a família tem no fim da linha (centavos) e quanto isso é a mais que a gordura de hoje */
  saldoNoFim: number
  ganhoNoFim: number
}

/** Mês a mês, o saldo fica acima da gordura de hoje? Linha vazia (modo renda): null. */
export function analisarGordura(linha: readonly LinhaMes[]): AnaliseGordura | null {
  if (!linha.length) return null
  const gordura = linha[0].saldo_inicial
  let comeEm: string | null = null,
    menorFolga = Infinity,
    mesDaMenorFolga: string | null = null
  for (const l of linha) {
    const folga = l.saldo_final - gordura
    if (folga < menorFolga) {
      menorFolga = folga
      mesDaMenorFolga = l.mes
    }
    if (folga < 0 && !comeEm) comeEm = l.mes
  }
  const saldoNoFim = linha[linha.length - 1].saldo_final
  return {
    gordura,
    lucroDoMes: linha[0].rendimento,
    comeEm,
    menorFolga,
    mesDaMenorFolga,
    saldoNoFim,
    ganhoNoFim: saldoNoFim - gordura,
  }
}

/** No mês m, quanto do saldo está acima da gordura de hoje (o lucro e a sobra juntados até ali). Sem o mês: null. */
export function folgaNoMes(linha: readonly LinhaMes[], m: string): number | null {
  if (!linha.length) return null
  const l = linha.find(x => x.mes === m)
  return l ? l.saldo_final - linha[0].saldo_inicial : null
}

const mm = (m: string) => `${m.slice(5, 7)}/${m.slice(0, 4)}`
const reais = (c: number) => 'R$ ' + Math.round(Math.abs(c) / 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })

/** A frase do plano, em português simples. */
export function fraseDaGordura(a: AnaliseGordura, ultimoMes: string): string {
  if (!a.comeEm)
    return `A gordura de hoje (${reais(a.gordura)}) fica inteira até ${mm(ultimoMes)}: os gastos e os desejos saem da sobra e do que ela rende. No fim, o guardado chega a ${reais(a.saldoNoFim)}.`
  return `A partir de ${mm(a.comeEm)} os gastos e os desejos passam a comer a gordura de hoje (${reais(a.gordura)}): no pior mês (${mm(a.mesDaMenorFolga!)}) ela fica ${reais(a.menorFolga)} menor.`
}
