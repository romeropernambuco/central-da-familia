import { CheckCircle2 } from 'lucide-react'
import { valorParaTexto, textoParaValor, valorDigitadoValido } from '../lib/formato'
import {
  avisosDoGuia,
  custoMoedaPct,
  guiaPadrao,
  somarGuia,
  type GuiaViagem,
  type Hospedagem,
  type ItemGuia,
  type PagamentoLa,
} from '../lib/guiaViagem'
import { ESTIMATIVAS, type PerfilViagem } from '../lib/guiaViagemPadroes'
import { CampoValor, Din } from './base'
import { Icone } from './Icone'
import './planilha.css'

const UNIDADE: Record<ItemGuia['conta'], string> = {
  viagem: 'pela viagem',
  pessoa: 'por pessoa',
  noite: 'por noite',
  pessoa_dia: 'por pessoa por dia',
  dia: 'por dia',
  adulto_noite: 'por adulto por noite',
  trecho_mala: 'por mala por trecho',
}

/** Escolhas que montam o guia: tipo de viagem, temporada, quem vai, quantas noites, onde fica e como paga lá. */
export function EscolhasDoGuia({ g, mudar }: { g: GuiaViagem; mudar: (g: GuiaViagem) => void }) {
  // trocar uma escolha refaz as estimativas, mas o valor que a família já cotou fica
  const refazer = (x: Partial<Parameters<typeof guiaPadrao>[0]>) => {
    const novo = guiaPadrao({ ...g, ...x })
    const cotados = new Map(g.itens.filter(i => i.cotado).map(i => [i.id, i]))
    mudar({ ...novo, itens: novo.itens.map(i => cotados.get(i.id) || i) })
  }
  const pills = <T extends string>(rotulo: string, atual: T, opcoes: [T, string][], f: (v: T) => void) => (
    <section>
      <p className="lbl">{rotulo}</p>
      <div className="pills" role="group" aria-label={rotulo}>
        {opcoes.map(([v, n]) => (
          <button key={v} type="button" className="pill" aria-pressed={atual === v} onClick={() => f(v)}>
            {n}
          </button>
        ))}
      </div>
    </section>
  )
  const numero = (rotulo: string, atual: number, de: number, ate: number, f: (n: number) => void) => (
    <label className="campo">
      <span>{rotulo}</span>
      <select className="inp" value={atual} onChange={e => f(Number(e.target.value))}>
        {Array.from({ length: ate - de + 1 }, (_, i) => de + i).map(n => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  )
  return (
    <>
      {pills<PerfilViagem>(
        'Para onde',
        g.perfil,
        (Object.keys(ESTIMATIVAS) as PerfilViagem[]).map(p => [p, ESTIMATIVAS[p].nome]),
        perfil => refazer({ perfil }),
      )}
      {pills<'baixa' | 'alta'>(
        'Temporada',
        g.temporada,
        [
          ['baixa', 'Baixa'],
          ['alta', 'Alta (julho, dezembro, janeiro)'],
        ],
        temporada => refazer({ temporada }),
      )}
      <div className="tres-numeros guia-pessoas">
        {numero('Adultos', g.adultos, 1, 10, adultos => refazer({ adultos }))}
        {numero('Crianças (2 anos ou mais)', g.criancas, 0, 8, criancas => refazer({ criancas }))}
        {numero('Bebês de colo', g.bebes, 0, 4, bebes => refazer({ bebes }))}
      </div>
      {numero('Noites', g.noites, 1, 45, noites => refazer({ noites }))}
      {pills<Hospedagem>(
        'Onde fica',
        g.hospedagem,
        [
          ['hotel', 'Hotel'],
          ['airbnb', 'Airbnb'],
          ['casa', 'Casa de parente ou amigo'],
        ],
        hospedagem => refazer({ hospedagem }),
      )}
      {ESTIMATIVAS[g.perfil].estrangeira &&
        pills<PagamentoLa>(
          'Como paga lá',
          g.pagamento,
          [
            ['cartao', 'Cartão do banco'],
            ['conta_global', 'Conta global (Wise, Nomad)'],
          ],
          pagamento => refazer({ pagamento }),
        )}
    </>
  )
}

/** A planilha do guia: cada item com a conta, o total e se ainda é estimativa. Editável: a família troca pelo cotado. */
export function PlanilhaDoGuia({
  g,
  mudar,
  mesViagem,
  mesHoje,
}: {
  g: GuiaViagem
  mudar?: (g: GuiaViagem) => void
  mesViagem: string
  mesHoje: string
}) {
  const s = somarGuia(g)
  const trocar = (id: string, texto: string) => {
    if (!mudar || (texto && !valorDigitadoValido(texto))) return
    mudar({
      ...g,
      itens: g.itens.map(i => (i.id === id ? { ...i, valor: texto ? textoParaValor(texto) : 0, cotado: true } : i)),
    })
  }
  const bloco = (quando: ItemGuia['quando'], titulo: string) => (
    <>
      <tr className="fraco">
        <th colSpan={3} scope="rowgroup">
          {titulo}
        </th>
      </tr>
      {s.linhas
        .filter(l => l.item.quando === quando)
        .map(({ item, vezes, total }) => (
          <tr key={item.id}>
            <td>
              {item.nome}
              <br />
              <small className={item.cotado ? 'chip ok' : item.confianca === 'sem_fonte' ? 'chip warn' : 'chip'}>
                {item.cotado ? (
                  <>
                    <Icone desenho={CheckCircle2} aria-hidden="true" /> cotado
                  </>
                ) : item.confianca === 'sem_fonte' ? (
                  'estimativa sem fonte: edite'
                ) : (
                  'estimativa'
                )}
              </small>
            </td>
            <td className="num">
              {mudar ? (
                <CampoValor
                  rotulo={`Valor de ${item.nome}`}
                  valor={valorParaTexto(item.valor)}
                  mudar={v => trocar(item.id, v.replace(/[^\d,]/g, ''))}
                />
              ) : (
                <Din v={item.valor} />
              )}
              <small>
                {' '}
                {UNIDADE[item.conta]}
                {vezes !== 1 ? ` × ${vezes.toLocaleString('pt-BR')}` : ''}
              </small>
            </td>
            <td className="num">
              <Din v={total} />
            </td>
          </tr>
        ))}
    </>
  )
  return (
    <div className="guia-viagem">
      <div className="planilha-rolagem">
        <table className="planilha">
          <caption>O guia da viagem, item por item</caption>
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col" className="num">
                Valor
              </th>
              <th scope="col" className="num">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {bloco('antes', 'Pago antes (dá para parcelar no cartão)')}
            {bloco('la', 'Gasto lá (o cofrinho)')}
          </tbody>
          <RodapeDoGuia g={g} s={s} />
        </table>
      </div>
      <ul className="guia-avisos">
        {avisosDoGuia(g, mesViagem, mesHoje).map(a => (
          <li key={a} className="sub">
            {a}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** O fim da planilha: moeda de fora, imprevisto, total, e como ele se divide em pacote (antes) e cofrinho (lá). */
function RodapeDoGuia({ g, s }: { g: GuiaViagem; s: ReturnType<typeof somarGuia> }) {
  const linha = (nome: string, v: number, cls?: string) => (
    <tr className={cls}>
      <td colSpan={2}>{nome}</td>
      <td className="num">
        <Din v={v} />
      </td>
    </tr>
  )
  return (
    <tfoot>
      {s.moeda > 0 &&
        linha(`Moeda de fora: IOF e spread (${custoMoedaPct(g).toLocaleString('pt-BR')}%)`, s.moeda, 'fraco')}
      {linha(`Margem para imprevisto (${g.imprevisto_pct}%)`, s.imprevisto, 'fraco')}
      {linha('Total da viagem', s.total)}
      {linha('Pacote: pago antes, parcelável', s.pacote, 'destaque')}
      {linha('Cofrinho: para gastar lá, com a margem', s.custosLa, 'destaque')}
    </tfoot>
  )
}
