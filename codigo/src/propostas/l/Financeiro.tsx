import type { ComponentType } from 'react'
import { ArrowUpRight, Building2, CreditCard, Flag, Landmark, Wallet, WalletCards, type LucideIcon } from 'lucide-react'
import {
  CasaVazia,
  SemAplicacoes,
  SemCartoes,
  SemImoveis,
  SemRecebimentos,
  type IlustracaoProps,
} from '../../componentes/ilustracoes'
import { NumeroFinanceiro, useValoresOcultos, Valor } from '../comuns/privacidade'
import type { Campo, DadosInicio } from '../dadosExemplo'

export type Dinheiro = Campo<number, 'reais' | 'centavos'>
type MedidaMonetaria = { campo: Dinheiro; repetida: boolean }

export const motores = [
  {
    id: 'orcamento',
    titulo: 'Hoje você pode gastar',
    legenda: 'Disponível até domingo',
    Icone: Wallet,
    Figura: CasaVazia,
  },
  {
    id: 'aplicacoes',
    titulo: 'Aplicações',
    legenda: 'Rendimento líquido de hoje',
    Icone: Landmark,
    Figura: SemAplicacoes,
  },
  { id: 'imoveis', titulo: 'Imóveis', legenda: 'Aluguel líquido estimado', Icone: Building2, Figura: SemImoveis },
  {
    id: 'receitas',
    titulo: 'Receitas',
    legenda: 'Recebimentos previstos no mês',
    Icone: WalletCards,
    Figura: SemRecebimentos,
  },
  {
    id: 'faturas',
    titulo: 'Faturas',
    legenda: 'Maior fatura com valor disponível',
    Icone: CreditCard,
    Figura: SemCartoes,
  },
] as const satisfies readonly {
  id: string
  titulo: string
  legenda: string
  Icone: LucideIcon
  Figura: ComponentType<IlustracaoProps>
}[]

export type Motor = (typeof motores)[number]['id']

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const emReais = (campo: Dinheiro & { estado: 'pronto' }) => campo.valor / (campo.unidade === 'centavos' ? 100 : 1)

/** Prioriza a primeira ocorrência de uma cifra, inclusive entre unidades diferentes. */
export function reservarMedidas(campos: Dinheiro[]): MedidaMonetaria[] {
  const mostradas = new Set<string>()
  return campos.map(campo => {
    if (campo.estado !== 'pronto') return { campo, repetida: false }
    const chave = moeda.format(emReais(campo))
    const repetida = mostradas.has(chave)
    mostradas.add(chave)
    return { campo, repetida }
  })
}

export function Medida({ medida, destaque = false }: { medida: MedidaMonetaria; destaque?: boolean }) {
  const oculto = useValoresOcultos()
  const { campo, repetida } = medida
  if (campo.estado !== 'pronto') return <span className="l-sem-dado">Ainda sem dado</span>
  if (repetida && !oculto) return <span className="l-sem-dado">Valor já exibido</span>
  return (
    <NumeroFinanceiro className={destaque ? 'l-principal' : 'l-secundario'}>
      {moeda.formatToParts(emReais(campo)).map((parte, indice) =>
        parte.type === 'currency' ? (
          <span className="numero-simbolo" key={indice}>
            {parte.value}
          </span>
        ) : (
          parte.value
        ),
      )}
    </NumeroFinanceiro>
  )
}

export function medidasDosMotores(dados: DadosInicio): Dinheiro[] {
  const valores = (dados.faturas.proximas.valor ?? []).flatMap(f => (f.valor.estado === 'pronto' ? [f.valor] : []))
  const maior = valores.reduce<Dinheiro>(
    (atual, campo) => (atual.estado !== 'pronto' || emReais(campo) > emReais(atual) ? campo : atual),
    { ...dados.faturas.total, estado: 'indisponivel', valor: null },
  )
  return [
    dados.hojePodeGastar.ateDomingo,
    dados.aplicacoes.rendeuHoje,
    dados.imoveis.aluguelLiquidoEstimado,
    dados.recebimentos.previsto,
    maior,
  ]
}

