import { Repeat } from 'lucide-react'
import type { Lancamento } from '../api/tipos'
import { iconeDoGasto } from '../lib/iconeDoGasto'
import { textoPrivado } from '../lib/olho'
import { centavos, plural, reais } from '../lib/formato'
import { comprasDoMes } from './ComprasDoMes'
import { Din } from './base'
import { Icone } from './Icone'

export type GastoRepetido = { nome: string; n: number; total: number; media: number; ultima: Lancamento }

/** "Café", "café " e "Cafe" são a mesma compra. */
const chave = (d: string) => (d || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

/**
 * As compras do mês que voltaram várias vezes com o mesmo nome (24/11/2026, no lugar das Conquistas):
 * a soma do que se repete é o que a família não percebe até ver junto. Sem nome não entra.
 * Vem da que mais somou para a que menos somou. Sem tela: dá para testar sozinho.
 */
export function gastosQueSeRepetem(compras: Lancamento[], minimo = 3, maximo = 3): GastoRepetido[] {
  const mapa = new Map<string, GastoRepetido>()
  for (const l of compras) {
    const k = chave(l.descricao || '')
    if (!k) continue
    const atual = mapa.get(k)
    if (!atual) mapa.set(k, { nome: (l.descricao || '').trim(), n: 1, total: l.valor, media: l.valor, ultima: l })
    else {
      atual.n++
      atual.total = centavos(atual.total + l.valor)
      if (l.data > atual.ultima.data) atual.ultima = l
    }
  }
  return [...mapa.values()]
    .filter(g => g.n >= minimo)
    .map(g => ({ ...g, nome: (g.ultima.descricao || g.nome).trim(), media: Math.round(g.total / g.n) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, maximo)
}

/** O bloco: o que se repete no mês, quantas vezes e quanto deu junto. Some quando nada se repetiu 3 vezes. */
export function GastosQueSeRepetem({
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
  const repetidos = gastosQueSeRepetem(comprasDoMes(lanc, envelopeId, mes))
  if (!repetidos.length) return null
  const soma = centavos(repetidos.reduce((s, g) => s + g.total, 0))
  return (
    <section className="card" id="oRepete" aria-labelledby="oRepeteT" style={{ scrollMarginTop: 72 }}>
      <div className="card-h">
        <h2 id="oRepeteT">
          <Icone desenho={Repeat} aria-hidden="true" />
          Compras que se repetem
        </h2>
      </div>
      <p className="sub repete-frase">
        {oculto
          ? 'As compras que voltaram 3 vezes ou mais este mês.'
          : textoPrivado(`Voltaram 3 vezes ou mais. Somadas, dão ${reais(soma)} este mês.`)}
      </p>
      <ul className="list repete-lista">
        {repetidos.map(g => {
          const icone = iconeDoGasto(g.ultima.descricao, envelopeNome, g.ultima.tipo)
          return (
            <li key={g.nome} className="li">
              <span className="tile">{icone ? <Icone desenho={icone} /> : <Icone nome="gasto" />}</span>
              <span className="m">
                <b>{textoPrivado(g.nome)}</b>
                <span className="repete-vezes" aria-hidden="true">
                  {Array.from({ length: Math.min(g.n, 10) }, (_, i) => (
                    <i key={i} />
                  ))}
                </span>
                <small>
                  {plural(g.n, 'vez', 'vezes')}
                  {oculto ? '' : ` · ${textoPrivado(reais(g.media))} cada, em média`}
                </small>
              </span>
              <span className="v">
                <Din v={g.total} />
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
