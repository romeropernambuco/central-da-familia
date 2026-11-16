import { useMemo, useSyncExternalStore } from 'react'
import { futuro, type FuturoEntrada, type FuturoSaida } from '../lib/futuro'
import { prepararReceitas, type EntradaPronta } from '../api/futuro'
import type { CenarioReceitas, ControleReceitas, FontesReceita } from '../api/tipos'

export const CENARIOS_RECEITAS = { garantido: 'Garantido', previstos: 'Com previstos', tudo: 'Com tudo' } as const
const CHAVE = 'cenario_receitas'
let armazenamentoBloqueado: unknown
let preferenciaTemporaria: CenarioReceitas = 'garantido'
const ouvintes = new Set<() => void>()
function assinar(f: () => void) {
  ouvintes.add(f)
  window.addEventListener('storage', f)
  return () => { ouvintes.delete(f); window.removeEventListener('storage', f) }
}
export function entradaDoCenario(p: EntradaPronta, c: CenarioReceitas, fontes = p.fontesReceita ?? {}, controle = p.controleReceitas ?? {}): FuturoEntrada | null {
  return p.entrada ? { ...p.entrada, recebimentos: prepararReceitas(p.receitasBase ?? p.entrada.recebimentos, fontes, controle, c) } : null
}
export function lerPreferenciaReceitas(): CenarioReceitas {
  try {
    if (armazenamentoBloqueado === localStorage) return preferenciaTemporaria
    const v = localStorage.getItem(CHAVE); return v === 'previstos' || v === 'tudo' ? v : 'garantido'
  } catch { return 'garantido' }
}
export function calcularCenariosReceitas(p: EntradaPronta, fontes = p.fontesReceita ?? {}, controle = p.controleReceitas ?? {}) {
  const entrada = p.entrada
  if (!entrada) return null
  const saidas = {} as Record<CenarioReceitas, FuturoSaida>
  for (const c of Object.keys(CENARIOS_RECEITAS) as CenarioReceitas[]) {
    const e = entradaDoCenario(p, c, fontes, controle)!
    saidas[c] = futuro(e)
  }
  return saidas
}
/** A preferência só escolhe a comparação. O resultado oficial não sai deste hook. */
export function useCenarioReceitas(p: EntradaPronta | null, fontes?: FontesReceita, controle?: ControleReceitas) {
  const cenario = useSyncExternalStore(assinar, lerPreferenciaReceitas, () => 'garantido' as const)
  const escolher = (c: CenarioReceitas) => {
    try { localStorage.setItem(CHAVE, c); armazenamentoBloqueado = undefined }
    catch { try { armazenamentoBloqueado = localStorage; preferenciaTemporaria = c } catch { /* sem armazenamento disponível */ } }
    ouvintes.forEach(f => f())
  }
  const calculo = useMemo(() => {
    try { return { resultados: p ? calcularCenariosReceitas(p, fontes, controle) : null, erro: '' } }
    catch { return { resultados: null, erro: 'Não foi possível calcular com estes dados. Confira os valores e as taxas do Objetivo.' } }
  }, [p, fontes, controle])
  return { cenario, escolher, ...calculo, resultado: calculo.resultados?.[cenario] ?? null }
}
