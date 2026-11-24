import { ArrowDown, ArrowRight, ArrowUp, ChartPie, ChevronDown, Minus, Receipt } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Lancamento } from '../api/tipos'
import { grupoDoGasto, iconeDoGasto } from '../lib/iconeDoGasto'
import { textoPrivado } from '../lib/olho'
import { centavos, dataCurta, hojeRecife, mesAnterior, mesLongo, plural, reais, somaDias } from '../lib/formato'

/** "hoje", "ontem" ou o dia curto (para a lista de últimas compras). */
export function diaDaCompra(data: string, hoje: string, ontem: string): string {
  return data === hoje ? 'hoje' : data === ontem ? 'ontem' : dataCurta(data)
}
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
export type TipoDoMes = {
  nome: string
  icone: LucideIcon | null
  valor: number
  n: number
  compras: Lancamento[]
  /** Só em "Outros": os tipos menores que ficaram juntos ali (24/11: para a pessoa ver o que tem dentro). */
  juntos: string[]
}

export function somaPorTipo(compras: Lancamento[], envelopeNome: string, maximo = 4): TipoDoMes[] {
  const mapa = new Map<string, TipoDoMes>()
  for (const l of compras) {
    const g = grupoDoGasto(l.descricao, envelopeNome, l.tipo)
    const atual = mapa.get(g.nome) || { ...g, valor: 0, n: 0, compras: [], juntos: [] }
    atual.valor = centavos(atual.valor + l.valor)
    atual.n++
    atual.compras.push(l)
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
      compras: outrosJuntos.flatMap(g => g.compras).sort((x, y) => y.data.localeCompare(x.data)),
      juntos: outrosJuntos.map(g => g.nome).filter(nome => nome !== 'Outros'),
    })
  return topo
}

/**
 * Quanto foi em cada tipo no mês passado, do dia 1 até o mesmo dia de hoje (24/11: comparar o mesmo pedaço do mês,
 * senão o mês passado inteiro sempre "ganha"). Sem compra no mês passado: null (a tela não compara).
 */
export function somaDoMesPassado(
  lanc: Lancamento[],
  envelopeId: string,
  envelopeNome: string,
  mesAntes: string,
  ateDia: number,
): Record<string, number> | null {
  const compras = comprasDoMes(lanc, envelopeId, mesAntes).filter(l => Number(l.data.slice(8, 10)) <= ateDia)
  if (!compras.length) return null
  const soma: Record<string, number> = {}
  for (const l of compras) {
    const nome = grupoDoGasto(l.descricao, envelopeNome, l.tipo).nome
    soma[nome] = centavos((soma[nome] || 0) + l.valor)
  }
  return soma
}

/** O tipo de agora comparado com o mês passado: "R$ 120 a mais que em outubro". Outros soma os tipos que juntou. */
export function fraseDoMesPassado(g: TipoDoMes, antes: Record<string, number>, nomeMes: string): string {
  const nomes = g.nome === 'Outros' ? [...g.juntos, 'Outros'] : [g.nome]
  const valorAntes = centavos(nomes.reduce((s, n) => s + (antes[n] || 0), 0))
  if (!valorAntes) return `Em ${nomeMes} não teve`
  const dif = centavos(g.valor - valorAntes)
  if (Math.abs(dif) < 1) return `Igual a ${nomeMes}`
  return `${reais(Math.abs(dif))} a ${dif > 0 ? 'mais' : 'menos'} que em ${nomeMes}`
}

/** "Saúde, Beleza e mais 1": o que ficou junto em Outros, curto. */
export function fraseDosJuntos(juntos: string[]): string {
  if (!juntos.length) return ''
  if (juntos.length <= 2) return juntos.join(' e ')
  return `${juntos.slice(0, 2).join(', ')} e mais ${juntos.length - 2}`
}

