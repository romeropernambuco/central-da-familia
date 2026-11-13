import type { Envelope } from '../api/tipos'
import { centavos, fimDoMes, hojeRecife, reais, segundaDaSemana, somaDias } from '../lib/formato'
import { pesoDia, projecao } from '../lib/plano'

/**
 * R7+G3: a semana e o fim do mês. Rodada 2: vale também pro limite do mês (BRUNO ideia 3); parcela e compra grande
 * contam 1 vez só, fora do ritmo do dia (PARCELA ideia 1); 1 número por dia só (ANA ideia 2).
 * E10 (o dono pediu menos texto e "apontar" a previsão): cada bloco vira 1 barra com a marca de onde deveria estar hoje
 * (VISUAL D2: preenchimento verde até a marca, âmbar quando passa) e no máximo 2 frases.
 */

/** Onde a semana deveria estar hoje: a parte dos dias da janela (segunda ou dia 1 até domingo ou fim do mês) que já passou,
 *  com sábado, domingo e feriado valendo mais (o mesmo peso do número do dia). Sem tela: dá pra testar sozinho. */
export function marcaDaSemana(hoje: string): number {
  const ini = segundaDaSemana(hoje) < hoje.slice(0, 8) + '01' ? hoje.slice(0, 8) + '01' : segundaDaSemana(hoje)
  const dom = somaDias(hoje, (7 - new Date(hoje + 'T12:00:00Z').getUTCDay()) % 7)
  const fim = dom > fimDoMes(hoje) ? fimDoMes(hoje) : dom
  let antes = 0, total = 0
  for (let d = ini; d <= fim; d = somaDias(d, 1)) { const p = pesoDia(d); total += p; if (d < hoje) antes += p }
  return total > 0 ? antes / total : 0
}

/** A barra: quanto já saiu (largura) e a marca de onde deveria estar hoje (traço). Passou da marca: âmbar. */
function Barra({ feito, marca, rotulo }: { feito: number; marca: number; rotulo: string }) {
  const f = Math.max(0, Math.min(1, feito)), m = Math.max(0, Math.min(1, marca))
  return (
    <div className="meter ritmo-meter" role="img" aria-label={rotulo}>
      <i style={{ width: Math.max(f > 0 ? 2 : 0, f * 100) + '%' }} className={feito > marca + 0.0001 ? 'acima' : ''} />
      <span className="risco" style={{ left: m * 100 + '%' }} />
    </div>
  )
}

export function RitmoMes({ e, quem }: { e: Envelope; /** E2: no orçamento do outro, o nome dele no lugar de "você" */ quem?: string }) {
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
  const totalSemana = semana != null && e.ate_domingo != null ? centavos(semana + e.ate_domingo) : null
  const marcaSem = marcaDaSemana(hoje)
  const marcaMes = lim > 0 ? p.deveria / lim : 0
  const quemFecha = quem ? `${quem} fecha` : 'Fecha'
  return (
    <div className="ritmo">
      {e.ate_domingo != null && (
        <div className="ritmo-b">
          <p className="ritmo-t"><span>{rotuloSemana}</span><b>{reais(e.ate_domingo)}</b></p>
          {totalSemana != null && totalSemana > 0 && <Barra feito={(semana || 0) / totalSemana} marca={marcaSem} rotulo={`Semana: já foram ${reais(semana || 0)} de ${reais(totalSemana)}. O traço é onde deveria estar hoje.`} />}
          {semana != null && <p className="ritmo-f">Já foram {reais(semana)} nesta semana{ps > 0 ? `, mais ${reais(ps)} de parcela ou compra grande` : ''}.</p>}
        </div>
      )}
      {dia >= 2 && lim > 0 && (
        <div className={'ritmo-b ' + (dia >= 3 ? (p.dentro ? 'ok' : 'warn') : '')}>
          <p className="ritmo-t"><span>{dia >= 3 ? 'Se continuar assim' : 'No mês'}</span><b>{dia >= 3 ? `${reais(p.fecha)} de ${reais(lim)}` : `${reais(e.gasto_mes)} de ${reais(lim)}`}</b></p>
          <Barra feito={e.gasto_mes / lim} marca={marcaMes} rotulo={`Mês: já saíram ${reais(e.gasto_mes)} de ${reais(lim)}. O traço é onde deveria estar hoje: ${reais(p.deveria)}.`} />
          <p className="ritmo-f">{dia < 3 ? `Já saíram ${reais(e.gasto_mes)}.` : p.dentro ? `${quemFecha} o mês dentro do combinado.` : `Passa ${reais(p.passa)} no fim do mês. Siga o valor de cada dia.`}</p>
        </div>
      )}
      {(e.ate_domingo != null || (dia >= 2 && lim > 0)) && <p className="leg ritmo-leg"><span><i className="q risco-q" />onde deveria estar hoje</span>{pontual > 0 && <span>parcelas e compras grandes ({reais(pontual)}) contam 1 vez só</span>}</p>}
    </div>
  )
}
