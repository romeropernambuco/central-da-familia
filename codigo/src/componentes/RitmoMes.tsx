import type { Envelope } from '../api/tipos'
import { dataCurta, fimDoMes, hojeRecife, reais, somaDias } from '../lib/formato'
import { projecao } from '../lib/plano'

/**
 * R7+G3: a semana e o fim do mês, em 2 linhas. Rodada 2: vale também pro limite do mês (BRUNO ideia 3);
 * parcela e compra grande contam 1 vez só, fora do ritmo do dia (PARCELA ideia 1); 1 número por dia só (ANA ideia 2).
 */
export function RitmoMes({ e, risco, quem }: { e: Envelope; risco?: boolean; /** E2: no orçamento do outro, o nome dele no lugar de "você" */ quem?: string }) {
  const hoje = hojeRecife()
  // E3 (conserto 10): quando o domingo já é do mês que vem, a conta para no fim do mês e o rótulo diz isso
  const domingo = somaDias(hoje, (7 - new Date(hoje + 'T12:00:00Z').getUTCDay()) % 7)
  const rotuloSemana = domingo > fimDoMes(hoje) ? 'Até o fim do mês' : 'Até domingo'
  const lim = e.limite_base ?? e.limite_mes
  const dia = Number(hoje.slice(8))
  const pontual = e.pontual_mes || 0
  const p = projecao(e.gasto_mes, lim, hoje, pontual)
  const ps = e.pontual_semana || 0
  const semana = e.gasto_semana_dia != null ? Math.max(0, e.gasto_semana_dia - ps) : null
  return (
    <div className="ritmo">
      {e.ate_domingo != null && (
        <p className="ritmo-l"><span>{rotuloSemana}</span><b>{reais(e.ate_domingo)}</b>
          {semana != null && <small>nesta semana já foram {reais(semana)} no dia a dia{ps > 0 ? `, mais ${reais(ps)} de compra que não se repete (parcela ou compra grande)` : ''}</small>}
        </p>
      )}
      {dia >= 3 && (
        <p className={'ritmo-l ' + (p.dentro ? 'ok' : 'warn')}>
          <span>Se continuar assim</span>
          <b>{reais(p.fecha)} de {reais(lim)}</b>
          <small>{p.dentro ? `${quem ? `${quem} fecha` : 'você fecha'} o mês dentro do combinado, em ${dataCurta(fimDoMes(hoje))}.` : `passa ${reais(p.passa)} no fim do mês. Pra fechar dentro, siga o valor de cada dia.`}{pontual > 0 ? ` Parcelas e compras grandes (${reais(pontual)}) entram 1 vez só.` : ''}</small>
        </p>
      )}
      {risco && dia >= 2 && (
        <div className="meter ritmo-meter" aria-hidden="true">
          <i style={{ width: Math.min(100, (e.gasto_mes / lim) * 100) + '%' }} className={e.gasto_mes > p.deveria ? 'acima' : ''} />
          <span className="risco" style={{ left: Math.min(100, (p.deveria / lim) * 100) + '%' }} />
        </div>
      )}
      {risco && dia >= 2 && <p className="sub">O risquinho é até onde o combinado ia hoje: {reais(p.deveria)}. Até hoje saíram {reais(e.gasto_mes)}.</p>}
    </div>
  )
}