/** Onde foi o dinheiro (24/11/2026): as compras do mês somadas por tipo, com barra. Com olho fechado, só os nomes. */
export function OndeFoiODinheiro({
  lanc,
  envelopeId,
  envelopeNome,
  mes,
  oculto,
  lancAntes,
  ateDia,
}: {
  lanc: Lancamento[]
  envelopeId: string
  envelopeNome: string
  mes: string
  oculto: boolean
  /** 24/11: as compras do mês passado (sem elas, ou com o olho fechado, não compara) */
  lancAntes?: Lancamento[] | null
  /** o dia de hoje: o mês passado é comparado do dia 1 até este dia */
  ateDia?: number
}) {
  const compras = comprasDoMes(lanc, envelopeId, mes)
  if (!compras.length) return null
  const grupos = somaPorTipo(compras, envelopeNome)
  const total = centavos(grupos.reduce((s, g) => s + g.valor, 0))
  const maior = grupos[0]
  const mesAntes = mesAnterior(mes),
    nomeMes = mesLongo(mesAntes)
  const antes =
    !oculto && lancAntes && ateDia ? somaDoMesPassado(lancAntes, envelopeId, envelopeNome, mesAntes, ateDia) : null
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
          <li key={g.nome} className={g.nome === 'Outros' ? 'onde-outros' : undefined}>
            <details className="onde-item">
              <summary>
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
                  <small>
                    {plural(g.n, 'compra', 'compras')}
                    {g.juntos.length ? ` · ${fraseDosJuntos(g.juntos)}` : ''}
                  </small>
                  {antes && <CompMesPassado frase={fraseDoMesPassado(g, antes, nomeMes)} />}
                </span>
                <ChevronDown className="onde-seta" aria-hidden="true" />
              </summary>
              <ComprasDoTipo compras={g.compras} envelopeNome={envelopeNome} comIcone={g.nome === 'Outros'} />
            </details>
          </li>
        ))}
      </ul>
      <p className="leg onde-dica">
        Toque num tipo para ver as compras.
        {antes ? ` A comparação é com ${nomeMes}, do dia 1 ao dia ${ateDia}.` : ''}
      </p>
    </section>
  )
}

/** A linha do mês passado embaixo de cada tipo: seta para cima (gastou mais) ou para baixo (gastou menos). */
function CompMesPassado({ frase }: { frase: string }) {
  const sobe = frase.includes(' a mais '),
    desce = frase.includes(' a menos ')
  const Seta = sobe ? ArrowUp : desce ? ArrowDown : Minus
  return (
    <small className={'onde-comp' + (sobe ? ' sobe' : desce ? ' desce' : '')}>
      <Seta aria-hidden="true" />
      {textoPrivado(frase)}
    </small>
  )
}

/** As compras de um tipo, abertas embaixo dele (24/11). Até 6; o resto fica em Gastos e entradas. */
function ComprasDoTipo({
  compras,
  envelopeNome,
  comIcone,
}: {
  compras: Lancamento[]
  envelopeNome: string
  comIcone: boolean
}) {
  const mostra = compras.slice(0, 6)
  return (
    <div className="onde-abre">
      <ul>
        {mostra.map(l => {
          const icone = comIcone ? iconeDoGasto(l.descricao, envelopeNome, l.tipo) : null
          return (
            <li key={l.id}>
              {comIcone && (icone ? <Icone desenho={icone} aria-hidden="true" /> : <Icone nome="gasto" />)}
              <span className="onde-abre-nome">
                {textoPrivado(l.descricao || 'Sem nome')}
                <small>{dataCurta(l.data)}</small>
              </span>
              <Din v={l.valor} />
            </li>
          )
        })}
      </ul>
      {compras.length > mostra.length && (
        <a className="compras-todas" href="#/lancamentos">
          {`Mais ${plural(compras.length - mostra.length, 'compra', 'compras')} em Gastos e entradas`}
          <ArrowRight aria-hidden="true" />
        </a>
      )}
    </div>
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
  // 24/11: "hoje" e "ontem" no lugar da data, que é o que a família fala
  const hoje = hojeRecife()
  const ontem = somaDias(hoje, -1)
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
            const icone = iconeDoGasto(l.descricao, envelopeNome, l.tipo)
            return (
              <li key={l.id} className="li">
                <span className="tile">{icone ? <Icone desenho={icone} /> : <Icone nome="gasto" />}</span>
                <span className="m">
                  <b>{textoPrivado(l.descricao || 'Sem nome')}</b>
                  <small>
                    {diaDaCompra(l.data, hoje, ontem)}
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
