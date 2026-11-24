import { ArrowRight, Receipt } from 'lucide-react'
import type { Lancamento } from '../api/tipos'
import { iconeDoGasto } from '../lib/iconeDoGasto'
import { textoPrivado } from '../lib/olho'
import { dataCurta, plural } from '../lib/formato'
import { Din } from './base'
import { Icone } from './Icone'
import './compras-do-mes.css'

/** Últimas compras do orçamento no mês (24/11/2026): ícone, nome, dia e valor. Parcela de mês passado não entra. */
export function ComprasDoMes({
  lanc,
  envelopeId,
  envelopeNome,
  mes,
}: {
  lanc: Lancamento[]
  envelopeId: string
  envelopeNome: string
  mes: string
}) {
  const compras = lanc
    .filter(l => l.envelope_id === envelopeId && !l.apagado_em && !l.parcela && l.data.startsWith(mes))
    .sort((x, y) => (x.data === y.data ? y.criado_em.localeCompare(x.criado_em) : y.data.localeCompare(x.data)))
  const ultimas = compras.slice(0, 5)
  return (
    <section className="card" id="oCompras" aria-labelledby="oComprasT" style={{ scrollMarginTop: 72 }}>
      <div className="card-h">
        <h2 id="oComprasT">
          <Icone desenho={Receipt} aria-hidden="true" />
          Últimas compras
        </h2>
        {compras.length > 0 && <span className="compras-conta">{plural(compras.length, 'no mês', 'no mês')}</span>}
      </div>
      {!ultimas.length ? (
        <p className="sub">Nenhuma compra anotada este mês.</p>
      ) : (
        <ul className="list compras-lista">
          {ultimas.map(l => {
            const icone = iconeDoGasto(l.descricao, envelopeNome)
            return (
              <li key={l.id} className="li">
                <span className="tile">{icone ? <Icone desenho={icone} /> : <Icone nome="gasto" />}</span>
                <span className="m">
                  <b>{textoPrivado(l.descricao || 'Sem nome')}</b>
                  <small>
                    {dataCurta(l.data)}
                    {(l.parcelas || 1) > 1 ? ` · em ${l.parcelas}x` : ''}
                  </small>
                </span>
                <span className="v">
                  <Din v={l.valor} />
                </span>
              </li>
            )
          })}
        </ul>
      )}
      {compras.length > 0 && (
        <a className="compras-todas" href="#/lancamentos">
          Ver todas em Gastos e entradas
          <ArrowRight aria-hidden="true" />
        </a>
      )}
    </section>
  )
}
