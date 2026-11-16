import { useMemo, useState } from 'react'
import { futuro, type FuturoEntrada, type FuturoSaida } from '../lib/futuro'
import { prepararReceitas, type EntradaPronta } from '../api/futuro'
import type { CenarioReceitas, ControleReceitas, FontesReceita } from '../api/tipos'

export const CENARIOS_RECEITAS = { garantido: 'Garantido', previstos: 'Com previstos', tudo: 'Com tudo' } as const
const CHAVE = 'cenario_receitas'
export function lerPreferenciaReceitas(): CenarioReceitas {
  try { const v = localStorage.getItem(CHAVE); return v === 'previstos' || v === 'tudo' ? v : 'garantido' } catch { return 'garantido' }
}
export function calcularCenariosReceitas(p: EntradaPronta, fontes = p.fontesReceita ?? {}, controle = p.controleReceitas ?? {}) {
  const entrada = p.entrada
  if (!entrada) return null
  const base = p.receitasBase ?? entrada.recebimentos
  const saidas = {} as Record<CenarioReceitas, FuturoSaida>
  for (const c of Object.keys(CENARIOS_RECEITAS) as CenarioReceitas[]) {
    const e: FuturoEntrada = { ...entrada, recebimentos: prepararReceitas(base, fontes, controle, c) }
    saidas[c] = futuro(e)
  }
  return saidas
}
/** A preferência só escolhe a comparação. O resultado oficial não sai deste hook. */
export function useCenarioReceitas(p: EntradaPronta | null, fontes?: FontesReceita, controle?: ControleReceitas) {
  const [cenario, setCenario] = useState<CenarioReceitas>(lerPreferenciaReceitas)
  const escolher = (c: CenarioReceitas) => { setCenario(c); try { localStorage.setItem(CHAVE, c) } catch { /* aparelho sem armazenamento */ } }
  const calculo = useMemo(() => {
    try { return { resultados: p ? calcularCenariosReceitas(p, fontes, controle) : null, erro: '' } }
    catch { return { resultados: null, erro: 'Não foi possível calcular com estes dados. Confira os valores e as taxas do Objetivo.' } }
  }, [p, fontes, controle])
  return { cenario, escolher, ...calculo, resultado: calculo.resultados?.[cenario] ?? null }
}
