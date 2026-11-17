import type { ControleReceitas, FontesReceita, RecebimentoTela } from '../../api/tipos'
import { mesesDaReceita } from '../../api/futuro'
export function mesesPendentes(r: RecebimentoTela, fontes: FontesReceita, controle: ControleReceitas) {
  return mesesDaReceita(r.mes_previsto, fontes[r.id]).filter((m, i) => !(i === 0 && r.recebido_em) && !controle[r.id]?.recebidas?.[m])
}
export function recebimentoAtual(r: RecebimentoTela, controle: ControleReceitas) {
  return { ...r, valor: (controle[r.id]?.valor ?? Math.round(r.valor * 100)) / 100 }
}
/** Unidade da API: reais. Controle de recorrências: centavos, convertido na fronteira acima. */
export function totaisRecebimentos(lista: RecebimentoTela[], fontes: FontesReceita, controle: ControleReceitas) {
  let ocorrencias = 0, previsto = 0
  for (const r of lista) { const n = mesesPendentes(r, fontes, controle).length; ocorrencias += n; previsto += n * recebimentoAtual(r, controle).valor }
  return { ocorrencias, previsto }
}
