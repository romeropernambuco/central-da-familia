// F8 Reajuste anual do teto (ECONOMISTA item 3, F8).
import { anoDe, arred, centavos, compararMes, Dec, listaMeses, numeroDoMes, proximoMes, taxa, UM } from './decimal'
import type { Centavos, Mes, Taxa } from './tipos'

/** teto_novo = arred(teto × (1 + ipca_12m_do_ano_anterior)). */
export function reajustarTeto(teto: Centavos, ipca_ano_anterior: Taxa | Dec): Centavos {
  return arred(centavos(teto).times(UM.plus(taxa(ipca_ano_anterior))))
}

/** Teto da projeção no mês m: parte do teto do mês de hoje e reajusta em cada mês de reajuste
 *  depois de hoje até m, com o IPCA do ano anterior (Focus). */
export function tetoProjetado(teto_hoje: Centavos, mes_hoje: Mes, m: Mes, mes_reajuste: number, ipca_ano: Record<number, Taxa>): Centavos {
  let t = teto_hoje
  if (compararMes(m, mes_hoje) <= 0) return t
  for (const x of listaMeses(proximoMes(mes_hoje), m)) {
    if (numeroDoMes(x) === mes_reajuste) {
      const i = ipca_ano[anoDe(x) - 1]
      if (i === undefined) throw new Error(`Falta o IPCA de ${anoDe(x) - 1}`)
      t = reajustarTeto(t, i)
    }
  }
  return t
}

/** O teto sugerido só vale com todos os adultos aprovando (quem chama passa 1 voto por adulto),
 *  a partir do mês seguinte à aprovação. */
export function tetoVigente(
  atual: Centavos,
  sugerido: Centavos,
  aprovacoes: boolean[],
  aprovado_em: Mes | null,
  m: Mes,
): { teto: Centavos; situacao: 'sugestao pendente' | 'aprovado' | 'aprovado, vale no mes seguinte' } {
  const todos = aprovacoes.length >= 1 && aprovacoes.every(Boolean) // todos os adultos da família (1 basta se só há 1; REVISOR C4)
  if (!todos || aprovado_em === null) return { teto: atual, situacao: 'sugestao pendente' }
  if (compararMes(m, aprovado_em) <= 0) return { teto: atual, situacao: 'aprovado, vale no mes seguinte' }
  return { teto: sugerido, situacao: 'aprovado' }
}
