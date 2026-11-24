import { ArrowRight, ChartPie, Receipt } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Lancamento } from '../api/tipos'
import { grupoDoGasto, iconeDoGasto } from '../lib/iconeDoGasto'
import { textoPrivado } from '../lib/olho'
import { centavos, dataCurta, plural } from '../lib/formato'
import { Din } from './base'
import { Icone } from './Icone'
import './compras-do-mes.css'

/** Compras anotadas no mês neste orçamento, da mais nova para a mais velha. Parcela de compra de outro mês não entra. */
export function comprasDoMes(lanc: Lancamento[], envelopeId: string, mes: string): Lancamento[] {
  return lanc
    .filter(l => l.envelope_id === envelopeId && !l.apagado_em && !l.parcela && l.data.startsWith(mes))
    .sort((x, y) => (x.data === y.data ? y.criado_em.localeCompare(x.criado_em) : y.data.localeCompare(x.data)))
}

/** Soma por tipo (os 4 maiores e o resto em "Outros"). Sem tela: dá para testar sozinho. */
export function somaPorTipo(compras: Lancamento[], envelopeNome: string, maximo = 4) {
  const mapa = new Map<string, { nome: string; icone: LucideIcon | null; valor: number; n: number }>()
  for (const l of compras) {
    const g = grupoDoGasto(l.descricao, envelopeNome)
    const atual = mapa.get(g.nome) || { ...g, valor: 0, n: 0 }
    atual.valor = centavos(atual.valor + l.valor)
    atual.n++
    mapa.set(g.nome, atual)
  }
  const todos = [...mapa.values()].sort((a, b) => b.valor - a.valor)
  const outrosJuntos = todos.filter((g, i) => i >= maximo || g.nome === 'Outros')
  const topo = todos.filter(g => !outrosJuntos.includes(g))
  if (outrosJuntos.length)
    topo.push({
      nome: 'Outros',
      icone: null,
      valor: centavos(outrosJuntos.reduce((s, g) => s + g.valor, 0)),
      n: outrosJuntos.reduce((s, g) => s + g.n, 0),
    })
  return topo
}

/** Onde foi o dinheiro (24/11/2026): as compras do mês somadas por tipo, com barra. Com olho fechado, só os nomes. */
export function OndeFoiODinheiro({
  lanc,
  envelopeId,
  envelopeNome,
  mes,
  oculto,
}: {
  lanc: Lancamento[]
  envelopeId: string
  envelopeNome: string
  mes: string
  oculto: boolean
}) {
  const compras = comprasDoMes(lanc, envelopeId, mes)
  if (!compras.length) return null
  const grupos = somaPorTipo(compras, envelopeNome)
  const total = centavos(grupos.reduce((s, g) => s + g.valor, 0))
  const maior = grupos[0]
  return (
    <section className="card" id="oOnde" aria-labelledby="oOndeT" style={{ scrollMarginTop: 72 }}>
      <div className="card-h">
        <h2 id="oOndeT">
          <Icone desenho={ChartPie} aria-hidden="true" />
          Onde foi seu dinheiro
        </h2>
      </div>
      <p className="sub onde-frase">
        {textoPrivado(
          oculto
            ? 'As compras anotadas este mês, por tipo.'
            : `Mais em ${maior.nome.toLowerCase()}: ${Math.round((maior.valor / (total || 1)) * 100)}% das compras anotadas este mês.`,
        )}
      </p>
      <ul className="onde-lista">
        {grupos.map(g => (
          <li key={g.nome}>
            <span className="tile">{g.icone ? <Icone desenho={g.icone} /> : <Icone nome="gasto" />}</span>
            <span className="onde-m">
              <span className="onde-linha">
                <b>{g.nome}</b>
                <Din v={g.valor} />
              </span>
              {!oculto && (
                <span className="onde-barra" aria-hidden="true">
                  <i style={{ width: Math.max(3, (g.valor / (maior.valor || 1)) * 100) + '%' }} />
                </span>
              )}
              <small>{plural(g.n, 'compra', 'compras')}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

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
  const compras = comprasDoMes(lanc, envelopeId, mes)
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
