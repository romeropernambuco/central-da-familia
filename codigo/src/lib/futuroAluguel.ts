// "Não me pagou": a ponte entre o caderno do aluguel e o plano (o banco não sabe do problema; o app conta ao motor).
import type { ImovelBanco } from './futuroReceitas'

/** Sem data de volta ("não sei ainda"): o plano não conta com o aluguel até a família dizer (bem longe no futuro). */
export const SEM_DATA_DE_VOLTA = '2100-01'

/**
 * O caderno do aluguel conta ao plano o que o banco não sabe: imóvel com problema (calote, despejo, vazio) não rende até
 * a volta. Só marca o imóvel; quem decide os meses é o motor (aluguelNoMes). Problema já resolvido no passado: nada muda.
 */
export function comProblemasDoAluguel<T extends { imoveis?: ImovelBanco[] }>(
  j: T,
  problemas: Record<string, { desde: string; volta: string | null } | null | undefined>,
  mesHoje: string,
): T {
  if (!j.imoveis?.length) return j
  return {
    ...j,
    imoveis: j.imoveis.map(i => {
      const p = problemas[String(i.id)]
      if (!p || (p.volta && p.volta <= mesHoje)) return i
      return { ...i, sem_aluguel_ate: p.volta || SEM_DATA_DE_VOLTA }
    }),
  }
}
