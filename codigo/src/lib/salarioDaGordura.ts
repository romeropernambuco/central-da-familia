// O salário da gordura (regra do dono, 22/11/2026, conferida por três especialistas): do que o guardado rende no mês,
// metade é salário e metade fica guardada, "encarada como a quantia da inflação". A metade guardada nunca é menor que a
// inflação do mês: com juro baixo (2019-2021), metade não cobria a inflação e o guardado perdia valor sem ninguém ver.
// Simulação com CDI e IPCA de 2000 a 2026 (Banco Central): gastar o rendimento todo deixa ~30% do guardado em 20 anos; a
// metade pura deixa 75% a 84%; a metade com esse piso foi a única regra que nunca deixou o guardado perder valor.
// Tudo em reais.

/** IPCA esperado quando o Focus não chegou: Focus de 13/11/2026 para 2027 (5,00%). */
export const IPCA_PADRAO = 0.05

export interface SalarioDaGordura {
  /** o que o guardado rende no mês, já sem o imposto */
  rende: number
  /** quanto a inflação do mês come do valor do guardado */
  inflacao: number
  /** pode ser gasto sem empobrecer */
  salario: number
  /** fica no guardado (a metade, ou a inflação inteira quando a metade não cobre) */
  guarda: number
  /** guarda − inflação: quanto o guardado cresce de verdade no mês (0 quando só empata) */
  cresce: number
  /** a metade guardada cobre a inflação */
  metadeCobre: boolean
}

const c2 = (v: number) => Math.round(v * 100) / 100

/** Quanto a inflação de um ano come de um valor em um mês. */
export function inflacaoDoMes(valor: number, ipcaAnual: number): number {
  if (!(valor > 0) || !Number.isFinite(ipcaAnual) || ipcaAnual <= 0) return 0
  return c2(valor * (Math.pow(1 + ipcaAnual, 1 / 12) - 1))
}

/** A divisão do mês. Sem rendimento ou sem guardado: null. */
export function salarioDaGordura(rende: number, guardado: number, ipcaAnual: number): SalarioDaGordura | null {
  if (!(rende > 0) || !(guardado > 0)) return null
  const inflacao = inflacaoDoMes(guardado, ipcaAnual)
  const metade = c2(rende / 2)
  const guarda = c2(Math.min(rende, Math.max(metade, inflacao)))
  const salario = c2(rende - guarda)
  return {
    rende: c2(rende),
    inflacao,
    salario,
    guarda,
    cresce: c2(Math.max(0, guarda - inflacao)),
    metadeCobre: metade >= inflacao,
  }
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

/** O que o app fala no Guardado, em português simples. */
export function fraseDoSalario(s: SalarioDaGordura): string {
  const rende = `Com a taxa de hoje, o guardado rende perto de ${brl(s.rende)} por mês, já sem o imposto. A inflação come ${brl(s.inflacao)} do valor dele por mês.`
  if (s.salario <= 0)
    return `${rende} Hoje ele rende menos que a inflação: não sobra salário da gordura. Gastar o rendimento faz o guardado perder valor.`
  if (!s.metadeCobre)
    return `${rende} Com os juros de hoje, metade do rendimento não cobre a inflação: ficam guardados ${brl(s.guarda)} para o guardado não perder valor, e o salário da gordura cai para ${brl(s.salario)}.`
  return `${rende} Pela regra da família, metade (${brl(s.guarda)}) fica guardada: cobre a inflação e ainda faz o guardado crescer ${brl(s.cresce)}. A outra metade, ${brl(s.salario)}, é o salário da gordura: dá para gastar sem empobrecer.`
}
