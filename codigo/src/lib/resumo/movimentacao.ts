import type { ControleReceitas, FontesReceita, Lancamento, RecebimentoTela } from '../../api/tipos'
import { centavos } from '../formato'
import { mesesPendentes, recebimentoAtual } from './recebimentos'
type Entrada = { data: string; valor: number }
export function totaisDoMes(mes: string, hoje: string, gastos: Lancamento[], recebimentos: RecebimentoTela[], entradas: Entrada[], fontes: FontesReceita = {}, controle: ControleReceitas = {}) {
  // A compra original é a fonte; parcelas sintéticas do exemplo são só projeções de fatura.
  const saiu = centavos(gastosRealizados(mes, hoje, gastos).reduce((s, l) => s + l.valor, 0))
  const noMes = (data: string) => data.slice(0, 7) === mes && data.slice(0, 10) <= hoje
  let realizado = entradas.filter(e => noMes(e.data)).reduce((s, e) => s + e.valor, 0)
  let recorrenteEmCentavos = 0, previstoEmReais = 0
  for (const r of recebimentos) {
    if (r.recebido_em && noMes(r.recebido_em)) realizado += r.valor_recebido ?? r.valor
    for (const [ocorrencia, confirmacao] of Object.entries(controle[r.id]?.recebidas ?? {})) {
      // A primeira ocorrência também pode ter sido confirmada antes, pelo registro-base.
      if (ocorrencia === r.mes_previsto && r.recebido_em) continue
      if (noMes(confirmacao.data)) recorrenteEmCentavos += confirmacao.valor
    }
    const certo = fontes[r.id] ? fontes[r.id].certeza === 'garantido' : r.certo
    if (certo && mesesPendentes(r, fontes, controle).some(m => (m === r.mes_previsto ? r.mes_novo || m : m) === mes)) {
      previstoEmReais += recebimentoAtual(r, controle).valor
    }
  }
  const entrou = centavos(realizado + recorrenteEmCentavos / 100)
  const previsto = centavos(previstoEmReais)
  return { entrou, saiu, saldo: centavos(entrou - saiu), previsto }
}


export const gastosRealizados = (mes: string, hoje: string, gastos: Lancamento[]) => gastos.filter(l => !l.parcela && !l.apagado_em && l.data.startsWith(mes) && l.data <= hoje)
