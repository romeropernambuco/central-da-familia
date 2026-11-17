import type { Lancamento, RecebimentoTela } from '../../api/tipos'
import { centavos } from '../formato'
type Entrada = { data: string; valor: number }
export function totaisDoMes(mes: string, hoje: string, gastos: Lancamento[], recebimentos: RecebimentoTela[], entradas: Entrada[]) {
  // A compra original é a fonte; parcelas sintéticas do exemplo são só projeções de fatura.
  const saiu = centavos(gastosRealizados(mes, hoje, gastos).reduce((s, l) => s + l.valor, 0))
  const entrou = centavos(entradas.filter(e => e.data.startsWith(mes) && e.data <= hoje).reduce((s, e) => s + e.valor, 0)
    + recebimentos.filter(r => r.recebido_em?.startsWith(mes) && r.recebido_em.slice(0, 10) <= hoje).reduce((s, r) => s + (r.valor_recebido ?? r.valor), 0))
  const previsto = centavos(recebimentos.filter(r => !r.recebido_em && r.certo && (r.mes_novo || r.mes_previsto) === mes).reduce((s, r) => s + r.valor, 0))
  return { entrou, saiu, saldo: centavos(entrou - saiu), previsto }
}


export const gastosRealizados = (mes: string, hoje: string, gastos: Lancamento[]) => gastos.filter(l => !l.parcela && !l.apagado_em && l.data.startsWith(mes) && l.data <= hoje)
