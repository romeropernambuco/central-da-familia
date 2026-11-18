import type { ControleReceitas, FontesReceita, RecebimentoTela } from '../../api/tipos'
import { mesesDaReceita } from '../../api/futuro'
import { camposAusentes } from './contrato'
export function mesesPendentes(r: RecebimentoTela, fontes: FontesReceita, controle: ControleReceitas) {
  return mesesDaReceita(r.mes_previsto, fontes[r.id]).filter((m, i) => !(i === 0 && r.recebido_em) && !controle[r.id]?.recebidas?.[m])
}
export function recebimentoAtual(r: RecebimentoTela, controle: ControleReceitas) {
  return { ...r, valor: (controle[r.id]?.valor ?? Math.round(r.valor * 100)) / 100 }
}
/** Unidade da API: reais. Controle de recorrências: centavos, convertido na fronteira acima. */
export function totaisRecebimentos(lista: RecebimentoTela[], fontes: FontesReceita, controle: ControleReceitas, mes?: string) {
  if (!Array.isArray(lista) || camposAusentes(lista).length || lista.some(r => camposAusentes(r).length || !Number.isFinite(r.valor) || !r.mes_previsto || !r.id)) throw new Error('Recebimentos incompletos')
  let ocorrencias = 0, previsto = 0
  for (const r of lista) { const n = mesesPendentes(r, fontes, controle).filter(m => !mes || (m === r.mes_previsto ? r.mes_novo || m : m) <= mes).length; ocorrencias += n; previsto += n * recebimentoAtual(r, controle).valor }
  return { ocorrencias, previsto }
}
export function recebimentosDoMes(lista: RecebimentoTela[], fontes: FontesReceita, controle: ControleReceitas, mes: string) {
  const grupo = (certeza: 'garantido' | 'provavel' | 'incerto') => totaisRecebimentos(lista.filter(r => (fontes[r.id]?.certeza ?? (r.certo ? 'garantido' : 'incerto')) === certeza), fontes, controle, mes).previsto
  return { ...totaisRecebimentos(lista, fontes, controle, mes), garantido: grupo('garantido'), provavel: grupo('provavel'), incerto: grupo('incerto'),
    atrasados: lista.reduce((s, r) => s + mesesPendentes(r, fontes, controle).filter(m => (m === r.mes_previsto ? r.mes_novo || m : m) < mes).length, 0) }
}