export function Bento({
  id,
  medidas,
  pessoal,
}: {
  id: (motor: Motor) => string
  medidas: MedidaMonetaria[]
  pessoal: boolean
}) {
  return (
    <section className="l-bloco l-motores" aria-label="Motores da família">
      <header className="l-secao-topo">
        <h2>{pessoal ? 'Meu orçamento' : 'Motores da família'}</h2>
      </header>
      <div className="l-bento">
        {(pessoal ? motores.slice(0, 1) : motores).map(({ id: motor, titulo, legenda, Icone, Figura }, indice) => (
          <article className="l-motor" data-motor={motor} key={motor} aria-labelledby={id(motor)}>
            <div className="l-motor-texto">
              <span className="l-icone">
                <Icone size={20} aria-hidden="true" />
              </span>
              <h3 id={id(motor)} tabIndex={-1}>
                {titulo}
              </h3>
              <p className="l-legenda">{legenda}</p>
              <Medida medida={medidas[indice]} destaque />
            </div>
            <div className="l-arte" aria-hidden="true">
              <Figura />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function Referencia({
  titulo,
  legenda,
  Icone,
  medida,
  principal,
  abrir,
}: {
  titulo: string
  legenda: string
  Icone: LucideIcon
  medida: MedidaMonetaria
  principal?: boolean
  abrir: () => void
}) {
  return (
    <button type="button" className="l-referencia" data-principal={principal || undefined} onClick={abrir}>
      <span className="l-ref-titulo">
        <Icone size={16} aria-hidden="true" />
        {titulo}
      </span>
      <Medida medida={medida} destaque={principal} />
      <span className="l-ref-rodape">
        {legenda}
        <ArrowUpRight size={15} aria-hidden="true" />
      </span>
    </button>
  )
}

const anos = [2026, 2027, 2028, 2029]

export function Rumo({ id, progressao }: { id: string; progressao: DadosInicio['plano2029']['progressao'] }) {
  const oculto = useValoresOcultos()
  const fracao = !oculto && progressao.estado === 'pronto' ? Math.max(0, Math.min(1, progressao.valor / 100)) : null
  const ponto = (f: number) => [24 + 352 * f, 134 - 86 * f ** 2] as const
  const [x, y] = ponto(fracao ?? 0)

  return (
    <section className="l-bloco l-rumo" aria-labelledby={id}>
      <header className="l-secao-topo">
        <h2 id={id} tabIndex={-1}>
          Rumo a 2029
        </h2>
      </header>
      <figure className="l-horizonte">
        <figcaption className="l-horizonte-topo">
          <div>
            <p className="l-legenda">{fracao === null ? 'Cobertura atual' : 'Você está aqui'}</p>
            {progressao.estado === 'pronto' ? (
              <Valor campo={progressao} className="l-principal" />
            ) : (
              <span className="l-sem-dado">Ainda sem dado</span>
            )}
            <p className="l-legenda">da meta de renda</p>
          </div>
          <div className="l-destino">
            <Flag size={20} aria-hidden="true" />
            <strong>Viver de rendimentos</strong>
          </div>
        </figcaption>
        <svg className="l-trilha" viewBox="0 0 400 158" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path className="l-caminho" d="M24 134 Q200 134 376 48" />
          {fracao !== null && fracao > 0 && (
            <path className="l-cobertura" d={`M24 134 Q${ponto(fracao / 2)[0]} 134 ${x} ${y}`} />
          )}
          {anos.map((ano, indice) => {
            const [cx, cy] = ponto(indice / (anos.length - 1))
            return <path key={ano} className="l-marco" d={`M${cx} ${cy}v7`} />
          })}
          {fracao !== null && <path className="l-posicao" d={`M${x} ${y - 21}V${y}`} />}
          <path className="l-bandeira" d="M376 48V27m0 0h-13l3 4-3 4h13" />
        </svg>
        <ol className="l-anos" aria-label="Marcos do calendário">
          {anos.map(ano => (
            <li key={ano}>{ano}</li>
          ))}
        </ol>
        <p className="l-legenda l-nota-trilha">
          A trilha indica a cobertura estimada da meta de renda. Os anos são marcos do plano.
        </p>
      </figure>
    </section>
  )
}
