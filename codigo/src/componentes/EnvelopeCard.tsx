import type { Envelope, LinhaExplicacao } from '../api/tipos'
import { centavos, reais } from '../lib/formato'
import { Din } from './base'
import { Qm } from './Qm'

const REGRA = { diario: 'por dia', semanal: 'por semana', mensal: 'no mês' }

/** O número principal de cada envelope, conforme a regra dele, e a explicação com os campos do banco. */
export function numeroEnvelope(e: Envelope, diasRestantes: number): { valor: number; rotulo: string; linhas: LinhaExplicacao[]; usado: number } {
  if (e.regra === 'diario' && e.valor_dia != null)
    return {
      valor: e.valor_dia, rotulo: 'pode gastar hoje', usado: e.limite_mes ? e.gasto_mes / e.limite_mes : 0,
      linhas: [
        { linha: 'Combinado pro mês', valor: e.limite_mes },
        { linha: 'Já gasto neste mês', valor: -e.gasto_mes },
        { linha: 'Livre no mês', valor: e.livre },
        { linha: `Por dia, nos ${diasRestantes} dias que faltam (já tirando o que saiu hoje)`, valor: e.valor_dia },
      ],
    }
  if (e.regra === 'semanal' && e.teto_semana != null) {
    const livre = centavos(e.teto_semana - (e.gasto_semana || 0))
    return {
      valor: livre, rotulo: 'livre nesta semana', usado: e.teto_semana ? (e.gasto_semana || 0) / e.teto_semana : 0,
      linhas: [
        { linha: 'Teto da semana (combinado do mês dividido pelas semanas)', valor: e.teto_semana },
        { linha: 'Já gasto desde segunda', valor: -(e.gasto_semana || 0) },
        { linha: 'Livre nesta semana', valor: livre },
      ],
    }
  }
  return {
    valor: e.livre, rotulo: 'livre no mês', usado: e.limite_mes ? e.gasto_mes / e.limite_mes : 0,
    linhas: [
      { linha: 'Combinado pro mês', valor: e.limite_mes },
      { linha: 'Já gasto neste mês', valor: -e.gasto_mes },
      { linha: 'Livre no mês', valor: e.livre },
    ],
  }
}

export function EnvelopeCard({ e, diasRestantes, onClick }: { e: Envelope; diasRestantes: number; onClick?: () => void }) {
  const n = numeroEnvelope(e, diasRestantes)
  const passou = n.valor < 0
  const pct = Math.max(2, Math.min(100, n.usado * 100))
  return (
    <div className="card env">
      <div className="env-h">
        <b>{e.nome}</b>
        <span className="regra">{REGRA[e.regra]}</span>
      </div>
      <div className="numrow">
        {passou ? <span style={{ color: 'var(--warn)' }}><Din v={-n.valor} tam="mid" /></span> : <Din v={n.valor} tam="mid" />}
        <Qm titulo={`${e.nome}: ${n.rotulo}`} linhas={n.linhas} />
      </div>
      <p className="sub">{passou ? 'passou do combinado. Sem culpa: o resto do mês se ajusta.' : n.rotulo}</p>
      <div className={'meter ' + (n.usado > 1 ? 'warn' : 'ok')} aria-hidden="true"><i style={{ width: pct + '%' }} /></div>
      <p className="sub">Gasto no mês <b>{reais(e.gasto_mes)}</b> de {reais(e.limite_mes)}</p>
      {onClick && <button className="btn sm line" type="button" onClick={onClick} style={{ justifySelf: 'start' }}>Lançar em {e.nome}</button>}
    </div>
  )
}
