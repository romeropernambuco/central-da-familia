// Família que ainda não escolheu a meta (regra do dono, 22/11/2026: "eu não sei como é que ela deve proceder, mas aí o
// sistema tem que identificar"). Sem o gasto do objetivo, o app usa o gasto de hoje (o teto do mês que o plano já usa) e
// a sobra de hoje (o que a linha mês a mês do plano guarda, tirando o que o guardado rende) para dizer quando a família
// passaria a viver só do que rende: o guardado rendendo a taxa real (acima da inflação) mais os aluguéis líquidos.
// Conta em dinheiro de hoje (taxa real), em centavos.
import type { LinhaMes } from './futuro'

export interface ViverDeRenda {
  /** mês em que o que rende passa a cobrir o gasto com a margem; null = não chega em 40 anos com a sobra de hoje */
  mes: string | null
  /** já cobre hoje */
  jaCobre: boolean
  /** a sobra média por mês que a linha do plano guarda (centavos; sem o rendimento) */
  sobraMes: number
  /** o gasto que a conta usou (centavos por mês) */
  gasto: number
}

const ANOS = 40
const proximo = (m: string) => {
  const [a, mm] = m.split('-').map(Number)
  return mm === 12 ? `${a + 1}-01` : `${a}-${String(mm + 1).padStart(2, '0')}`
}

export function quandoViveDeRenda(
  linha: readonly LinhaMes[],
  x: { gasto: number; taxaRealAnual: number; margem: number; alugueis: number },
): ViverDeRenda | null {
  if (!linha.length || !(x.gasto > 0) || !(x.taxaRealAnual > 0)) return null
  const n = linha.length
  const rendeu = linha.reduce((s, l) => s + l.rendimento, 0)
  const sobraMes = Math.round((linha[n - 1].saldo_final - linha[0].saldo_inicial - rendeu) / n)
  const rm = Math.pow(1 + x.taxaRealAnual, 1 / 12) - 1
  const precisa = x.gasto * (1 + Math.max(0, x.margem))
  const cobre = (p: number) => p * rm + Math.max(0, x.alugueis) >= precisa
  let p = linha[0].saldo_inicial
  let mes = linha[0].mes
  if (cobre(p)) return { mes, jaCobre: true, sobraMes, gasto: x.gasto }
  for (let k = 0; k < ANOS * 12; k++) {
    p = p * (1 + rm) + sobraMes
    mes = proximo(mes)
    if (cobre(p)) return { mes, jaCobre: false, sobraMes, gasto: x.gasto }
    if (p <= 0) break
  }
  return { mes: null, jaCobre: false, sobraMes, gasto: x.gasto }
}

const brl = (c: number) => 'R$ ' + Math.round(Math.abs(c) / 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
const mesAno = (m: string) =>
  `${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(m.slice(5)) - 1]}/${m.slice(0, 4)}`

/** A frase para quem ainda não escolheu a meta. */
export function fraseViverDeRenda(v: ViverDeRenda): string {
  const base = `Meta ainda não escolhida. Pelo que a família cadastrou (gasto de ${brl(v.gasto)} por mês`
  if (v.jaCobre) return `${base}), o que ela tem já daria para viver só do que rende, com margem de segurança.`
  const sobra = v.sobraMes > 0 ? `guardando a sobra de hoje, perto de ${brl(v.sobraMes)} por mês` : 'sem sobra hoje'
  if (!v.mes)
    return `${base}, ${sobra}), não daria para viver só do que rende nos próximos ${ANOS} anos. Escolha a meta ou aumente a sobra.`
  return `${base}, ${sobra}), daria para viver só do que rende por volta de ${mesAno(v.mes)}. Escolha a meta para o plano usar a sua data.`
}
