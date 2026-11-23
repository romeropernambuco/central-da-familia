// A seta do mês (pedido do dono, 22/11/2026): "uma setinha mostrando se o dinheiro tá subindo mais do que saindo ou o
// inverso, e qual é o %". Entra = o que entra no mês (salário, aluguel sem imposto, outras entradas) + o salário da
// gordura; sai = o que saiu, com a compra parcelada contando só a parcela do mês. A mesma base da separação do mês, para
// os números nunca brigarem entre telas. Tudo em reais.

export interface SetaDoMes {
  sentido: 'sobe' | 'desce'
  entra: number
  sai: number
  /** entra − sai: positivo = sobrou; negativo = saiu a mais */
  diferenca: number
  /** |diferença| sobre o que entra, em % inteiro */
  pct: number
}

const c2 = (v: number) => Math.round(v * 100) / 100

export function setaDoMes(s: { entra: number; lucro: number; gasto: number }): SetaDoMes | null {
  const entra = c2(Math.max(0, s.entra) + Math.max(0, s.lucro))
  if (!(entra > 0)) return null
  const sai = c2(Math.max(0, s.gasto))
  const diferenca = c2(entra - sai)
  return {
    sentido: diferenca >= 0 ? 'sobe' : 'desce',
    entra,
    sai,
    diferenca,
    pct: Math.round((Math.abs(diferenca) / entra) * 100),
  }
}

const brl = (v: number) => 'R$ ' + Math.round(Math.abs(v)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })

const resumo = (a: SetaDoMes) => (a.sentido === 'sobe' ? `sobraram ${a.pct}%` : `saíram ${a.pct}% a mais do que entrou`)

/** O que o app fala: número + uma frase; a conta vai para o "Por quê?". */
export function fraseDaSeta(
  a: SetaDoMes,
  antes?: SetaDoMes | null,
): { titulo: string; comparacao: string | null; porque: string } {
  const titulo =
    a.sentido === 'sobe'
      ? `Previsto para o mês: entra mais do que sai, sobram ${brl(a.diferenca)} (${a.pct}%).`
      : `Previsto para o mês: sai mais do que entra, ${brl(a.diferenca)} a mais (${a.pct}%).`
  // sem "melhor/pior": o mês de hoje ainda não acabou, a comparação com um mês fechado enganaria
  const comparacao = antes ? `Mês passado: ${resumo(antes)}.` : null
  const porque =
    `Entram ${brl(a.entra)} no mês: o salário, o aluguel sem o imposto, outras entradas e o salário da gordura. ` +
    `Até hoje saíram ${brl(a.sai)} (a compra parcelada conta só a parcela do mês). ` +
    `A porcentagem é a diferença dividida pelo que entra. O mês ainda não acabou: ela muda a cada gasto anotado.`
  return { titulo, comparacao, porque }
}
