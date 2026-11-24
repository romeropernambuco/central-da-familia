import { textoPrivado } from '../lib/olho'
import './dinheiro-f29.css'
import { useOlhoApp } from '../app/contexto'
import type { Envelope } from '../api/tipos'
import { centavos, diasNoMes, fimDoMes, hojeRecife, reais, segundaDaSemana, somaDias } from '../lib/formato'
import { GraficoMes } from './Graficos'
import { pesoDia, projecao } from '../lib/plano'
import { Icone } from './Icone'
import { CalendarDays, CircleCheck, Info, TrendingDown, TrendingUp, TriangleAlert } from 'lucide-react'

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
  let antes = 0,
    total = 0
  for (let d = ini; d <= fim; d = somaDias(d, 1)) {
    const p = pesoDia(d)
    total += p
    if (d < hoje) antes += p
  }
  return total > 0 ? antes / total : 0
}

/** A barra: quanto já saiu (largura) e a marca de onde deveria estar hoje (traço). Passou da marca: âmbar. */
function Barra({ feito, marca, rotulo }: { feito: number; marca: number; rotulo: string }) {
  const { oculto } = useOlhoApp()
  if (oculto) return <p className="sub">Gráfico oculto.</p>
  const f = Math.max(0, Math.min(1, feito)),
    m = Math.max(0, Math.min(1, marca))
  return (
    <div className="meter ritmo-meter" role="img" aria-label={textoPrivado(rotulo)}>
      <i style={{ width: Math.max(f > 0 ? 2 : 0, f * 100) + '%' }} className={feito > marca + 0.0001 ? 'acima' : ''} />
      <span className="risco" style={{ left: m * 100 + '%' }} />
    </div>
  )
}

export type ValoresDoRitmo = { gasto: number; limite: number; fecha?: number; excesso?: number }

export function RitmoMes({
  e,
  quem,
  porDia,
  valoresJaVisiveis,
}: {
  e: Envelope
  /** E2: no orçamento do outro, o nome dele no lugar de "você" */ quem?: string
  /** C3 (gráfico A): o gasto à vista de cada dia deste envelope no mês (AAAA-MM-DD: reais). Sem ele, a linha vai reta até hoje. */
  porDia?: Record<string, number> | null
  valoresJaVisiveis?: ValoresDoRitmo
}) {
  const hoje = hojeRecife()
  // E3 (conserto 10): quando o domingo já é do mês que vem, a conta para no fim do mês e o rótulo diz isso
  const domingo = somaDias(hoje, (7 - new Date(hoje + 'T12:00:00Z').getUTCDay()) % 7)
  const rotuloSemana = domingo > fimDoMes(hoje) ? 'Até o fim do mês' : 'Ainda pode gastar até domingo'
  const lim = e.limite_base ?? e.limite_mes
  const dia = Number(hoje.slice(8))
  const pontual = e.pontual_mes || 0
  const p = projecao(e.gasto_mes, lim, hoje, pontual)
  const ps = e.pontual_semana || 0
  const semana = e.gasto_semana_dia != null ? Math.max(0, e.gasto_semana_dia - ps) : null
  const totalSemana = semana != null && e.ate_domingo != null ? centavos(semana + e.ate_domingo) : null
  const marcaSem = marcaDaSemana(hoje)
  const quemFecha = quem ? `${quem} fecha` : 'Fecha'
  const fecha = dia >= 3 ? p.fecha : e.gasto_mes
  const exibirFecha = (dia >= 3 ? valoresJaVisiveis?.fecha : valoresJaVisiveis?.gasto) !== fecha
  const exibirLimite = valoresJaVisiveis?.limite !== lim
  return (
    <div className="ritmo">
      {e.ate_domingo != null && (
        <div className="ritmo-b">
          <p className="ritmo-t">
            <span className="ritmo-rot">
              <i className="ritmo-ico" aria-hidden="true">
                <Icone desenho={CalendarDays} />
              </i>
              {rotuloSemana}
            </span>
            <b className="ritmo-num">{reais(e.ate_domingo)}</b>
          </p>
          {totalSemana != null && totalSemana > 0 && (
            <Barra
              feito={(semana || 0) / totalSemana}
              marca={marcaSem}
              rotulo={`Semana: já foram ${reais(semana || 0)} de ${reais(totalSemana)}. O traço é onde deveria estar hoje.`}
            />
          )}
          {semana != null && (
            <p className="ritmo-f">
              Já foram {reais(semana)} nesta semana{ps > 0 ? `, mais ${reais(ps)} de parcela ou compra grande` : ''}.
            </p>
          )}
        </div>
      )}
      {dia >= 2 && lim > 0 && (
        <div className={'ritmo-b ' + (dia >= 3 ? (p.dentro ? 'ok' : 'warn') : '')}>
          <p className="ritmo-t">
            <span className="ritmo-rot">
              <i className="ritmo-ico" aria-hidden="true">
                <Icone desenho={dia >= 3 && !p.dentro ? TrendingUp : dia >= 3 ? TrendingDown : CalendarDays} />
              </i>
              {dia >= 3 ? 'Se continuar assim' : 'No mês'}
            </span>
            {(exibirFecha || exibirLimite) && (
              <b className="ritmo-num">
                {exibirFecha ? reais(fecha) : ''}
                {exibirLimite && <em>{`${exibirFecha ? ' de ' : 'Combinado '}${reais(lim)}`}</em>}
              </b>
            )}
          </p>
          {/* C3, gráfico A (no lugar da barra do mês): gasto acumulado, pontilhado "se continuar assim", combinado tracejado; âmbar só se passar */}
          <GraficoMes
            gasto={e.gasto_mes}
            limite={lim}
            fecha={fecha}
            hoje={hoje}
            dias={diasNoMes(hoje)}
            porDia={porDia}
            semRotulosDeValores={!!valoresJaVisiveis || (exibirFecha && exibirLimite)}
          />
          <p className={'ritmo-f' + (dia >= 3 ? ' ritmo-aviso' : '')}>
            {dia >= 3 && (p.dentro ? <CircleCheck aria-hidden="true" /> : <TriangleAlert aria-hidden="true" />)}
            <span>
              {dia < 3
                ? valoresJaVisiveis?.gasto === e.gasto_mes
                  ? ''
                  : `Já saíram ${reais(e.gasto_mes)}.`
                : p.dentro
                  ? `${quemFecha} o mês dentro do combinado.`
                  : `Passa${valoresJaVisiveis?.excesso === p.passa ? '' : ' ' + reais(p.passa)} no fim do mês. Para voltar ao limite, gaste só o valor de cada dia.`}
            </span>
          </p>
        </div>
      )}
      {(e.ate_domingo != null || (dia >= 2 && lim > 0)) && (
        <p className="leg ritmo-leg">
          {e.ate_domingo != null && (
            <span>
              <i className="q risco-q" />
              onde deveria estar hoje
            </span>
          )}
          {dia >= 3 && lim > 0 && (
            <span>
              <i className="q g-q-pont" />
              se continuar assim
            </span>
          )}
          {pontual > 0 && (
            <span className="ritmo-nota">
              <Info aria-hidden="true" />
              Parcelas e compras grandes entram uma vez só: {reais(pontual)}.
            </span>
          )}
        </p>
      )}
    </div>
  )
}
